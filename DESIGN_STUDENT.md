# DESIGN_STUDENT.md — 학생 화면 전용 디자인 가이드

> **소유 범위:** `src_v2/`(학생 포털)만. 교직원 포털(`src_admin/`)은 `DESIGN.md`가 계속 소유한다.
> **소스 시안:** `stu_v1.jsx`(로그인 성공 → 메인 홈) · `stu_lounge.jsx`(AI 커리어 라운지)
> **방법론:** MengTo `design-taste-frontend` (Taste) 스킬을 **감사 렌즈**로 적용. Taste는 새 팔레트를 만들지 않는다 — 시안이 진실이고, Taste는 규율(안티슬롭·상태 완결성·성능 가드)만 제공한다.

---

## 0. 이 문서를 읽기 전에 — 확보/미확보 구분

시안 2개는 **마크업만** 있고 스타일시트가 없다. `stu_v1.jsx:3`이 `../original/main/page.css`를, `stu_lounge.jsx:3`이 `../original/stu-dash/page.css`를 import 하는데 **두 파일 모두 리포에 없다.**

| 구분 | 상태 | 근거 |
|---|---|---|
| 컴포넌트 구조·슬롯 계약 | ✅ 확보 | 마크업 전수 |
| 토큰 **이름·의미·적용 위치** | ✅ 확보 | 인라인 `style` 의 `var(--*)` 참조 91곳 |
| 기반 색상 팔레트 hex | ✅ 확보 | 직전 시안 `stu_v1.html`(git `HEAD`)의 `:root` + `DESIGN.md` 일치 |
| **의미 토큰 hex** (`--stat-1` 등) | ⚠️ **미확보** | 이름→휴 매핑은 클래스로 역산했으나 값은 `page.css`에 있음 |
| **테마 4종 팔레트** (포레스트·코발트·블룸) | ❌ **미확보** | 스위처 마크업만 존재 |
| 간격·타이포 스케일 수치 | ❌ **미확보** | 전량 CSS |

**→ `original/main/page.css`, `original/stu-dash/page.css` 2개를 확보하면 §3-B·§3-C·§4-B의 `TBD`가 채워진다. 그 전까지 TBD를 임의 값으로 채우지 말 것.**

---

## 1. Taste 다이얼 — 이 프로젝트의 확정값

Taste 스킬 기본값(8/6/4)은 랜딩·크리에이티브 기준이다. 학생 화면은 **정보 대시보드**이므로 시안에서 역산한 값으로 고정한다.

| 다이얼 | 기본값 | **학생 화면 확정값** | 근거 |
|---|---|---|---|
| `DESIGN_VARIANCE` | 8 | **6** | 히어로가 좌(카피+로드맵)/우(보드) 비대칭 분할. 단 데이터 영역은 12칼럼 정렬 유지 |
| `MOTION_INTENSITY` | 6 | **4** | 모션 훅은 `.reveal` 1종 + 캐러셀 + 진행률 채움뿐. framer-motion 미설치 |
| `VISUAL_DENSITY` | 4 | **7** | 지표 5장 + 레이더 + 6축 리스트 + 7단계 스텝을 한 화면에 |

### 1-1. Taste 규칙 중 **이 프로젝트에서 무효**인 것 (충돌 명시)

Taste 스킬을 그대로 적용하면 시안을 파괴한다. 아래는 **시안이 이긴다.**

| Taste 규칙 | 판정 | 이유 |
|---|---|---|
| §3 Rule 2 **"THE LILA BAN"** (보라/AI퍼플 금지) | ❌ **무효** | 드림캐치 Primary가 Violet `#7C5CFC`. `DESIGN.md`·`--stat-5`·`--ring`이 전부 이 색. 브랜드 자산이지 AI 기본값이 아니다 |
| §7 **"NO Inter Font"** → Geist/Satoshi 강제 | ❌ **무효** | 한글 UI. Pretendard 유지 (§4) |
| §7 **"NO 3-Column Card Layouts"** | ⚠️ **부분 무효** | 로드맵 3축(`goal-plan-columns`)·상담 3종(`counseling-detail-grid`)은 **데이터가 3개**라서 3열이다. 장식적 3열 피처행만 금지 |
| §3 Rule 4 "DENSITY>7이면 카드 금지" | ⚠️ **부분 무효** | 카드가 곧 도메인 경계(진단·상담·로드맵)다. 대신 카드 **안쪽**은 `divide-y`/보더로 그룹핑 |
| §2 아이콘 `@phosphor-icons/react` 강제 | ❌ **무효** | 시안은 자체 SVG 스프라이트 (§6-D) |
| §9 `rounded-[2.5rem]` Bento | ❌ **무효** | radius 12px 체계 (§3-D) |

