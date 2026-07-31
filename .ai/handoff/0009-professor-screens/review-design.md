# professor-screens — 리뷰 (4단계: 디자인·유지보수)

> reviewer: design-reviewer (Opus) · 2026-07-31 · 기준: `ui-spec.md`(결정 6건 + 금지사항 12) · `component-map.md` · `DESIGN.md`(base) + `src_admin/index.css`(역할 레이어)
> 검증 방식: 정적 대조(diff·grep·tsc) + **렌더 검증**(headless Chrome + CDP, scratchpad 격리 프로필 / `_workspace` 미사용, 종료 확인)
> 병렬 작업 제외: counselEvents/psychTests/counselStats/diagnosisAttempts/groupCounsels 계열 · counselRequests.ts · CounselRequests/CounselRecords/CounselRecordPrint/CounselStats/DiagnosisStatus/PsychTests/GroupCounsels · navConfig.ts · careerProcess.ts. 해당 diff에 교수 관련 추가 0줄 확인.

---

## 4단계: 디자인·유지보수 — **REJECT**

**P0 3건 · P1 6건 · P2 14건 · P3 6건.** P0는 타입체크 실패, 학생 화면 파손, 이 handoff가 스스로 "핵심 가치"라 부른 연계 저장 흐름의 런타임 throw다. 디자인 토큰·단일소스·스코프 격리·조교 무회귀는 통과했다.

### 항목별 판정

| # | 감사 항목 | 판정 | 근거 |
|---|---|---|---|
| 1 | 디자인 토큰 drift | **PASS** | 신규 CSS = modifier 3개뿐(`index.css:2193-2197`). 색상/폰트/radius/shadow 신규 선언 0, 기존 규칙 수정 0 |
| 2 | 하드코딩 리터럴 | **REJECT** | 화면 filter 스코프(P1-2) · 임의 창작 seed owner(P1-3) · `useState('01')`(P2-10) |
| 3 | JSON 동적 규약(로더 계약·LS 키·seed 불변) | **PASS** | 4개 키 spec 일치, seed 불변 + LS 오버레이 렌더 검증 완료 |
| 4 | 회귀 — 조교·상담사 화면 | **PASS**(조교) / **REJECT**(학생) | 조교 3화면 무회귀 렌더 확인. 학생 `/v2/counsel/professor` 완전 파손(P0-2) |
| 5 | 빈 배열 = 0명 스코프 | **PASS** | `studentRoster.ts:189,205,218` 전부 `=== undefined` 판정 |
| 6 | append-only·전이 무결성 | **PASS(조건부)** | 기록 수정·삭제 UI 없음, 전이 patch만. 단 확정 모달의 `method` 편집은 경계 침범(P2-1) |
| 7 | 컴포넌트 재사용 | **PASS(조건부)** | 중복 생성 0건. 단 `formatRelativeTime` 재사용 계약 미이행(P2-3) |
| 8 | 코드 품질(tsc·주석) | **REJECT** | tsc 9 error(P0-1) · 영문 주석 8건(P1-5) · 이관 주석 누락(P1-6) |
| 9 | impeccable 안티패턴 | **PASS** | 신규 코드 hit 0건. 기존 side-tab 2건은 pre-existing(advisory) |
| 10 | 렌더 검증 | 수행 | 교수 2계정 × 4~5화면 + 확정 모달 + 거절/추가/삭제 전이 + 조교 3화면 |

---

## P0 — Blocking (재작업 필수)

### P0-1. 타입체크 9건 실패 → `npm run build` 실패

```
npx tsc -p tsconfig.app.json --noEmit
src_admin/pages/ProfessorCounselRecords.tsx(62,37): TS2339 'studentId' does not exist on type 'RosterStudent | ProfCounselRequestRow'
src_admin/pages/ProfessorCounselRecords.tsx(62,71): TS2339 (동일)
src_admin/pages/ProfessorCounselRecords.tsx(63,27): TS2551 'studentName' does not exist ...
src_admin/pages/ProfessorCounselRecords.tsx(63,47): TS2339 'name' does not exist on 'ProfCounselRequestRow'
src_v2/data/counselRequestsWrite.ts(31,11):        TS2304 Cannot find name 'CounselMethod'
src_v2/pages/counsel/ProfessorCounsel.tsx(56,54):  TS2448 Block-scoped variable 'onlineTopic' used before its declaration
src_v2/pages/counsel/ProfessorCounsel.tsx(56,54):  TS2454 Variable 'onlineTopic' is used before being assigned
src_v2/pages/counsel/ProfessorCounsel.tsx(144,16): TS2552 Cannot find name 'PROFESSOR_GROUPS'
src_v2/pages/counsel/ProfessorCounsel.tsx(144,37): TS7006 Parameter 'group' implicitly has an 'any' type
```

