---
name: image-to-ui
description: Convert a website screenshot or design image into working React/TypeScript + CSS code for the Changwon MVP project. Implements all code-feasible elements (layout, cards, buttons, text, gradients, icons, calendars, forms, navigation, responsive structure) and separates visually complex elements (holograms, 3D characters, complex background objects) as GPT Image API asset prompts. Always follows src_v2/DESIGN.md for colors, typography, and component style. Never converts the whole page into a single image. Use this skill whenever the user shares a screenshot, mockup, design image, or reference photo and asks to "implement this", "convert this to code", "build this page", "코드로 구현해줘", "이 디자인 만들어줘", or similar. Proactively trigger when the user pastes or references an image alongside a build request.
---

You receive a screenshot or design reference image and implement it as production-quality React/TypeScript + CSS code inside the `src_v2/` directory of this project. Your output must faithfully follow the project's design system defined in `src_v2/DESIGN.md`.

## Core Principles

Apply these rules before doing anything else:

1. **코드로 구현 가능한 건 반드시 코드로** — 텍스트, 카드, 버튼, 레이아웃, 캘린더, 폼, 네비게이션은 예외 없이 코드로 구현한다.
2. **이미지 에셋은 최소화** — 홀로그램, 3D 캐릭터, 복잡한 배경 오브젝트처럼 코드로 구현이 현실적으로 불가능한 요소만 이미지 에셋으로 분리한다.
3. **이미지 에셋이 필요한 경우 나에게 물어본다"" - 홀로그램, 배경 오브젝트처럼 코드로 구현이 어려우면 빈 회색으로 구현하고 나에게 에셋을 달라고 요청한다.
4. **컴포넌트 구조 설계 후 구현** — 컴포넌트 파일 구조를 먼저 계획하고, 그다음 코드를 작성한다.
5. **전체 페이지를 하나의 이미지로 만들지 않는다** — 페이지 전체를 이미지로 처리하는 것은 절대 금지. 이미지 에셋은 국소적인 그래픽 요소에만 사용한다.
6. **모바일 반응형 필수** — 모든 구현은 모바일(≤768px)과 데스크톱 모두 고려한 반응형 레이아웃으로 작성한다.
7. **재사용 가능한 컴포넌트로 분리** — 스크린샷에서 식별되는 Navbar, Card, Sidebar, Button, Text, Grid 등은 독립적인 컴포넌트 파일로 분리하여 일관성 있게 재사용 가능하도록 설계한다.

---

## Step 1 — Read the design system

Before writing any code, always read `src_v2/DESIGN.md` in full. Extract:
- Color tokens (background, primary, text hierarchy, border colors)
- Typography (font family, weight, size scale, color per role)
- Card style (background, border-radius, shadow)
- Icon style guidance

Then internalize these as your CSS variables and component defaults. Never deviate from this palette without a specific reason from the user.

The current DESIGN.md defines:
- **Background**: `#FFFFFF`
- **Primary Blue**: `#2E5BFF` — logos, active states, key icons, data fill
- **Subtle depth**: `#F2F5FF`, `#DCE3FD` — card shadows, borders, inactive highlights
- **Title / key numbers**: Bold Navy `#1C2442`
- **Body text**: Medium Gray `#637381`
- **Labels**: Light Gray `#99A1A9`
- **Cards**: white background, `border-radius: 8–12px`, subtle soft light-blue shadow
- **Typography**: Pretendard (clean sans-serif), strong visual hierarchy
- **Icons**: Uniform-weight clean line-art, minimalist (use Font Awesome or inline SVG)

---

## Step 2 — Analyze the image and classify elements

Look at every visual element in the image and assign it to exactly one category:

### ✅ Always implement in code
No exceptions. These must never become image assets:
- Page layout and grid structure
- Navigation bars, menus, breadcrumbs
- Cards, panels, containers, accordions
- Buttons (primary, ghost, outlined, icon, FAB)
- Text content — headings, body, labels, badges, chips
- Color fills and CSS gradients (linear, radial)
- Progress bars, gauges, stat counters, ring charts
- Simple icons (Font Awesome or inline SVG)
- Calendars, date pickers, tables
- Forms — inputs, selects, toggles, checkboxes, radio
- Dividers, tags, tooltips
- Responsive grid / flex structure
- Simple geometric decorations achievable in CSS

### 🖼 Separate as image asset (GPT Image API)
Only elements that genuinely cannot be reproduced in code:
- Holographic projections or neon glow volumetric scenes
- 3D characters, avatars, or rendered figurines
- Glass-morphism objects with complex physical light reflections
- Detailed background illustrations with depth, perspective, or painterly texture
- AI-style light particle effects or cinematic bloom
- Architectural renders, isometric spatial visuals, staircase/environment scenes
- Photograph-quality imagery

---

## Step 3 — Plan the component structure

이미지를 분석한 뒤 아래 기준으로 컴포넌트를 분리한다. **재사용성과 일관성**이 핵심이다.

### 분리 기준

스크린샷에서 다음 UI 영역이 식별되면 반드시 독립 컴포넌트 파일로 만든다:

| 영역 | 컴포넌트 파일 예시 | 역할 |
|------|-------------------|------|
| 상단 Navbar | `components/Navbar.tsx` | 로고, 메뉴, 사용자 아이콘 포함. 전 페이지 공통 사용 |
| 사이드바 | `components/Sidebar.tsx` | 네비게이션 링크, 섹션 그룹, 접힘/펼침 |
| 카드 | `components/Card.tsx` | title, description, children props로 범용 구성 |
| 버튼 | `components/Button.tsx` | variant(`primary`\|`ghost`\|`outlined`), size, onClick |
| 텍스트/타이포 | `components/Typography.tsx` | Heading, Body, Label, Badge — 계층별 컴포넌트 |
| 그리드 레이아웃 | `components/Grid.tsx` | cols, gap props로 유연한 grid wrapper |
| 페이지 | `pages/NewPage.tsx` | 위 컴포넌트들을 조합하는 페이지 단위 |

### 설계 원칙

- **Props로 변형 제어**: 카드 색상, 버튼 크기 같은 변형은 새 파일을 만들지 말고 props로 처리한다.
- **CSS 파일 1:1 대응**: `Card.tsx` → `Card.css`, `Navbar.tsx` → `Navbar.css` 식으로 CSS 파일을 컴포넌트와 함께 둔다.
- **prefix 통일**: 각 컴포넌트 CSS 클래스는 컴포넌트명 약어를 prefix로 사용한다 (예: `.card-`, `.nav-`, `.btn-`, `.sidebar-`).
- **기존 컴포넌트 재사용**: `src_v2/components/`에 이미 같은 역할의 컴포넌트가 있으면 새로 만들지 말고 확장하거나 그대로 사용한다.

outline the file plan before coding:
1. Which files to create or extend under `src_v2/`
2. Props interface for each component
3. Which CSS file to create or append to

---

## Step 4 — Image asset placeholders

이미지 에셋이 필요한 경우(홀로그램, 3D 등) 해당 슬롯을 placeholder로 처리한다. Save real assets to `public/assets/` and reference as `/assets/filename`.

---

## Step 5 — Implement

Write the code. Follow these rules:

### Layout
- Use CSS Grid or Flexbox. Match column count and proportions from the image.
- Add appropriate spacing — don't compress or over-expand relative to the original.
- **Responsive**: write mobile-first CSS. At `≤768px`, collapse multi-column grids to single column, stack horizontal layouts vertically, adjust font sizes.

```css
/* Example responsive pattern */
.page-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
@media (max-width: 768px) {
  .page-grid {
    grid-template-columns: 1fr;
  }
}
```

### CSS / Styling
- Use CSS custom properties at the top of each stylesheet, sourced from DESIGN.md.
- Prefer a dedicated `.css` file per component/page over inline styles, except for dynamic values (e.g., `style={{ width: \`${pct}%\` }}`).
- Class names: use a component-scoped prefix (e.g., `.np-` for NewPage) to avoid collisions.

### Typography
- Use Pretendard (already loaded in the project).
- Match heading sizes, weights, and colors from the image, using DESIGN.md colors.
- Korean text must be reproduced verbatim where visible in the image.

### Icons
- Use Font Awesome 6 classes (`<i className="fa-solid fa-..." />`).
- For unavailable icons, use a simple inline SVG or styled emoji as fallback.

### Mock data
- All data is hardcoded. Extract visible text, numbers, labels from the image.
- For blurry or truncated content, use realistic Korean placeholder text.

### Image asset placeholders (during development)
Until the actual GPT-generated image is available, render each image slot as:
```jsx
<div className="asset-placeholder" style={{ background: '#E5E7EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#99A1A9', fontSize: 12 }}>
  홀로그램 영역 (hologram-hero.png)
</div>
```
Once the real image is generated and placed in `public/assets/`, replace with `<img src="/assets/filename" alt="..." />`.

### Interactivity
- Navigation buttons: wire to `onNavigate` prop if this is a page component.
- Unimplemented actions: `onToast('준비 중인 기능입니다')`.
- No real API calls.

---

## Step 6 — Quality checklist before finishing

- [ ] 텍스트·카드·버튼·레이아웃·캘린더·폼·네비게이션이 코드로 구현되었는가
- [ ] 페이지 전체가 이미지로 처리된 부분이 없는가
- [ ] 이미지 에셋 목록과 GPT 프롬프트가 작성되었는가
- [ ] 모바일(≤768px) 반응형 미디어 쿼리가 작성되었는가
- [ ] 모든 색상이 DESIGN.md에서 왔는가
- [ ] 플레이스홀더 박스에 설명 라벨이 있는가
- [ ] 이미지 내 한국어 텍스트가 정확히 재현되었는가
- [ ] TypeScript 오류가 없는가 (prop types, PageId 등)
- [ ] CSS 클래스 이름이 기존 페이지와 충돌하지 않는가

---

## Output format

Report to the user:
1. **이미지 에셋 목록** — 파일명 + GPT Image API 프롬프트 (없으면 "없음" 명시)
2. **생성된 파일 목록** — 경로 포함
3. **구현 vs 플레이스홀더** — 무엇을 코드로 구현했고 무엇이 이미지 에셋으로 분리되었는지
4. **App.tsx 연결 방법** — 새 페이지라면 추가할 PageId와 import 안내