### 1-2. Taste 규칙 중 **반드시 지키는** 것

- §3 Rule 5 **상태 완결성** — loading/empty/error를 반드시 구현 (§7)
- §5 **하드웨어 가속** — `transform`/`opacity`만 애니메이션. `width`/`left` 애니메이션 금지
- §7 **순수 검정 금지** — `#000000` 대신 `--foreground: #181c25`
- §7 **네온/외곽 글로우 금지** — 그림자는 배경색조로 틴트
- §7 **가짜 숫자 금지** — 시안이 이미 준수 중 (`48%`, `-21`, `41%`, `3건` 같은 비대칭 실측값). `50%`/`99.9%` 금지
- §2 **이모지 금지** — ⚠️ 시안에 1건 위반. `stu_lounge.jsx:722` `step-marker`가 `✓` 문자를 씀. `stu_v1.jsx`는 같은 자리에 `<use href="#i-check"/>`. **SVG 쪽으로 통일**

---

## 2. 디자인 원칙 (시안에서 읽어낸 5줄)

1. **카드는 도메인 경계다.** 진단·상담·로드맵·역량·프로그램이 각각 1카드. 장식 목적 카드 금지.
2. **모든 수치는 진행률로 말한다.** 숫자 단독 표기 없이 `progress-track`/`stat-meter`/`axis-track`이 항상 따라붙는다.
3. **잠금은 숨김이 아니다.** 이용 불가 항목도 내용을 보여주고 그 위에 잠금 레이어 + 사유 + 다음 행동을 얹는다 (§7-C).
4. **색은 카테고리이지 강조가 아니다.** 5개 지표·3개 상담유형·4개 진단·3개 로드맵축이 각각 고정 휴를 갖는다. 임의 강조색 금지.
5. **한 화면이 하나의 여정을 서술한다.** 상단 = 현재 위치, 중단 = 진단/역량 근거, 하단 = 오늘의 행동.

---

## 3. 색상 토큰 — 3계층

### 3-A. 기반 팔레트 (✅ 확정 — 값 변경 금지)

`DESIGN.md`와 동일. 시안은 이 위에 별칭만 올린다.

```css
:root {
  /* 표면 */
  --background: #f7f8fb;   --foreground: #181c25;
  --card:       #ffffff;   --card-foreground: #181c25;
  --muted:      #f1f3f6;   --muted-foreground: #565e6d;
  --border:     #e2e6ec;   --input: #d8dde5;

  /* 브랜드 */
  --primary: #7c5cfc;  --primary-foreground: #ffffff;  --ring: #7c5cfc;

  /* 휴 세트 — 각 색은 본색 + soft 배경 쌍으로만 존재 */
  --blue:   #356dff;  --blue-soft:   #eaf0ff;
  --violet: #7c5cfc;  --violet-soft: #f0edff;
  --mint:   #20b486;  --mint-soft:   #e5f8f2;
  --coral:  #ff6b6b;  --coral-soft:  #fff0f0;
  --amber:  #f5a524;  --amber-soft:  #fff6df;
  --sky:    #17a9e6;  --sky-soft:    #e7f7fd;
  --pink:   #e85aad;  --pink-soft:   #fdebf6;
}
```

**규칙:** 화면에서 위 hex를 직접 쓰지 않는다. 반드시 §3-B의 의미 토큰을 경유한다.

### 3-B. 의미 별칭 계층 (⚠️ 매핑 확정 · 값 TBD)

시안의 핵심 발명. 컴포넌트는 `--stat-color` 같은 **역할 변수**만 읽고, 인라인 `style`이 그 자리에 의미 토큰을 꽂는다. → 테마 교체와 카테고리 재배색이 CSS 1곳에서 끝난다.

