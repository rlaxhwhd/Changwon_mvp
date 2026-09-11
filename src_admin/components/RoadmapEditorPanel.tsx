import { LuCheck, LuFrown, LuHistory, LuInfo, LuLock, LuPencilRuler, LuPlus, LuRotateCcw, LuTrash2 } from 'react-icons/lu'
import { useEffect, useMemo, useState } from 'react'
import { getActiveCounselor } from '../data/counselors'
import { STUDENTS } from '../../src_v2/data/students'
import { ROADMAP_AXES, axisLabel, planProgress } from '../../src_v2/data/schema/roadmap'
import type { RoadmapAxis, RoadmapAxisPlan, RoadmapCell } from '../../src_v2/data/schema/roadmap'
import { getMergedRoadmap, saveRoadmapOverride, resetRoadmapOverride } from '../data/roadmapOverrides'
import { getStudentRoadmap } from '../data/roadmap'
import { useRoadmap } from '../../shared/useRoadmapStore'
import { useAsyncAction } from '../../shared/useAsyncAction'
import RoadmapAxisBoard from '../../src_v2/components/RoadmapAxisBoard'
import AdminModal from './AdminModal'
import EmptyState from './EmptyState'

// ─────────────────────────────────────────────────────────────────────────
// 로드맵 편집 본문 — 편집 페이지(/roadmap/:studentId)와 학생 상세의 로드맵 탭이
// 같이 쓴다. 페이지 껍데기(헤더·링크)만 밖에 두고 편집 기능 전체가 여기 있다.
//
// 상담 중에는 학생 상세를 열어 둔 채로 고쳐야 하므로 편집이 페이지 전용일 수 없다.
// 그렇다고 편집 로직을 두 벌로 복사하면 draft·diff·override 저장이 갈라진다
// (CLAUDE.md 규칙 12) — 그래서 화면이 아니라 이 본문을 공유한다.
//
// 보이는 로드맵은 학생 화면과 같은 공용 컴포넌트(RoadmapAxisBoard)다.
// 편집용 폼을 따로 그리지 않는다: 보드의 칸을 눌러 고치고, 축 아래 버튼으로 칸을 더한다.
// 화면에 보이는 것이 곧 저장될 결과다(별도 미리보기 없음).
// ★ 우선순위(P0/P1)·중요도는 다루지 않는다. 폐기된 단·중·장기 3분할도 여기 없다.
// ─────────────────────────────────────────────────────────────────────────

