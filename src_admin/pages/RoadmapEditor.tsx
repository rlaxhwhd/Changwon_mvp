import { LuCheck, LuEye, LuFrown, LuHistory, LuInbox, LuInfo, LuLock, LuPencilRuler, LuPlus, LuRotateCcw, LuTrash2, LuUser } from 'react-icons/lu'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getActiveCounselor } from '../data/counselors'
import { STUDENTS } from '../../src_v2/data/students'
import { ROADMAP_AXES, ROADMAP_AXIS_MAP, axisLabel } from '../../src_v2/data/schema/roadmap'
import type { CellImportance, CellPriority, RoadmapAxis, RoadmapAxisPlan, RoadmapCell } from '../../src_v2/data/schema/roadmap'
import {
  getMergedRoadmap,
  saveRoadmapOverride,
  resetRoadmapOverride,
} from '../data/roadmapOverrides'
import { getStudentRoadmap } from '../data/roadmap'
import EmptyState from '../components/EmptyState'

const PRIORITIES: CellPriority[] = ['P0', 'P1', 'P2']
const IMPORTANCES: CellImportance[] = ['필수', '중요', '권장']

let cellSeq = 0
/** 새 칸 기본값 */
function blankCell(axis: RoadmapAxis): RoadmapCell {
  return { id: `${axis.toLowerCase()}-new-${(cellSeq += 1)}`, title: '', priority: 'P1', importance: '중요', why: '', status: 'TODO' }
}

/** 새 축 기본값 (base 에 해당 축이 없을 때 추가용) */
function blankAxis(axis: RoadmapAxis): RoadmapAxisPlan {
  return { axis, headline: '', rationale: '', cells: [] }
}

type Draft = Partial<Record<RoadmapAxis, RoadmapAxisPlan>>

/** 편집 대상 축을 깊은 복사해 draft 로 만든다 */
function cloneAxes(src: RoadmapAxisPlan[]): Draft {
  const out: Draft = {}
  for (const a of src) out[a.axis] = { ...a, cells: a.cells.map(c => ({ ...c })) }
  return out
}

/** draft 를 base 원본과 비교해 변경된 축만 override 로 추출 */
function diffOverride(draft: Draft, base: Draft): Draft {
  const out: Draft = {}
  for (const meta of ROADMAP_AXES) {
    const d = draft[meta.code]
    if (!d) continue
    if (JSON.stringify(d) !== JSON.stringify(base[meta.code])) out[meta.code] = d
  }
  return out
}

