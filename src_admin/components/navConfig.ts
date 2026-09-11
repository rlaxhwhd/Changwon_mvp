import type { IconType } from 'react-icons'
import { LuBrain, LuBuilding2, LuCalendarDays, LuChartNoAxesColumn, LuClipboardCheck, LuClock, LuContact, LuFileText, LuGlobe, LuGraduationCap, LuHeadset, LuHouse, LuIdCard, LuInbox, LuList, LuPlus, LuRoute, LuSearch, LuSettings, LuSparkles, LuTable, LuUsers, LuUsersRound, LuUserX } from 'react-icons/lu'
// ─────────────────────────────────────────────────────────────────────────
// 교직원(백오피스) 포털 네비 단일 소스 — 상담사·교수·조교 공용.
// 역할(StaffRole)로 섹션과 하위 항목을 필터한다 = 현행 SY_MENU_AUTH(역할↔메뉴) 계승.
//   상담사(career/psych): 홈 → 진단 관리 → 상담 관리 → 학생 관리 → 로드맵/채용/비교과[career] → 설정
//   교수(professor): SPEC §3-5   조교(assistant): SPEC §3-2
// [career] 표시 섹션은 진로상담사 전용. 설정의 "가능 시간대"는 상담사 전용(child roles).
// ─────────────────────────────────────────────────────────────────────────
import type { StaffRole } from '../data/schema/staff'
import { menuItems } from '../../shared/metadataStore'

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
  // ── 시스템관리자 ─────────────────────────────────────────────────────
  // 현행 관리자 메뉴 트리(CURRENT.md §1-3)를 상단바로 옮긴 것. 시스템 관리 외에는 자리만 있고 화면은 아직 없다.
  // ★ child 순서 = DB menu_code 의 인덱스(system.0 …)다 — 순서를 바꾸면 041 마이그레이션과 어긋난다.
  { id: 'adm-forecast', label: '취업예측분석시스템', roles: ['admin'], basePaths: ['/forecast'], path: '/forecast', icon: LuChartNoAxesColumn, children: [] },
  {
    id: 'adm-members', label: '회원관리', roles: ['admin'], basePaths: ['/members'], icon: LuUsers,
    children: [
      { label: '학과 담당 배정', path: '/members/assignments', icon: LuContact },
    ],
  },
  { id: 'adm-diagnosis', label: '진단관리', roles: ['admin'], basePaths: ['/diagnosis'], path: '/diagnosis', icon: LuClipboardCheck, children: [] },
  { id: 'adm-counsel', label: '상담관리', roles: ['admin'], basePaths: ['/counsel'], path: '/counsel', icon: LuHeadset, children: [] },
  { id: 'adm-roadmap', label: '로드맵관리', roles: ['admin'], basePaths: ['/roadmap'], path: '/roadmap', icon: LuRoute, children: [] },
  { id: 'adm-programs', label: '비교과프로그램관리', roles: ['admin'], basePaths: ['/extracurricular'], path: '/extracurricular', icon: LuGraduationCap, children: [] },
  { id: 'adm-companies', label: '기업정보플랫폼', roles: ['admin'], basePaths: ['/companies'], path: '/companies', icon: LuBuilding2, children: [] },
  { id: 'adm-notices', label: '공지사항', roles: ['admin'], basePaths: ['/notices'], path: '/notices', icon: LuFileText, children: [] },
  {
    id: 'system', label: '시스템 관리', roles: ['admin'], basePaths: ['/system'], icon: LuSettings,
    // 현행 시스템관리 좌측 메뉴 15개 그대로 + 우리가 더한 2개(변경 이력·이관 확인 사항).
    children: [
      { label: '메뉴관리', path: '/system/menus', icon: LuList },
      { label: '그룹관리', path: '/system/groups', icon: LuUsersRound },
      { label: '권한관리', path: '/system/auth', icon: LuIdCard },
      { label: '코드관리', path: '/system/codes', icon: LuTable },
      { label: '게시판관리', path: '/system/boards', icon: LuFileText },
      { label: '배너관리', path: '/system/banners', icon: LuFileText },
      { label: '팝업관리', path: '/system/popups', icon: LuFileText },
      { label: '설문조사 관리', path: '/system/surveys', icon: LuClipboardCheck },
      { label: '사용자 접속이력', path: '/system/access-log', icon: LuClock },
      { label: '업무접근 현황', path: '/system/work-access', icon: LuChartNoAxesColumn },
      { label: '접속통계', path: '/system/access-stats', icon: LuChartNoAxesColumn },
      { label: '접근경로', path: '/system/access-path', icon: LuRoute },
      { label: '관리자 IP관리', path: '/system/admin-ip', icon: LuGlobe },
      { label: '권한변경이력', path: '/system/auth-events', icon: LuFileText },
      { label: 'SMS 관리', path: '/system/sms', icon: LuInbox },
      { label: '변경 이력', path: '/system/events', icon: LuFileText },
      { label: '이관 확인 사항', path: '/system/issues', icon: LuSearch },
    ],
  },
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
    children: [
      // 표·데이터 항목은 같다(StudentChargeTable 공유). 다른 것은 조회 범위뿐이다.
      { label: '담당 학생 목록', path: '/students', icon: LuUsers },
      { label: '전체 학생 목록', path: '/students/all', icon: LuTable },
    ],
  },
  {
    id: 'roadmap',
    label: '로드맵 관리',
    basePaths: ['/roadmap'],
    icon: LuRoute,
    roles: ['career'],
    children: [
      // 생성이 먼저다 — 로드맵이 없으면 요청도 이행률도 있을 수 없다.
      { label: '로드맵 생성', path: '/roadmap/create', icon: LuSparkles },
      { label: '변경 요청함', path: '/roadmap/requests', icon: LuInbox },
      { label: '로드맵 이행률 현황', path: '/roadmap/progress', icon: LuChartNoAxesColumn },
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
  {
    id: 'jobs',
    label: '채용공고',
    basePaths: ['/jobs'],
    path: '/jobs',
    icon: LuBuilding2,
    roles: ['career'],
    children: [
      { label: '교내 공고 목록', path: '/jobs', icon: LuList },
      // 목록은 학생이 보는 카드 그대로 '보기', 수정·삭제는 관리 화면에서 — 비교과와 같은 갈래다.
      { label: '교내공고 관리', path: '/jobs/manage', icon: LuTable },
      { label: '공고 등록', path: '/jobs/new', icon: LuPlus },
      { label: '외부 공고 목록', path: '/jobs/external', icon: LuGlobe },
      { label: '추천채용 지원자관리', path: '/jobs/applicants', icon: LuUsers },
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
  function children(items: NavChild[], parent: string): NavChild[] {
    return items.map((item,index) => ({item,meta:menuItems.find(row => row.menu_code === `${parent}.${index}`),key:`${parent}.${index}`}))
      .filter(({item,meta}) => meta?.is_active && (!item.roles || item.roles.includes(role)))
      .sort((a,b) => a.meta!.sort_order - b.meta!.sort_order)
      .map(({item,meta,key}) => ({...item,label:meta!.label,children:item.children ? children(item.children,key) : undefined}))
  }
  return ALL_SECTIONS
    .filter(s => !s.roles || s.roles.includes(role))
    .map(s => ({section:s,meta:menuItems.find(row => row.menu_code === s.id)}))
    .filter(({meta}) => meta?.is_active)
    .sort((a,b) => a.meta!.sort_order - b.meta!.sort_order)
    .map(({section:s,meta}) => ({ ...s, label:meta!.label, children:children(s.children,s.id) }))
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

/** 경로 표시(빵부스러기) 한 칸. path 가 없으면 링크가 아니라 현재 위치다. */
export interface CrumbItem {
  label: string
  path?: string
}

/**
 * 현재 경로의 상위 계층을 상단바 구성에서 파생한다.
 * 예: '/counsel/requests' → [상담 관리, 신청 접수함]
 *
 * ★ 라벨을 화면에 다시 적지 않는다 — 상단바 이름이 바뀌면 경로 표시도 같이 바뀌어야 한다.
 *   역할별로 보이는 메뉴가 다르므로 sections 를 인자로 받는다(getNavSections(role) 결과).
 */
export function getCrumbTrail(pathname: string, sections: NavSection[]): CrumbItem[] {
  const section = getSectionForPath(pathname, sections)
  if (!section) return []

  const trail: CrumbItem[] = [{ label: section.label, path: section.path }]
  const activePath = getActiveChildPath(pathname, section)
  if (!activePath) return trail

  const chain: NavChild[] = []
  const walk = (items: NavChild[], ancestors: NavChild[]): boolean =>
    items.some(child => {
      if (child.path === activePath) {
        chain.push(...ancestors, child)
        return true
      }
      return child.children ? walk(child.children, [...ancestors, child]) : false
    })
  walk(section.children, [])

  // 섹션과 첫 child 의 이름이 같으면 같은 말을 두 번 쓰지 않는다.
  for (const child of chain) {
    if (trail.some(item => item.label === child.label)) continue
    trail.push({ label: child.label, path: child.path })
  }
  return trail
}