| 그룹 | 인덱스 | 의미 | 휴 (클래스로 확정) | 시안 위치 |
|---|---|---|---|---|
| `--stat-N` | 1 | 진단 완료 | `mint` | `stu_lounge.jsx:408` |
| | 2 | 상담 현황 | `sky` | `:453` |
| | 3 | IAP 이행률 | `blue` | `:517` |
| | 4 | 비교과 이수 | `pink` | `:562` |
| | 5 | 성장 레벨 | `violet` | `:607` (`--stat-5-alt` 추가 보유) |
| `--counsel-N` | 1 / 2 / 3 | 진로취업 / 심리검사 / 지도교수 | TBD | `:485,493,501` · `:1774,1834,1894` |
| `--diagnosis-N` | 1~4 | C-CORE / C-2 / C-3 / C-4 | TBD | `:984,1018,1049,1104` |
| `--goal-N` | 1 / 2 / 3 | **로드맵 3축** — IAP 실행 / 핵심역량 수행 / 내 성장 활동 | TBD | `:1210,1321,1432` |
| `--recommend-N` | 1 / 2 | AI 추천 슬롯 | TBD | `:1693,1710` |
| `--journey-done` `--journey-current` | — | CARE+7 완료/진행 (그라디언트 쌍) | TBD | `:715` |
| `--competency-current` `--competency-target` `--chart-reference` | — | 레이더 나의현재/목표/평균 | TBD | 양쪽 범례 |

각 그룹은 `--{name}-N` + `--{name}-N-soft` **쌍**으로 정의한다.

```css
/* 정의 */
--stat-1: var(--mint);  --stat-1-soft: var(--mint-soft);

/* 주입 (마크업) */
<article class="stat-card" style="--stat-color:var(--stat-1); --stat-soft:var(--stat-1-soft)">

/* 소비 (컴포넌트 CSS — 인덱스를 모른다) */
.stat-icon { color: var(--stat-color); background: var(--stat-soft); }
```

> ⚠️ **`--goal-1/2/3`은 `PROCESS.md`의 로드맵 3축과 1:1이다.** 축이 바뀌면 색도 같이 바뀐다 — 이 토큰을 축 이름과 분리해 쓰지 말 것.

### 3-C. 테마 계층 — 4종 (❌ 값 미확보)

시안 양쪽 모두 우하단 고정 리모컨을 갖는다 (`stu_v1.jsx:1498`, `stu_lounge.jsx:2005`).

| `data-color-theme-choice` | 라벨 |
|---|---|
| `default` | 드림 |
| `forest` | 포레스트 |
| `cobalt` | 코발트 |
| `bloom` | 블룸 |

**구현 계약:** 테마는 §3-A 휴 세트만 재정의하고 §3-B 매핑은 건드리지 않는다.

```css
:root[data-color-theme="forest"] { --mint: …; --blue: …; /* 휴만 */ }
```

컴포넌트 CSS는 테마를 인지하면 안 된다. `[data-color-theme="x"] .stat-card { … }` 같은 선택자 금지.

### 3-D. 형태 토큰 (✅ 확정)

```css
--radius: 12px;                                   /* 기본 */
--shadow: 0 2px 8px rgba(22, 28, 45, .04);        /* 유일한 그림자 */
```

- radius 12px 단일. 알약형은 배지·칩만 `999px`.
- **그림자는 1종뿐.** 호버 시 그림자 강화 금지 — `transform: translateY(-1px)`로 대체 (Taste §3 Rule 5 촉각 피드백).
- 카드 구분은 그림자가 아니라 `1px solid var(--border)`.

---

## 4. 타이포그래피

### 4-A. 폰트 (✅ 확정)

```css
--font: 'Pretendard', 'Noto Sans KR', sans-serif;
```

- 숫자·코드(`C-CORE`, `C4`, `-21`)는 `font-variant-numeric: tabular-nums`. 지표가 세로로 흔들리지 않게.
- **Serif 전면 금지** (Taste §7 — 대시보드 UI).
- `font/` 의 BMJUA·GmarketSans는 랜딩 자산. 학생 대시보드에 반입 금지.

### 4-B. 스케일 (❌ TBD — `page.css` 필요)

확보된 것은 **의미 계층**뿐이다. 값이 아니라 이 계층을 지켜라.

