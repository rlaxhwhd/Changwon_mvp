# 0009-professor-screens — 리뷰 (content-reviewer)

> 기준: `.ai/handoff/0009-professor-screens/ui-spec.md`(팀장 확정 기획 = 진실의 원천) · `SPEC.md` §3-5·§2 · `CLAUDE.md` 데이터 원칙
> 작성 2026-07-31. 소스 무수정.
> **리뷰 제외(병렬 작업자 소유, pre-existing 취급)**: `counselEvents`·`psychTests`·`counselStats`·`diagnosisAttempts`·`groupCounsels`·`StudentPicker`·`counselRequests.ts`·`CounselRequests/Records/RecordPrint/Stats`·`DiagnosisStatus`·`navConfig.ts`·`careerProcess.ts` 및 이들의 CSS.

## 5단계: 내용 정합성

### 판정 — **REJECT**

차단 결함 4건(빌드 불가 · 학생 화면 크래시 · 핵심 가치 연결 단절 · 리젝 기준 §11-4 위반)과 기획 미구현 5군.
단, **결정 1·2·4·5와 핵심 가치 ①③은 실측으로 성립**했다. 뼈대는 맞고 마감이 빠졌다 — 전면 재작업이 아니라 아래 체크리스트 수리 후 재검수.

### 검증 방법 (실측)

| 수단 | 내용 |
|---|---|
| `npx tsc -b` | 빌드 게이트 |
| node | seed 전수 카운트(배정 16 / 기록 7 / 신청 5) |
| gstack browse (dev 5174) | 교수 5화면 · 조교 실적 · 상담사 접수함 · 학생 교수상담 렌더, 저장 이벤트 후 localStorage 실측 |
| 브라우저 내 동적 import | `professorProfilesRead`·`counselRequests` 로더 직접 호출(어댑터·격리 증명) |

---

## A. 차단 결함 (Blocker) — 이것 때문에 REJECT

### B1. 빌드가 깨졌다 — `npm run build`(tsc -b) 실패 9건

```
src_admin/pages/ProfessorCounselRecords.tsx(62,37) TS2339 Property 'studentId' does not exist on type 'RosterStudent | ProfCounselRequestRow'
src_admin/pages/ProfessorCounselRecords.tsx(62,71) TS2339 (동일)
src_admin/pages/ProfessorCounselRecords.tsx(63,27) TS2551 'studentName' does not exist on 'RosterStudent'
src_admin/pages/ProfessorCounselRecords.tsx(63,47) TS2339 'name' does not exist on 'ProfCounselRequestRow'
src_v2/data/counselRequestsWrite.ts(31,11)         TS2304 Cannot find name 'CounselMethod'
src_v2/pages/counsel/ProfessorCounsel.tsx(56,54)   TS2448/TS2454 'onlineTopic' used before its declaration
src_v2/pages/counsel/ProfessorCounsel.tsx(144,16)  TS2552 Cannot find name 'PROFESSOR_GROUPS'
src_v2/pages/counsel/ProfessorCounsel.tsx(144,37)  TS7006 implicit any
```

**수정 지시**
- `ProfessorCounselRecords.tsx:45,60-65` — `selectableStudents`가 `RosterStudent | ProfCounselRequestRow` 유니온이라 필드 접근이 성립하지 않는다. 두 소스를 화면에서 섞지 말고 **로더에서 `{ id, name, studentNo }` 한 형태로 정규화**해 넘겨라(§7-3 `addProfCounselRecord`가 요구하는 snapshot 형태와 같은 축).
- `counselRequestsWrite.ts:11` — `import type { CounselMethod }` 추가(`CounselRequestType`과 같은 줄).
- `ProfessorCounsel.tsx` — B2 참조.

### B2. 학생 교수상담 신청 화면이 **크래시**한다 — 결정 3·6 전부 미작동 + 기존 화면 회귀

`src_v2/pages/counsel/ProfessorCounsel.tsx:56`
```tsx
const [onlineContent, setOnlineContent] = useState(onlineTopic)   // 56행
const activeProfessor = ...                                        // 58행
const onlineTopic = useMemo(...)                                   // 59행 ← 선언이 뒤
```
`onlineTopic`을 선언 전에 읽는다(TDZ). 실측 결과:

```
/v2/counsel/professor → Unexpected Application Error!
ReferenceError: Cannot access 'onlineTopic' before initialization
  at ProfessorCounsel (ProfessorCounsel.tsx:57:53)
```

같은 파일 `144행`에는 삭제된 import `PROFESSOR_GROUPS`가 그대로 남아 있다(대학/부서 select). 56행을 고쳐도 여기서 다시 `ReferenceError`가 난다.

**영향**: ui-spec 결정 3(학생 신청 배선)과 결정 6의 "학생 목록에서 제외" 검증 시나리오(§6)가 **화면에서 한 번도 성립하지 않는다.** 게다가 이 화면은 이번 handoff 이전에는 정상 동작하던 학생 화면이다 → §11-11 "기존 화면 회귀 금지" 위반.

