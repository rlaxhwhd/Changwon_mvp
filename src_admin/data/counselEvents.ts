// ─────────────────────────────────────────────────────────────────────────────
// 상담 처리 이력 로더 — localStorage 'dc_counsel_events' (append-only)
//
// 상태 전이 함수(counselRequests.ts의 confirm/reschedule/reassign/reject/complete)가
// 전이 직후 이 스토어에 이벤트 1건을 추가한다. 화면은 getEventsByRequest로 읽는다.
// DB 전환 시 이 모듈만 이력 테이블 API로 교체한다.
//
// ⚠ 기존 이벤트를 수정·삭제하지 말 것. 이력이 곧 감사 근거다.
// ─────────────────────────────────────────────────────────────────────────────
import type { CounselEvent, CounselEventKind } from './schema/counselEvent'

const STORAGE_KEY = 'dc_counsel_events'

export function getCounselEvents(): CounselEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as CounselEvent[]
    }
  } catch {
    /* 이력 없음 */
  }
  return []
}

function persist(list: CounselEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* 데모 범위 — 저장 실패 무시 */
  }
}

/** 이벤트 1건 추가. 호출부는 상태 전이 직후에 부른다. */
export function appendCounselEvent(input: Omit<CounselEvent, 'id' | 'at'>): CounselEvent {
  const event: CounselEvent = { id: `cev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, ...input, at: new Date().toISOString() }
  persist([...getCounselEvents(), event])
  return event
}

/** 한 상담 건의 처리 이력 (오래된 순) */
export function getEventsByRequest(requestId: string): CounselEvent[] {
  return getCounselEvents()
    .filter(event => event.requestId === requestId)
    .sort((a, b) => a.at.localeCompare(b.at))
}

/** 취소 사유 — 최근 취소 이벤트 1건. 목록에서 사유 배지를 띄울 때 쓴다. */
export function getCancelReason(requestId: string): CounselEvent | undefined {
  return getEventsByRequest(requestId).filter(event => event.kind === '취소').at(-1)
}

/** 재배정 횟수 — 목록·상세의 '이관 N회' 표시용 */
export function countReassigns(requestId: string): number {
  return getEventsByRequest(requestId).filter(event => event.kind === '재배정').length
}

export type { CounselEvent, CounselEventKind }
