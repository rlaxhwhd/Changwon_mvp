import { loadPrograms } from './programStore'
import { loadWishlist as loadProgramWishlist, loadGrowth } from './growthStore'
import { loadApplications, loadCapability, loadPostings, loadWishlist } from './jobStore'
import { loadCounselRecords } from './counselStore'
import { loadCounselorProfiles, loadPublicSlots } from './counselOperationsStore'
import { loadProfessorGroups } from './staffDirectoryStore'
import { loadDepartments } from './departmentStore'
import { loadNotices } from './communicationsStore'
import { loadMainPopups } from '../src_v2/data/popups'
import { loadResumes } from '../src_v2/pages/jobs/resumeMock'
import { getActiveStudentId } from '../src_v2/data/students'

// Only data consumed synchronously by a page belongs here. Pages with their own
// scoped fetch (program detail, surveys, records, missions, etc.) keep that fetch.
const resources = {
  programs: loadPrograms,
  programWishlist: loadProgramWishlist,
  jobs: loadPostings,
  jobWishlist: loadWishlist,
  jobCapability: loadCapability,
  applications: () => loadApplications('mine'),
  resumes: loadResumes,
  counselors: loadCounselorProfiles,
  professors: loadProfessorGroups,
  slots: loadPublicSlots,
  counselRecords: loadCounselRecords,
  departments: loadDepartments,
  notices: loadNotices,
  popups: loadMainPopups,
  growth: () => loadGrowth(getActiveStudentId()),
}
export type StudentPageResource = keyof typeof resources

const pending = new Map<string, Promise<void>>()

/** Share concurrent loads, but refresh on a later visit. Failed loads can retry. */
function loadResource(resource: StudentPageResource): Promise<void> {
  const key = `${getActiveStudentId()}:${resource}`
  const existing = pending.get(key)
  if (existing) return existing
  const task = Promise.resolve().then(resources[resource]).finally(() => pending.delete(key))
  pending.set(key, task)
  return task
}

/** React Router waits for this before mounting a page that reads store selectors. */
export function studentPageLoader(...required: StudentPageResource[]) {
  return async () => {
    await Promise.all([...new Set(required)].map(loadResource))
    return null
  }
}
