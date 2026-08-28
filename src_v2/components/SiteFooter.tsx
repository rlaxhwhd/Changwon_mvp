// 시안(main.html / stu_dash.html)의 .site-footer — 전 페이지 공통. Layout 에서만 렌더한다.
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <img className="footer-logo" src="/logo-footer.png" alt="CWNU 국립창원대학교" />

        <nav className="footer-links" aria-label="푸터 메뉴">
          <a href="#privacy">개인정보처리방침</a>
          <a href="#email-reject">이메일무단수집거부</a>
        </nav>

        <div className="footer-info">
          <span><strong>E-MAIL</strong> cwjob@changwon.ac.kr</span>
          <span>51140 경상남도 창원시 의창구 창원대학로 20</span>
        </div>

        <p className="footer-copyright">
          COPYRIGHT CHANGWON NATIONAL UNIVERSITY. ALL RIGHTS RESERVED.
        </p>
      </div>
    </footer>
  )
}
