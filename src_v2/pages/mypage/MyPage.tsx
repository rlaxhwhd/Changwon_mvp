export default function MyPage() {
  return (
    <div className="v2-page">
      <div className="page-stub">
        <i className="fa-solid fa-user page-stub-icon" />
        <h1 className="page-stub-title">마이페이지</h1>
        <p style={{ color: 'var(--color-text-sub)', fontSize: 14 }}>
          프로필·포트폴리오·수강내역·마일리지 관리
        </p>
        <span className="page-stub-path">/mypage</span>
      </div>
    </div>
  )
}
