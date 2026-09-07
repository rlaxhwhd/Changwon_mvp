// ─────────────────────────────────────────────────────────────────────────
// 로드맵 변경 요청 스키마 (단일 소스)
// Counsel_README §7: 학생이 로드맵 변경을 원하면 'dc_roadmap_requests' 에 쓰고,
// 진로상담사가 변경 요청함에서 접수해 편집기로 반영한다.
// ─────────────────────────────────────────────────────────────────────────
import type { RoadmapAxis } from '../../../src_v2/data/schema/roadmap'

/** 요청 처리 상태 */
export type RoadmapRequestStatus = '대기' | '반영완료' | '반려'

export interface RoadmapChangeRequest {
  id: string
  /** 대상 학생 id (StudentData.id) */
  studentId: string
  /** 신청 시점 학번 스냅샷 — 동명이인을 목록에서 가르는 유일한 값이다(CLAUDE.md 2조). */
  studentNo: string
  studentName: string
  studentMajor: string
  /** 변경을 원하는 축(IAP 실행·핵심역량 수행·내 성장 활동). 전반이면 생략 가능. */
  axis?: RoadmapAxis
  /** 요청 제목 (예: "인턴 목표를 하반기로 조정 요청") */
  title: string
  /** 학생이 남긴 상세 사유 */
  reason: string
  status: RoadmapRequestStatus
  /** 신청 일시 (ISO 8601) */
  requestedAt: string
  /** 처리 일시 (ISO 8601, 처리 후) */
  handledAt?: string
}
