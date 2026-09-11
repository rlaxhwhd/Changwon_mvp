import type { Counselor, CounselorRole } from './schema/counselor'
import { canEditRoadmap, canManageJobs, canConfirmIap, handledRequestTypes } from './schema/counselor'
import { getActiveIdRaw, setActiveId, hasActiveSession as hasSession, clearSession } from './session'
import { counselorProfiles, loadCounselorProfiles } from '../../shared/counselOperationsStore'
import { api } from '../../shared/api'
export const COUNSELORS: Counselor[] = counselorProfiles
export function getActiveCounselorId(): string {
  return getActiveIdRaw() ?? COUNSELORS[0].id
}

/** 로그인 여부 — 세션 단일 소스(session.ts)로 위임 */
export function hasActiveSession(): boolean {
  return hasSession()
}

/** 로그아웃 — 활성 사용자 해제 후 리로드 */
export function clearActiveCounselor(): void {
  clearSession()
}

export function getActiveCounselor(): Counselor {
  const id = getActiveCounselorId()
  return COUNSELORS.find(c => c.id === id) ?? COUNSELORS[0]
}

export function setActiveCounselor(id: string): void {
  setActiveId(id)
}

/** 역할로 첫 상담사 찾기 (로그인 역할 선택에 사용) */
export function getCounselorByRole(role: CounselorRole): Counselor | undefined {
  return COUNSELORS.find(c => c.role === role)
}

/** 재배정 후보 — 같은 역할(유형)의 다른 상담사 목록 */
export function getReassignableCounselors(counselorId: string): Counselor[] {
  const me = COUNSELORS.find(c => c.id === counselorId)
  if (!me) return []
  return COUNSELORS.filter(c => c.role === me.role && c.id !== counselorId)
}

/** id로 상담사 1명 조회 (담당자 이름 표시용) */
export function getCounselorById(id: string | undefined): Counselor | undefined {
  return id ? COUNSELORS.find(c => c.id === id) : undefined
}


export async function updateCounselorProfile(id: string, patch: Partial<Counselor>): Promise<void> {
  const current = counselorProfiles.find(c => c.id === id)
  if (!current) throw new Error('프로필을 다시 조회해 주세요.')
  await api(`/counselor-profiles/${encodeURIComponent(id)}`, {
    method: 'PUT', body: JSON.stringify({ expectedVersion: current.version, name: patch.name ?? current.name,
      dept: patch.dept ?? current.dept, scope: patch.scope ?? current.scope,
      email: patch.email ?? '', officeHours: patch.officeHours ?? '' }),
  })
  await loadCounselorProfiles()
}
export { canEditRoadmap, canManageJobs, canConfirmIap, handledRequestTypes }
export type { Counselor, CounselorRole }