⚠ **검증 명령 주의**: 루트 `tsconfig.json`은 `"files": []` + project references(솔루션 파일)이라 `npx tsc --noEmit`은 **아무것도 검사하지 않고 exit 0**을 낸다. 앞으로 게이트는 `npx tsc -b` 또는 `npx tsc -p tsconfig.app.json --noEmit`로 고정할 것.

**수정 지시**
- `ProfessorCounselRecords.tsx:45,61-64` — `request ? [request] : advisees` 유니온 배열 + `item.studentId ?? item.id` 해킹 폐기. 연계 모드는 spec §4대로 **읽기 전용 `admin-kv`** 로 분기 렌더하고, select는 `advisees`(단일 타입)만 매핑.
- `counselRequestsWrite.ts:11` — `import type { CounselRequestType, CounselMethod } from './students'`.
- `ProfessorCounsel.tsx` — P0-2 참조.

### P0-2. 학생 교수상담 신청 화면 완전 파손 (회귀 — 금지사항 11·12)

렌더 결과 `/v2/counsel/professor` 가 React Router 에러 바운더리로 대체된다.

```
Unexpected Application Error!
ReferenceError: Cannot access 'onlineTopic' before initialization
  at ProfessorCounsel (src_v2/pages/counsel/ProfessorCounsel.tsx:57)
```

- `ProfessorCounsel.tsx:56` `useState(onlineTopic)` 가 **:59에서 `const`로 선언되는** `onlineTopic`을 참조 → TDZ.
- `ProfessorCounsel.tsx:144` — import에서 `PROFESSOR_GROUPS`를 제거했는데 대학/부서 select가 여전히 `PROFESSOR_GROUPS.map(...)`을 쓴다. TDZ를 고쳐도 **두 번째 ReferenceError**로 다시 죽는다.

파급: 결정 3(학생 신청 배선)·결정 6(accept=false 학생 목록 반영)이 **전혀 검증 불가능**하다. accept=false 저장은 `dc_professor_profile`에 정상 기록되지만(렌더 확인), 그 효과를 받을 화면이 죽어 있다.

**수정 지시**
- `onlineContent` 초기값을 `onlineTopic`에 의존시키지 말 것. `onlineTopic` useMemo를 두 useState보다 위로 올리거나, `useState('')` + 표시 시 `onlineContent || onlineTopic` 폴백(교수 변경 시 문구가 따라가지 않는 문제도 함께 해소).
- :144 를 `professorGroups.map(...)`으로 교체(어댑터 결과 상수 — 결정 6).
- 재작업 후 **반드시 렌더로** ① 화면 진입 ② 온라인 신청 → 교수 접수함 `대기` 등장 ③ 오프라인 예약 → slot 포함 등장 ④ cse-1 accept=false 저장 후 컴퓨터공학과 목록에서 박지훈 제외를 확인할 것.

### P0-3. 신청 연계 기록 저장이 uncaught throw — 이 handoff의 "핵심 가치" 흐름 파손

재현(렌더 확인): cse-1 로그인 → 접수함 → 확정 건(김지연 `preq_med_01` — **spec §7-10이 이 시연을 위해 만든 seed**) [기록 작성] → `/professor/counsel/records?requestId=preq_med_01` → 내용 입력 → [저장]

```
EXCEPTION: Error: 학생 또는 교수 정보를 찾을 수 없습니다.
```

기록은 저장되지 않고, 신청도 완료로 전이되지 않으며, **화면에는 아무 피드백이 없다**(버튼만 눌리고 정지).

