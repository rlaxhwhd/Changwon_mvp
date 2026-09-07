import { Link } from 'react-router-dom'
import { getStarSummary, getAxisProgress, STAR_STATUS_LABEL, MILEAGE_PASS_MARK } from '../data/starTrack'
import type { StarAxis, StarStep, StarTrackRecord } from '../data/starTrack'
import './StarRoadmapCard.css'

// ─────────────────────────────────────────────────────────────────────────
// STAR 성장 로드맵 카드 — 학생 대시보드(/v2/star)와 상담사 학생 상세가 공유한다.
// 한 벌만 두는 이유는 배점·이수 판정이 한 곳에서만 읽혀야 하기 때문이다
// (같은 학생의 마일리지가 두 화면에서 다르게 보이면 안 된다).
//
// 값은 전부 data/starTrack.ts 가 만든다 — 여기에 숫자·판정식이 없다.
// 「더 보기」 링크는 주입받는다: v2 라우트라서 admin 에서 그리면 죽은 링크가 된다.
// ─────────────────────────────────────────────────────────────────────────

export interface StarRoadmapCardProps {
  record: StarTrackRecord
  /** 카드 제목 (예: 「STAR-Core 성장 로드맵」) */
  title: string
  /** 제목 우측 설명 (트랙 성격·목표) */
  note?: string
  /** 축 id → 「더 보기」 링크. 넘기지 않으면 그리지 않는다. */
  axisLinks?: Record<string, { label: string; to: string } | undefined>
}

/**
 * 「이수 기준까지」 — 마일리지와 필수 항목은 **둘 다** 채워야 인증이 난다.
 * 마일리지를 넘겨도 필수가 남으면 "0점"이 아니라 남은 필수를 말해야 한다.
 */
function passGoal(summary: ReturnType<typeof getStarSummary>): { value: string; sub: string } {
  if (summary.passed) return { value: '기준 충족', sub: '인증 신청 가능' }
  if (summary.mileage < MILEAGE_PASS_MARK) {
    return { value: `마일리지 ${MILEAGE_PASS_MARK - summary.mileage}점`, sub: `필수 항목 ${summary.blockers.length}건 포함` }
  }
  return { value: `필수 ${summary.blockers.length}건`, sub: `마일리지 ${MILEAGE_PASS_MARK}점은 충족` }
}

export default function StarRoadmapCard({ record, title, note, axisLinks }: StarRoadmapCardProps) {
  const summary = getStarSummary(record)

  return (
    <section className="st-roadmap" aria-label={title}>
      <h2 className="st-sec-head">
        <i className="fa-solid fa-crown" />{title}
        {note && <span className="st-sec-note">{note}</span>}
      </h2>

      <div className="st-metrics">
        <div className="st-metric">
          <span className="st-metric-badge is-mileage"><i className="fa-solid fa-coins" /></span>
          <div>
            <small>누적 마일리지</small>
            <strong>{summary.mileage}<em>점</em></strong>
            <span className="st-metric-sub">최대 {summary.mileageMax}점</span>
          </div>
        </div>
        <div className="st-metric">
          <Donut rate={summary.rate} />
          <div>
            <small>이수율</small>
            <strong>{summary.rate}<em>%</em></strong>
            <span className="st-metric-sub">{summary.doneSteps}/{summary.totalSteps}단계 완료</span>
          </div>
        </div>
        <div className="st-metric">
          <span className="st-metric-badge is-goal"><i className="fa-solid fa-flag" /></span>
          <div>
            <small>이수 기준까지</small>
            <strong className="is-text">{passGoal(summary).value}</strong>
            <span className="st-metric-sub">{passGoal(summary).sub}</span>
          </div>
        </div>
      </div>

      {/* 마일리지를 채워도 필수 항목이 남으면 인증이 안 나온다 — 가장 먼저 알려야 할 값이다. */}
      {summary.blockers.length > 0 && (
        <p className="st-blocker">
          <i className="fa-solid fa-triangle-exclamation" />
          <span>
            <b>필수 항목 {summary.blockers.length}건이 남아 마일리지와 무관하게 인증이 나오지 않습니다</b> —
            {' '}{summary.blockers.map(b => b.label).join(' · ')}
          </span>
        </p>
      )}

      <div className="st-axes">
        {record.axes.map((axis, i) => (
          <AxisColumn key={axis.id} axis={axis} no={i + 1} more={axisLinks?.[axis.id]} />
        ))}
      </div>
    </section>
  )
}

function AxisColumn({ axis, no, more }: { axis: StarAxis; no: number; more?: { label: string; to: string } }) {
  const progress = getAxisProgress(axis)
  return (
    // no 는 라벨이 아니라 축 색(st-axis-1~3)을 고르는 값이다.
    <section className={`st-axis st-axis-${no}`}>
      <h3>
        <span>{axis.title}</span>
        <em>{progress.done}/{progress.total}</em>
      </h3>
      <ol className="st-steps">
        {axis.steps.map((step, i) => <StepRow key={step.id} step={step} no={i + 1} />)}
      </ol>
      {more && (
        <Link to={more.to} className="st-axis-more">
          <i className="fa-solid fa-plus" />{more.label}
        </Link>
      )}
    </section>
  )
}

function StepRow({ step, no }: { step: StarStep; no: number }) {
  return (
    <li className={`is-${step.status}`}>
      <span className="st-step-no">{no}</span>
      <span className="st-step-label">
        {step.label}
        {step.required && <b className="st-step-req">필수</b>}
        {step.note && <small className="st-step-note">{step.note}</small>}
      </span>
      {step.points != null && <span className="st-step-pt">+{step.points}</span>}
      <span className={`st-state is-${step.status}`}>{STAR_STATUS_LABEL[step.status]}</span>
    </li>
  )
}

/** 이수율 도넛 — conic-gradient 한 겹이라 차트 라이브러리를 들이지 않는다. */
function Donut({ rate }: { rate: number }) {
  return (
    <span
      className="st-donut"
      style={{ background: `conic-gradient(var(--mint, #20b486) ${rate * 3.6}deg, var(--muted, #f1f3f6) 0)` }}
      aria-hidden="true"
    />
  )
}
