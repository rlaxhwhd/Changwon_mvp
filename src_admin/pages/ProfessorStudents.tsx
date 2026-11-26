import StudentRosterTable from '../components/StudentRosterTable'

// 교수 학생 검색 (SPEC §3-5) — 조교 화면과 같은 StudentRosterTable 을 쓴다(읽기 전용).
// 범위는 현재 유효한 학과 배정 ∪ 전담학생 — 학사 학생 전체(서비스 미이용 포함)를 서버가 범위로 좁힌다(0022).
export default function ProfessorStudents() {
  return (
    <StudentRosterTable
      departments={[]}
      title="학생 검색"
      subtitle="현재 유효한 학과·전담학생 배정에 따른 학사 학생(서비스 미이용 포함)"
      viewerRole="professor"
    />
  )
}
