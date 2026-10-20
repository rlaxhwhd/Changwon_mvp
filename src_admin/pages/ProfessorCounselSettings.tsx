import ProfessorProfile from './ProfessorProfile'
import ProfessorSchedule from './ProfessorSchedule'

export default function ProfessorCounselSettings() {
  return <div className="admin-page professor-counsel-settings">
    <header className="admin-page-head"><h1 className="admin-page-title">상담 설정</h1></header>
    <ProfessorProfile embedded />
    <ProfessorSchedule embedded />
  </div>
}
