// ─────────────────────────────────────────────────────────────────────────────
// 전담교수 상담기록 로더 — 현행 DB CON_PROF_INFO 대응 단일소스.
// localStorage 'dc_prof_counsel_records'와 'dc_advisor_nudges'를 우선하고 seed를 폴백한다.
// DB 전환 시 이 로더만 CON_PROF_INFO 및 독려 이력 API로 교체하며, 화면은 이 모듈만 사용한다.
// 상담기록과 독려 이력은 append-only이며 기존 원본을 수정·삭제하지 말 것.
// ─────────────────────────────────────────────────────────────────────────────
import seed from './profCounselRecords.seed.json'
import { getActiveAssignByStudent } from './advisorAssigns'
import { getFullRoster } from './studentRoster'
import type { EnrollStatus } from './studentRoster'
import { PROFESSOR_GROUPS } from '../../src_v2/data/professors'
import { mockLatency, paginate } from './query'
import type { ListParams, Paginated } from './query'
import type {
  AdvisorNudge,
  ProfCounselCategoryCode,
  ProfCounselRecord,
} from './schema/profCounselRecord'
import { getProfessorById } from './professors'
import { studentLiteOf } from './studentRoster'

const STORAGE_KEY = 'dc_prof_counsel_records'
const NUDGE_KEY = 'dc_advisor_nudges'
const SEED = seed as ProfCounselRecord[]

function readList<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as T[]
    }
  } catch { /* fallback */ }
  return fallback
}
function persist<T>(key: string, list: T[]): void {
  try { localStorage.setItem(key, JSON.stringify(list)) } catch { /* demo storage unavailable */ }
}

export function getProfCounselRecords(): ProfCounselRecord[] {
  return readList(STORAGE_KEY, SEED)
}
/** 발생 시점 학생 스냅샷을 보존하는 append-only 기록이다. */
export function addProfCounselRecord(input: {
  studentId: string
  professorId: string
  categoryCode: ProfCounselCategoryCode
  date: string
  summary: string
  requestId?: string
  snapshot?: { studentNo: string; name: string; major: string; grade: number }
}): ProfCounselRecord {
  const student = studentLiteOf(input.studentId)
  const professor = getProfessorById(input.professorId)
  if (!professor) throw new Error('학생 또는 교수 정보를 찾을 수 없습니다.')
  const snapshot = student
    ? {
        studentNo: student.studentNo,
        name: student.name,
        major: student.major,
        grade: student.grade,
      }
    : input.snapshot
  if (!snapshot) throw new Error('학생 또는 교수 정보를 찾을 수 없습니다.')
  const record: ProfCounselRecord = {
    id: `pcr_${Date.now()}`,
    ...input,
    professorName: professor.name,
    createdAt: new Date().toISOString(),
    snapshot,
  }
  persist(STORAGE_KEY, [...getProfCounselRecords(), record])
  return record
}
export function getNudgesByStudent(): Map<string, AdvisorNudge> {
  const latest = new Map<string, AdvisorNudge>()
  for (const nudge of readList<AdvisorNudge>(NUDGE_KEY, [])) {
    if (!latest.get(nudge.studentId) || latest.get(nudge.studentId)!.sentAt < nudge.sentAt) {
      latest.set(nudge.studentId, nudge)
    }
  }
  return latest
}
export function sendNudge(
  input: { studentId: string; professorId: string; by: string },
): AdvisorNudge {
  const nudge: AdvisorNudge = {
    id: `ndg_${Date.now()}`,
    ...input,
    sentAt: new Date().toISOString(),
  }
  persist(NUDGE_KEY, [...readList<AdvisorNudge>(NUDGE_KEY, []), nudge])
  return nudge
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
  dept: string
  adviseeCount: number
  recordCount: number
  lastDate?: string
}
export function getProfessorStats(departments: string[]): ProfessorStatRow[] {
  const records = getProfCounselRecords()
  const grouped = new Map<string, ReturnType<typeof scopeAssignments>>()
  for (const item of scopeAssignments(departments)) {
    grouped.set(item.assign.professorId, [
      ...(grouped.get(item.assign.professorId) ?? []),
      item,
    ])
  }
  return [...grouped.entries()].map(([professorId, items]) => {
    const adviseeIds = new Set(items.map(item => item.student.id))
    const professorRecords = records.filter(record =>
      record.professorId === professorId && adviseeIds.has(record.studentId),
    )
    return {
      professorId,
      professorName: items[0].assign.professorName,
      professorMajor: professorMajor(professorId),
      dept: items[0].student.major,
      adviseeCount: items.length,
      recordCount: professorRecords.length,
      lastDate: professorRecords.map(record => record.date).sort().at(-1),
    }
  })
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
    .filter(row => !filters.status || row.status === filters.status)
    .filter(row => !q || `${row.name} ${row.studentNo}`.toLowerCase().includes(q))
    .sort((a, b) => (
      Number(a.recordCount > 0) - Number(b.recordCount > 0)
      || (a.lastDate ?? '').localeCompare(b.lastDate ?? '')
      || a.studentNo.localeCompare(b.studentNo)
    ))
  return paginate(rows, params)
}
export function getAdviseeTabCounts(
  departments: string[],
): { all: number; none: number } {
  const all = adviseeRows(departments)
  return { all: all.length, none: all.filter(row => row.recordCount === 0).length }
}
