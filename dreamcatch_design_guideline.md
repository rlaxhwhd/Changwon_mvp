# 국립창원대학교 드림캐치 UI 디자인 가이드라인

> Source: `b (1).html`
>
> 목적: 기존 웹페이지의 시각 언어와 UI 규칙을 유지하면서 신규 화면을 설계/개발하기 위한 공통 디자인 시스템 문서.
> Codex, Claude Code, Cursor 등 코드 생성 도구에 전달하여 동일한 스타일의 페이지를 구현할 수 있도록 작성됨.

---

# 1. 디자인 개요

이 웹페이지의 전체 디자인 스타일은 다음과 같이 정의한다.

**Clean Academic Dashboard + Soft SaaS UI**

대학 진로·취업 플랫폼에 적합한 전문적인 대시보드 UI를 기본으로 하며, 지나치게 화려하거나 장식적인 표현보다는 다음 원칙을 우선한다.

- 밝고 깨끗한 뉴트럴 배경
- 흰색 카드 기반 정보 구조
- 얇은 Border 중심의 카드 표현
- 강한 그림자 최소화
- Violet 계열 Primary Color
- 기능별 Semantic Accent Color
- 10~12px 수준의 절제된 Radius
- 정보 밀도가 높은 Dashboard Layout
- Outline SVG Icon
- 명확한 상태 색상
- 160~240ms 수준의 짧고 부드러운 Interaction
- Desktop 우선 12 Column Grid
- Mobile 1 Column Responsive Layout
- 한글 가독성을 위한 `word-break: keep-all`

---

# 2. Design DNA

이 웹사이트의 시각적 DNA는 아래 한 줄로 요약할 수 있다.

```text
Pretendard
+ 1440px Container
+ 12 Column Grid
+ 16px Gap
+ White Card
+ 1px Border
+ 12px Radius
+ Violet Primary
+ Semantic Soft Colors
+ Outline Icons
```

신규 페이지를 구현할 때 위 구성 요소를 가능한 한 유지한다.

---

# 3. Color System

## 3.1 Neutral Colors

| Token | Hex | 용도 |
|---|---|---|
| Background | `#F7F8FB` | 전체 페이지 배경 |
| Foreground | `#181C25` | 기본 텍스트 |
| Card | `#FFFFFF` | 카드 / Panel |
| Card Foreground | `#181C25` | 카드 내부 기본 텍스트 |
| Muted | `#F1F3F6` | 비활성 영역, Sub Background |
| Muted Foreground | `#565E6D` | 설명 / 보조 텍스트 |
| Border | `#E2E6EC` | 기본 Border |
| Input | `#D8DDE5` | Input / Strong Border |

기본 CSS:

```css
:root {
  --background: #f7f8fb;
  --foreground: #181c25;

  --card: #ffffff;
  --card-foreground: #181c25;

  --muted: #f1f3f6;
  --muted-foreground: #565e6d;

  --border: #e2e6ec;
  --input: #d8dde5;
}
```

---

# 4. Primary Color

Primary / Brand Color는 Violet이다.

```css
--primary: #7c5cfc;
--primary-foreground: #ffffff;

--violet: #7c5cfc;
--violet-soft: #f0edff;

--ring: #7c5cfc;
```

## 주요 사용 영역

- 현재 선택된 메뉴
- Primary CTA Button
- 주요 진행 상태
- Current Step
- 선택된 카드
- 핵심 데이터 강조
- 진단 결과
- Roadmap
- Hover Color
- 주요 Chart
- Focus Ring

## 사용 원칙

Primary Color를 큰 배경 면적으로 과도하게 사용하지 않는다.

### 지양

```css
.card {
  background: #7c5cfc;
}
```

### 권장

```css
.card-highlight {
  color: #7c5cfc;
  background: #f0edff;
}
```

즉, 강한 색상 + Soft Background 조합을 우선한다.

---

# 5. Semantic Accent Colors

기능 또는 상태별로 다음 Color Pair를 사용한다.

| Semantic | Main | Soft |
|---|---|---|
| Violet | `#7C5CFC` | `#F0EDFF` |
| Blue | `#356DFF` | `#EAF0FF` |
| Mint | `#20B486` | `#E5F8F2` |
| Coral | `#FF6B6B` | `#FFF0F0` |
| Amber | `#F5A524` | `#FFF6DF` |
| Sky | `#17A9E6` | `#E7F7FD` |
| Pink | `#E85AAD` | `#FDEBF6` |

CSS:

```css
:root {
  --blue: #356dff;
  --blue-soft: #eaf0ff;

  --violet: #7c5cfc;
  --violet-soft: #f0edff;

  --mint: #20b486;
  --mint-soft: #e5f8f2;

  --coral: #ff6b6b;
  --coral-soft: #fff0f0;

  --amber: #f5a524;
  --amber-soft: #fff6df;

  --sky: #17a9e6;
  --sky-soft: #e7f7fd;

  --pink: #e85aad;
  --pink-soft: #fdebf6;
}
```

