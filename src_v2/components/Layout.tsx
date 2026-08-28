import { Outlet, useLocation } from 'react-router-dom'
import GNB from './GNB'
import ScrollToTop from './ScrollToTop'
import SiteFooter from './SiteFooter'
import { IconSprite } from './Icon'

// 시안 골격 — topbar(sticky) → main(1440px 가운데 정렬) → site-footer.
// 좌측 사이드바 없음. 푸터는 전 페이지 공통이라 여기 한 곳에만 둔다.
export default function Layout() {
  const { pathname } = useLocation()
  const section = pathname.startsWith('/diagnosis') ? 'diagnosis'
    : pathname.startsWith('/counsel') ? 'counsel'
      : pathname.startsWith('/roadmap') ? 'roadmap'
        : pathname.startsWith('/growth') ? 'growth'
          : pathname.startsWith('/jobs') ? 'jobs'
            : pathname.startsWith('/mypage') ? 'mypage'
              : pathname.startsWith('/lounge') ? 'lounge'
                : 'main'

  return (
    <div className={`v2-layout v2-section-${section}`}>
      <IconSprite />
      <ScrollToTop />
      <GNB />
      <main className="v2-main">
        <div className="v2-content">
          <Outlet />
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
