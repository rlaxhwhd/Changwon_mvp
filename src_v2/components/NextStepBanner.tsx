import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { diagnosisRetakes, loadStudentDiagnoses } from '../../shared/diagnosisStore'
import { HANDOFF_TOTAL, getNextAction } from '../data/careerProcess'
import { getPipelineState } from '../data/pipeline'
import { getActiveStudent } from '../data/students'
import './NextStepBanner.css'
import GradientButton from './ui/button-1'

// ─────────────────────────────────────────────────────────────────────────
// 다음 할 일 인계 배너 — 로그인 직후 학생이 처음 만나는 안내다.
//
// 「지금 뭘 해야 하나」는 careerProcess.getNextAction 하나가 정한다.
// 이 컴포넌트는 그 답을 그리기만 한다 — 여기에 순서 판단을 두지 않는다.
// 모든 단계를 마친 학생에게는 아무것도 그리지 않는다(null).
// ─────────────────────────────────────────────────────────────────────────

export default function NextStepBanner() {
  const student = getActiveStudent()
  const [, update] = useState(0)
  useEffect(() => {
    const changed = () => update(n => n + 1)
    const refresh = () => { void loadStudentDiagnoses(student.id).catch(() => {}) }
    window.addEventListener('dc:diagnosis-updated', changed)
    window.addEventListener('dc_roadmap_changed', refresh)
    window.addEventListener('dc:counsel-updated', refresh)
    if (!diagnosisRetakes[student.id]) refresh()
    return () => {
      window.removeEventListener('dc:diagnosis-updated', changed)
      window.removeEventListener('dc_roadmap_changed', refresh)
      window.removeEventListener('dc:counsel-updated', refresh)
    }
  }, [student.id])
  const guide = diagnosisRetakes[student.id]?.guide
  const next = guide ? {
    step: { core: 1, followup: 2, counsel: 3, roadmap: 4 }[guide.stage],
    title: { core: 'C-CORE 재진단을 시작하세요', followup: '새 유형에 맞는 후속진단을 진행하세요', counsel: '재진단 후 CARE 7+ 상담을 신청하세요', roadmap: '새 로드맵 확정을 기다리는 중입니다' }[guide.stage],
    detail: guide.annual ? '새해 CARE 7+ 과정을 다시 완료해 주세요. 이전 활동 기록은 계속 확인할 수 있습니다.' : '재진단 → 유형별 후속진단 → 상담 → 새 로드맵 순서로 다음 단계를 준비합니다.',
    ctaPath: guide.stage === 'counsel' ? '/counsel/career' : guide.stage === 'roadmap' ? '/roadmap/ai' : '/diagnosis/employment',
    ctaLabel: guide.stage === 'counsel' ? '상담 신청하기' : guide.stage === 'roadmap' ? '로드맵 확인' : '진단 진행하기',
    secondary: undefined,
  } : getNextAction(getPipelineState(student))
  if (!next) return null

  return (
    <section className="nsb" aria-labelledby="nsbTitle">
      <div className="nsb-body">
        <span className="nsb-kicker">
          다음 단계 <b>{next.step}</b> / {HANDOFF_TOTAL}
        </span>
        <h2 id="nsbTitle">{next.title}</h2>
        <p>{next.detail}</p>
        {/* 보조 안내 — 진도(step/total)에 들어가지 않는, 지금도 할 수 있는 일.
            진단 구간에서 「일반 진로·취업 상담」이 여기로 나온다. */}
        {next.secondary && (
          <p className="nsb-secondary">
            {next.secondary.detail}{' '}
            <Link to={next.secondary.path}>
              {next.secondary.label} <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
          </p>
        )}
      </div>

      <div className="nsb-side">
        {/* 네 걸음을 점으로 — 지금 어디쯤인지 한눈에 보이게 한다. */}
        <ol className="nsb-dots" aria-hidden="true">
          {Array.from({ length: HANDOFF_TOTAL }, (_, i) => (
            <li key={i} className={i + 1 < next.step ? 'is-done' : i + 1 === next.step ? 'is-now' : ''} />
          ))}
        </ol>
        <GradientButton to={next.ctaPath} className={`gradient-button-step-${next.step}`}>
          {next.ctaLabel}
        </GradientButton>
      </div>
    </section>
  )
}
