# 로드맵·IAP + 성장활동 — Opus 설계 게이트 검토

검토일: 2026-09-09 · 역할: db-process-reviewer(Opus) · 대상: `01-current-state.md` · `02-migration-design.md`

**최종 상태: `NEEDS_USER_DECISION`** — 사용자에게 올릴 질문은 **3건**이다. Astra가 올린 D01~D12 중 **6건은 이미 답이 있어 닫았고(A)**, **5건은 정책 자체가 없는 영역이라 이번 범위에서 제외했다(B)**. 없는 정책을 물어서 지어내지 않는다(`CLAUDE.md` 14조).

---

## 1. 문서 대 실제 코드 대조 결과

Astra의 조사는 **거의 전부 사실로 확인됐다.** 내가 직접 파일을 열어 대조한 항목만 적는다.

| 설계의 주장 | 대조 | 판정 |
|---|---|---|
| 로드맵 6테이블이 이미 있다 | `002_counsel_roadmap.sql:65~98` | ✅ 사실 |
| `roadmap.version` = 세대, `roadmap_snapshot UNIQUE(student_uid,version)` | 같은 파일 `:68`·`:91` | ✅ 사실. **`generation` 컬럼 추가 금지 지시 준수** |
| 최종 유형 컬럼을 `roadmap`에 넣지 않았다 | 설계 §2.1·§3.1·§13 | ✅ 지시 준수. `student_type_event`가 정본 |
| 수료만 칸을 닫는다 | `programs.py:361~370` `sync_roadmap()` — `outcome=='COMPLETED'`에서만 DONE, 철회 시 TODO 복귀 | ✅ 규칙 유지. 설계가 이 규칙을 깨지 않았다 |
| 마이그레이션은 023까지, 다음은 024 | `backend/migrations/` 실제 파일 목록 | ✅ 사실 |
| AI 4테이블·`star_track`·`file_object`·`job_resume`·`job_application_attempt`·`seed_source`·`import_issue`·`idempotency`·`code_group/item`·`menu_auth`·`staff_student_scope` 재사용 | 019·005·022·001·006·009·003 전수 확인 | ✅ **신설 시도 없음.** 설계가 참조한 테이블·컬럼 중 존재하지 않는 것은 없었다 |
| §2-4 「재생성이 최종 구성을 보존하지 못한다」 | `src_admin/data/roadmap.ts:117~131` — `appendRoadmapSnapshot(current)`은 **generated 저장소만** 얼리고, base⊕override⊕`programCells()` 가상 칸은 스냅샷에 들어가지 않는다. 직후 `resetRoadmapOverride()`가 수정 이력까지 지운다 | ✅ **사실.** 설계의 「서버가 asOf로 전체 구성을 계산해 append」가 옳은 해법 |
| §2-5 성장활동 정본 오염 | `GrowthHome.tsx:57~72` `useStoredList`가 **mount 직후 effect에서 공통 초기 상수를 학생별 키에 그대로 저장**한다. `portfolio.ts:100~169` `INITIAL_*`는 localStorage조차 없는 전 학생 공통 상수이고 `buildProfile:91~92`는 `student@cwnu.ac.kr`·`010-1234-5678`을 합성한다 | ✅ **사실이고 위험도 높다.** 채용 `SAVED_RESUMES`와 같은 함정. 설계의 「자동 import 금지·행 단위 소유 확인」이 유일하게 옳은 판정 |
| 소유권 있는 성장 자료는 `growthJournal.seed.json`(chaewon·changwon)뿐 | `growthJournal.ts:8·30·35` 학생 ID 키 구조 확인 | ✅ 사실 |
| `getRoadmapProgressStats(departments: string[])` 학과명 필터 | `roadmapProgressStats.ts:214` | ✅ 사실. 서버에도 같은 결함 있음(E12) |
| 요청 상태가 화면은 `대기/반영완료/반려`, DB는 `REQ/APPROVED/REJECTED` | `roadmapRequests.ts:39·77·90` 대 `seed_domains.py:134` | ✅ 사실 |
| `jobs`가 포트폴리오 제출을 503으로 거부 | `jobs.py:224`·`:227`·`:784` | ✅ 사실 (단 필드명 오기 — E6) |
| `students.py`가 confirmed 여부와 무관하게 `roadmapAxes`를 프로필에 싣는다 | `students.py:18~28` | ✅ 사실. 우회 경로 제거 필요 |
| `counsel.py`가 「아무 confirmed roadmap」만 검사 | `counsel.py:253` | ✅ 사실. 게이트와 술어도 어긋난다(E11) |

**추가로 내가 확인한 사실 — 설계에 없던 것**