let cellSeq = 0
/** 새 칸 기본값 — 우선순위·중요도는 화면에서 다루지 않는다(스키마 기본값만 채운다) */
function blankCell(axis: RoadmapAxis): RoadmapCell {
  return { id: `${axis.toLowerCase()}-new-${(cellSeq += 1)}`, title: '', priority: 'P1', importance: 'IMPORTANT', why: '', status: 'TODO' }
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

/** 편집 중인 칸의 좌표 */
type CellRef = { axis: RoadmapAxis; id: string }

export interface RoadmapEditorPanelProps {
  studentId: string
  /**
   * 목표 직무·이행률 요약 카드를 그릴지. 편집 페이지는 그린다.
   * 학생 상세는 「목표 달성 계획」 카드가 이미 같은 값을 보여주므로 끈다.
   */
  showGoalSummary?: boolean
  /** 저장·초기화 후 처리. 기본은 페이지 새로고침(편집 페이지 기존 동작). */
  onSaved?: () => void
}

export default function RoadmapEditorPanel({ studentId, showGoalSummary = true, onSaved }: RoadmapEditorPanelProps) {
  const counselor = getActiveCounselor()

  const student = STUDENTS.find(s => s.id === studentId)
  // base 원본(override 미반영) — diff 비교 기준.
  // ⚠ 생성된 로드맵(dc_roadmap)이 base 인 학생도 있으므로 시드가 아니라 병합 로더에서 받는다.
  // 서버가 정본이다 — 저장 뒤 스토어가 다시 읽어 발행하면 그때 갱신된다.
  const revision = useRoadmap(studentId)
  const merged = useMemo(() => getMergedRoadmap(studentId), [studentId, revision])
  const composed = useMemo(() => getStudentRoadmap(studentId), [studentId, revision])
  // 프로그램에서 붙은 IAP 칸 — 읽기 전용(결정 1-a). 정본은 프로그램 쪽이라 override 에 넣지 않는다.
  const lockedCells = composed?.axes.find(axis => axis.axis === 'IAP')
    ?.cells.filter(cell => cell.programId) ?? []

  // draft 초기값 = 병합 결과(base ⊕ 기존 override) 깊은 복사
  const [draft, setDraft] = useState<Draft>(() => cloneAxes(getMergedRoadmap(studentId)?.axes ?? []))
  // 서버에서 계획을 처음 받아온 순간에도 편집 초안이 비어 있으면 안 된다.
  useEffect(() => { setDraft(cloneAxes(getMergedRoadmap(studentId)?.axes ?? [])) }, [studentId, revision])
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)
  const { run, saving, error } = useAsyncAction()
  const [editing, setEditing] = useState<CellRef | null>(null)
  const [editingAxis, setEditingAxis] = useState<RoadmapAxis | null>(null)

  if (!student || !merged) {
    return <EmptyState icon={LuFrown} message="해당 학생의 로드맵을 찾을 수 없습니다." />
  }

  // 시드 로드맵이 없는 학생(생성분이 base)은 override 비교 기준도 생성분이다.
  const baseAxes = cloneAxes(student.roadmapAxes ?? merged.axes)
  const overrideDiff = diffOverride(draft, baseAxes)
  const dirty = Object.keys(overrideDiff).length > 0
  const done = onSaved ?? (() => window.location.reload())

  // ── draft 변경 헬퍼 ──────────────────────────────────────────────────────
  const updateAxis = (axis: RoadmapAxis, patch: Partial<RoadmapAxisPlan>) =>
    setDraft(prev => {
      const cur = prev[axis]
      if (!cur) return prev
      return { ...prev, [axis]: { ...cur, ...patch } }
    })

  const addAxis = (axis: RoadmapAxis) =>
    setDraft(prev => ({ ...prev, [axis]: blankAxis(axis) }))

  const updateCell = (axis: RoadmapAxis, id: string, patch: Partial<RoadmapCell>) =>
    setDraft(prev => {
      const cur = prev[axis]
      if (!cur) return prev
      return { ...prev, [axis]: { ...cur, cells: cur.cells.map(c => (c.id === id ? { ...c, ...patch } : c)) } }
    })

  const addCell = (axis: RoadmapAxis) => {
    const cell = blankCell(axis)
    setDraft(prev => {
      const cur = prev[axis] ?? blankAxis(axis)
      return { ...prev, [axis]: { ...cur, cells: [...cur.cells, cell] } }
    })
    setEditing({ axis, id: cell.id })
  }

  const removeCell = (axis: RoadmapAxis, id: string) =>
    setDraft(prev => {
      const cur = prev[axis]
      if (!cur) return prev
      return { ...prev, [axis]: { ...cur, cells: cur.cells.filter(c => c.id !== id) } }
    })

  // ── 확정 저장 ────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    const changed = Object.keys(overrideDiff) as RoadmapAxis[]
    const autoNote =
      note.trim() ||
      changed.map(a => `${axisLabel(a)} ${overrideDiff[a]?.cells.length ?? 0}칸`).join(' · ') ||
      '로드맵 수정'
    run(async () => {
      await saveRoadmapOverride(student.id, overrideDiff, counselor.id, autoNote)
      setSaved(true)
      window.setTimeout(done, 600)
    })
  }

  const handleReset = () => {
    if (!window.confirm('상담사 수정분을 모두 삭제하고 학생 원본 로드맵으로 되돌립니다. 계속할까요?')) return
    run(async () => {
      await resetRoadmapOverride(student.id)
      done()
    })
  }

  const invalidItems = (Object.values(draft) as RoadmapAxisPlan[]).some(d =>
    d.cells.some(c => c.title.trim() === ''),
  )

  // 보드에 넘길 축 목록 — draft(편집 대상) + 프로그램 편입 칸(읽기 전용)을 합쳐 그린다.
  // 프로그램 칸을 빼고 그리면 상담사가 보는 로드맵과 학생이 보는 로드맵이 달라진다.
  const boardAxes: RoadmapAxisPlan[] = ROADMAP_AXES
    .map(meta => draft[meta.code])
    .filter((a): a is RoadmapAxisPlan => !!a)
    .map(a => (a.axis === 'IAP' && lockedCells.length > 0
      ? { ...a, cells: [...a.cells, ...lockedCells] }
      : a))

  const missingAxes = ROADMAP_AXES.filter(meta => !draft[meta.code])
  const progress = planProgress(boardAxes)
  const editingCell = editing ? draft[editing.axis]?.cells.find(c => c.id === editing.id) : undefined
  const editingPlan = editingAxis ? draft[editingAxis] : undefined

  return (
    <>
      <div className="admin-editor-hint">
        <LuInfo />
        칸을 누르면 내용을 고칩니다. 학생 원본 로드맵(JSON)은 변경되지 않고, 확정하면 수정분만
        override 로 저장되어 학생 화면에 병합·반영됩니다.
      </div>

      {/* 목표 직무·이행률 — 3축은 이 목표를 향한다. 이행률은 보드에 그려진 칸에서 파생. */}
      {showGoalSummary && (
        <section className="admin-card admin-rme-goal">
          <div>
            <span className="admin-record-label">목표 직무</span>
            <strong>{student.targetRole}</strong>
            <small>{student.targetCompany.name} 기준</small>
          </div>
          <div className="admin-rme-meter">
            <span className="admin-record-label">이행률</span>
            <span className="admin-progress-track">
              <span className="admin-progress-fill" style={{ width: `${progress.pct}%` }} />
            </span>
            <em>{progress.pct}% · {progress.done}/{progress.total}칸</em>
          </div>
        </section>
      )}

      {/* 편집 대상 = 학생 화면과 같은 공용 보드. 여기 보이는 것이 저장될 결과다. */}
      <RoadmapAxisBoard
        axes={boardAxes}
        origin={merged.origin}
        onCellClick={(cell, axis) => setEditing({ axis: axis.axis, id: cell.id })}
        axisFooter={axis => (
          <>
            <button type="button" className="admin-btn admin-btn-ghost sm" onClick={() => addCell(axis.axis)}>
              <LuPlus /> 칸 추가
            </button>
            <button type="button" className="admin-btn admin-btn-ghost sm" onClick={() => setEditingAxis(axis.axis)}>
              <LuPencilRuler /> 축 문구
            </button>
            {axis.axis === 'IAP' && lockedCells.length > 0 && (
              <span className="admin-field-hint">
                <LuLock /> 프로그램 편입 {lockedCells.length}칸은 비교과에서 관리합니다
              </span>
            )}
          </>
        )}
      />

      {missingAxes.length > 0 && (
        <div className="admin-editor-hint">
          <LuInfo />
          계획이 없는 축:
          {missingAxes.map(meta => (
            <button key={meta.code} type="button" className="admin-btn admin-btn-ghost sm" onClick={() => addAxis(meta.code)}>
              <LuPlus /> {meta.label} 추가
            </button>
          ))}
        </div>
      )}

      {/* 확정 */}
      <section className="admin-card">
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
            제목이 비어 있는 칸이 있습니다. 저장 전 모두 입력하세요.
          </p>
        )}
        {!dirty && <p className="admin-detail-note">변경 사항이 없습니다.</p>}
        {error && <p role="alert" className="admin-form-hint-warn">{error}</p>}

        <div className="admin-form-actions">
          {merged.meta && (
            <button className="admin-btn admin-btn-danger-ghost" onClick={handleReset} disabled={saving}>
              <LuRotateCcw /> 원본으로 초기화
            </button>
          )}
          <button
            className="admin-btn admin-btn-primary"
            disabled={!dirty || invalidItems || saved || saving}
            onClick={handleConfirm}
          >
            <LuCheck /> {saved ? '확정 저장됨' : saving ? '저장 중…' : `확정 (v${(merged.meta?.version ?? 0) + 1})`}
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

      {editing && editingCell && (
        <AdminModal title={`${axisLabel(editing.axis)} — 칸 편집`} size="md" onClose={() => setEditing(null)}>
          <label className="admin-field">
            <span>칸 제목</span>
            <input
              type="text"
              autoFocus
              className={editingCell.title.trim() === '' ? 'invalid' : undefined}
              value={editingCell.title}
              onChange={e => updateCell(editing.axis, editing.id, { title: e.target.value })}
              placeholder="예: 정보처리기사 필기 합격"
            />
          </label>
          <label className="admin-field">
            <span>이 칸이 필요한 이유</span>
            <textarea
              rows={3}
              value={editingCell.why}
              onChange={e => updateCell(editing.axis, editing.id, { why: e.target.value })}
              placeholder="학생 화면 칸 아래에 그대로 보입니다"
            />
          </label>
          <label className="admin-field">
            <span>수행 여부</span>
            <select
              value={editingCell.status}
              onChange={e => updateCell(editing.axis, editing.id, { status: e.target.value as RoadmapCell['status'] })}
            >
              <option value="TODO">예정</option>
              <option value="DONE">완료</option>
            </select>
          </label>
          <div className="admin-form-actions">
            <button
              type="button"
              className="admin-btn admin-btn-danger-ghost"
              onClick={() => { removeCell(editing.axis, editing.id); setEditing(null) }}
            >
              <LuTrash2 /> 칸 삭제
            </button>
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => setEditing(null)}>
              <LuCheck /> 닫기
            </button>
          </div>
        </AdminModal>
      )}

      {editingAxis && editingPlan && (
        <AdminModal title={`${axisLabel(editingAxis)} — 축 문구`} size="md" onClose={() => setEditingAxis(null)}>
          <label className="admin-field">
            <span>헤드라인</span>
            <input
              type="text"
              autoFocus
              value={editingPlan.headline}
              onChange={e => updateAxis(editingAxis, { headline: e.target.value })}
              placeholder="이 축의 핵심 목표 한 줄 — 보드 칸 위에 보입니다"
            />
          </label>
          <label className="admin-field">
            <span>근거(rationale)</span>
            <textarea
              rows={3}
              value={editingPlan.rationale}
              onChange={e => updateAxis(editingAxis, { rationale: e.target.value })}
              placeholder="왜 이 축에 이 칸들을 배치했는지 (내부 기록)"
            />
          </label>
          <div className="admin-form-actions">
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => setEditingAxis(null)}>
              <LuCheck /> 닫기
            </button>
          </div>
        </AdminModal>
      )}
    </>
  )
}