원인 — `src_admin/data/profCounselRecords.ts:30-33`
```ts
const student = studentLiteOf(input.studentId)
const professor = getProfessorById(input.professorId)
if (!student || !professor) throw new Error('학생 또는 교수 정보를 찾을 수 없습니다.')
```
ui-spec §7-3이 명시한 **`snapshot?` 입력 파라미터가 구현에서 누락**됐다. owner 스토어의 데모 학생 id는 학번(`20229876`)이고 `STUDENT_LITE_BY_ID`(`studentRoster.ts:78-85`)의 키는 `stu-*`/상세학생 id라 해석되지 않는다 — spec이 "로스터 밖 학생(신청 연계의 데모 owner)은 snapshot 인자 필수"라고 미리 경고한 바로 그 케이스다.

**수정 지시**
1. `addProfCounselRecord` 입력에 `snapshot?: { studentNo; name; major; grade }` 추가. `studentLiteOf` 미해석 시 `input.snapshot` 폴백, 둘 다 없을 때만 throw(spec §7-3 원문).
2. `ProfessorCounselRecords.tsx` 연계 모드에서 `getProfRequestById`가 준 행의 `studentNo/studentName/studentMajor/studentGrade`를 snapshot으로 전달.
3. 저장 실패는 화면에 드러나야 한다(P1-4와 함께 처리).
4. 정상 경로(지도학생 직접 작성)는 **검증 완료** — 저장 → `dc_prof_counsel_records` append → 조교 "전담교수 상담 실적"에서 박지훈 4건→5건·최근 상담일 2026.07.31 즉시 반영 확인. 연계 경로만 고치면 된다.

---

## P1 — Major

### P1-1. 페이징 전무 (ui-spec §3·§4)
`useListData(..., pageSize: 10)`만 있고 `admin-pagination`·페이지 상태가 **두 화면 모두 없다**(grep: professor 페이지 내 `admin-pagination|setPage` 0건, 렌더에서도 푸터 없음). 신청 11건째·기록 11건째부터 화면에서 도달 불가. 조교 화면(`AssistantStudents` "1 / 2 페이지") 패턴 그대로 붙일 것.

### P1-2. 화면 컴포넌트에서 전체 배열 filter (금지사항 4)
`src_admin/pages/ProfessorCounselRecords.tsx:23`
```ts
const advisees = getFullRoster().filter(student => getAdviseeStudentIds(user.id).includes(student.id))
```
① 전교 로스터를 화면이 받아 컴포넌트에서 범위를 좁힌다(SPEC §2 "범위 판정은 데이터층" 위반). ② `getAdviseeStudentIds`를 filter 콜백 안에서 학생 수만큼 재호출한다(O(n·m), 매 렌더). → 데이터층에 `getAdviseeRoster(professorId)`를 두거나 기존 로스터 로더의 `studentIds` 파라미터를 재사용할 것.

### P1-3. 임의 창작 seed — `stu-101` owner 신설 + 학번 칸에 `stu-101` 렌더
ui-spec §7-10은 **4건 append, "값은 아래 그대로(임의 창작 금지)"**. 구현은 5번째 신청(`preq_cse_advisee_01`)과 함께 `src_v2/data/students/counselSeedStudents.json`에 **새 owner 레코드**(`stu-101` 이도윤 + phone/studentType/competencyScore/gpa 창작)를 추가했다.

파급(렌더 확인): `src_v2/data/students.ts:307-309`의 데모 owner 매핑이 `studentNo: o.id` 이므로 교수 접수함 3행의 학번 칸에 **`stu-101`** 이 그대로 출력된다. 게다가 같은 학생이 `studentsRoster.json`(`stu-101` 이도윤 20250101)에도 있어 단일소스가 이중화됐고, 형제 레코드는 `major`에 학년을 포함(`"컴퓨터공학과 3학년"`)하는데 이것만 다르다.

**수정 지시**: 새 owner 레코드와 5번째 신청을 제거하고 spec §7-10의 4건만 남긴다. '지도' 배지 시연이 필요하면 팀장에게 seed 변경을 요청할 것(구현자 임의 창작 금지).

### P1-4. 저장·확정 실패가 침묵한다
- `ProfessorCounselRecords.tsx:31` `if (!studentId || !summary.trim()) return` — 내용 없이 [저장] → 아무 일도 없고 안내도 없다.
- `ProfessorCounselRequests.tsx:50,90` — 장소/링크 미입력 시 [확정] 버튼이 비활성인데 **왜인지 화면에 없다**(렌더 확인: 날짜·시각을 채워도 버튼이 계속 죽어 있음). 게다가 장소 필수는 spec에 없는 조건(spec 유효성 = `start < end`).

