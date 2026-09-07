// ─────────────────────────────────────────────────────────────────────────────
// 전담교수 배정 로더 — 현행 DB CO_ADVISER(STU_NO + ADV_NO) 대응 단일소스.
// localStorage 'dc_advisor_assign'를 우선하고, 없으면 append-only seed JSON을 쓴다.
// DB 전환 시 이 로더의 읽기·저장만 CO_ADVISER API로 교체하며, 화면은 이 모듈만 사용한다.
// 배정 이력을 수정·삭제하지 말 것: 학생당 active 1건 유일성은 배정 시점에 검증한다.
// ─────────────────────────────────────────────────────────────────────────────
import seed from './advisorAssigns.seed.json'
import { PROFESSOR_GROUPS } from '../../src_v2/data/professors'
import type { Professor } from '../../src_v2/data/professors'
import { getFullRoster } from './studentRoster'
import type { RosterStudent } from './studentRoster'
import { mockLatency, paginate } from './query'
import type { ListParams, Paginated } from './query'
import type { AdvisorAssign } from './schema/advisorAssign'

const STORAGE_KEY = 'dc_advisor_assign'
const SEED = seed as AdvisorAssign[]

function persist(list: AdvisorAssign[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch { /* demo storage unavailable */ }
}

export function getAdvisorAssigns(): AdvisorAssign[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as AdvisorAssign[]
    }
  } catch { /* seed fallback */ }
  return SEED
}

export function getActiveAssignByStudent(): Map<string, AdvisorAssign> {
  return new Map(getAdvisorAssigns().filter(a => a.status === 'active').map(a => [a.studentId, a]))
}

/** 한 교수에게 active 배정된 지도학생 id 목록이며 교수 화면의 스코프 단일 원천이다. */
export function getAdviseeStudentIds(professorId: string): string[] {
  return getAdvisorAssigns()
    .filter(item => item.status === 'active' && item.professorId === professorId)
    .map(item => item.studentId)
}

/** 교수에게 배정된 지도학생 로스터를 데이터층에서 조회한다. */
export function getAdviseeRoster(professorId: string): RosterStudent[] {
  const studentIds = new Set(getAdviseeStudentIds(professorId))
  return getFullRoster().filter(student => studentIds.has(student.id))
}

function professorById(id: string): Professor | undefined {
  return PROFESSOR_GROUPS.flatMap(group => Object.values(group.divisions).flat()).find(professor => professor.id === id)
}

export function professorsOfMajor(major: string): Professor[] {
  for (const group of PROFESSOR_GROUPS) if (group.divisions[major]) return group.divisions[major]
  return []
}

export function assignAdvisor(input: { studentId: string; professorId: string; assignedAt: string; by: string }): AdvisorAssign {
  if (getActiveAssignByStudent().has(input.studentId)) throw new Error('이미 지도교수가 배정된 학생입니다.')
  const student = getFullRoster().find(item => item.id === input.studentId)
  const professor = professorById(input.professorId)
  if (!student || !professor) throw new Error('배정에 필요한 학생 또는 교수 정보를 찾을 수 없습니다.')
  if (!professorsOfMajor(student.major).some(item => item.id === professor.id)) throw new Error('학생 학과의 교수만 배정할 수 있습니다.')
  const record: AdvisorAssign = {
    id: `adv_${Date.now()}`,
    studentId: student.id,
    professorId: professor.id,
    professorName: professor.name,
    assignedAt: input.assignedAt,
    status: 'active',
    by: input.by,
    snapshot: { studentNo: student.studentNo, name: student.name, major: student.major, grade: student.grade, status: student.status },
  }
  persist([...getAdvisorAssigns(), record])
  return record
}

export function getAssignYearOptions(departments: string[]): string[] {
  const rosterIds = new Set(getFullRoster(departments).map(student => student.id))
  return [...new Set(getAdvisorAssigns().filter(assign => rosterIds.has(assign.studentId)).map(assign => assign.assignedAt.slice(0, 4)))].sort((a, b) => b.localeCompare(a))
}

export interface AdvisorRosterRow extends RosterStudent {
  advisor?: { professorId: string; professorName: string; assignedAt: string }
}
export type AdvisorTab = 'all' | 'unassigned' | 'assigned'

function rosterRows(departments: string[] = []): AdvisorRosterRow[] {
  const active = getActiveAssignByStudent()
  return getFullRoster(departments).map(student => {
    const assign = active.get(student.id)
    return assign ? { ...student, advisor: { professorId: assign.professorId, professorName: assign.professorName, assignedAt: assign.assignedAt } } : student
  })
}

function filterRoster(params: { departments?: string[]; tab?: AdvisorTab; q?: string; filters?: Record<string, string | undefined> }): AdvisorRosterRow[] {
  const q = (params.q ?? '').trim().toLowerCase()
  const filters = params.filters ?? {}
  return rosterRows(params.departments).filter(student => {
    if (params.tab === 'assigned' && !student.advisor) return false
    if (params.tab === 'unassigned' && student.advisor) return false
    if (filters.major && student.major !== filters.major) return false
    if (filters.grade && String(student.grade) !== filters.grade) return false
    if (filters.status && student.status !== filters.status) return false
    if (filters.year && student.advisor?.assignedAt.slice(0, 4) !== filters.year) return false
    return !q || `${student.name} ${student.studentNo}`.toLowerCase().includes(q)
  }).sort((a, b) => Number(Boolean(a.advisor)) - Number(Boolean(b.advisor)) || (b.advisor?.assignedAt ?? '').localeCompare(a.advisor?.assignedAt ?? '') || a.studentNo.localeCompare(b.studentNo))
}

// ─────────────────────────────────────────────────────────────────────────────
// [DB-ready] 조교 범위와 페이지 조건을 받는 배정 로스터 조회 이음새.
// DB 전환 시 서버 WHERE/LIMIT/OFFSET 응답으로 같은 Paginated 봉투를 반환한다.
// ─────────────────────────────────────────────────────────────────────────────
export async function queryAdvisorRoster(params: ListParams & { departments?: string[]; tab?: AdvisorTab } = {}): Promise<Paginated<AdvisorRosterRow>> {
  await mockLatency()
  return paginate(filterRoster(params), params)
}

export function getAdvisorTabCounts(departments: string[]): { all: number; assigned: number; unassigned: number } {
  const all = rosterRows(departments)
  const assigned = all.filter(student => student.advisor).length
  return { all: all.length, assigned, unassigned: all.length - assigned }
}

/** 교수 선택지의 현재 배정 인원 — 배정 이력에서 파생한다. */
export function getProfessorAdvisorCounts(major: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const row of rosterRows([major])) if (row.advisor) counts.set(row.advisor.professorId, (counts.get(row.advisor.professorId) ?? 0) + 1)
  return counts
}

// 내보내기는 페이징 없이 전체를 반환한다. 호출부가 조회 파라미터를 그대로 넘길 수 있도록
// queryAdvisorRoster와 같은 타입을 받되 page/pageSize는 무시한다.
export function getAdvisorRosterForExport(params: ListParams & { departments?: string[]; tab?: AdvisorTab }): AdvisorRosterRow[] {
  return filterRoster(params)
}
