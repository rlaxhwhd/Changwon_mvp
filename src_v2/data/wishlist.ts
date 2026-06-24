// ─────────────────────────────────────────────────────────────────────────
// 비교과 프로그램 찜(관심) 목록 — localStorage 단일 소스
// 목록 화면(ProgramApply)과 상세 화면(ProgramDetail)이 같은 저장소를 공유해
// 어느 화면에서 찜해도 즉시 반영·유지된다.
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'dc_program_wishlist'

export function getWishlist(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is number => typeof v === 'number') : []
  } catch {
    return []
  }
}

export function isWished(id: number): boolean {
  return getWishlist().includes(id)
}

/** 찜 토글 후 새 목록을 반환 */
export function toggleWish(id: number): number[] {
  const current = getWishlist()
  const next = current.includes(id) ? current.filter(v => v !== id) : [...current, id]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}
