// ─────────────────────────────────────────────────────────────────────────
// 학생 상담 신청 writer (단일 접근 모듈 — 쓰기)
// 학생이 낸 상담 신청을 "그 학생의 데이터"에 append 한다(학생 JSON = 단일 원천).
//  · 원천/스토어: src_v2/data/students 의 addCounselRequest (dc_counsel_owners override)
//  · 상담사 포털은 이 스토어를 투영해 읽는다 — cross-SPA 로직 import 없음(데이터로만 공유).
//  · 학생이 고른 상담사(assignedCounselorId)·시간(slot)을 그대로 기록한다 → 그 상담사
//    캘린더/접수함에 '대기'(예약신청)로 바로 뜨고, 상담사가 확정하면 확정으로 전이된다.
// 화면(CareerCounsel/PsychCounsel)은 submitCounselRequest 만 호출한다. localStorage 직접 접근 금지.
// ─────────────────────────────────────────────────────────────────────────
import { api } from '../../shared/api'
import { storeCounselRequest, type StoredCounselRequest } from '../../shared/counselStore'
import type { CounselMethod, CounselRequestType } from './students'
import type { CounselIntakeAnswer } from './counselIntake'
import type { CareTrack } from './counselTrack'

export interface SubmitCounselInput {
  /** 상담 유형 — 호출 페이지가 지정 (CareerCounsel → 진로취업 / PsychCounsel → 심리) */
  type: CounselRequestType
  /** 진로취업 상담의 트랙. 심리 상담은 넘기지 않는다(트랙 축이 없는 상담이다). */
  careTrack?: CareTrack
  /** 상담 목적 (CounselReserveModal 입력값) */
  purpose: string
  topicCode?: string
  /** 학생이 고른 상담사 id (counselors 단일소스 Counselor.id) — 그 상담사에게 배정된다. */
  counselorId: string
  /** 학생이 고른 희망일 ISO (YYYY-MM-DD, Day.iso) — slot.date */
  slotDate: string
  /** 학생이 고른 희망시각 (HH:mm) — slot.start */
  time: string
  /** 대면 장소 (slot.place) */
  place?: string
  /** 신청 단계 문진표 답변. 템플릿이 있는 유형만 채워진다(현재 진로취업). */
  intake?: CounselIntakeAnswer[]
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
const pendingKeys = new Map<string, string>()
async function createRequest(body: object): Promise<void> {
  const payload = JSON.stringify(body)
  const key = pendingKeys.get(payload) ?? crypto.randomUUID()
  pendingKeys.set(payload, key)
  const saved = await api<StoredCounselRequest>('/counsel-requests', {
    method: 'POST', headers: { 'Idempotency-Key': key }, body: payload,
  })
  pendingKeys.delete(payload)
  storeCounselRequest(saved)
  const { loadPublicSlots } = await import('../../shared/counselOperationsStore')
  await loadPublicSlots()
}

export async function submitCounselRequest(input: SubmitCounselInput): Promise<void> {
  await createRequest({
    type: input.type, careTrack: input.careTrack, method: '대면', topic: input.purpose, topicCode: input.topicCode,
    assignedCounselorId: input.counselorId,
    slot: { date: input.slotDate, start: input.time, end: oneHourLater(input.time), place: input.place ?? '' },
    intake: input.intake ?? [],
  })
}

export async function submitProfessorCounselRequest(input: SubmitProfCounselInput): Promise<void> {
  await createRequest({
    type: '교수', typeCode: 'PROF', method: input.method, topic: input.topic,
    assignedProfessorId: input.professorId,
    slot: input.slotDate && input.time
      ? { date: input.slotDate, start: input.time, end: oneHourLater(input.time), place: input.place ?? '' }
      : null,
  })
}
