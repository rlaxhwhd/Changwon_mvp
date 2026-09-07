import { Link } from 'react-router-dom'
import { STAGE_LABEL, getNextAction, getStageAccess } from '../data/careerProcess'
import type { PipelineState, Stage } from '../data/careerProcess'
import './StageLockNotice.css'

// ─────────────────────────────────────────────────────────────────────────
// 잠긴 단계 안내 (CLAUDE.md 13조 — 잠긴 UI 에 빈 화면을 주지 않는다)
//
// 「왜 못 보는지 · 무엇을 하면 열리는지 · 어디로 가면 되는지」 셋을 항상 같이 준다.
// 판정과 문구는 careerProcess 가 갖는다 — 화면마다 조건·안내를 다시 쓰지 않는다.
// ─────────────────────────────────────────────────────────────────────────

export interface StageLockNoticeProps {
  /** 지금 열려고 한 단계 */
  stage: Stage
  state: PipelineState
  /** 이 화면의 이름 — 「로드맵」처럼 학생이 부르는 이름 */
  title?: string
}

/** 잠겨 있으면 안내 패널을, 열려 있으면 null 을 돌려준다. */
export default function StageLockNotice({ stage, state, title }: StageLockNoticeProps) {
  if (getStageAccess(state)[stage] === 'open') return null

  const next = getNextAction(state)
  const name = title ?? STAGE_LABEL[stage]

  return (
    <section className="lock-notice" role="status">
      <span className="lock-notice-icon" aria-hidden="true"><i className="fa-solid fa-lock" /></span>
      <h2>{name}은 아직 열리지 않았습니다</h2>

      {next ? (
        <>
          <p className="lock-notice-why">{next.detail}</p>
          <ol className="lock-notice-steps" aria-label="남은 단계">
            {[
              { n: 1, label: 'C-CORE 핵심진단' },
              { n: 2, label: '유형별 후속진단' },
              { n: 3, label: '상담 · 유형 확정' },
              { n: 4, label: '로드맵 생성' },
            ].map(s => (
              <li key={s.n} className={s.n < next.step ? 'is-done' : s.n === next.step ? 'is-now' : ''}>
                <b>{s.n < next.step ? '✓' : s.n}</b>{s.label}
              </li>
            ))}
          </ol>
          <Link className="lock-notice-cta" to={next.ctaPath}>
            {next.ctaLabel} <i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </Link>
        </>
      ) : (
        <p className="lock-notice-why">선행 단계가 모두 끝나면 자동으로 열립니다.</p>
      )}
    </section>
  )
}
