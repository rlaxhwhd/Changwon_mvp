import StudentChargeTable from '../components/StudentChargeTable'
import { getActiveCounselor } from '../data/counselors'

// 담당 학생 목록 (SPEC §3-1-⑧) — 표는 전체 학생 목록과 같은 StudentChargeTable 이다.
// 두 화면의 차이는 조회 범위 하나뿐이다: 여기는 상담사 담당 학과, 저기는 전 학과.
export default function StudentList() {
  const counselor = getActiveCounselor()

  return (
    <StudentChargeTable
      departments={counselor.departments}
      title="담당 학생 목록"
      scopeLabel={`${counselor.dept} · ${counselor.scope}`}
    />
  )
}
