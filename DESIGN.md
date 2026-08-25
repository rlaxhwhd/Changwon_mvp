# DESIGN.md — 드림캐치 디자인 정본 <span>(토큰이 잠겨 있다)</span>

> **정본은 `test_admin.html`이다.** 이 문서는 그 시안의 **최종 캐스케이드**를 토큰으로 고정한 것이다.
> 시안은 `:root`를 두 번 선언해 뒤가 앞을 덮는다 — 여기 적힌 값이 **실제 적용값**이다.
>
> | 문서 | 역할 |
> |---|---|
> | **`DESIGN.md`** (이 문서) | **토큰·컴포넌트 규칙 정본.** 값은 여기서만 바꾼다 |
> | `test_admin.html` | 렌더된 시안 — 눈으로 대조하는 기준 |
> | `dreamcatch_design_guideline.md` | 51절 상세 가이드 — **시안이 다루지 않은 영역**(폼·표·토스트·차트·반응형·다크모드)만 참조 |
>
> ⚠️ **새 팔레트·폰트를 만들지 않는다.** 디자인 스킬은 적용·리뷰만 한다.

---

## 0. 시안 ↔ 가이드라인 충돌 — 확정 결과 <span>(다시 논쟁하지 말 것)</span>

| 항목 | `test_admin.html` | `dreamcatch_design_guideline.md` | **확정** |
|---|---|---|---|
| radius | 전부 12 | sm8 / md10 / lg12 / modal20 | **12 통일** (시안) |
| shadow | `none` | `0 2px 8px rgba(22,28,45,.04)` | **none** (시안) |
| 텍스트 | `#1D2433` / `#5F6B7A` / `#6E7787` | `#181C25` / `#565E6D` | **시안** (3단, 대비 검증됨) |
| 팔레트 이름 | green·orange·red·purple·blue·teal·yellow | violet·blue·mint·coral·amber·sky·pink | **시안** |
| **Primary** | `.btn.primary` = 녹색 `#157A52` | Violet `#7C5CFC` | **녹색 `#157A52`** (시안) |
| **Violet 범위** | GNB·푸터 링크 12곳뿐 | Primary/Brand 전역 | **GNB 전용** (시안) |

> ⚠️ **한때 "Primary = Violet 통일"로 갔다가 되돌렸다.** `--color-primary`가 119곳에서 쓰이는데
> 이걸 violet에 물리자 버튼·막대·아이콘·링크·차트가 **전부 보라로 덮였다.**
> 시안은 그렇지 않다 — violet은 GNB 활성/호버 **12곳뿐**이고 나머지는 7색이 역할별로 쓰인다.
> **violet을 GNB 밖으로 내보내지 말 것.**

---

## 1. 토큰 <span>★ 값 수정은 여기서만</span>

### 1-1. 중립 · 표면

| 토큰 | 값 | 용도 |
|---|---|---|
| `--bg-page` | `#F7F8FB` | **전체 페이지 배경** (흰색 아님) |
| `--bg-card` | `#FFFFFF` | 카드 · GNB · 모달 |
| `--muted` | `#F1F3F6` | 카드 **안쪽** 서브 패널 · 행 hover |
| `--sel` / `--sel-line` | `#F3FBF7` / `#CDE9DC` | 선택 상태 배경 / 테두리 |
| `--border` | `#E2E6EC` | 기본 테두리 |
| `--divider` | `#F1F3F6` | 구분선 (테두리보다 옅다) |

> ⚠️ 시안의 `--panel:#FAFAF8`은 **채택하지 않았다.** 첫 `:root`(따뜻한 회색 계열)의 잔재이고
> 두 번째 `:root`가 테두리·구분선을 차가운 계열로 덮으면서 혼자 남은 값이다. 시안에서도
> 실제 사용처가 1곳뿐이며 그마저 후속 레이어가 덮는다. 서브 패널은 `--muted`를 쓴다.

### 1-2. 텍스트 <span>(3단 — 대비 검증 완료)</span>

| 토큰 | 값 | 대비 | 용도 |
|---|---|---|---|
| `--text` | `#1D2433` | — | 제목 · 본문 강조 |
| `--text-sub` | `#5F6B7A` | 5.4:1 | 본문 · 보조 |
| `--text-cap` | `#6E7787` | 4.5:1 | 캡션 |