---

# 6. 기능별 Color Mapping

기존 페이지에서는 각 Career 영역마다 Accent Color를 분리한다.

| 영역 | Accent |
|---|---|
| 진로 탐색 | Mint |
| IAP 실행 | Blue |
| 직무 역량 | Violet |
| 자격·어학 | Amber |
| 일경험 | Coral |
| 포트폴리오 | Sky |
| 취업 준비 | Pink |
| 네트워크 | Teal 계열 |

예:

```js
{
  code: '01',
  name: '진로 탐색',
  color: '#20b486',
  soft: '#e5f8f2'
}

{
  code: '02',
  name: 'IAP 실행',
  color: '#356dff',
  soft: '#eaf0ff'
}

{
  code: '03',
  name: '직무 역량',
  color: '#7c5cfc',
  soft: '#f0edff'
}

{
  code: '04',
  name: '자격·어학',
  color: '#f5a524',
  soft: '#fff6df'
}

{
  code: '05',
  name: '일경험',
  color: '#ff6b6b',
  soft: '#fff0f0'
}

{
  code: '06',
  name: '포트폴리오',
  color: '#17a9e6',
  soft: '#e7f7fd'
}

{
  code: '07',
  name: '취업 준비',
  color: '#e85aad',
  soft: '#fdebf6'
}
```

---

# 7. Typography

## 7.1 Font Family

기본 Font Stack:

```css
font-family:
  "Pretendard Variable",
  Pretendard,
  "SUIT Variable",
  SUIT,
  "Noto Sans KR",
  "Malgun Gothic",
  Arial,
  sans-serif;
```

기본 Body:

```css
body {
  font-weight: 500;
  font-synthesis: none;
  text-rendering: optimizeLegibility;

  -webkit-font-smoothing: subpixel-antialiased;
  -moz-osx-font-smoothing: auto;

  word-break: keep-all;
}
```

## 7.2 Typography Scale

| 용도 | Font Size | Weight |
|---|---:|---:|
| Page Title | 28~32px | 800~900 |
| Large KPI | 28~32px | 900 |
| Section Heading | 18~20px | 700~800 |
| Card Title | 16px | 800 |
| Sub Heading | 14px | 700~800 |
| Body | 13px | 500~600 |
| Navigation | 13~15px | 600~700 |
| Caption | 12px | 500~700 |
| Badge | 12px | 800 |

### Page Heading

```css
.page-title {
  font-size: 32px;
  line-height: 1.4;
  letter-spacing: -0.02em;
  font-weight: 800;
}
```

### Card Title

```css
.card-title {
  margin: 0;

  font-size: 16px;
  font-weight: 800;

  letter-spacing: -0.02em;
}
```

### Card Description

```css
.card-description {
  margin-top: 4px;

  color: var(--muted-foreground);

  font-size: 13px;
  line-height: 1.6;
}
```

### KPI

```css
.stat-value {
  font-size: 28px;
  font-weight: 900;
}
```

---

# 8. Spacing System

전체적으로 4px Base Unit를 사용한다.

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 28px;
  --space-8: 32px;
}
```

가장 빈번하게 사용하는 값:

```text
4
8
10
12
14
16
20
24
28
32
```

## 기본 권장값

| 대상 | 간격 |
|---|---:|
| Card Gap | 16px |
| Card Padding | 20px |
| Section Gap | 24~32px |
| Button Content Gap | 8px |
| Icon + Text Gap | 8~12px |
| Small List Gap | 8~12px |

---

# 9. Radius

기본 Radius:

```css
--radius: 12px;
```

권장 Radius Scale:

```css
:root {
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-modal: 20px;
}
```

| Component | Radius |
|---|---:|
| Main Card | 12px |
| Inner Card | 10px |
| Button | 10px |
| Input | 10px |
| Icon Box | 10~12px |
| Badge | 12~14px |
| Avatar | 50% |
| Modal | 약 20px |

## 금지

과도한 24px~40px Radius를 일반 카드에 사용하지 않는다.

---

# 10. Shadow

기본 Shadow는 매우 약하다.

```css
--shadow: 0 2px 8px rgba(22, 28, 45, .04);
```

기본 카드에서는 Border를 중심으로 디자인한다.

```css
.card {
  border: 1px solid var(--border);
  background: var(--card);
  box-shadow: none;
}
```

## Popup / Modal

강한 Shadow는 떠 있는 UI에 한정한다.

```css
box-shadow:
  0 16px 40px rgba(18, 24, 38, .14);
```

또는:

```css
box-shadow:
  0 32px 80px rgba(15, 23, 42, .24);
