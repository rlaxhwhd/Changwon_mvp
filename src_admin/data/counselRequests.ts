// ─────────────────────────────────────────────────────────────────────────
// 상담 신청 로더 (학생 스토어 투영 — 읽기 전용 소스)
// 원천 = 학생 레코드에 내장된 상담신청(src_v2/data/students 의 CounselOwner 스토어).
// 이 모듈은 그 스토어를 기존 CounselRequest 형태로 투영해 상담사 화면에 공급한다.
//  · 소스: getCounselOwners() (seed 불변 + dc_counsel_owners override — 단일 DB 스왑 seam)
//  · 배정(assignedCounselorId): 학생측 미지정분은 투영 시점에 유형별 기본배정을 파생 주입
//  · 상태 전이: patchCounselRequest(students.ts)로 소유 owner override를 갱신
// 화면은 이 로더의 셀렉터만 구독하고 리터럴을 박지 않는다.
// ─────────────────────────────────────────────────────────────────────────
import type {
  CounselRequest,
  CounselRequestStatus,
  CounselRequestType,
  CounselSlot,
} from './schema/counselRequest'
import { handledRequestTypes } from './schema/counselor'
import { getCounselorByRole } from './counselors'
import {
  getCounselOwners,
  getCounselOwnerById,
  patchCounselRequest,
  getStudentTrack,
  STUDENTS,
} from '../../src_v2/data/students'
import type { EnrollmentStatus, StudentData } from '../../src_v2/data/students'
import { STUDENT_TYPE_MAP } from '../../src_v2/data/careerProcess'
import type { StudentType, IapMapping } from '../../src_v2/data/careerProcess'

/** 접수함에 표시하는 상담 유형 — '교수'(예약)는 제외 */
const ADMIN_TYPES: CounselRequestType[] = ['진로취업', '심리']

/** 유형별 기본 담당자 — counselors 단일소스에서 파생(리터럴 없음). */
function defaultAssigneeFor(type: CounselRequestType): string | undefined {
  const role = (['career', 'psych'] as const).find(r => handledRequestTypes(r).includes(type))
  return role ? getCounselorByRole(role)?.id : undefined
}

/**
 * 전체 상담 신청을 반환. 학생 owner의 상담신청을 평탄화 + 학생 id/name/major JOIN 후
 * 기존 CounselRequest 형태로 투영한다. 배정 미지정분은 유형별 기본배정을 파생 주입.
 */
export function getCounselRequests(): CounselRequest[] {
  return getCounselOwners().flatMap(owner =>
    owner.counselRequests
      .filter(r => (ADMIN_TYPES as string[]).includes(r.type))
      .map(r => {
        const type = r.type as CounselRequestType
        return {
          id: r.id,
          studentId: owner.id,
          studentNo: owner.studentNo,
          studentName: owner.name,
          studentMajor: owner.major,
          studentEnrollmentStatus: owner.enrollmentStatus,
          studentTrack: getStudentTrack(owner.competencyScore, owner.grade),
          type,
          status: r.status,
          method: r.method,
          topic: r.topic,
          requestedAt: r.requestedAt,
          slot: r.slot,
          assignedCounselorId: r.assignedCounselorId ?? defaultAssigneeFor(type),
        }
      }),
  )
}

/** 특정 상담 유형(진로취업/심리)만 필터 — 상담사 역할별 접수함에 사용 */
export function getRequestsByType(type: CounselRequestType): CounselRequest[] {
  return getCounselRequests().filter(r => r.type === type)
}

/** 특정 상담사에게 배정된 신청만 (담당자 기준 접수함) */
export function getRequestsByAssignee(counselorId: string): CounselRequest[] {
  return getCounselRequests().filter(r => r.assignedCounselorId === counselorId)
}

/** 신청 시각을 현재 시각 기준의 상대 시간으로 표시한다. */
export function formatRelativeTime(requestedAt: string): string {
  const requestedTime = new Date(requestedAt).getTime()
  if (Number.isNaN(requestedTime)) return requestedAt

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - requestedTime) / 60_000))
  if (elapsedMinutes < 60) return `${elapsedMinutes}분 전`

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `${elapsedHours}시간 전`

  return `${Math.floor(elapsedHours / 24)}일 전`
}

function currentDateKey(): string {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const date = String(today.getDate()).padStart(2, '0')
  return `${today.getFullYear()}-${month}-${date}`
}

/** 신청의 대표 날짜 — 확정 슬롯이 있으면 그 날짜, 없으면 신청 일시의 날짜. */
function requestDateOf(request: CounselRequest): string {
  return request.slot?.date ?? request.requestedAt.slice(0, 10)
}

/** 현황 기준일 — 신청이 가장 많은 날(리스트 기본 표시일과 동일 규칙). 없으면 오늘. */
function referenceDate(requests: CounselRequest[]): string {
  const frequency = new Map<string, number>()
  requests.forEach(request => {
    const key = requestDateOf(request)
    frequency.set(key, (frequency.get(key) ?? 0) + 1)
  })
  return [...frequency.entries()].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0]?.[0] ?? currentDateKey()
}