**수정 지시**
1. `onlineTopic` useMemo를 `onlineSubject/onlineContent` useState **위로** 이동(또는 `useState('')` + `useEffect` 없이 `value={onlineContent || onlineTopic}` 형태로 파생).
2. `144행`의 `PROFESSOR_GROUPS` → `professorGroups`(어댑터 결과 상수)로 교체. **결정 6은 "교수 목록 트리 전체를 어댑터 결과로 교체"가 전제**라 여기가 원본을 보면 제외 자체가 안 먹는다.
3. 수정 후 `/v2/counsel/professor`에서 ⓐ 렌더 ⓑ 온라인 신청 → `dc_counsel_owners`에 `preq_*` append ⓒ 오프라인 예약 → slot 포함 append ⓓ cse-1 accept=false 저장 후 컴공 목록에 박지훈 없음 — 4가지를 실제로 확인하고 보고할 것.

### B3. ★핵심 가치 3단 중 ②(신청 완료 patch)가 **끊긴다** — 확정 건 기록 저장이 throw

ui-spec §7-3은 `addProfCounselRecord`에 **`snapshot?` 인자**를 명시했다("로스터 밖 학생(신청 연계의 데모 owner)은 snapshot 인자 필수"). 구현은 이 인자를 통째로 뺐다.

`src_admin/data/profCounselRecords.ts:30-36`
```ts
const student = studentLiteOf(input.studentId)
const professor = getProfessorById(input.professorId)
if (!student || !professor) throw new Error('학생 또는 교수 정보를 찾을 수 없습니다.')
```

`studentLiteOf`는 로스터(112명, `stu-*`)+상세학생만 안다. 그런데 **화면에 유일하게 존재하는 '확정' 신청 = `preq_med_01`(김지연, owner id `20229876`)** 이 정확히 로스터 밖 owner다. 즉 `[기록 작성]` 버튼이 뜨는 유일한 행이 저장 불가다.

실측(브라우저):
```
/professor/counsel/records?requestId=preq_med_01 → 내용 입력 → [저장]
window error : "Uncaught Error: 학생 또는 교수 정보를 찾을 수 없습니다."
localStorage dc_prof_counsel_records : NULL   (기록 미저장)
localStorage dc_counsel_owners       : NO_OVERRIDE (신청 '완료' patch 미발생)
화면 피드백                            : 없음 (버튼을 눌러도 아무 일도 안 일어난다)
```

**수정 지시**
1. `addProfCounselRecord` 입력에 `snapshot?: { studentNo; name; major; grade }`를 **ui-spec §7-3 시그니처 그대로** 복원하고, `studentLiteOf` 미해석 시 이 인자로 폴백한다.
2. `ProfessorCounselRecords.tsx`의 신청 연계 저장은 `ProfCounselRequestRow`(studentNo·studentName·studentMajor·studentGrade)를 snapshot으로 넘긴다. 이벤트 시점 스냅샷 보존은 CLAUDE.md 코드규칙 2와도 일치.
3. throw를 화면이 삼키지 않게 할 것 — 저장 실패가 무반응으로 보이면 안 된다(최소한 폼 하단 `admin-form-hint-warn` 문구).
4. 재검증: 확정 건 [기록 작성] → 저장 → ⓐ `dc_prof_counsel_records` +1 ⓑ 해당 신청 status `완료` ⓒ 접수함 완료 탭 1 ⓓ 조교 `/assistant/advisor/records` 건수 증가.

### B4. §11-4 위반 — 화면에서 전체 배열 filter로 범위를 좁힌다

`src_admin/pages/ProfessorCounselRecords.tsx:23`
```tsx
const advisees = getFullRoster().filter(student => getAdviseeStudentIds(user.id).includes(student.id))
```
- 전교생 로스터를 화면으로 끌어와 화면에서 자른다 — ui-spec §11-4("`professorId`·`studentIds`는 로더 파라미터로")와 SPEC §2 정면 위반.
- 추가로 `getAdviseeStudentIds`(내부에서 `localStorage` 읽음)가 **filter 콜백 안**에 있어 학생 수만큼 재실행된다.

**수정 지시**: `studentRoster.ts`에 `getRosterByIds(studentIds: string[])`(또는 기존 `queryStudentRoster({ studentIds })` 재사용)를 쓰고, 화면은 결과만 구독한다. 이미 §7-7로 `studentIds` 파라미터를 추가해 뒀으니 새 함수 신설 없이 재사용 가능하다.

---

## B. 기획 대비 누락·불일치 (Major)

### M1. 화면 ② 접수함 — ui-spec §3 명세 미구현 6건

`src_admin/pages/ProfessorCounselRequests.tsx`

| 스펙(§3) | 구현 | 위치 |
|---|---|---|
| 6열 = 위 `formatRelativeTime(requestedAt)` 신청 + 아래 slot | **신청 시각이 화면에 전혀 없다.** slot만 출력, 없으면 "일정 미정" | `:176-178` |
| 확정 행 → `[일정 변경]`(ghost) + `[기록 작성]` | `[기록 작성]`만 있음 — **확정 후 일정 변경 수단 없음** | `:197` |
| 완료 행 → 텍스트 "기록 완료" | 빈 셀 | `:192-198` |
| 취소 행 → `—` | 빈 셀 | 〃 |
| 툴바 우측 `[초기화]`(admin-btn-ghost) | 없음 | `:151-155` |
| `admin-pagination` (PAGE_SIZE=10) | **페이징 UI 자체가 없다** — 10건 초과분에 도달 불가 | 표 하단 |
| 대기 버튼 라벨 `[접수·일정]` | `일정 확정` | `:194` |

