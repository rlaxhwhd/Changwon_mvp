// ─────────────────────────────────────────────────────────────────────────
// 활성 교직원 세션 프리미티브 (leaf 모듈 — 데이터 import 없음).
// 상담사/교수/조교 어떤 역할이든 활성 사용자 id 하나만 localStorage에 둔다.
// staff.ts·counselors.ts가 이 원자 함수 위에서 각자 사용자 객체로 해석한다.
// (데이터 import가 없어야 counselors.ts ↔ staff.ts 순환을 피한다)
// ─────────────────────────────────────────────────────────────────────────

/** 활성 교직원 id 저장 키. 역할 무관(상담사·교수·조교 공용). */
const STORAGE_KEY = 'dc_active_staff'

/** 저장된 활성 사용자 id (없으면 null). 해석은 호출부(staff/counselors)가 한다. */
export function getActiveIdRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/** 로그인 여부 — 활성 사용자가 명시적으로 선택(저장)된 적이 있는지 */
export function hasActiveSession(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) != null
  } catch {
    return false
  }
}

/** 활성 사용자 설정 후 리로드 — 모든 화면에 반영 */
export function setActiveId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
  window.location.reload()
}

/** 로그아웃 — 활성 사용자 해제 후 로그인 화면으로.
 *  리로드가 아니라 이동인 이유: 로그인 게이트를 열어 둔 상태(App.tsx RequireLogin)라
 *  제자리에서 새로고침하면 기본 사용자로 같은 화면이 다시 떠 로그아웃이 없던 일이 된다.
 *  경로에 basename 을 붙여 쓴다 — 이 SPA 는 /admin 아래에서만 산다. */
export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  window.location.assign('/admin/login')
}
