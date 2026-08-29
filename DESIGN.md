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
- Primary accent `#7c5cfc` used for CTAs and brand highlights
- 8 shadow level(s) detected — tinted shadows
- Rounded corners (12px+) creating a friendly, approachable feel
- Tags: light, rounded, accented, sans-serif

## 2. Color Palette & Roles

### Primary
- **Primary Accent** (`#7c5cfc`) · `--color-primary`: Brand color, link text, interactive highlights, icon/border ink.
- **CTA Fill** (`#8f74fd`) · `--cta` / `--color-cta`: solid button backgrounds only. One step softer (pastel) than the accent. Kept separate so button fills can lighten without dragging violet *text* below its contrast floor — the accent stays `#7c5cfc` as ink.
- **Secondary Accent** (`#356dff`) · `--color-secondary`: Secondary brand, hover states, complementary highlights.
- **Background** (`#f7f8fb`) · `--color-bg`: Page background, primary canvas.
- **Background Secondary** (`#f1f3f6`) · `--color-bg-secondary`: Cards, surfaces, alternating sections.

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

### Primary Button

```css
.btn-primary {
  background: #f2f4f7;
  color: #344054;
  border-radius: 50px;
  padding: 0px 0px;
  font-size: 16px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

### Ghost Button

```css
.btn-ghost {
  background: transparent;
  color: #ff6b6b;
  border-radius: 8px;
  padding: 0px 10px;
  font-size: 12px;
  font-weight: 700;
  border: none;
  cursor: pointer;
}
```

### Ghost Button 2

```css
.btn-ghost-2 {
  background: transparent;
  color: #667085;
  border-radius: 24px;
  padding: 4px 4px;
  font-size: 16px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

### Filled Button

```css
.btn-filled {
  background: #0f172a;
  color: #181c25;
  border-radius: 0px;
  padding: 1px 6px;
  font-size: 16px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

### Filled Button 2

```css
.btn-filled-2 {
  background: #f2f4f7;
  color: #475467;
  border-radius: 50px;
  padding: 0px 0px;
  font-size: 20px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

### Filled Button 3

```css
.btn-filled-3 {
  background: #ffffff;
  color: #181c25;
  border-radius: 12px;
  padding: 12px 12px;
  font-size: 16px;
  font-weight: 400;
  border: 1px solid rgb(234, 236, 240);
  cursor: pointer;
}
```

### Card

```css
.card {
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: rgba(15, 23, 42, 0.24) 0px 32px 80px 0px;
}
```

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
- Use `#7c5cfc` as the single dominant accent/CTA color
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
Accent:      #7c5cfc
Secondary:   #356dff
Border:      #f1f3f6
```

### Example Prompts

1. "Build a hero section with a `#f7f8fb` background, `Pretendard Variable` heading in `#181c25`, and a `#7c5cfc` CTA button with 50px radius."
2. "Create a pricing card using background `#f1f3f6`, border `#f1f3f6`, `Pretendard Variable` for text, and 24px padding."
3. "Design a navigation bar — `#f7f8fb` background, `#181c25` links, `#7c5cfc` for active state."
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
| `--ring` | `#7c5cfc` |
| `--primary` | `#7c5cfc` |
| `--primary-foreground` | `#ffffff` |
| `--cta` | `#8f74fd` |
| `--cta-hover` | `#7d5efb` |
| `--cta-shadow` | `rgba(143, 116, 253, .22)` |
| `--blue` | `#356dff` |
| `--blue-soft` | `#eaf0ff` |
| `--violet` | `#7c5cfc` |
| `--violet-soft` | `#f0edff` |
| `--mint` | `#20b486` |
| `--mint-soft` | `#e5f8f2` |
| `--coral` | `#ff6b6b` |
| `--coral-soft` | `#fff0f0` |
| `--amber` | `#f5a524` |
| `--amber-soft` | `#fff6df` |
| `--sky` | `#17a9e6` |
| `--sky-soft` | `#e7f7fd` |
| `--pink` | `#e85aad` |
| `--pink-soft` | `#fdebf6` |
| `--teal` | `#14b8a6` |
| `--teal-soft` | `#e6faf7` |
| `--violet-border` | `#d9d0ff` |
| `--violet-border-strong` | `#cec3ff` |
| `--violet-hover` | `#6848ec` |
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
| `--stat-3` | `var(--blue)` |
| `--stat-3-soft` | `var(--blue-soft)` |
| `--stat-4` | `var(--pink)` |
| `--stat-4-soft` | `var(--pink-soft)` |
| `--stat-5` | `var(--violet)` |
| `--stat-5-soft` | `var(--violet-soft)` |
| `--stat-5-alt` | `var(--blue)` |
| `--journey-done` | `var(--mint)` |
| `--journey-done-soft` | `var(--mint-soft)` |
| `--journey-current` | `var(--violet)` |
| `--journey-current-soft` | `var(--violet-soft)` |
| ... | *(33 more)* |
