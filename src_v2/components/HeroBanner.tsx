export default function HeroBanner() {
  return (
    <section className="hero-banner">
      <div className="hero-inner">
        <div className="hero-text">
          <p className="hero-sub">학생 여러분들의 성공적인 취업을 지원해요.</p>
          <h1 className="hero-title">
            국립창원대학교<br />드림캐치
          </h1>
        </div>
        <div className="hero-illust">
          {/* SVG 일러스트 대체 */}
          <svg viewBox="0 0 260 220" width="260" height="220" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* 책상 */}
            <rect x="80" y="150" width="140" height="8" rx="4" fill="#D1D5DB" />
            <rect x="100" y="158" width="8" height="40" rx="2" fill="#9CA3AF" />
            <rect x="192" y="158" width="8" height="40" rx="2" fill="#9CA3AF" />
            {/* 노트북 */}
            <rect x="110" y="120" width="80" height="30" rx="4" fill="#374151" />
            <rect x="115" y="124" width="70" height="22" rx="2" fill="#60A5FA" />
            <rect x="100" y="148" width="100" height="4" rx="2" fill="#6B7280" />
            {/* 사람 */}
            <circle cx="200" cy="95" r="18" fill="#FDE68A" />
            <rect x="188" y="113" width="24" height="38" rx="12" fill="#22C55E" />
            {/* 식물 */}
            <ellipse cx="60" cy="160" rx="12" ry="20" fill="#22C55E" opacity=".7" />
            <ellipse cx="50" cy="155" rx="10" ry="18" fill="#16A34A" opacity=".6" />
            <rect x="56" y="160" width="4" height="30" rx="2" fill="#15803D" />
            {/* 문서 아이콘 */}
            <rect x="130" y="70" width="24" height="30" rx="3" fill="#fff" stroke="#D1D5DB" strokeWidth="1.5" />
            <line x1="135" y1="79" x2="149" y2="79" stroke="#9CA3AF" strokeWidth="1.5" />
            <line x1="135" y1="85" x2="149" y2="85" stroke="#9CA3AF" strokeWidth="1.5" />
            <line x1="135" y1="91" x2="145" y2="91" stroke="#9CA3AF" strokeWidth="1.5" />
          </svg>
        </div>
      </div>
    </section>
  );
}
