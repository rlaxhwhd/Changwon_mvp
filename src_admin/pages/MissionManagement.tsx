import PageNumbers from '../../shared/components/PageNumbers'
import { useEffect, useState, type FormEvent } from 'react'
import { api, queryString } from '../../shared/api'
import { currentMonday, missionError, type MissionQuestion, type MissionWeek, type QuestionKind, type WeekKind } from '../../shared/missions'
import { codeItems, codeLabel } from '../../shared/metadataStore'
import { useMetadata } from '../../shared/useMetadata'
import './MissionManagement.css'

const difficultyOptions = () => codeItems.filter(x => x.group_code === 'TOEIC_DIFFICULTY' && x.is_active).sort((a,b) => a.sort_order - b.sort_order)

function QuestionEditor({ item, kind, onClose, onSaved }: { item: MissionQuestion | null; kind: QuestionKind; onClose: () => void; onSaved: (item: MissionQuestion) => void }) {
  useMetadata()
  const [difficulty, setDifficulty] = useState(item?.difficulty_code ?? 'MEDIUM')
  const [prompt, setPrompt] = useState(item?.prompt ?? '')
  const [category, setCategory] = useState(item?.category ?? '')
  const [word, setWord] = useState(item?.content.word ?? '')
  const [aliases, setAliases] = useState(item?.content.aliases.join(', ') ?? '')
  const [example, setExample] = useState(item?.content.example ?? '')
  const [choices, setChoices] = useState(item?.content.choices.length ? item.content.choices : ['', '', '', ''])
  const [answer, setAnswer] = useState(item?.content.answer ?? 0)
  const [explanation, setExplanation] = useState(item?.content.explanation ?? '')
  const [active, setActive] = useState(item?.is_active ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const saved = await api<MissionQuestion>(`/system/missions/questions/${item?.id ?? 0}`, { method: 'PUT', body: JSON.stringify({ expectedVersion: item?.version ?? 0, kind, prompt, category, difficulty, word: kind === 'TOEIC' ? word : '', aliases: kind === 'TOEIC' ? aliases.split(',').map(x => x.trim()).filter(Boolean) : [], example, choices: kind === 'TOEIC' ? [] : choices, answer: kind === 'TOEIC' ? 0 : answer, explanation, isActive: active }) })
      onSaved(saved)
    } catch (error) { setError(missionError(error)) } finally { setBusy(false) }
  }
  return <section className="mm-editor" aria-labelledby="mm-editor-title"><div className="mm-heading"><div><span className="mm-kicker">{kind} 문제 풀</span><h2 id="mm-editor-title">{item ? '문제 수정' : kind === 'TOEIC' ? '영단어 등록' : '문제 직접 등록'}</h2></div><button className="admin-btn admin-btn-ghost" disabled={busy} onClick={onClose}>편집 닫기</button></div>
    <form onSubmit={save}><fieldset disabled={busy} className="mm-fields">
      <label>분류<input value={category} maxLength={100} onChange={e => setCategory(e.target.value)} placeholder={kind === 'TOEIC' ? '예: 비즈니스 · 회의' : '예: 수리능력 · 자료해석'} /></label>
      {kind === 'TOEIC' && <label>난이도<select value={difficulty} onChange={e => setDifficulty(e.target.value)}>{difficultyOptions().map(x => <option key={x.code} value={x.code}>{x.label}</option>)}</select></label>}
      {kind === 'TOEIC' && <label>영단어 (정답)<input required maxLength={150} value={word} onChange={e => setWord(e.target.value)} placeholder="예: accomplish" /></label>}
      <label>{kind === 'TOEIC' ? '단어 뜻 (퀴즈에서는 이 뜻을 보고 영단어를 입력합니다)' : '문제 내용'}<textarea required rows={kind === 'TOEIC' ? 2 : 5} maxLength={10000} value={prompt} onChange={e => setPrompt(e.target.value)} /></label>
      {kind === 'TOEIC' ? <><label>추가 허용 정답<input maxLength={1000} value={aliases} onChange={e => setAliases(e.target.value)} placeholder="복수 정답이 있으면 쉼표로 구분" /></label><label>예문<textarea rows={2} maxLength={2000} value={example} onChange={e => setExample(e.target.value)} /></label></> : <div className="mm-choices"><strong>보기 및 정답 선택</strong>{choices.map((choice, index) => <label key={index}><input aria-label={`${index + 1}번을 정답으로 지정`} type="radio" name="answer" checked={answer === index} onChange={() => setAnswer(index)} /><span>{index + 1}</span><input aria-label={`${index + 1}번 보기`} required maxLength={2000} value={choice} onChange={e => setChoices(previous => previous.map((x, i) => i === index ? e.target.value : x))} /></label>)}<div className="mm-actions"><button type="button" className="admin-btn admin-btn-ghost" disabled={choices.length >= 5} onClick={() => setChoices([...choices, ''])}>보기 추가</button><button type="button" className="admin-btn admin-btn-ghost" disabled={choices.length <= 2} onClick={() => { setChoices(choices.slice(0, -1)); setAnswer(Math.min(answer, choices.length - 2)) }}>마지막 보기 삭제</button></div></div>}
      <label>해설<textarea rows={3} maxLength={5000} value={explanation} onChange={e => setExplanation(e.target.value)} /></label>
      <label className="mm-check"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />문제 풀에서 사용</label>
      <p className="mm-hint">수정은 다음 주간 저장부터 반영됩니다. 이미 시작한 학생의 문제와 채점 기준은 유지됩니다.</p>
      <button className="admin-btn admin-btn-primary" type="submit">{busy ? '저장 중…' : '문제 풀에 저장'}</button>
    </fieldset>{error && <p className="mm-error" role="alert">{error}</p>}</form></section>
}

