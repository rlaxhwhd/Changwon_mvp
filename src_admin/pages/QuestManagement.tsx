import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, queryString } from '../../shared/api'
import { missionError } from '../../shared/missions'
import type { QuestAssignment, QuestDefinition, QuestOptions } from '../../shared/questManagement'
import PageNumbers from '../../shared/components/PageNumbers'
import './MissionManagement.css'
import './QuestManagement.css'

type Tab = 'POOL' | 'DAILY' | 'MONTHLY' | 'SEMESTER'
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date())
const toggle = <T,>(items: T[], value: T) => items.includes(value) ? items.filter(x => x !== value) : [...items, value]

function DefinitionEditor({ item, options, onClose, onSaved }: {
  item: QuestDefinition | null; options: QuestOptions; onClose: () => void; onSaved: () => void
}) {
  const [title, setTitle] = useState(item?.title ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [activity, setActivity] = useState(item?.activity ?? 'PROGRAM')
  const [target, setTarget] = useState(item?.target_count ?? 1)
  const [xp, setXp] = useState(item?.xp ?? 0)
  const [active, setActive] = useState(item?.is_active ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      await api(`/system/quests/definitions/${item?.id ?? 0}`, { method: 'PUT', body: JSON.stringify({
        expectedVersion: item?.version ?? 0, title, description, activity, targetCount: target, xp, isActive: active,
      }) }); onSaved()
    } catch (reason) { setError(missionError(reason)) } finally { setBusy(false) }
  }
  const source = options.activities.find(x => x.code === activity)
  return <section className="mm-editor"><div className="mm-heading"><h2>{item ? '퀘스트 수정' : '새 퀘스트 등록'}</h2><button className="admin-btn admin-btn-ghost" disabled={busy} onClick={onClose}>닫기</button></div>
    <form onSubmit={save}><fieldset disabled={busy} className="mm-fields">
      <label>퀘스트 제목<input autoFocus required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 비교과 프로그램 3회 수료하기" /></label>
      <label>학생에게 보여줄 설명<textarea rows={3} maxLength={3000} value={description} onChange={e => setDescription(e.target.value)} /></label>
      <div className="qm-form-row"><label>자동 판정 활동<select value={activity} onChange={e => setActivity(e.target.value)}>{options.activities.map(a => <option key={a.code} value={a.code}>{a.label}</option>)}</select></label>
        <label>목표 횟수<input required type="number" min={1} max={1000} step={1} value={target || ''} onChange={e => setTarget(Number(e.target.value))} /></label>
        <label>완료 보상 XP<input required type="number" min={0} max={100000} step={1} value={xp} onChange={e => setXp(Number(e.target.value))} /></label></div>
      <p className="qm-rule">{source?.note} 선택한 운영 기간에 {target || '—'}{source?.unit} 달성하면 완료됩니다.</p>
      <label className="mm-check"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />편성에서 사용할 수 있도록 활성화</label>
      <p className="mm-hint">풀의 수정은 다음 편성 저장부터 반영됩니다. 이미 시작된 편성의 조건과 보상은 유지됩니다.</p>
      <button className="admin-btn admin-btn-primary">{busy ? '저장 중…' : '퀘스트 저장'}</button>
    </fieldset></form>{error && <p className="mm-error" role="alert">{error}</p>}
  </section>
}