WCAG 3.3.1(Error Identification) + product 레지스터("모든 폼 컨트롤은 error 상태를 갖는다"). 필수 표시 + 인라인 에러 문구를 붙이거나 장소 필수 조건을 제거할 것.

### P1-5. 영문 주석 8건 (저장소 규약 = 한국어 주석)

| 파일:라인 | 주석 |
|---|---|
| `src_admin/data/advisorAssigns.ts:38` | `Active advisee ids for one professor; ...` |
| `src_admin/data/profCounselRecords.ts:29` | `Append-only record with event-time student snapshot.` |
| `src_admin/data/profCounselRecords.ts:78` | `[DB-ready] Professor-scoped records; ...` |
| `src_admin/data/profCounselRequests.ts:67` | `[DB-ready] Professor-owned type=교수 request projection, ...` |
| `src_admin/data/schema/profCounselRecord.ts:33` | `Linked student-owned request id; ...` |
| `src_admin/pages/ProfessorAdvisees.tsx:5` | `Professor scope is the active advisor assignment source, ...` |
| `src_v2/data/students.ts:122` | `Professor pool id for type '교수'; ...` |
| `src_v2/data/counselRequestsWrite.ts:66` | `Appends a professor request to the active student owner store.` |

전부 한국어로 교체. 같은 파일 인접 주석(전부 한국어)과 스타일을 맞출 것.

### P1-6. 이관 매핑 주석 누락 (CLAUDE.md 이관 강제사항 4 + ui-spec §7-3·§7-8 명시)
- `src_admin/data/schema/profCounselRecord.ts:33` — spec이 요구한 *"현행 `CON_PROF_INFO`는 신청+결과 한 행 — `requestId` join으로 한 행 복원, 없으면 결과 단독 행"* 규칙이 영문 한 줄로 대체돼 사라졌다.
- `src_admin/data/schema/excludedHours.ts` — spec §7-8이 "**변환 규칙 문서화 필수**"라 못박은 *(운영 그리드 − 제한 전개) → `BASICSETTING` 가능 슬롯* 규칙이 없다. 헤더는 `TB_CARR_CNSL_EXCL_HR`만 적고 1:1이 아닌 변환임을 남기지 않았다.

---

## P2 — Minor / 스펙 미준수

**P2-1. 확정 모달 스펙 이탈** (`ProfessorCounselRequests.tsx:39-99`, 렌더 확인)
- 학생 요약 `admin-kv`(이름·학번·학과·방식·주제) **없음** → 누구의 일정인지 모른 채 확정한다.
- **종료 시각 입력 없음** — 무조건 시작+1h 고정(`oneHourLater`). spec은 "시작/종료(time, 신청 slot 프리필)". 30분·2시간 상담 불가.
- 날짜 기본값이 `slot?.date ?? ''`. spec은 `?? 오늘`.
- spec에 없는 **방식(대면/비대면) select 추가**(:68-74) → `confirmProfRequest(id, slot, method)`가 `patchCounselRequest(id, { ..., method })`로 **학생이 낸 신청 내용을 교수가 덮어쓴다**. 금지사항 6("신청은 상태 전이(patch)만")의 경계를 넘는다. 제거하거나 팀장 승인 필요.
- 비대면 placeholder `"화상 링크"` 없음.
- (참고) 제한일정 충돌 경고(:79-84)는 spec 밖 추가 기능이다. 유용하지만 결정 4가 "이번 범위는 등록·조회까지"로 못박았으므로 **advisory** — 남기려면 팀장 승인.

**P2-2. 관리 열 렌더 누락** (`:192-198`) — 확정 행에 `[일정 변경]`(ghost) 없음 / 완료 행 `"기록 완료"` 텍스트 없음 / 취소 행 `—` 없음(빈 셀). 확정된 일정을 교수가 되돌릴 경로가 화면에 없다.

**P2-3. `신청/일정` 열에 신청 시각이 없다** (`:176-178`) — spec은 "위: `formatRelativeTime(requestedAt)` 신청 / 아래: slot". 구현은 slot만. `formatRelativeTime`은 component-map 재사용 계약 항목인데 professor 페이지 참조 0건(grep 확인).

