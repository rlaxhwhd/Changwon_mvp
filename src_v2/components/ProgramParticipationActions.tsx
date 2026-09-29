import { Link } from 'react-router-dom'
import { myProgramStatus, myProgramSurveys, type ProgramParticipation } from '../../shared/myPrograms'
import './ProgramParticipationActions.css'

const surveyLabels = {
  PRE: '설문 진행', POST: '사후 설문조사 진행', SATISFACTION: '만족도 조사 진행',
}

/** 공고와 마이페이지가 동일한 신청·선발·이수 상태 및 미제출 설문을 표시한다. */
export default function ProgramParticipationActions({ participation: p, notice = false }: {
  participation: ProgramParticipation; notice?: boolean
}) {
  const cancelled = !!p.cancelledAt || p.selection === 'CANCELLED'
  const label = myProgramStatus(p)
  const pending = myProgramSurveys(p).filter(s => !s.done)
  const tone = cancelled || p.selection === 'REJECTED' || p.outcome === 'NOT_COMPLETED' || p.outcome === 'ABSENT'
    ? 'cancel' : p.outcome === 'COMPLETED' ? 'done' : 'scheduled'

  return <div className={`program-participation${notice ? ' program-participation--notice' : ''}`}>
    {notice ? pending.length === 0 && <button type="button" className="jd-apply-btn" disabled>{label}</button>
      : <span className={`cs-status cs-status--${tone}`}>{label}</span>}
    {pending.map(s => <Link key={s.phase}
      className={notice ? 'jd-apply-btn' : 'program-survey-action'}
      to={`/mypage/programs/${encodeURIComponent(p.id)}/survey/${s.phase}`}>
      {surveyLabels[s.phase]}
    </Link>)}
  </div>
}