열 머리글은 "신청/일정"인데 신청 값이 없다 — 머리글과 내용이 어긋난 상태다.

### M2. 확정 모달 — ui-spec §3 "확정 모달" 미구현 + 스펙 밖 기능 추가

`src_admin/pages/ProfessorCounselRequests.tsx:39-99` (실측: 모달 안에 input 4개 = date, time, select(방식), text)

- **학생 요약(`admin-kv`: 이름·학번·학과·방식·주제)이 통째로 없다.** 교수가 "누구의 상담을 확정하는지" 모달에서 확인할 수 없다.
- 종료 시각 입력이 없다(스펙: 시작/종료 time 2개, 신청 slot 프리필). 지금은 시작+1h 고정 → 30분·2시간 상담 표현 불가.
- 날짜 기본값이 빈 값(스펙: 신청 slot 날짜 ?? 오늘). 실측 `value=""`.
- 비대면 placeholder "화상 링크" 없음. 라벨만 바뀐다.
- `place` 필수(`disabled={!place.trim()}`) — 스펙 유효성은 `start < end`뿐.
- **방식(대면/비대면) select는 스펙 밖 추가**다. 학생이 제출한 신청 내용을 교수가 임의 변경하게 되고, 그래서 `confirmProfRequest(id, slot, method)`도 §7-4 시그니처(`(id, slot)`)와 달라졌다. 방식 변경이 필요하다는 판단이면 팀장 승인 후 스펙에 반영할 것 — 지금은 무단 확장.
- 스펙 밖 추가 2: 제한일정 충돌 경고(`:79-84`). 유용하지만 §5가 "이번 범위는 등록·조회까지"로 못박은 밖이다. 남길지 팀장 판단 필요.

### M3. 화면 ③ 기록 — ui-spec §4 미구현 4건

`src_admin/pages/ProfessorCounselRecords.tsx`

- 섹션 2의 **`admin-filterbar`(검색 이름·학번 / 상담구분 select 전체+6종)가 없다**. `queryProfRecords`는 `q`·`filters.categoryCode`를 이미 받는데 화면이 안 쓴다.
- 섹션 2 **`admin-pagination` 없음** (기록 10건 초과 시 도달 불가).
- 신청 연계 모드: 스펙은 "select 대신 읽기 전용 `admin-kv`" + 안내 문구 **"저장 시 해당 상담 신청이 완료 처리됩니다."** → 구현은 disabled select 하나뿐이고 **안내 문구가 없다.** 교수는 저장이 신청 상태를 바꾼다는 걸 알 수 없다.
- 저장 후 "폼 리셋"이 `setSummary('')`뿐(`:41`). 학생·상담구분·상담일은 그대로 남는다.

### M4. seed 임의 창작 — §7-10 위반, 그 결과 화면에 내부 slug가 노출된다

§7-10은 append 레코드 **4건을 값 그대로** 지정하고 "임의 창작 금지"라고 못박았다. 구현은:

1. **5번째 신청 `preq_cse_advisee_01`을 추가**했고,
2. 그걸 담기 위해 **`counselSeedStudents.json`에 새 데모 학생 owner `stu-101`(이도윤)을 신설**했다.

실측 분포 = cse-1 대기 **3**·확정 1 / biz-1 대기 1 (스펙: cse-1 대기 2·확정 1).

**데이터 표현 결함**: `students.ts:307-309`의 데모 owner 투영은 `studentNo: o.id`다. owner id가 `stu-101`이라 접수함 화면에 학번 자리에 내부 slug가 그대로 뜬다 —

```
3  이도윤  stu-101 · 컴퓨터공학과  [지도]  재학  대면  전공 학습 방향 상담  일정 미정  대기
```

로스터의 이도윤 실제 학번은 `20250101`이다. 같은 사람이 화면마다 다른 식별자로 보인다.

**수정 지시**: `stu-101` owner 신설과 `preq_cse_advisee_01`을 되돌리고 §7-10 4건만 남긴다. '지도' 배지 시연이 필요하다는 판단이면 팀장에게 스펙 개정을 요청하고, 그때도 **owner에 `studentNo`를 실제 학번으로 명시**해 slug 노출을 막아야 한다.

부수: topic 문구 2건이 스펙과 다르다 — "복수전공(컴퓨터공학) 진로 상담"→"복수전공(컴퓨터공학)**과** 진로 상담", "하반기 **인턴십** 지원 전략 상담"→"하반기 **취업** 지원 전략 상담".

### M5. 화면 ⑤ 노출 설정 — 저장 피드백이 없다

`src_admin/pages/ProfessorProfile.tsx:62` — `updateProfessorCounselProfile` 호출만 하고 끝. 미러 대상인 `counselors.ts:104` `updateCounselorProfile`은 마지막 줄이 `window.location.reload()`이고, ui-spec §6도 "override merge + **reload**(updateCounselorProfile 패턴 미러)"다.

실측: 저장 클릭 후 `dc_professor_profile`에는 정상 기록되지만 **[저장] 버튼이 계속 활성(dirty=true)** 이고 화면 변화가 0이다. 교수는 저장됐는지 알 수 없다.

**수정 지시**: 저장 후 reload(또는 저장 성공 상태 반영으로 dirty 해제). 겸사 `updateProfessorCounselProfile`의 `localStorage.setItem`을 원본과 같이 try/catch로 감쌀 것.