```

---

# 11. Global Layout

## Container

```css
.container {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
}
```

Main:

```css
.main {
  max-width: 1440px;

  margin: 0 auto;
  padding: 32px 24px 60px;
}
```

---

# 12. Dashboard Grid

Desktop Dashboard는 12 Column Grid를 사용한다.

```css
.dashboard-grid {
  display: grid;

  grid-template-columns:
    repeat(12, minmax(0, 1fr));

  gap: 16px;
}
```

대표 카드 크기:

```css
.journey-card {
  grid-column: span 8;
}

.next-card {
  grid-column: span 4;
}

.competency-card {
  grid-column: span 7;
}

.diagnosis-card {
  grid-column: span 5;
}

.goal-card {
  grid-column: span 12;
}

.todo-card,
.recommend-card {
  grid-column: span 6;
}
```

대표 구성:

```text
┌──────────────────────────────┬──────────────┐
│ Journey / Main Content       │ Next Action  │
│ 8 columns                    │ 4 columns    │
└──────────────────────────────┴──────────────┘

┌────────────────────────┬────────────────────┐
│ Competency             │ Diagnosis          │
│ 7 columns              │ 5 columns          │
└────────────────────────┴────────────────────┘

┌─────────────────────────────────────────────┐
│ Full Width Content                          │
│ 12 columns                                  │
└─────────────────────────────────────────────┘
```

---

# 13. Card Component

기본 구조:

```html
<section data-slot="card">
  <div data-slot="card-header">
    <div>
      <h2 data-slot="card-title">제목</h2>
      <p data-slot="card-description">설명</p>
    </div>

    <div data-slot="card-action">
      ...
    </div>
  </div>

  <div data-slot="card-content">
    ...
  </div>

  <div data-slot="card-footer">
    ...
  </div>
</section>
```

CSS:

```css
[data-slot="card"] {
  border: 1px solid var(--border);

  border-radius: var(--radius);

  background: var(--card);
  color: var(--card-foreground);
}
```

Header:

```css
[data-slot="card-header"] {
  padding: 20px 20px 0;

  display: grid;

  grid-template-columns:
    1fr auto;

  gap: 4px 16px;

  align-items: start;
}
```

Content:

```css
[data-slot="card-content"] {
  padding: 20px;
}
```

Footer:

```css
[data-slot="card-footer"] {
  padding: 16px 20px;

  border-top:
    1px solid var(--border);

  background:
    color-mix(
      in srgb,
      var(--muted) 48%,
      transparent
    );

  border-radius:
    0 0 var(--radius) var(--radius);
}
```

---

# 14. KPI / Stat Card

대표 구조:

```text
┌───────────────────────┐
│ Label            Icon │
│                       │
│ 71점                  │
│                       │
│ ━━━━━━━━━━━━━   67%   │
└───────────────────────┘
```

## Stat Label

```css
.stat-label {
  color: var(--muted-foreground);

  font-size: 13px;
  font-weight: 600;
}
```

## Value

```css
.stat-value {
  margin: 18px 0 10px;

  font-size: 28px;
  font-weight: 900;
}
```

## Icon

```css
.stat-icon {
  width: 34px;
  height: 34px;

  border-radius: 10px;

  display: grid;
  place-items: center;
}
```

Icon Background는 Soft Semantic Color를 사용한다.

예:

```css
.stat-icon.mint {
  color: var(--mint);
  background: var(--mint-soft);
}

.stat-icon.blue {
  color: var(--blue);
  background: var(--blue-soft);
}
```

---

# 15. Button System

기본 Button:

```css
.button {
  height: 36px;

  padding: 0 14px;

  border:
    1px solid var(--border);

  border-radius: 10px;

  background: var(--card);

  display: inline-flex;
  align-items: center;
  justify-content: center;

  gap: 8px;

  font-size: 13px;
  font-weight: 700;

  transition:
    background 160ms,
    border-color 160ms,
    transform 160ms;
}
```

## Default Button

```css
.button {
  border-color: var(--border);
  background: var(--card);
}
```

Hover:

```css
.button:hover {
  background: var(--muted);
}
```

## Primary Button

```css
.button.primary {
  border-color: var(--violet);

  background: var(--violet);

  color: #fff;
}
```

Hover:

```css
.button.primary:hover {
  background: #6848ec;
}
```

## Ghost Button

```css
.button.ghost {
  border-color: transparent;

  background: transparent;

  color: var(--muted-foreground);
}
```

Button Hierarchy:

```text
Primary
↓
Default
↓
Ghost
```

---

# 16. Badge

기본 Badge:

```css
.badge {
  height: 24px;

  padding: 0 8px;

  border:
    1px solid var(--border);

  border-radius: 12px;

  background: var(--card);

  display: inline-flex;
  align-items: center;

  gap: 4px;

  font-size: 12px;
  font-weight: 800;

  white-space: nowrap;
}
```

## Semantic Badge

### Violet

```css
.badge.violet {
  border-color: #d9d0ff;
  color: var(--violet);
  background: var(--violet-soft);
}
```

### Blue

```css
.badge.blue {
  border-color: #cbd8ff;
  color: var(--blue);
  background: var(--blue-soft);
}
```

### Mint

```css
.badge.mint {
  border-color: #bdebdc;
  color: #148262;
  background: var(--mint-soft);
}
```

### Coral

```css
.badge.coral {
  border-color: #ffcfcf;
  color: #dc4444;
  background: var(--coral-soft);
}
```

### Amber

```css
.badge.amber {
  border-color: #f4d99d;
  color: #9a6300;
  background: var(--amber-soft);
}
```

---

# 17. Status Mapping

권장 상태 Color:

| 상태 | Color |
|---|---|
| 완료 | Mint |
| 진행 | Violet 또는 Blue |
| 예정 | Neutral |
| 경고 | Amber |
| 부족 / 오류 | Coral |
| 정보 | Sky |
| 특별 / 추천 | Pink |

---

# 18. Progress Bar

기본:

```css
.progress {
  height: 8px;

  border-radius: 6px;

  background: var(--muted);

  overflow: hidden;
}
```

Fill:

```css
.progress > i {
  display: block;

  height: 100%;

  border-radius: 6px;

  transition:
    width 700ms
    cubic-bezier(.2, .8, .2, 1);
}
```

복합 진행률에서는 Gradient를 사용할 수 있다.

```css
background:
  linear-gradient(
    90deg,
    var(--mint),
    var(--violet)
  );
