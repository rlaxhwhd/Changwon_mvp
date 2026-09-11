// ─────────────────────────────────────────────────────────────────────────────
// 전담교수 배정 로더 — 정본은 서버 dc.advisor_assignment(현행 CO_ADVISER 계승).
// 부팅 때 인가 범위의 배정(해제분 포함 — 배정년도 필터용)을 적재하고, 화면은 아래
// 동기 셀렉터만 구독한다. 배정 쓰기는 POST /advisor-assignments 이며 서버가
// 학생당 active 1건·조교 담당 학과·교수 학과 일치를 검사한다(409/403/422).
// ─────────────────────────────────────────────────────────────────────────────
import { PROFESSOR_GROUPS } from '../../src_v2/data/professors'
import type { Professor } from '../../src_v2/data/professors'
import { getFullRoster } from './studentRoster'
import type { RosterStudent } from './studentRoster'
import { api, queryString } from '../../shared/api'
import { mockLatency, paginate } from './query'
import type { ListParams, Paginated } from './query'
import type { AdvisorAssign } from './schema/advisorAssign'

export const ADVISOR_EVENT = 'dc:advisor-updated'
let assigns: AdvisorAssign[] = []

/** 부팅 적재 — 서버가 staff_student_scope 로 거른 배정 전량(해제분 포함). */
export async function loadAdvisorAssigns(): Promise<void> {
  const result: AdvisorAssign[] = []
  let page = 1
  while (true) {
    const response = await api<Paginated<AdvisorAssign>>(`/advisor-assignments?${queryString({ active: false, page, pageSize: 100 })}`)
    result.push(...response.items)
    if (result.length >= response.totalCount || response.items.length === 0) break
    page += 1
  }
  assigns = result
  window.dispatchEvent(new Event(ADVISOR_EVENT))
}

export function getAdvisorAssigns(): AdvisorAssign[] {
  return assigns
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

export function professorsOfMajor(major: string): Professor[] {
  for (const group of PROFESSOR_GROUPS) if (group.divisions[major]) return group.divisions[major]
  return []
}

/** 배정 — 정합성(중복·학과·범위)은 서버가 판정하고 실패는 ApiError 로 온다. */
export async function assignAdvisor(input: { studentId: string; professorId: string; assignedAt: string; by: string }): Promise<AdvisorAssign> {
  const record = await api<AdvisorAssign>('/advisor-assignments', {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({ studentId: input.studentId, professorId: input.professorId, assignedAt: input.assignedAt }),
  })
  await loadAdvisorAssigns()
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