---

## C. 경미 (nit — 재작업 시 함께)

| # | 내용 | 위치 |
|---|---|---|
| n1 | import 경로만 바꾸고 **변수명 `profLee`/`profJung` 잔존** — 실제 인물은 박지훈/김세환이라 이름이 거짓말을 한다. §8이 요구한 "id = 배정 풀과 동일 공간(INTG_UID 규약)" 주석도 없음 | `src_admin/data/professors.ts:8-9,21-22` |
| n2 | `biz-1.json` officeHours `"수 10:00~12:00"` (스펙 §7-1 `"월·수 10:00~12:00"`) | `src_admin/data/professors/biz-1.json` |
| n3 | 페이지 문구가 스펙과 다름 — 접수함 desc "박지훈 **교수님에게** 접수된…"(스펙 "{name} · 나에게 신청된 교수상담"). 로그인 당사자에게 자기 존칭을 쓴다. 기록·제한일정·노출설정 desc도 동일 패턴 3곳 | Professor*.tsx 각 `admin-page-desc` |
| n4 | 지도학생 subtitle `"박지훈의 지도학생"` (스펙 `"{name} · 내 지도학생"`) | `ProfessorAdvisees.tsx:11` |
| n5 | 노출설정 라벨 "상담 신청 **허락**"(스펙 "수락"), hint 2번째 문장 **"이미 접수된 신청은 유지됩니다."** 누락(정책 고지라 중요), 오피스아워 placeholder "예: 화·목 15:00~17:00" 없음, 소개 label "상담 소개"(스펙 "소개") | `ProfessorProfile.tsx:41-54` |
| n6 | 제한일정 목록이 **슬롯 없는 요일 행도 5개 렌더**한다. 미러 원본 `SettingsAvailability.tsx:94`는 `if (daySlots.length === 0) return null`. 삭제 버튼 `aria-label="삭제"`도 빠짐 | `ProfessorSchedule.tsx:69-87` |
| n7 | `useState('01')` 하드코딩 — `PROF_COUNSEL_CATEGORIES[0].code`를 쓸 것(§11-1 리터럴 금지). 값 자체는 유효해 현재 오작동은 없음 | `ProfessorCounselRecords.tsx:25` |
| n8 | `StudentRosterTable`의 useMemo 의존키를 `deptKey`(문자열) → `[departments, studentIds]`(배열 참조)로 바꿔 **매 렌더 재계산**된다. 값 기반 키(`join(',')`)로 되돌릴 것 | `StudentRosterTable.tsx:42-43` |
| n9 | `getProfRequestById(professorId, id)` — §7-4 시그니처는 `(id)`. 데이터층 스코프가 붙은 건 개선이므로 **수용**하되 ui-spec §7-4를 갱신할 것 | `profCounselRequests.ts:89` |

---

## D. PASS 확인 항목 (실측 근거)

