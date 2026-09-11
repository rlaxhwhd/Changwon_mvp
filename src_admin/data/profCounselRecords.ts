// ─────────────────────────────────────────────────────────────────────────────
// 전담교수 상담기록 로더 — 정본은 서버(dc.counsel_request type=PROF + dc.counsel_record).
// 교수가 신청 없이 남기는 기록은 서버가 신청(DONE)+기록을 한 트랜잭션으로 만든다(0003 D3,
// 현행 CON_PROF_INFO 1행 구조 계승). 독려는 기록이 아니라 알림(dc.notification)이다.
// 읽기는 부팅 때 적재된 상담기록 스토어(shared/counselStore)를 교수상담만 투영한다.
// ─────────────────────────────────────────────────────────────────────────────
import { counselRecords, loadCounselRecords } from '../../shared/counselStore'
import { api } from '../../shared/api'
import { getActiveAssignByStudent } from './advisorAssigns'
import { getFullRoster } from './studentRoster'
import type { EnrollStatus } from './studentRoster'
import { collegeOf } from './departments'
import { PROFESSOR_GROUPS } from '../../src_v2/data/professors'
import { mockLatency, paginate } from './query'
import type { ListParams, Paginated } from './query'
import type {
  AdvisorNudge,
  ProfCounselCategoryCode,
  ProfCounselRecord,
} from './schema/profCounselRecord'
import type { CounselMethod } from './schema/counselRequest'

/** 서버 상담기록 DTO 에 교수상담 라운드가 더한 필드. */
interface ProfRecordDto {
  id: string; requestId: string; studentId: string; studentName: string; studentMajor: string
  studentNo?: string; studentGrade?: number; type: string; method: CounselMethod; date: string
  counselorId: string; counselorName: string; summary: string; createdAt: string
  categoryCode?: string | null; origin?: string
}

function toProfRecord(r: ProfRecordDto): ProfCounselRecord {
  return {
    id: r.id,
    studentId: r.studentId,
    professorId: r.counselorId,
    professorName: r.counselorName,
    categoryCode: (r.categoryCode ?? 'ETC') as ProfCounselCategoryCode,
    method: r.method,
    date: r.date,
    summary: r.summary,
    requestId: r.origin === 'PROF_RECORD' ? undefined : r.requestId,
    createdAt: r.createdAt,
    snapshot: { studentNo: r.studentNo ?? '', name: r.studentName, major: r.studentMajor, grade: r.studentGrade ?? 0 },
  }
}

/** 교수상담 기록 전량(인가 범위) — 부팅 스토어 투영. */
export function getProfCounselRecords(): ProfCounselRecord[] {
  return (counselRecords() as unknown as ProfRecordDto[]).filter(r => r.type === '교수').map(toProfRecord)
}

/** 교수 발의 기록 — 서버가 신청(DONE)+기록을 함께 만든다. 저장 뒤 스토어를 다시 읽는다. */
export async function addProfCounselRecord(input: {
  studentId: string
  professorId: string
  categoryCode: ProfCounselCategoryCode
  method: CounselMethod
  date: string
  summary: string
}): Promise<ProfCounselRecord> {
  const saved = await api<ProfRecordDto>('/counsel-records/professor', {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({ studentId: input.studentId, categoryCode: input.categoryCode, method: input.method,
                           date: input.date, summary: input.summary }),
  })
  await loadCounselRecords()
  return toProfRecord(saved)
}

let nudges = new Map<string, AdvisorNudge>()

/** 부팅 적재 — 담당 범위 학생별 최근 독려 시각. */
export async function loadAdvisorNudges(): Promise<void> {
  const result = await api<{ items: { studentId: string; sentAt: string }[] }>('/advisor-nudges')
  nudges = new Map(result.items.map(n => [n.studentId, { id: n.studentId, studentId: n.studentId, professorId: '', by: '', sentAt: n.sentAt }]))
}

export function getNudgesByStudent(): Map<string, AdvisorNudge> {
  return nudges
}

export async function sendNudge(input: { studentId: string; professorId: string; by: string }): Promise<AdvisorNudge> {
  const saved = await api<AdvisorNudge>('/advisor-nudges', { method: 'POST', body: JSON.stringify({ studentId: input.studentId }) })
  await loadAdvisorNudges()
  return saved
}

function professorMajor(id: string): string {
  return PROFESSOR_GROUPS
    .flatMap(group => Object.values(group.divisions).flat())
    .find(professor => professor.id === id)?.major ?? '—'
}
function scopeAssignments(departments: string[]) {
  const students = new Map(getFullRoster(departments).map(student => [student.id, student]))
  return [...getActiveAssignByStudent().values()]
    .filter(assign => students.has(assign.studentId))
    .map(assign => ({ assign, student: students.get(assign.studentId)! }))
}

export interface ProfessorStatRow {
  professorId: string
  professorName: string
  professorMajor: string
  /** 소속 단과대학 — 학과 트리 단일소스(V_DEP_INF_ALL 미러)에서 파생. 화면 계산 금지 */
  college: string
  dept: string
  adviseeCount: number
  /** 온라인(비대면) 상담 건수 */
  onlineCount: number
  /** 오프라인(대면) 상담 건수 */
  offlineCount: number
  /** 계 = 온라인 + 오프라인 */
  recordCount: number
  /** 미참여 = 배정 지도학생 중 상담 기록이 0건인 학생 수 (건수가 아니라 인원) */
  noneCount: number
  lastDate?: string
}

