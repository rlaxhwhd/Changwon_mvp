import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getCrumbTrail } from './navConfig'

// ─────────────────────────────────────────────────────────────────────────
// 서브페이지 머리글 — 경로 표시 + 제목 + 설명. 전 서브페이지 공통.
// 기준 시안은 /counsel/career 다.
//
//   상담센터 › 진로취업상담 › 상담 신청
//   상담 신청
//   상담사를 선택하고 원하는 날짜와 시간을 선택해 주세요.
//
// 경로의 상위 계층은 상단바 구성(NAV_SECTIONS)에서 파생한다 — 라벨을 화면에 다시 적지 않는다.
// 제목·설명은 화면마다 다르므로 usePageHead 로 등록한다.
// Layout 이 한 번만 그리므로 페이지는 머리글 마크업을 갖지 않는다.
// ─────────────────────────────────────────────────────────────────────────

export interface PageHeadInfo {
  /** 화면 제목. 경로 표시의 마지막 칸으로도 쓰인다. */
  title?: string
  /** 이 화면이 무엇을 하는 곳인지 한 줄. */
  desc?: string
}

const HeadContext = createContext<(info: PageHeadInfo) => void>(() => {})

/**
 * 이 화면의 제목·설명을 등록한다. Layout 이 경로 표시 아래에 같은 규격으로 그린다.
 * 페이지가 자체 제목 마크업을 갖지 않도록 하는 것이 목적이다(규격이 갈리는 것을 막는다).
 */
export function usePageHead(title?: string, desc?: string): void {
  const setInfo = useContext(HeadContext)
  const info = useMemo(() => ({ title, desc }), [title, desc])
  useEffect(() => {
    setInfo(info)
    return () => setInfo({})
  }, [setInfo, info])
}

export function PageCrumbProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<PageHeadInfo>({})
  return (
    <HeadContext.Provider value={setInfo}>
      <PageHead info={info} />
      {children}
    </HeadContext.Provider>
  )
}

function PageHead({ info }: { info: PageHeadInfo }) {
  const { pathname } = useLocation()
  const trail = getCrumbTrail(pathname)
  if (trail.length === 0) return null

  // 띄어쓰기만 다른 같은 이름은 한 번만 쓴다('퀘스트보드' vs '퀘스트 보드').
  const same = (a: string, b: string) => a.replace(/\s+/g, '') === b.replace(/\s+/g, '')
  const items = info.title && !same(info.title, trail[trail.length - 1].label)
    ? [...trail, { label: info.title, path: undefined }]
    : trail

  return (
    <header className="v2-page-head v2-shell-head">
      <div>
        <nav className="v2-page-crumb v2-crumb-bar" aria-label="현재 위치">
          {items.map((item, index) => {
            const last = index === items.length - 1
            return (
              <span key={`${item.label}-${index}`} className="v2-crumb-item">
                {index > 0 && <i className="fa-solid fa-chevron-right" aria-hidden="true" />}
                {/* 마지막 칸은 현재 위치라 링크로 만들지 않는다. */}
                {item.path && !last
                  ? <Link to={item.path}>{item.label}</Link>
                  : <span aria-current={last ? 'page' : undefined}>{item.label}</span>}
              </span>
            )
          })}
        </nav>
        {info.title && <h1 className="v2-page-title">{info.title}</h1>}
        {info.desc && <p className="v2-page-desc">{info.desc}</p>}
      </div>
    </header>
  )
}
