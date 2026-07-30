// ─────────────────────────────────────────────────────────────────────────
// 전 교직원 통합 레지스트리 + 활성 사용자(세션) 해석.
// 레이아웃(GNB·SectionSidebar)·로그인·역할 가드가 이 모듈만 구독하면
// 상담사/교수/조교 어떤 역할이든 동일하게 동작한다.
//   - 세션 저장/리로드는 session.ts(leaf)가 담당
//   - 상담 도메인 전용 조회는 counselors.ts가 담당(여기와 코이그지스트)
// ─────────────────────────────────────────────────────────────────────────
import type { StaffUser, StaffRole } from './schema/staff'
import { getActiveIdRaw, setActiveId, hasActiveSession, clearSession } from './session'
import { COUNSELORS } from './counselors'
import { PROFESSORS } from './professors'
import { ASSISTANTS } from './assistants'

/** 전 교직원 통합 목록 — 세션 해석·데모 전환 UI가 구독.
 *  상담사를 먼저 두어 기본 활성 사용자(첫 항목)가 상담사로 유지된다. */
export const STAFF_USERS: StaffUser[] = [
  ...COUNSELORS,
  ...PROFESSORS,
  ...ASSISTANTS,
]

/** 활성 사용자 id (미저장 시 첫 사용자). */
export function getActiveUserId(): string {
  return getActiveIdRaw() ?? STAFF_USERS[0].id
}

/** 활성 교직원 사용자 — 역할 무관. 레이아웃이 이걸 구독한다. */
export function getActiveUser(): StaffUser {
  const id = getActiveUserId()
  return STAFF_USERS.find(u => u.id === id) ?? STAFF_USERS[0]
}

/** 역할로 첫 사용자 찾기 (로그인 역할 선택에 사용) */
export function getStaffByRole(role: StaffRole): StaffUser | undefined {
  return STAFF_USERS.find(u => u.role === role)
}

/** id로 사용자 1명 조회 */
export function getStaffById(id: string | undefined): StaffUser | undefined {
  return id ? STAFF_USERS.find(u => u.id === id) : undefined
}

/** 활성 사용자 전환(저장 후 리로드) */
export const setActiveUser = setActiveId
/** 로그아웃 */
export const clearActiveUser = clearSession
export { hasActiveSession }
