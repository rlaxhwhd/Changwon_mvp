# 포트폴리오 화면 전면 개편 — UI 작업지시서

- 상태: `PASS` — 사용자 지시로 Sol·Astra 없이 팀장이 직접 구현했다. 결과는 implementation.md
- 판정: `NO_DB_CHANGE` — table·API·store·loader·저장 동작을 바꾸지 않는다. 화면 구조(JSX)와 CSS만 바꾼다.
- 작성: 팀장(2026-11-06)

## 1. 사용자 요구

> 포트폴리오 페이지 디자인이 너무 마음에 안 든다. 폰트도 너무 크고 색상도 다 보라색이다. `v2/growth`처럼 깔끔하게 만들고, 아예 전면 개편한다고 생각해라.

대상은 `/v2/mypage/portfolio` 전체다. 상단, 6개 탭, 포트폴리오 목록, 편집기, 불러오기 모달, 미리보기·인쇄 시트까지 포함한다.

## 2. 핵심 원칙

1. **`src_v2/pages/growth/GrowthHome.css`를 재사용한다.** `Portfolio.tsx`에서 import하고 `gh-*` 클래스를 그대로 쓴다. 비슷한 값을 새로 베끼지 않는다. `GrowthHome.css`와 `GrowthHome.tsx`는 **수정하지 않는다**. `Modal`은 포털이 아니어서 `.gh-shell` 변수가 모달 안에도 적용된다.
2. **보라색을 쓰지 않는다.** 이 화면의 CSS에서 `--color-primary`, `--color-primary-bg`, `--color-primary-light`, `--color-cta`, `--violet*`, `--primary`, `#8B5CF6`, `#7C3AED`와 빨강 그라데이션 버튼을 없앤다. 색은 `growth`처럼 파랑·하늘·민트·틸(+수상 등 강조는 앰버)을 카드별로 나눈다.
3. **글자 크기는 growth 체계만 쓴다.** 본문·설명·라벨·버튼·입력 12px, 항목 이름·강조 값 14px, 카드 제목 16px. 시트의 이름만 22px까지 허용한다. 13·15·18·20px 이상을 새로 만들지 않는다. 굵기는 growth처럼 제목·강조에만 준다. 본문 값은 400~500이다.
4. **그림자·그라데이션은 growth에 있는 것만 쓴다.** `gh-cover`, `gh-card`, `gh-project-visual` 외에 새 그라데이션을 만들지 않는다.
5. **동작을 바꾸지 않는다.** 아래 「유지할 동작」을 모두 지킨다.

## 3. 페이지 틀 — `Portfolio.tsx`

- 최상위를 `<main className="gh-shell pf-shell">`로 바꾸고 `.pf-wrap`, `.pf-hero`를 없앤다. `usePageHead`는 그대로 둔다.
- 상단은 `gh-cover`를 쓴다. 구성은 growth와 같은 3칸이다.
  - 왼쪽 `gh-cover-profile`: `gh-avatar`(이름 끝 두 글자), `gh-eyebrow` 「CAREER PORTFOLIO」, h2 「{표시 이름}의 포트폴리오」, p 「학과 · 학년 · 학번」. 표시 이름은 `studentDisplayName`을 쓴다. 불러오기 전 이름이 비면 h2는 「나의 포트폴리오」, p는 비운다.
  - 가운데 `gh-cover-copy`: strong 「이력서 완성도 {n}%」, 진행 바(높이 6px, 파랑 단색), `gh-cover-tags`에 `스킬 n`, `자격증 n`, `어학 n`, `수상 n`, `프로젝트 n`, `자소서 n`.
  - 오른쪽 `gh-cover-actions`: 기존 「이력서 PDF」 버튼을 `gh-primary-action`으로 표시한다. `exportPdf` 동작은 그대로 둔다.
  - `min-height`는 `.pf-shell .gh-cover`에서 `auto`로 낮춘다(padding 24px). growth 본 화면의 280px보다 낮아야 한다.
