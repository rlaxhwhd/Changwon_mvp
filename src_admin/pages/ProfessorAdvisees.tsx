import StudentRosterTable from '../components/StudentRosterTable'
import { getActiveUser } from '../data/staff'

// 교수 지도학생 목록 (SPEC §3-5) — 공유 StudentRosterTable 사용(읽기 전용).
// 데모: 지도학생을 소속 학과 학생으로 대체(현행 advisee 매핑 데이터 도입 전).
export default function ProfessorAdvisees() {
  const user = getActiveUser()
  const departments = [user.dept]
  return (
    <StudentRosterTable
      departments={departments}
      title="지도학생 목록"
      subtitle={`${user.dept} · 지도학생`}
      viewerRole="professor"
    />
  )
}
