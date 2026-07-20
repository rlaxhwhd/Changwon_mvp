# src_admin 아이콘 → react-icons(Lucide) 전면 교체 — UI 스펙 (역할: counsel)

> **진실의 원천.** 상담사 포털(`src_admin/`)의 모든 Font Awesome 아이콘을 **react-icons의 Lucide 세트(`react-icons/lu`)** 로 교체한다. design.png 아이콘 규격(Outline·2px·라운드 캡)과 일치.
> react-icons 5.7.0 **이미 설치됨.** 학생 포털(`src_v2/`)·구버전(`src_v1/`)은 **손대지 말 것** — Font Awesome 계속 사용하므로 `@fortawesome` 의존성·CSS 제거 금지.

## 범위
- `src_admin/` 전용. 인라인 `<i className="fa-solid|fa-regular fa-*">` **163곳** + 데이터 문자열 아이콘(navConfig 19 + dashboard 1) + `i` 겨냥 CSS 25곳.
- **완료 기준: `grep -rn "fa-" src_admin` 결과 0건** (인라인·데이터·CSS·주석 전부). Lucide 미사용 잔재 없음.

## 1) 인라인 아이콘 교체 규칙
`<i className="fa-solid fa-inbox" />` → `<LuInbox />` (아래 매핑표).
- 각 파일 상단에 사용하는 아이콘만 **named import**: `import { LuInbox, LuSearch } from 'react-icons/lu'`.
- **fa- 외 추가 클래스는 보존**: `<i className="fa-solid fa-plus btn-ic" />` → `<LuPlus className="btn-ic" />` (CSS 훅 유지).
- 크기·색은 그대로 상속됨: Lucide svg는 `1em×1em`이라 부모 `font-size`로 크기, `stroke="currentColor"`라 부모 `color`로 색 → 별도 props 불필요(특수 케이스만 `size`/`className`).
- **동적 클래스** `fa-chevron-${expanded ? 'down' : 'right'}` 류: 삼항으로 컴포넌트 분기 `{expanded ? <LuChevronDown/> : <LuChevronRight/>}`.
- `aria-hidden` 등 접근성 속성은 유지(react-icons에 `aria-hidden` prop 전달 가능).

## 2) 데이터 문자열 아이콘 (navConfig.ts, dashboard)
`icon: 'fa-inbox'`(string) 형태를 **Lucide 컴포넌트 참조**로 변경.
- `navConfig.ts`: `icon` 필드 타입을 `string` → `IconType`(`import type { IconType } from 'react-icons'`)로. 값은 `icon: LuInbox`(컴포넌트 자체, JSX 아님). 상단에 필요한 Lu* import.
- 렌더 사이트(`GNB.tsx`·`SectionSidebar.tsx`)에서 `<i className={`fa-solid ${item.icon}`} />` → `const Icon = item.icon; <Icon />` (또는 `{item.icon && <item.icon />}`). 기존 아이콘 래퍼 클래스(`gnb-*-icon` 등)는 부모 span/엘리먼트에 유지.
- `data/schema/dashboard.ts` 또는 `data/dashboard.ts`의 fa- 문자열도 동일 처리(컴포넌트 참조 + 렌더 사이트 수정). fa- 문자열 잔재 0.

## 3) CSS 선택자 수정 (`src_admin/index.css`)
FA `<i>`가 Lucide `<svg>`가 되므로, **`i` 요소를 겨냥하던 선택자 전부 `svg`로 변경**(색·여백·크기 유지). `font-size`는 svg의 em 크기를 정하므로 그대로 작동. 대상(선택자의 `i` → `svg`):
`.admin-card-head h2 i`, `.admin-empty i`, `.admin-tab i`, `.admin-search i`, `.admin-save-hint i`, `.admin-request-method i`, `.admin-request-slot i`, `.admin-session-block h4 i`, `.admin-history-comment i`, `.admin-record-topic i`, `.admin-record-item-topic i`, `.admin-record-label i`, `.admin-focus-inline i`, `.admin-perm-banner i`, `.admin-detail-note i`, `.admin-gap-figs i`, `.admin-penalty-entry-kind i`, `.admin-date-pill i`, `.admin-kpi-delta i`, `.counsel-filter-search > i`, `.counsel-request-topic-cell.is-expandable i`, `.counsel-ai-comment i`(+`.is-coach i`), `.counsel-chatbot-fab.is-open i`, `.counsel-request-empty i`.
- 규칙: **src_admin/index.css에서 아이콘 `<i>`를 겨냥하는 모든 규칙의 `i`를 `svg`로.** (이탤릭 텍스트용 `i`는 없음 — 전부 아이콘.)
- `SectionSidebar.css`엔 `i` 선택자 없음(확인됨).

## 4) 검증된 fa → Lucide 매핑 (react-icons 5.7.0에서 export 실존 확인 완료)

