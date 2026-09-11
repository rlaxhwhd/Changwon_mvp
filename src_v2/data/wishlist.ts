// ─────────────────────────────────────────────────────────────────────────
// 비교과 프로그램 찜 — 정본은 서버다(dc.program_wishlist).
//
// 예전 localStorage 키(dc_program_wishlist)에는 **학생 ID 가 아예 없어서** 계정을
// 바꿔도 같은 찜이 보였다. 소유자가 없는 그 목록은 이관하지 않았다 —
// 정당한 소유자가 존재하지 않기 때문이다(채용 job_wishlist 와 같은 판정).
//
// 토글이 아니라 원하는 상태를 명시로 보낸다. 같은 상태 재전송은 새 이력을 만들지 않는다.
// ─────────────────────────────────────────────────────────────────────────
import { setWish, wishedProgramIds } from '../../shared/growthStore'

export function getWishlist(): string[] {
  return wishedProgramIds()
}

export function isWished(id: string): boolean {
  return wishedProgramIds().includes(id)
}

/** 찜 상태를 뒤집는다. 서버 반영 후 스토어가 다시 읽는다. */
export function toggleWish(id: string): Promise<void> {
  return setWish(id, !isWished(id))
}

export { setWish }
