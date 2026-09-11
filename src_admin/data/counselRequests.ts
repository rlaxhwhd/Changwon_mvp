// ─────────────────────────────────────────────────────────────────────────
// 상담 신청 로더 — 원천은 서버(GET /counsel-requests)가 채운 shared/counselStore 다.
// 서버가 열람 범위(visibility)와 학생 스냅샷(학번·이름·학과·학년·유형·학적)을 함께 내려주므로
// 여기서는 그 DTO 를 CounselRequest 형태로 투영만 한다.
//  ★ 학생 owner(STUDENTS·counselSeed) 를 거치지 않는다 — 거치면 로스터 120명 중 상세 프로필이
//    없는 학생의 신청이 접수함·일지·통계에서 조용히 사라진다(2026-09-11 추가 심리상담신청에서 발견).
//  · 배정(assignedCounselorId): 미지정분은 투영 시점에 유형별 기본배정을 파생 주입
//  · 상태 전이: performCounselAction 이 서버를 부르고 스토어를 갱신한다
// 화면은 이 로더의 셀렉터만 구독하고 리터럴을 박지 않는다.
// ─────────────────────────────────────────────────────────────────────────
import type {
  CounselMethod,
  CounselRequest,
  CounselRequestStatus,
  CounselRequestType,
  CounselSlot,
} from './schema/counselRequest'
import { handledRequestTypes } from './schema/counselor'
import { getCounselorByRole } from './counselors'
import { api } from '../../shared/api'
import { loadCounselEvents } from '../../shared/communicationsStore'
import { counselRequests, loadCounselRecords, loadCounselRequests, performCounselAction } from '../../shared/counselStore'
import { getCounselOwnerById, STUDENTS } from '../../src_v2/data/students'
import type { EnrollmentStatus, StudentData } from '../../src_v2/data/students'
import { studentLiteOf } from './studentRoster'
import { STUDENT_TYPE_MAP } from '../../src_v2/data/careerProcess'
import type { StudentType, StudentTypeMeta } from '../../src_v2/data/careerProcess'

/** 접수함에 표시하는 상담 유형 — '교수'(예약)는 제외 */
const ADMIN_TYPES: CounselRequestType[] = ['진로취업', '심리']

/** 유형별 기본 담당자 — counselors 단일소스에서 파생(리터럴 없음). */
function defaultAssigneeFor(type: CounselRequestType): string | undefined {
  const role = (['career', 'psych'] as const).find(r => handledRequestTypes(r).includes(type))
  return role ? getCounselorByRole(role)?.id : undefined
}

/**
 * 전체 상담 신청을 반환 — 서버 스토어의 신청을 CounselRequest 형태로 투영한다.
 * 학생 스냅샷은 신청 행이 들고 있다(서버 dto). 배정 미지정분은 유형별 기본배정을 파생 주입.
 */
export function getCounselRequests(): CounselRequest[] {
  return counselRequests()
    .filter(r => (ADMIN_TYPES as string[]).includes(r.type))
    .map(r => {
      const type = r.type as CounselRequestType
      return {
        id: r.id,
        studentId: r.studentId,
        studentNo: r.studentNo,
        studentGrade: r.studentGrade,
        studentName: r.studentName,
        studentMajor: r.studentMajor,
        studentEnrollmentStatus: r.studentStatus ?? '재학',
        studentType: r.studentType ?? null,
        type,
        careTrack: r.careTrack,
        status: r.status,
        method: r.method,
        topic: r.topic,
        requestedAt: r.requestedAt,
        slot: r.slot,
        assignedCounselorId: r.assignedCounselorId ?? defaultAssigneeFor(type),
        intake: r.intake,
      }
    })
}

/** 특정 상담 유형(진로취업/심리)만 필터 — 상담사 역할별 접수함에 사용 */
export function getRequestsByType(type: CounselRequestType): CounselRequest[] {
  return getCounselRequests().filter(r => r.type === type)
}

