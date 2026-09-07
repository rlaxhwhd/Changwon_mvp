import { Link } from 'react-router-dom'
import { HANDOFF_TOTAL, getNextAction } from '../data/careerProcess'
import { getPipelineState } from '../data/pipeline'
import { getActiveStudent } from '../data/students'
import './NextStepBanner.css'

// ─────────────────────────────────────────────────────────────────────────
// 다음 할 일 인계 배너 — 로그인 직후 학생이 처음 만나는 안내다.
//
// 「지금 뭘 해야 하나」는 careerProcess.getNextAction 하나가 정한다.
// 이 컴포넌트는 그 답을 그리기만 한다 — 여기에 순서 판단을 두지 않는다.
// 모든 단계를 마친 학생에게는 아무것도 그리지 않는다(null).
// ─────────────────────────────────────────────────────────────────────────

export default function NextStepBanner() {
  const student = getActiveStudent()
  const next = getNextAction(getPipelineState(student))
  if (!next) return null

  return (
    <section className="nsb" aria-labelledby="nsbTitle">
      <div className="nsb-body">
        <span className="nsb-kicker">
          다음 단계 <b>{next.step}</b> / {HANDOFF_TOTAL}
        </span>
        <h2 id="nsbTitle">{next.title}</h2>
        <p>{next.detail}</p>
      </div>

      <div className="nsb-side">
        {/* 네 걸음을 점으로 — 지금 어디쯤인지 한눈에 보이게 한다. */}
        <ol className="nsb-dots" aria-hidden="true">
          {Array.from({ length: HANDOFF_TOTAL }, (_, i) => (
            <li key={i} className={i + 1 < next.step ? 'is-done' : i + 1 === next.step ? 'is-now' : ''} />
          ))}
        </ol>
        <Link className="nsb-cta" to={next.ctaPath}>
          {next.ctaLabel} <i className="fa-solid fa-arrow-right" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
