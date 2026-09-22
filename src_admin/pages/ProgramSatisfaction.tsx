import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { LuSmile } from 'react-icons/lu'
import type { ProgramTabContext } from './ProgramShell'
import { loadSurveyStats, type SurveyStats } from '../../shared/surveyStore'
import EmptyState from '../components/EmptyState'

// 만족도조사 탭 — 문항(코드관리 SURVEY_AREA group=SATISFACTION)이 등록되면 응답 집계를 붙인다.
// 지금은 실시 여부와 응답 건수만 보여 준다. 양식이 없는 동안 가짜 문항·점수를 그리지 않는다.
export default function ProgramSatisfaction() {
  const { program } = useOutletContext<ProgramTabContext>()
  const [stats, setStats] = useState<SurveyStats | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    loadSurveyStats(program.id)
      .then(next => { if (alive) setStats(next) })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : '통계를 불러오지 못했습니다.') })
    return () => { alive = false }
  }, [program.id])

  if (error) return <section className="admin-card"><p role="alert">{error}</p></section>
  if (!stats) return <p role="status" className="admin-page-desc">응답 현황을 집계하는 중입니다…</p>
  const n = stats.participation.satisfaction
  return (
    <section className="admin-card">
      <EmptyState
        icon={LuSmile}
        message={program.satisfactionSurvey
          ? `만족도 조사를 실시하는 프로그램입니다. 응답 ${n}건 · 수료 ${stats.participation.completed}명.\n만족도 문항이 코드관리에 등록되면 수료 학생에게 조사가 열리고 여기에 문항별 통계가 표시됩니다.`
          : '이 프로그램은 만족도 조사를 실시하지 않습니다. 프로그램 수정에서 「실시」로 바꾸면 수료 후 조사가 열립니다.'}
      />
    </section>
  )
}