/** 담당 상담사의 오늘 상담 현황을 반환한다(기준일 = 최다 신청일 = 리스트 기본 표시일). */
export function getTodaySummary(counselorId: string, today?: string) {
  const requests = getRequestsByAssignee(counselorId)
  const refDate = today ?? referenceDate(requests)
  return {
    total: requests.filter(request => requestDateOf(request) === refDate).length,
    todaySessions: requests.filter(request =>
      request.slot?.date === refDate && (request.status === '확정' || request.status === '완료'),
    ).length,
    completed: requests.filter(request => request.status === '완료').length,
    cancelled: requests.filter(request => request.status === '취소').length,
  }
}

/** 담당 상담사의 대기 중인 상담 신청 수를 반환한다. */
export function countPendingByAssignee(counselorId: string): number {
  return getRequestsByAssignee(counselorId).filter(request => request.status === '대기').length
}

/** 유형 + 상태로 필터 */
export function getRequestsByStatus(
  type: CounselRequestType,
  status: CounselRequestStatus,
): CounselRequest[] {
  return getRequestsByType(type).filter(r => r.status === status)
}

/** 유형별 상태 카운트 집계 (홈 대시보드 위젯용) */
export function countByStatus(
  type: CounselRequestType,
): Record<CounselRequestStatus, number> {
  const counts: Record<CounselRequestStatus, number> = {
    대기: 0,
    확정: 0,
    완료: 0,
    취소: 0,
  }
  for (const r of getRequestsByType(type)) counts[r.status] += 1
  return counts
}

/** id로 신청 1건 조회 */
export function getRequestById(id: string): CounselRequest | undefined {
  return getCounselRequests().find(r => r.id === id)
}

// ── 학생 상세 프로필 (상세 보기 모달 단일 구독 소스) ──────────────────────────
// 코어 프로필은 owner 스토어(seed+override seam)에서, IAP는 careerProcess 단일소스에서 파생.
// 상세학생(STUDENTS)이면 로드맵 phases 렌더용으로 detailed(StudentData)를 병합한다.
// 화면은 이 셀렉터 하나만 구독하고 seed JSON·localStorage를 직접 접근하지 않는다.

/** 상세 보기 모달이 구독하는 학생 프로필 투영 */
export interface CounselStudentProfile {
  id: string
  studentNo: string
  name: string
  major: string
  grade: number
  phone: string
  enrollmentStatus: EnrollmentStatus
  studentType: StudentType
  /** STUDENT_TYPE_MAP[studentType] 파생 (careerProcess 단일소스) */
  iap: IapMapping
  gpa: string
  language: string
  targetCompanySummary: string
  roadmapSummary: string
  /** AI 추천 상담 질문 (상세 화면) */
  counselorQuestions: string[]
  /** 상세학생만 — 모달 로드맵 단계(phases) 렌더용. 데모학생이면 undefined. */
  detailed?: StudentData
}

/** 학생 id로 상세 보기 모달용 프로필을 투영한다. owner 없으면 undefined. */
export function getCounselStudentProfile(studentId: string): CounselStudentProfile | undefined {
  const owner = getCounselOwnerById(studentId)
  if (!owner) return undefined
  const detailed = STUDENTS.find(s => s.id === studentId)
  return {
    id: owner.id,
    studentNo: owner.studentNo,
    name: owner.name,
    major: owner.major,
    grade: owner.grade,
    phone: owner.phone,
    enrollmentStatus: owner.enrollmentStatus,
    studentType: owner.studentType,
    iap: STUDENT_TYPE_MAP[owner.studentType],
    gpa: owner.gpa,
    language: owner.language,
    targetCompanySummary: owner.targetCompanySummary,
    roadmapSummary: owner.roadmapSummary,
    counselorQuestions: owner.counselorQuestions,
    detailed,
  }
}

// ── 쓰기 (상태 전이) ───────────────────────────────────────────────────────
// 소속 학생 owner의 override를 patchCounselRequest로 갱신한다(dc_counsel_owners).
// 화면은 전이 후 reload로 반영한다(현행 동작 유지).

/** 대기 → 확정: 슬롯을 배정하고 상태를 확정으로 전이 */
export function confirmRequest(id: string, slot: CounselSlot): void {
  patchCounselRequest(id, { status: '확정', slot })
}

/** 대기 → 취소: 거절 처리 */
export function rejectRequest(id: string): void {
  patchCounselRequest(id, { status: '취소' })
}

/** 확정 건의 일정(슬롯) 변경 */
export function rescheduleRequest(id: string, slot: CounselSlot): void {
  patchCounselRequest(id, { status: '확정', slot })
}

/** 확정 → 완료: 상담 진행 완료 처리 */
export function completeRequest(id: string): void {
  patchCounselRequest(id, { status: '완료', completedAt: new Date().toISOString() })
}

/** 담당 상담사 재배정 — 상태·슬롯은 유지하고 담당자만 변경 */
export function reassignRequest(id: string, counselorId: string): void {
  patchCounselRequest(id, { assignedCounselorId: counselorId })
}

export type {
  CounselRequest,
  CounselRequestStatus,
  CounselRequestType,
  CounselSlot,
}
