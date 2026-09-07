import type { ReactNode } from 'react'
import { ROADMAP_AXIS_MAP, axisProgress } from '../data/schema/roadmap'
import type { RoadmapAxis, RoadmapAxisPlan, RoadmapCell } from '../data/schema/roadmap'
import './RoadmapAxisBoard.css'

// ─────────────────────────────────────────────────────────────────────────
// 로드맵 3축 보드 (읽기 전용) — 학생 포털(src_v2) · 교직원 포털(src_admin) 공용.
//
// 디자인은 /v2/lounge '목표 달성 계획' 카드의 3열(.goal-plan-column)을 그대로 따른다.
// 축 정의·이행률은 data/schema/roadmap.ts 가 단일 소스다. 이 컴포넌트는 그리기만 한다.
// 수정은 여기 한 곳에서만 — 화면마다 3축 마크업을 다시 쓰지 않는다.
//
// 색은 축별로 CSS 에서 준다(.rab-axis.is-IAP …). 두 SPA 의 토큰 이름이 달라
// var() 폴백 사슬로 각 SPA 가 가진 토큰을 고르게 했다 — 새 색을 만들지 않는다.
// ⚠️ 우선순위(P0/P1/P2)·중요도는 표시하지 않는다. 칸은 '수행 여부'만 말한다.
// ─────────────────────────────────────────────────────────────────────────

/** 축 머리 아이콘 — 라운지 시안이 쓴 심볼과 같은 도형. 스프라이트에 기대지 않고 직접 그린다
 *  (교직원 포털에는 학생 포털의 아이콘 스프라이트가 없다). */
const AXIS_ICON: Record<RoadmapAxis, ReactNode> = {
  IAP: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  CORE: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  GROWTH: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
}

interface RoadmapAxisBoardProps {
  axes: RoadmapAxisPlan[]
  /** 축별로 '상담사 수정' 배지를 붙일지 — 편집 흔적 표시용 */
  origin?: Record<string, 'base' | 'override'>
  /** 칸 클릭 (없으면 정적). 프로그램에서 편입된 칸은 클릭 대상이 아니다 — 정본이 프로그램 쪽이다. */
  onCellClick?: (cell: RoadmapCell, axis: RoadmapAxisPlan) => void
  /** 축 카드 맨 아래에 붙일 조작 영역 (편집 화면 전용). 없으면 읽기 전용 그대로. */
  axisFooter?: (axis: RoadmapAxisPlan) => ReactNode
  /**
   * 고른 칸 id 들. 주면 '고르기 모드'가 된다 — 고른 칸에 표시가 붙고,
   * 프로그램 편입 칸도 고를 수 있다. 고르는 건 편집이 아니라 가리키는 것이라
   * "정본이 프로그램 쪽" 이라는 편집기의 제약이 여기엔 걸리지 않는다.
   */
  selectedIds?: ReadonlySet<string>
  /** 편입 배지(필수·추천)를 붙일지. 기본은 붙인다 — 이행률 분모를 좌우하는 값이라(PROCESS.md §6-4). */
  showEntry?: boolean
}

export default function RoadmapAxisBoard({
  axes, origin, onCellClick, axisFooter, selectedIds, showEntry = true,
}: RoadmapAxisBoardProps) {
  const selecting = Boolean(selectedIds)
  if (axes.length === 0) {
    return <p className="rab-empty">아직 로드맵이 생성되지 않았습니다. 상담을 완료하면 3축 로드맵이 만들어집니다.</p>
  }

  return (
    <div className="rab">
      {axes.map(axis => {
        const meta = ROADMAP_AXIS_MAP[axis.axis]
        const prog = axisProgress(axis)
        return (
          <section key={axis.axis} className={`rab-axis is-${axis.axis}`}>
            <header className="rab-axis-head">
              <span className="rab-axis-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24">{AXIS_ICON[axis.axis]}</svg>
              </span>
              <div className="rab-axis-copy">
                <b>{meta.label}</b>
                <span>{meta.desc}</span>
              </div>
              <span className="rab-axis-count">{prog.done}/{prog.total}</span>
            </header>

            {origin?.[axis.axis] === 'override' && <span className="rab-badge-edit">상담사 수정</span>}
            {axis.headline && <p className="rab-axis-headline">{axis.headline}</p>}

            <div className="rab-cells">
              {axis.cells.map(cell => (
                <RoadmapCellRow
                  key={cell.id}
                  cell={cell}
                  showEntry={showEntry}
                  selected={selecting ? selectedIds!.has(cell.id) : undefined}
                  onClick={onCellClick && (selecting || !cell.programId) ? () => onCellClick(cell, axis) : undefined}
                />
              ))}
            </div>

            {axisFooter && <div className="rab-axis-foot">{axisFooter(axis)}</div>}
          </section>
        )
      })}
    </div>
  )
}

function RoadmapCellRow({
  cell, onClick, showEntry, selected,
}: { cell: RoadmapCell; onClick?: () => void; showEntry: boolean; selected?: boolean }) {
  const done = cell.status === 'DONE'
  const cls = [
    'rab-cell',
    done ? 'is-done' : '',
    onClick ? 'is-clickable' : '',
    selected ? 'is-picked' : '',
  ].filter(Boolean).join(' ')

  const body = (
    <>
      <span className="rab-cell-box" aria-hidden="true" />
      <span className="rab-cell-copy">
        <b>{cell.title}</b>
        {cell.why && <small>{cell.why}</small>}
      </span>
      <span className="rab-cell-side">
        {/* 편입 값은 이행률 분모를 좌우한다(PROCESS.md §6-4) — 우선순위와 달리 남긴다 */}
        {showEntry && cell.entry === 'REQUIRED' && <span className="rab-entry is-req">필수</span>}
        {showEntry && cell.entry === 'RECOMMEND' && <span className="rab-entry">추천</span>}
        <span className={`rab-cell-status${done ? '' : ' is-planned'}`}>{done ? '완료' : '예정'}</span>
      </span>
    </>
  )

  return onClick
    ? (
      <button
        type="button"
        className={cls}
        onClick={onClick}
        // 고르기 모드에서는 누름 상태를 읽어 줘야 한다 — 테두리 색만으로는 안 읽힌다.
        aria-pressed={selected}
        title={cell.why}
      >
        {body}
      </button>
    )
    : <div className={cls} title={cell.why}>{body}</div>
}
