// ─────────────────────────────────────────────────────────────────────────
// 상담 기록지 / 완료 코멘트 스키마 (단일 소스)
// Counsel_README §7: 상담 완료·코멘트는 localStorage 'dc_counsel_records' 키로
// 저장되며, 학생 화면 '상담 현황'(/counsel/record)과 공유될 데이터다.
// 상담사가 상담 진행 화면에서 기록지를 작성·저장하면 완료 처리된다.
// ─────────────────────────────────────────────────────────────────────────
import type { CounselRequestType, CounselMethod } from './counselRequest'

/** 상담 진행 상태 — 기록지 자체의 저장 단계 */
export type RecordStatus = '작성중' | '완료'

export interface CounselRecord {
  /** 기록 id */
  id: string
  /** 연결된 상담 신청 id (CounselRequest.id) */
  requestId: string
  /** 학생 id (src_v2/data/students 의 StudentData.id 와 연결) */
  studentId: string
  /** 표시용 학생 이름 스냅샷 */
  studentName: string
  /** 표시용 학생 학과 스냅샷 */
  studentMajor: string
  /** 상담 유형 (진로취업/심리) */
  type: CounselRequestType
  /** 상담 방식 (대면/비대면) */
  method: CounselMethod
  /** 상담 주제 */
  topic: string
  /** 상담 진행 일자 YYYY-MM-DD */
  date: string
  /** 담당 상담사 id (Counselor.id) */
  counselorId: string
  /** 담당 상담사 이름 스냅샷 */
  counselorName: string
  /** 상담 소견 (본문 기록) */
  summary: string
  /** 학생에게 공개되는 코멘트 (학생 상담 현황에 노출) */
  comment: string
  /** 다음 상담 권고/후속 조치 (선택) */
  followUp?: string
  status: RecordStatus
  /** 최초 작성 일시 ISO */
  createdAt: string
  /** 마지막 수정 일시 ISO */
  updatedAt: string
}
