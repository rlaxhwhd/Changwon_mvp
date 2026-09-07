import StudentRosterTable from '../components/StudentRosterTable'
import { getActiveUser } from '../data/staff'
import { getProfessorDepartments } from '../data/professors'
import type { Professor } from '../data/professors'

// 교수 학생 검색 (SPEC §3-5) — 조교 화면과 같은 StudentRosterTable 을 쓴다(읽기 전용).
// 범위는 소속 학과 ∪ 관리자 추가 배정 — 파생은 professors.ts 가 하고 화면은 받기만 한다.
export default function ProfessorStudents() {
  const user = getActiveUser()
  const departments = user.role === 'professor' ? getProfessorDepartments(user as Professor) : []
  return (
    <StudentRosterTable
      departments={departments}
      title="학생 검색"
      subtitle={`${departments.join(' · ')} · 소속 학과`}
      viewerRole="professor"
    />
  )
}