| 항목 | 판정 | 근거 |
|---|---|---|
| **결정 1** 교수 신원 통합이 데이터를 살렸는가 | **PASS** | 로그인 카드 "교수 **박지훈** · 컴퓨터공학과" 렌더. `/professor/advisees` = **5명**(남시은20230089·김지원20250091·이도윤20250101·박지호20250102·최유나20240103) = `advisorAssigns.seed.json` cse-1 active 5건(stu-089/091/101/102/103)과 완전 일치. `profCounselRecords.seed.json` cse-1 **4건**이 기록 화면에 그대로 표시. biz-1(김세환)은 seed 지도 2·기록 2로 일치. 신규 JSON 2개의 id가 `src_v2/data/professors.seed.json` 실존 id(`cse-1` 박지훈 / `biz-1` 김세환)와 일치 |
| **결정 2** 신규 키 없이 `'교수'` 레인 배선 | **PASS** | 신규 스토어 키 없음(원천=`dc_counsel_owners`). `students.ts:120` `professorId?` 1필드 additive. `schema/counselRequest.ts`·`counselRecords.ts` 무수정(`counselRequests.ts` 변경분은 병렬 상담사 작업이며 교수 관련 없음) |
| 상담사 접수함 무오염 | **PASS(실측)** | 브라우저에서 `counselRequests.getCounselRequests()` 직접 호출 → 총 13건, **`preq_*` 누출 0건**, types = `["진로취업","심리"]` |
| **핵심 가치 ①③** 기록 append → 조교 집계 | **PASS(실측)** | 지도학생 직접 작성 저장 → `dc_prof_counsel_records` 7→**8**. 조교 `/assistant/advisor/records`에서 박지훈 4건→**5건**·최근 **2026.07.31**, 남시은 1회→**2회**·최근 상담구분 "전공 및 학업" 즉시 반영 |
| **핵심 가치 ②** 신청 '완료' patch | **REJECT** | B3 |
| **결정 3** src_v2 수정 범위 | **부분 PASS** | 수정 범위 자체는 준수 — `counselRequestsWrite.ts` 함수 추가(기존 무수정), `ProfessorCounsel.tsx`는 controlled 2필드 + writer 2곳 + 어댑터 교체만, **`reservedSlots` 하드코딩 미변경**(§3-3 준수), 레이아웃·CSS 무수정. 다만 결과물이 크래시(B2) |
| **결정 4** 제한일정 방향 | **PASS** | 키 = `dc_counselor_excluded`(SPEC 명기), `ExcludedConfig.ownerId` 공용 구조 + BASICSETTING 대응 주석, `AvailabilitySlot` type import 재사용. 화면 문구 "기본적으로 모든 시간대에 상담이 가능합니다. 불가 시간대만 등록하세요.", 빈 상태 "…현재 모든 시간대에 상담 요청을 받을 수 있습니다." — **가능 등록의 반대 방향이 코드·문구 양쪽에서 성립**. seed 렌더 = 월 09:00–12:00 / 목 14:00–16:00(cse-1), 수 10:00–12:00(biz-1)로 §7-8 값과 일치 |
| **결정 5** 지도학생 재배선 | **PASS** | `ProfessorAdvisees` = `getAdviseeStudentIds(user.id)` → `studentIds`. `studentRoster.ts:187` `params.studentIds === undefined ? undefined : new Set(...)` — **빈 배열=0명 스코프 판정 정확**(`.length` 판정 아님). `AssistantStudents` 무회귀 실측(15명·"1 / 2 페이지 · 총 15명") |
| **결정 6** 로더·어댑터 | **PASS(로더 한정)** | 3필드만(accept·officeHours·intro), 기본 accept=true, `dc_professor_profile` override merge 저장 실측. 어댑터 직접 호출: cse-1 off → 컴퓨터공학과 `["강민재","신유라"]`. 공대 7명 전원 off → **그룹 5→4로 단대 드랍 + `findDefaultSelection`이 인문대학/국어국문학과로 폴백(crash 없음)**. ⚠ 소비 화면이 B2로 죽어 실사용 경로에서는 확인 불가 |
| 네비 | **PASS** | 교수 섹션 렌더 = 지도학생 / 상담 관리(신청 접수·상담 기록) / 상담 설정(상담 제한일정·상담 노출 설정) / 설정. `navConfig.ts` 변경분은 상담사 항목뿐(병렬 작업) — 교수 섹션 무변경 |
| 신규 CSS | **PASS** | `index.css:2193-2197` = `.admin-profreq-roster`·`.admin-profrec-roster`·`.admin-td-ellipsis` 3개만. 나머지 사용 클래스(`admin-field-hint`·`admin-field-full`·`admin-student-avatar.xl`·`counsel-status-badge is-*`·`admin-avail-*`) 전부 기존재 |
| 용어 | **PASS** | 교수 5화면·신규 로더에 "회원/고객/사용자님" 등 도메인 오염 0건. 이미지·현행 실조직명 유출 없음. 학과·단대 표기는 단일소스 값 그대로 |
| 권한 경계 | **PASS** | 교수 화면에 조교/상담사 전용 액션(배정 변경·독려 발송·IAP 확정·로드맵 편집) 없음. 학사 유래 필드(이름·학과·학년·학적) 편집 UI 없음(§11-8). 기록 수정·삭제 UI 없음(append-only, §11-6). `assignedCounselorId` 미오염 — 전용 `professorId` 사용(§11-10) |

**참고(결함 아님)**: 데모 owner의 `major`에 학년이 붙어 있어("컴퓨터공학과 4학년") 접수함 학생 셀이 "20196543 · 컴퓨터공학과 4학년"으로 나온다. `counselSeedStudents.json`의 기존 데이터 형태이며 상담사 접수함도 동일 — 이번 handoff 책임 아님. 정리하려면 별도 슬라이스로.

---

## E. 재작업 체크리스트 (Codex에 그대로 전달 가능)

**차단 — 이것부터**
1. `npx tsc -b` 0 error. (B1)
2. `ProfessorCounsel.tsx` — `onlineTopic` 선언을 useState 위로 이동, `144행` `PROFESSOR_GROUPS`→`professorGroups`. `/v2/counsel/professor` 렌더 + 온라인/오프라인 신청 append + accept=false 제외 4가지 실증. (B2)
3. `addProfCounselRecord`에 `snapshot?` 복원 + 신청 연계 저장이 `ProfCounselRequestRow`를 snapshot으로 전달 + 실패 시 화면 피드백. 확정 건 저장 → 기록 append + 신청 '완료' + 조교 집계 증가를 실증. (B3)
4. `ProfessorCounselRecords.tsx:23` 전체 로스터 화면 filter 제거 → 로더 파라미터로. (B4)

**기획 반영**
5. 접수함: 신청 시각(`formatRelativeTime`) 표시 · `[일정 변경]` · 완료 "기록 완료" · 취소 `—` · `[초기화]` · `admin-pagination` · 대기 버튼 라벨 "접수·일정". (M1)
6. 확정 모달: 학생 요약 `admin-kv` 추가 · 종료 time 입력 · 날짜 기본값(slot ?? 오늘) · 비대면 placeholder "화상 링크" · place 필수 해제. **방식 select와 충돌 경고는 팀장 승인 전까지 제거하거나 스펙 개정 요청.** (M2)
7. 기록: 섹션2 필터바 + 페이징 · 연계 모드 `admin-kv` + 안내 문구 · 저장 후 폼 전체 리셋. (M3)
8. seed: `stu-101` owner와 `preq_cse_advisee_01` 롤백(또는 학번 명시 후 스펙 개정) · topic 문구 2건 원복. (M4)
9. 노출 설정 저장 후 reload. (M5)
10. nit n1~n9.

