// ─────────────────────────────────────────────────────────────────────────
// 로드맵 변경 요청 로더 (localStorage 공유 스토어) — counselRequests.ts 패턴 미러
// Counsel_README §7: 학생 SPA 가 'dc_roadmap_requests' 에 변경 요청을 쓰고
// 진로상담사가 읽는다. localStorage 가 비어있으면 seed JSON 으로 폴백.
// ─────────────────────────────────────────────────────────────────────────
import type { RoadmapChangeRequest, RoadmapRequestStatus } from './schema/roadmapRequest'
import seed from './roadmapRequests.seed.json'

const STORAGE_KEY = 'dc_roadmap_requests'

const SEED = seed as RoadmapChangeRequest[]

/** 전체 로드맵 변경 요청. localStorage 우선, 없으면 seed 폴백. */
export function getRoadmapRequests(): RoadmapChangeRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as RoadmapChangeRequest[]
    }
  } catch {
    /* localStorage 접근 실패 시 seed 폴백 */
  }
  return SEED
}

/** 상태별 필터 */
export function getRoadmapRequestsByStatus(status: RoadmapRequestStatus): RoadmapChangeRequest[] {
  return getRoadmapRequests().filter(r => r.status === status)
}

/** id 로 1건 조회 */
export function getRoadmapRequestById(id: string): RoadmapChangeRequest | undefined {
  return getRoadmapRequests().find(r => r.id === id)
}

/** 상태별 카운트 집계 (탭 배지용) */
export function countRoadmapRequests(): Record<RoadmapRequestStatus, number> {
  const counts: Record<RoadmapRequestStatus, number> = { 대기: 0, 반영완료: 0, 반려: 0 }
  for (const r of getRoadmapRequests()) counts[r.status] += 1
  return counts
}

function persist(list: RoadmapChangeRequest[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* localStorage 접근 실패 시 무시 (데모 범위) */
  }
}

function updateRequest(id: string, patch: Partial<RoadmapChangeRequest>): void {
  const next = getRoadmapRequests().map(r => (r.id === id ? { ...r, ...patch } : r))
  persist(next)
}

/** 대기 → 반영완료 (편집기에서 override 확정 후 호출) */
export function markRoadmapRequestHandled(id: string): void {
  updateRequest(id, { status: '반영완료', handledAt: new Date().toISOString() })
}

/** 대기 → 반려 */
export function rejectRoadmapRequest(id: string): void {
  rejectRoadmapRequests([id])
}

/** 대기 → 반려 (여러 건 한 번에). 이미 처리된 건은 건드리지 않는다. */
export function rejectRoadmapRequests(ids: string[]): void {
  const target = new Set(ids)
  const handledAt = new Date().toISOString()
  persist(getRoadmapRequests().map(r =>
    target.has(r.id) && r.status === '대기' ? { ...r, status: '반려' as const, handledAt } : r,
  ))
}

export type { RoadmapChangeRequest, RoadmapRequestStatus }
