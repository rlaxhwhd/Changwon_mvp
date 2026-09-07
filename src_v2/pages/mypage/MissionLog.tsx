export default function MissionLog() {
  return (
    <div className="v2-page">
      <div className="page-stub">
        <i className="fa-solid fa-calendar-check page-stub-icon" />
        <h1 className="page-stub-title">일일퀘스트 기록</h1>
        <p style={{ color: 'var(--color-text-sub)', fontSize: 14 }}>
          토익 10단어 등 일일퀘스트 정답·오답 기록 (날짜별)
        </p>
        <span className="page-stub-path">/mypage/mission</span>
      </div>
    </div>
  )
}
