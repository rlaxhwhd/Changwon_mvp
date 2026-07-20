# 리뷰 — 0004 admin 아이콘 react-icons(Lucide) 교체

## 4단계: 디자인·유지보수 (design-reviewer)

**종합 판정: REJECT** — 항목 1·3·4 PASS, 항목 2에서 기능 회귀 1건. 정적 코드 감사만 수행(브라우저 렌더 없음). `npx tsc --noEmit` 직접 실행 → exit 0 재확인.

---

### 1) 의미 매핑 정합성 — PASS
ui-spec 매핑표(82종)와 실제 구현 대조, 오매핑 없음.
- navConfig.ts: house→LuHouse, headset→LuHeadset, inbox→LuInbox(신청 접수함/변경 요청함), calendar-days→LuCalendarDays, clipboard-check→LuClipboardCheck, users→LuUsers, route→LuRoute, building-user→LuBuilding2, list→LuList, plus→LuPlus, graduation-cap→LuGraduationCap, **user-slash→LuUserX(블랙리스트)**, gear→LuSettings, id-card→LuIdCard, clock→LuClock — 전부 스펙 일치.
- GNB.tsx: id-badge→LuContact, chevron-down/right→LuChevronDown/Right, check→LuCheck, user-group→LuUsers — 일치.
- StudentDetail.tsx: clipboard-check→LuClipboardCheck, user-check→LuUserCheck, scale-balanced→LuScale, route→LuRoute, pen-ruler→LuPencilRuler, list-check→LuListChecks, **chart-simple→LuChartColumn**, arrow-right-long→LuMoveRight, **comments→LuMessagesSquare(상담 누적)**, seedling→LuSprout, target→LuTarget, workflow(diagram-project)→LuWorkflow — 일치.
- Home.tsx / dashboard.ts: chart-line→LuChartLine, chart-pie→LuChartPie, bullhorn→LuMegaphone, arrow-up/down→LuArrowUp/Down, calendar→LuCalendar, bell→LuBell, **STAT_ICONS(user-group→LuUsers, clipboard-check→LuClipboardCheck, comments→LuMessagesSquare, calendar→LuCalendar, briefcase→LuBriefcase, bullhorn→LuMegaphone)** — 일치.
- ProgramBlacklist(noshow→LuUserX, manual→LuHand, waive→LuRotateCcw), ProgramDetail(노쇼→LuUserX, 출석→LuCircleCheck, 미확인→LuCircleHelp), RoadmapRequests(대기→LuHourglass, 반영완료→LuCircleCheck, 반려→LuBan), Login(career→LuBriefcase, psych→LuHeart) — 전부 의미 보존.

### 2) 완결성 — REJECT (기능 회귀 1건)
**통과 부분:** `grep -rn "fa-" src_admin` → 0건 재확인. tsconfig.app/node `noUnusedLocals`·`noUnusedParameters` = true + tsc exit 0 → **미사용 import 0, 렌더용 import 누락 0** 자동 보증.

**REJECT — `src_admin/pages/StudentDetail.tsx:120` (RoadmapTab phase 아이콘 깨짐):**
```
<span className="admin-phase-icon">{(() => { const Icon = p.icon; return <Icon /> })()}</span>
```
- `p`는 src_v2 `RoadmapPhase`이고 `RoadmapPhase.icon: string`(src_v2/data/students.ts:30, 스코프상 불변이 맞음). JSON 실제 값은 **문자열** — chaewon.json/changwon.json phases: `"fa-clipboard-check"`, `"fa-comments"`, `"fa-route"`, `"fa-chart-line"`, `"fa-briefcase"`, `"fa-rotate"`.
- `const Icon = p.icon`(string) → `<Icon />`. **React 19의 `JSX.ElementType`가 `string`을 허용**하므로 tsc/build는 통과하지만, 런타임에 `React.createElement("fa-route")` → `<fa-route></fa-route>` 빈 커스텀 엘리먼트가 생성됨(아이콘 글리프 없음).
- `admin.html:11`이 **Font Awesome CDN을 여전히 로드**하므로, 교체 전 `<i className={\`fa-solid ${p.icon}\`} />`는 실제 FA 글리프를 렌더했음 → 이 변경은 **기능 회귀**: 상세학생(chaewon·changwon) "로드맵 진행" 탭의 phase 아이콘(유형진단·상담·로드맵·역량강화·취업지원·사후관리)이 전부 사라짐.
- **왜 팀장 독립검증(fa-=0·build)에서 안 잡혔나:** ① 문자열이 src_admin이 아니라 **src_v2 JSON**에 있어 `grep fa- src_admin`에 안 걸림 ② tsc가 string을 유효 element type으로 통과시킴.