**P2-4. `admin-toolbar` 우측 `[초기화]`(admin-btn-ghost) 없음** (`:151-155`).

**P2-5. 기록 화면 §4 섹션2 `admin-filterbar`(검색·상담구분) 없음** → `queryProfRecords`의 `q`·`filters.categoryCode` 처리 코드(`profCounselRecords.ts:83-85`)가 화면에서 **도달 불가한 데드 코드**가 됐다.

**P2-6. 연계 모드 UI** (`ProfessorCounselRecords.tsx:60`) — spec의 읽기전용 `admin-kv` 대신 disabled select(렌더상 잠금 여부가 시각적으로 구분되지 않음). 안내 문구 *"저장 시 해당 상담 신청이 완료 처리됩니다."* 없음 → 저장이 신청을 완료 전이시킨다는 사실이 화면 어디에도 없다.

**P2-7. 제한일정 목록이 빈 요일도 전부 렌더** (`ProfessorSchedule.tsx:69-87`) — 렌더 확인: 화/수/금/토/일 5행이 요일 칩만 덩그러니 남는다. 미러 원본 `SettingsAvailability.tsx:92`는 `if (daySlots.length === 0) return null`. 동일하게 스킵할 것.

**P2-8. 제한일정 유효성 힌트 문구 미재사용** — spec "기존 힌트 문구 재사용". `SettingsAvailability.tsx:74`의 `admin-form-hint admin-form-hint-warn` "종료 시각은 시작 시각보다 늦어야 합니다."가 없고 버튼만 disabled.

**P2-9. 노출 설정 저장 후 reload 없음** (`professorProfiles.ts:34-47`) — 미러 대상 `counselors.ts:104`는 `window.location.reload()`로 끝난다. 렌더 확인: 저장 후에도 [저장] 버튼이 dirty(활성)로 남고 저장 피드백이 없다. spec §6 "override merge + reload".

**P2-10. 상담구분 기본값 하드코딩** (`ProfessorCounselRecords.tsx:25`) `useState('01')` → `PROF_COUNSEL_CATEGORIES[0].code`. 금지사항 1(상담구분 리터럴 금지) + 코드 사전 이중화.

**P2-11. 공유 컴포넌트 메모 키 회귀** (`StudentRosterTable.tsx:45-46`)
```diff
- const deptKey = departments.join(',')
- const options = useMemo(() => getRosterFilterOptions(departments), [deptKey])
+ const options = useMemo(() => getRosterFilterOptions(departments, studentIds), [departments, studentIds])
```
호출부가 배열 리터럴(`departments={[]}` · `getAdviseeStudentIds(...)`)을 매 렌더 새로 만들므로 의존키가 매 렌더 바뀐다 → `getFullRoster()`(STUDENTS 전체 병합)가 options·summary용으로 **렌더마다 2회 재계산**. 기존 코드가 `deptKey` 문자열 키를 쓴 이유가 이것이다. `const idsKey = studentIds?.join(',') ?? ''` 추가 후 `[deptKey, idsKey]`로 되돌릴 것. (조교 화면 동작 자체는 무회귀 확인)

**P2-12. 허용 범위 밖 수정** (`advisorAssigns.ts:128-131`) — `getAdvisorRosterForExport` 시그니처를 `ListParams &`로 변경 + 주석 2줄 추가. ui-spec §8은 이 파일에 "`getAdviseeStudentIds` 1함수 추가"만 허용한다. 되돌리거나 팀장이 병렬 작업 귀속 여부를 확인할 것.

**P2-13. a11y — 탭·검색 시맨틱 누락** (`ProfessorCounselRequests.tsx:125-141`) — 하우스 패턴(`AssistantAdvisor.tsx:157` `role="tablist"`, `CounselRequests.tsx` `role="tab" aria-selected`)과 달리 role/aria 없음. 검색 input에 `aria-label` 없음(placeholder만).

**P2-14. 말줄임 셀에 `title` 없음** (`:175`, `ProfessorCounselRecords.tsx:105`) — `admin-td-ellipsis`로 잘린 주제·내용 전문을 확인할 방법이 없다(렌더: "전공 심화 과목 선택과 대학원 진학 상…").

---

## P3 — nit