- **`roadmapOutcome`을 가진 학생은 `jiwoo` 한 명뿐이다.** `chaewon`·`changwon`은 `roadmapAxes`만 갖는다. 즉 fixture provider로 **생성 가능한 학생은 1명**, 나머지는 전부 503이다.
- **`roadmap_entry<>'NONE'`인 시드 프로그램은 2건**(`prog_001` REQUIRED/T2·T3, `prog_002` RECOMMEND/T2·T3). 계획을 가진 학생은 `chaewon`(T3)·`changwon`(T4). `prog_002`는 마감(2026-07-22)이 지나 이미 죽은 칸이다. → **현재 화면에 살아 있는 자동 편입 칸은 chaewon의 REQUIRED 1칸이 전부**다. D11이 실제로 좌우하는 데이터의 크기가 이것이다.
- **`seed_domains.py:129`가 `position=index`로 0~4를 쓴다.** 설계의 `position 1~5 / >0`은 기존 30행과 seed를 즉시 깨뜨린다(E1).

---

## 2. `USER_DECISION_REQUIRED` 12건 판정

| ID | 판정 | 근거 |
|---|---|---|
| **D01** 3상태·초안 저장 | **C — 질문 Q1(a)** | `PROCESS.md` §6-7이 「초안 → 검토중 → 확정」을 **프로세스로는 이미 확정**했다. 따라서 3상태 자체는 결정 대상이 아니고 교정 설계에 넣는다. 남는 것은 **미완성 계획을 서버에 영속할 것인가**이며, 현재 `confirmed` boolean 2값으로는 「검토중」을 표현할 수 없다. 이전 세션에서 제기됐으나 답이 없다 |
| **D02** 재생성 중 구확정본 노출 | **C — 질문 Q1(b)** | D01과 분리해 답할 수 없다. Q1의 (b)로 묶는다 |
| **D03** 상담 FK 없는 legacy 계획의 게이트 | **A — 닫음** | 개발 DB의 「legacy 확정 계획」은 **fixture 2행이 전부**다. 5.4만 건 이관은 `DB.md` #36의 별건이고 이번 범위 밖이다. 교정: `basis_kind='LEGACY_IMPORT'`로 표시하고 **기존 게이트 접근을 그대로 보존**(행위 무변경), 신규 생성만 상담 FK 필수. 이건 「현행 유지」라 업무 의미를 바꾸지 않는다 |
| **D04** 반려 사유 필수화 | **A — 닫음** | `DB.md` #21을 **닫지 않는 것**이 답이다. `handling_note text NOT NULL DEFAULT ''`로 두고 API는 현행처럼 선택으로 받는다. 나중에 필수화해도 마이그레이션이 필요 없다. 미결은 열린 채 유지 |
| **D05** 스냅샷 보존기간·학생 공개 | **A — 닫음** | 「자동 삭제 없음 + 학생 화면 미개방 + 상담사 조회만」은 **현행 유지**다(지금은 조회 화면 자체가 없다). 삭제하려면 정책이 필요하지만 삭제하지 않는 데는 정책이 필요 없다. `DB.md` #37은 열린 채 유지 |
| **D06** 성장·포트폴리오 열람 범위 | **A — 닫음** | `PROCESS.md` §2 게이팅 표에 **성장 기록은 없다** → 게이트 밖이 확정 사실이고 현행 화면도 잠그지 않는다. 상담사 열람 범위는 **현행 `StudentDetailView`가 이미 보여주는 필드 그대로** 고정한다(확대·축소 없음). 심리상담사 노출도 현행 유지. 신설되는 자기입력 연락처만 **본인 전용**으로 시작한다(교정 C6) |
| **D07** 채용 포트폴리오 제출 | **B — 범위 밖** | 제출 항목·열람자 정책이 존재하지 않는다. 현재 `canApplyWithPortfolio=false`/503이 정상 동작이다. **단위 P를 이번 범위에서 제외**하고 `job_application_attempt` 컬럼 추가도 025에서 뺀다 |
| **D08** 오늘 미션 | **B — 범위 밖** | 문항·채점(부분문자열)·합격 기준(6/10, 2/3)·재응시가 전부 화면 상수다. **소유자가 있는 영속 결과가 0건**이라 「기존 사실 조회」로 좁힐 것조차 없다. 화면은 현행 로컬 동작을 유지하고 서버 테이블을 만들지 않는다 |
| **D09** STAR 검사·C-PASS·장학 | **B — 범위 밖(단, 조회는 포함)** | `DB.md` #29·#30이 열려 있고 「판정 로직 착수 금지」가 명시돼 있다. 범위를 **「기존 `dc.star_track` payload를 읽기 전용으로 조회」**로 좁힌다 — `starTrack.ts`가 JSON 대신 API를 읽게 바꾸는 것까지가 전부다. 계산·쓰기·합격/장학 판정 없음 |
| **D10** 퀘스트·XP·레벨·랭킹 | **B — 범위 밖** | `SPEC.md`:484 「마일리지 이관 제외 확정. 퀘스트·레벨로 대체할지 없앨지 미정」. 정책 원천이 없다. **테이블 신설 금지**, 화면 상수를 서버 값으로 승격 금지 |
| **D11** 프로그램 편입 소급·조건변경·유형승급 | **A(대부분) + C(잔여 1건 → Q2)** | ① **신규 개설 편입**은 `PROCESS.md` §6-4가 확정. ② **소급**은 이관 충실도 규칙으로 닫는다 — cutover 시 **현재 화면이 보여주는 alive 자동칸만** 1회 적재하고, 로드맵 생성/재생성 트랜잭션에서도 그 시점의 alive 편입 프로그램을 부착한다. 이러면 `programCells()`와 결과가 정확히 같아 화면이 변하지 않는다. ③ **연결된 프로그램의 편입조건 변경 409 차단**도 교정으로 확정. ④ 남는 것은 **유형이 바뀐 뒤 옛 유형으로 붙은 칸의 처리**(`DB.md` #33)뿐 → **Q2** |
| **D12** 연간 재생성 기준일·실제 provider | **B — 범위 밖** | `spec_v1.md`:404가 이미 답했다 — 「#31이 미정이므로 **정기 자동 실행은 비활성**으로 두고 상담사 재상담 경로부터 검증한다」. scheduler를 이번에 만들지 않는다. provider는 `model=fixture` 1건 + 나머지 503(`DB.md` #38 유지) |

**요약: A 6건 · B 5건 · C 3건(D01·D02 병합 + D11 잔여).**

---

## 3. 교정 설계 — 발견한 기술 오류 19건

사용자에게 묻지 않고 여기서 고친다. 구현자는 **이 절을 설계보다 우선**한다.

### 3-1. 즉시 실패하는 오류 (E1~E3)

**E1. `position` 기준이 어긋나 기존 30행과 seed가 깨진다.**
`seed_domains.py:129`는 `position=index`로 **0~4**를 쓴다. 설계 §3.2의 `position 1~5`·`position>0` CHECK는 이미 적재된 2명×15칸과 새 DB seed를 모두 거부한다.
→ 024에서 `UPDATE dc.roadmap_item SET position=position+1`로 정규화하고, `seed_domains.py`를 `enumerate(axis['cells'], start=1)`로 바꾼다. `AUTO_PROGRAM`은 6 이상을 유지한다. 정규화를 하지 않으려면 CHECK를 `position>=0`·BASE 0~4로 낮춘다 — **둘 중 하나를 고르되 섞지 않는다.** 권고는 정규화(1~5)다.

**E2. `confirmed`를 생성열로 바꾸면 seed INSERT가 실패한다.**
`seed_domains.py:125`가 `confirmed=True`를 직접 INSERT한다. 생성열에는 INSERT할 수 없다.
→ D01이 3상태로 승인되면 순서를 고정한다: ① `status_code` 추가 ② `UPDATE status_code = CASE WHEN confirmed THEN 'CONFIRMED' ELSE 'DRAFT' END` ③ `DROP COLUMN confirmed` ④ `ADD COLUMN confirmed boolean GENERATED ALWAYS AS (status_code='CONFIRMED') STORED` ⑤ `seed_domains.py`와 관련 테스트를 `status_code='CONFIRMED'`로 변경. D01이 「초안 저장 불필요」면 이 단계 전체를 하지 않는다.

**E3. 요청 상태 seed가 새 코드 FK를 위반한다.**
`seed_domains.py:134`는 `'승인'→'APPROVED'`를 넣는다. 설계는 `ROADMAP_REQUEST_STATUS(REQ/APPLIED/REJECTED)` 복합 FK를 건다 → 새 DB의 seed가 FK 위반으로 죽는다.
→ 026 backfill(`APPROVED→APPLIED`)만으로 부족하다. **`seed_domains.py`의 매핑도 `{'대기':'REQ','승인':'APPLIED','반려':'REJECTED'}`로 함께 바꾼다.**

### 3-2. 두 벌이 되는 판정 (E4~E5, E11~E12)

**E4. alive 술어가 기존 정본과 어긋난다.**
`005_student_projection.sql:26`과 프론트 `schema/roadmap.ts:124`는 **`expires_at`이 NULL이면 alive**로 본다. 설계 §7.1의 `(expires_at IS NOT NULL AND asOf<expires_at)`은 RECOMMEND+NULL을 조용히 죽은 칸으로 바꿔 이행률 분모를 흔든다.
→ 정식 술어를 다음으로 고정한다.
`status='DONE' OR entry<>'RECOMMEND' OR expires_at IS NULL OR asOf < expires_at`
NOT NULL 강제는 **신규 쓰기에만** 건다: `CHECK(origin_code<>'AUTO_PROGRAM' OR entry<>'RECOMMEND' OR expires_at IS NOT NULL)`.
그리고 **`student_list` 뷰의 LATERAL을 같은 SQL 함수로 교체**한다 — 술어를 두 벌로 두면 목록과 상세가 어긋난다(`CLAUDE.md` 10조·13조). 같은 교체에서 `COALESCE(r.progress,(s.roster->>'progress')::integer,0)`의 roster fallback을 제거하고 미생성은 `has_roadmap=false`로만 표현한다.

**E5. 만료 경계값이 기존 데이터와 맞지 않는다.**
기존 뷰·프론트는 포함(`>= now()`), 설계는 배타(`asOf < expires_at`)다. 프론트가 만들어 온 값은 `${endDate}T23:59:59`(타임존 없음)이고 배타 상한이 아니다.
→ 024 backfill에서 기존 RECOMMEND의 `expires_at`을 `date_trunc('day', expires_at AT TIME ZONE 'Asia/Seoul') + interval '1 day'`(KST 다음날 00:00, 배타 상한)로 정규화하고 변환 건수를 `import_issue`에 남긴다. 이후 서버만 이 값을 계산한다 — 브라우저 시간대에 의존하지 않는다.

**E11. `counsel.py`와 `gates.py`의 CARE7 술어가 다르다.**
`counsel.py:253`은 `row['care_track']=='care7'`(NULL이면 로드맵·finalType 검증을 **건너뛴다**), `gates.py:72`는 `COALESCE(care_track,'care7')='care7'`(NULL도 CARE7로 **친다**). 트랙이 NULL인 진로취업 상담은 로드맵 없이 DONE이 된 뒤 게이트에서는 CARE7 충족으로 계산된다. `PROCESS.md` §2-1 구현규칙 4는 「트랙 판정도 단일 함수」라고 못박는다.
→ 술어를 `gates.py`의 한 함수로 옮기고 `counsel.py`의 complete가 그것을 호출한다. 설계 §7.2의 「같은 상담에 연결된 확정 계획」 검증도 이 함수 안에 둔다.

**E12. 학과명 매칭이 서버에도 있다.**
설계는 프론트 `getRoadmapProgressStats(departments: string[])`만 교정 대상으로 적었으나 `students.py:57`도 `major_label=ANY(%s)`다(`CLAUDE.md` 7조 위반).
→ 신규 로드맵·성장 목록/통계 API는 **`(college_code,dept_code)` 쌍만** 받는다(`jobs.py:849~852`가 정본 패턴). 기존 이름 필터를 신규 엔드포인트로 **복제하지 않는다**. `students.py`의 기존 결함은 이번 범위에서 고치지 않고 별건으로 등록한다(외과적 변경).

### 3-3. 이력·제약의 구멍 (E7~E8, E13~E17)

**E7. append-only 테이블의 「신규 행 필수값」이 DB로 강제되지 않는다.**
`roadmap_item_event`는 나중에 UPDATE할 수 없다. 설계는 「새 행은 세대·action·actor 필수」라고만 적었다.
→ `schema_version smallint NOT NULL DEFAULT 1` + `CHECK(schema_version=1 OR (roadmap_version IS NOT NULL AND action_code IS NOT NULL AND actor_uid IS NOT NULL))`. 또한 이 테이블에는 **현재 student FK조차 없다** → `student_uid text NOT NULL REFERENCES dc.student(intg_uid)`를 추가한다(기존 행은 모두 유효하다). item FK는 설계대로 걸지 않는다.

**E8. 「시스템 actor」를 만들지 않는다.**
`actor_uid`는 `dc.person` FK다. 시스템 계정 행을 새로 만드는 것은 `DB.md` §3-4(학사 유래·자체 발급 인원 분리)에 걸린다.
→ 자동 편입의 actor는 **프로그램을 개설한 교직원 본인**(실제 행위자)이고, `cause_kind='PROGRAM_CREATE'`·`cause_id=program_id`·payload의 `initiated_by='SYSTEM_FANOUT'`로 자동 작업임을 표시한다. `programs.py:249 record()`가 이미 같은 규약을 쓴다.

**E13. 스냅샷 중복 세대의 오류코드가 없다.**
`roadmap_snapshot`은 immutable 트리거 + `UNIQUE(student_uid,version)`이라 중복 append는 23505로 떨어진다.
→ 409 `SNAPSHOT_VERSION_EXISTS`를 §8.3 오류표에 추가한다. 500으로 새지 않게 한다.

**E14. `growth_entry_file` PK가 재연결 이력을 덮어쓴다.**
PK `(entry_id,file_id)`면 해제 후 재연결이 기존 행의 `unlinked_at`을 지우는 UPDATE가 된다.
→ surrogate UUID PK + `UNIQUE(entry_id,file_id) WHERE unlinked_at IS NULL` 부분 유니크로 바꾼다. 연결/해제의 사실은 `growth_event`가 갖는다.

**E15. `ai_run` 확장 컬럼의 「신규 필수」가 강제되지 않는다.**
ADD COLUMN 자체는 immutable 트리거를 통과한다. 기존 run은 NULL이어야 한다.
→ `CHECK(schema_version IS NULL OR (input_hash IS NOT NULL AND input_snapshot IS NOT NULL))`로 「schema_version이 있으면 근거도 있다」를 고정한다.

**E16. 신규 테이블 GRANT가 빠졌다.**
설계 §3.5는 이력 테이블의 INSERT/SELECT만 말한다. mutable 테이블 권한이 없으면 `dc_app`이 아무것도 쓸 수 없다.
→ 024/025에 명시한다. `GRANT SELECT,INSERT,UPDATE ON dc.growth_profile, dc.growth_entry, dc.program_wishlist TO dc_app;` · `GRANT SELECT,INSERT ON dc.roadmap_event, dc.roadmap_request_event, dc.growth_event, dc.program_wishlist_event, dc.growth_entry_file TO dc_app;` (`growth_entry_file`은 unlink UPDATE가 필요하면 UPDATE 포함). DELETE는 어디에도 주지 않는다.

**E17. `created_at NOT NULL DEFAULT now()`는 이관 시각을 생성 시각으로 위조한다.**
→ `roadmap_item.created_at`은 **NULL 허용**으로 추가하고 legacy 30행은 NULL(모름)로 둔다. 설계가 `completed_at`·`confirmed_at`에 적용한 원칙과 같게 맞춘다.

### 3-4. 트랜잭션·경로 (E9~E10, E18~E19)

**E9. 프로그램 삭제가 로드맵 칸 FK로 500을 낸다.**
`programs.py:234~244`는 `program_apply`만 지우고 `dc.program`을 DELETE한다. `roadmap_item.program_id` FK(002:79)가 걸린 칸이 있으면 IntegrityError → 500.
→ 삭제 전 `SELECT 1 FROM dc.roadmap_item WHERE program_id=%s`를 검사하고 409 `PROGRAM_IN_ROADMAP`. 설계의 판단이 옳다. 확정한다.

**E10. 잠금 역전이 일어나는 함수를 특정한다.**
`sync_roadmap()`은 이미 `get_program(lock=True)` 안쪽에서 호출된다. 설계는 「programs/counsel 진입점부터 순서를 바꾼다」고만 적었다.
→ 대상은 **`create_program` · `update_program` · `delete_program` · `set_outcome` · `remove_applications`** 다섯 곳이다. 이들은 함수 첫 줄에서 lifecycle advisory lock(개설·조건변경 = exclusive, 결과 처리 = shared)을 잡은 뒤에 `get_program(lock=True)`으로 내려간다. `set_selection`·`set_attendance`는 칸을 건드리지 않으므로 lock 대상이 아니다(수료만 칸을 닫는다는 규칙의 귀결이다).

**E18. provider 재고를 수용 기준에 못 박는다.**
`roadmapOutcome`을 가진 학생은 `jiwoo` 1명뿐이다.
→ §14 수용 기준에 「생성 성공 시나리오 1건(jiwoo), 그 외 전원 503 `ROADMAP_GENERATOR_UNAVAILABLE`」을 명시한다. `chaewon`·`changwon`의 `roadmapAxes`는 **생성 후보가 아니라 이미 채택된 계획**이므로 fixture run(rationale/why 분리용)과 생성 후보 run을 `source_ref`로 반드시 구분한다.

**E19. 기존 테스트 fixture가 새 제약에 걸린다.**
`test_programs.py`는 `roadmap_item`을 직접 INSERT해 수료 규칙을 검사한다. `origin_code` NOT NULL·`position>=1`·축 FK가 추가되면 그 INSERT가 깨진다.
→ 「기존 테스트 전부 회귀」에 **fixture INSERT 수정**을 포함한다. `test_outcome_not_selection_closes_the_roadmap_cell`의 **의미는 바꾸지 않는다.**

### 3-5. DTO 오기 (E6)

**E6.** 설계 §4.3·§8.3의 `jobs/capabilities.portfolio`·`PORTFOLIO_PROVIDER_UNAVAILABLE`은 실제와 다르다. 실제는 **`canApplyWithPortfolio`**(`jobs.py:224`)와 **`PORTFOLIO_SERVICE_UNAVAILABLE`**(`jobs.py:227`)이다. 없는 두 번째 코드를 만들지 않는다. (단위 P는 이번 범위에서 빠지므로 실제 변경은 없다 — 명칭만 정정한다.)

### 3-6. 성장 자료 소유권 — 교정 규칙 (C6)

설계의 원칙은 옳다. 실행 규칙을 못 박는다.

| 원천 | 판정 |
|---|---|
| `growthJournal.seed.json`(chaewon·changwon) | **적재.** 학생 ID 키가 소유자를 증명한다. `(source_path,student_uid,legacy_id)`로 결정적 새 ID 부여 |
| `dc_growth_portfolio_{studentId}_*` localStorage | **미적재.** `GrowthHome.tsx:67~69`가 공통 상수를 학생 키에 자동 저장하므로 키 존재가 작성 사실을 증명하지 않는다 |
| `portfolio.ts` `INITIAL_*` · `buildProfile`의 합성 연락처 | **미적재.** 전 학생 공통 상수 + 가짜 연락처. 채용 `SAVED_RESUMES`와 같은 함정 |
| `GROWTH_RECORDS`(공통 4건) | **미적재.** 「진단 완료·수료」라고 적혀 있으나 원천 이벤트가 없다 |
| `dc_program_wishlist` | **미적재.** 학생 ID 없는 공통 키다. 전 학생에게 같은 찜을 만들 수 없다 |
| 오늘 미션·퀘스트·미션 로그 샘플 | **미적재.** 범위 밖(B) |
| `star_track` payload | 이미 DB에 있다. **재INSERT 금지**, 읽기 전환만 |
| 자소서 r1/r2 | 021·023의 소유권/평가 연결 유지. `portfolio.ts`의 동명 `r1`은 **다른 내용이므로 병합 금지** |

신설 `growth_profile.contact_email/contact_phone`은 **본인 전용**으로 시작한다 — 교직원 projection에 넣지 않는다. `growth_event`의 before/after 본문(삭제 전 원문 포함)은 **본인만** 조회하고, 교직원에게는 행위·시각·행위자 메타만 내려준다. 현행이 보여주지 않던 것을 새로 열지 않는다.

---

## 4. 이번 라운드의 승인 가능한 범위

**포함 (R + G')**

1. `024_roadmap_operations.sql` — 로드맵 6테이블 확장(잠금 토큰·상담 근거·AI 참조·완료 근거·origin·이벤트/스냅샷 보강), 코드 그룹, alive SQL 함수, `student_list` 술어 통일, 인덱스·트리거·GRANT.
2. 로드맵 API 일체 — 조회/목록/요약/생성(fixture)/재생성/편집/검토·확정/수동 완료/이벤트·스냅샷/변경요청. 낙관적 잠금 + `Idempotency-Key` + 서버 페이징 + `menu_auth`·`staff_student_scope`.
3. 비교과 개설 자동 편입 + 수료·철회 연동(현행 `sync_roadmap` 규칙 보존) + cutover 1회 alive 칸 적재.
4. 게이트 단일 정책 확장(`gates.py`) 및 `students.py` 프로필 우회 경로 제거.
5. `025_growth_operations.sql` — `growth_profile`/`growth_entry`/`growth_event`/`growth_entry_file`/`program_wishlist`/`program_wishlist_event` 6테이블 + `file_object` owner/slot 확장.
6. 성장 기록·일지·포트폴리오 **조회/편집** API, `star_track` **읽기 전용** 조회 API, `ACTIVITY_RECO` 추천 조회.
7. `026_roadmap_growth_backfill.sql` — 소유권이 증명된 자료만.
8. 두 SPA 배선 교체 + localStorage 키 제거(로그인 선택 키·미이관 도메인 키는 건드리지 않는다).

**제외 (승인 시 명시적으로 빠지는 것)**

| 제외 항목 | 사유 | 대신 하는 것 |
|---|---|---|
| 채용 포트폴리오 제출(P) | D07 — 정책 없음 | `canApplyWithPortfolio=false` / 503 유지. `job_application_attempt` 컬럼 추가 없음 |
| 오늘 미션(M) | D08 — 정책·소유 데이터 0건 | 화면 현행 유지. 테이블 없음 |
| 퀘스트·XP·레벨·랭킹 | D10 — `SPEC.md`:484 미정 | 화면 상수 유지. 서버 승격 금지 |
| STAR 판정·선발·장학 계산 | D09 — `DB.md` #29·#30 | 기존 payload 조회만. 미확정 수치는 `null`/`POLICY_PENDING` |
| 정기(연 1회) 자동 재생성 scheduler | D12 — `spec_v1.md`:404가 비활성 지시 | 상담사 재상담 경로만 |
| 실제 AI provider | `DB.md` #38 | `model=fixture` 1건 + 나머지 503 |
| 과거 개설분 소급 재연결·유형 승급 시 칸 회수 | Q2 답 전까지 | cutover alive 칸 1회 적재까지만 |

→ **성장활동(`DB.md` §8-3 #4)은 「부분 전환」으로 기록한다.** 화면이 붙었다고 완료로 바꾸지 않는다.

---

## 5. `spec_v1.md` 추적표 — 내 정정

설계 §13의 추적표는 대체로 맞다. 아래 4줄만 고친다.

| spec_v1 위치 | 설계의 판정 | 내 정정 |
|---|---|---|
| §7.2 `generation`·최종 유형 컬럼 | 변경 | ✅ 유지. `roadmap.version`이 이미 세대이고 `roadmap_snapshot UQ(student_uid,version)`가 그것을 키로 쓴다. `student_type_event`가 유형 정본이다 |
| §7.2 초안/검토중/확정 | `USER_DECISION_REQUIRED` | **정정 — 부분 반영.** `PROCESS.md` §6-7이 3상태를 이미 확정했다. 미결은 「3상태 도입 여부」가 아니라 「미완성 계획의 서버 영속 여부」다(Q1) |
| §7.2 자동편입 `(roadmap, generation, program, 목적)` 유일성 | 반영 | ✅ 유지. 현재 칸만 저장하므로 `(student_uid,program_id) WHERE origin_code='AUTO_PROGRAM'` 부분 UQ가 같은 뜻이다 |
| §7.2 연간 재생성 (`spec_v1.md`:404) | D12로 질문 | **정정 — 이미 답이 있다.** 「#31 미정이므로 정기 자동 실행은 비활성」이 spec_v1에 명시돼 있다. 질문하지 않고 그대로 적용한다 |
| §7.2 대량 outbox | 조건부 보류 | ✅ 유지. 실제 fanout 대상은 학생 2명 규모다. 동기 트랜잭션으로 충분하고 outbox 테이블을 미리 만들지 않는다 |

---

## 6. 프로세스 적합성 체크

| 규칙 | 판정 |
|---|---|
| `CLAUDE.md` 7조 학과명 매칭 금지 | ⚠️ → 교정 E12로 해소(신규 API는 코드쌍만) |
| 8조 신분코드 리터럴 금지 | ✅ 설계 §2.2가 `STUDENT_ENROLLED` 조회를 명시 |
| 10조 집계는 데이터층 | ✅ done/total/pct·태그·분포 전부 SQL. 프론트 `.length` 금지 명시 |
| 11조 append-only | ✅ 신규 이력 4종 전부 `reject_history_change()` + INSERT/SELECT만. ⚠️ 신규 필수값 CHECK 누락 → E7·E15로 교정 |
| 12조 재생성 금지(재사용) | ✅ AI 4테이블·`star_track`·`file_object`·`job_resume`·`idempotency` 전부 재사용. 신규는 성장 6테이블뿐이고 각각 소유권·생명주기가 다르다 |
| 13조 게이팅 단일 정책 | ⚠️ → E11로 교정(complete와 gate의 술어 통일) |
| 14조 임시 판정 로직 금지 | ✅ 이것이 이 설계의 가장 강한 부분이다. provider는 「승인된 산출물을 받아 채택」만 하고 문구 생성·점수 계산·유형 추정을 하지 않는다. 미션 채점·XP·STAR 산식은 전부 배제 |
| `PROCESS.md` §6-4 수료만 완료 | ✅ 유지. 선발·출석 불변 |
| `PROCESS.md` §6-6 이월 없음·스냅샷 선행 | ✅ 유지 |
| `DB.md` §8-0 이관 전제 | ✅ 「현재 DB 값 우선 보존, 오래된 JSON으로 덮어쓰지 않음」 명시 |

---

## 7. 사용자 결정 질문 — 3건

### Q1. 로드맵 초안을 서버에 저장할 것인가, 그리고 재생성 중 학생에게 무엇을 보여줄 것인가

`PROCESS.md` §6-7은 상태를 「초안 → 검토중 → 확정」으로 이미 정했다. 그런데 DB `dc.roadmap.confirmed`는 참/거짓 2값이라 **「검토중」을 표현할 수 없다.** 이 항목은 이전 세션에서도 제기됐으나 답을 받지 못했다.

**(a) 상담사가 만들다 만 계획을 서버에 저장할 수 있어야 하는가?**

| 선택지 | 결과 |
|---|---|
| **A. 저장한다(권고)** | `status_code(DRAFT/REVIEW/CONFIRMED)` 추가, `confirmed`는 생성열로 교체. 상담이 끊겨도 작업이 남는다. 학생에게는 확정 전까지 보이지 않는다 |
| B. 저장하지 않는다 | `confirmed` 2값 유지. 생성→조정→확정이 **한 트랜잭션**이어야 하고, 브라우저를 닫으면 작업이 사라진다. 「검토중」은 화면 상태로만 존재 |

**(b) (A를 고를 때만) 재생성 도중 학생 화면은?**

| 선택지 | 결과 |
|---|---|
| **B-1. 재확정까지 잠근다(권고)** | 구계획은 스냅샷으로 넘어가고 현재 계획은 DRAFT다. 학생의 비교과·취업지원이 **재확정될 때까지 잠긴다.** 계획 1벌만 있으면 되므로 구조가 가장 단순하다 |
| B-2. 구확정본을 계속 서비스한다 | 확정본과 초안 2벌을 동시에 보관해야 한다 — **별도 draft aggregate 설계가 추가로 필요**하고 이번 범위가 커진다 |

> 영향: (a)=B면 `024`에서 상태 DDL과 draft/review API가 통째로 빠진다. (b)=B-2면 스키마 재설계가 필요해 일정이 늘어난다.
> 권고: **(a) A + (b) B-1.** 재생성은 상담 자리에서 상담사가 즉시 확정하는 흐름(§6-7 「상담과 동시」)이라 잠기는 시간이 짧다.

### Q2. 학생의 유형이 바뀐 뒤, 옛 유형 때문에 붙어 있던 IAP 자동 편입 칸을 어떻게 하는가 (`DB.md` #33)

지금은 프론트가 **조회할 때마다 다시 계산**해서(`roadmap.ts:58~74`) 유형이 바뀌면 그 칸이 즉시 사라진다. DB로 옮기면 칸이 행으로 남으므로 이 동작을 그대로 둘 수 없다.

| 선택지 | 결과 |
|---|---|
| **A. 유지 — 재생성 때 정리한다(권고)** | 유형 변경은 칸을 건드리지 않고, 새 유형 기준은 **로드맵 재생성**에서 반영된다(재생성은 15칸을 새로 만들고 이월하지 않는다). 이미 하기로 한 활동이 사라지지 않는다. 재상담 → 유형 확정 → 재생성이 한 자리에서 일어나므로 어긋나는 구간이 짧다 |
| B. 회수 — 유형이 바뀌면 즉시 뗀다 | 현행 화면 동작과 같다. 다만 학생이 이미 **신청·선발된 프로그램의 칸까지 사라질 수 있고**, 수료한 칸을 떼면 이행률이 거꾸로 내려간다. 그래서 「수료한 칸은 남기고 미완료만 회수」 같은 추가 규칙이 필요하다 |

> 영향: 실제로 영향을 받는 현재 데이터는 **chaewon(T3)의 필수 칸 1개**뿐이다. 지금 정해두지 않으면 재생성·승급 테스트의 기대값을 쓸 수 없다.
> 권고: **A.** B를 고르면 「수료·선발된 칸은 예외」 규칙을 함께 확정해야 한다.

### Q3. 성장활동을 「부분 전환」으로 확정하는 것을 승인하는가

오늘 미션·퀘스트/XP·STAR 판정·채용 포트폴리오 제출 4건은 **운영 정책 자체가 존재하지 않는다**(문항·채점 기준·보상 규칙·제출 항목·열람자가 모두 화면 상수이거나 `DB.md` #29·#30 미결이다). 없는 정책을 지금 만들어 넣으면 임시 판정 로직이 되고, 나중에 실제 규칙이 오면 데이터를 버려야 한다.

| 선택지 | 결과 |
|---|---|
| **A. 4건을 빼고 나머지를 전환한다(권고)** | 성장 기록·일지·포트폴리오 조회/편집·STAR 조회·비교과 찜이 DB로 간다. 미션·퀘스트 화면은 지금 그대로 두고, 포트폴리오 제출은 계속 503이다. `DB.md` §8-3 #4는 **「부분」**으로 기록한다 |
| B. 정책을 지금 정해 함께 만든다 | 미션 문항·채점·합격 기준, XP·레벨·랭킹 규칙, STAR 선발/장학 산식, 제출 항목·열람 범위를 **사용자가 문서로 제공**해야 시작할 수 있다 |

> 권고: **A.** B를 고른다면 어느 항목의 정책을 언제 제공할 수 있는지부터 알려주면 그 항목만 뒤에 붙인다.

---

## 8. 최종 판정

- 설계는 **재사용 판정·append-only·수료만 완료·generation 금지·최종 유형 금지** 지시를 모두 지켰다. 새 테이블은 성장 6개뿐이고 전부 기존 테이블로 대체 불가함이 확인됐다.
- **기술 오류 19건(E1~E19)** 을 위 §3에 교정해 넣었다. 그중 E1·E2·E3은 그대로 구현하면 **마이그레이션 또는 seed가 즉시 실패**하는 건이다.
- `USER_DECISION_REQUIRED` 12건 → **A 6 / B 5 / C 3**.

**최종 상태: `NEEDS_USER_DECISION`**

team-lead는 **Q1·Q2·Q3만** 사용자에게 전달한다. 답과 승인을 `04-decisions.md`에 기록하고 `APPROVED`가 적히기 전에는 `db-ecc-implementer`를 호출하지 않는다. 구현 시 `02-migration-design.md`와 이 문서가 충돌하면 **이 문서의 §3 교정 설계와 §4 범위**를 따른다.
