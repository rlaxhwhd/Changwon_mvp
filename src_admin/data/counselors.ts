// ─────────────────────────────────────────────────────────────────────────
// 상담사별 데이터(JSON) 로더 + 전역 활성 상담사 스토어
// students.ts 패턴 미러: JSON import → 배열 노출 → 활성 선택자 + localStorage.
// 상담사 전환은 localStorage에 저장 후 리로드해 모든 화면에 반영한다.
// ─────────────────────────────────────────────────────────────────────────
import type { Counselor, CounselorRole } from './schema/counselor'
import { canEditRoadmap, canManageJobs, canConfirmIap, handledRequestTypes } from './schema/counselor'
import careerKim from './counselors/career_kim.json'
import careerPark from './counselors/career_park.json'
import psychLee from './counselors/psych_lee.json'
import psychHan from './counselors/psych_han.json'

const BASE_COUNSELORS: Counselor[] = [
  careerKim as Counselor,
  careerPark as Counselor,
  psychLee as Counselor,
  psychHan as Counselor,
]

const STORAGE_KEY = 'dc_active_counselor'
const OVERRIDE_KEY = 'dc_counselor_overrides'

/** 프로필 수정분(override)을 읽어 base JSON에 병합. 원본 JSON은 건드리지 않는다. */
function readOverrides(): Record<string, Partial<Counselor>> {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, Partial<Counselor>>
    }
  } catch {
    /* 폴백: override 없음 */
  }
  return {}
}

/** base JSON + localStorage override 병합 목록. 화면은 이 목록을 구독한다. */
export const COUNSELORS: Counselor[] = (() => {
  const overrides = readOverrides()
  return BASE_COUNSELORS.map(c => ({ ...c, ...overrides[c.id] }))
})()

export function getActiveCounselorId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || COUNSELORS[0].id
  } catch {
    return COUNSELORS[0].id
  }
}

/** 로그인 여부 — 활성 상담사가 명시적으로 선택(저장)된 적이 있는지 */
export function hasActiveSession(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) != null
  } catch {
    return false
  }
}

/** 로그아웃 — 활성 상담사 해제 후 리로드 */
export function clearActiveCounselor(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  window.location.reload()
}

export function getActiveCounselor(): Counselor {
  const id = getActiveCounselorId()
  return COUNSELORS.find(c => c.id === id) ?? COUNSELORS[0]
}

export function setActiveCounselor(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
  window.location.reload()
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

/**
 * 활성 상담사 프로필 수정분을 저장한다(설정 > 내 프로필).
 * 원본 JSON은 유지하고 override 레이어만 갱신 후 리로드해 전 화면에 반영한다.
 */
export function updateCounselorProfile(id: string, patch: Partial<Counselor>): void {
  try {
    const overrides = readOverrides()
    overrides[id] = { ...overrides[id], ...patch }
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides))
  } catch {
    /* 데모 범위 — 저장 실패 무시 */
  }
  window.location.reload()
}

// 역할 권한 헬퍼 재노출 (화면이 스키마를 직접 import하지 않아도 되게)
export { canEditRoadmap, canManageJobs, canConfirmIap, handledRequestTypes }
export type { Counselor, CounselorRole }
