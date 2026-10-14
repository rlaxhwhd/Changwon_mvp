import { Link } from 'react-router-dom'
import './StageLockNotice.css'

// ─────────────────────────────────────────────────────────────────────────
// 준비중 안내 — 아직 완성되지 않은 화면을 라우트에서 대신 그린다.
// 실제 화면 컴포넌트를 렌더하지 않으므로 그 화면의 데이터 조회도 일어나지 않는다.
// 메뉴 쪽 표시는 navConfig 의 comingSoon 이 같은 경로를 들고 있다 — 화면을 열 때 둘 다 푼다.
// ─────────────────────────────────────────────────────────────────────────

export default function ComingSoon({ title }: { title: string }) {
  return (
    <section className="lock-notice" role="status">
      <span className="lock-notice-icon" aria-hidden="true"><i className="fa-solid fa-lock" /></span>
      <h2>{title}</h2>
      <p className="lock-notice-why">준비중입니다. 서비스가 열리면 이 메뉴에서 바로 이용할 수 있습니다.</p>
      <Link className="lock-notice-cta" to="/main">
        메인으로 가기 <i className="fa-solid fa-arrow-right" aria-hidden="true" />
      </Link>
    </section>
  )
}