**재검수 기준**: 위 1~4가 실증(빌드 로그 + 브라우저 3-플로우)으로 닫히면 5단계 PASS 가능. 5~10은 PASS 조건이되 개별 항목의 스펙 개정 요청은 팀장 판단.

---

# 5단계 재검증 (2차 · 2026-07-31)

> 대상 = Codex 재작업본. 검증 시점 워킹트리 = 커밋 `c72be11`(내용 동일함을 `git show`로 대조 확인).
> 방법: `npx tsc -b` · dev 5173 + gstack browse 실사용 플로우 · 브라우저 내 모듈 직접 호출. 소스 무수정, 검증용 localStorage는 종료 시 `clear()`.

## 판정 — **PASS**

차단 4건 전부 해소, Major 5군 전부 반영, **이번 handoff의 존재 이유인 3대 플로우가 실측으로 성립**했다.
남은 것은 문구 nit과 Minor 2건(N1·N2)이며 기능·데이터 흐름을 막지 않는다. **N1은 저장 데이터에 굳는 성질이라 다음 슬라이스 착수 전 처리 권고.**

## A. 차단 4건 — 전부 해소 (실측)

| # | 확인 방법 | 결과 |
|---|---|---|
| **B1** 빌드 | `npx tsc -b` | **exit 0, 에러 0** |
| **B2** 학생 화면 크래시 | `/v2/counsel/professor` 렌더 | 정상 렌더, **콘솔 에러 0**. `onlineTopic`이 `useState` 위 일반 const로 이동(`ProfessorCounsel.tsx:57`), `144행` 잔존 `PROFESSOR_GROUPS`도 `professorGroups`로 교체됨 |
| **B3** 연계 저장 throw | `?requestId=preq_med_01` 저장 | `addProfCounselRecord`가 `studentLiteOf` 실패 시 `input.snapshot` 폴백(§7-3 시그니처 복원). **저장 성공** — 아래 C절 참조 |
| **B4** 화면단 전체 filter | `ProfessorCounselRecords.tsx:21` | `getAdviseeRoster(user.id)`(신설, `advisorAssigns.ts`)로 **데이터층 이동** ✓ §11-4 준수 |

## B. Major 5군 — 전부 반영 (실측)

