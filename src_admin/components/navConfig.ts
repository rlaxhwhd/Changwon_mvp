import type { IconType } from 'react-icons'
import { LuBrain, LuBuilding2, LuCalendarDays, LuChartNoAxesColumn, LuClipboardCheck, LuClock, LuContact, LuFileText, LuGlobe, LuGraduationCap, LuHeadset, LuHouse, LuIdCard, LuInbox, LuList, LuPlus, LuRoute, LuSearch, LuSettings, LuTable, LuUsers, LuUsersRound, LuUserX } from 'react-icons/lu'
// ─────────────────────────────────────────────────────────────────────────
// 교직원(백오피스) 포털 네비 단일 소스 — 상담사·교수·조교 공용.
// 역할(StaffRole)로 섹션과 하위 항목을 필터한다 = 현행 SY_MENU_AUTH(역할↔메뉴) 계승.
//   상담사(career/psych): 홈 → 진단 관리 → 상담 관리 → 학생 관리 → 로드맵/채용/비교과[career] → 설정
//   교수(professor): SPEC §3-5   조교(assistant): SPEC §3-2
// [career] 표시 섹션은 진로상담사 전용. 설정의 "가능 시간대"는 상담사 전용(child roles).
// ─────────────────────────────────────────────────────────────────────────
import type { StaffRole } from '../data/schema/staff'

export interface NavChild {
  label: string
  path: string
  icon: IconType
  children?: NavChild[]
  /** 이 항목을 볼 수 있는 역할. 없으면 상위 섹션이 노출되는 모든 역할에 노출. */
  roles?: StaffRole[]
}

export interface NavSection {
  id: string
  label: string
  basePaths: string[]
  /** 섹션 대표 경로 (없으면 첫 child) */
  path?: string
  icon: IconType
  /** 이 섹션을 볼 수 있는 역할. 없으면 모든 역할에 노출. */
  roles?: StaffRole[]
  children: NavChild[]
}

/** 상담사 2종(진로+심리) 공통 노출 */
const COUNSELOR: StaffRole[] = ['career', 'psych']

