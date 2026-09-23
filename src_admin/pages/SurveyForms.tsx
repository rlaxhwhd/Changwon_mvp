import { useCallback, useEffect, useMemo, useState } from 'react'
import { LuChevronDown, LuChevronUp, LuFilePlus, LuPlus, LuSend, LuTrash2, LuX } from 'react-icons/lu'
import EmptyState from '../components/EmptyState'
import { useAsyncAction } from '../../shared/useAsyncAction'
import { SURVEY_SCALE } from '../../shared/surveyStore'
import {
  SURVEY_FORM_KIND_LABEL, createArea, createItem, createSurveyForm, discardSurveyForm,
  loadSurveyDictionary, loadSurveyForms, publishSurveyForm, renameItem, saveSurveyForm,
} from '../data/surveyForms'
import type {
  SurveyDictionary, SurveyForm, SurveyFormKind, SurveyFormPlan, SurveyItemKind,
} from '../data/surveyForms'
import './SurveyForms.css'

// 설문조사 관리 — 문항·영역(부품)을 조립해 설문지 한 벌을 만들고 게시한다.
// 화면은 실제 설문지 모양으로 그린다: 영역 카드 > 5점 척도 머리글 > 번호 붙은 문항.
// 게시본은 프로그램이 붙잡고 있으므로 응답이 한 건이라도 들어오면 구성이 잠긴다(문장은 계속 고칠 수 있다).

// 역량향상률 설문지는 진로·직무·취업 3종을 각각 만든다. 버전은 역량 한 벌로 함께 올라간다 —
// 프로그램이 영역을 묶음에 걸쳐 고를 수 있어서, 묶음마다 버전을 따로 두면 한 프로그램이 버전 셋을 붙잡는다.
type TabCode = 'CAREER' | 'JOB' | 'EMPLOY' | 'SATISFACTION'
const TABS: { code: TabCode; label: string }[] = [
  { code: 'CAREER', label: '진로역량' }, { code: 'JOB', label: '직무역량' },
  { code: 'EMPLOY', label: '취업역량' }, { code: 'SATISFACTION', label: '만족도' },
]
const kindOf = (tab: TabCode): SurveyFormKind => (tab === 'SATISFACTION' ? 'SATISFACTION' : 'COMPETENCY')
const PART_REASON = '설문조사 관리에서 등록'

const planOf = (form: SurveyForm): SurveyFormPlan[] =>
  form.areas.map(area => ({ areaCode: area.key, items: area.items.map(item => item.code) }))

function move<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

function statusLabel(form: SurveyForm): string {
  if (form.status === 'DRAFT') return '초안'
  return form.isCurrent ? '게시 · 현재 사용' : '게시 · 지난 버전'
}

