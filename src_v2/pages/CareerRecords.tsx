import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../shared/api'
import { useDiagnosisHistory } from '../../shared/useDiagnosisHistory'
import { getActiveStudent } from '../data/students'
import { getModuleByTestId } from '../data/careerProcess'
import { usePageHead } from '../components/PageCrumb'
import './CareerRecords.css'

type Plan = { version: number; confirmedAt: string | null; targetRole: string; cells: { axis: string; title: string; status: string }[] }

export default function CareerRecords() {
  usePageHead('나의 활동 기록', '지난 진단·상담·로드맵 기록을 확인하세요.')
  const student = getActiveStudent()
  const { data, error: diagnosisError } = useDiagnosisHistory(student.id)
  const [plans, setPlans] = useState<Plan[]>([])
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    let cancelled = false
    api<{ plans: Plan[] }>(`/students/${encodeURIComponent(student.id)}/care7-history`)
      .then(result => { if (!cancelled) { setPlans(result.plans); setLoaded(true) } })
      .catch(e => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [student.id])
  const tests = [...new Set(data?.results.map(result => result.testId) ?? [])]
  return <div className="dr-wrap career-records">
    <section className="dr-card">
      <h2>진단 기록</h2>
      {diagnosisError && <p role="alert">{diagnosisError}</p>}
      {!data && !diagnosisError && <p role="status">불러오는 중입니다.</p>}
      {data && !tests.length && <p>저장된 진단 기록이 없습니다.</p>}
      {tests.map(test => <p key={test}><Link to={`/diagnosis/employment/${test}/history`}>{getModuleByTestId(test)?.name ?? test} · 전체 결과 이력</Link></p>)}
    </section>
    <section className="dr-card">
      <h2>상담·참여 기록</h2>
      <p><Link to="/counsel/record">상담 기록 보기</Link></p>
      <p><Link to="/growth/program/status">비교과 참여 기록 보기</Link></p>
      <p><Link to="/mypage/applications">채용 지원 기록 보기</Link></p>
    </section>
    <section className="dr-card">
      <h2>확정된 로드맵 기록</h2>
      {error && <p role="alert">{error}</p>}
      {!loaded && !error && <p role="status">불러오는 중입니다.</p>}
      {loaded && !plans.length && <p>확정된 로드맵 기록이 없습니다.</p>}
      {plans.map(plan => <details key={plan.version}>
        <summary>{plan.version}차 로드맵 · {plan.targetRole} · {plan.confirmedAt?.slice(0, 10)}</summary>
        <ul>{plan.cells.map((cell, index) => <li key={index}>{cell.title} · {cell.status === 'DONE' ? '완료' : cell.status === 'TODO' ? '진행 전' : cell.status}</li>)}</ul>
      </details>)}
    </section>
  </div>
}
