// ─────────────────────────────────────────────────────────────────────────
// 관심공고(찜) — 정본은 서버(dc.job_wishlist)다.
//
// 예전에는 localStorage 문자열 배열 하나였다. 그 배열에는 **학생 ID 가 없어서**
// 계정을 바꾸면 남의 찜이 그대로 보였다. 이제 소유자는 서버가 판정한다 —
// 그래서 기존 배열은 정당한 소유자를 알 수 없어 수입하지 않는다.
//
// 읽기는 부팅 때 적재한 스토어에서 동기로 꺼내고(SPEC.md §5), 저장·해제는 async 다.
// 토글이 아니라 원하는 상태를 명시한다 — 연타해도 같은 결과가 된다.
// ─────────────────────────────────────────────────────────────────────────
import { api } from '../../shared/api'
import { loadWishlist, setWishlist, wishlistIds } from '../../shared/jobStore'

export function getJobWishlist(): string[] {
  return wishlistIds()
}

export function isJobWished(id: string): boolean {
  return getJobWishlist().includes(id)
}

/** 저장/해제를 명시한다. 성공하면 새 목록을 돌려준다. */
export async function setJobWish(id: string, saved: boolean): Promise<string[]> {
  await api(`/job-wishlist/${encodeURIComponent(id)}`, { method: saved ? 'PUT' : 'DELETE' })
  const next = saved
    ? [...getJobWishlist().filter(v => v !== id), id]
    : getJobWishlist().filter(v => v !== id)
  setWishlist(next)
  return next
}

/** 현재 상태의 반대로 바꾼다 — 화면의 별 아이콘 한 번 누르기. */
export async function toggleJobWish(id: string): Promise<string[]> {
  return setJobWish(id, !isJobWished(id))
}

export { loadWishlist }
export { JOB_EVENT } from '../../shared/jobStore'
