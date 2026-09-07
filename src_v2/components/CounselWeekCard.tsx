import { getMyCounselWeek } from '../data/counselRequestsRead'
import './CounselWeekCard.css'

/**
 * 「이번 주 상담내역」 — 상담 탭바와 캘린더 사이에 놓는 요약 카드.
 * 유형(진로취업·심리·교수)을 가리지 않고 내 이번 주 일정을 모두 보여준다.
 * 집계는 데이터층(getMyCounselWeek)이 끝낸다 — 여기서는 렌더만 한다.
 */
export default function CounselWeekCard() {
  const entries = getMyCounselWeek()

  return (
    <section className="cwk-card" aria-label="이번 주 상담내역">
      <div className="cwk-head">
        <i className="fa-regular fa-calendar-check" aria-hidden="true" />
        <h2>이번 주 상담내역</h2>
        {entries.length > 0 && <span className="cwk-count">{entries.length}건</span>}
      </div>

      {entries.length === 0 ? (
        <p className="cwk-empty">이번 주 상담 일정이 없습니다.</p>
      ) : (
        <ul className="cwk-list">
          {entries.map(entry => (
            <li key={entry.id} className="cwk-item" data-type={entry.type}>
              <span className="cwk-type">{entry.typeLabel}</span>
              <span className="cwk-when">
                <i className="fa-regular fa-calendar-days" aria-hidden="true" />
                {entry.dayLabel} {entry.time}
              </span>
              <span className="cwk-who">
                <i className="fa-regular fa-user" aria-hidden="true" />
                {entry.partner}
              </span>
              <span className="cwk-place">
                <i className="fa-solid fa-location-dot" aria-hidden="true" />
                {entry.place}
              </span>
              <span className="cwk-status" data-tone={entry.tone}>{entry.status}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