```

---

# 19. Journey / Stepper

Career Roadmap과 같은 진행 구조에서는 Stepper를 사용한다.

기본:

```css
.steps {
  display: grid;

  grid-template-columns:
    repeat(7, 1fr);

  position: relative;

  padding-top: 8px;
}
```

연결선:

```css
.steps::before {
  content: "";

  position: absolute;

  left: 7%;
  right: 7%;
  top: 24px;

  height: 2px;

  background: var(--border);
}
```

Step Marker:

```css
.step-marker {
  width: 34px;
  height: 34px;

  margin: 0 auto 10px;

  border:
    4px solid var(--card);

  border-radius: 50%;

  background: var(--muted);

  color: var(--muted-foreground);

  display: grid;
  place-items: center;

  font-size: 12px;
  font-weight: 800;

  box-shadow:
    0 0 0 1px var(--border);
}
```

완료:

```css
.step.done .step-marker {
  background: var(--mint);
  color: #fff;

  box-shadow:
    0 0 0 1px var(--mint);
}
```

현재:

```css
.step.current .step-marker {
  background: var(--violet);
  color: #fff;

  box-shadow:
    0 0 0 5px var(--violet-soft);
}
```

---

# 20. Tabs

Tabs는 Segmented Control 형태다.

Container:

```css
.tabs-list {
  display: inline-flex;

  height: 38px;

  padding: 4px;

  border-radius: 10px;

  background: var(--muted);

  gap: 4px;
}
```

Trigger:

```css
.tab-trigger {
  height: 30px;

  padding: 0 12px;

  border: 0;

  border-radius: 8px;

  background: transparent;

  color: var(--muted-foreground);

  font-size: 12px;
  font-weight: 700;
}
```

Active:

```css
.tab-trigger.active {
  background: var(--card);

  color: var(--foreground);

  box-shadow:
    0 1px 4px rgba(16, 24, 40, .08);
}
```

---

# 21. Icon System

Icon은 Filled Icon보다 Outline SVG를 사용한다.

기본:

```css
.icon {
  width: 18px;
  height: 18px;

  stroke: currentColor;

  stroke-width: 1.8;

  fill: none;

  stroke-linecap: round;
  stroke-linejoin: round;
}
```

권장 라이브러리:

- Lucide
- Feather 계열

## 지양

- Emoji Icon
- 굵은 Filled Icon
- 서로 다른 스타일의 Icon Library 혼합
- 불필요한 3D Icon

---

# 22. Top Navigation

최종 디자인의 핵심 Navigation은 Top Navigation이다.

구조:

```text
LOGO
│
├ Navigation
│
├ Search
├ Notification
└ Profile
```

Topbar:

```css
.topbar {
  min-height: 80px;

  border-bottom:
    1px solid var(--border);

  background: #fff;

  position: sticky;

  top: 0;

  z-index: 40;
}
```

Container:

```css
.topbar-inner {
  width: 100%;

  max-width: 1440px;

  min-height: 80px;

  margin: 0 auto;

  display: flex;
  align-items: center;

  gap: 24px;
}
```

## Navigation Item

```css
.top-nav .nav-item {
  height: 80px;

  padding: 0 8px;

  border-bottom:
    3px solid transparent;

  border-radius: 0;

  background: transparent;

  color: #344054;
}
```

Hover:

```css
.top-nav .nav-item:hover {
  color: var(--violet);
}
```

Active:

```css
.top-nav .nav-item.active {
  color: var(--violet);

  border-bottom-color:
    var(--violet);
}
```

## 중요한 규칙

Active Navigation은 배경색을 채우는 방식보다:

```text
Text Violet
+
Bottom Border Violet
```

형태로 표현한다.

---

# 23. Top Utility Icon Button

검색 / 알림 등 Utility Button:

```css
.topbar .icon-button {
  width: 36px;
  height: 36px;

  border: 0;

  border-radius: 50%;

  background: #f2f4f7;

  color: #344054;
}
```

Hover:

```css
.topbar .icon-button:hover {
  background: #eaecf0;

  color: var(--violet);
}
```

---

# 24. Notification Indicator

작은 Dot 방식으로 표현한다.

```css
.notification-button {
  position: relative;
}

