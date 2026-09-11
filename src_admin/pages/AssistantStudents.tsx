import StudentRosterTable from '../components/StudentRosterTable'

// 조교 담당 학과 학생 현황 (SPEC §3-2①) — 공유 StudentRosterTable 사용(학과 스코프, 읽기 전용).
export default function AssistantStudents() {
  return (
    <StudentRosterTable
      departments={[]}
      title="담당 학과 학생 현황"
      subtitle="현재 유효한 학과 배정에 따른 학생"
      viewerRole="assistant"
    />
  )
}