function Pool({ options, selection, onToggle, onEdit, revision }: {
  options: QuestOptions; selection?: QuestDefinition[]; onToggle?: (q: QuestDefinition) => void
  onEdit?: (q: QuestDefinition | null) => void; revision: number
}) {
  const [search, setSearch] = useState(''), [q, setQ] = useState('')
  const [page, setPage] = useState(1), [retry, setRetry] = useState(0)
  const [data, setData] = useState<{ items: QuestDefinition[]; totalCount: number } | null>(null)
  const [loading, setLoading] = useState(true), [error, setError] = useState('')
  const activeOnly = !!onToggle
  useEffect(() => {
    // Reset the request status when the server-side query changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const abort = new AbortController(); setLoading(true); setError('')
    api<{ items: QuestDefinition[]; totalCount: number }>(`/system/quests/definitions?${queryString({ q, page, activeOnly })}`, { signal: abort.signal })
      .then(result => { if (!abort.signal.aborted) setData(result) })
      .catch(reason => { if (!abort.signal.aborted) setError(missionError(reason)) })
      .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [q, page, revision, retry, activeOnly])
  return <section className="mm-panel"><div className="mm-heading"><div><span className="mm-kicker">재사용 가능한 활동</span><h2>퀘스트 풀 <small>{data?.totalCount ?? 0}개</small></h2></div>{onEdit && <button className="admin-btn admin-btn-primary" onClick={() => onEdit(null)}>퀘스트 등록</button>}</div>
    <form className="mm-search" onSubmit={e => { e.preventDefault(); setQ(search); setPage(1) }}><input aria-label="퀘스트 검색" placeholder="퀘스트 제목 검색" maxLength={100} value={search} onChange={e => setSearch(e.target.value)} /><button className="admin-btn admin-btn-ghost">검색</button></form>
    {error ? <p className="mm-error" role="alert">{error}<button onClick={() => setRetry(x => x + 1)}>다시 조회</button></p> : loading ? <p className="mm-empty" role="status">퀘스트를 불러오는 중입니다.</p> : <>
      <div className="mm-table-scroll"><table className="mm-table"><thead><tr><th scope="col">퀘스트 / 완료 조건</th><th scope="col">XP</th><th scope="col">{onToggle ? '선택' : '관리'}</th></tr></thead><tbody>{data?.items.map(item => <tr key={item.id}><td><strong>{item.title}</strong><span>{options.activities.find(a => a.code === item.activity)?.label} {item.target_count}회</span>{!item.is_active && <small>사용 중지</small>}</td><td className="qm-nowrap">{item.xp.toLocaleString()}</td><td>{onToggle ? <input type="checkbox" aria-label={`${item.title} 편성 선택`} checked={selection?.some(x => x.id === item.id) ?? false} disabled={(selection?.length ?? 0) >= 30 && !selection?.some(x => x.id === item.id)} onChange={() => onToggle(item)} /> : <button className="admin-btn admin-btn-ghost" onClick={() => onEdit?.(item)}>수정</button>}</td></tr>)}</tbody></table></div>
      {!data?.items.length && <div className="mm-empty">{q ? '검색 결과가 없습니다.' : '아직 등록된 퀘스트가 없습니다. 퀘스트 풀에서 활동과 완료 조건을 등록하세요.'}</div>}
      <div className="mm-pagination"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</button><PageNumbers page={page} pages={Math.ceil((data?.totalCount ?? 0) / 20)} onChange={setPage} /><button disabled={page * 20 >= (data?.totalCount ?? 0)} onClick={() => setPage(p => p + 1)}>다음</button></div>
    </>}
  </section>
}

function AssignmentEditor({ period, periodKey, item, options, onClose, onSaved }: {
  period: 'MONTHLY' | 'SEMESTER'; periodKey: string; item: QuestAssignment | null; options: QuestOptions
  onClose: () => void; onSaved: () => void
}) {
  const [title, setTitle] = useState(item?.title ?? '')
  const [audience, setAudience] = useState<'ALL' | 'FILTERED'>(item?.audience ?? 'ALL')
  const [grades, setGrades] = useState(item?.grades ?? [])
  const [types, setTypes] = useState(item?.student_types ?? [])
  const [selected, setSelected] = useState<QuestDefinition[]>(item?.items.map(q => ({ ...q, id: q.quest_id, version: q.definition_version, is_active: true })) ?? [])
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const frozen = item?.locked ?? false
  const typeOptions = [...options.studentTypes, { code: 'UNDIAGNOSED', label: '미진단' }]
  async function save(published: boolean) {
    setBusy(true); setError('')
    try {
      await api(`/system/quests/assignments/${item?.id ?? 0}`, { method: 'PUT', body: JSON.stringify({
        expectedVersion: item?.version ?? 0, title, period, periodKey, audience, grades, studentTypes: types,
        questIds: selected.map(q => q.id), published,
      }) }); onSaved()
    } catch (reason) { setError(missionError(reason)) } finally { setBusy(false) }
  }
  return <section className="qm-editor"><div className="mm-heading"><div><h2>{item ? '편성 수정' : '새 편성'}</h2><p className="mm-hint">{periodKey} · {period === 'MONTHLY' ? '월간' : '학기'} 퀘스트</p></div><button className="admin-btn admin-btn-ghost" disabled={busy} onClick={onClose}>편집 닫기</button></div>
    <fieldset className="qm-assignment-fields" disabled={busy}>
      <section className="mm-panel"><fieldset disabled={frozen} className="mm-fields"><label>편성 이름<input required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 1학년 진로탐색형 · 10월 성장 퀘스트" /></label>
        <div className="qm-audience" role="group" aria-label="대상 학생"><label className="mm-check"><input type="radio" name="audience" checked={audience === 'ALL'} onChange={() => { setAudience('ALL'); setGrades([]); setTypes([]) }} />전체 학생</label><label className="mm-check"><input type="radio" name="audience" checked={audience === 'FILTERED'} onChange={() => setAudience('FILTERED')} />학년·C-CORE 유형별</label></div>
        {audience === 'ALL' ? <p className="qm-rule">모든 학생에게 같은 퀘스트를 배정합니다. 학년·유형 필터는 적용하지 않습니다.</p> : <div className="qm-filter-grid"><fieldset><legend>학년 <small>미선택 시 전체 학년</small></legend><div className="qm-checks">{[1, 2, 3, 4].map(g => <label key={g} className="mm-check"><input type="checkbox" checked={grades.includes(g)} onChange={() => setGrades(toggle(grades, g))} />{g}학년</label>)}</div></fieldset><fieldset><legend>C-CORE 진단유형 <small>미선택 시 모든 유형</small></legend><div className="qm-checks">{typeOptions.map(t => <label key={t.code} className="mm-check"><input type="checkbox" checked={types.includes(t.code)} onChange={() => setTypes(toggle(types, t.code))} />{t.label}</label>)}</div></fieldset></div>}
        <p className="mm-hint">같은 기간에 대상이 겹치는 편성은 저장할 수 없습니다. 학년과 유형을 함께 선택하면 두 조건을 모두 만족하는 학생에게 표시됩니다. 학생의 현재 학년·진단유형으로 판정합니다.</p>
      </fieldset></section>
      {frozen && <p className="qm-rule">시작된 편성은 조건과 XP를 유지합니다. 게시 여부만 변경할 수 있습니다.</p>}
      <div className="qm-compose">{!frozen && <Pool options={options} selection={selected} onToggle={q => setSelected(previous => previous.some(x => x.id === q.id) ? previous.filter(x => x.id !== q.id) : [...previous, q])} revision={0} />}
        <section className="mm-panel"><div className="mm-heading"><div><span className="mm-kicker">학생에게 표시할 내용</span><h2>선택한 퀘스트 <small>{selected.length} / 30</small></h2></div><strong className="qm-total">{selected.reduce((sum, q) => sum + q.xp, 0).toLocaleString()} XP</strong></div>
          <ol className="mm-selected">{selected.map((q, index) => <li key={q.id}><span className="mm-number">{index + 1}</span><div><strong>{q.title}</strong><p>{options.activities.find(a => a.code === q.activity)?.label} {q.target_count}회 · {q.xp.toLocaleString()} XP</p><p>{q.description}</p></div>{!frozen && <button className="admin-btn admin-btn-ghost" aria-label={`${q.title} 제외`} onClick={() => setSelected(selected.filter(x => x.id !== q.id))}>제외</button>}</li>)}</ol>
          {!selected.length && <p className="mm-empty">왼쪽 퀘스트 풀에서 활동을 선택하세요.</p>}
          <p className="mm-hint">선택한 월·학기의 활동 기록을 집계합니다. 완료 보상은 퀘스트마다 한 번 지급되며 학년별 XP 상한이 적용됩니다.</p>
        </section></div>
      <div className="qm-save"><button className="admin-btn admin-btn-ghost" disabled={!title.trim() || !selected.length || (audience === 'FILTERED' && !grades.length && !types.length)} onClick={() => void save(false)}>비공개 저장</button><button className="admin-btn admin-btn-primary" disabled={!title.trim() || !selected.length || (audience === 'FILTERED' && !grades.length && !types.length)} onClick={() => void save(true)}>{busy ? '저장 중…' : '게시 예약·저장'}</button></div>
    </fieldset>{error && <p className="mm-error" role="alert">{error}</p>}
  </section>
}

function Assignments({ period, options }: { period: 'MONTHLY' | 'SEMESTER'; options: QuestOptions }) {
  const [periodKey, setPeriodKey] = useState(period === 'MONTHLY' ? today().slice(0, 7) : options.semesters[0]?.code ?? '')
  const [page, setPage] = useState(1), [revision, setRevision] = useState(0)
  const [data, setData] = useState<{ items: QuestAssignment[]; totalCount: number } | null>(null)
  const [editor, setEditor] = useState<{ item: QuestAssignment | null } | null>(null)
  const [loading, setLoading] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  useEffect(() => {
    if (!periodKey) return
    // Reset the request status when the server-side query changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const abort = new AbortController(); setLoading(true); setError('')
    api<{ items: QuestAssignment[]; totalCount: number }>(`/system/quests/assignments?${queryString({ period, periodKey, page })}`, { signal: abort.signal })
      .then(result => { if (!abort.signal.aborted) setData(result) })
      .catch(reason => { if (!abort.signal.aborted) setError(missionError(reason)) })
      .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [period, periodKey, page, revision])
  return <>
    <fieldset className="mm-toolbar" disabled={!!editor}><label>{period === 'MONTHLY' ? '운영 월' : '운영 학기'}{period === 'MONTHLY' ? <input type="month" value={periodKey} onChange={e => { setPeriodKey(e.target.value); setPage(1); setMessage('') }} /> : <select value={periodKey} onChange={e => { setPeriodKey(e.target.value); setPage(1); setMessage('') }}><option value="">학기 선택</option>{options.semesters.map(s => <option key={s.code} value={s.code}>{s.label} ({s.payload.startDate} ~ {s.payload.endDate})</option>)}</select>}</label><button className="admin-btn admin-btn-primary" disabled={!periodKey} onClick={() => { setEditor({ item: null }); setMessage('') }}>새 편성 만들기</button><Link to="/system/codes" className="qm-link">학기 일정 관리</Link></fieldset>
    {!periodKey ? <p className="mm-empty">운영 기간을 선택하세요. 학기는 코드관리의 ‘퀘스트 · 학기 운영 일정’에서 등록할 수 있습니다.</p> : editor ? <AssignmentEditor period={period} periodKey={periodKey} item={editor.item} options={options} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setRevision(r => r + 1); setMessage('편성을 저장했습니다. 게시한 퀘스트는 운영 기간에 대상 학생에게 표시됩니다.') }} /> : <section className="mm-panel"><div className="mm-heading"><h2>대상별 편성 <small>{data?.totalCount ?? 0}개</small></h2><p className="mm-hint">기간이 시작되기 전에 준비하고 게시를 예약하세요.</p></div>
      {error ? <p className="mm-error" role="alert">{error}<button onClick={() => setRevision(r => r + 1)}>다시 조회</button></p> : loading ? <p className="mm-empty" role="status">편성을 불러오는 중입니다.</p> : <><div className="mm-table-scroll"><table className="mm-table"><thead><tr><th>편성 이름</th><th>대상 학생</th><th>퀘스트 / XP</th><th>게시 상태</th><th>관리</th></tr></thead><tbody>{data?.items.map(a => <tr key={a.id}><td><strong>{a.title}</strong><span>{a.starts_on} ~ {a.ends_on}</span></td><td>{a.audience === 'ALL' ? '전체 학생' : <>{a.grades.length ? a.grades.map(g => `${g}학년`).join(', ') : '전체 학년'}<span>{a.student_types.length ? a.student_types.map(t => options.studentTypes.find(x => x.code === t)?.label ?? '미진단').join(', ') : '모든 유형'}</span></>}</td><td>{a.items.length}개 / {a.items.reduce((sum, q) => sum + q.xp, 0).toLocaleString()} XP</td><td>{a.published ? a.starts_on > today() ? '게시 예약' : '게시' : '비공개'}</td><td><button className="admin-btn admin-btn-ghost" onClick={() => setEditor({ item: a })}>수정</button></td></tr>)}</tbody></table></div>{!data?.items.length && <p className="mm-empty">등록된 편성이 없습니다. 퀘스트 풀에서 준비한 활동을 학생 대상별로 편성하세요.</p>}
        <div className="mm-pagination"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</button><PageNumbers page={page} pages={Math.ceil((data?.totalCount ?? 0) / 20)} onChange={setPage} /><button disabled={page * 20 >= (data?.totalCount ?? 0)} onClick={() => setPage(p => p + 1)}>다음</button></div></>}
    </section>}{message && <p className="mm-success" role="status">{message}</p>}
  </>
}