.notification-button::after {
  content: "";

  width: 6px;
  height: 6px;

  border:
    2px solid #fff;

  border-radius: 50%;

  background: var(--coral);

  position: absolute;

  top: 6px;
  right: 6px;
}
```

---

# 25. Profile UI

Profile Trigger는 Pill 형태지만 과하지 않게 유지한다.

```css
.profile-trigger {
  height: 44px;

  padding: 4px;

  border: 0;

  border-radius: 24px;

  background: transparent;

  display: flex;
  align-items: center;

  gap: 4px;

  color: #667085;
}
```

Avatar:

```css
.profile-avatar-icon {
  width: 36px;
  height: 36px;

  border:
    1px solid #e4e7ec;

  border-radius: 50%;

  background:
    linear-gradient(
      145deg,
      #eef2ff,
      #f9e8ff
    );

  color: var(--violet);

  display: grid;
  place-items: center;
}
```

---

# 26. Search

## Header Search

```css
.search {
  width: 240px;
  height: 38px;

  padding: 0 12px;

  border:
    1px solid var(--border);

  border-radius: 10px;

  background: var(--card);

  display: flex;
  align-items: center;

  gap: 8px;
}
```

## Global Search Modal

Overlay:

```css
.search-backdrop {
  background:
    rgba(15, 23, 42, .48);
}
```

Panel:

```css
.search-panel {
  width:
    min(760px, 100%);

  padding: 24px;

  border:
    1px solid #eaecf0;

  border-radius: 20px;

  background: #fff;

  box-shadow:
    0 32px 80px rgba(15, 23, 42, .24);
}
```

---

# 27. Form / Input

기본 방향:

- White Background
- 1px Border
- 10px Radius
- 38~56px Height
- Focus 시 Violet Ring
- 과도한 Shadow 사용 금지

Header 수준의 작은 Input:

```css
height: 38px;
border-radius: 10px;
```

중요 Search / Modal Input:

```css
height: 56px;
```

---

# 28. List Item

리스트형 콘텐츠:

```css
.list-item {
  padding: 12px;

  border:
    1px solid var(--border);

  border-radius: 10px;

  background: var(--card);

  display: grid;

  grid-template-columns:
    36px 1fr auto;

  gap: 12px;

  align-items: center;
}
```

Hover:

```css
.list-item:hover {
  border-color: var(--input);

  background: var(--muted);
}
```

---

# 29. Table

Wrapper:

```css
.table-wrap {
  overflow: auto;

  border:
    1px solid var(--border);

  border-radius: 10px;
}
```

Table:

```css
table {
  width: 100%;

  border-collapse: collapse;

  font-size: 12px;
}
```

Cell:

```css
th,
td {
  padding: 12px 14px;

  border-bottom:
    1px solid var(--border);

  text-align: left;

  white-space: nowrap;
}
```

Header:

```css
th {
  background: var(--muted);

  color: var(--muted-foreground);

  font-weight: 800;
}
```

---

# 30. Checkbox

기본:

```css
.checkbox {
  appearance: none;

  width: 18px;
  height: 18px;

  margin: 0;

  border:
    2px solid var(--input);

  border-radius: 5px;

  background: var(--card);

  position: relative;

  cursor: pointer;
}
```

Checked:

```css
.checkbox:checked {
  border-color: var(--mint);

  background: var(--mint);
}
```

---

# 31. Chart Design

Chart는 전체 디자인을 해치지 않도록 선과 면을 가볍게 사용한다.

## Radar

Grid:

```css
stroke: var(--border);
stroke-width: 1;
```

Average:

```css
stroke: #aeb7c5;
stroke-width: 1.5;

stroke-dasharray: 5 5;
```

Need:

```css
fill:
  rgba(255, 107, 107, .08);

stroke: var(--coral);
stroke-width: 2;
```

Mine:

```css
fill:
  rgba(124, 92, 252, .18);

