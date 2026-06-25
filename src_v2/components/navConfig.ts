export interface NavChild {
  label: string
  path: string
  icon: string
  children?: NavChild[]
}

export interface NavSection {
  id: string
  label: string
  basePaths: string[]
  path?: string
  icon: string
  children: NavChild[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'lounge',
    label: 'AI 커리어 라운지',
    basePaths: ['/lounge'],
    path: '/lounge',
    icon: 'fa-comments',
    children: [
      { label: '종합 분석 리포트', path: '/lounge#report', icon: 'fa-clipboard-list' },
      { label: '역량 비교 분석', path: '/lounge#competency', icon: 'fa-chart-bar' },
      { label: '진단검사 결과', path: '/lounge#tests', icon: 'fa-chart-pie' },
      { label: '상담 내역', path: '/lounge#counsel', icon: 'fa-comments' },
      { label: 'TOEIC 학습 분석', path: '/lounge#toeic', icon: 'fa-book' },
      { label: 'AI 액션 로드맵', path: '/lounge#roadmap', icon: 'fa-wand-magic-sparkles' },
    ],
  },
  {
    id: 'diagnosis',
    label: '진단센터',
    basePaths: ['/diagnosis'],
    icon: 'fa-clipboard-check',
    children: [
      { label: '진단검사 결과', path: '/diagnosis/employment', icon: 'fa-chart-simple' },
    ],
  },
  {
    id: 'counsel',
    label: '상담센터',
    basePaths: ['/counsel'],
    icon: 'fa-headset',
    children: [
      { label: '진로취업상담', path: '/counsel/career', icon: 'fa-briefcase' },
      { label: '심리상담', path: '/counsel/psych', icon: 'fa-heart' },
      { label: '지도교수상담', path: '/counsel/professor', icon: 'fa-user-tie' },
    ],
  },
  {
    id: 'roadmap',
    label: '진로취업 로드맵',
    basePaths: ['/roadmap'],
    icon: 'fa-route',
    children: [
      { label: 'AI 진로로드맵', path: '/roadmap/ai', icon: 'fa-route' },
      { label: 'AI 직무 로드맵', path: '/roadmap/skill-tree', icon: 'fa-sitemap' },
      { label: '최종 로드맵', path: '/roadmap/final', icon: 'fa-bullseye' },
    ],
  },
  {
    id: 'growth',
    label: '내 성장',
    basePaths: ['/growth'],
    icon: 'fa-seedling',
    children: [
      { label: '홈대시보드', path: '/growth', icon: 'fa-house' },
      { label: '로드맵 진행 현황', path: '/growth/roadmap-status', icon: 'fa-route' },
      { label: '비교과프로그램신청', path: '/growth/program', icon: 'fa-clipboard-list' },
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
    icon: 'fa-building-user',
    children: [
      { label: '채용공고', path: '/jobs', icon: 'fa-building-user' },
      { label: '취업예측분석', path: '/jobs/prediction', icon: 'fa-chart-line' },
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
    icon: 'fa-user',
    children: [
      { label: '포트폴리오', path: '/mypage/portfolio', icon: 'fa-folder-open' },
      { label: '비교과프로그램 현황', path: '/mypage/programs', icon: 'fa-clipboard-list' },
      { label: '상담 현황', path: '/mypage/counsel', icon: 'fa-headset' },
      { label: '출석 기록', path: '/mypage/attendance', icon: 'fa-calendar-check' },
    ],
  },
]

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