const ALL_SECTIONS: NavSection[] = [
  // ── 상담사 (진로 + 심리) ────────────────────────────────────────────
  {
    id: 'home',
    label: '홈',
    roles: COUNSELOR,
    basePaths: ['/'],
    path: '/',
    icon: LuHouse,
    children: [],
  },
  {
    id: 'diagnosis',
    label: '진단 관리',
    roles: COUNSELOR,
    basePaths: ['/diagnosis'],
    icon: LuClipboardCheck,
    children: [
      { label: '검사 현황', path: '/diagnosis/status', icon: LuClipboardCheck },
    ],
  },
  {
    id: 'counsel',
    label: '상담 관리',
    roles: COUNSELOR,
    basePaths: ['/counsel'],
    icon: LuHeadset,
    children: [
      { label: '신청 접수함', path: '/counsel/requests', icon: LuInbox },
      { label: '일정·예약', path: '/counsel/schedule', icon: LuCalendarDays },
      { label: '상담일지', path: '/counsel/journals', icon: LuFileText },
      { label: '완료 상담 내역', path: '/counsel/records', icon: LuClipboardCheck },
      { label: '집단상담', path: '/counsel/groups', icon: LuUsersRound },
      { label: '심리검사 결과', path: '/counsel/psych-tests', icon: LuBrain, roles: ['psych'] },
      { label: '상담 통계', path: '/counsel/stats', icon: LuChartNoAxesColumn },
    ],
  },
  {
    id: 'students',
    label: '학생 관리',
    roles: COUNSELOR,
    basePaths: ['/students'],
    path: '/students',
    icon: LuUsers,
    // 하위 항목은 '담당 학생 목록' 하나뿐이라 섹션 링크(path)와 중복된다 → 드롭다운을 두지 않는다.
    children: [],
  },
  {
    id: 'roadmap',
    label: '로드맵 관리',
    basePaths: ['/roadmap'],
    icon: LuRoute,
    roles: ['career'],
    children: [
      { label: '변경 요청함', path: '/roadmap/requests', icon: LuInbox },
    ],
  },
  {
    id: 'jobs',
    label: '채용공고',
    basePaths: ['/jobs'],
    path: '/jobs',
    icon: LuBuilding2,
    roles: ['career'],
    children: [
      { label: '교내 공고 목록', path: '/jobs', icon: LuList },
      { label: '공고 등록', path: '/jobs/new', icon: LuPlus },
      { label: '외부 공고 목록', path: '/jobs/external', icon: LuGlobe },
      { label: '추천채용 지원자관리', path: '/jobs/applicants', icon: LuUsers },
    ],
  },
  {
    id: 'programs',
    label: '비교과 운영',
    basePaths: ['/programs'],
    icon: LuGraduationCap,
    roles: ['career'],
    children: [
      { label: '프로그램 목록', path: '/programs', icon: LuList },
      { label: '프로그램 관리', path: '/programs/manage', icon: LuTable },
      { label: '프로그램 등록', path: '/programs/new', icon: LuPlus },
      { label: '블랙리스트', path: '/programs/blacklist', icon: LuUserX },
    ],
  },

  // ── 교수 (SPEC §3-5) ────────────────────────────────────────────────
  {
    id: 'prof-advisees',
    label: '지도학생',
    roles: ['professor'],
    basePaths: ['/professor/advisees'],
    path: '/professor/advisees',
    icon: LuUsers,
    children: [],
  },
  {
    id: 'prof-students',
    label: '학생 검색',
    roles: ['professor'],
    basePaths: ['/professor/students'],
    path: '/professor/students',
    icon: LuSearch,
    children: [],
  },
  {
    id: 'prof-counsel',
    label: '상담 관리',
    roles: ['professor'],
    basePaths: ['/professor/counsel'],
    icon: LuHeadset,
    children: [
      { label: '신청 접수', path: '/professor/counsel/requests', icon: LuInbox },
      { label: '상담 기록', path: '/professor/counsel/records', icon: LuClipboardCheck },
    ],
  },
  {
    id: 'prof-setup',
    label: '상담 설정',
    roles: ['professor'],
    basePaths: ['/professor/schedule', '/professor/profile'],
    icon: LuSettings,
    children: [
      { label: '상담 제한일정', path: '/professor/schedule', icon: LuClock },
      { label: '상담 노출 설정', path: '/professor/profile', icon: LuIdCard },
    ],
  },

  // ── 조교 (SPEC §3-2) ────────────────────────────────────────────────
  {
    id: 'asst-students',
    label: '학생 현황',
    roles: ['assistant'],
    basePaths: ['/assistant/students'],
    path: '/assistant/students',
    icon: LuUsers,
    children: [],
  },
  {
    id: 'asst-advisor',
    label: '전담교수',
    roles: ['assistant'],
    basePaths: ['/assistant/advisor'],
    icon: LuContact,
    children: [
      { label: '배정 현황', path: '/assistant/advisor', icon: LuTable },
      { label: '상담 실적', path: '/assistant/advisor/records', icon: LuClipboardCheck },
    ],
  },
  {
    id: 'asst-companies',
    label: '학과추천기업관리',
    roles: ['assistant'],
    basePaths: ['/assistant/companies'],
    path: '/assistant/companies',
    icon: LuBuilding2,
    children: [],
  },

  // ── 설정 (전 역할 공통) ─────────────────────────────────────────────
  {
    id: 'settings',
    label: '설정',
    roles: ['career', 'psych', 'professor'],
    basePaths: ['/settings'],
    path: '/settings',
    icon: LuSettings,
    children: [
      { label: '내 프로필', path: '/settings', icon: LuIdCard },
      { label: '가능 시간대', path: '/settings/availability', icon: LuClock, roles: COUNSELOR },
    ],
  },
]

/** 역할에 노출되는 섹션 + 그 하위 항목만 반환 (섹션·child 모두 roles 필터) */
export function getNavSections(role: StaffRole): NavSection[] {
  return ALL_SECTIONS
    .filter(s => !s.roles || s.roles.includes(role))
    .map(s => ({ ...s, children: s.children.filter(c => !c.roles || c.roles.includes(role)) }))
}

export function matchesPath(pathname: string, targetPath: string) {
  if (targetPath === '/') return pathname === '/'
  const base = targetPath.split('#')[0]
  return pathname === base || pathname.startsWith(`${base}/`)
}

export function getSectionForPath(pathname: string, sections: NavSection[]) {
  // '/' 는 정확 매칭만 (다른 섹션의 prefix가 아니므로 안전)
  return sections.find(section =>
    section.basePaths.some(basePath => matchesPath(pathname, basePath)),
  )
}

function flattenChildren(children: NavChild[]): NavChild[] {
  return children.flatMap(child => [child, ...(child.children ? flattenChildren(child.children) : [])])
}

/** 현재 경로에 가장 구체적으로 매칭되는 child path 반환 (가장 긴 path 우선) */
export function getActiveChildPath(pathname: string, section: NavSection): string | undefined {
  const flat = flattenChildren(section.children)
  const exact = flat.find(child => child.path === pathname)
  if (exact) return exact.path
  const matches = flat.filter(child => matchesPath(pathname, child.path))
  if (matches.length === 0) return undefined
  return matches.reduce((best, child) => (child.path.length > best.path.length ? child : best)).path
}