export default function QuestManagement() {
  const [tab, setTab] = useState<Tab>('POOL')
  const [options, setOptions] = useState<QuestOptions | null>(null)
  const [error, setError] = useState(''), [retry, setRetry] = useState(0)
  const [editor, setEditor] = useState<{ item: QuestDefinition | null } | null>(null)
  const [revision, setRevision] = useState(0), [message, setMessage] = useState('')
  useEffect(() => {
    // Clear a failed request before explicitly retrying configuration loading.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const abort = new AbortController(); setError('')
    api<QuestOptions>('/system/quests/options', { signal: abort.signal }).then(result => { if (!abort.signal.aborted) setOptions(result) }).catch(reason => { if (!abort.signal.aborted) setError(missionError(reason)) })
    return () => abort.abort()
  }, [retry])
  return <div className="admin-page mm-page qm-page"><header className="admin-page-head"><div><h1 className="admin-page-title">퀘스트 관리</h1><p className="admin-page-desc">활동으로 확인할 수 있는 퀘스트를 만들고, 기간과 학생 대상에 맞춰 편성합니다.</p></div></header>
    <nav className="qm-tabs" aria-label="퀘스트 관리 구분">{([['POOL', '퀘스트 풀'], ['DAILY', '일일 · 고정 2개'], ['MONTHLY', '월간 편성'], ['SEMESTER', '학기 편성']] as const).map(([value, label]) => <button key={value} aria-current={tab === value ? 'page' : undefined} onClick={() => { if (editor && !window.confirm('작성 중인 내용을 닫고 이동할까요?')) return; setTab(value); setEditor(null); setMessage('') }}>{label}</button>)}</nav>
    {error ? <p className="mm-error" role="alert">{error}<button onClick={() => setRetry(r => r + 1)}>다시 조회</button></p> : !options ? <p className="mm-empty" role="status">설정을 불러오는 중입니다.</p> : tab === 'POOL' ? <>{editor ? <DefinitionEditor item={editor.item} options={options} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setRevision(r => r + 1); setMessage('퀘스트 풀에 저장했습니다. 월간·학기 편성에서 선택할 수 있습니다.') }} /> : <Pool options={options} onEdit={item => setEditor({ item })} revision={revision} />}{message && <p role="status" className="mm-success">{message}</p>}</> : tab === 'DAILY' ? <section className="mm-panel"><div className="mm-heading"><div><span className="mm-kicker">모든 학생 · 매일 같은 두 가지</span><h2>일일 퀘스트</h2></div><Link className="admin-btn admin-btn-ghost" to="/system/codes">일일 보상 XP 설정</Link></div><ol className="qm-daily"><li><span className="mm-number">1</span><div><h3>출석체크</h3><p>메인 또는 성장 퀘스트 보드에서 출석 버튼을 누르면 완료합니다. 두 화면의 출석 기록과 보상은 하루 한 번만 인정합니다.</p></div></li><li><span className="mm-number">2</span><div><h3>TOEIC 영단어 맞추기</h3><p>관리자가 정한 정답 개수 이상을 맞추면 완료합니다. 최대 문제 수와 이수 정답 수는 미션 관리의 ‘선택한 문제’에서 설정합니다.</p><Link className="qm-link" to="/quests/missions">미션 출제·이수 기준 설정 →</Link></div></li></ol><p className="qm-rule">일일 퀘스트는 추가·삭제하지 않습니다. 기존 규칙대로 학기 중 평일에 XP가 지급되며, 보상 변경은 이후 완료에 적용됩니다.</p></section> : <Assignments key={tab} period={tab} options={options} />}
  </div>
}