- 탭은 밑줄형으로 바꾼다. 흰 카드 안 알약형을 없앤다. 높이 44px, 글자 14px, 비활성 `--gh-sub`·500, 활성 `--gh-accent`·800 + 아래 2px 선, 아래 구분선 `--gh-border`. 아이콘은 뺀다. 좁은 폭에서는 줄바꿈 없이 가로 스크롤한다(`overflow-x:auto`, 페이지 전체는 넘치지 않음).
- 각 탭의 본문은 `gh-portfolio-grid`(12칸, 간격 16px)에 카드 `gh-card` + `gh-card-head`(`gh-section-kicker`, h2, 12px 설명)로 짠다.
- 카드 색은 `.gh-card.pf-tone-sky|mint|teal|amber`로 `--gh-ink`, `--gh-soft`, `--gh-line`만 바꾼다(토큰은 `GrowthHome.css` 62~67행의 짝과 같다). 기본은 파랑이다. 칸 폭은 `.pf-span-12|8|6|4` 유틸리티로 주고, 760px 이하는 전부 `1 / -1`이다.

### 탭별 구성

| 탭 | 카드 |
|---|---|
| 기본 정보 | PROFILE 「자기소개」(span 12, 파랑. 값이 없으면 `gh-empty`) / ACADEMIC 「학사 정보」(span 6, 하늘, `gh-profile-list`) / CONTACT 「연락처」(span 6, 민트, `gh-profile-list` + 「정보 수정」은 `gh-add-btn`). 수정 폼은 `gh-editor-form` 사용. 이전 사진·양옆 보라 선 카드는 없앤다 |
| 스킬·자격증 | CAPABILITIES 「보유 스킬」(span 12, 민트, 분류별 소제목 12px + `gh-skill-grid`/`gh-skill`/`gh-level`, 삭제는 `gh-item-actions`) / CERTIFICATES 「자격증」(span 6, 틸, `gh-qualification-list`, `gh-record-icon`) / LANGUAGES 「어학」(span 6, 하늘, 같은 목록). 숙련도 무지개 색 배지를 없앤다. 라벨은 `LEVEL_LABELS` 12px `--gh-sub` |
| 경험·수상 | AWARDS 「공모전·수상」(span 12, 앰버, `gh-timeline` 계열 또는 `gh-qualification-list`) / SELECTED WORK 「프로젝트」(span 12, 파랑, `gh-project-list`+`gh-project`, 띠는 `tone-1`, `tone-2` 번갈아, `gh-tag-list`) |
| 자소서 | COVER LETTERS 「자소서 보관함」(span 12, 파랑. 카드는 `gh-project` 없이 흰 박스 + 1px `--gh-border`, 12px 미리보기 3줄 제한. AI 배지는 하늘 칩) / RESUME 「이력서 요약」(span 12, 틸, 3칸 값) |
| 이력서 | `ResumeSheet`. 5장 참고 |
| 포트폴리오 | `PortfolioVersions`. 4장 참고 |

- 목록이 비면 빈 카드 대신 `gh-empty`로 한 줄 안내를 준다.
- 버튼: 추가류는 `gh-add-btn`, 주 버튼은 `gh-primary-action`, 모달·폼 하단은 `gh-form-actions`.
- 스킬 추가 모달은 `gh-editor-form`으로 바꾼다. 자소서 보기 모달도 12px 본문, 파랑·회색만 쓴다.
- `.pf-toast`는 어두운 바탕 12px로 유지한다.

## 4. 포트폴리오 탭

### 목록 — `PortfolioVersions.tsx`