| 역할 | 마크업 | 규칙 |
|---|---|---|
| 키커 | `.career-hero-kicker` (`MY CAREER DASHBOARD`) | 대문자 라틴, 자간 확대, `--muted-foreground` |
| H1 | `#welcomeTitle` — `한눈에 보는 <span>오늘 나의 성장</span>` | **`<span>`이 2행 강조**. 크기가 아니라 색/굵기로 위계 (Taste §7 "NO Oversized H1s") |
| 카드 제목 | `[data-slot="card-title"]` | H2 |
| 카드 설명 | `[data-slot="card-description"]` | `--muted-foreground` |
| 지표값 | `.stat-value` · `.goal-number` · `.journey-value` | 화면 최대 크기. tabular-nums |
| 라벨 | `.stat-label` · `.axis-row` 첫 텍스트 | 소형, 중간 굵기 |
| 보조 | `<small>` (`완료`, `이용 제한`, `2026-08-20`) | 최소 크기, muted |

---

## 5. 레이아웃

### 5-A. 페이지 골격 (양쪽 시안 공통)

```
<header class="topbar">        고정. .topbar-inner = .brand + nav.top-nav + .topbar-right
<div class="global-search">    오버레이 검색 (backdrop + panel)
<div class="app">
  <main class="main">          ← 페이지 본문
<footer class="site-footer">
<aside class="color-theme-remote">   고정 우하단
<div class="toast">                  고정 알림
```

`stu_v1`은 여기에 `.career-popup`(모달 캐러셀) + `.floating-control-stack`을 더 얹는다.

### 5-B. 메인 홈 (`stu_v1`) — 비대칭 히어로

```
section.career-hero                      ← 2열 비대칭 (VARIANCE 6)
├ .career-hero-left
│  ├ .career-hero-copy      (kicker / h1 / 설명)
│  └ .journey-card.hero-roadmap          ← CARE+7 진행 (§6-F)
└ .career-hero-board
   ├ .career-hero-top
   │  ├ .career-hero-stack  → .hero-panel.hero-todo + .hero-panel.hero-quest
   │  └ .hero-panel.hero-attendance
   └ .hero-panel.hero-competency         ← 레이더 (§6-G)

div.dashboard-grid                       ← 12칼럼
├ section.span-12  #programs   (가로 캐러셀)
├ section.span-12  #jobs       (.featured-job + .job-list 분할)
└ section.span-12  #notices    (탭 + 리스트)
```

### 5-C. AI 커리어 라운지 (`stu_lounge`) — 지표 → 근거 → 행동

```
section.welcome            인사 + .student-type (진로 유형 배지)
section.stats              지표 5장 (--stat-1..5)
div.dashboard-grid
├ .journey-card            CARE+7 7단계
├ .competency-card         레이더 + 6축 리스트
├ .diagnosis-card          진단 4종 (2 열림 / 2 잠김)
├ .goal-card               목표직무 + 로드맵 3축
├ .todo-card               체크리스트
├ .recommend-card          AI 추천
└ .counseling-card         상담 3종 상세
```

### 5-D. 규칙

- **Grid만.** `calc(33% - 1rem)` 류 flex 수학 금지 (Taste §2).
- 데스크톱 전용 min-width 1280px는 유지하되, 시안의 `.stats`·`.dashboard-grid`·`.goal-plan-columns`·`.counseling-detail-grid`는 좁은 뷰포트에서 **1열로 강제 붕괴**시킨다 (Taste §6 MOBILE OVERRIDE).
- 전체 높이 섹션에 `h-screen`/`100vh` 금지 → `100dvh`.

---

## 6. 컴포넌트

### 6-A. Card — `data-slot` 슬롯 계약 (★ 가장 중요)

시안 전체 카드가 shadcn 스타일 슬롯을 쓴다. 클래스가 아니라 **`data-slot` 속성이 구조를 고정**한다.

```jsx
<section data-slot="card" className="journey-card" aria-labelledby="journeyTitle">
  <header data-slot="card-header">
    <div>
      <h2 data-slot="card-title" id="journeyTitle">나의 진로 여정</h2>
      <p  data-slot="card-description">내 CARE+7의 현재 위치입니다.</p>
    </div>
    {/* 우측 액션이 있으면 */}
    <a data-slot="card-action" className="button">전체보기</a>
  </header>
  <div data-slot="card-content">…</div>
  <footer data-slot="card-footer">…</footer>   {/* stu_v1에만 존재 */}
</section>
```

