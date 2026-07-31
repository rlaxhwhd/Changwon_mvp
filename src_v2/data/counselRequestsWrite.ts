// ─────────────────────────────────────────────────────────────────────────
// 학생 상담 신청 writer (단일 접근 모듈 — 쓰기)
// 학생이 낸 상담 신청을 "그 학생의 데이터"에 append 한다(학생 JSON = 단일 원천).
//  · 원천/스토어: src_v2/data/students 의 addCounselRequest (dc_counsel_owners override)
//  · 상담사 포털은 이 스토어를 투영해 읽는다 — cross-SPA 로직 import 없음(데이터로만 공유).
//  · 학생이 고른 상담사(assignedCounselorId)·시간(slot)을 그대로 기록한다 → 그 상담사
//    캘린더/접수함에 '대기'(예약신청)로 바로 뜨고, 상담사가 확정하면 확정으로 전이된다.
// 화면(CareerCounsel/PsychCounsel)은 submitCounselRequest 만 호출한다. localStorage 직접 접근 금지.
// ─────────────────────────────────────────────────────────────────────────
import { addCounselRequest, getActiveStudent } from './students'
import type { CounselMethod, CounselRequestType } from './students'

export interface SubmitCounselInput {
  /** 상담 유형 — 호출 페이지가 지정 (CareerCounsel → 진로취업 / PsychCounsel → 심리) */
  type: CounselRequestType
  /** 상담 목적 (CounselReserveModal 입력값) */
  purpose: string
  /** 학생이 고른 상담사 id (counselors 단일소스 Counselor.id) — 그 상담사에게 배정된다. */
  counselorId: string
  /** 학생이 고른 희망일 ISO (YYYY-MM-DD, Day.iso) — slot.date */
  slotDate: string
  /** 학생이 고른 희망시각 (HH:mm) — slot.start */
  time: string
  /** 대면 장소 (slot.place) */
  place?: string
}

export interface SubmitProfCounselInput {
  /** 학생이 선택한 교수 id. */
  professorId: string
  /** 온라인 상담 내용 또는 오프라인 예약 목적. */
  topic: string
  /** 온라인은 비대면, 오프라인은 대면으로 기록한다. */
  method: CounselMethod
  /** 오프라인 희망일(YYYY-MM-DD)이다. */
  slotDate?: string
  /** 오프라인 희망 시각(HH:mm)이다. */
  time?: string
  /** 오프라인 연구실 또는 비대면 안내 장소다. */
  place?: string
}

/** 'HH:mm' → 1시간 뒤 'HH:mm' (상담 슬롯은 1시간 단위). */
function oneHourLater(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h)) return hhmm
  return `${String((h + 1) % 24).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`
}

/**
 * 학생 상담 신청을 조립해 활성 학생 레코드에 append 한다.
 * 학생이 고른 상담사(assignedCounselorId)와 슬롯(slot)을 그대로 기록해, 그 상담사
 * 캘린더·접수함에 '대기'(예약신청)로 노출되게 한다. 확정은 상담사가 수행한다.
 */
export function submitCounselRequest(input: SubmitCounselInput): void {
  const student = getActiveStudent()

  addCounselRequest(student.id, {
    id: `req_${Date.now()}`,
    type: input.type,
    status: '대기',
    method: '대면',
    topic: input.purpose,
    requestedAt: new Date().toISOString(),
    assignedCounselorId: input.counselorId,
    slot: input.slotDate
      ? { date: input.slotDate, start: input.time, end: oneHourLater(input.time), place: input.place }
      : undefined,
  })
}

/** 활성 학생 owner 스토어에 교수상담 신청을 append한다. */
export function submitProfessorCounselRequest(input: SubmitProfCounselInput): void {
  const student = getActiveStudent()
  addCounselRequest(student.id, {
    id: `preq_${Date.now()}`,
    type: '교수',
    professorId: input.professorId,
    status: '대기',
    method: input.method,
    topic: input.topic,
    requestedAt: new Date().toISOString(),
    slot: input.slotDate && input.time
      ? { date: input.slotDate, start: input.time, end: oneHourLater(input.time), place: input.place }
      : undefined,
  })
}
