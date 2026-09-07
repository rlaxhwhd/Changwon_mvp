import { Outlet } from 'react-router-dom'
import GNB from './GNB'
import Chatbot from './Chatbot'
import ScrollToTop from './ScrollToTop'
import SiteFooter from '../../src_v2/components/SiteFooter'
import { PageCrumbProvider } from './PageCrumb'

// 교직원 포털 공통 셸 — 상단바 + 가운데 정렬 본문 + 푸터.
// 좌측 섹션 사이드바는 제거됐다(홈 /admin 과 같은 1단 레이아웃). 하위 메뉴는 GNB 드롭다운이 갖는다.
// 본문 폭·여백은 .admin-page 가 GNB(.gnb-in)와 같은 축에 맞춘다 → index.css 참조.
// 푸터는 학생 포털과 같은 컴포넌트다(src_v2/components/SiteFooter) — 두 포털이 갈리면 안 된다.
export default function Layout() {
  return (
    <div className="admin-layout">
      <ScrollToTop />
      <GNB />
      <main className="admin-main">
        <div className="admin-main-shell">
          <div className="admin-content">
            {/* 경로 표시는 서브페이지 맨 위에 한 번만 그린다(홈 '/' 은 제외).
                페이지 헤더 안에 각자 만들지 말 것 — 규격이 갈린다. */}
            <PageCrumbProvider>
              <Outlet />
            </PageCrumbProvider>
            <SiteFooter />
          </div>
        </div>
      </main>
      <Chatbot />
    </div>
  )
}