**규칙**
- 카드 골격 CSS는 `[data-slot="card"]` 계열로만 작성. `.journey-card` 같은 도메인 클래스는 **변주 전용**.
- `card-title`은 반드시 `id`를 갖고 카드 루트가 `aria-labelledby`로 참조.
- 슬롯 순서 고정: header → content → footer. 임의 삽입 금지.

### 6-B. 버튼 (시안 전량)

| 클래스 | 용도 | 출현 |
|---|---|---|
| `.button` | 기본 (전체보기·상세) | 8 |
| `.button.primary` | 주요 행동 (출석 체크 등) | 2 |
| `.icon-button` | 아이콘 단독 (검색·알림·모바일메뉴) | 6 |
| `.carousel-button` / `.program-nav-{prev,next}` | 캐러셀 이동 | 2 |
| `.button.diagnosis-lock-button` | 잠금 레이어 안 행동 | 2 |
| `.button.popup-float-button` | 플로팅 팝업 열기 | 1 |

**변주는 이 6개가 전부다. 새 변주를 만들지 말 것.**
`:active` 시 `translateY(-1px)` 또는 `scale(.98)` — 글로우 금지.

### 6-C. 배지

`.badge` 단독 + 휴 수식자 `.badge.amber` / `.badge.blue` / `.badge.coral`, 그리고 문맥 수식자 `.stat-badge` / `.match-badge`.
→ **휴 수식자는 §3-A 이름 그대로.** `.badge.success` 같은 새 어휘 금지.

### 6-D. 아이콘 — 로컬 SVG 스프라이트 (⚠️ 현행과 다름)

시안은 문서 최상단에 `<svg class="sr-only">` 심볼 시트를 깔고 `<use href="#i-*">`로 참조한다.

```jsx
<svg className="icon"><use href="#i-check" /></svg>
```

**확보된 심볼 (합집합 28종)**
`i-search i-bell i-user i-menu i-x i-layout i-scan i-message i-route i-calendar i-briefcase i-spark i-chevron-down i-chevron-left i-chevron-right i-arrow i-pause i-play i-check i-target i-flame i-chart i-clock i-external i-location i-moon i-lock i-award`

**규칙**
- 전부 `viewBox="0 0 24 24"` 아웃라인. `stroke: currentColor; fill: none;`을 `.icon`에서 일괄 지정 — 심볼 자체에 stroke 속성을 박지 않는다 (시안 준수 확인됨).
- **strokeWidth 전역 고정** (Taste §2). 값은 `page.css` 확보 후 확정.
- 색은 항상 `currentColor` → 부모의 `--stat-color` 등을 상속.
- ⚠️ `src_v2` 현행은 Font Awesome 6. **이식 시 스프라이트로 교체**하고 FA 의존을 제거한다 (§13).

### 6-E. 진행률 — `--value` 주입 패턴

시안의 모든 막대가 동일 계약을 쓴다.

```jsx
<div className="progress-track" style={{ "--value": "48%" }} aria-label="전체 진행률 48퍼센트">
  <i />
</div>
<div className="stat-meter" style={{ "--value": "62%", "--accent": "var(--stat-3)" }}>
  <span className="stat-meter-track" />
</div>
```

```css
.progress-track > i { width: var(--value); background: var(--accent, var(--primary)); }
```

**변형 — `.axis-track` (역량 갭)**: 두 마커를 한 트랙에 겹친다.
- `<i style="width:72%">` = 나의 현재 (채움)
- `<u style="left:80%">` = 목표 직무 (눈금)
- 옆의 `.gap-value`는 부호 있는 차이(`-8`, `+6`). **양수일 때만** `style="color:var(--mint)"`.

> 성능: 값 변화를 **애니메이션하지 않는다** (`width` 트랜지션 = 레이아웃 리플로우). 진입 시 1회 채움만 허용하고 `transform: scaleX()`로 구현.

### 6-F. 스텝 — CARE+7

7단계 고정: `진단 · 상담 · 로드맵 · 역량강화 · 기업연계 · 취업지원 · 사후관리`
상태 클래스 3종: `.done` / `.current` / (없음 = 예정)