- `src_admin/data/professors/biz-1.json` `officeHours: "수 10:00~12:00"` — spec §7-1 / 결정 1("officeHours는 기존 값 계승")은 `"월·수 10:00~12:00"`(구 `prof_jung.json` 원값). 노출 설정 기본값으로 그대로 보인다.
- seed topic 2건이 spec 문자열과 다름("하반기 **인턴십 지원** 전략 상담" → "하반기 **취업 지원** 전략 상담", "복수전공(컴퓨터공학) 진로 상담" → "복수전공(컴퓨터공학)**과** 진로 상담"). spec은 "값 그대로".
- 200자 초과 1행: `src_v2/pages/counsel/ProfessorCounsel.tsx:294`(210자). 그 외 신규 파일은 전부 200자 이하(`profCounselRecords.ts`의 초과 5행은 HEAD 기준 기존 라인 — 이번 귀속 아님).
- `src_admin/pages/ProfessorAdvisees.tsx` 파일 헤더 주석 없음(나머지 4개 교수 페이지는 있음).
- `SubmitProfCounselInput`(`counselRequestsWrite.ts:29-36`) 필드 JSDoc 없음 — 바로 위 `SubmitCounselInput`은 전 필드 한국어 JSDoc. spec §7-6도 필드별 설명을 달아뒀다.
- EmptyState 문구 축약: spec "작성한 상담 기록이 없습니다. **위에서 첫 기록을 작성하세요.**" → 앞 문장만.
- edge: 전 교수 accept=false면 `getCounselableProfessorGroups()`가 `[]` → `ProfessorCounsel`의 `professorGroups[0]`가 undefined → `selectedGroup.divisions` 크래시. 방어 1줄 권장.

---

## PASS로 확인한 것 (회귀 방지용 기록)

1. **디자인 토큰** — `index.css` 신규는 정확히 `2193-2197` 5줄 = modifier 3개(`.admin-profreq-roster` 8열 · `.admin-profrec-roster` 7열 · `.admin-td-ellipsis`). 색상값·폰트·radius·shadow 신규 선언 0, 기존 규칙 수정 0. 나머지 +149줄은 병렬 상담사 작업물(diag·statsum·print·psych·group·picker·event-trail). `.admin-td-ellipsis`는 기존 동등 유틸이 없어(모두 요소 스코프 선언) 신설 타당.
2. **단일소스·런타임 키** — `dc_counselor_excluded` · `dc_professor_profile` · `dc_prof_counsel_records` · `dc_counsel_owners` 전부 spec 일치. seed 불변 + LS 오버레이 병합을 렌더로 검증(제한일정 추가 2→3개·삭제 3→2개, 확정/거절 전이가 `dc_counsel_owners`에만 기록).
3. **도메인 격리(금지사항 2·3)** — `schema/counselRequest.ts` · `counselRequests.ts` · `counselRecords.ts` · `navConfig.ts` · `Login.tsx`(admin·landing) · `staff.ts` · `session.ts` · `availability.ts` · `SettingsAvailability.tsx` · `SettingsProfile.tsx` · `advisorAssigns.seed.json` · `profCounselRecords.seed.json` 무수정. `CounselRequestType`(admin)에 `'교수'` 추가 없음.
4. **빈 배열 = 0명 스코프(금지사항 9)** — `studentRoster.ts:189,205,218` 전부 `params.studentIds === undefined` 판정(`.length` 아님). 배정 0명 교수에게 전교생이 보이는 사고 없음.
5. **조교 무회귀** — `asst_kim` 3화면 렌더: 학생현황 15명 + 1/2 페이징 정상 · 전담교수 배정현황(전체 15/미배정 4/배정 11) 정상 · 상담 실적 정상. 콘솔 에러 0. `AssistantStudents`는 `studentIds` 미전달로 기존 경로 유지.
6. **핵심 연결(정상 경로)** — 교수 기록 저장 → `dc_prof_counsel_records` append → 조교 "전담교수 상담 실적"에서 박지훈 4건→**5건**, 최근 상담일 **2026.07.31** 즉시 반영 확인.
7. **신원 통일(결정 1)** — `cse-1.json`/`biz-1.json` 신설 + `prof_lee`/`prof_jung` 삭제, empNo 70201/70202 계승, `professors.ts` import 2줄만 교체, 코드 내 id 리터럴 0건. 지도학생 cse-1 5명(stu-089·091·101·102·103) / biz-1 2명(stu-010·012) 렌더 확인.
8. **컴포넌트 재사용** — `AdminModal`(md) · `EmptyState` · `useListData` · `paginate`/`mockLatency` · `AvailabilitySlot`/`WEEKDAY_LABEL`/`WEEKDAY_ORDER` · `PROF_COUNSEL_CATEGORIES` · `enrollStatusClass` · `counsel-status-badge` 전부 재사용, 중복 생성 0건. 신규 공용 컴포넌트 0.
9. **append-only** — 기록 수정·삭제 UI 없음. 신청은 patch 전이만(P2-1의 method 편집 제외).
10. **`getProfRequestById(professorId, id)`** — spec은 `(id)`였으나 구현이 professorId 스코프를 추가했다. 데이터층 범위 판정 원칙에 더 부합 — **개선으로 수용**.

