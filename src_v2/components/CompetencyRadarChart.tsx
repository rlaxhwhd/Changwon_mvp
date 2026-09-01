import type { CompetencyAxisView } from '../data/competency'

// ─────────────────────────────────────────────────────────────────────────
// 핵심역량 레이더 (공용) — 축 개수를 데이터에서 받는다.
//
// 예전에는 화면마다 6각형 좌표와 점수를 SVG 에 직접 적어 뒀다. 그래서 축이 5개로
// 바뀌자 그림과 데이터가 어긋났다(그려진 숫자는 아무 학생의 것도 아니었다).
// 좌표는 여기서만 계산한다 — 축이 몇 개든 같은 코드가 그린다.
//
// 두 화면이 서로 다른 클래스 체계를 써서(메인=radar-*, 라운지=grid/mine) 이름만
// 주입받는다. 모양을 만드는 규칙은 한 곳이다.
// ─────────────────────────────────────────────────────────────────────────

const CX = 150, CY = 140, R = 96

/** i번째 축의 꼭짓점 — 12시에서 시작해 시계방향. */
function point(i: number, n: number, r: number) {
  const angle = (Math.PI * 2 * i) / n - Math.PI / 2
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) }
}

function polygon(values: number[], n: number): string {
  return values
    .map((v, i) => {
      const p = point(i, n, (Math.max(0, Math.min(100, v)) / 100) * R)
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
    })
    .join(' ')
}

export interface RadarClassNames {
  svg: string
  grid: string
  axis: string
  target: string
  current: string
  label: string
}

/** 기본값 = 라운지·교직원 포털이 쓰는 이름. */
const DEFAULT_CLASSES: RadarClassNames = {
  svg: 'radar', grid: 'grid', axis: 'axis', target: 'need', current: 'mine', label: '',
}

interface Props {
  axes: CompetencyAxisView[]
  classes?: Partial<RadarClassNames>
  /** '나의 현재' 면을 그라데이션으로 채울 때 그 <defs> 의 id. */
  currentFill?: string
  children?: React.ReactNode
}

export default function CompetencyRadarChart({ axes, classes, currentFill, children }: Props) {
  const c = { ...DEFAULT_CLASSES, ...classes }
  const n = axes.length
  if (n === 0) return null

  const label = `${n}대 핵심역량 — ${axes.map(a => `${a.label} ${a.score}`).join(', ')}`

  return (
    <svg className={c.svg} viewBox="0 0 300 280" role="img" aria-label={label}>
      {children}
      {[100, 66, 33].map(pct => (
        <polygon
          key={pct}
          className={c.grid}
          points={Array.from({ length: n }, (_, i) => {
            const p = point(i, n, (pct / 100) * R)
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
          }).join(' ')}
        />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const p = point(i, n, R)
        return <line key={i} className={c.axis} x1={CX} y1={CY} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)} />
      })}
      <polygon className={c.target} points={polygon(axes.map(a => a.target), n)} />
      <polygon
        className={c.current}
        points={polygon(axes.map(a => a.score), n)}
        fill={currentFill ? `url(#${currentFill})` : undefined}
      />
      {axes.map((a, i) => {
        const p = point(i, n, R + 22)
        const dx = p.x - CX
        // 12시·6시 축은 가운데 정렬, 좌우는 바깥쪽으로 밀어 라벨이 도형을 덮지 않게.
        const anchor = Math.abs(dx) < 6 ? 'middle' : dx > 0 ? 'start' : 'end'
        return (
          <text
            key={a.key}
            className={c.label || undefined}
            x={p.x.toFixed(1)}
            y={p.y.toFixed(1)}
            textAnchor={anchor}
            dominantBaseline="middle"
          >
            {a.label}
          </text>
        )
      })}
    </svg>
  )
}
