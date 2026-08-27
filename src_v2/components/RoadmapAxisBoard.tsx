import type { CSSProperties } from 'react'
import { ROADMAP_AXIS_MAP, axisProgress } from '../data/schema/roadmap'
import type { RoadmapAxisPlan, RoadmapCell } from '../data/schema/roadmap'
import './RoadmapAxisBoard.css'

// ─────────────────────────────────────────────────────────────────────────
// 로드맵 3축 보드 (읽기 전용) — 학생 포털(src_v2) · 교직원 포털(src_admin) 공용.
//
// 축 정의·이행률은 data/schema/roadmap.ts 가 단일 소스다. 이 컴포넌트는 그리기만 한다.
// 수정은 여기 한 곳에서만 — 화면마다 3축 마크업을 다시 쓰지 않는다.
//
// 색은 호스트가 가진 토큰(--green/--blue/--purple 계열)을 축 tint 로 참조한다.
// 두 SPA 의 토큰 이름이 같아 그대로 공유된다(새 팔레트를 만들지 않는다).
// ─────────────────────────────────────────────────────────────────────────

function tintVars(tint: string): CSSProperties {
  return {
    '--axis-color': `var(--${tint})`,
    '--axis-soft': `var(--${tint}-bg)`,
  } as CSSProperties
}

interface RoadmapAxisBoardProps {
  axes: RoadmapAxisPlan[]
  /** 축별로 'override' 배지를 붙일지 — 상담사 편집 흔적 표시용 */
  origin?: Record<string, 'base' | 'override'>
  /** 칸 클릭 (없으면 정적) */
  onCellClick?: (cell: RoadmapCell, axis: RoadmapAxisPlan) => void
}

export default function RoadmapAxisBoard({ axes, origin, onCellClick }: RoadmapAxisBoardProps) {
  if (axes.length === 0) {
    return <p className="rab-empty">아직 로드맵이 생성되지 않았습니다. 상담을 완료하면 3축 로드맵이 만들어집니다.</p>
  }

  return (
    <div className="rab">
      {axes.map(axis => {
        const meta = ROADMAP_AXIS_MAP[axis.axis]
        const prog = axisProgress(axis)
        return (
          <section key={axis.axis} className="rab-axis" style={tintVars(meta.tint)}>
            <header className="rab-axis-head">
              <div className="rab-axis-title">
                <h3>{meta.label}</h3>
                {origin?.[axis.axis] === 'override' && <span className="rab-badge-edit">상담사 수정</span>}
              </div>
              <p className="rab-axis-desc">{meta.desc}</p>
              <div className="rab-axis-meter">
                <span className="rab-axis-count">{prog.done} / {prog.total}</span>
                <span className="rab-axis-bar"><i style={{ width: `${prog.pct}%` }} /></span>
                <span className="rab-axis-pct">{prog.pct}%</span>
              </div>
            </header>

            {axis.headline && <p className="rab-axis-headline">{axis.headline}</p>}

            <ul className="rab-cells">
              {axis.cells.map(cell => (
                <RoadmapCellRow
                  key={cell.id}
                  cell={cell}
                  onClick={onCellClick ? () => onCellClick(cell, axis) : undefined}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function RoadmapCellRow({ cell, onClick }: { cell: RoadmapCell; onClick?: () => void }) {
  const done = cell.status === 'DONE'
  const cls = [
    'rab-cell',
    done ? 'is-done' : '',
    cell.programId ? 'is-program' : '',
    onClick ? 'is-clickable' : '',
  ].filter(Boolean).join(' ')

  return (
    <li className={cls} onClick={onClick} title={cell.why}>
      <span className="rab-cell-check" aria-hidden="true">{done ? '✓' : cell.priority}</span>
      <span className="rab-cell-body">
        <b className="rab-cell-title">{cell.title}</b>
        <span className="rab-cell-why">{cell.why}</span>
      </span>
      <span className="rab-cell-tags">
        {/* 프로그램에서 온 칸은 상담사가 편집하지 않는다 — 정본이 프로그램 쪽임을 표시 */}
        {cell.entry === 'REQUIRED' && <span className="rab-tag req">필수 비교과</span>}
        {cell.entry === 'RECOMMEND' && <span className="rab-tag rec">추천 비교과</span>}
        {!cell.programId && <span className="rab-tag">{cell.importance}</span>}
      </span>
    </li>
  )
}