/** 이 영역에 문항 넣기 — 사전의 미사용 문항을 고르거나, 새 문항을 그 자리에서 등록한다. */
function AddItem({ areaCode, dictionary, used, onPick, onCreated }: {
  areaCode: string; dictionary: SurveyDictionary; used: string[]
  onPick: (code: string) => void; onCreated: (code: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [kind, setKind] = useState<SurveyItemKind>('SCALE')
  const { run, saving, error } = useAsyncAction()
  const spare = dictionary.items.filter(item => item.areaKey === areaCode && !used.includes(item.code))

  if (!open) return <button type="button" className="admin-btn sm sf-add" onClick={() => setOpen(true)}><LuPlus /> 이 영역에 문항 추가</button>
  return (
    <div className="sf-add-panel">
      <div className="sf-add-row">
        <strong>새 문항</strong>
        <input value={label} onChange={e => setLabel(e.target.value)} maxLength={200}
               placeholder="예: 나는 나의 강점을 구체적인 사례로 설명할 수 있다." />
        <select value={kind} onChange={e => setKind(e.target.value as SurveyItemKind)}>
          <option value="SCALE">5점 척도</option>
          <option value="TEXT">서술형</option>
        </select>
        <button type="button" className="admin-btn admin-btn-primary sm" disabled={!label.trim() || saving}
                onClick={() => run(async () => {
                  const code = await createItem(dictionary, areaCode, label.trim(), kind, PART_REASON)
                  onCreated(code); setLabel('')
                })}>등록하고 담기</button>
        <button type="button" className="admin-btn sm" onClick={() => setOpen(false)}><LuX /> 닫기</button>
      </div>
      {spare.length > 0 && (
        <div className="sf-add-row">
          <strong>등록된 문항</strong>
          <select defaultValue="" onChange={e => { if (e.target.value) { onPick(e.target.value); e.target.value = '' } }}>
            <option value="">이 영역의 미사용 문항 고르기 ({spare.length})</option>
            {spare.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
        </div>
      )}
      {error && <p className="sf-error" role="alert">{error}</p>}
    </div>
  )
}

/** 설문지에 영역 넣기 — 사전의 미사용 영역을 고르거나, 이 묶음 안에 새 영역을 등록한다. */
function AddArea({ group, dictionary, used, onPick, onCreated }: {
  group: string; dictionary: SurveyDictionary; used: string[]
  onPick: (code: string) => void; onCreated: (code: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const { run, saving, error } = useAsyncAction()
  const spare = dictionary.areas.filter(area => area.group === group && !used.includes(area.code))

  if (!open) return <button type="button" className="admin-btn sf-add-area" onClick={() => setOpen(true)}><LuPlus /> 영역 추가</button>
  return (
    <div className="sf-add-panel sf-add-panel--area">
      <div className="sf-add-row">
        <strong>새 영역</strong>
        <input value={label} onChange={e => setLabel(e.target.value)} maxLength={200} placeholder="예: 진로 적응·동기 역량" />
        <button type="button" className="admin-btn admin-btn-primary sm" disabled={!label.trim() || saving}
                onClick={() => run(async () => {
                  const code = await createArea(dictionary, group, label.trim(), PART_REASON)
                  onCreated(code); setLabel('')
                })}>등록하고 담기</button>
        <button type="button" className="admin-btn sm" onClick={() => setOpen(false)}><LuX /> 닫기</button>
      </div>
      {spare.length > 0 && (
        <div className="sf-add-row">
          <strong>등록된 영역</strong>
          <select defaultValue="" onChange={e => { if (e.target.value) { onPick(e.target.value); e.target.value = '' } }}>
            <option value="">이 설문지에 없는 영역 고르기 ({spare.length})</option>
            {spare.map(area => <option key={area.code} value={area.code}>{area.label}</option>)}
          </select>
        </div>
      )}
      {error && <p className="sf-error" role="alert">{error}</p>}
    </div>
  )
}

/** 문장 수정 — 사전을 직접 고친다. 모든 설문지 버전이 같은 문장을 쓰므로 버전은 올라가지 않는다. */
function ItemLabel({ code, label, dictionary, onSaved }: {
  code: string; label: string; dictionary: SurveyDictionary; onSaved: () => void
}) {
  const item = dictionary.items.find(row => row.code === code)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(label)
  const { run, saving, error } = useAsyncAction()

  if (!item) return <span className="sf-item-text">{label}</span>
  if (!editing) {
    return (
      <button type="button" className="sf-item-text sf-item-edit" title="문장 수정"
              onClick={() => { setDraft(label); setEditing(true) }}>{label}</button>
    )
  }
  return (
    <span className="sf-item-editor">
      <input value={draft} autoFocus maxLength={200} onChange={e => setDraft(e.target.value)} />
      <button type="button" className="admin-btn admin-btn-primary sm" disabled={!draft.trim() || saving}
              onClick={() => run(async () => { await renameItem(item, draft.trim(), '문항 문장 수정'); setEditing(false); onSaved() })}>저장</button>
      <button type="button" className="admin-btn sm" onClick={() => setEditing(false)}>취소</button>
      {error && <em className="sf-error">{error}</em>}
    </span>
  )
}

export default function SurveyForms() {
  const [tab, setTab] = useState<TabCode>('CAREER')
  const [forms, setForms] = useState<SurveyForm[]>([])
  const [dictionary, setDictionary] = useState<SurveyDictionary>({ areas: [], items: [] })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [plan, setPlan] = useState<SurveyFormPlan[]>([])
  const [memo, setMemo] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const { run, saving, error } = useAsyncAction()

  const reload = useCallback(async () => {
    const [rows, parts] = await Promise.all([loadSurveyForms(), loadSurveyDictionary()])
    setForms(rows); setDictionary(parts)
    return rows
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true); setLoadError('')
    reload()
      .then(() => { if (alive) setLoading(false) })
      .catch(e => { if (alive) { setLoadError(e instanceof Error ? e.message : '설문지를 불러오지 못했습니다.'); setLoading(false) } })
    return () => { alive = false }
  }, [reload])

  const kind = kindOf(tab)
  const mine = useMemo(() => forms.filter(form => form.kind === kind), [forms, kind])
  const selected = mine.find(form => form.id === selectedId)
    ?? mine.find(form => form.status === 'DRAFT') ?? mine.find(form => form.isCurrent) ?? mine[0]
  const selectedKey = selected ? `${selected.id}:${selected.lockVersion}` : ''

  // 선택이 바뀌거나 서버 저장이 끝나면 편집 상태를 서버 구성으로 되돌린다.
  useEffect(() => {
    if (!selected) return
    setPlan(planOf(selected)); setMemo(selected.memo); setReason('')
  }, [selectedKey])   // eslint-disable-line react-hooks/exhaustive-deps

  const labels = useMemo(() => {
    const map = new Map<string, { label: string; kind: SurveyItemKind }>()
    // 게시본에 담긴 문항은 사전에서 비활성돼도 계속 보여야 한다 — 설문지가 들고 있는 이름을 먼저 깔고,
    // 사전 값으로 덮어 최신 문장을 쓴다.
    for (const form of forms) for (const area of form.areas) for (const item of area.items) map.set(item.code, { label: item.label, kind: item.kind })
    for (const item of dictionary.items) map.set(item.code, { label: item.label, kind: item.kind })
    return map
  }, [forms, dictionary])
  const areaLabels = useMemo(() => {
    const map = new Map<string, string>()
    for (const form of forms) for (const area of form.areas) map.set(area.key, area.label)
    for (const area of dictionary.areas) map.set(area.code, area.label)
    return map
  }, [forms, dictionary])
  // 영역이 어느 묶음(진로·직무·취업·만족도)에 속하는지. 게시본에만 남은 영역도 이름이 나와야 한다.
  const groupOf = useMemo(() => {
    const map = new Map<string, string>()
    for (const form of forms) for (const area of form.areas) map.set(area.key, area.group)
    for (const area of dictionary.areas) map.set(area.code, area.group)
    return map
  }, [forms, dictionary])
  // 지금 탭의 영역만 그린다. plan 은 설문지 전체를 들고 있으므로 원래 인덱스를 함께 나른다.
  const visible = plan.map((area, index) => ({ area, index })).filter(row => groupOf.get(row.area.areaCode) === tab)

  const editable = !!selected && (selected.status === 'DRAFT' || !selected.locked)
  const dirty = !!selected && (JSON.stringify(plan) !== JSON.stringify(planOf(selected)) || memo !== selected.memo)
  const itemCount = plan.reduce((n, area) => n + area.items.length, 0)
  const tabItems = visible.reduce((n, row) => n + row.area.items.length, 0)
  /** 같은 묶음 안에서만 자리를 바꾼다 — 다른 탭의 영역을 건너뛰지 않게. */
  const moveArea = (index: number, delta: number) => setPlan(list => {
    const order = visible.map(row => row.index)
    const target = order[order.indexOf(index) + delta]
    if (target === undefined) return list
    const next = [...list]
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  })

  const patchArea = (index: number, patch: (area: SurveyFormPlan) => SurveyFormPlan) =>
    setPlan(list => list.map((area, i) => (i === index ? patch(area) : area)))

  const after = async (id?: number | null) => {
    await reload()
    if (id !== undefined) setSelectedId(id)
  }

  return (
    <div className="admin-page sf-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">설문조사 관리</h1>
          <p className="admin-page-desc">
            문항과 영역은 코드관리에 쌓인 부품이고, 설문지는 그 부품을 조립한 결과입니다.
            구성을 바꾸려면 새 설문지를 만들어 게시하세요. 문장만 고치는 것은 버전을 올리지 않습니다.
          </p>
        </div>
      </header>

      <div className="sf-kinds" role="tablist">
        {TABS.map(item => (
          <button key={item.code} type="button" role="tab" aria-selected={tab === item.code}
                  className={`sf-kind${tab === item.code ? ' is-on' : ''}`}
                  onClick={() => { setTab(item.code); setSelectedId(null) }}>
            {item.label}
          </button>
        ))}
      </div>

      {loadError && <p className="sf-error" role="alert">{loadError}</p>}
      {loading && <p role="status">DB에서 조회 중입니다…</p>}

      {!loading && !loadError && (
        <>
          <section className="sf-versions">
            {mine.map(form => (
              <button key={form.id} type="button"
                      className={`sf-version${selected?.id === form.id ? ' is-on' : ''}${form.status === 'DRAFT' ? ' is-draft' : ''}`}
                      onClick={() => setSelectedId(form.id)}>
                <strong>v{form.version}</strong>
                <small>{statusLabel(form)}</small>
              </button>
            ))}
            <button type="button" className="admin-btn" disabled={saving || mine.some(form => form.status === 'DRAFT')}
                    title={mine.some(form => form.status === 'DRAFT') ? '작성 중인 초안을 먼저 게시하거나 버리세요.' : undefined}
                    onClick={() => run(async () => {
                      const draft = await createSurveyForm(kind, '', '새 설문지 작성')
                      await after(draft.id)
                    })}>
              <LuFilePlus /> 새 설문지 만들기
            </button>
          </section>

          {!selected && <EmptyState title="설문지가 없습니다." message="새 설문지를 만들어 영역과 문항을 담으세요." />}

          {selected && (
            <section className="sf-sheet">
              <header className="sf-sheet-head">
                <div>
                  <h2>{TABS.find(item => item.code === tab)?.label} 설문지 <small>{SURVEY_FORM_KIND_LABEL[kind]} v{selected.version}</small></h2>
                  <p>
                    <span className={`sf-badge${selected.status === 'DRAFT' ? ' is-draft' : selected.isCurrent ? ' is-current' : ''}`}>
                      {statusLabel(selected)}
                    </span>
                    이 설문지 영역 {visible.length}개 · 문항 {tabItems}개
                    {kind === 'COMPETENCY' && <em className="sf-total">역량 전체 {plan.length}개 · {itemCount}문항</em>}
                    · 사용 프로그램 {selected.programCount}개 · 응답 {selected.responseCount}건
                  </p>
                </div>
                <label className="sf-memo">
                  메모
                  <input value={memo} onChange={e => setMemo(e.target.value)} maxLength={1000} disabled={!editable}
                         placeholder="예: 2027학년도 개편" />
                </label>
              </header>

              {!editable && (
                <p className="sf-locked">
                  이미 응답이 들어온 설문지라 구성을 바꿀 수 없습니다(응답 {selected.responseCount}건).
                  문항을 더하거나 빼려면 「새 설문지 만들기」로 다음 버전을 만드세요. 문장 수정은 아래에서 그대로 됩니다.
                </p>
              )}

              {visible.map(({ area, index: areaIndex }, position) => {
                const items = area.items.map(code => ({ code, ...(labels.get(code) ?? { label: code, kind: 'SCALE' as SurveyItemKind }) }))
                return (
                  <article className="sf-area" key={area.areaCode}>
                    <h3>
                      <span className="sf-area-no">{position + 1}</span>
                      {areaLabels.get(area.areaCode) ?? area.areaCode}
                      {editable && (
                        <span className="sf-area-tools">
                          <button type="button" className="admin-btn sm" aria-label="영역 위로" disabled={position === 0}
                                  onClick={() => moveArea(areaIndex, -1)}><LuChevronUp /></button>
                          <button type="button" className="admin-btn sm" aria-label="영역 아래로" disabled={position === visible.length - 1}
                                  onClick={() => moveArea(areaIndex, 1)}><LuChevronDown /></button>
                          <button type="button" className="admin-btn sm" onClick={() => setPlan(list => list.filter((_, i) => i !== areaIndex))}>
                            <LuTrash2 /> 영역 빼기
                          </button>
                        </span>
                      )}
                    </h3>

                    {items.some(item => item.kind === 'SCALE') && (
                      <div className="sf-scale-head" aria-hidden="true">
                        <span />{SURVEY_SCALE.map(scale => <small key={scale.value}>{scale.label}<br />({scale.value}점)</small>)}
                      </div>
                    )}

                    {items.map((item, itemIndex) => (
                      <div className={`sf-item${item.kind === 'TEXT' ? ' sf-item--text' : ''}`} key={item.code}>
                        <p className="sf-item-label">
                          <b>{itemIndex + 1}.</b>
                          <ItemLabel code={item.code} label={item.label} dictionary={dictionary} onSaved={() => { void after() }} />
                          {item.kind === 'TEXT' && <em className="sf-kind">서술형</em>}
                        </p>
                        {item.kind === 'SCALE'
                          ? SURVEY_SCALE.map(scale => <span className="sf-choice" key={scale.value} aria-hidden="true" />)
                          : <span className="sf-text-preview" aria-hidden="true">자유 서술</span>}
                        {editable && (
                          <span className="sf-item-tools">
                            <button type="button" className="admin-btn sm" aria-label="문항 위로" disabled={itemIndex === 0}
                                    onClick={() => patchArea(areaIndex, a => ({ ...a, items: move(a.items, itemIndex, -1) }))}><LuChevronUp /></button>
                            <button type="button" className="admin-btn sm" aria-label="문항 아래로" disabled={itemIndex === items.length - 1}
                                    onClick={() => patchArea(areaIndex, a => ({ ...a, items: move(a.items, itemIndex, 1) }))}><LuChevronDown /></button>
                            <button type="button" className="admin-btn sm" aria-label="문항 빼기"
                                    onClick={() => patchArea(areaIndex, a => ({ ...a, items: a.items.filter(code => code !== item.code) }))}><LuX /></button>
                          </span>
                        )}
                      </div>
                    ))}

                    {!items.length && <p className="sf-empty-area">아직 담은 문항이 없습니다.</p>}
                    {editable && (
                      <AddItem areaCode={area.areaCode} dictionary={dictionary} used={area.items}
                               onPick={code => patchArea(areaIndex, a => ({ ...a, items: [...a.items, code] }))}
                               onCreated={code => { patchArea(areaIndex, a => ({ ...a, items: [...a.items, code] })); void after() }} />
                    )}
                  </article>
                )
              })}

              {editable && (
                <AddArea group={tab} dictionary={dictionary} used={plan.map(area => area.areaCode)}
                         onPick={code => setPlan(list => [...list, { areaCode: code, items: [] }])}
                         onCreated={code => { setPlan(list => [...list, { areaCode: code, items: [] }]); void after() }} />
              )}

              <footer className="sf-actions">
                {editable && (
                  <label className="sf-reason">
                    변경 사유
                    <input value={reason} onChange={e => setReason(e.target.value)} maxLength={1000}
                           placeholder="예: 2027학년도 진로역량 문항 2개 추가" />
                  </label>
                )}
                {error && <p className="sf-error" role="alert">{error}</p>}
                <div className="sf-action-buttons">
                  {editable && (
                    <button type="button" className="admin-btn" disabled={!dirty || !reason.trim() || saving}
                            onClick={() => run(async () => { await saveSurveyForm(selected, plan, memo, reason.trim()); await after(selected.id) })}>
                      구성 저장
                    </button>
                  )}
                  {selected.status === 'DRAFT' && (
                    <>
                      <button type="button" className="admin-btn admin-btn-primary" disabled={dirty || !itemCount || !reason.trim() || saving}
                              title={dirty ? '저장하지 않은 변경이 있습니다.' : undefined}
                              onClick={() => run(async () => { await publishSurveyForm(selected, reason.trim()); await after(selected.id) })}>
                        <LuSend /> 게시
                      </button>
                      <button type="button" className="admin-btn" disabled={!reason.trim() || saving}
                              onClick={() => run(async () => { await discardSurveyForm(selected, reason.trim()); await after(null) })}>
                        <LuTrash2 /> 초안 버리기
                      </button>
                    </>
                  )}
                </div>
                {editable && !reason.trim() && <p className="sf-hint">변경 사유를 적으면 저장·게시할 수 있습니다. 이력은 코드 변경 이력과 함께 남습니다.</p>}
              </footer>
            </section>
          )}
        </>
      )}
    </div>
  )
}