export default function MissionManagement() {
  useMetadata()
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [sort, setSort] = useState('newest')
  const [kind, setKind] = useState<WeekKind>('TOEIC')
  const [bankKind, setBankKind] = useState<QuestionKind>('TOEIC')
  const [date, setDate] = useState(currentMonday)
  const [week, setWeek] = useState<MissionWeek | null>(null)
  const [title, setTitle] = useState('')
  const [selected, setSelected] = useState<MissionQuestion[]>([])
  const [selectionLimit, setSelectionLimit] = useState<10 | 20>(10)
  const [bank, setBank] = useState<MissionQuestion[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadedWeek, setLoadedWeek] = useState('')
  const [bankLoading, setBankLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [bankError, setBankError] = useState('')
  const [message, setMessage] = useState('')
  const [editor, setEditor] = useState<{ item: MissionQuestion | null; kind: QuestionKind } | null>(null)
  const [reloadWeek, setReloadWeek] = useState(0)
  useEffect(() => {
    const abort = new AbortController()
    setLoading(true); setError(''); setMessage('')
    api<MissionWeek | null>(`/system/missions/weeks/${date}/${kind}`, { signal: abort.signal }).then(row => {
      setLoadedWeek(`${date}/${kind}`); setWeek(row); setTitle(row?.title ?? (kind === 'TOEIC' ? '이번 주 TOEIC 영단어' : '이번 주 NCS/GSAT')); setSelected(row?.items ?? []); setSelectionLimit(row?.selection_limit ?? 10)
    }).catch(e => { if (!abort.signal.aborted) setError(missionError(e)) }).finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [date, kind, reloadWeek])
  useEffect(() => {
    const abort = new AbortController()
    setBankLoading(true); setBankError('')
    api<{ items: MissionQuestion[]; totalCount: number }>(`/system/missions/questions?${queryString({ kind: bankKind, q, page, difficulty: bankKind === 'TOEIC' ? difficultyFilter : '', sort })}`, { signal: abort.signal }).then(data => { setBank(data.items); setTotal(data.totalCount) }).catch(e => { if (!abort.signal.aborted) setBankError(missionError(e)) }).finally(() => { if (!abort.signal.aborted) setBankLoading(false) })
    return () => abort.abort()
  }, [bankKind, page, q, revision, difficultyFilter, sort])
  async function save(published: boolean) {
    setSaving(true); setError(''); setMessage('')
    try {
      const row = await api<MissionWeek>(`/system/missions/weeks/${date}/${kind}`, { method: 'PUT', body: JSON.stringify({ expectedVersion: week?.version ?? 0, title, selectionLimit, questionIds: selected.map(x => x.id), published }) })
      setWeek(row); setSelected(row.items); setRevision(x => x + 1); setMessage(published ? '게시했습니다. 해당 주에 학생 화면에서 학습할 수 있습니다.' : '비공개로 저장했습니다. 학생에게는 표시되지 않습니다.')
    } catch (e) { setError(missionError(e)) } finally { setSaving(false) }
  }
  async function randomFill() {
    if (selected.length >= selectionLimit) { setMessage('설정한 개수만큼 이미 선택되어 있습니다.'); return }
    setSaving(true); setError(''); setMessage('')
    try {
      const data = await api<{ items: MissionQuestion[] }>(`/system/missions/questions/random?${queryString({ kind: bankKind, count: selectionLimit, q, difficulty: bankKind === 'TOEIC' ? difficultyFilter : '', excludeIds: selected.map(x => x.id) })}`)
      setSelected(previous => [...previous, ...data.items]); setMessage(`기존 선택을 유지하고 ${data.items.length}개를 랜덤으로 추가했습니다. 저장·게시 전까지는 선택 목록에만 반영됩니다.`)
    } catch (e) { setError(missionError(e)) } finally { setSaving(false) }
  }
  function move(index: number, offset: number) {
    const copy = [...selected]; [copy[index], copy[index + offset]] = [copy[index + offset], copy[index]]; setSelected(copy)
  }
  return <div className="admin-page mm-page"><header className="admin-page-head"><div><h1 className="admin-page-title">미션 관리</h1><p className="admin-page-desc">문제 풀에서 주간 학습을 구성하고, 준비한 미션을 학생에게 게시합니다.</p></div></header>
    <fieldset disabled={saving || !!editor} className="mm-toolbar"><label>출제 주 · 월요일<input type="date" value={date} onChange={e => { if (e.target.value) { const value = new Date(e.target.value + 'T00:00:00Z'); value.setUTCDate(value.getUTCDate() - (value.getUTCDay() + 6) % 7); setDate(value.toISOString().slice(0, 10)) } }} /></label><div className="mm-tabs">{(['TOEIC', 'NCS_GSAT'] as const).map(value => <button type="button" key={value} aria-pressed={kind === value} onClick={() => { setKind(value); setBankKind(value === 'TOEIC' ? 'TOEIC' : 'NCS'); setPage(1); setSearch(''); setQ('') }}>{value === 'TOEIC' ? 'TOEIC 영단어' : 'NCS / GSAT'}</button>)}</div><span className="mm-badge">{loading ? '조회 중' : week?.published ? '게시 중' : '비공개'}</span></fieldset>
    <p className="mm-hint">한국 시간 월요일~일요일 기준입니다. 게시한 미션도 ‘비공개 저장’을 누르면 노출이 중단됩니다.</p>
    {editor ? <QuestionEditor key={`${editor.kind}-${editor.item?.id ?? 0}`} {...editor} onClose={() => setEditor(null)} onSaved={item => { setSelected(previous => previous.map(x => x.id === item.id ? item : x)); setEditor(null); setRevision(x => x + 1); setMessage('문제 풀에 저장했습니다. 주간 목록에 선택한 뒤 게시하세요.') }} /> : <fieldset disabled={saving} className="mm-layout">
      <section className="mm-panel"><div className="mm-heading"><div><span className="mm-kicker">01 · 문제 선택</span><h2>문제 풀 <small>{total}개</small></h2></div><button className="admin-btn admin-btn-primary" disabled={saving} onClick={() => setEditor({ item: null, kind: bankKind })}>{bankKind === 'TOEIC' ? '단어 등록' : `${bankKind} 직접 등록`}</button></div>
        <form className="mm-search" onSubmit={e => { e.preventDefault(); setQ(search); setPage(1) }}>{kind === 'NCS_GSAT' && <select aria-label="문제 유형" value={bankKind} onChange={e => { setBankKind(e.target.value as QuestionKind); setPage(1) }}><option>NCS</option><option>GSAT</option></select>}<input aria-label="문제 풀 검색" placeholder="단어, 문제 또는 분류 검색" maxLength={100} value={search} onChange={e => setSearch(e.target.value)} /><button className="admin-btn admin-btn-ghost">검색</button></form>
        {kind === 'TOEIC' && <div className="mm-pool-filters"><label>난이도<select value={difficultyFilter} onChange={e => { setDifficultyFilter(e.target.value); setPage(1) }}><option value="">전체</option>{difficultyOptions().map(x => <option key={x.code} value={x.code}>{x.label}</option>)}</select></label><label>정렬<select value={sort} onChange={e => { setSort(e.target.value); setPage(1) }}><option value="newest">최근 등록순</option><option value="word">영어단어순</option><option value="least-used">출제 적은 순</option></select></label><button className="admin-btn admin-btn-ghost" disabled={bankLoading || saving || loading || loadedWeek !== `${date}/${kind}`} onClick={() => setSelected(previous => [...previous, ...bank.filter(item => item.is_active && !previous.some(x => x.id === item.id)).slice(0, Math.max(0, selectionLimit - previous.length))])}>현재 목록 일괄 선택</button></div>}
        {kind === 'TOEIC' && <p className="mm-hint mm-pool-note">난이도는 초기 참고 분류이며 수정할 수 있습니다. 출제횟수는 게시한 주간 미션 수이며, 같은 주 재게시·비공개 저장은 횟수를 늘리지 않습니다.</p>}
        {bankError && <p className="mm-error" role="alert">{bankError}<button onClick={() => setRevision(x => x + 1)}>다시 조회</button></p>}
        {bankLoading ? <p className="mm-empty" role="status">문제 풀을 불러오는 중입니다.</p> : !bankError && <><div className="mm-table-scroll"><table className="mm-table"><thead><tr><th>선택</th><th>번호</th><th>{bankKind === 'TOEIC' ? '영어단어 / 뜻' : '문제'}</th>{bankKind === 'TOEIC' ? <><th>난이도</th><th>출제횟수</th></> : <th>분류</th>}<th>관리</th></tr></thead><tbody>{bank.map(item => <tr key={item.id}><td><input type="checkbox" aria-label={`${item.content.word || item.prompt} 출제 선택`} disabled={!item.is_active || saving || loading || loadedWeek !== `${date}/${kind}` || (selected.length >= selectionLimit && !selected.some(x => x.id === item.id))} checked={selected.some(x => x.id === item.id)} onChange={() => setSelected(previous => previous.some(x => x.id === item.id) ? previous.filter(x => x.id !== item.id) : [...previous, item])} /></td><td className="mm-id">{item.id}</td><td>{item.kind === 'TOEIC' && <strong>{item.content.word}</strong>}<span>{item.prompt}</span>{!item.is_active && <small>사용 중지</small>}</td>{bankKind === 'TOEIC' ? <><td><span className={`mm-difficulty is-${item.difficulty_code?.toLowerCase()}`}>{codeLabel('TOEIC_DIFFICULTY', item.difficulty_code ?? '')}</span></td><td className="mm-count">{item.publication_count ?? 0}회</td></> : <td>{item.category || '—'}</td>}<td><button className="admin-btn admin-btn-ghost" disabled={saving} onClick={() => setEditor({ item, kind: item.kind })}>수정</button></td></tr>)}</tbody></table></div>{bank.length === 0 && <p className="mm-empty">등록된 문제가 없습니다. 새 단어 또는 문제를 등록해 주세요.</p>}</>}
        <div className="mm-pagination"><button disabled={page <= 1 || bankLoading} onClick={() => setPage(x => x - 1)}>이전</button><PageNumbers page={page} pages={Math.ceil(total / 30)} onChange={setPage} disabled={bankLoading} /><span>{page} / {Math.max(1, Math.ceil(total / 30))}</span><button disabled={page * 30 >= total || bankLoading} onClick={() => setPage(x => x + 1)}>다음</button></div>
      </section>
      <section className="mm-panel mm-week"><div className="mm-heading"><div><span className="mm-kicker">02 · 주간 출제</span><h2>선택한 문제 <small>{selected.length} / {selectionLimit}</small></h2></div></div>
        <fieldset disabled={saving || loading || loadedWeek !== `${date}/${kind}`} className="mm-fields">
        <div className="mm-selection-tools"><label>최대 선택 개수<select value={selectionLimit} onChange={e => { setSelectionLimit(Number(e.target.value) as 10 | 20); setMessage('') }}><option value={10}>10개</option><option value={20}>20개</option></select></label><button className="admin-btn admin-btn-primary" disabled={selected.length >= selectionLimit || bankLoading || !!bankError} onClick={() => void randomFill()}>{saving ? '처리 중…' : '랜덤 생성'}</button><button className="admin-btn admin-btn-danger-ghost" disabled={!selected.length} onClick={() => { setSelected([]); setError(''); setMessage('선택 목록을 모두 비웠습니다. 문제 풀의 원본은 유지됩니다.') }}>선택 전체 삭제</button></div>
        <p className="mm-hint">현재 문제 유형·난이도·검색 조건의 전체 문제 풀에서, 기존 선택과 중복되지 않도록 부족한 개수만 추가합니다.</p>
        {selected.length > selectionLimit && <p className="mm-error" role="alert">선택된 문제가 {selected.length}개입니다. {selectionLimit}개 이하로 줄이거나 선택 한도를 변경하세요.</p>}
        <label>학생에게 표시할 제목<input required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></label>
        <ol className="mm-selected">{selected.map((item, index) => <li key={item.id}><span className="mm-number">{index + 1}</span><div><small>{item.kind}</small><strong>{item.content.word || item.prompt}</strong>{item.kind === 'TOEIC' && <p>{item.prompt}</p>}</div><div className="mm-order"><button aria-label={`${index + 1}번 문제 위로`} disabled={index === 0} onClick={() => move(index, -1)}>↑</button><button aria-label={`${index + 1}번 문제 아래로`} disabled={index === selected.length - 1} onClick={() => move(index, 1)}>↓</button><button aria-label={`${index + 1}번 문제 제외`} onClick={() => setSelected(previous => previous.filter(x => x.id !== item.id))}>×</button></div></li>)}</ol>
        {selected.length === 0 && <p className="mm-empty">왼쪽 문제 풀에서 이번 주에 출제할 항목을 선택하세요.</p>}
        <div className="mm-actions"><button className="admin-btn admin-btn-ghost" disabled={!title.trim() || selected.length > selectionLimit} onClick={() => void save(false)}>비공개 저장</button><button className="admin-btn admin-btn-primary" disabled={!selected.length || !title.trim() || selected.length > selectionLimit} onClick={() => void save(true)}>{saving ? '저장 중…' : '학생에게 게시'}</button></div></fieldset>
      </section>
    </fieldset>}
    {error && <p className="mm-error" role="alert">{error} <button disabled={saving} onClick={() => setReloadWeek(x => x + 1)}>저장된 주간 목록 다시 조회</button></p>}{message && <p className="mm-success" role="status">{message}</p>}
  </div>
}