| 시안 | 컨테이너 | 마커 |
|---|---|---|
| `stu_lounge` | `.steps > .step` (`role="list"`/`listitem`) | `.step-marker` — 완료 `✓`, 이후 `C4`~`C7` |
| `stu_v1` | `.journey-scroll > .journey-steps > .journey-step` (가로 스크롤) | `.journey-dot` — SVG `#i-check` |

**통일 지침:** 마커 내용은 **SVG(`#i-check`)로 통일**하고 `✓` 리터럴을 제거한다. 진행 바는 `linear-gradient(90deg, var(--journey-done), var(--journey-current))`.

### 6-G. 레이더 차트 (`.radar`)

`viewBox="0 0 300 280"`, 중심 `(150,140)`, 6축 인라인 SVG. `role="img"` + `aria-label="6대 핵심역량 레이더 차트"`.

- 6축 고정: `의사소통 · 문제해결 · 협업 · 창의성 · 직무전문성 · 글로벌`
- 폴리곤 3겹: `.avg`(전체평균) / `.need`(목표직무) / `.mine`(나의현재) — **이 순서로 겹친다**
- 범례 `.legend` 2종: 나의 현재(`--competency-current`) · 목표 직무(`--competency-target`)
- ⚠️ chart.js 미사용. **인라인 SVG를 유지**한다 (라이브러리로 대체 금지 — 좌표가 시안 고정값).

### 6-H. 잠금 레이어 (★ 게이팅 UI 표준)

`CLAUDE.md` 규칙 13(비활성 + 안내 + 다음 단계)의 시안 구현체. **모든 게이팅 화면이 이 형태를 재사용한다.**

```jsx
<article className="diagnosis-result-item locked" aria-label="C-3 역량수준 진단 이용 제한"
         style={{ "--result-color": "var(--diagnosis-3)", "--result-soft": "var(--diagnosis-3-soft)" }}>
  {/* ① 내용은 그대로 렌더한다 — 숨기지 않는다 */}
  <span className="diagnosis-result-top">…</span>
  <strong className="diagnosis-primary-result">미래 유보형</strong>
  <span className="diagnosis-result-tags">…</span>

  {/* ② 그 위에 잠금 레이어 */}
  <span className="diagnosis-lock-layer">
    <span className="diagnosis-lock-message">
      <span className="diagnosis-lock-icon"><svg className="icon"><use href="#i-lock" /></svg></span>
      <span className="diagnosis-lock-copy">
        <b>진로설정형에서는 이용할 수 없어요</b>
        <small>다음 진로 유형으로 전환되면 진단이 열립니다.</small>
      </span>
    </span>
    <button className="button diagnosis-lock-button" data-toast="…">이용 조건 확인</button>
  </span>
</article>
```

**필수 3요소:** 사유(`<b>`) · 해제 조건(`<small>`) · 행동(`.button`). 하나라도 빠지면 리젝.
잠긴 카드는 `<button>`이 아니라 `<article>`로 바꿔 클릭 자체를 제거한다 (시안 준수 — 열린 항목은 `<button>`, 잠긴 항목은 `<article>`).

### 6-I. 기타 확정 컴포넌트

`.global-search`(backdrop+panel) · `.profile-popover`(`role="menu"`) · `.notice-tabs`(`role="tablist"`) · `.career-popup`(캐러셀 모달 + pause/play + 오늘 하루 보지 않기) · `.toast` · `.level-medallion`/`.level-xp` · `.ai-recommend-item`(`01`/`02` 번호) · `.list-item`(체크박스 할일).

---

## 7. 상태 — Taste §3 Rule 5 (필수)

### 7-A. 시안이 이미 가진 상태
`.done` `.current` `.locked` `.is-complete` `.active`(내비) `.completed` `.planned`

### 7-B. 시안에 **없어서 우리가 채워야 하는** 상태 (Taste 필수 항목)

| 상태 | 구현 |
|---|---|
| **Loading** | 카드 레이아웃과 동일 치수의 스켈레톤. 원형 스피너 금지. 시머는 `transform`만 |
| **Empty** | 카드를 비우지 말고 — 아이콘 + 왜 비었는지 + 채우는 행동 1개. §6-H와 동일 3요소 |
| **Error** | 인라인. 카드 콘텐츠 자리에 사유 + 재시도 |

### 7-C. 게이팅 상태는 Empty가 아니다
선행 단계 미완료로 잠긴 화면은 **빈 화면이 아니라 §6-H 잠금 레이어**로 그린다. (`CLAUDE.md` 규칙 13 · `PROCESS.md` §2)