stroke: var(--violet);
stroke-width: 2.5;
```

---

# 32. Metric Bar

```css
.axis-track {
  height: 8px;

  border-radius: 6px;

  background: var(--muted);

  position: relative;
}
```

Fill:

```css
.axis-track i {
  height: 100%;

  border-radius: 6px;

  background:
    linear-gradient(
      90deg,
      var(--violet),
      var(--sky)
    );
}
```

---

# 33. Toast

Toast는 화면 우측 하단에 표시한다.

```css
.toast {
  position: fixed;

  right: 24px;
  bottom: 24px;

  max-width: 340px;

  padding: 14px 16px;

  border:
    1px solid var(--border);

  border-radius: 12px;

  background: var(--card);

  box-shadow:
    0 18px 50px rgba(10, 18, 34, .18);

  display: flex;
  align-items: center;

  gap: 12px;

  font-size: 12px;
}
```

Success Icon:

```css
.toast-icon {
  width: 28px;
  height: 28px;

  border-radius: 8px;

  background: var(--mint-soft);

  color: var(--mint);

  display: grid;
  place-items: center;

  font-weight: 900;
}
```

---

# 34. Interaction

UI Interaction은 과하지 않게 한다.

주요 Duration:

```text
160ms
180ms
200ms
240ms
```

예:

```css
transition:
  background 160ms,
  border-color 160ms;
```

Hover에서 변경할 수 있는 속성:

- Background
- Border Color
- Text Color
- Icon Color
- 매우 작은 Transform

## 지양

- 큰 Scale 효과
- 3D Rotation
- 과도한 Glow
- 긴 Animation
- 과도한 Bounce

---

# 35. Reveal Animation

페이지 진입 카드에는 가벼운 Fade Up을 사용할 수 있다.

Initial:

```css
.reveal {
  opacity: 0;

  transform:
    translateY(20px);

  transition:
    opacity 600ms ease,
    transform 600ms ease;
}
```

Visible:

```css
.reveal.visible {
  opacity: 1;

  transform: none;
}
```

---

# 36. Responsive Breakpoints

주요 Breakpoint:

```text
1360px
1120px
1100px
760px
```

---

# 37. Desktop ≥ 1360px

기본 Desktop UI.

- Top Navigation 한 줄
- 12 Column Dashboard
- KPI 4 Column
- Full Search UI
- Full Profile UI

---

# 38. Tablet / Small Desktop ≤ 1360px

Topbar 구조 변경.

Navigation이 아래 행으로 내려가며 Horizontal Scroll 가능.

```css
.top-nav {
  width: 100%;

  justify-content: flex-start;

  overflow-x: auto;

  scrollbar-width: none;
}
```

---

# 39. Tablet ≤ 1120px

KPI:

```text
4 Columns
→
2 Columns
```

Main Dashboard Cards:

```text
8 + 4
7 + 5

→

12
12
12
12
```

즉 주요 카드는 Full Width로 변경한다.

---

# 40. Mobile ≤ 760px

Main Padding:

```css
.main {
  padding:
    24px 20px 24px;
}
```

KPI:

```text
2 Columns
→
1 Column
```

Dashboard:

```text
12 Column Grid
→
1 Column
```

Welcome:

```text
Horizontal
→
Vertical
```

Search:

```text
Hide
```

Profile:

```text
Avatar + Text
→
Avatar Only
```

Button:

일부 Action Button은 Icon-only로 변경할 수 있다.

Tabs:

```css
overflow: auto;
white-space: nowrap;
```

Stepper:

Horizontal Scroll을 허용한다.

---

# 41. Dark Mode

원본 코드에는 Dark Mode Token이 존재한다.

```css
body.dark {
  --background: #111318;

  --foreground: #f5f7fb;

  --card: #191c24;

  --card-foreground: #f5f7fb;

  --muted: #232731;

  --muted-foreground: #9ea6b4;

  --border: #2b303b;

  --input: #363c48;

  --blue-soft: #1c2948;

  --violet-soft: #2a2344;

  --mint-soft: #17352e;

  --coral-soft: #3a2225;

  --amber-soft: #382f1b;

  --sky-soft: #172f3a;

  --pink-soft: #3b2031;

  --shadow:
    0 2px 8px rgba(0, 0, 0, .16);
}
```

현재 디자인의 기본 기준은 Light Mode이며 Dark Mode는 Secondary Theme로 취급한다.

---

# 42. Accessibility

아래 규칙을 유지한다.

## Screen Reader Only

```css
.sr-only {
  position: absolute;

  width: 1px;
  height: 1px;

  padding: 0;
  margin: -1px;

  overflow: hidden;

  clip:
    rect(0, 0, 0, 0);

  white-space: nowrap;

  border: 0;
}
```

ARIA 적용 예:

```html
<div
  role="progressbar"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuenow="42">
</div>
```

Stepper:

```html
<div
  role="list"
  aria-label="CARE+7 로드맵 단계">