| fa | Lucide | | fa | Lucide |
|---|---|---|---|---|
| fa-arrow-down | LuArrowDown | | fa-hourglass-half | LuHourglass |
| fa-arrow-left | LuArrowLeft | | fa-house | LuHouse |
| fa-arrow-right | LuArrowRight | | fa-id-badge | LuContact |
| fa-arrow-right-long | LuMoveRight | | fa-id-card | LuIdCard |
| fa-arrow-up | LuArrowUp | | fa-inbox | LuInbox |
| fa-ban | LuBan | | fa-lightbulb | LuLightbulb |
| fa-bell | LuBell | | fa-list | LuList |
| fa-book | LuBook | | fa-list-check | LuListChecks |
| fa-briefcase | LuBriefcase | | fa-lock | LuLock |
| fa-building-user | LuBuilding2 | | fa-magnifying-glass | LuSearch |
| fa-bullhorn | LuMegaphone | | fa-paper-plane | LuSend |
| fa-bullseye | LuTarget | | fa-pen | LuPen |
| fa-calendar | LuCalendar | | fa-pen-ruler | LuPencilRuler |
| fa-calendar-check | LuCalendarCheck | | fa-pen-to-square | LuSquarePen |
| fa-calendar-days | LuCalendarDays | | fa-plus | LuPlus |
| fa-calendar-xmark | LuCalendarX | | fa-quote-left | LuQuote |
| fa-chart-line | LuChartLine | | fa-robot | LuBot |
| fa-chart-pie | LuChartPie | | fa-rocket | LuRocket |
| fa-chart-simple | LuChartColumn | | fa-rotate-left | LuRotateCcw |
| fa-check | LuCheck | | fa-route | LuRoute |
| fa-chevron-down | LuChevronDown | | fa-scale-balanced | LuScale |
| fa-chevron-left | LuChevronLeft | | fa-screwdriver-wrench | LuWrench |
| fa-chevron-right | LuChevronRight | | fa-seedling | LuSprout |
| fa-chevron-up | LuChevronUp | | fa-star | LuStar |
| fa-circle-check | LuCircleCheck | | fa-trash | LuTrash2 |
| fa-circle-info | LuInfo | | fa-triangle-exclamation | LuTriangleAlert |
| fa-circle-question | LuCircleHelp | | fa-trophy | LuTrophy |
| fa-clipboard-check | LuClipboardCheck | | fa-user | LuUser |
| fa-clock | LuClock | | fa-user-check | LuUserCheck |
| fa-clock-rotate-left | LuHistory | | fa-user-graduate | LuGraduationCap |
| fa-comment-dots | LuMessageSquareMore | | fa-user-group | LuUsers |
| fa-comments | LuMessagesSquare | | fa-user-slash | LuUserX |
| fa-cubes | LuBoxes | | fa-user-tie | LuUserRound |
| fa-diagram-project | LuWorkflow | | fa-users | LuUsers |
| fa-download | LuDownload | | fa-xmark | LuX |
| fa-ellipsis-vertical | LuEllipsisVertical | | fa-gear | LuSettings |
| fa-eye | LuEye | | fa-graduation-cap | LuGraduationCap |
| fa-face-frown | LuFrown | | fa-filter | LuFilter |
| fa-file-lines | LuFileText | | fa-folder-open | LuFolderOpen |
| fa-floppy-disk | LuSave | | fa-hand | LuHand |
| fa-heart | LuHeart | | fa-headset | LuHeadset |

> **매핑에 없는 fa가 나오면** 임의 생성 금지 — 팀장에게 보고. (위 82종이 전수. `fa-chevron-`(잘린 것)은 동적 케이스로 §1 삼항 처리.)

## 하지 말 것
- `src_v2/`·`src_v1/` 변경 ✗, `@fortawesome` 제거 ✗ (학생/구버전이 사용).
- 디자인 토큰(:root) 변경 ✗. 아이콘 크기 임의 확대/축소 ✗(기존 font-size 유지).
- 존재 안 하는 Lu* 이름 사용 ✗ (매핑표만).
- 새 래퍼 컴포넌트 남발 ✗ — 직접 Lucide 컴포넌트 사용. (단 navConfig 렌더는 `const Icon = item.icon` 패턴 허용.)

## 완료 기준 (verify)
1. `grep -rn "fa-" src_admin` → **0건**.
2. `npx tsc --noEmit` 통과 + `npm run build` 성공(존재 안 하는 아이콘 import 시 빌드 실패로 잡힘).
3. 아이콘이 이전과 같은 자리·의미로 렌더(inbox=접수함, search=검색 등 의미 보존).
4. FA CSS import 잔재 점검: src_admin 진입(main.tsx/admin.html)에서 FA를 더는 안 쓰면 해당 import 제거 가능(선택). 단 fa- 0 확인 후에만.