/**
 * [DB-ready] 교수상담 통계 — 조교 담당 학과에 배정된 지도학생의 기록만 집계한다(0008 스코프 규칙).
 * professorId를 주면 그 교수 한 명으로 좁힌다. 범위 판정은 화면이 아니라 여기서 끝낸다.
 */
export function getProfessorStats(
  departments: string[],
  professorId?: string,
): ProfessorStatRow[] {
  const records = getProfCounselRecords()
  const grouped = new Map<string, ReturnType<typeof scopeAssignments>>()
  for (const item of scopeAssignments(departments)) {
    if (professorId && item.assign.professorId !== professorId) continue
    grouped.set(item.assign.professorId, [
      ...(grouped.get(item.assign.professorId) ?? []),
      item,
    ])
  }
  return [...grouped.entries()].map(([id, items]) => {
    const adviseeIds = new Set(items.map(item => item.student.id))
    const professorRecords = records.filter(record =>
      record.professorId === id && adviseeIds.has(record.studentId),
    )
    const counseled = new Set(professorRecords.map(record => record.studentId))
    const onlineCount = professorRecords.filter(record => record.method === '비대면').length
    return {
      professorId: id,
      professorName: items[0].assign.professorName,
      professorMajor: professorMajor(id),
      college: collegeOf(items[0].student.major),
      dept: items[0].student.major,
      adviseeCount: items.length,
      onlineCount,
      offlineCount: professorRecords.length - onlineCount,
      recordCount: professorRecords.length,
      noneCount: items.filter(item => !counseled.has(item.student.id)).length,
      lastDate: professorRecords.map(record => record.date).sort().at(-1),
    }
  })
}

/** 교수 필터 옵션 — 담당 범위에서 배정을 보유한 교수만. 하드코딩 목록 금지. */
export function getProfessorFilterOptions(
  departments: string[],
): { id: string; name: string }[] {
  const seen = new Map<string, string>()
  for (const { assign } of scopeAssignments(departments)) {
    seen.set(assign.professorId, assign.professorName)
  }
  return [...seen.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** [DB-ready] 교수 범위 기록이며 필터·정렬은 이 데이터층에서 처리한다. */
export async function queryProfRecords(
  params: ListParams & { professorId: string },
): Promise<Paginated<ProfCounselRecord>> {
  await mockLatency()
  const q = (params.q ?? '').trim().toLowerCase()
  const category = params.filters?.categoryCode
  const rows = getProfCounselRecords()
    .filter(item => item.professorId === params.professorId)
    .filter(item => !category || item.categoryCode === category)
    .filter(item => !q || `${item.snapshot.name} ${item.snapshot.studentNo}`.toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  return paginate(rows, params)
}

export interface AdviseeCounselRow {
  studentId: string
  studentNo: string
  name: string
  major: string
  grade: number
  status: EnrollStatus
  professorId: string
  professorName: string
  recordCount: number
  lastDate?: string
  lastCategoryCode?: ProfCounselCategoryCode
  nudgedAt?: string
}
export type AdviseeTab = 'all' | 'none'

function adviseeRows(departments: string[]): AdviseeCounselRow[] {
  const records = getProfCounselRecords()
  const nudges = getNudgesByStudent()
  return scopeAssignments(departments).map(({ assign, student }) => {
    const matches = records
      .filter(record => record.studentId === student.id && record.professorId === assign.professorId)
      .sort((a, b) => b.date.localeCompare(a.date))
    return {
      studentId: student.id,
      studentNo: student.studentNo,
      name: student.name,
      major: student.major,
      grade: student.grade,
      status: student.status,
      professorId: assign.professorId,
      professorName: assign.professorName,
      recordCount: matches.length,
      lastDate: matches[0]?.date,
      lastCategoryCode: matches[0]?.categoryCode,
      nudgedAt: nudges.get(student.id)?.sentAt,
    }
  })
}
// ─────────────────────────────────────────────────────────────────────────────
// [DB-ready] 조교 담당 범위의 배정 학생 상담 현황을 페이지 단위로 조회하는 이음새.
// DB 전환 시 서버 WHERE/LIMIT/OFFSET 응답으로 같은 Paginated 봉투를 반환한다.
// ─────────────────────────────────────────────────────────────────────────────
export async function queryAdviseeCounselStatus(
  params: ListParams & { departments?: string[]; tab?: AdviseeTab } = {},
): Promise<Paginated<AdviseeCounselRow>> {
  await mockLatency()
  const q = (params.q ?? '').trim().toLowerCase()
  const filters = params.filters ?? {}
  const rows = adviseeRows(params.departments ?? [])
    .filter(row => params.tab !== 'none' || row.recordCount === 0)
    .filter(row => !filters.professorId || row.professorId === filters.professorId)
    .filter(row => !filters.status || row.status === filters.status)
    .filter(row => !q || `${row.name} ${row.studentNo}`.toLowerCase().includes(q))
    .sort((a, b) => (
      Number(a.recordCount > 0) - Number(b.recordCount > 0)
      || (a.lastDate ?? '').localeCompare(b.lastDate ?? '')
      || a.studentNo.localeCompare(b.studentNo)
    ))
  return paginate(rows, params)
}
/**
 * 탭 카운트 — 검색·학적 같은 "필터"는 무시하고 담당 범위 전체를 센다(0008 규약).
 * 다만 교수 선택은 필터가 아니라 "누구의 실적을 보는가"라는 스코프라 카운트에도 반영한다.
 */
export function getAdviseeTabCounts(
  departments: string[],
  professorId?: string,
): { all: number; none: number } {
  const all = adviseeRows(departments)
    .filter(row => !professorId || row.professorId === professorId)
  return { all: all.length, none: all.filter(row => row.recordCount === 0).length }
}