- 카드 한 장 `gh-card`(span 12): 킥커 「COMPANY PORTFOLIO」, h2 「회사 제출용 포트폴리오」, 설명(기존 문구), 오른쪽 `gh-head-actions`에 `gh-count`(「n / 20개」)와 「새로 만들기」 `gh-add-btn`.
- 목록은 `gh-project-list` + `gh-project`다. `gh-project-visual tone-1|2`(번갈아)에 「PORTFOLIO 01」과 제목을 넣는다. 본문은 `gh-project-meta`에 수정일과 상태, 상태 칩은 **제출 가능=민트, 작성 중=앰버**다. 하단은 텍스트 버튼 「편집」, 「복제」, 「이름 변경」과 삭제 아이콘이다. 삭제 버튼 `aria-label`은 `{title} 삭제` 그대로다. 카드 전체 클릭으로 편집이 열리는 동작을 유지한다.
- 없으면 `gh-empty`.

### 편집기 — `PortfolioEditor.tsx`, `PortfolioEditor.css`

- 2단 구성(왼쪽 본문, 오른쪽 280px 고정 패널)을 유지한다.
- **표 모양을 없앤다.** 회색 라벨 칸 + 값 칸인 `.pfe-rows`/`.pfe-row`를 라벨 위·입력 아래 구조로 바꾸고, `gh-editor-form`과 같은 입력 모양을 쓴다(높이 42px, 12px, radius 9px, 포커스 `--gh-accent`). 짧은 입력은 2칸 격자, `long` 입력과 긴 줄은 전체 폭이다. 읽기 전용은 `--gh-muted` 배경과 `--gh-sub` 글자다.
- 상단 카드: 「목록으로」(`gh-add-btn`), 포트폴리오 이름 입력, 필수 미입력 안내 12px 앰버.
- 섹션 카드: `gh-card`, 킥커는 영문 대문자(예: EDUCATION), h2는 섹션 이름, 필수는 작은 칩. 색은 섹션 순서로 파랑→하늘→민트→틸을 반복한다. 머리의 「최신 기록 불러오기」, 「항목 추가」는 `gh-add-btn`이다. 킥커 영문은 `portfolioSections.ts`가 아니라 편집기 안 상수로 둔다.
- 항목: 1px `--gh-border`, radius 12px, padding 14px의 흰 박스. 삭제는 `gh-item-actions`, 「인증」은 민트 칩이다.
- 인적사항: 왼쪽 사진(폭 104px) + 오른쪽 입력 격자. 사진 버튼은 `gh-add-btn`이다.
- 오른쪽 패널: `gh-card` padding 16px, 항목별 행 높이 36px, 12px. 켜진 항목은 `--gh-text`, 꺼진 항목은 `--gh-sub`. `+ 추가`는 파랑 글자, `- 제거`는 회색 글자, 필수는 칩이다. 「미리보기」와 「임시저장」은 흰 버튼, 「저장」은 파랑 단색. 모두 높이 38px, 12px다.
- 경고·안내(`pfe-alert`, `pfe-notice`)는 `gh-empty`와 같은 밀도(12px)로 맞춘다. 오류는 빨강 글자를 유지한다.
- 불러오기 모달(`PortfolioImportModal.tsx`)은 12·14px, 파랑 체크, `gh-form-actions`로 바꾼다.

## 5. 이력서 시트 — `ResumeSheet.css`, `shared/PortfolioSheet.css`

- 이력서 탭, 미리보기, 학생 제출본, 교직원 제출본·인쇄가 이 CSS를 쓴다. **`ResumeSheet.css`의 보라를 없앤다.** 시트는 회사에 내는 문서이므로 잉크색 중심으로 만든다.
  - 흰 용지, 1px 테두리, radius 12px. 머리 아래 선은 1px 회색이다(3px 보라 선 제거).
  - 이름 22px·800, 부제 12px, 연락처 12px, 블록 제목 14px·800(잉크색), 본문 12px·행간 1.7, 항목 제목 14px.
  - 강조가 꼭 필요한 곳(링크, 인증 표시)만 `var(--blue, #356dff)`를 쓴다. 칩은 회색(`--gh-muted`가 없는 곳이 있으므로 `var(--muted, #f1f3f6)`)이다. **`shared/PortfolioSheet.css`와 시트에 쓰이는 규칙은 admin에서도 쓰이므로 `var(--x, 폴백)`을 지운다거나 `--gh-*`만 쓰면 안 된다.**
  - 툴바(`pf-resume-toolbar`)는 얇은 흰 바, 12px. 버튼은 `gh`와 같은 모양, 높이 38px.
