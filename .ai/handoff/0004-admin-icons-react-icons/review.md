# src_admin 아이콘 → Lucide 교체 — 리뷰 (통합)

> 범위: Codex가 수행한 Font Awesome → react-icons(Lucide) 전면 교체(32파일). 세부는 `review-design.md`(§4).

## 4단계: 디자인·유지보수 (design-reviewer · opus) — REJECT 1건 → **수정 완료(FIXED)**

- [PASS] 의미 매핑 정합성 — navConfig·GNB·Home·dashboard·Program·Roadmap·Login 전수 대조, 오매핑 0 (검증된 82종 매핑표 준수)
- [PASS] CSS 전환 — 아이콘 `i` 선택자 25곳 전부 `svg`로 1:1 전환, 색·여백·font-size 보존, 잔여 `i` 0
- [PASS] 스코프·토큰 — `src_v2`/`src_v1`/`@fortawesome` 불변, `:root` 무변경, navConfig `icon: IconType` 단일소스
- [REJECT→FIXED] **완결성(숨은 기능 회귀)** — `StudentDetail.tsx` 로드맵 진행 탭이 `const Icon = p.icon; <Icon/>`로 렌더하는데 `p.icon`은 **src_v2 JSON의 fa- 문자열**(`fa-route` 등 6종). 문자열을 컴포넌트로 렌더 → `<fa-route>` 빈 엘리먼트 → 아이콘 소실. React19가 string element type을 허용해 tsc/build는 통과(그래서 팀장 1차 검증에서 미검출).
  - **수정(team-lead 직접):** admin 레이어에 `PHASE_ICONS: Record<string, IconType>` 맵 추가(dashboard `STAT_ICONS` 패턴 동일) — fa-clipboard-check→LuClipboardCheck, fa-comments→LuMessagesSquare, fa-route→LuRoute, fa-chart-line→LuChartLine, fa-briefcase→LuBriefcase, **fa-rotate→LuRotateCw**(신규 확정, 매핑표에 없던 항목). 렌더 `const Icon = PHASE_ICONS[p.icon] ?? LuCircleDot`. src_v2는 스코프 밖이라 미변경(JSON은 fa- 문자열 유지).
  - **재검증:** `npm run build` EXIT 0, 실제 FA 사용(fa-solid/regular/className fa) 0건. 남은 `fa-` 7건은 PHASE_ICONS 맵 키(6)+주석(1) = 의도된 데이터 매칭 키.

## 5단계: 내용 정합성 (content-reviewer) — **N/A**
아이콘만 교체(텍스트·라벨·용어·네비 항목 무변경)라 내용 정합성 리뷰 대상 없음. 아이콘 의미 보존은 §4 항목1에서 확인.

## 종합: **PASS** (REJECT 1건 수정 후)

## 후속(별개, 이번 커밋과 분리 권장)
- **시각확인 권장:** 인라인 svg 베이스라인 정렬 6곳(`.admin-detail-note/.admin-history-comment/.admin-record-topic/.admin-record-item-topic/.admin-record-label/.admin-gap-figs` svg) — FA는 -0.125em 보정이 있었음. 육안 확인 후 필요시 `vertical-align: -0.125em` 적용.
- **스코프 위생:** 워킹트리에 아이콘과 무관한 병렬 기능(상담 위험단계)이 섞임 — src_v2 `competencyScore`/`getStudentTrack`(students.ts +17, 학생 JSON 4파일) + index.css `.counsel-track-badge.track-*`의 생 hex(#FDECEC/#FFF6E5/#E7F7EF). **아이콘 커밋과 분리**하고, 생 hex는 해당 기능 리뷰에서 토큰-drift 별도 처리.
