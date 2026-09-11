// ─────────────────────────────────────────────────────────────────────────────
// 전담교수 상담기록 로더 — 정본은 서버(dc.counsel_request type=PROF + dc.counsel_record).
// 교수가 신청 없이 남기는 기록은 서버가 신청(DONE)+기록을 한 트랜잭션으로 만든다(0003 D3,
// 현행 CON_PROF_INFO 1행 구조 계승). 독려는 기록이 아니라 알림(dc.notification)이다.
// 읽기는 부팅 때 적재된 상담기록 스토어(shared/counselStore)를 교수상담만 투영한다.
// ─────────────────────────────────────────────────────────────────────────────
import { counselRecords, loadCounselRecords } from '../../shared/counselStore'
import { api, queryString } from '../../shared/api'
import { rosterScopes, rosterScopeKey } from './studentRoster'
import type { EnrollStatus } from './studentRoster'
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
  await Promise.all([loadCounselRecords(), loadProfessorCounselStats()])
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


const statsCache = new Map<string, ProfessorStatRow[]>()
let statsDepartments: string[] = []
export async function loadProfessorCounselStats(departments = statsDepartments): Promise<void> {
  statsDepartments = departments
  const entries = await Promise.all(rosterScopes(departments).map(async scope => {
    const data = await api<{ professors: ProfessorStatRow[] }>(`/advisor-assignments/counsel-summary?${queryString({ departments: scope })}`)
    return [rosterScopeKey(scope), data.professors] as const
  }))
  statsCache.clear()
  for (const [key, rows] of entries) statsCache.set(key, rows)
}
export function getProfessorStats(departments: string[], professorId?: string): ProfessorStatRow[] {
  const rows = statsCache.get(rosterScopeKey(departments)) ?? []
  return professorId ? rows.filter(row => row.professorId === professorId) : rows
}
export function getProfessorFilterOptions(departments: string[]): { id: string; name: string }[] {
  return getProfessorStats(departments).map(row => ({ id: row.professorId, name: row.professorName }))
}
export async function queryProfRecords(params: ListParams & { professorId: string }): Promise<Paginated<ProfCounselRecord>> {
  const result = await api<Paginated<ProfRecordDto>>(`/counsel-records?${queryString({ ...params, type: '교수', categoryCode: params.filters?.categoryCode })}`)
  return { ...result, items: result.items.map(toProfRecord) }
}
export async function queryAdviseeCounselStatus(params: ListParams & { departments?: string[]; tab?: AdviseeTab } = {}): Promise<Paginated<AdviseeCounselRow>> {
  return api(`/advisor-assignments/counsel-status?${queryString(params)}`)
}
export function getAdviseeTabCounts(departments: string[], professorId?: string): { all: number; none: number } {
  return getProfessorStats(departments, professorId).reduce((total, row) => ({ all: total.all + row.adviseeCount, none: total.none + row.noneCount }), { all: 0, none: 0 })
}
