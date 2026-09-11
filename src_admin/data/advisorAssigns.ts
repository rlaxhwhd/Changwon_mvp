import { PROFESSOR_GROUPS } from '../../src_v2/data/professors'
import type { Professor } from '../../src_v2/data/professors'
import { rosterScopes, rosterScopeKey } from './studentRoster'
import type { RosterStudent } from './studentRoster'
import { api, queryString } from '../../shared/api'
import type { ListParams, Paginated } from './query'
import type { AdvisorAssign } from './schema/advisorAssign'
import { loadProfessorCounselStats } from './profCounselRecords'

export const ADVISOR_EVENT = 'dc:advisor-updated'
interface AdvisorSummary {
  all: number; assigned: number; unassigned: number; years: string[]
  professors: { id: string; name: string; count: number }[]
}
const empty: AdvisorSummary = { all: 0, assigned: 0, unassigned: 0, years: [], professors: [] }
const summaries = new Map<string, AdvisorSummary>()
let loadedDepartments: string[] = []

/** Startup loads aggregates only; rows stay paginated on the server. */
export async function loadAdvisorAssigns(departments = loadedDepartments): Promise<void> {
  loadedDepartments = departments
  const entries = await Promise.all(rosterScopes(departments).map(async scope =>
    [rosterScopeKey(scope), await api<AdvisorSummary>(`/advisor-assignments/summary?${queryString({ departments: scope })}`)] as const))
  summaries.clear()
  for (const [key, value] of entries) summaries.set(key, value)
  window.dispatchEvent(new Event(ADVISOR_EVENT))
}
export function professorsOfMajor(major: string): Professor[] {
  return PROFESSOR_GROUPS.flatMap(group => group.divisions[major] ?? [])
}
export async function assignAdvisor(input: { studentId: string; professorId: string; assignedAt: string; by: string }): Promise<AdvisorAssign> {
  const record = await api<AdvisorAssign>('/advisor-assignments', {
    method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({ studentId: input.studentId, professorId: input.professorId, assignedAt: input.assignedAt }),
  })
  await Promise.all([loadAdvisorAssigns(), loadProfessorCounselStats(loadedDepartments)])
  return record
}
export function getAssignYearOptions(departments: string[]): string[] {
  return (summaries.get(rosterScopeKey(departments)) ?? empty).years
}
export interface AdvisorRosterRow extends RosterStudent {
  advisor?: { professorId: string; professorName: string; assignedAt: string } | null
}
export type AdvisorTab = 'all' | 'unassigned' | 'assigned'
type AdvisorParams = ListParams & { departments?: string[]; tab?: AdvisorTab; professorId?: string }
export async function queryAdvisorRoster(params: AdvisorParams = {}): Promise<Paginated<AdvisorRosterRow>> {
  return api(`/advisor-assignments/roster?${queryString(params)}`)
}
export function getAdvisorTabCounts(departments: string[]): { all: number; assigned: number; unassigned: number } {
  return summaries.get(rosterScopeKey(departments)) ?? empty
}
export function getProfessorAdvisorCounts(major: string): Map<string, number> {
  return new Map((summaries.get(rosterScopeKey([major])) ?? empty).professors.map(p => [p.id, p.count]))
}
/** Only an explicit export fetches the complete filtered result. */
export async function getAdvisorRosterForExport(params: AdvisorParams): Promise<AdvisorRosterRow[]> {
  const rows: AdvisorRosterRow[] = []
  for (let page = 1; ; page++) {
    const result = await queryAdvisorRoster({ ...params, page, pageSize: 100 })
    rows.push(...result.items)
    if (rows.length >= result.totalCount || !result.items.length) return rows
  }
}
