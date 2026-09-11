// ─────────────────────────────────────────────────────────────────────────
// 로드맵 변경 요청 로더 — 정본은 서버다(dc.roadmap_request).
//
// 예전에는 목록을 통째로 localStorage(dc_roadmap_requests)에 저장하고, 클라이언트가
// 학생 정보·ID·처리 시각까지 만들었다. 그래서
//   · 상태가 화면(대기/반영완료/반려)과 DB(REQ/APPROVED)로 갈렸고,
//   · 「반영완료」 버튼이 실제 수정과 결합되지 않아 무엇이 반영됐는지 알 수 없었다.
// 지금 반영은 계획 편집 트랜잭션 안에서만 일어나고 그 사건이 요청에 연결된다.
//
// 목록·카운트는 서버가 준다(CLAUDE.md 10조) — 전체를 받아 세지 않는다.
// ─────────────────────────────────────────────────────────────────────────
import {
  ROADMAP_REQUEST_STATUS_LABEL,
  createRoadmapRequest,
  loadRoadmapRequests,
  queryRoadmapRequests,
  rejectRoadmapRequests as rejectOnServer,
  roadmapRequestList,
  roadmapRequestSummary,
} from '../../shared/roadmapStore'
import type { RoadmapAxis } from '../../src_v2/data/schema/roadmap'
import type { RoadmapChangeRequest, RoadmapRequestStatus } from '../../shared/roadmapStore'

/** 적재된 변경 요청(인가된 범위). 목록 화면은 queryRoadmapRequests 로 서버 페이지를 읽는다. */
export function getRoadmapRequests(): RoadmapChangeRequest[] {
  return roadmapRequestList()
}

export function getRoadmapRequestsByStatus(status: RoadmapRequestStatus): RoadmapChangeRequest[] {
  return getRoadmapRequests().filter(request => request.status === status)
}

export function getRoadmapRequestById(id: string): RoadmapChangeRequest | undefined {
  return getRoadmapRequests().find(request => request.id === id)
}

/** 상태별 카운트 (탭 배지용). 서버 summary 를 그대로 쓴다. */
export function countRoadmapRequests(): Record<RoadmapRequestStatus, number> {
  return roadmapRequestSummary()
}

/**
 * 학생이 낸 변경 요청 — 학생 SPA 의 「로드맵 수정요청」 화면이 호출한다.
 * 학번·이름·학과 스냅샷은 서버가 확인해 붙인다. 클라이언트가 신원을 만들지 않는다.
 */
export function addRoadmapRequest(studentId: string,
                                  input: { title: string; reason: string; axis?: RoadmapAxis }): Promise<void> {
  return createRoadmapRequest(studentId, input)
}

/** 대기 → 반려 (여러 건 한 번에). 전부 반려하거나 전부 되돌린다. */
export function rejectRoadmapRequests(items: RoadmapChangeRequest[], reason = ''): Promise<void> {
  return rejectOnServer(items.map(row => ({ id: row.id, expectedVersion: row.version })), reason)
}

export function rejectRoadmapRequest(request: RoadmapChangeRequest, reason = ''): Promise<void> {
  return rejectRoadmapRequests([request], reason)
}

export { ROADMAP_REQUEST_STATUS_LABEL, loadRoadmapRequests, queryRoadmapRequests }
export type { RoadmapChangeRequest, RoadmapRequestStatus }