/** 특정 상담사에게 배정된 신청만 (담당자 기준 접수함) */
export function getRequestsByAssignee(counselorId: string): CounselRequest[] {
  return getCounselRequests().filter(r => r.assignedCounselorId === counselorId)
}

/**
 * 상담 시드는 studentMajor 에 학년을 붙여 둔다("경영학과 3학년").
 * 목록은 학과와 학년을 다른 줄에 놓으므로 여기서 한 번만 쪼갠다 — 화면에서 정규식을 돌리지 않는다.
 * 학년이 붙어 있지 않으면 grade 는 undefined.
 */
export function splitMajorGrade(studentMajor: string): { major: string; grade?: string } {
  const matched = studentMajor.match(/^(.*?)\s*(\d+학년)\s*$/)
  return matched ? { major: matched[1], grade: matched[2] } : { major: studentMajor }
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

/**
 * 기준일 선택 규칙 — **오늘 → 가장 가까운 예정일 → 가장 최근 지난 날** 순.
 * 접수함(날짜별 목록)과 홈 대시보드가 공유한다. 날짜 추출은 호출부가 하고 규칙만 여기 둔다.
 *
 * ⚠ 이전 규칙은 "신청이 가장 많은 날"이었다. seed가 특정 날짜에 몰려 있으면 화면이 항상 그날을
 *   열어서 **새로 들어온 신청이 보이지 않았다**(학생이 신청 → 접수함에 안 뜸). 그래서 바꿨다.
 */
export function pickReferenceDate(dates: string[], today: string = currentDateKey()): string {
  const sorted = [...new Set(dates)].sort()
  if (sorted.includes(today)) return today
  return sorted.find(date => date > today) ?? sorted.at(-1) ?? today
}

/** 현황 기준일 — 접수함 기본 표시일과 동일 규칙. */
function referenceDate(requests: CounselRequest[]): string {
  return pickReferenceDate(requests.map(requestDateOf))
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

/** 일정 뷰의 한 줄 — 정시 한 칸과 그 시각에 시작하는 상담. items 가 비면 예약 없는 시간이다. */
export interface DayScheduleRow {
  time: string
  items: CounselRequest[]
}

/**
 * 하루치 시간표를 만든다. 축은 상담사 가능 시간(openHours)이 깔고, 그 밖의 시각에 잡힌
 * 예약도 제 행을 얻는다 — 일정 변경으로 가능 시간 밖에 잡힐 수 있어 빠뜨리면 안 된다.
 * 슬롯 없는 신청은 시간축에 놓을 근거가 없으므로 제외한다.
 * 화면은 이 배열만 그린다(CLAUDE.md 규칙 10).
 */
export function buildDaySchedule(
  requests: CounselRequest[],
  openHours: string[],
): DayScheduleRow[] {
  const rows = new Map<string, CounselRequest[]>()
  for (const hour of openHours) rows.set(hour, [])

  for (const request of requests) {
    if (!request.slot) continue
    const hour = `${request.slot.start.slice(0, 2)}:00`
    if (!rows.has(hour)) rows.set(hour, [])
    rows.get(hour)!.push(request)
  }

  return [...rows.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, items]) => ({
      time,
      items: [...items].sort((a, b) => a.slot!.start.localeCompare(b.slot!.start)),
    }))
}

// ── 학생 상세 프로필 (상세 보기 모달 단일 구독 소스) ──────────────────────────
// 코어 프로필은 owner 스토어(seed+override seam)에서, 유형 메타는 careerProcess 단일소스에서 파생.
// 상세학생(STUDENTS)이면 로드맵 phases 렌더용으로 detailed(StudentData)를 병합한다.
// 화면은 이 셀렉터 하나만 구독하고 seed JSON·localStorage를 직접 접근하지 않는다.

