// ─────────────────────────────────────────────────────────────────────────
// 관심공고(찜) — localStorage 단일 소스
//
// 목록(JobBoard 의 별)과 상세(JobDetailView 의 「관심공고 저장」)가 같은 저장소를 본다.
// 어느 쪽에서 저장해도 다른 쪽에 즉시 반영되고 새로고침해도 남는다.
// 비교과 찜(data/wishlist.ts)과 같은 패턴이되 키가 다르다 — 공고와 프로그램은 다른 목록이다.
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'dc_job_wishlist'

export function getJobWishlist(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

export function isJobWished(id: string): boolean {
  return getJobWishlist().includes(id)
}

/** 찜 토글 후 새 목록을 반환 */
export function toggleJobWish(id: string): string[] {
  const current = getJobWishlist()
  const next = current.includes(id) ? current.filter(v => v !== id) : [...current, id]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* 저장 실패는 화면을 막지 않는다 — 이번 세션에서만 유지된다 */
  }
  return next
}
