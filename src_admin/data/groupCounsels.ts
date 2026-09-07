// ─────────────────────────────────────────────────────────────────────────────
// 집단상담 로더 (SPEC C6) — seed JSON ⊕ localStorage 'dc_group_counsels'
//
// 1:N 상담 도메인. 1:1 상담(counselRequests·counselRecords)과 섞지 않는다 —
// 접수함·상담 통계의 모수에 들어가면 실적이 이중 계상된다(현행도 별도 화면).
// DB 전환 시 이 모듈만 API로 교체한다.
// ─────────────────────────────────────────────────────────────────────────────
import seed from './groupCounsels.seed.json'
import type { GroupCounsel, GroupCounselKind, GroupCounselStatus, GroupMember } from './schema/groupCounsel'
import type { CounselorRole } from './schema/counselor'

const STORAGE_KEY = 'dc_group_counsels'
const SEED = seed as GroupCounsel[]

/** 상담사 역할 → 이 상담사가 여는 집단 유형. 진로=집단상담 / 심리=집단심리검사. */
export function groupKindOf(role: CounselorRole): GroupCounselKind {
  return role === 'psych' ? '집단심리검사' : '집단상담'
}

export function getGroupCounsels(): GroupCounsel[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as GroupCounsel[]
    }
  } catch {
    /* seed 폴백 */
  }
  return SEED
}

function persist(list: GroupCounsel[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* 데모 범위 — 저장 실패 무시 */
  }
}

/** 담당 상담사가 진행하는 회차 (최근 실시일 순) */
export function getGroupCounselsByCounselor(counselorId: string): GroupCounsel[] {
  return getGroupCounsels()
    .filter(item => item.counselorId === counselorId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function getGroupCounselById(id: string): GroupCounsel | undefined {
  return getGroupCounsels().find(item => item.id === id)
}

/** 상태별 건수 (상단 요약) */
export function getGroupSummary(counselorId: string): Record<GroupCounselStatus | '전체', number> {
  const list = getGroupCounselsByCounselor(counselorId)
  return {
    전체: list.length,
    예정: list.filter(item => item.status === '예정').length,
    완료: list.filter(item => item.status === '완료').length,
    취소: list.filter(item => item.status === '취소').length,
  }
}

/** 회차 upsert. `updatedAt`은 항상 갱신된다. */
export function upsertGroupCounsel(session: GroupCounsel): GroupCounsel {
  const next: GroupCounsel = { ...session, updatedAt: new Date().toISOString() }
  const list = getGroupCounsels()
  const idx = list.findIndex(item => item.id === session.id)
  persist(idx >= 0 ? list.map(item => (item.id === session.id ? next : item)) : [...list, next])
  return next
}

/** 참여자 추가. 정원 초과·중복은 거부한다(정합성은 애플리케이션이 전담 — FK 없는 DB 전제). */
export function addGroupMember(sessionId: string, member: Omit<GroupMember, 'addedAt'>): GroupCounsel {
  const session = getGroupCounselById(sessionId)
  if (!session) throw new Error('집단상담 회차를 찾을 수 없습니다.')
  if (session.status !== '예정') throw new Error('예정 상태의 회차에만 참여자를 추가할 수 있습니다.')
  if (session.members.some(item => item.studentId === member.studentId)) throw new Error('이미 참여 중인 학생입니다.')
  if (session.members.length >= session.capacity) throw new Error(`정원(${session.capacity}명)을 초과할 수 없습니다.`)
  return upsertGroupCounsel({ ...session, members: [...session.members, { ...member, addedAt: new Date().toISOString() }] })
}

export function removeGroupMember(sessionId: string, studentId: string): GroupCounsel {
  const session = getGroupCounselById(sessionId)
  if (!session) throw new Error('집단상담 회차를 찾을 수 없습니다.')
  if (session.status !== '예정') throw new Error('예정 상태의 회차에서만 참여자를 뺄 수 있습니다.')
  return upsertGroupCounsel({ ...session, members: session.members.filter(item => item.studentId !== studentId) })
}

/** 회차 완료 — 출석·요약·코멘트를 기록하고 상태를 전이한다. */
export function completeGroupCounsel(
  sessionId: string,
  input: { attendedIds: string[]; summary: string; comment: string },
): GroupCounsel {
  const session = getGroupCounselById(sessionId)
  if (!session) throw new Error('집단상담 회차를 찾을 수 없습니다.')
  const attended = new Set(input.attendedIds)
  return upsertGroupCounsel({
    ...session,
    status: '완료',
    members: session.members.map(item => ({ ...item, attended: attended.has(item.studentId) })),
    summary: input.summary.trim(),
    comment: input.comment.trim(),
  })
}

/** 회차 취소 — 사유 필수(1:1 상담 취소와 같은 규칙). */
export function cancelGroupCounsel(sessionId: string, reason: string): GroupCounsel {
  const session = getGroupCounselById(sessionId)
  if (!session) throw new Error('집단상담 회차를 찾을 수 없습니다.')
  return upsertGroupCounsel({ ...session, status: '취소', cancelReason: reason.trim() })
}

export type { GroupCounsel, GroupCounselKind, GroupCounselStatus, GroupMember }
