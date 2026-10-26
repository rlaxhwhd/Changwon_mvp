import { api } from './api'
import { setStaffProfiles } from './staffStore'
import type { StaffUser } from '../src_admin/data/schema/staff'
import { loadMetadata } from './metadataStore'
import { codeItems, factorDefinitions, METADATA_EVENT } from './metadataStore'
import { applyProcessMetadata, DIAGNOSIS_MODULES } from '../src_v2/data/careerProcess'
import { loadStudentDiagnoses } from './diagnosisStore'
import { loadCounselRequests, loadCounselRecords } from './counselStore'
import { loadProfiles, setStudentChoices, type StudentChoice } from './profileStore'
import { loadRoadmap } from './roadmapStore'
import { counselorProfiles, loadCounselorProfiles } from './counselOperationsStore'
import type { Counselor } from '../src_admin/data/schema/counselor'
import { loadNotificationSummary } from './communicationsStore'

export async function initializeData(): Promise<void> {
  const applyMetadata = () => {
    applyProcessMetadata(codeItems)
    for (const module of DIAGNOSIS_MODULES) {
      if (['C2','C3','C4','C5','C6'].includes(module.id)) module.factors = factorDefinitions.filter(row => row.test_code === module.id).map(row => ({name:row.label,desc:row.secondary_label ?? undefined,code:row.factor_code}))
    }
  }
  window.addEventListener(METADATA_EVENT, applyMetadata)
  const admin = location.pathname.startsWith('/admin')
  if (!admin) {
    try {
      const current = await api<StudentChoice>('/auth/student/me')
      localStorage.setItem('dc_active_student', current.id)
      setStudentChoices([current])
    } catch (error) {
      if (error instanceof Error && 'status' in error && error.status === 401) {
        localStorage.removeItem('dc_active_student')
        location.replace('/login')
      }
      throw error
    }
    // GNB and StageGate use these stores on every student page. Feature data is
    // loaded by the matching route before its synchronous selectors render.
    const student = localStorage.getItem('dc_active_student')!
    await Promise.all([
      loadProfiles(), loadMetadata(), loadStudentDiagnoses(student),
      loadCounselRequests(), loadRoadmap(student), loadNotificationSummary(),
    ])
    applyMetadata()
    return
  }
  const identities = await api<{ students: StudentChoice[]; staff: StaffUser[] }>('/development/identities')
  setStaffProfiles(identities.staff)
  counselorProfiles.splice(0, counselorProfiles.length, ...identities.staff.filter(s => s.role === 'career' || s.role === 'psych').map(s => ({ ...s, version: 1 } as Counselor & { version: number })))
  if (admin) setStudentChoices(identities.students)
  if (!admin && !localStorage.getItem('dc_active_student')) {
    const first = identities.students[0]
    if (!first) throw new Error('등록된 학생 계정이 없습니다.')
    localStorage.setItem('dc_active_student', first.id)
  }
  if (localStorage.getItem('dc_active_staff')) {
    // 부팅은 모든 화면이 쓰는 것만 받는다(2026-10-26) — 상단바 메뉴·알림 배지, 그리고
    // 여러 화면의 학생 상세 모달이 함께 읽는 학생 프로필·상담 신청·상담 기록·상담사 프로필.
    // 비교과·채용공고·지원·로드맵 요청·일정·집단상담·학과 등 화면 전용 자료는
    // 그 화면의 라우트 로더(src_admin/data/staffPageData.ts)가 받는다.
    await Promise.all([loadProfiles(), loadCounselRequests(), loadCounselRecords(), loadMetadata(),
                       loadCounselorProfiles(), loadNotificationSummary()])
    applyMetadata()
  }
}
