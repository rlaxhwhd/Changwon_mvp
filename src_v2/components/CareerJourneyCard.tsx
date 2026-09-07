import type { CSSProperties, ReactNode } from 'react'
import type { CareerJourney, JourneyStep } from '../data/careerProcess'
import './CareerJourneyCard.css'

// ─────────────────────────────────────────────────────────────────────────
// 진로 여정 카드 — 학생 홈(/v2/main) · 라운지(/v2/lounge) · 상담사 학생상세가 공유한다.
// 세 화면이 같은 그림을 그리므로 마크업도 한 벌만 둔다(화면별 복붙 금지).
//
// 값은 전부 주입받는다 — 단계·진행률을 여기서 만들지 않는다.
//   · 학생 포털: data/careerProcess.CAREER_JOURNEY
//   · 상담사   : src_admin/data/studentDetail.getCareerJourney(student)
// ─────────────────────────────────────────────────────────────────────────

/** 색 띠 눈금 수 — CSS 의 --cj-c1 ~ --cj-c7 과 짝이다. */
const RAMP_STOPS = 7

/** 칸 순서를 색 띠 위치로 옮긴다. 칸이 7개면 C1~C7 과 1:1, 6개면 고르게 솎아 쓴다. */
function rampVar(index: number, total: number): string {
  const stop = total <= 1 ? 0 : Math.round((index / (total - 1)) * (RAMP_STOPS - 1))
  return `var(--cj-c${stop + 1})`
}

export interface CareerJourneyCardProps {
  journey: CareerJourney
  /** 카드 제목 — 화면마다 부르는 이름이 다르다(「나의 진로 여정」/「진로 여정」) */
  title: string
  desc?: string
  /** 헤더 우측 슬롯 — 상담사의 「로드맵 편집」 버튼 등 */
  action?: ReactNode
  /**
   * 미완료 칸 마커. 기본은 진행 코드 텍스트(C5)다.
   * admin 은 학생 JSON 의 fa- 아이콘을 Lucide 로 바꿔 그리므로 여기서 주입받는다.
   */
  pendingMarker?: (step: JourneyStep) => ReactNode
  /** 배치용 클래스 — 그리드 칸·히어로 높이는 카드가 아니라 페이지가 정한다. */
  className?: string
  /** 앵커(#journey) 등 페이지가 붙이는 id */
  id?: string
}

export default function CareerJourneyCard({
  journey, title, desc, action, pendingMarker, className, id,
}: CareerJourneyCardProps) {
  const { steps, percent } = journey

  return (
    <section data-slot="card" className={`cj-card${className ? ` ${className}` : ''}`} id={id}>
      <div data-slot="card-header">
        <div>
          <h2 data-slot="card-title">{title}</h2>
          {desc && <p data-slot="card-description">{desc}</p>}
        </div>
        {action && <div data-slot="card-action">{action}</div>}
      </div>
      <div data-slot="card-content">
        <div className="cj-state">
          <div className="cj-stage">
            <span className="cj-kicker">{journey.kicker}</span>
            <b>{journey.stage}</b>
            <p>{journey.summary}</p>
          </div>
          <div className="cj-percent"><span>전체 진행률</span><b>{percent}%</b></div>
        </div>

        <div
          className="cj-track"
          style={{ '--cj-pct': `${percent}%` } as CSSProperties}
          role="img"
          aria-label={`전체 진행률 ${percent}%`}
        >
          <i />
        </div>

        {/* 칸 수는 데이터가 정한다 — 열 개수와 연결선 여백을 여기서 넘긴다.
            아직 단계가 없는 학생(진단 전)은 막대까지만 그리고 끝낸다. */}
        {steps.length > 0 && (
        <div
          className="cj-steps"
          role="list"
          style={{
            '--cj-count': steps.length,
            '--cj-edge': `${50 / steps.length}%`,
          } as CSSProperties}
        >
          {steps.map((step, i) => (
            <div
              key={step.code}
              className={`cj-step is-${step.status}`}
              role="listitem"
              aria-current={step.status === 'current' ? 'step' : undefined}
              style={{ '--cj-step': rampVar(i, steps.length) } as CSSProperties}
            >
              <span className="cj-marker">
                {step.status === 'done' ? '✓' : pendingMarker ? pendingMarker(step) : step.code}
              </span>
              <b>{step.label}</b>
              {step.note && <span className="cj-note">{step.note}</span>}
            </div>
          ))}
        </div>
        )}
      </div>
    </section>
  )
}