- **M1 접수함**: `formatRelativeTime` "0분 전 / 21시간 전 / 1일 전 / 3일 전 신청" 표시 ✓ · `[초기화]` ✓ · `admin-pagination`(pages>1 조건, `PAGE_SIZE=10`) ✓ · 대기 `[접수·일정][거절]` ✓ · 확정 `[일정 변경][기록 작성]` ✓ · 완료 "기록 완료" ✓ · 취소 `—` ✓ · desc **"박지훈 · 나에게 신청된 교수상담"**(스펙 문구 일치) ✓
- **M2 확정 모달**: 학생 요약 `admin-kv`(이름·학번·학과·방식·주제) 렌더 확인 ✓ · 날짜/시작/**종료** 3필드 + 신청 slot 프리필(`2026-07-29 / 14:00 / 15:00 / 공학관 706호`) ✓ · 비대면 placeholder "화상 링크" ✓ · place 필수 해제 ✓ · **스펙 밖이던 방식 select·제한일정 충돌 경고 제거** ✓ · `confirmProfRequest(id, slot)` 2인자 복원(§7-4 일치) ✓ · 유효성 실측: 종료<시작 → **"종료 시각은 시작 시각보다 늦어야 합니다."** 인라인 표시, 수정 후 확정 시 탭이 `대기4→3 / 확정0→1`로 전이 ✓
- **M3 기록 화면**: 섹션2 `admin-filterbar`(검색+상담구분 전체+6종) ✓ · `admin-pagination` ✓ · 연계 모드 읽기 전용 `admin-kv` + **"저장 시 해당 상담 신청이 완료 처리됩니다."** ✓ · 저장 실패 인라인 표시 ✓ · `categoryCode` 기본값이 `PROF_COUNSEL_CATEGORIES[0].code`로 교체(리터럴 제거, §11-1) ✓
- **M4 seed**: 창작 owner `stu-101`과 `preq_cse_advisee_01` 제거 → **§7-10 4건 정확**. 실측 분포 cse-1 대기2·확정1 / biz-1 대기1 = 스펙 일치 ✓. **접수함 학번 칸 slug 노출 사라짐**(20211304 / 20196543 / 20229876) ✓
- **M5 노출 설정**: `updateProfessorCounselProfile` 끝에 `window.location.reload()` 추가 → 저장 후 버튼 `disabled=true`로 dirty 해제 확인 ✓

nit 해소: n6(빈 요일 행 → `return null`, 월·목만 렌더) · n7(카테고리 리터럴).

## C. ★ 핵심 가치 3단 — 실측 결과

`dc_counsel_owners`·`dc_prof_counsel_records` 초기화 후 재현.

| 단계 | 지도학생 경로 | 신청 연계 경로(비지도·타과) |
|---|---|---|
| ① `dc_prof_counsel_records` append | ✓ 8→**9** | ✓ 7→**8** (`requestId:"preq_med_01"`, `snapshot` 보존) |
| ② 신청 '완료' patch | 해당 없음(직접 작성) | ✓ `preq_med_01 → 완료`, `completedAt` 기록. 접수함 탭 **확정0 / 완료1** |
| ③ 조교 `/assistant/advisor/records` 집계 | ✓ 박지훈 4건→**5건**, 최근 상담일 **2026.07.31** | **미반영(설계상 정상 — N3 참조)** |

**②가 이제 끝까지 간다.** 1차의 `Uncaught Error: 학생 또는 교수 정보를 찾을 수 없습니다.`는 재현되지 않는다.

## D. 결정 3·6 — 드디어 실사용 경로에서 검증됨

| 시나리오 | 실측 |
|---|---|
| 학생 **온라인** 신청 → owner 스토어 | `preq_1785485226695` append: `type:'교수' / professorId:'cse-1' / 대기 / 비대면 / topic:"학업 및 진로 상담: 졸업 후 대학원 진학 상담을 신청합니다."` ✓ |
| 학생 **오프라인** 예약 → owner 스토어 | `preq_1785485471834`: `대면 / slot{2026-07-29 14:00–15:00, 공학관 706호}`, topic = 예약 모달 purpose ✓ |
| → 교수 접수함 반영 | 접수함 최상단에 **"0분 전 신청"**으로 즉시 표시(대기 우선 → requestedAt desc) ✓ |
| → 상담사 접수함 무오염 | 교수 신청 6건 상태에서 `getCounselRequests()` = **13건, `preq_*` 0건, types [진로취업, 심리]** ✓ |
| accept=false → 학생 목록 제외 | 노출 설정에서 "받지 않음" 저장 → 학생 화면 컴퓨터공학과 = **[강민재, 신유라]**(박지훈 제외) ✓ |
| 공대 전원 off → 학과·단대 드랍 | 대학 목록 5→**4**(공과대학 사라짐), 인문대학/국어국문학과로 폴백, **콘솔 에러 0** ✓ |

무회귀: `AssistantStudents` 15명 ✓ · `/assistant/advisor/records` ✓ · `SettingsAvailability`(가능 시간대, 제한일정과 문구 방향 정반대로 유지) ✓ · 지도학생 목록 5명 ✓

## E. 코디네이터 질의 2건에 대한 판정

### N2. `owner.studentNo ?? owner.id` 폴백 (`profCounselRequests.ts:55`) — **표시값은 정확하나 폴백 자체는 제거 대상**

1. **표시값 일치: 예.** 데모 owner 2명(`20229876` 김지연 · `20196543` 정유진)은 로스터에 없는 데모 전용 학생이라 다른 학번 소스가 존재하지 않고, id가 곧 학번 형식이다. 접수함 실측 표시 = `20229876` / `20196543`로 모순 없음.
2. **그러나 이 폴백은 실행되지 않는 죽은 코드다.** `CounselOwner.studentNo`는 **optional이 아니고**(students.ts:216), `getCounselOwners()`가 데모 owner에 이미 `studentNo: o.id`를 채운다(students.ts:309). 즉 `owner.studentNo`가 `undefined`가 되는 경로가 없다. 코드 옆 주석 **"데모 owner는 studentNo가 없고"** 는 사실과 다르다.
3. **단일소스 원칙 판정: 부적합(경미).** "id를 학번으로 간주한다"는 판단이 owner 투영층과 admin 투영층 **두 곳에 중복**됐다. 이 판단은 owner 투영 한 곳에서만 내려야 사고 지점이 하나로 유지된다 — 직전 `stu-101` 사고가 정확히 "id를 학번으로 표시"에서 나왔다.
- **지시**: `profCounselRequests.ts:54-55`의 폴백과 잘못된 주석을 제거하고 `owner.studentNo`를 그대로 쓴다. 근본 해결(권고, 팀장 결정): `counselSeedStudents.json`에 `studentNo` 필드를 명시해 owner 투영의 `studentNo: o.id` 자체를 없앤다.

### N1. `major`에 학년이 포함되어 **학년이 두 번 표시된다** — Minor, 처리 권고

원인: 데모 owner의 `major` = `"미디어커뮤니케이션학과 3학년"`(seed 형태)인데 화면이 `{major} · {grade}학년`으로 조합한다.

| 위치 | 실측 표시 |
|---|---|
| 접수함 학생 셀 | `20229876 · 미디어커뮤니케이션학과 3학년` — 학년 열이 없어 **중복은 아니나** 학과 필드에 학년이 섞임 |
| 기록 화면 연계 `admin-kv` (`ProfessorCounselRecords.tsx:85`) | **`미디어커뮤니케이션학과 3학년 · 3학년`** ← 중복 |
| 기록 목록 학과·학년 열 (`:158`) | **`미디어커뮤니케이션학과 3학년 · 3학년`** ← 중복 |

**더 나쁜 점**: 이 값이 저장 스냅샷에 그대로 굳는다 — 실측 `snapshot:{"major":"미디어커뮤니케이션학과 3학년","grade":3}`. 스냅샷은 이관 대상 데이터라 지금 정리하지 않으면 오염된 문자열이 남는다.

- **지시(택1)**: ⓐ 근본 — `counselSeedStudents.json`의 `major`에서 후행 "N학년"을 제거(상담사 화면도 함께 정상화, seed 변경이므로 팀장 승인). ⓑ 최소 — 투영 로더 `allRows()`에서 `studentMajor`를 정규화(후행 `\s*\d+학년` 제거). **화면이 아니라 데이터층에서 처리할 것.**

### N3. ③ 집계 범위 — 코드 결함 아님, ui-spec 문장 정정 권고

`getProfessorStats`는 `adviseeIds.has(record.studentId)`로 **배정 학생 기록만** 집계한다(`git show HEAD~1`로 확인 — 0008 기존 규칙, 이번 변경 아님). 그래서 비지도·타과 학생(김지연) 연계 기록은 조교 실적에 잡히지 않는다. 조교 화면이 "전담교수 배정 기준" 집계라 도메인상 타당하다.
→ ui-spec §4의 "저장된 기록은 … 조교가 **그대로** 집계한다"를 **"지도학생 기록은 조교 실적에 즉시 집계된다"** 로 정정 권고.

## F. 라벨·문구·열 구성·용어 재대조 (리포맷 후 변질 없음)

- 열 구성 불변: 접수함 8열(#·학생·학적·방식·주제·신청/일정·상태·관리), 기록 7열(#·상담일·학생·학과·학년·상담구분·내용·연계) — 스펙과 일치.
- 상담구분 6종 라벨(전공 및 학업 / 진로 / 취업 / 봉사 및 실습 / 사제동행프로그램 / 기타) 불변 ✓
- 상태 배지·학적 배지·`admin-*` 클래스 어휘 불변, 신규 CSS는 여전히 modifier 3개뿐 ✓
- 용어 오염 0(회원·고객·사용자님 등 없음), 이미지/현행 실조직명 유출 없음 ✓
- 권한 경계 불변: 학사 유래 필드 편집 UI 없음 · 기록 수정/삭제 UI 없음 · `assignedCounselorId` 무오염 ✓
- 주석 영문 → 한국어화 확인 ✓ (단 N2의 주석 1줄은 내용이 사실과 다름)

## G. 남은 nit (기능 영향 없음 — 다음 커밋에 묶어 처리 권고)

| # | 내용 | 위치 |
|---|---|---|
| N1 | 학년 중복 표기 + 스냅샷 오염 (**우선 처리 권고**) | seed 또는 `profCounselRequests.allRows` |
| N2 | 죽은 `?? owner.id` 폴백 + 사실과 다른 주석 | `profCounselRequests.ts:54-55` |
| N4 | 학생 화면 상담 내용 textarea **기본 문구 유실** — 기존 `defaultValue={onlineTopic}`이 `useState('')`가 되어 초기 화면이 빈칸. 제출 시엔 `onlineContent \|\| onlineTopic` 폴백이라 데이터는 유지되나 학생이 보는 초기 상태가 달라졌다(§3-2ⓐ "값 캡처용" 범위 초과). `useState(onlineTopic)`이면 원래 동작과 동일 | `ProfessorCounsel.tsx:58` |
| n1 | 변수명 `profLee`/`profJung` 잔존(실제 박지훈·김세환) + §8이 요구한 id 규약 주석 없음 | `professors.ts:8-9,21-22` |
| n2 | `biz-1` officeHours `"수 10:00~12:00"` (스펙 `"월·수 10:00~12:00"`) | `professors/biz-1.json` |
| n3 | 제한일정·노출설정 desc가 아직 `"박지훈 교수님…"`(접수함·기록은 스펙 문구로 교정됨) | `ProfessorSchedule.tsx:34` · `ProfessorProfile.tsx:25` |
| n4 | advisees subtitle `"박지훈의 지도학생"` (스펙 `"박지훈 · 내 지도학생"`) | `ProfessorAdvisees.tsx:11` |
| n5 | 노출설정 라벨 `"상담 신청 허락"`(스펙 "수락") · hint에서 **"이미 접수된 신청은 유지됩니다."** 누락 · 오피스아워 placeholder 없음 · `"상담 소개"`(스펙 "소개") | `ProfessorProfile.tsx:41-54` |
| n10 | 확정 버튼 라벨 `"일정 확정"` (스펙 `[확정]`) | `ProfessorCounselRequests.tsx:104` |
| n11 | 저장 후 폼 리셋이 `summary`만 (학생·구분·상담일 잔존) | `ProfessorCounselRecords.tsx:60` |
| n12 | 제한일정 삭제 버튼 `aria-label="삭제"` 없음(미러 원본에는 있음) | `ProfessorSchedule.tsx:78` |
| n8 | `StudentRosterTable` useMemo 의존키가 배열 참조 → 매 렌더 재계산(이전 `deptKey` 문자열) | `StudentRosterTable.tsx:42-43` |
| n9 | `getProfRequestById(professorId, id)` — 데이터층 스코프 추가는 **개선으로 수용**, ui-spec §7-4 시그니처 갱신 필요 | ui-spec 문서 |

## H. 팀장 확인 사항

1. **N1 처리 방식 결정** — seed 정정(ⓐ, 상담사 화면도 개선) vs 로더 정규화(ⓑ, 범위 최소). 스냅샷에 굳는 값이라 다음 슬라이스 전 권고.
2. **ui-spec 문서 갱신 2건** — §4 조교 집계 문장(N3) · §7-4 `getProfRequestById` 시그니처(n9).
3. nit n1~n12는 별도 커밋으로 묶어도 무방(기능·데이터 영향 없음).

