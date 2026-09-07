import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LuChevronRight } from 'react-icons/lu'
import { getCrumbTrail, getNavSections } from './navConfig'
import { getActiveUser } from '../data/staff'

// ─────────────────────────────────────────────────────────────────────────
// 경로 표시(빵부스러기) — 교직원 포털 전 서브페이지 공통.
// 규격은 학생 포털(src_v2/components/PageCrumb) 기준 시안 /counsel/career 와 같다.
//
// 상위 계층은 상단바 구성(navConfig)에서 파생한다 — 화면에 라벨을 다시 적지 않는다.
// 마지막 칸(그 화면 고유의 이름)만 페이지가 usePageCrumbLeaf 로 알려 준다.
// Layout 이 한 번만 그리므로 페이지마다 마크업을 복사하지 않는다.
// ─────────────────────────────────────────────────────────────────────────

const LeafContext = createContext<(leaf: string | undefined) => void>(() => {})

/** 이 화면 고유의 마지막 칸을 등록한다(상단바 항목 이름과 다를 때만 쓴다). */
export function usePageCrumbLeaf(leaf?: string): void {
  const setLeaf = useContext(LeafContext)
  useEffect(() => {
    setLeaf(leaf)
    return () => setLeaf(undefined)
  }, [setLeaf, leaf])
}

export function PageCrumbProvider({ children }: { children: ReactNode }) {
  const [leaf, setLeaf] = useState<string | undefined>(undefined)
  return (
    <LeafContext.Provider value={setLeaf}>
      <PageCrumb leaf={leaf} />
      {children}
    </LeafContext.Provider>
  )
}

function PageCrumb({ leaf }: { leaf?: string }) {
  const { pathname } = useLocation()
  const sections = getNavSections(getActiveUser().role)
  const trail = getCrumbTrail(pathname, sections)
  // 홈(/)은 서브페이지가 아니다 — 경로 표시를 두지 않는다.
  if (trail.length === 0 || pathname === '/') return null

  // 띄어쓰기만 다른 같은 이름은 한 번만 쓴다.
  const same = (a: string, b: string) => a.replace(/\s+/g, '') === b.replace(/\s+/g, '')
  const items = leaf && !same(leaf, trail[trail.length - 1].label)
    ? [...trail, { label: leaf, path: undefined }]
    : trail

  return (
    <nav className="admin-crumb-bar" aria-label="현재 위치">
      {items.map((item, index) => {
        const last = index === items.length - 1
        return (
          <span key={`${item.label}-${index}`} className="admin-crumb-item">
            {index > 0 && <LuChevronRight className="admin-crumb-sep" aria-hidden="true" />}
            {/* 마지막 칸은 현재 위치라 링크로 만들지 않는다. */}
            {item.path && !last
              ? <Link to={item.path}>{item.label}</Link>
              : <span aria-current={last ? 'page' : undefined}>{item.label}</span>}
          </span>
        )
      })}
    </nav>
  )
}