- `@media print`를 유지한다. `.pf-hero`, `.pf-tabs` 숨김 규칙을 새 구조에 맞춰 `.gh-cover`, `.pf-tabs-line`(또는 쓴 클래스)로 바꾼다. `.gh-shell`의 padding도 인쇄 때 0이어야 한다. 인쇄 화면에 표지·탭·GNB·챗봇이 나오면 안 된다.
- 쓰지 않게 된 클래스 규칙은 지운다. 다른 파일이 쓰는지 확인한 뒤 지운다(`pf-` 접두사는 `src_admin/pages/ProgramForm.tsx`, `ProgramSurveySelect.tsx`의 `.pf` 스코프와 겹친다 — **그쪽은 건드리지 않는다**).

## 6. 유지할 동작

- 탭 상태, `?tab=versions`, `?edit=` 진입. `versionsOpened`로 한 번 연 탭을 `hidden`으로 유지(입력 보존).
- 편집기 `useBlocker`, `beforeunload`, 저장·임시저장·충돌 처리, 파일·사진 업로드, 섹션 토글, 항목 추가·삭제, `isLocked` 읽기 전용, 선택 상자, `maxLength` 전부.
- `id`/`htmlFor` 연결, `aria-label`, `aria-expanded`, `role="alert"`, `role="status"`.
- 900px 이하 패널 접기와 600px 이하 1단 구성. 학생 화면은 모바일 반응형이다. 390px에서 페이지 가로 넘침이 없어야 한다.
- `PortfolioSheet.tsx`의 데이터 표시 로직, `ResumeSheet.tsx`의 인라인 편집 동작. 두 파일의 JSX는 꼭 필요한 클래스 변경만 한다.
- 기능이 없던 버튼(자격증·어학 `+`, 수상·프로젝트 추가, 자소서 작성)은 **기능을 만들지 않는다**. 모양만 바꾸고 `implementation.md`에 남긴다.

## 7. 제약

- 수정 가능 파일: `src_v2/pages/mypage/Portfolio.tsx`, `Portfolio.css`, `src_v2/pages/mypage/portfolio/*`, `src_v2/components/ResumeSheet.tsx`, `ResumeSheet.css`, `shared/PortfolioSheet.tsx`, `shared/PortfolioSheet.css`, 이 폴더의 `implementation.md`.
- 금지: `backend/`, `shared/portfolioStore.ts`, `portfolioSections.ts`, `GrowthHome.*`, `index.css`, `DESIGN.md`의 토큰 변경, 새 색·폰트. `programs/new`.
- 작업 트리의 기존 변경(`.gitignore`, `CLAUDE.md`, `docs/external-program-view-spec.html`, `shared/useRoadmapStore.ts`, `.scratch_*`, `backend/app/graphify-out/`, `docs/DB_VIEW_REQUEST.html`)은 건드리지 않는다.
- 커밋·푸시·`docker:up`은 하지 않는다. 코드를 찾을 때는 Graft를 먼저 쓴다.

## 8. 완료 기준

- `npx.cmd tsc -b`, `npm run build` 통과.
- 아래 grep이 대상 파일(`Portfolio.css`, `PortfolioEditor.css`, `ResumeSheet.css`, `PortfolioSheet.css`)에서 0건이다.
  - `--color-primary|--color-cta|--violet|#8B5CF6|#7C3AED|#7c5cfc`
  - `font-size:\s*(13|15|18|20|2[3-9]|3\d)px`
- `implementation.md`에 변경 파일, 삭제한 규칙, 남은 제한, 실행 명령과 결과를 적고 상태를 `IMPLEMENTED_FOR_LEAD_REVIEW`로 둔다.
