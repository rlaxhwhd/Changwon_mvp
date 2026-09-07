// ─────────────────────────────────────────────────────────────────────────
// 상담 신청/예약/기록 스키마 (단일 소스)
// 학생이 신청한 상담 요청을 상담사가 접수·확정·완료한다.
// ─────────────────────────────────────────────────────────────────────────

// 학적 상태는 학생 JSON(students.ts)이 단일 원천 — 타입만 데이터 seam 채널로 재사용.
import type { EnrollmentStatus, StudentTrack } from '../../../src_v2/data/students'
// 6유형(T1~T6)은 careerProcess 가 단일 원천.
import type { StudentType } from '../../../src_v2/data/careerProcess'
import type { CounselIntakeAnswer } from '../../../src_v2/data/counselIntake'

/** 상담 유형 — 진로취업상담사는 '진로취업', 심리상담사는 '심리' 접수 */
export type CounselRequestType = '진로취업' | '심리'

/** 상담 신청 상태 */
export type CounselRequestStatus = '대기' | '확정' | '완료' | '취소'

/** 상담 방식 */
export type CounselMethod = '대면' | '비대면'

export interface CounselRequest {
  id: string
  /** 신청 학생 id (src_v2/data/students 의 StudentData.id 와 연결) */
  studentId: string
  /** 학번 (표시용) — owner.studentNo 투영 */
  studentNo: string
  /** 신청 시점 학생 이름 스냅샷 (표시용) */
  studentName: string
  /** 신청 시점 학생 학과 스냅샷 (표시용) */
  studentMajor: string
  /** 신청 시점 학적 상태 스냅샷 (목록 배지용) — owner에서 투영 */
  studentEnrollmentStatus: EnrollmentStatus
  /** 역량 점수 기반 위험 단계 트랙 (학년 보정) — owner에서 투영 */
  studentTrack: StudentTrack
  /** 신청 시점 6유형 스냅샷 (목록 배지용) — owner에서 투영. 표시명은 typeLabel()로 파생. */
  /** 진단 전 학생은 유형이 없다(null) — typeLabel()이 「유형 미정」으로 표시한다. */
  studentType: StudentType | null
  type: CounselRequestType
  status: CounselRequestStatus
  method: CounselMethod
  /** 신청 사유/주제 */
  topic: string
  /** 신청 일시 (ISO 8601) */
  requestedAt: string
  /** 확정된 상담 슬롯 (확정/완료 시). 대기/취소면 미정. */
  slot?: CounselSlot
  /** 담당 상담사 id (counselors.ts 의 Counselor.id). 재배정으로 변경 가능. */
  assignedCounselorId?: string
  /** 신청 단계 문진표 답변 (학생이 낸 그대로). 템플릿이 없는 유형은 비어 있다. */
  intake?: CounselIntakeAnswer[]
}

/** 확정된 상담 시간 슬롯 */
export interface CounselSlot {
  /** 날짜 YYYY-MM-DD */
  date: string
  /** 시작 시각 HH:mm */
  start: string
  /** 종료 시각 HH:mm */
  end: string
  /** 장소 (대면) 또는 링크 안내 (비대면) */
  place?: string
}
