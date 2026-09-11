import { api } from './api'
import { setStaffProfiles } from './staffStore'
import type { StaffUser } from '../src_admin/data/schema/staff'
import { loadMetadata } from './metadataStore'
import { codeItems, factorDefinitions, METADATA_EVENT } from './metadataStore'
import { applyProcessMetadata, DIAGNOSIS_MODULES } from '../src_v2/data/careerProcess'
import { loadStudentDiagnoses } from './diagnosisStore'
import { loadCounselRequests, loadCounselRecords } from './counselStore'
import { loadStudentRoster } from '../src_admin/data/studentRoster'
import { loadAdvisorAssigns } from '../src_admin/data/advisorAssigns'
import { loadMainPopups } from '../src_v2/data/popups'
import { loadAdvisorNudges } from '../src_admin/data/profCounselRecords'
import { loadPrograms } from './programStore'
import { jobCapability, loadApplications, loadCapability, loadPostings, loadWishlist } from './jobStore'
import { loadResumes } from '../src_v2/pages/jobs/resumeMock'
import { loadProfiles, setStudentChoices, type StudentChoice } from './profileStore'
import { loadRoadmap, loadRoadmapCapability, loadRoadmapRequests, roadmapCapability } from './roadmapStore'
import { loadGrowth, loadWishlist as loadProgramWishlist } from './growthStore'
import { counselorProfiles, loadCounselorProfiles, loadSchedule, loadGroups, loadPublicSlots } from './counselOperationsStore'
import type { Counselor } from '../src_admin/data/schema/counselor'
import { loadNotices, loadNotifications, loadCounselEvents } from './communicationsStore'
import { loadDepartments } from './departmentStore'
import { loadProfessorGroups, loadStaffDirectory } from './staffDirectoryStore'

export async function initializeData(): Promise<void> {
  const applyMetadata = () => {
    applyProcessMetadata(codeItems)
    for (const module of DIAGNOSIS_MODULES) {
      if (['C2','C3','C4','C5','C6'].includes(module.id)) module.factors = factorDefinitions.filter(row => row.test_code === module.id).map(row => ({name:row.label,desc:row.secondary_label ?? undefined,code:row.factor_code}))
    }
  }
  window.addEventListener(METADATA_EVENT, applyMetadata)
  const admin = location.pathname.startsWith('/admin')
  const identities = await api<{ students: StudentChoice[]; staff: StaffUser[] }>('/development/identities')
  setStaffProfiles(identities.staff)
  counselorProfiles.splice(0, counselorProfiles.length, ...identities.staff.filter(s => s.role === 'career' || s.role === 'psych').map(s => ({ ...s, version: 1 } as Counselor & { version: number })))
  setStudentChoices(identities.students)
  if (!admin && !localStorage.getItem('dc_active_student')) {
    const first = identities.students[0]
    if (!first) throw new Error('등록된 학생 계정이 없습니다.')
    localStorage.setItem('dc_active_student', first.id)
  }
  if (!admin || localStorage.getItem('dc_active_staff')) {
    const activeStaff = admin ? localStorage.getItem('dc_active_staff') ?? undefined : undefined
    await Promise.all([loadProfiles(), loadCounselRequests(), loadCounselRecords(), loadMetadata(),
                       loadPrograms(), loadPostings(), loadCapability(), loadRoadmapCapability(),
                       loadCounselorProfiles(), loadNotices(), loadNotifications(), loadCounselEvents(),
                       loadDepartments(), loadProfessorGroups(), ...(admin ? [loadStaffDirectory(activeStaff), loadStudentRoster(), loadAdvisorAssigns(), loadAdvisorNudges()] : [loadMainPopups()])])
    applyMetadata()
    // 채용의 개인 자료(지원·찜·자소서)는 학생 본인 것만 서버가 내려준다.
    // 교직원은 담당 범위의 지원만 받는다 — 관리 권한이 없으면 그 목록도 없다.
    if (admin) {
      const staffId = localStorage.getItem('dc_active_staff')!
      const staff = identities.staff.find(s => s.id === staffId)
      if (staff && ['career', 'psych', 'professor'].includes(staff.role)) await loadSchedule(staffId)
      if (staff && ['career', 'psych'].includes(staff.role)) await loadGroups()
      if (jobCapability().canManageApplicants) await loadApplications('managed')
      // 변경 요청함은 진로상담사 전용이다(menu roadmap.1). 가드 없이 부르면 교수·조교·
      // 심리상담사·시스템관리자의 부팅이 403 으로 끊긴다 — 화면 전체가 사용 불가가 된다.
      // 배지는 서버 summary 를 읽는다. 전체 목록을 받아 세지 않는다.
      if (roadmapCapability().canManageRequests) await loadRoadmapRequests()
    } else {
      const student = localStorage.getItem('dc_active_student')!
      await Promise.all([loadApplications('mine'), loadWishlist(), loadResumes(),
                         loadPublicSlots(),
                         loadStudentDiagnoses(student),
                         // 로드맵·성장·비교과 찜은 본인 것만 서버가 내려준다.
                         loadRoadmap(student), loadGrowth(student), loadProgramWishlist(),
                         loadRoadmapRequests()])
    }
  }
}