---

## 8. 모션 (`MOTION_INTENSITY = 4`)

- 유일한 진입 훅: **`.reveal`** (시안에서 카드마다 부여). 스크롤 진입 시 `opacity` + `translateY` 페이드업.
  - `IntersectionObserver` 사용. **`window.addEventListener('scroll')` 금지** (Taste §6).
  - 리스트/그리드는 `animation-delay: calc(var(--index) * 100ms)` 캐스케이드 (Taste §4).
- 트랜지션: `.3s cubic-bezier(.16, 1, .3, 1)`.
- **`transform`/`opacity`만 애니메이션.** `width`·`left`·`top`·`height` 금지 (§6-E 주의).
- framer-motion·GSAP 미설치 — **CSS로 끝낸다.** 도입하려면 `package.json` 확인 후 설치 명령을 먼저 제시 (Taste §2).
- `prefers-reduced-motion: reduce`에서 `.reveal`·캐러셀 자동재생 정지. 시안의 `.career-popup` pause 버튼이 이미 수동 제어를 제공.

---

## 9. 접근성 (시안이 이미 통과한 수준 — 낮추지 말 것)

시안 실측: `aria-label` 60 · `role` 32 · `aria-labelledby` 13 · `aria-expanded` 6 · `aria-controls` 6.

| 패턴 | 계약 |
|---|---|
| 카드 | `aria-labelledby` → `card-title`의 `id` |
| 진행률 | `aria-label="전체 진행률 48퍼센트"` — **퍼센트를 한글로 읽어준다** |
| 차트 | `role="img"` + 설명 `aria-label`. 옆에 `.axis-list` 텍스트 대체본 필수 |
| 스텝 | `role="list"` / `role="listitem"`, 현재 단계에 `aria-current` |
| 탭 | `role="tablist"`/`tab`/`tabpanel` + `aria-selected` |
| 모달 | `role="dialog"` + `aria-modal` + 닫기 버튼 + backdrop |
| 토글 | `aria-pressed` (pause/play) · `aria-expanded`+`aria-controls` (프로필·모바일 메뉴) |
| 토스트 | `role="status"` + `aria-live` |
| 장식 SVG | `aria-hidden="true"` |
| 가로 스크롤 | `tabIndex="0"` + 스크롤 가능함을 알리는 `aria-label` (`.journey-scroll`) |

---

## 10. JSON 동적 바인딩 (프로젝트 필수 규약)

`CLAUDE.md` "하드코딩 리터럴 금지"와 시안의 `data-*` 훅을 연결한다.

### 10-A. `data-slot` = 구조 계약
값은 7종뿐: `card` `card-header` `card-title` `card-description` `card-action` `card-content` `card-footer`.
→ 로더가 JSON을 이 슬롯에 부어넣는다. **새 슬롯 이름을 발명하지 말 것.**

### 10-B. `data-toast` = 행동 결과 문구 (35곳)
모든 상호작용 요소가 자기 토스트 문구를 속성으로 들고 있다.

```jsx
<button data-toast="TOEIC 목표 계획을 확인합니다.">…</button>
```

→ **이 문자열은 JSON에서 온다.** 컴포넌트에 박지 않는다. 이벤트 → 토스트 문구도 단일소스의 일부.

### 10-C. 인라인 `style`의 위치
`--stat-color`·`--value` 같은 **데이터 유래 값만** 인라인. 색 hex·간격·크기의 인라인 지정은 금지.

### 10-D. 하드코딩 금지 대상 (시안에 리터럴로 박혀 있는 것들 — 이식 시 전부 JSON화)
`김민서` `경영학과 3학년 · 2학기` `진로설정형` `데이터 분석가` `48%` `41%` `-8`/`+6` `3건` `C-CORE`~`C-4` `01`/`02` 및 §6-F 7단계 라벨·§6-G 6축 라벨.

---

## 11. 금지 목록

**Taste §7에서 계승**
- `#000000` · 네온/외곽 글로우 · 텍스트 그라디언트 · 커스텀 커서 · 이모지 · Serif · 과대 H1 · Unsplash · 가짜 숫자(`50%`, `99.9%`) · "Seamless/Elevate" 류 카피

