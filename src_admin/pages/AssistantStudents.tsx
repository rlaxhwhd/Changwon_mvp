import StudentRosterTable from '../components/StudentRosterTable'
import { getActiveUser } from '../data/staff'
import type { Assistant } from '../data/assistants'

// 조교 담당 학과 학생 현황 (SPEC §3-2①) — 공유 StudentRosterTable 사용(학과 스코프, 읽기 전용).
export default function AssistantStudents() {
  const user = getActiveUser()
  const departments = user.role === 'assistant' ? (user as Assistant).departments : []
  return (
    <StudentRosterTable
      departments={departments}
      title="담당 학과 학생 현황"
      subtitle={`${departments.join(' · ')} · 담당 학과`}
      viewerRole="assistant"
    />
  )
}
