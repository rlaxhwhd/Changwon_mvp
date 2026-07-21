import type { IconType } from 'react-icons'
import { LuBuilding2, LuCalendarDays, LuClipboardCheck, LuClock, LuGraduationCap, LuHeadset, LuHouse, LuIdCard, LuInbox, LuList, LuPlus, LuRoute, LuSettings, LuTable, LuUsers, LuUserX } from 'react-icons/lu'
// ─────────────────────────────────────────────────────────────────────────
// 상담사 포털 네비 단일 소스 (v2 navConfig 미러)
// Counsel_README §4 순서: 홈 → 상담 관리 → 학생 관리 → 로드맵 관리[진로]
//   → 채용공고[진로] → 설정
// [진로] 표시 섹션은 진로상담사(career) 전용 — 심리상담사면 숨긴다.
// ─────────────────────────────────────────────────────────────────────────
import type { CounselorRole } from '../data/schema/counselor'

export interface NavChild {
  label: string
  path: string
  icon: IconType
  children?: NavChild[]
}

export interface NavSection {
  id: string
  label: string
  basePaths: string[]
  /** 섹션 대표 경로 (없으면 첫 child) */
  path?: string
  icon: IconType
  /** 이 섹션이 요구하는 역할. 없으면 모든 역할에 노출. */
  requiresRole?: CounselorRole
  children: NavChild[]
}

const ALL_SECTIONS: NavSection[] = [
  {
    id: 'home',
    label: '홈',
    basePaths: ['/'],
    path: '/',
    icon: LuHouse,
    children: [],
  },
  {
    id: 'counsel',
    label: '상담 관리',
    basePaths: ['/counsel'],
    icon: LuHeadset,
    children: [
      { label: '신청 접수함', path: '/counsel/requests', icon: LuInbox },
      { label: '일정·예약', path: '/counsel/schedule', icon: LuCalendarDays },
      { label: '완료 상담 내역', path: '/counsel/records', icon: LuClipboardCheck },
    ],
  },
  {
    id: 'students',
    label: '학생 관리',
    basePaths: ['/students'],
    path: '/students',
    icon: LuUsers,
    children: [
      { label: '담당 학생 목록', path: '/students', icon: LuUsers },
    ],
  },
  {
    id: 'roadmap',
    label: '로드맵 관리',
    basePaths: ['/roadmap'],
    icon: LuRoute,
    requiresRole: 'career',
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
    requiresRole: 'career',
    children: [
      { label: '공고 목록', path: '/jobs', icon: LuList },
      { label: '공고 등록', path: '/jobs/new', icon: LuPlus },
    ],
  },
  {
    id: 'programs',
    label: '비교과 운영',
    basePaths: ['/programs'],
    icon: LuGraduationCap,
    requiresRole: 'career',
    children: [
      { label: '프로그램 목록', path: '/programs', icon: LuList },
      { label: '프로그램 관리', path: '/programs/manage', icon: LuTable },
      { label: '프로그램 등록', path: '/programs/new', icon: LuPlus },
      { label: '블랙리스트', path: '/programs/blacklist', icon: LuUserX },
    ],
  },
  {
    id: 'settings',
    label: '설정',
    basePaths: ['/settings'],
    path: '/settings',
    icon: LuSettings,
    children: [
      { label: '내 프로필', path: '/settings', icon: LuIdCard },
      { label: '가능 시간대', path: '/settings/availability', icon: LuClock },
    ],
  },
]

/** 역할에 노출되는 섹션만 반환 (requiresRole 필터) */
export function getNavSections(role: CounselorRole): NavSection[] {
  return ALL_SECTIONS.filter(s => !s.requiresRole || s.requiresRole === role)
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
