// 아이콘 스프라이트 — 시안(stu_v1 / stu_lounge)의 아웃라인 SVG 심볼 체계를 그대로 옮긴 것.
// 심볼 정의는 <IconSprite />가 문서에 한 번만 깔고, 화면은 <Icon name="check" />로 참조한다.
// stroke/fill은 심볼에 박지 않고 .icon 클래스(index.css)에서 일괄 지정한다 → 색은 항상 currentColor 상속.

export type IconName =
  | 'search' | 'bell' | 'user' | 'menu' | 'x' | 'layout' | 'scan' | 'message'
  | 'route' | 'calendar' | 'briefcase' | 'spark' | 'chevron-down' | 'chevron-left'
  | 'chevron-right' | 'arrow' | 'pause' | 'play' | 'check' | 'target' | 'flame'
  | 'chart' | 'clock' | 'external' | 'location' | 'moon' | 'lock' | 'award'
  | 'users' | 'calendar-check' | 'download'

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={className ? `icon ${className}` : 'icon'} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  )
}

/** 문서당 1회만 렌더 — Layout / Landing 최상단. */
export function IconSprite() {
  return (
    <svg className="sr-only" aria-hidden="true">
      <symbol id="i-search" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </symbol>
      <symbol id="i-bell" viewBox="0 0 24 24">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </symbol>
      <symbol id="i-user" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </symbol>
      <symbol id="i-menu" viewBox="0 0 24 24">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </symbol>
      <symbol id="i-x" viewBox="0 0 24 24">
        <path d="m6 6 12 12M18 6 6 18" />
      </symbol>
      <symbol id="i-layout" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </symbol>
      <symbol id="i-scan" viewBox="0 0 24 24">
        <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
        <circle cx="12" cy="11" r="3" />
        <path d="M7 18c1.4-2 3-3 5-3s3.6 1 5 3" />
      </symbol>
      <symbol id="i-message" viewBox="0 0 24 24">
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        <path d="M8 10h8M8 14h5" />
      </symbol>
      <symbol id="i-route" viewBox="0 0 24 24">
        <circle cx="6" cy="19" r="2" />
        <circle cx="18" cy="5" r="2" />
        <path d="M8 19h3a3 3 0 0 0 3-3V8a3 3 0 0 1 3-3h-1" />
      </symbol>
      <symbol id="i-calendar" viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </symbol>
      {/* 달력 + 체크 — 비교과 카드 「진행기간」. 위 달력과 같은 틀에 체크만 얹었다. */}
      <symbol id="i-calendar-check" viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
        <path d="m9 15.5 2 2 4-4" />
      </symbol>
      {/* 내려받기 — 수료증 다운로드 등. 화살표 + 받침. */}
      <symbol id="i-download" viewBox="0 0 24 24">
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </symbol>
      {/* 사람 둘 — 비교과 카드 「정원」. i-user 의 선 굵기·비율을 따른다. */}
      <symbol id="i-users" viewBox="0 0 24 24">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
        <path d="M17.5 13.6a6.5 6.5 0 0 1 4 6.4" />
      </symbol>
      <symbol id="i-briefcase" viewBox="0 0 24 24">
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
      </symbol>
      <symbol id="i-spark" viewBox="0 0 24 24">
        <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
      </symbol>
      <symbol id="i-chevron-down" viewBox="0 0 24 24">
        <path d="m6 9 6 6 6-6" />
      </symbol>
      <symbol id="i-chevron-left" viewBox="0 0 24 24">
        <path d="m15 18-6-6 6-6" />
      </symbol>
      <symbol id="i-chevron-right" viewBox="0 0 24 24">
        <path d="m9 18 6-6-6-6" />
      </symbol>
      <symbol id="i-arrow" viewBox="0 0 24 24">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </symbol>
      <symbol id="i-pause" viewBox="0 0 24 24">
        <path d="M9 5v14M15 5v14" />
      </symbol>
      <symbol id="i-play" viewBox="0 0 24 24">
        <path d="m8 5 11 7-11 7z" />
      </symbol>
      <symbol id="i-check" viewBox="0 0 24 24">
        <path d="m5 12 4 4L19 6" />
      </symbol>
      <symbol id="i-target" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </symbol>
      <symbol id="i-flame" viewBox="0 0 24 24">
        <path d="M12 22c4 0 7-3 7-7 0-5-4-8-6-12 0 4-3 6-5 8-1.5 1.5-3 3.5-3 6a7 7 0 0 0 7 5z" />
        <path d="M10 18c0-2 2-3 2-5 2 2 3 3 3 5a3 3 0 0 1-5 0z" />
      </symbol>
      <symbol id="i-chart" viewBox="0 0 24 24">
        <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
      </symbol>
      <symbol id="i-clock" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </symbol>
      <symbol id="i-external" viewBox="0 0 24 24">
        <path d="M14 4h6v6M20 4l-9 9" />
        <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
      </symbol>
      <symbol id="i-location" viewBox="0 0 24 24">
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z" />
        <circle cx="12" cy="10" r="2" />
      </symbol>
      <symbol id="i-moon" viewBox="0 0 24 24">
        <path d="M20 15.4A9 9 0 0 1 8.6 4 9 9 0 1 0 20 15.4" />
      </symbol>
      <symbol id="i-lock" viewBox="0 0 24 24">
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" />
      </symbol>
      <symbol id="i-award" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="5" />
        <path d="m8.5 12-1 9 4.5-2.5 4.5 2.5-1-9M10 8l1.3 1.3L14 6.5" />
      </symbol>
    </svg>
  )
}
