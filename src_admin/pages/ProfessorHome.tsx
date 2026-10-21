import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'
import { studentDisplayName } from '../../shared/studentDisplayName'
import EmptyState from '../components/EmptyState'
import ProfessorMonthlyTable from '../components/ProfessorMonthlyTable'
import { loadMonthlyCounselStats, loadProfessorHome } from '../data/professorCounselManage'
import type { MonthlyCounselStats, ProfessorHome as HomeData, ProfessorHomeRequest } from '../data/professorCounselManage'
import './ProfessorCounsel.css'

const GRADES = [1, 2, 3, 4, 5]
const thisYear = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(new Date()))
const emptyStats: MonthlyCounselStats = { months: [], online: 0, offline: 0, total: 0 }
const requestedAt = (value: string) => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(new Date(value)).replaceAll('-', '.')

function RequestTable({ channel, items }: { channel: 'online' | 'offline'; items: ProfessorHomeRequest[] }) {
  if (!items.length) return <EmptyState message="상담신청 내역이 없습니다." />
  return <div className="professor-report-table-wrap"><table className="professor-report-table professor-home-requests">
    <thead><tr>{['이름', '학번', '소속', '학년', '신청일시', '상태'].map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead>
    <tbody>{items.map(row => <tr key={row.id}>
      <td><Link className="professor-report-link" to={row.statusCode === 'REQ' ? '/professor/counsel/requests' : `/professor/counsel/${channel}/${row.id}`}>
        {studentDisplayName(row.name, row.studentId)}</Link></td>
      <td>{row.studentNo}</td><td>{[row.college, row.major].filter(Boolean).join(' ')}</td><td>{row.grade}</td>
      <td>{requestedAt(row.requestedAt)}</td><td>{row.status}</td>
    </tr>)}</tbody>
  </table></div>
}

export default function ProfessorHome() {
  const [home, setHome] = useState<HomeData | null>(null)
  const [year, setYear] = useState(thisYear)
  const [stats, setStats] = useState<MonthlyCounselStats>(emptyStats)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    loadProfessorHome().then(result => { if (active) setHome(result) }).catch(reason => { if (active) setError(reason.message) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    let active = true
    loadMonthlyCounselStats({ college: '', major: '', grade: '', q: '', dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` })
      .then(result => { if (active) setStats(result) }).catch(reason => { if (active) setError(reason.message) })
    return () => { active = false }
  }, [year])
  const row = (grade: number) => home?.grades.find(g => g.grade === grade) ?? { assigned: 0, unassigned: 0 }
  const assigned = home?.grades.reduce((sum, g) => sum + g.assigned, 0) ?? 0
  const unassigned = home?.grades.reduce((sum, g) => sum + g.unassigned, 0) ?? 0
  const dash = <td className="professor-home-na">-</td>
  return <div className="admin-page professor-counsel-page professor-home">
    <header className="admin-page-head"><h1 className="admin-page-title">마이페이지</h1></header>
    {error && <p role="alert" className="admin-form-hint-warn">{error}</p>}

    <h2 className="professor-home-title">학과학생 현황</h2>
    <div className="professor-home-students">
      <section className="admin-card professor-home-total" aria-label="학과학생 수">
        <span>학과학생 수</span><strong>{home ? assigned + unassigned : '-'}</strong>
      </section>
      <section className="admin-card">
        <p className="professor-home-semester">{home ? `${home.semester.year}학년도 ${home.semester.term}학기` : '불러오는 중…'}</p>
        <div className="professor-report-table-wrap"><table className="professor-report-table professor-home-grade-table">
          <thead><tr>{['구분', '전담 인원', '미전담 인원', '장기결석자', '학사경고자', '진로설계 참여인원', '참여율'].map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead>
          <tbody>{GRADES.map(grade => <tr key={grade}>
            <th scope="row">{grade}학년</th><td>{row(grade).assigned}명</td><td>{row(grade).unassigned}명</td>{dash}{dash}{dash}{dash}
          </tr>)}</tbody>
          <tfoot><tr><th scope="row">계</th><td>{assigned}명</td><td>{unassigned}명</td>{dash}{dash}{dash}{dash}</tr></tfoot>
        </table></div>
        <p className="admin-field-hint">장기결석자·학사경고자·진로설계 참여인원은 학사 데이터 연계 전이라 '-'로 표시합니다.</p>
      </section>
    </div>

    <h2 className="professor-home-title">월별 상담현황</h2>
    <section className="admin-card">
      <div className="professor-home-year">
        <button type="button" aria-label="이전 연도" onClick={() => setYear(y => y - 1)}><LuChevronLeft /></button>
        <strong>{year}</strong> 년
        <button type="button" aria-label="다음 연도" disabled={year >= thisYear} onClick={() => setYear(y => y + 1)}><LuChevronRight /></button>
      </div>
      <ProfessorMonthlyTable stats={stats} />
    </section>

    <div className="professor-home-lists">
      <section>
        <div className="professor-home-list-head">
          <h2 className="professor-home-title">온라인 상담신청 내역 <span>미답변 : <b>{home?.online.unanswered ?? 0}</b> 건</span></h2>
          <Link to="/professor/counsel/online" className="admin-btn admin-btn-ghost sm">더보기</Link>
        </div>
        {home && <RequestTable channel="online" items={home.online.items} />}
      </section>
      <section>
        <div className="professor-home-list-head">
          <h2 className="professor-home-title">오프라인 상담신청 내역 <span>금주 상담신청 : <b>{home?.offline.thisWeek ?? 0}</b> 건</span></h2>
          <Link to="/professor/counsel/offline" className="admin-btn admin-btn-ghost sm">더보기</Link>
        </div>
        {home && <RequestTable channel="offline" items={home.offline.items} />}
      </section>
    </div>
  </div>
}