> ⚠️ 원안의 `#8A93A1`은 **3.1:1로 AA 미달**이라 `#6E7787`로 올렸다. 되돌리지 말 것.

### 1-3. 내비 accent <span>(Violet)</span> — GNB 전용

```
--nav-accent       #7C5CFC   GNB 활성/호버 · 드롭다운 hover · 푸터 링크 hover
--nav-accent-soft  #F0EDFF   드롭다운 hover 배경
```

> ⚠️ **버튼·막대·아이콘·배지·차트에 쓰지 않는다.** 시안에서 violet은 내비게이션 12곳뿐이다.

### 1-3b. Primary 액션 <span>(Green)</span>

```
--primary        #157A52   CTA 버튼 · 강조 텍스트 · 탭 활성 · 포커스 링  (= --on-green)
--primary-soft   #DFF5EA   Primary 텍스트의 배경 틴트                  (= --green-bg)
--primary-light  #24B37A   보조 강조                                  (= --green)
--primary-hover  #106242   시안 .btn.primary:hover
```

### 1-4. 의미색 7종 — **solid / tint / 잉크 3짝**

| 색 | solid (막대·점) | tint (`--*-bg`) | 잉크 (`--on-*`) |
|---|---|---|---|
| green | `#24B37A` | `#DFF5EA` | `#157A52` |
| orange | `#F59A23` | `#FFF0DD` | `#92580A` |
| red | `#F05D57` | `#FDE7E6` | `#C2332C` |
| purple | `#8B63D9` | `#EFE6FB` | `#6739B8` |
| blue | `#3B82F6` | `#E8F1FF` | `#1A5FCC` |
| teal | `#1FA7A5` | `#DDF6F5` | `#0E7573` |
| yellow | `#F2B544` | `#FFF5DE` | `#8A5D0A` |

