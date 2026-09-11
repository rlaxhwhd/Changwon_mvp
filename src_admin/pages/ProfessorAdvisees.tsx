import StudentRosterTable from '../components/StudentRosterTable'
import { getActiveUser } from '../data/staff'

/** 교수 범위는 학과 로스터가 아니라 활성 지도교수 배정의 단일 원천을 따른다. */
export default function ProfessorAdvisees() {
  const user = getActiveUser()
  return (
    <StudentRosterTable
      departments={[]}
      professorId={user.id}
      title="지도학생 목록"
      subtitle={`${user.name}의 지도학생`}
      viewerRole="professor"
    />
  )
}
