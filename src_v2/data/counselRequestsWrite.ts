// ─────────────────────────────────────────────────────────────────────────
// 학생 상담 신청 writer (단일 접근 모듈 — 쓰기)
// 학생이 낸 상담 신청을 "그 학생의 데이터"에 append 한다(학생 JSON = 단일 원천).
//  · 원천/스토어: src_v2/data/students 의 addCounselRequest (dc_counsel_owners override)
//  · 상담사 포털은 이 스토어를 투영해 읽는다 — cross-SPA 로직 import 없음(데이터로만 공유).
//  · 배정(assignedCounselorId)은 여기서 넣지 않는다 — 투영단계(상담사 포털)에서 유형별 파생.
// 화면(CareerCounsel/PsychCounsel)은 submitCounselRequest 만 호출한다. localStorage 직접 접근 금지.
// ─────────────────────────────────────────────────────────────────────────
import { addCounselRequest, getActiveStudent } from './students'
import type { CounselRequestType } from './students'

export interface SubmitCounselInput {
  /** 상담 유형 — 호출 페이지가 지정 (CareerCounsel → 진로취업 / PsychCounsel → 심리) */
  type: CounselRequestType
  /** 상담 목적 (CounselReserveModal 입력값) */
  purpose: string
  /** 학생이 화면에서 고른 상담사 표시명 (topic 스냅샷용) */
  counselorName: string
  /** 학생이 화면에서 고른 희망일 (표시 문자열, topic 스냅샷용) */
  date: string
  /** 학생이 화면에서 고른 희망시각 (topic 스냅샷용) */
  time: string
}

/**
 * 학생 상담 신청을 조립해 활성 학생 레코드에 append 한다.
 * 학생 스냅샷은 getActiveStudent()에서만 취득하고, id·신청시각은 런타임 생성한다.
 * 배정은 미지정으로 둔다(상담사 포털 투영에서 유형별 기본배정 파생).
 */
export function submitCounselRequest(input: SubmitCounselInput): void {
  const student = getActiveStudent()
  const topic = `${input.purpose} (희망: ${input.counselorName} · ${input.date} ${input.time})`

  addCounselRequest(student.id, {
    id: `req_${Date.now()}`,
    type: input.type,
    status: '대기',
    method: '대면',
    topic,
    requestedAt: new Date().toISOString(),
  })
}
