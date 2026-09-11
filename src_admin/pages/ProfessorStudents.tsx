import StudentRosterTable from '../components/StudentRosterTable'

// 교수 학생 검색 (SPEC §3-5) — 조교 화면과 같은 StudentRosterTable 을 쓴다(읽기 전용).
// 범위는 소속 학과 ∪ 관리자 추가 배정 — 파생은 professors.ts 가 하고 화면은 받기만 한다.
export default function ProfessorStudents() {
  return (
    <StudentRosterTable
      departments={[]}
      title="학생 검색"
      subtitle="현재 유효한 학과·전담학생 배정에 따른 학생"
      viewerRole="professor"
    />
  )
}
