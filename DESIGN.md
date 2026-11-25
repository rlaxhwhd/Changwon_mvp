# Design System Inspired by 국립창원대학교 드림캐치

> Auto-extracted from `https://sian.njob.net/2026/dreamcatch/stu_dash.html` on 2026-08-28

## 1. Visual Theme & Atmosphere

Friendly, approachable design with rounded shapes and generous whitespace.

The hero section leads with "안녕하세요, 김민서님.오늘의 커리어 여정을 시작해 볼까요?".

**Key Characteristics:**
- Pretendard Variable as the heading font (custom web font loaded via @font-face)
- Pretendard Variable as the body font for all running text
- Heading weight 700, letter-spacing -0.64px
- Light/white background (#f7f8fb) as the primary canvas
- Primary accent `#1a5fcc` ink / `#3b82f6` CTA fill (admin blue, 2026-11-24 — was violet `#7c5cfc`)
- 8 shadow level(s) detected — tinted shadows
- Rounded corners (12px+) creating a friendly, approachable feel
- Tags: light, rounded, accented, sans-serif

## 2. Color Palette & Roles

> **2026-11-24 사용자 지시 — 학생 포털 보라 → admin 파랑.** 학생 브랜드색을 admin 팔레트(`src_admin/index.css`)에 맞췄다:
> 잉크 `--primary` `#1a5fcc`(admin `--on-blue`), 버튼 채움 `--cta` `#3b82f6`(admin `--blue`), 민트 `--mint` `#24b37a`(admin `--green`).
> `--violet*` 토큰 이름은 남아 있지만 값은 파랑이다. 보라와 파랑이 한 세트였던 색 칸(로드맵 3축·진단 5종·지표·하루 3종)은 옛 파랑 칸을 `--sky`·`--amber` 로 옮겼다.
> 아래 표의 보라 값은 시안 추출 당시 기록이다 — 현재 값의 정본은 `src_v2/index.css` 1층.

### 색 계층 — 주 색상 / 하위 색상 (2026-11-25 사용자 확정)

| 계층 | 색 | 토큰 | 쓰는 곳 |
|---|---|---|---|
| **1차 · 주 색상** | 진한 파랑 `#1a5fcc` | `--primary` (`--color-primary`) | 강조 — 강조 단어(이름·수치), 섹션 키커, 링크·아이콘, 선택 표시·포커스 링. 버튼 채움은 같은 계열 `#3b82f6`(`--cta`), hover 는 `#1a5fcc` |
| **2차 · 하위 색상** | 하늘 `#17a9e6` | `--sky` | 1차를 받치는 하위 계층 — 보조 아이콘·배지·태그, 진행 막대·차트의 두 번째 계열, 보조 안내 면(`--sky-soft` `#e7f7fd` · `--sky-tint` `#ebfaff`) |

- **제목·소제목 글자는 검정(`--foreground` `#181c25`)을 유지한다** — 파랑은 제목 글자색으로 쓰지 않는다(2026-11-25 사용자 확정).
- 한 화면의 강조는 1차가 주인이다. 2차는 1차보다 넓거나 세게 쓰지 않는다.
- **카드별 구분색은 글자에도 그대로 입힌다(2026-11-25 사용자 확정).** 지표 카드(진단 완료·상담 현황·로드맵 이행률 …)의 키커(`CARE 7+`)와 진단 결과 카드의 검사 코드·결과·태그 글자는 그 카드의 구분색(`--stat-n`·`--diagnosis-n` = 민트·하늘·파랑 …) 본색을 쓴다 — 어둡게 섞거나 주 색상으로 통일하지 않는다.
- 그 밖의 본문·설명 글자에 2차 `#17a9e6` 을 쓰지 않는다(흰 바탕 대비 2.7:1). 필요하면 `--sky-ink`.
- 1차·2차 밖의 파랑을 새로 들이지 않는다. `#1890ff` 는 2026-11-25 시험 후 쓰지 않기로 했다.

### Primary
- **Primary Accent** (`#1a5fcc`) · `--color-primary`: Brand color, link text, interactive highlights, icon/border ink.
- **CTA Fill** (`#3b82f6`) · `--cta` / `--color-cta`: solid button backgrounds only. Lighter than the ink; kept separate so the fill never becomes *text* below its contrast floor — the ink stays `#1a5fcc`.
- **Secondary Accent** (`#17a9e6`) · `--sky`: 2차 하위 색상 — 위 「색 계층」 표. 채움·아이콘·막대용이고 글자는 `--sky-ink`.
- **Background** (`#f7f8fb`) · `--color-bg`: Page background, primary canvas.
- **Background Secondary** (`#f1f3f6`) · `--color-bg-secondary`: Cards, surfaces, alternating sections.

### Assist
- **Sky Tint** (`#ebfaff`) · `--sky-tint`: 보조 연한 면 — 링크 행·선택 가능한 목록 행의 hover, 안내 영역 배경. 글자색으로 쓰지 않는다(2026-11-24 추가, 두 포털 공통).

### Text
- **Text Primary** (`#181c25`) · `--color-text`: Headings and body text.
- **Text Secondary** (`#666666`) · `--color-text-secondary`: Muted text, captions, placeholders.

### Borders & Surfaces
- **Border** (`#f1f3f6`) · `--color-border`: Dividers, outlines, input borders.

### Full Extracted Palette

| # | Hex | CSS Variable | Role | Area | Contrast |
|---|---|---|---|---|---|
| 1 | `#ffffff` | `--palette-1` | block | large | text-dark |
| 2 | `#f1f3f6` | `--palette-2` | button | medium | text-dark |
| 3 | `#e5f8f2` | `--palette-3` | badge | medium | text-dark |
| 4 | `#7c5cfc` | `--palette-4` | text-accent | small | text-light |
| 5 | `#fdebf6` | `--palette-5` | badge | small | text-dark |
| 6 | `#20b486` | `--palette-6` | text-accent | small | text-dark |
| 7 | `#fff6df` | `--palette-7` | badge | small | text-dark |
| 8 | `#344054` | `--palette-8` | text-accent | small | text-light |
| 9 | `#356dff` | `--palette-9` | text-accent | small | text-light |

## 3. Typography Rules

- **Heading Font:** `Pretendard Variable` (web font)
- **Body Font:** `Pretendard Variable` (web font)

### Type Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| H1 | Pretendard Variable | 32px | 700 | 44px | -0.64px |
| H2 | Pretendard Variable | 20px | 700 | 28px | normal |
| H3 | Pretendard Variable | 28px | 700 | normal | normal |
| Body | Pretendard Variable | 14px | 400 | 20px | normal |
| Small | Pretendard Variable | 12px | 400 | normal | normal |

### Type Scale

| Token | Size | Suggested Usage |
|---|---|---|
| Display | `32px` | headings |
| H1 | `30px` | headings |
| H2 | `28px` | headings |
| H3 | `24px` | headings |
| H4 | `20px` | headings |
| Body L | `18px` | body / supporting text |
| Body | `16px` | body / supporting text |
| Small | `15px` | body / supporting text |
| XS | `14px` | body / supporting text |
| Caption | `13px` | body / supporting text |

## 4. Component Stylings

> **2026-11-24 — 카드·버튼 규격은 참고 디자인(DESIGN_v1, 사람인 포털)의 컴포넌트 구조를 따른다.**
> 가져온 것은 **구조**(테두리로 면 나누기·높이 단계·여백·상태·포커스 링)뿐이다. **색·폰트·radius 는 이 문서의 우리 토큰을 그대로 쓴다**
> (색 §2·§10, 폰트 §3, radius `src_v2/index.css` 형태 스케일 12·10·8·6·pill). 참고 디자인의 AI 그라데이션 버튼은 들이지 않는다(그라데이션 금지).
> **구현 위치(2026-11-24):** `shared/ui/ui.css`(두 포털 `main.tsx` 가 불러온다) · `shared/ui/Button.tsx` · `shared/ui/Card.tsx`.
> 새 화면은 `<Button variant="primary|outline|text|danger" size="sm|md|lg">` 와 `<Card variant="compact|featured|dark|link">`(= `.dc-btn`·`.dc-card`)를 쓰고 화면 전용 버튼·카드 클래스를 새로 만들지 않는다.
> 옛 화면별 클래스(`.crm-btn-*`·`.ac-btn-*`·`.counsel-*-btn` 등)는 `ui.css` 의 「연결」 목록으로 같은 규격을 받는다 — 화면을 고칠 때 `.dc-*` 로 바꾸고 목록에서 지운다(첫 이전: 비교과 신청서).
> 월 달력은 `shared/components/HistoryCalendar` 가 공용이고, 출석·퀘스트·교직원 상담 신청 달력은 날짜 칸 모양(오늘·선택·hover·이동 버튼)만 `ui.css` 로 맞춘다.

### 공통 규칙
- **면은 테두리로 나눈다.** 카드에 그림자·그라데이션을 쓰지 않는다(1px `--border` 또는 연한 면 `--muted`·`--blue-wash`·`--sky-tint`). 떠 있는 컨트롤(캐러셀 화살표 등) 하나만 `--shadow-raise`.
- **포커스 링은 모든 컨트롤에 같다** — `outline: 2px solid var(--primary); outline-offset: 2px;` (작은 글자 링크는 `border-radius: 4px`).
- **hover 와 pressed 는 같은 상태다.** 색만 바뀌고 크기·위치는 움직이지 않는다. 전환은 즉시(길어도 150ms).
- **비활성**은 `opacity: .5; cursor: not-allowed;` — 색을 따로 만들지 않는다.
- 높이 단계는 **32 · 40 · 52** 세 가지다(작은 보조 · 기본 · 검색처럼 큰 입력).

### Primary Button — 채움 (주 행동 1개)

```css
.btn-primary {
  height: 40px;              /* 큰 CTA 52px */
  padding: 0 16px;
  border: 0;
  border-radius: var(--radius-md);   /* 10px */
  background: var(--cta);            /* #3b82f6 */
  color: var(--primary-foreground);  /* #fff */
  font: 700 14px/1 var(--font);
}
.btn-primary:hover,
.btn-primary:active { background: var(--cta-hover); }  /* #1a5fcc */
```
화면당 주 행동 하나에만 쓴다. 나머지 행동은 아래 외곽선·텍스트 버튼으로 낮춘다.

### Outline Button — 외곽선 (보조 행동 · 참고 디자인의 「기업서비스」 버튼)

```css
.btn-outline {
  height: 32px;              /* 기본 크기 행동과 나란히 둘 때 40px */
  padding: 0 12px;
  border: 1px solid var(--border);   /* #e2e6ec */
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--foreground);          /* 대비 확보 — 회색 글자 금지 */
  font: 700 13px/1 var(--font);
}
.btn-outline:hover,
.btn-outline:active { background: var(--muted); }      /* #f1f3f6 */
```

### Text Button — 글자 버튼 (메뉴·로그인류 링크 · 참고 디자인의 「전체메뉴」「로그인」)

```css
.btn-text {
  height: 40px;
  padding: 0 4px;
  border: 0;
  background: none;
  color: var(--foreground);
  font: 400 14px/24px var(--font);   /* 메뉴처럼 찾아야 하는 이름은 700 */
}
.btn-text:hover,
.btn-text:active { color: var(--primary); }            /* 아이콘도 같은 색 */
```

### Icon Button — 원형 (캐러셀 화살표 · 참고 디자인의 「다음」)

```css
.btn-icon {
  width: 40px; height: 40px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--card);
  color: var(--foreground);
  box-shadow: var(--shadow-raise);   /* 사진·카드 위에 떠 있을 때만 */
}
```

### Search Field — 큰 외곽선 입력 (참고 디자인의 헤더 검색)

```css
.search-field {
  height: 52px;
  padding: 0 20px;
  gap: 12px;                         /* 문구와 아이콘 사이 */
  border: 2px solid var(--primary);  /* 화면의 대표 입력 하나만 2px 브랜드 테두리 */
  border-radius: var(--radius-pill);
  background: var(--card);
}
```

### Card — 기본 카드

```css
.card {
  padding: 24px 24px 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius);      /* 12px */
  background: var(--card);           /* 단색 흰 면 — 그라데이션·그림자 없음 */
}
```

### Compact Card — 목록 카드 (공고·프로그램 격자)
- 기본 카드와 같고 `padding: 16px 24px;` — 격자에서 카드 높이를 고정할 때 쓴다.

### Featured Card — 강조 카드
- 기본 카드에서 테두리만 `1px solid var(--primary)` 로 바꾼다. 배경색·배지로 강조하지 않는다. 한 격자에서 몇 개만 쓴다.

### Link Row Card — 안내 링크 행 (참고 디자인의 인사말 패널 링크)

```css
.link-row {
  padding: 16px 0 16px 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);                                   /* #f1f3f6 */
}
.link-row:hover {
  background: var(--sky-tint);                                /* #ebfaff */
  border-color: color-mix(in srgb, var(--sky) 30%, transparent);
}
```

### Dark Card — 진한 강조 카드 (오늘 할 일·목표 카드)
- 배경 `var(--deep-end)` 단색 · 글자 흰색 · 테두리 없음. 한 화면에 하나만.
- 진한 카드 곁에 붙는 보조 띠(예: 라운지 목표 달성 계획의 「로드맵 진행」)는 진하게 칠하지 않고 **연한 파랑 면**으로 받친다 — 배경 `--blue-wash`, 테두리 `--blue-border`, 아이콘 칸 흰 면 + `--primary`, 버튼은 흰 외곽선 버튼(2026-11-25 사용자 확정).

### List Table
열 제목이 있는 목록·현황 표는 `/professor/home` 「학과학생 현황」 표가 기준이다 — `shared/listTable.css`(표 안 글자 14px, 강조선 각 SPA `--primary`, 긴 글 본문 칸만 `dc-cell-long` 왼쪽 정렬, 칸 안 라벨(진단유형·학적·상태)은 여백 2px 8px·줄높이 1.3으로 글자에 맞추고 굵기 400).

## 5. Layout Principles

- **Base spacing unit:** `8px` — use multiples (16px, 24px, 32px, etc.)

### Spacing Scale (extracted from real elements)

| Token | Value | Role |
|---|---|---|
| spacing-1 | `8px` | element |
| spacing-2 | `20px` | element |
| spacing-3 | `16px` | element |
| spacing-4 | `3px` | element |
| spacing-5 | `12px` | element |
| spacing-6 | `14px` | element |
| spacing-7 | `1px` | element |
| spacing-8 | `24px` | card |

### Border Radius Scale

| Token | Value | Element |
|---|---|---|
| radius-button | `12px` | button |
| radius-button | `10px` | button |
| radius-button | `6px` | button |
| radius-button | `8px` | button |
| radius-card | `50px` | card |
| radius-subtle | `5px` | subtle |

## 6. Depth & Elevation

| Level | Shadow | Usage |
|---|---|---|
| Low | `rgba(24, 28, 37, 0.16) 0px 0px 0px 1px` | Cards, subtle elevation |
| Low | `rgb(32, 180, 134) 0px 0px 0px 1px` | Cards, subtle elevation |
| Low | `rgb(226, 230, 236) 0px 0px 0px 1px` | Cards, subtle elevation |
| Mid | `rgba(22, 28, 45, 0.04) 0px 2px 8px 0px` | Dropdowns, popovers |
| Deep | `rgba(15, 23, 42, 0.24) 0px 32px 80px 0px` | Hero sections, deep layers |

> **Note:** This site uses chromatic (color-tinted) shadows rather than pure black — this is a deliberate brand choice that adds warmth to elevation.

## 7. Do's and Don'ts

### Do
- Use `#f7f8fb` as the primary background color
- Use `Pretendard Variable` for all headings and `Pretendard Variable` for body text
- Use blue (`#1a5fcc` ink, `#3b82f6` fill) as the single dominant accent/CTA color — no violet
- Maintain `8px` as the base spacing unit — all gaps should be multiples
- Use rounded corners (`12px`+) consistently for all interactive elements
- Apply the shadow system for elevation — use the extracted shadow values
- Use weight 700 for headings to match the brand's typographic voice

### Don't
- Don't use colors outside the extracted palette without justification
- Don't substitute Pretendard Variable/Pretendard Variable with generic alternatives
- Don't use irregular spacing — stick to 8px grid
- Don't use dark/black backgrounds — this is a light-themed design
- Don't use sharp corners — they feel hostile in this rounded design language
- Don't use pure black (#000000) for text — use `#181c25` instead
- Don't add decorative elements not present in the original design — no badges, ribbons, banners, or ornaments unless the source site uses them
- Don't invent UI patterns the source site doesn't have — if the original has no NEW badge, don't add one just because a red is in the palette

## 8. Responsive Behavior

| Breakpoint | Width | Notes |
|---|---|---|
| Mobile | < 640px | Single column, stack sections, reduce font sizes ~80% |
| Tablet | 640–1024px | 2-column where appropriate, maintain spacing ratios |
| Desktop | 1024–1440px | Full layout as designed |
| Wide | > 1440px | Max-width container, center content |

- Touch targets: minimum 44×44px on mobile
- Maintain 8px base unit across breakpoints — only scale multipliers

## 9. Agent Prompt Guide

### Quick Color Reference

```
Background:  #f7f8fb
Text:        #181c25
Accent:      #1a5fcc (fill #3b82f6)
Secondary:   #17a9e6
Border:      #f1f3f6
```

### Example Prompts

1. "Build a hero section with a `#f7f8fb` background, `Pretendard Variable` heading in `#181c25`, and a `#3b82f6` CTA button with 50px radius."
2. "Create a pricing card using background `#f1f3f6`, border `#f1f3f6`, `Pretendard Variable` for text, and 24px padding."
3. "Design a navigation bar — `#f7f8fb` background, `#181c25` links, `#1a5fcc` for active state."
4. "Build a feature grid with 3 columns, 24px gap, each card using the card component style."
5. "Create a footer with `#181c25` background, `#f7f8fb` text, and 16px padding."

### Iteration Guide

1. Start with layout structure (sections, grid, spacing)
2. Apply colors from the palette — background first, then text, then accents
3. Set typography — font families, sizes from the type scale, weights
4. Add components — buttons, cards, inputs using the specs above
5. Apply border-radius consistently across all elements
6. Add shadows for depth — use the extracted shadow values, not defaults
7. Check responsive behavior — test mobile and tablet layouts
8. Final pass — verify all colors match, spacing is consistent, fonts are correct

## 10. CSS Custom Properties

> 101 custom properties extracted from `:root` / `html` stylesheets.

### Color Variables

| Variable | Value |
|---|---|
| `--background` | `#f7f8fb` |
| `--foreground` | `#181c25` |
| `--card` | `#ffffff` |
| `--card-foreground` | `#181c25` |
| `--muted` | `#f1f3f6` |
| `--muted-foreground` | `#565e6d` |
| `--border` | `#e2e6ec` |
| `--input` | `#d8dde5` |
| `--ring` | `var(--primary)` |
| `--primary` | `#1a5fcc` |
| `--primary-foreground` | `#ffffff` |
| `--cta` | `#3b82f6` |
| `--cta-hover` | `#1a5fcc` |
| `--cta-shadow` | `rgba(59, 130, 246, .22)` |
| `--blue` | `#3b82f6` |
| `--blue-soft` | `#e8f1ff` |
| `--violet` | `#3b82f6` (이름만 violet) |
| `--violet-soft` | `#e8f1ff` |
| `--mint` | `#24b37a` |
| `--mint-soft` | `#dff5ea` |
| `--coral` | `#ff6b6b` |
| `--coral-soft` | `#fff0f0` |
| `--amber` | `#f5a524` |
| `--amber-soft` | `#fff6df` |
| `--sky` | `#17a9e6` |
| `--sky-soft` | `#e7f7fd` |
| `--sky-tint` | `#ebfaff` |
| `--pink` | `#e85aad` |
| `--pink-soft` | `#fdebf6` |
| `--teal` | `#14b8a6` |
| `--teal-soft` | `#e6faf7` |
| `--violet-border` | `#cbd8ff` |
| `--violet-border-strong` | `color-mix(in srgb, var(--violet) 40%, #fff)` |
| `--violet-hover` | `#1a5fcc` |
| ... | *(21 more)* |

### Spacing Variables

| Variable | Value |
|---|---|
| `--sidebar` | `264px` |
| `--radius` | `12px` |

### Other Variables

| Variable | Value |
|---|---|
| `--stat-1` | `var(--mint)` |
| `--stat-1-soft` | `var(--mint-soft)` |
| `--stat-2` | `var(--sky)` |
| `--stat-2-soft` | `var(--sky-soft)` |
| `--stat-3` | `var(--amber)` |
| `--stat-3-soft` | `var(--amber-soft)` |
| `--stat-4` | `var(--pink)` |
| `--stat-4-soft` | `var(--pink-soft)` |
| `--stat-5` | `var(--violet)` |
| `--stat-5-soft` | `var(--violet-soft)` |
| `--stat-5-alt` | `var(--sky)` |
| `--journey-done` | `var(--mint)` |
| `--journey-done-soft` | `var(--mint-soft)` |
| `--journey-current` | `var(--violet)` |
| `--journey-current-soft` | `var(--violet-soft)` |
| ... | *(33 more)* |