**이 프로젝트 고유**
- §3-A hex 직접 참조 (§3-B 경유 필수)
- 새 팔레트·새 radius·새 그림자 생성
- 버튼 7번째 변주 (§6-B)
- `[data-color-theme="x"] .컴포넌트` 선택자 (§3-C)
- `data-slot` 신규 값
- 잠긴 항목을 빈 화면으로 처리 (§6-H)
- 레이더를 chart.js로 교체 (§6-G)
- `width`/`left` 애니메이션 (§8)
- `--goal-N`을 로드맵 3축 외 용도로 재사용 (§3-B)

---

## 12. 프리플라이트 체크리스트

구현 후 아래를 모두 통과해야 머지한다.

- [ ] 카드가 `data-slot` 7슬롯 계약을 지키고 `aria-labelledby`로 제목을 참조하는가
- [ ] 색을 §3-B 의미 토큰으로만 참조했는가 (hex 직접 참조 0건)
- [ ] 테마 4종 전환 시 컴포넌트 CSS 수정이 0줄인가
- [ ] loading / empty / error 3상태가 모두 있는가
- [ ] 잠금 UI에 사유·해제조건·행동 3요소가 있는가
- [ ] 애니메이션이 `transform`/`opacity`만 쓰는가
- [ ] `prefers-reduced-motion`에서 자동 모션이 멈추는가
- [ ] 아이콘이 스프라이트 `<use>`이고 strokeWidth가 전역 단일값인가
- [ ] 화면 텍스트·수치가 전부 JSON에서 오는가 (§10-D 리터럴 0건)
- [ ] `data-toast` 문구가 JSON에서 오는가
- [ ] 좁은 뷰포트에서 다열 그리드가 1열로 붕괴하는가
- [ ] `npx tsc -b` 통과

---

## 13. 현행 `src_v2` 대비 델타 (이식 시 해야 할 일)

| 항목 | 현행 `src_v2/index.css` | 시안 | 조치 |
|---|---|---|---|
| Primary | `--color-primary: #2E5BFF` (블루) | `--primary: #7c5cfc` (바이올렛) | **교체** |
| 배경 | `--color-page-bg: #FFFFFF` | `--background: #f7f8fb` | **교체** |
| 토큰 어휘 | `--color-*` / `--radius-{xs..xl}` / `--shadow-{sm,md,lg}` | `--background`/`--card`/`--muted`… · `--radius` 1종 · `--shadow` 1종 | 신규 이름을 정본으로. `--color-*`는 **값만 재지정한 별칭으로 남겨** 기존 화면 일괄 전환 |
| 의미 토큰 | 없음 | `--stat-*`·`--counsel-*`·`--diagnosis-*`·`--goal-*` | **신규 도입** |
| 테마 | 없음 | 4종 스위처 | **신규 도입** |
| 아이콘 | Font Awesome 6 | 로컬 SVG 스프라이트 28종 | **교체** + FA 제거 |
| 폰트 | Pretendard | 동일 | 유지 |
| 그림자 | 3단계 (블루 틴트) | 1종 | **축소** |

**권장 순서**
1. `src_v2/index.css` `:root`에 §3-A + §3-B 토큰을 **추가** (기존 `--color-*`는 새 토큰을 가리키게 재정의) → 전 화면 색이 한 번에 전환됨
2. SVG 스프라이트 컴포넌트 도입 → 화면 단위로 FA 교체
3. Card 슬롯 계약을 공용 컴포넌트로 추출
4. `stu_lounge` → 현행 AI 커리어 라운지 이식
5. `stu_v1` → 로그인 후 메인 홈 이식
6. `page.css` 확보 시 §3-B·§3-C·§4-B TBD 확정

---

## 14. 미결

1. **`original/main/page.css` · `original/stu-dash/page.css` 확보** — §3-B 의미 토큰 hex, §3-C 테마 4종, §4-B 타이포 스케일, 간격 스케일, strokeWidth.
2. 시안의 `✓` 리터럴(`stu_lounge.jsx:722`) → SVG 통일 여부 확인.
3. `--stat-5-alt`의 용도 (레벨 카드에만 존재).
4. `DESIGN.md`(교직원)와 이 문서의 관계 — 기반 팔레트는 동일하므로 §3-A를 공용 파일로 뽑을지 결정.