</div>
```

Current Step:

```html
<div aria-current="step">
```

---

# 43. Content Hierarchy

카드 내 정보는 다음 구조를 기본으로 한다.

```text
Title
↓
Description
↓
Primary Data / Main Content
↓
Status / Supporting Data
↓
Action
```

정보 우선순위:

```text
1. 사용자에게 가장 중요한 현재 상태
2. 숫자 / 진행률
3. 설명
4. 다음 행동
5. 상세 정보
```

---

# 44. Dashboard UX 원칙

Dashboard는 단순 통계 나열이 아니라 다음 세 가지 질문에 답해야 한다.

```text
1. 지금 나는 어디에 있는가?
2. 무엇이 부족한가?
3. 다음에 무엇을 해야 하는가?
```

따라서 모든 Dashboard 페이지에서는 다음 요소를 우선한다.

- Current State
- Progress
- Gap
- Next Action
- Recommended Action
- Completion Status

---

# 45. 컴포넌트 우선순위

신규 페이지는 가능한 한 아래 공통 컴포넌트를 재사용한다.

```text
AppShell
TopNavigation
PageHeader
Card
StatCard
Button
Badge
Progress
Tabs
ListItem
Table
Modal
Toast
Stepper
Search
ProfileMenu
ChartCard
EmptyState
```

같은 기능을 페이지마다 새로운 스타일로 다시 만들지 않는다.

---

# 46. 권장 CSS Token

신규 개발에서는 아래 Token을 공통으로 사용한다.

```css
:root {
  /* =========================
     Neutral
  ========================= */

  --bg-page: #f7f8fb;
  --bg-card: #ffffff;
  --bg-muted: #f1f3f6;

  --text-primary: #181c25;
  --text-secondary: #565e6d;

  --border-default: #e2e6ec;
  --border-strong: #d8dde5;


  /* =========================
     Brand
  ========================= */

  --primary: #7c5cfc;
  --primary-soft: #f0edff;


  /* =========================
     Semantic
  ========================= */

  --blue: #356dff;
  --blue-soft: #eaf0ff;

  --mint: #20b486;
  --mint-soft: #e5f8f2;

  --coral: #ff6b6b;
  --coral-soft: #fff0f0;

  --amber: #f5a524;
  --amber-soft: #fff6df;

  --sky: #17a9e6;
  --sky-soft: #e7f7fd;

  --pink: #e85aad;
  --pink-soft: #fdebf6;


  /* =========================
     Radius
  ========================= */

  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-modal: 20px;


  /* =========================
     Layout
  ========================= */

  --container: 1440px;

  --grid-gap: 16px;


  /* =========================
     Spacing
  ========================= */

  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 20px;
  --space-2xl: 24px;
  --space-3xl: 32px;


  /* =========================
     Motion
  ========================= */

  --duration-fast: 160ms;
  --duration-normal: 240ms;


  /* =========================
     Shadow
  ========================= */

  --shadow-card:
    0 2px 8px rgba(22, 28, 45, .04);

  --shadow-popup:
    0 16px 40px rgba(18, 24, 38, .14);

  --shadow-modal:
    0 32px 80px rgba(15, 23, 42, .24);
}
```

---

# 47. 신규 페이지 제작 시 반드시 지킬 규칙

1. Page Background는 `#F7F8FB`.
2. 기본 Card는 White.
3. Card Border는 `1px solid #E2E6EC`.
4. Main Card Radius는 12px.
5. Card 내부 Padding은 기본 20px.
6. Card 간격은 기본 16px.
7. Primary Color는 `#7C5CFC`.
8. Accent Color는 Main + Soft Pair 방식으로 사용.
9. 과도한 Shadow를 사용하지 않는다.
10. 한 카드에 지나치게 많은 강한 색상을 사용하지 않는다.
11. Icon은 Outline SVG 스타일을 유지한다.
12. Button Height는 기본 36px.
13. Navigation Active는 Violet Text + Bottom Border.
14. KPI 숫자는 최소 28px, Weight 900 수준으로 강조한다.
15. Description은 12~13px Muted Color를 사용한다.
16. Desktop은 12 Column Grid를 기본으로 한다.
17. 주요 콘텐츠 최대 너비는 1440px.
18. Responsive 시 2 Column → 1 Column으로 단계적으로 전환한다.
19. Hover Animation은 160~240ms 수준으로 제한한다.
20. Mobile에서는 불필요한 텍스트를 줄이고 Action을 Icon-only로 단순화할 수 있다.

---

# 48. 금지 사항

같은 서비스 안에서 아래 디자인을 임의로 적용하지 않는다.

## 과도한 Glassmorphism

금지:

```css
backdrop-filter: blur(40px);
background: rgba(...);
```

를 모든 카드에 적용하는 방식.

## 과도한 Shadow

금지:

```css
box-shadow:
  0 20px 60px rgba(...);
```

를 일반 카드에 반복 적용.

## 과도한 Radius

일반 카드:

```text
24px
32px
40px
```

사용 금지.

## 과도한 Gradient

전체 Dashboard Card를 Gradient로 채우는 방식 지양.

Gradient는 다음에 한정한다.

- Progress
- Avatar
- Selected Highlight
- Hero / Goal Card 일부
- Chart Fill

## Emoji Icon 사용 금지

다음과 같은 Icon:

```text
🔥
⭐
🚀
📌
```

