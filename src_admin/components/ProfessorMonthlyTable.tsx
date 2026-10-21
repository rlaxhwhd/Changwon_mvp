import type { MonthlyCounselStats } from '../data/professorCounselManage'

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

/** 교수 상담 월별 온라인·오프라인 건수 표 — 상담실적·마이홈 공용. */
export default function ProfessorMonthlyTable({ stats }: { stats: MonthlyCounselStats }) {
  const month = (m: number) => stats.months.find(row => row.month === m) ?? { month: m, online: 0, offline: 0 }
  return <div className="professor-report-table-wrap"><table className="professor-report-table professor-monthly-table">
    <thead><tr><th scope="col">구분</th>{MONTHS.map(m => <th scope="col" key={m}>{m}월</th>)}<th scope="col">총계</th></tr></thead>
    <tbody>
      <tr><th scope="row">온라인</th>{MONTHS.map(m => <td key={m}>{month(m).online}</td>)}<td>{stats.online}</td></tr>
      <tr><th scope="row">오프라인</th>{MONTHS.map(m => <td key={m}>{month(m).offline}</td>)}<td>{stats.offline}</td></tr>
    </tbody>
    <tfoot><tr><th scope="row">합계</th>{MONTHS.map(m => <td key={m}>{month(m).online + month(m).offline}</td>)}<td>{stats.total}</td></tr></tfoot>
  </table></div>
}
