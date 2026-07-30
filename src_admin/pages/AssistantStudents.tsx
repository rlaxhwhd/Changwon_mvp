import StudentList from './StudentList'
import { getActiveUser } from '../data/staff'
import type { Assistant } from '../data/assistants'

// ─────────────────────────────────────────────────────────────────────────
// 조교 담당 학과 학생 현황 — StudentList를 학과 스코프·읽기 전용으로 재사용.
// SPEC §3-2① (담당 학과 학생 조회, 로드맵/IAP 수정 불가 = readonly).
// 범위는 화면에서 filter하지 않고 조교 배정(departments)을 로더에 넘겨 데이터 층에서 좁힌다.
// ─────────────────────────────────────────────────────────────────────────
export default function AssistantStudents() {
  const user = getActiveUser()
  const departments = user.role === 'assistant' ? (user as Assistant).departments : []
  return (
    <StudentList
      departments={departments}
      title="담당 학과 학생 현황"
      subtitle={`${user.dept} · 담당 학과`}
      readonly
    />
  )
}