> **`--purple`(#8B63D9)과 `--nav-accent`(#7C5CFC)는 다른 색이다.** 전자는 의미색(배지·막대), 후자는 GNB 전용.

### 1-5. Radius · 그림자 · 간격

```
--r-lg / --r-md / --r-sm   12px   ← 전부 같다 (카드)
--r-ctl                    14px   컨트롤(셀렉트·드롭다운)
--r-btn                    12px   버튼
--r-pill                   999px  배지·칩

--shadow                   none   ← 그림자를 쓰지 않는다

--sp-1..7   4 / 8 / 12 / 16 / 20 / 24 / 32
--gap       16px   카드 사이
--gap-set   12px   한 세트로 묶이는 카드 사이
--pad       20px   카드 안쪽 — 전 카드 동일
--pad-sm    16px   .card.sm
```

### 1-6. 레이아웃 · 타이포

```
페이지    max-width 1440px · padding 32px
GNB       높이 80px · 배경 흰색 · 하단 1px 테두리 · sticky
폰트      'Pretendard Variable' → Pretendard → Apple SD Gothic Neo → Noto Sans KR
본문      14px / weight 500 / line-height 1.55 / tabular-nums
```

| 용도 | 크기 | 굵기 | 비고 |
|---|---|---|---|
| 카드 제목 `h2` | 16px | 700 | `letter-spacing:-.02em` |
| 본문 | 14px | 500 | |
| 버튼 | 13px | 600 | `.sm` 12.5px |
| 배지 · 캡션 | 12~13px | 600 | |
| 네비 | 15px | 600 → 활성 700 | |

---

## 2. 절대 규칙 <span>★ 어기면 접근성·일관성이 깨진다</span>

1. **컬러 텍스트·아이콘은 `--on-*` 잉크만 쓴다.** `--green` 같은 solid는 **막대·점·도넛 전용**이며 텍스트로 쓰면 대비가 미달한다.
2. **새 색을 만들지 않는다.** 7색 + `--primary`의 tint/잉크 짝에서만 고른다.
3. **막대 길이는 CSS가 아니라 데이터다.** 인라인 `style={{ '--v': '75%' }}` 하나만 바꾸고 CSS는 건드리지 않는다.
4. **Primary를 넓은 배경으로 칠하지 않는다.** `color:var(--primary)` + `background:var(--primary-soft)` 조합을 우선한다.
   **violet(`--nav-accent`)은 GNB 밖으로 나가지 않는다.**
5. **`word-break:keep-all`** — 없으면 한글이 어절 중간에서 끊긴다("이수진" → "이수/진").
6. **그림자를 되살리지 않는다.** 면 분리는 배경색 차이(`#F7F8FB` 페이지 ↔ `#FFFFFF` 카드)와 1px 테두리로 한다.
7. **이모지를 아이콘으로 쓰지 않는다.** 아이콘은 `react-icons/lu`(admin) · Font Awesome 6(v2).
8. **2계열 이상 차트에 같은 색조의 명암 차이를 쓰지 않는다.** `--primary`와 `--primary-light`처럼 한 색의 농도만 다른 조합은 작은 막대에서 구분되지 않는다. **의미가 다른 7색 중 둘**을 쓴다(예: 신청 `--blue` / 완료 `--green`).
9. **동작하지 않는 UI를 넣지 않는다.** 데이터가 없으면 그 카드·버튼을 만들지 않는다. 빈 상태는 `EmptyState`로 명시한다.

---

## 3. 컴포넌트 규칙

### 카드
```
배경 --bg-card · 테두리 1px --border · radius 12 · padding 20 (sm 16) · 그림자 없음
헤더 .card-hd — 제목 16/700/-.02em, 우측 액션은 margin-left:auto
```

### 버튼
| 종류 | 배경 | 글자 | 테두리 |
|---|---|---|---|
| 기본 | `--bg-card` | `--text-sub` → hover `--text` | `--border` → hover `--text-cap` |
| **primary** | `--primary` **(녹색)** | `#fff` | `--primary` |

`padding:10px 16px` · `font-size:13px/600` · `radius:12` · 전이 `.15s ease-out`

### 배지 · 칩
```
.pill   12px/700 · padding 3px 10px · radius pill
.badge  12px/600 · padding 3px 9px  · radius pill · white-space:nowrap
.s-*    tint 배경 + on-* 잉크 (7종)
.f-*    on-* 잉크 텍스트 (7종)
```

### 막대
```css
.bar   { height:6px; border-radius:pill; background:var(--divider); overflow:hidden }
.bar i { width:var(--v,0%) }   /* 길이는 인라인 --v 로만 */
```

### GNB <span>(유일하게 violet을 쓰는 곳)</span>
```
높이 80px · 배경 흰색 · 하단 1px --border · sticky top:0
항목 15px/600, 색 #344054
호버 색 --nav-accent
활성 색 --nav-accent + font-weight 700 + border-bottom 3px --nav-accent
드롭다운 hover 배경 --nav-accent-soft, 글자 --nav-accent
```

### 포커스
```css
:focus-visible { outline:2px solid var(--primary); outline-offset:2px; border-radius:10px }
```

---

## 4. 구현 매핑 <span>(`src_admin/index.css`)</span>

`--color-*` 레거시 토큰이 900여 곳에서 쓰인다. **이름을 바꾸지 않고 정본 토큰의 별칭으로 잇는다.**

| 레거시 | → 정본 |
|---|---|
| `--color-page-bg` | `--bg-page` |
| `--color-bg` | `--bg-card` |
| `--color-primary` | `--primary` **(녹색)** — violet 아님 |
| `--color-text` | `--text` |
| `--color-text-secondary` | `--text-sub` |
| `--color-caption` | `--text-cap` |
| `--color-border` | `--border` |
| `--color-divider` | `--divider` |
| `--radius-lg` | 12px (18 → 12) |

> **신규 코드는 정본 이름을 쓴다.** 레거시 별칭은 기존 셀렉터를 살리기 위한 것이고 점진적으로 걷어낸다.

---

## 5. 예외 <span>(의도된 divergence — 되돌리지 말 것)</span>

| 대상 | 예외 | 근거 |
|---|---|---|
| `programs/new` (`.pf` 스코프) | `#2563EB` 팔레트 | CLAUDE.md 명시 |
| **Chart.js** | 색을 **값으로** 전달 | 라이브러리가 CSS 변수를 읽지 못한다. 전달값은 이 문서의 토큰 값과 **반드시 일치**시킨다 |

---

## 6. 학생 포털 <span>(`src_v2`)</span>

이 문서는 현재 **`src_admin`에 적용돼 있다.** 학생 포털 시안(`test_admin2.html`·`test_admin3.html`)은 같은 GNB accent(`#7C5CFC`)를 쓰지만 팔레트 이름이 다르다(`mint`·`coral`·`amber`·`sky`·`pink`). **통일은 별도 작업이다** — 그때까지 `src_v2/DESIGN.md`가 학생 포털 정본이다.
