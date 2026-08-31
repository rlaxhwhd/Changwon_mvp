import type { IconName } from './Icon'

export interface NavChild {
  label: string
  path: string
  icon: string
  minGrade?: number
  children?: NavChild[]
}

export interface NavSection {
  id: string
  label: string
  basePaths: string[]
  path?: string
  /** 상단바 아이콘 — SVG 스프라이트 심볼 이름 (components/Icon.tsx) */
  icon: IconName
  children: NavChild[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'lounge',
    label: 'AI 커리어 라운지',
    basePaths: ['/lounge'],
    path: '/lounge',
    icon: 'layout',
    // 라운지는 한 페이지짜리 대시보드다 — 하위메뉴는 다른 화면이 아니라 이 페이지의 카드로 가는
    // 앵커다. 라벨은 카드 제목과 같게 두고(다르면 눌러서 도착한 곳이 딴 이름이 된다),
    // 순서도 화면에 보이는 순서를 따른다. 스크롤은 ScrollToTop 이 hash 를 보고 처리한다.
    children: [
      { label: '나의 진로 여정', path: '/lounge#journey', icon: 'fa-route' },
      { label: '목표 달성 계획', path: '/lounge#goal', icon: 'fa-bullseye' },
      { label: '이번 주 할 일', path: '/lounge#todo', icon: 'fa-list-check' },
      { label: '나를 위한 AI추천', path: '/lounge#recommend', icon: 'fa-wand-magic-sparkles' },
      { label: '6대 핵심역량', path: '/lounge#competency', icon: 'fa-chart-bar' },
      { label: '진단 결과', path: '/lounge#diagnosis', icon: 'fa-chart-pie' },
      { label: '상담 현황', path: '/lounge#counseling-status', icon: 'fa-comments' },
    ],
  },
  {
    id: 'diagnosis',
    label: '진단센터',
    basePaths: ['/diagnosis'],
    icon: 'scan',
    children: [
      { label: '진단검사 결과', path: '/diagnosis/employment', icon: 'fa-chart-simple' },
    ],
  },
  {
    id: 'counsel',
    label: '상담센터',
    basePaths: ['/counsel'],
    icon: 'message',
    children: [
      { label: '진로취업상담', path: '/counsel/career', icon: 'fa-briefcase' },
      { label: '심리상담', path: '/counsel/psych', icon: 'fa-heart' },
      { label: '지도교수상담', path: '/counsel/professor', icon: 'fa-user-tie' },
      { label: '상담 현황', path: '/counsel/record', icon: 'fa-clipboard-list' },
    ],
  },
  {
    id: 'roadmap',
    label: '진로취업 로드맵',
    basePaths: ['/roadmap'],
    icon: 'route',
    children: [
      { label: 'AI 진로로드맵', path: '/roadmap/ai', icon: 'fa-route' },
      { label: 'AI 직무 로드맵', path: '/roadmap/skill-tree', icon: 'fa-sitemap' },
      { label: '최종 로드맵', path: '/roadmap/final', icon: 'fa-bullseye' },
    ],
  },
  {
    id: 'program-apply',
    label: '비교과 프로그램 신청',
    basePaths: ['/growth/program'],
    path: '/growth/program',
    icon: 'calendar',
    children: [
      { label: '비교과 프로그램 신청', path: '/growth/program', icon: 'fa-clipboard-list' },
    ],
  },
  {
    id: 'growth',
    label: '내 성장',
    basePaths: ['/growth'],
    icon: 'target',
    children: [
      { label: '홈대시보드', path: '/growth', icon: 'fa-house' },
      { label: '로드맵 진행 현황', path: '/growth/roadmap-status', icon: 'fa-route' },
      { label: '퀘스트보드', path: '/growth/quest', icon: 'fa-list-check' },
      { label: '오늘의 성장퀘스트', path: '/growth/mission', icon: 'fa-bullseye' },
      { label: '일일퀘스트 기록노트', path: '/growth/mission-log', icon: 'fa-calendar-check' },
      { label: '성장경험일지', path: '/growth/journal', icon: 'fa-book-open' },
    ],
  },
  {
    id: 'jobs',
    label: '취업지원',
    basePaths: ['/jobs'],
    path: '/jobs',
    icon: 'briefcase',
    children: [
      { label: '교내 채용공고', path: '/jobs', icon: 'fa-building-user' },
      { label: '외부 채용공고', path: '/jobs/external', icon: 'fa-globe' },
      { label: 'AI 맞춤채용', path: '/jobs/joblist', icon: 'fa-briefcase' },
      {
        label: 'AI 자소서/면접',
        path: '/jobs/home',
        icon: 'fa-file-lines',
        children: [
          { label: 'AI 자소서 생성', path: '/jobs/home/resume', icon: 'fa-wand-magic-sparkles' },
          { label: 'AI 컨설팅', path: '/jobs/home/consulting', icon: 'fa-magnifying-glass-chart' },
        ],
      },
    ],
  },
  {
    id: 'mypage',
    label: '마이페이지',
    basePaths: ['/mypage'],
    icon: 'user',
    children: [
      { label: '포트폴리오', path: '/mypage/portfolio', icon: 'fa-folder-open', minGrade: 4 },
      { label: '비교과프로그램 현황', path: '/mypage/programs', icon: 'fa-clipboard-list' },
      { label: '추천채용 지원 내역', path: '/mypage/applications', icon: 'fa-file-signature' },
      { label: '출석 기록', path: '/mypage/attendance', icon: 'fa-calendar-check' },
      { label: '공지사항', path: '/mypage/notices', icon: 'fa-bullhorn' },
    ],
  },
]