**수정 지시(구현은 Codex):** src_v2는 스코프 밖이므로 admin 레이어에서 phase fa-문자열 → Lucide 컴포넌트로 **매핑 후 렌더**(dashboard.ts의 STAT_ICONS 패턴 미러). 예:
`const FA_TO_LU = { 'fa-clipboard-check': LuClipboardCheck, 'fa-comments': LuMessagesSquare, 'fa-route': LuRoute, 'fa-chart-line': LuChartLine, 'fa-briefcase': LuBriefcase, 'fa-rotate': LuRotateCcw }` → `const Icon = FA_TO_LU[p.icon] ?? LuRoute; <Icon />`.
- **주의:** `fa-rotate`(chaewon.json phases)는 ui-spec 매핑표에 없음(fa-rotate-left→LuRotateCcw만 존재). 어떤 Lucide로 매핑할지 **팀장 확정 필요**.
- 이 site가 문자열 icon을 컴포넌트로 렌더하는 **유일한** 결함 지점임(나머지 `const Icon =` 8곳 — StudentList TRACK_ICON, ProgramBlacklist KIND_LABEL, ProgramDetail ATTENDANCE_OPTIONS, Login ROLE_CARDS, RoadmapRequests TABS, Home stat.icon(loader 매핑), SectionSidebar/navConfig, StudentDetail TABS/GrowthTab stats — 전부 `IconType` 로컬 맵이라 정상).

### 3) CSS 전환 — PASS (시각확인 권장 1건)
- index.css 아이콘 `<i>` 겨냥 선택자 **25곳 전부 `svg`로 1:1 전환**, color/margin/font-size 값 보존. 잔여 아이콘 `i` 선택자 0(이탤릭용 `i`도 없음). SectionSidebar.css에 `i` 선택자 없음(확인).
- **정렬 리스크(svg 베이스라인) — 시각확인 권장:** flex 부모(`.admin-card-head h2`, `.admin-tab`, `.admin-perm-banner`, 버튼류 = `display:flex; align-items:center`)는 정렬 안전. 그러나 **block 부모 + 인라인 svg**(선택자에 `margin-right`가 붙은 곳)는 svg 기본 `vertical-align: baseline`이라 텍스트 대비 ~2–3px 가라앉을 수 있음:
  - `.admin-detail-note svg`(1061), `.admin-history-comment svg`(893), `.admin-record-topic svg`(903), `.admin-record-item-topic svg`(924), `.admin-record-label svg`(926), `.admin-gap-figs svg`(1137).
  - FA는 폰트 글리프라 baseline에 자연 정렬됐으나 replaced SVG는 다름. **저위험 수정 제안**: 해당 인라인 svg 규칙에 `vertical-align: -0.125em`(또는 `middle`) 추가. 브라우저 렌더 금지 제약상 실제 육안 확인은 별도 필요.

### 4) 스코프·토큰 — PASS (스코프 위생 주의 1건)
- src_v2/·src_v1/에 **fa→Lucide 변경 없음**. `@fortawesome`/FA CDN 불변(admin.html:11 FA link 유지 — 스펙 완료기준 4상 제거는 "선택"이라 REJECT 아님. 단 item 2 수정 후 phase가 유일 FA 소비처였으므로 그때 제거 권장).
- **`:root` 디자인 토큰 무변경.** 아이콘 svg 규칙은 전부 `var(--color-*)`만 사용, 새 팔레트·폰트 유입 0. navConfig `icon: IconType` 단일소스 패턴 준수, GNB/SectionSidebar `const Icon = item.icon` 렌더 정상.
- **주의(handoff 0004 밖):** 워킹트리에 아이콘과 무관한 미커밋 변경이 섞여 있음 — src_v2 `competencyScore`/`getStudentTrack`(students.ts +17, 학생 JSON 4파일) + index.css `.counsel-track-badge.track-*`에 **생 hex(#FDECEC/#FFF6E5/#E7F7EF)** 신규. 이는 별개 기능(상담 위험단계)이며 아이콘 커밋에 섞이면 안 됨. 해당 생 hex 토큰 drift는 그 기능의 리뷰에서 별도 처리 대상. 아이콘 커밋 스코프를 이 파일들과 분리할 것(팀장 조치).

---
**재작업 필요:** 항목 2(StudentDetail:120 phase 아이콘). 항목 1·3·4는 통과. 수정 후 재호출 시 phase 아이콘 렌더만 재확인.