---

## impeccable 감사 (audit — 정적 감지, 브라우저·생성 커맨드 미사용)

`node .claude/skills/impeccable/scripts/detect.mjs --json` 을 교수 페이지 5개 + `index.css`에 실행. **hit 2건, 둘 다 pre-existing**(`git show HEAD:src_admin/index.css`에 동일 라인 존재 — 이번 diff 무관):

| 안티패턴 | 위치 | 판정 |
|---|---|---|
| side-tab accent border | `index.css:1255` `.admin-gap-item { border-left-width: 4px }` | **advisory**(기존 정리 후보) |
| side-tab accent border | `index.css:1975` `.counsel-topic-full { border-left: 3px solid var(--color-primary) }` | **advisory**(기존 정리 후보) |

**이번 신규 코드의 안티패턴 hit 0건.** gradient text·glassmorphism·hero-metric·eyebrow·numbered marker 없음, 새 팔레트 없음.

### Audit Health Score (교수 화면 4종 한정)

| # | 차원 | 점수 | 핵심 발견 |
|---|---|---|---|
| 1 | Accessibility | 2/4 | 저장·확정 실패 침묵(WCAG 3.3.1), tabs role/aria 없음, 검색 aria-label 없음 |
| 2 | Performance | 2/4 | 화면단 전체 로스터 filter + 콜백 내 재호출(P1-2), 공유 컴포넌트 메모 키 회귀(P2-11) |
| 3 | Responsive | 3/4 | 데스크톱 전용(min-width 1280) 프로젝트 규약 — 기존 그리드 재사용, 신규 고정폭 없음 |
| 4 | Theming | 4/4 | 하드코딩 색상 0, 전부 CSS 변수 |
| 5 | Anti-Patterns | 4/4 | 신규 tell 0건 |
| **합계** | | **15/20** | Good |

> 점수는 *렌즈*일 뿐이다. 판정은 P0 3건(타입체크 실패 · 학생 화면 파손 · 연계 저장 throw)으로 **REJECT**. impeccable 발견 중 REJECT 사유로 승격한 것은 없다(전부 advisory 또는 상위 항목과 중복).

---

## 재작업 우선순위 (Codex 전달용)

1. **P0-2** `ProfessorCounsel.tsx` TDZ + `PROFESSOR_GROUPS` 잔존 참조 → 학생 화면 복구(렌더로 신청 2경로 + accept 반영까지 확인)
2. **P0-3** `addProfCounselRecord`에 `snapshot?` 복원 + 연계 모드에서 전달 → 확정→기록→완료 흐름 복구
3. **P0-1** 나머지 타입 오류 3종 제거, 게이트를 `npx tsc -b`로 고정
4. **P1-1 / P1-2 / P1-3** 페이징 추가 · 화면 filter 제거 · 창작 seed 롤백
5. **P1-4 / P1-5 / P1-6** 실패 피드백 · 주석 한국어화 · 이관 규칙 주석 복원
6. **P2 일괄** — 확정 모달 스펙 정렬(요약·종료시각·method select 제거) · 관리 열 3종 · 신청 시각 · 초기화 · 기록 필터바 · 연계 안내 · 빈 요일 스킵 · 유효성 힌트 · 저장 후 reload · `'01'` 제거 · 메모 키 복원 · 범위 밖 수정 롤백 · aria · `title`
7. P3는 여유 시 반영.

**소스는 리뷰어가 수정하지 않았다.**