/** 상세 보기 모달이 구독하는 학생 프로필 투영 */
export interface CounselStudentProfile {
  progress?: number
  id: string
  studentNo: string
  name: string
  major: string
  grade: number
  phone: string
  enrollmentStatus: EnrollmentStatus
  studentType: StudentType | null
  /** STUDENT_TYPE_MAP[studentType] 파생 — 라벨·계층·후속진단·상담주제 (careerProcess 단일소스).
   *  진단 전 학생은 유형이 없으므로 메타도 없다. */
  typeMeta: StudentTypeMeta | null
  gpa: string
  language: string
  targetCompanySummary: string
  roadmapSummary: string
  /** AI 추천 상담 질문 (상세 화면) */
  counselorQuestions: string[]
  /** 상세학생만 — 모달 로드맵 단계(phases) 렌더용. 데모학생이면 undefined. */
  detailed?: StudentData
}

/** 학생 id로 상세 보기 모달용 프로필을 투영한다.
 *  상세 프로필(owner)이 없는 로스터 학생은 로스터 경량 행으로 채운다 — 신청이 있는데 모달이 비면 안 된다. */
export function getCounselStudentProfile(studentId: string): CounselStudentProfile | undefined {
  const owner = getCounselOwnerById(studentId)
  if (!owner) {
    const lite = studentLiteOf(studentId)
    if (!lite) return undefined
    return {
      id: studentId, studentNo: lite.studentNo, name: lite.name, major: lite.major, grade: lite.grade,
      phone: '—', enrollmentStatus: lite.status, studentType: lite.studentType,
      typeMeta: lite.studentType ? STUDENT_TYPE_MAP[lite.studentType] : null,
      gpa: '—', language: '—', targetCompanySummary: '—', roadmapSummary: '로드맵 없음', counselorQuestions: [],
    }
  }
  const detailed = STUDENTS.find(s => s.id === studentId)
  return {
    id: owner.id,
    progress: owner.progress,
    studentNo: owner.studentNo,
    name: owner.name,
    major: owner.major,
    grade: owner.grade,
    phone: owner.phone,
    enrollmentStatus: owner.enrollmentStatus,
    studentType: owner.studentType,
    typeMeta: owner.studentType ? STUDENT_TYPE_MAP[owner.studentType] : null,
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
//
// ★ 모든 전이는 처리 이력(dc_counsel_events)을 함께 남긴다.
//   현행은 최종값만 들고 있어 "누가 언제 왜 바꿨는지"가 사라진다(schema/counselEvent.ts 참조).

export async function confirmRequest(id: string, slot: CounselSlot): Promise<void> {
  await performCounselAction(id, 'confirm', { slot })
}
export async function rejectRequest(id: string, reason: string): Promise<void> {
  await performCounselAction(id, 'cancel', { reason })
}
export async function rescheduleRequest(id: string, slot: CounselSlot): Promise<void> {
  await performCounselAction(id, 'reschedule', { slot })
}
export async function completeRequest(
  id: string, record: { summary: string; comment: string; followUp?: string }, finalType?: StudentType | null,
): Promise<void> {
  await performCounselAction(id, 'complete', { ...record, followUp: record.followUp ?? '', finalType })
}
export async function reassignRequest(id: string, counselorId: string, reason?: string): Promise<void> {
  await performCounselAction(id, 'reassign', { assigneeId: counselorId, reason: reason ?? '' })
}
/** 추가 심리상담신청 — 학생 신청 없이 상담사가 남기는 심리상담 기록. 서버가 신청(완료)+기록을 한 트랜잭션으로 만든다(교수 발의 기록과 같은 방식). */
export async function addPsychCounselRecord(
  input: { studentId: string; topic: string; method: CounselMethod; date: string; summary: string },
): Promise<void> {
  await api('/counsel-records/psych', {
    method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(input),
  })
  await Promise.all([loadCounselRequests(), loadCounselRecords(), loadCounselEvents()])
}

export type {
  CounselRequest,
  CounselRequestStatus,
  CounselRequestType,
  CounselSlot,
}