export function getVisibleNavChildren(children: NavChild[], grade: number): NavChild[] {
  return children
    .filter(child => child.path !== '/roadmap/ai' && child.path !== '/roadmap/final')
    .filter(child => child.minGrade === undefined || grade >= child.minGrade)
    .map(child => ({
      ...child,
      children: child.children ? getVisibleNavChildren(child.children, grade) : undefined,
    }))
}

export function matchesPath(pathname: string, targetPath: string) {
  if (targetPath === '/') return pathname === '/'
  const base = targetPath.split('#')[0]
  return pathname === base || pathname.startsWith(`${base}/`)
}

export function getSectionForPath(pathname: string) {
  return NAV_SECTIONS.find(section =>
    section.basePaths.some(basePath => matchesPath(pathname, basePath)),
  )
}

function flattenChildren(children: NavChild[]): NavChild[] {
  return children.flatMap(child => [child, ...(child.children ? flattenChildren(child.children) : [])])
}

/**
 * 섹션의 children(중첩 포함) 중 현재 경로에 가장 구체적으로 매칭되는 항목의 path를 반환.
 * 여러 children이 prefix로 매칭될 때(예: '/jobs/home'과 '/jobs/home/resume') 가장 긴 path를 택해
 * 상위 경로 항목이 항상 활성화되는 문제를 방지한다.
 * hash 기반 sub-tab(예: '/lounge#report')도 지원: 현재 hash가 있으면 hash 일치 항목 우선.
 */
export function getActiveChildPath(pathname: string, section: NavSection, hash = ''): string | undefined {
  const flat = flattenChildren(section.children)
  const currentFull = pathname + hash

  const exact = flat.find(child => child.path === currentFull)
  if (exact) return exact.path

  const matches = flat.filter(child => matchesPath(pathname, child.path))
  if (matches.length === 0) return undefined

  if (!hash) {
    const firstHashChild = matches.find(child => child.path.includes('#'))
    if (firstHashChild) return firstHashChild.path
  }

  return matches.reduce((best, child) => (child.path.length > best.path.length ? child : best)).path
}

/** 경로 표시(빵부스러기) 한 칸. path 가 없으면 링크가 아니라 현재 위치다. */
export interface CrumbItem {
  label: string
  path?: string
}

/**
 * 현재 경로의 상위 계층을 상단바 구성(NAV_SECTIONS)에서 파생한다.
 * 예: '/counsel/career' → [상담센터, 진로취업상담]
 *
 * ★ 라벨을 화면에 다시 적지 않는다 — 상단바 이름이 바뀌면 경로 표시도 같이 바뀌어야 한다.
 *   중첩 children(예: 취업지원 > AI 자소서/면접 > AI 자소서 생성)도 조상까지 모두 담는다.
 */
export function getCrumbTrail(pathname: string): CrumbItem[] {
  const section = getSectionForPath(pathname)
  if (!section) return []

  const trail: CrumbItem[] = [{ label: section.label, path: section.path }]

  // 활성 child 를 찾은 뒤, 그 조상 체인을 되짚어 담는다.
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

  // 섹션과 첫 child 의 이름이 같으면(예: 비교과 프로그램 신청) 같은 말을 두 번 쓰지 않는다.
  for (const child of chain) {
    if (trail.some(item => item.label === child.label)) continue
    trail.push({ label: child.label, path: child.path.split('#')[0] })
  }
  return trail
}
