import { loadPrograms } from '../../shared/programStore'
import { jobCapability, loadApplications, loadCapability, loadPostings } from '../../shared/jobStore'
import { loadRoadmapCapability, loadRoadmapRequests, roadmapCapability } from '../../shared/roadmapStore'
import { loadGroups, loadSchedule } from '../../shared/counselOperationsStore'
import { loadCounselEvents } from '../../shared/communicationsStore'
import { loadDepartments } from '../../shared/departmentStore'
import { loadActiveStaffDetail, loadProfessorGroups } from '../../shared/staffDirectoryStore'
import { loadStudentRoster } from './studentRoster'
import { loadAdvisorAssigns } from './advisorAssigns'
import { loadProfessorCounselStats } from './profCounselRecords'
import { getActiveUser } from './staff'
import type { StaffRole } from './schema/staff'

// 교직원 화면별 데이터 — 부팅(shared/bootstrap.ts)은 모든 화면이 쓰는 것만 받는다(2026-10-26).
// 여기에는 동기 셀렉터로 읽는 스토어만 둔다. 자체 조회를 하는 화면은 그대로 둔다(studentPageData 와 같은 규칙).
function departments(): string[] {
  const user = getActiveUser() as { departments?: unknown }
  return Array.isArray(user.departments) ? user.departments.filter((d): d is string => typeof d === 'string') : []
}
const roleIn = (...roles: StaffRole[]) => roles.includes(getActiveUser().role)

const resources = {
  programs: loadPrograms,
  jobs: loadPostings,
  // 관리 권한이 없으면 지원 목록 API 가 403 이다 — 권한을 먼저 묻는다.
  applications: async () => { await loadCapability(); if (jobCapability().canManageApplicants) await loadApplications('managed') },
  roadmapRequests: async () => { await loadRoadmapCapability(); if (roadmapCapability().canManageRequests) await loadRoadmapRequests() },
  counselEvents: () => loadCounselEvents(),
  departments: loadDepartments,
  professorGroups: loadProfessorGroups,
  staffDetail: () => loadActiveStaffDetail(getActiveUser().id),
  roster: () => loadStudentRoster(departments()),
  advisorAssigns: () => roleIn('assistant', 'professor') ? loadAdvisorAssigns(departments()) : undefined,
  professorStats: () => roleIn('assistant', 'professor') ? loadProfessorCounselStats(departments()) : undefined,
  schedule: () => roleIn('career', 'psych', 'professor') ? loadSchedule(getActiveUser().id) : undefined,
  groups: () => roleIn('career', 'psych') ? loadGroups() : undefined,
}
export type StaffPageResource = keyof typeof resources

const pending = new Map<string, Promise<void>>()

/** 동시 요청은 하나로 합치고, 다음 방문 때는 새로 읽는다. 실패하면 다시 시도할 수 있다. */
function loadResource(resource: StaffPageResource): Promise<void> {
  const key = `${getActiveUser().id}:${resource}`
  const existing = pending.get(key)
  if (existing) return existing
  const task = Promise.resolve().then(resources[resource]).then(() => undefined).finally(() => pending.delete(key))
  pending.set(key, task)
  return task
}

/** React Router 가 화면을 그리기 전에 기다린다. 역할 가드(RequireRole)보다 로더가 먼저 돌므로
 *  허용 역할이 아니면 받지 않는다 — 가드가 곧 홈으로 보낸다. */
export function staffPageLoader(roles: StaffRole[], ...required: StaffPageResource[]) {
  return async () => {
    if (roleIn(...roles)) await Promise.all([...new Set(required)].map(loadResource))
    return null
  }
}