을 UI Icon 대신 사용하지 않는다.

## 모든 요소에 Primary Color 적용 금지

Primary Color는 Hierarchy를 만드는 데 사용한다.

모든 Card / Button / Badge / Icon이 Violet이면 안 된다.

---

# 49. 화면 제작 순서

신규 화면 제작 시 다음 순서로 구성한다.

## Step 1

App Shell 설정.

```text
Top Navigation
Main Container
Page Background
```

## Step 2

Page Header 설정.

```text
Title
Description
Optional Action
```

## Step 3

Information Hierarchy 설정.

```text
Primary KPI
Status
Main Content
Next Action
```

## Step 4

12 Column Grid 배치.

## Step 5

Card Component 적용.

## Step 6

Semantic Accent Color 배정.

## Step 7

Tablet / Mobile Responsive 적용.

## Step 8

Hover / Focus / Animation 적용.

---

# 50. Codex용 구현 지침

아래 내용을 Codex에게 그대로 전달할 수 있다.

---

## Codex Instruction

이 프로젝트의 기존 UI 스타일을 유지해서 신규 페이지를 구현한다.

### 절대적으로 유지할 디자인 원칙

- 전체 배경은 `#F7F8FB`
- 기본 Card는 White
- Card Border는 `#E2E6EC`
- Primary Color는 `#7C5CFC`
- Card Radius는 12px
- Inner Component Radius는 8~10px
- Card Padding은 20px
- Grid Gap은 16px
- Max Content Width는 1440px
- Font는 Pretendard 우선
- 기본 Body Text는 13px 전후
- Card Title은 16px / 800
- KPI는 28~32px / 900
- Description은 `#565E6D`
- Icon은 Outline SVG
- Shadow는 최소화
- Button 기본 높이는 36px
- Button Radius는 10px
- Hover Transition은 160~240ms
- Desktop은 12 Column Grid
- Tablet은 2 Column 중심
- Mobile은 1 Column
- 한글은 `word-break: keep-all`

### Component Styling

기본 Card:

```css
.card {
  background: #fff;
  border: 1px solid #e2e6ec;
  border-radius: 12px;
}
```

기본 Button:

```css
.button {
  height: 36px;
  padding: 0 14px;

  border:
    1px solid #e2e6ec;

  border-radius: 10px;

  background: #fff;

  font-size: 13px;
  font-weight: 700;
}
```

Primary Button:

```css
.button-primary {
  background: #7c5cfc;
  border-color: #7c5cfc;
  color: #fff;
}
```

Muted Text:

```css
color: #565e6d;
```

Main Text:

```css
color: #181c25;
```

### Semantic Colors

```css
--violet: #7c5cfc;
--violet-soft: #f0edff;

--blue: #356dff;
--blue-soft: #eaf0ff;

--mint: #20b486;
--mint-soft: #e5f8f2;

--coral: #ff6b6b;
--coral-soft: #fff0f0;

--amber: #f5a524;
--amber-soft: #fff6df;

--sky: #17a9e6;
--sky-soft: #e7f7fd;

--pink: #e85aad;
--pink-soft: #fdebf6;
```

### UX

각 화면은 다음 질문에 답하도록 설계한다.

```text
현재 상태는 무엇인가?
어떤 항목이 부족한가?
다음 행동은 무엇인가?
진행률은 어느 정도인가?
```

단순한 통계 카드만 나열하지 말고 Actionable Dashboard로 구현한다.

### 금지

- 과도한 Shadow
- 과도한 Glow
- 일반 카드에 20px 이상의 큰 Radius
- 모든 요소에 Violet 적용
- Emoji Icon
- 무분별한 Gradient
- 카드마다 서로 다른 디자인 스타일
- 불필요한 3D 효과
- 지나치게 큰 Font
- Desktop만 고려한 고정 Width Layout

### Responsive

Desktop:

```text
≥ 1120px
12-column Dashboard
```

Tablet:

```text
760px ~ 1120px
2-column 중심
```

Mobile:

```text
≤ 760px
1-column
```

필요할 경우 Horizontal Scroll 허용:

- Tabs
- Stepper
- Navigation
- Wide Table

---

# 51. 최종 요약

이 디자인 시스템의 핵심은 다음과 같다.

```text
밝은 회색 Page Background
+
White Cards
+
얇은 Border
+
12px Radius
+
Violet Primary
+
Semantic Soft Color
+
Pretendard Typography
+
12 Column Dashboard
+
낮은 Shadow
+
Outline Icon
+
Actionable Information Hierarchy
```

새로운 페이지를 만들 때 기존 화면과 똑같은 컴포넌트를 복제할 필요는 없지만, 위의 Design Token과 Layout Rule, Typography, Border, Radius, Color Usage를 유지해야 동일한 서비스로 인식된다.

특히 이 프로젝트에서는 화려한 장식보다 **정보 구조, 진행 상태, 다음 행동을 명확하게 보여주는 것**을 우선한다.
