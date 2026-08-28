import { LuCheck, LuFrown, LuHistory, LuInbox, LuInfo, LuLock, LuPencilRuler, LuPlus, LuRotateCcw, LuTrash2, LuUser } from 'react-icons/lu'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getActiveCounselor } from '../data/counselors'
import { STUDENTS } from '../../src_v2/data/students'
import { ROADMAP_AXES, axisLabel, planProgress } from '../../src_v2/data/schema/roadmap'
import type { RoadmapAxis, RoadmapAxisPlan, RoadmapCell } from '../../src_v2/data/schema/roadmap'
import {
  getMergedRoadmap,
  saveRoadmapOverride,
  resetRoadmapOverride,
} from '../data/roadmapOverrides'
import { getStudentRoadmap } from '../data/roadmap'
import RoadmapAxisBoard from '../../src_v2/components/RoadmapAxisBoard'
import AdminModal from '../components/AdminModal'
import EmptyState from '../components/EmptyState'

// ─────────────────────────────────────────────────────────────────────────
// 로드맵 편집 — 보이는 로드맵은 학생 화면과 같은 공용 컴포넌트(RoadmapAxisBoard)다.
// 편집용 폼을 따로 그리지 않는다: 보드의 칸을 눌러 고치고, 축 아래 버튼으로 칸을 더한다.
// 화면에 보이는 것이 곧 저장될 결과다(별도 미리보기 없음).
// ★ 우선순위(P0/P1)·중요도는 다루지 않는다. 폐기된 단·중·장기 3분할도 여기 없다.
// ─────────────────────────────────────────────────────────────────────────

let cellSeq = 0
/** 새 칸 기본값 — 우선순위·중요도는 화면에서 다루지 않는다(스키마 기본값만 채운다) */
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

/** 편집 중인 칸의 좌표 */
type CellRef = { axis: RoadmapAxis; id: string }

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
  const [editing, setEditing] = useState<CellRef | null>(null)
  const [editingAxis, setEditingAxis] = useState<RoadmapAxis | null>(null)

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
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">
            <LuPencilRuler /> 로드맵 편집 — {student.name}
          </h1>
          <p className="admin-page-desc">
            {student.major} · {student.grade}학년 · 학번 {student.studentNo}
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
        칸을 누르면 내용을 고칩니다. 학생 원본 로드맵(JSON)은 변경되지 않고, 확정하면 수정분만
        override 로 저장되어 학생 화면에 병합·반영됩니다.
      </div>

      {/* 목표 직무·이행률 — 3축은 이 목표를 향한다. 이행률은 보드에 그려진 칸에서 파생. */}
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
    </div>
  )
}