export default function RoadmapEditor() {
  const { studentId } = useParams<{ studentId: string }>()
  const counselor = getActiveCounselor()

  const student = STUDENTS.find(s => s.id === studentId)
  // base 원본(override 미반영) — diff 비교 기준
  const baseAxes = cloneAxes(student?.roadmapAxes ?? [])

  const merged = studentId ? getMergedRoadmap(studentId) : null
  // 프로그램에서 붙은 IAP 칸 — 읽기 전용(결정 1-a). 정본은 프로그램 쪽이라 override 에 넣지 않는다.
  const composed = studentId ? getStudentRoadmap(studentId) : null
  const lockedCells = composed?.axes.find(a => a.axis === 'IAP')?.cells.filter(c => c.programId) ?? []

  // draft 초기값 = 병합 결과(base ⊕ 기존 override) 깊은 복사
  const [draft, setDraft] = useState<Draft>(() => cloneAxes(merged?.axes ?? []))
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  if (!student || !student.roadmapAxes || !merged) {
    return (
      <div className="admin-page">
        <header className="admin-page-head">
          <div><h1 className="admin-page-title">로드맵 편집</h1></div>
        </header>
        <section className="admin-card">
          <EmptyState
            icon={LuFrown}
            message="해당 학생의 로드맵을 찾을 수 없습니다."
            action={{ label: '학생 목록으로', onClick: () => { window.location.href = '/admin/students' } }}
          />
        </section>
      </div>
    )
  }

  const overrideDiff = diffOverride(draft, baseAxes)
  const dirty = Object.keys(overrideDiff).length > 0

  // ── draft 변경 헬퍼 ──────────────────────────────────────────────────────
  const updateAxis = (axis: RoadmapAxis, patch: Partial<RoadmapAxisPlan>) =>
    setDraft(prev => {
      const cur = prev[axis]
      if (!cur) return prev
      return { ...prev, [axis]: { ...cur, ...patch } }
    })

  const addAxis = (axis: RoadmapAxis) =>
    setDraft(prev => ({ ...prev, [axis]: blankAxis(axis) }))

  const updateCell = (axis: RoadmapAxis, idx: number, patch: Partial<RoadmapCell>) =>
    setDraft(prev => {
      const cur = prev[axis]
      if (!cur) return prev
      const cells = cur.cells.map((c, i) => (i === idx ? { ...c, ...patch } : c))
      return { ...prev, [axis]: { ...cur, cells } }
    })

  const addCell = (axis: RoadmapAxis) =>
    setDraft(prev => {
      const cur = prev[axis]
      if (!cur) return prev
      return { ...prev, [axis]: { ...cur, cells: [...cur.cells, blankCell(axis)] } }
    })

  const removeCell = (axis: RoadmapAxis, idx: number) =>
    setDraft(prev => {
      const cur = prev[axis]
      if (!cur) return prev
      return { ...prev, [axis]: { ...cur, cells: cur.cells.filter((_, i) => i !== idx) } }
    })

  // ── 확정 저장 ────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    const changed = Object.keys(overrideDiff) as RoadmapAxis[]
    const autoNote =
      note.trim() ||
      changed.map(a => `${axisLabel(a)} ${overrideDiff[a]?.cells.length ?? 0}칸`).join(' · ') ||
      '로드맵 수정'
    saveRoadmapOverride(student.id, overrideDiff, counselor.id, autoNote)
    setSaved(true)
    window.setTimeout(() => window.location.reload(), 600)
  }

  const handleReset = () => {
    if (!window.confirm('상담사 수정분을 모두 삭제하고 학생 원본 로드맵으로 되돌립니다. 계속할까요?')) return
    resetRoadmapOverride(student.id)
    window.location.reload()
  }

  const invalidItems = (Object.values(draft) as RoadmapAxisPlan[]).some(d =>
    d.cells.some(c => c.title.trim() === ''),
  )

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">
            <LuPencilRuler /> 로드맵 편집 — {student.name}
          </h1>
          <p className="admin-page-desc">
            {student.major} · {student.grade}학년 · 목표 {student.targetCompany.name} {student.targetRole}
            {merged.meta && (
              <> · 현재 v{merged.meta.version} {merged.meta.confirmed ? '확정' : ''}</>
            )}
          </p>
        </div>
        <div className="admin-head-actions">
          <Link to={`/students/${student.id}`} className="admin-btn admin-btn-ghost">
            <LuUser /> 학생 상세
          </Link>
          <Link to="/roadmap/requests" className="admin-btn admin-btn-ghost">
            <LuInbox /> 변경 요청함
          </Link>
        </div>
      </header>

      <div className="admin-editor-hint">
        <LuInfo />
        학생 원본 로드맵(JSON)은 변경되지 않습니다. 확정하면 수정분만 override 로 저장되어 학생 화면에 병합·반영됩니다.
      </div>

      {/* 편집 영역 — 로드맵 3축 */}
      <div className="admin-editor-cols">
        {ROADMAP_AXES.map(meta => {
          const axis = meta.code
          const plan = draft[axis]
          const origin = merged.origin[axis]
          const locked = axis === 'IAP' ? lockedCells : []
          return (
            <section key={axis} className="admin-editor-col admin-card">
              <div className="admin-editor-col-head">
                <h2>
                  <span className={`admin-axis-badge axis-${axis}`}>{meta.label}</span>
                  {origin === 'override' && !dirty && <span className="admin-tag admin-tag-override">저장된 수정</span>}
                </h2>
                <p className="admin-editor-col-desc">{meta.desc}</p>
              </div>

              {!plan ? (
                <div className="admin-editor-empty">
                  <p>이 축에는 계획이 없습니다.</p>
                  <button className="admin-btn admin-btn-ghost sm" onClick={() => addAxis(axis)}>
                    <LuPlus /> {meta.label} 계획 추가
                  </button>
                </div>
              ) : (
                <>
                  <label className="admin-field">
                    <span>헤드라인</span>
                    <input
                      type="text"
                      value={plan.headline}
                      onChange={e => updateAxis(axis, { headline: e.target.value })}
                      placeholder="이 축의 핵심 목표 한 줄"
                    />
                  </label>
                  <label className="admin-field">
                    <span>근거(rationale)</span>
                    <textarea
                      rows={3}
                      value={plan.rationale}
                      onChange={e => updateAxis(axis, { rationale: e.target.value })}
                      placeholder="왜 이 축에 이 칸들을 배치했는지"
                    />
                  </label>

                  <div className="admin-editor-items">
                    <span className="admin-record-label">칸 ({plan.cells.length}{locked.length > 0 && ` + 프로그램 ${locked.length}`})</span>
                    {plan.cells.length === 0 && (
                      <p className="admin-editor-items-empty">칸이 없습니다. 아래에서 추가하세요.</p>
                    )}
                    {plan.cells.map((cell, idx) => (
                      <div key={cell.id} className="admin-item-editor">
                        <div className="admin-item-editor-row">
                          <input
                            type="text"
                            className={`admin-item-title-input${cell.title.trim() === '' ? ' invalid' : ''}`}
                            value={cell.title}
                            onChange={e => updateCell(axis, idx, { title: e.target.value })}
                            placeholder="칸 제목"
                          />
                          <button
                            className="admin-icon-btn danger"
                            title="삭제"
                            onClick={() => removeCell(axis, idx)}
                          >
                            <LuTrash2 />
                          </button>
                        </div>
                        <div className="admin-item-editor-selects">
                          <label>
                            <span>우선순위</span>
                            <select
                              value={cell.priority}
                              onChange={e => updateCell(axis, idx, { priority: e.target.value as CellPriority })}
                            >
                              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </label>
                          <label>
                            <span>중요도</span>
                            <select
                              value={cell.importance}
                              onChange={e => updateCell(axis, idx, { importance: e.target.value as CellImportance })}
                            >
                              {IMPORTANCES.map(im => <option key={im} value={im}>{im}</option>)}
                            </select>
                          </label>
                          <label>
                            <span>수행</span>
                            <select
                              value={cell.status}
                              onChange={e => updateCell(axis, idx, { status: e.target.value as RoadmapCell['status'] })}
                            >
                              <option value="TODO">미수행</option>
                              <option value="DONE">수행</option>
                            </select>
                          </label>
                        </div>
                        <textarea
                          className="admin-item-why-input"
                          rows={2}
                          value={cell.why}
                          onChange={e => updateCell(axis, idx, { why: e.target.value })}
                          placeholder="이 칸이 필요한 이유 (why)"
                        />
                      </div>
                    ))}
                    <button className="admin-btn admin-btn-ghost sm" onClick={() => addCell(axis)}>
                      <LuPlus /> 칸 추가
                    </button>

                    {/* 프로그램 개설로 붙은 칸 — 읽기 전용. 정본은 비교과 프로그램 쪽이다. */}
                    {locked.length > 0 && (
                      <div className="admin-editor-locked">
                        <span className="admin-record-label"><LuLock /> 프로그램 편입 칸 (읽기 전용)</span>
                        {locked.map(cell => (
                          <div key={cell.id} className="admin-locked-cell">
                            <div className="admin-locked-cell-top">
                              <b>{cell.title}</b>
                              <span className={`admin-tag admin-tag-soft${cell.entry === 'REQUIRED' ? ' is-req' : ''}`}>
                                {cell.entry === 'REQUIRED' ? '필수' : '추천'}
                              </span>
                              <span className={`admin-chip ${cell.status === 'DONE' ? 'admin-chip-done' : 'admin-chip-wait'}`}>
                                {cell.status === 'DONE' ? '수료' : '미수료'}
                              </span>
                            </div>
                            <small>
                              비교과 프로그램에서 관리합니다.
                              {cell.programId && <Link to={`/programs/${cell.programId}/edit`} className="admin-inline-link"> 프로그램 열기</Link>}
                            </small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          )
        })}
      </div>

      {/* 병합 미리보기 + 확정 */}
      <section className="admin-card admin-editor-confirm">
        <div className="admin-card-head">
          <h2><LuEye /> 병합 미리보기 · 확정</h2>
        </div>
        {!dirty ? (
          <p className="admin-detail-note">변경 사항이 없습니다. 항목을 편집하면 여기에 미리보기가 표시됩니다.</p>
        ) : (
          <div className="admin-preview">
            {(Object.keys(overrideDiff) as RoadmapAxis[]).map(axis => {
              const d = overrideDiff[axis]!
              return (
                <div key={axis} className="admin-preview-term">
                  <div className="admin-preview-term-head">
                    <span className={`admin-axis-badge axis-${axis}`}>{ROADMAP_AXIS_MAP[axis].label}</span>
                    <span className="admin-tag admin-tag-override">수정</span>
                    <span className="admin-term-period">{d.cells.length}칸</span>
                  </div>
                  {d.headline && <p className="admin-term-headline">{d.headline}</p>}
                  <ul className="admin-term-items">
                    {d.cells.map(cell => (
                      <li key={cell.id}>
                        <span className={`admin-pri admin-pri-${cell.priority}`}>{cell.priority}</span>
                        <span className={`admin-imp admin-imp-${cell.importance}`}>{cell.importance}</span>
                        <span className="admin-term-item-title">{cell.title || <em>(제목 없음)</em>}</span>
                        {cell.status === 'DONE' && <span className="admin-chip admin-chip-done">수행</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}

        <label className="admin-field admin-editor-note">
          <span>변경 메모 (선택)</span>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="예: 학생 요청 반영 — 내 성장 활동 어학 목표 상향"
          />
        </label>

        {invalidItems && dirty && (
          <p className="admin-form-hint admin-form-hint-warn">
            제목이 비어 있는 항목이 있습니다. 저장 전 모두 입력하세요.
          </p>
        )}

        <div className="admin-form-actions">
          {merged.meta && (
            <button className="admin-btn admin-btn-danger-ghost" onClick={handleReset}>
              <LuRotateCcw /> 원본으로 초기화
            </button>
          )}
          <button
            className="admin-btn admin-btn-primary"
            disabled={!dirty || invalidItems || saved}
            onClick={handleConfirm}
          >
            <LuCheck /> {saved ? '확정 저장됨' : `확정 (v${(merged.meta?.version ?? 0) + 1})`}
          </button>
        </div>
      </section>

      {/* 변경 이력 */}
      {merged.meta && merged.meta.history.length > 0 && (
        <section className="admin-card">
          <div className="admin-card-head"><h2><LuHistory /> 변경 이력</h2></div>
          <ul className="admin-rm-history-list">
            {[...merged.meta.history].reverse().map(h => (
              <li key={h.version} className="admin-rm-history-item">
                <span className="admin-rm-history-ver">v{h.version}</span>
                <div className="admin-rm-history-body">
                  <strong>{h.note}</strong>
                  <small>{new Date(h.at).toLocaleString('ko-KR')} · {h.by}</small>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
