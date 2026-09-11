# 시드 JSON 퇴역(seed-retirement) DB 전환 작업지시서

- 상태: `READY_FOR_SOL` (E0~E5; revision 4 Astra 승인. 라운드 순서는 유지)
- revision: `4` — E4 기술 재리뷰 및 E5 구현 세부 편입. E0~E3 계약은 revision 2와 동일.
- 담당 구현: `SOL` (골든 패스 READY — 비교과 패턴 복제)
- 대상 handoff: `.ai/handoff-db/0003-seed-retirement/`
- 관련 화면/기능: admin 학생목록·전체학생·홈 집계·벌점·이행률·조교/교수 화면 전부, v2 교수상담 신청·팝업
- 사용자 요구 원문: "json 싹 다 삭제하고 이 json들을 DB에다 넣어달라. JSON은 DB 구축 전 임시였고 로더가 스왑 seam이라 언제든 갈아끼울 수 있게 해뒀다."

## 0. 팀장 판정 요약

| # | 엔티티 | 판정 | 상태 |
|---|---|---|---|
| E0 | 시드 입력 이동(`backend/seeds/`) + 고아 JSON 삭제 | `NO_DB_CHANGE` — **migration 없음.** `seed_source.path` 는 보관 키로 유지, 파일 위치만 바뀐다 | READY_FOR_SOL 후보 |
| E1 | 학생 로스터 전량 selector(`getFullRoster`) → `/students` | `EXTEND_QUERY_OR_API` + 뷰 교정 + **backend 4곳 roster 스프레드 제거** + 더미 학과코드 backfill | 골든 순서 2 (E3 와 한 라운드) |
| E2 | 조직·교직원 프로필(학과 트리·교수·조교·상담사 상세) | `REUSE_TABLE_AND_API` (+ profile jsonb 병합) | 골든 순서 1 |
| E3 | 전담교수 배정(`advisorAssigns`) · 조교 학과 담당(`deptAssigns`) | 조교=`REUSE`(`dc.org_assignment`) / 전담교수=`CREATE_TABLE_AND_API` (scope 는 **뷰 파생**) | 골든 순서 2 (E1 과 한 라운드) |
| E4 | 교수 상담기록(신청 없는 기록 포함) | **PENDING_USER** — 스키마 결정 필요 | 보류 |
| E5 | 학생 팝업(`popups`) · 관리자 대시보드 시드(`dashboard`) | E5a `ALTER_EXISTING_TABLE`(공지 팝업) / E5b `EXTEND_QUERY_OR_API`(집계는 SQL) | 골든 순서 3 |

**공통 원칙**
- 화면은 셀렉터만 구독한다. 로더 시그니처(동기 selector + async load)는 유지한다(SPEC.md §5).
- API 공개 key는 기존 JSON 계약을 유지한다. 계약 테스트(`backend/tests/contracts/`)가 key·중첩·type을 비교한다. `assert_same_json_shape` 는 **키 집합이 정확히 같아야 하고 `null` 과 문자열을 다른 type 으로 본다** — 값 의미가 바뀌는 엔티티(E1)는 팀장이 승인한 `fixtures/*.json` 변형 목록을 계약으로 쓴다.
- 더미 112명은 **이름·학번·학과·학년만 사실**이고 유형·GPA·이행률·건수는 실제 이벤트 테이블에서만 파생한다. `roster` jsonb의 가짜 파생값을 화면·뷰·**API 코드**가 읽지 않는다(사용자 확정: "이름만 존재, 처음 접속하는 학생").
- 삭제 대상 JSON은 프론트 `src_v2/data`·`src_admin/data`에서 사라진다. 시드 입력으로 필요한 파일은 `backend/seeds/`로 이동한다(E0).

**실행 전제 (Astra 확인)**
- `backend/migrations/` 마지막 파일은 **`041_admin_menu_seed.sql`** 이다(039 권한 계승·040 권한 시드·041 관리자 메뉴). 이 작업의 migration 은 **042 부터** 쓴다. 이미 적용된 파일은 checksum 검사(`migrate.py:36`) 때문에 수정할 수 없다.
- `dc.staff_student_scope` 는 테이블이 아니라 **뷰**다(009: `fixture_student_scope ∪ org_assignment 파생`). 권한 범위를 "행으로 넣는" 설계는 성립하지 않는다 — 새 배정 테이블은 뷰의 세 번째 UNION 가지로 편입한다(E3).
- `dc.student.college_code/dept_code` 는 학사 JSON 이 있는 3명(chaewon·changwon·jiwoo)에만 있다. 더미 112명은 NULL 이라 `org_assignment` 파생 scope 에 아무도 걸리지 않는다. 조교는 `org_assignment` 행 자체가 없다 → E1 에서 더미 학과코드를, E3 에서 조교 담당 학과를 fixture backfill 한다.
- `dc.student_type_event.actor_uid` 는 **NULL 허용**(002)이고, 표는 append-only 트리거가 걸려 있어 **DELETE 로 rollback 할 수 없다.** 시드는 이미 detail·counselSeed 학생 전원의 유형 이벤트를 넣는다(`seed_domains.py:54-55`) — 뷰의 `detail->>'studentType'` 폴백은 실제로 쓰이지 않는 방어 코드다.

---

## E0. 시드 입력 이동 + 고아 JSON 삭제

### 1. 기존 계약
| 항목 | 경로/값 |
|---|---|
| 원본 JSON | `src_v2/data/**/*.json`(20개), `src_admin/data/**/*.json`(20개) = 40개. 프론트 import 12건(§E1~E5), 나머지 28개는 backend `app.seed`·테스트만 읽는 고아 |
| 읽는 코드 | `backend/app/seed.py:35-40`(rglob 전량 → `dc.seed_source`, 키 = repo 상대경로), `seed_domains.py`, `seed_operations.py`, migration backfill 4개, 계약 테스트 2곳 |
| 기존 table | `dc.seed_source(path PK, checksum, payload)` — **이미 모든 JSON 원문이 DB에 있다.** `dc.import_issue.source_path` 가 `seed_source(path)` 를 FK 로 참조한다(001, ON UPDATE CASCADE 없음) |

### 3. 재사용 판정
- 판정: `NO_DB_CHANGE` — **path 재매핑 migration 도 만들지 않는다.**
- 근거(Astra): `seed_source.path` 를 바꾸면 세 가지가 깨진다.
  1. `import_issue.source_path` FK 가 UPDATE 를 거부한다(현재 행: `src_v2/data/diagnosisResults.seed.json`).
  2. 013·023·026·038 backfill SQL 이 `WHERE s.path='src_admin/data/…'` 를 리터럴로 쓰고, `seed.py:122-130` 이 **새 DB 시드 직후 같은 파일을 다시 실행**한다. 이 파일들은 적용 완료라 수정 불가 → 재매핑하면 새 DB 에서 조직 배정·채용·성장·상담 fixture 가 0건으로 빠진다.
  3. 일괄 `replace()` 는 아직 프론트가 import 중인 12개까지 바꿔 `seed.py:52` `missing` 예외를 낸다.
- 대신 **`seed_source.path` 는 "최초 import 시점의 원본 경로" 라는 보관 키**로 고정한다(`seed.py` docstring 의 "immutable source archive" 와 같은 뜻). 파일의 물리 위치만 `backend/seeds/{v2,admin}/` 로 옮기고, `seed.py` 가 물리 경로 → 보관 키를 접두사 치환으로 만든다.

### 4. DDL
- 없음. (`DB_SCHEMA.md` 에 `seed_source.path` 의미를 한 줄 명시 — Astra 반영)

### 8. 구현 파일
- `git mv src_v2/data/<x>.json backend/seeds/v2/<x>.json`, `git mv src_admin/data/<x>.json backend/seeds/admin/<x>.json` (하위 폴더 구조 유지: `academic/`, `students/`, `counselors/`, `professors/`, `assistants/`). 내용 불변 — checksum 유지. `backend/seeds/notices.json`·`process-codes.json` 은 그대로 둔다.
- `backend/app/seed.py:35-40`: rglob 루트를 `(('backend/seeds/v2','src_v2/data'),('backend/seeds/admin','src_admin/data'))` 쌍으로 바꾸고 `relative` 키를 `legacy_prefix + '/' + path.relative_to(root/physical)` 로 만든다. `read()`·`academic()` 의 키 문자열은 **그대로**(보관 키).
  - E0 단계에서는 두 위치를 **모두** 스캔한다(고아 28개는 새 위치, import 중 12개는 옛 위치). 각 엔티티가 파일을 옮길 때마다 옛 위치는 비어 가고, 완료 시 옛 위치 스캔을 지운다.
- `seed_domains.py`·`seed_operations.py`·`seed_demo.py`·migration SQL 의 `src_*/data/...` 문자열은 **보관 키라 손대지 않는다**(변경 0건). 영향 파일은 아래 §E0-8 목록만이다.
- **§E0-8 영향 파일 (Astra grep 결과)**
  | 파일 | 위치 | 처리 |
  |---|---|---|
  | `backend/app/seed.py` | `:35-40` rglob·키 생성 | 물리 경로 ↔ 보관 키 매핑 추가 |
  | `backend/tests/contracts/test_remaining_contract.py` | `:22` `src_admin/data/groupCounsels.seed.json`, `:32` `src_admin/data/availability.seed.json` | 두 파일은 고아 → `backend/seeds/admin/…` 로 경로 수정 |
  | `backend/app/seed_domains.py` | `:11,16,32,37,56,60,64,73,85,111,143` | 보관 키 — **수정 없음** |
  | `backend/app/seed_demo.py` | `:52` import_issue 라벨 | 보관 키 — 수정 없음 |
  | `backend/migrations/013,023,026,038` | `WHERE s.path=…` | 적용 완료 — 수정 불가·불필요 |
  | `backend/tests/test_boot_contract.py` | `:22-24,149,156` | `.ts` 파일 참조 — JSON 무관 |
  | `docs/LOCAL_DEV.md`, `deploy/` | 시드 경로 문구 | `backend/seeds/` 로 갱신 |
- E0 단계에서는 **프론트 import가 없는 고아 28개만** 먼저 이동한다(import 있는 12개는 각 엔티티가 스왑 뒤 이동).

### 9. 검증
- 빈 테스트 DB: migration 001~041 → `app.seed --root ..` `imported`, `sourceFiles=40`, `dc.seed_source.path` 40행이 모두 `src_v2/data/…`·`src_admin/data/…` 키 / 기존 DB: `already_imported`.
- `pytest backend/tests` 전부 통과(계약 테스트 경로 수정 포함).
- `grep -rn "from '.*\.json'" src_v2 src_admin shared` = 12건(변화 없음 — 고아만 옮겼으므로).

---

## E1. 학생 로스터 전량 selector → 서버

### 1. 기존 계약
| 항목 | 경로/값 |
|---|---|
| 원본 mock JSON | `src_v2/data/studentsRoster.json` (112행, 키 21개: `id,studentNo,name,major,grade,studentType,progress,status,phone,gpa,language,competencyScore,typeScores,targetRole,targetCompanySummary,roadmapSummary,penaltyTotal,penaltyEntries,tier,programCount,counselCount`) |
| 계약 fixture | 위 키 집합 = `RosterStudent`(`src_admin/data/studentRoster.ts:25-63`, 추가로 `collegeName?,hasRoadmap?,hasDetail?`) |
| 현재 loader/selector | `studentRoster.ts`: `STUDENT_ROSTER`(JSON 상수) · `getFullRoster(departments)` · `mergeDetailedIntoRoster` · `getRosterFilterOptions` · `getRosterSummary` · `getRosterTotal` · `studentNoOf` · `studentLiteOf` — JSON 배열을 도는 함수 전부. `queryStudentRoster`·`fetchRosterMetadata` 는 이미 API |
| 현재 localStorage key | 없음 |
| 쓰는 화면 | 없음(읽기 전용 로스터) |
| 읽는 곳 (Astra grep 전수) | **전량 selector**: `counselorDashboard.ts`(getRosterSummary·getFullRoster ×5), `dashboard.ts`(STUDENT_ROSTER ×2), `advisorAssigns.ts`(getFullRoster ×4 → E3), `profCounselRecords.ts`(getFullRoster → E3, studentLiteOf → E4), `StudentDetailView.tsx:764`(STUDENT_ROSTER.find) · **필터 옵션**: `StudentPicker.tsx:33`, `AssistantAdvisor.tsx:49`, `AssistantAdvisorRecords.tsx:47`(getRosterFilterOptions) · **id→경량**: `StudentDetail.tsx:14`, `ProgramDetail.tsx:257`, `programExport.ts:32`, `counselStats.ts:174`, `psychTests.ts:71`, `counselJournals.ts:67`(studentLiteOf), `ProgramBlacklist.tsx:93`(studentNoOf 폴백) |
| **이미 서버를 쓰는 곳(교체 불필요)** | `penalties.ts`(`/penalties*`), `roadmapProgressStats.ts`(`/roadmaps`·`/roadmaps/summary`), `StudentPicker` 목록(`queryStudentRoster`) |
| 기존 API | `GET /students`(서버 페이징·필터·정렬, `dc.student_list` 뷰) · `GET /students/metadata`(집계+옵션) · `GET /students/{identity}` · `GET /bootstrap/profiles` |
| 기존 table/view | `dc.student(roster jsonb, detail jsonb)` · **`dc.student_list` 뷰**(현재 정의 = 032) |

### 2. 데이터 요구
| 동작 | 읽기/쓰기 | 필드 | 소유자 | 권한 | 생명주기 |
|---|---|---|---|---|---|
| 목록·필터·검색 | 읽기 | `RosterStudent` 전 필드 | 학사(이름·학번·학과·학년) + 파생 | staff_student_scope | 학사 유래 읽기 전용(CLAUDE.md 1조) |
| 집계(홈 유형 분포·집중관리·진단 세그먼트) | 읽기 | count/avg by type·grade·college, risk | 파생 | 동일 | SQL 집계(10조) |
| 필터 옵션 | 읽기 | majors·grades·types·tiers·statuses | 파생 | 동일 | `/students/metadata` 이미 제공 |

### 3. 재사용 판정
- 판정: `EXTEND_QUERY_OR_API` + `ALTER`(뷰 재정의) + 더미 학과코드 backfill
- 근거: 의미·소유권·권한이 `GET /students`와 동일. 남은 것은 (a) 전량 selector 를 쓰는 집계 호출부, (b) 뷰와 **API 코드 4곳**이 `roster` jsonb 가짜값을 읽는 것, (c) 더미에 학과코드가 없어 조직 파생 scope·단대 집계가 성립하지 않는 것.
- 재사용: `GET /students`, `/students/metadata`, `/students/{identity}`, `dc.student_list`.
- 만들거나 바꿀 것:
  1. **뷰 교정 `042_student_list_truth.sql`** — 032 정의에서 다음만 바꾼다.
     - `student_type` = `t.student_type`(이벤트 최신 1건)만. `detail`·`roster` 폴백 제거. `student_type_code` 조인 키도 `t.student_type`.
     - `status` = `COALESCE(s.detail->>'enrollmentStatus','재학')`. `roster->>'status'` 제거(더미의 휴학·졸업은 가짜).
     - `gpa` = `s.detail->>'gpa'`(text 유지 — `students.py` HIGH/CORE 술어가 `gpa ~ '^[0-9]…' AND gpa::numeric` 으로 text 를 전제한다). `roster->>'gpa'` 제거. **`dc.student_course` 가중평균은 이번에 넣지 않는다** — 어떤 과목·재수강·F 를 셀지가 학사 규칙이라 `DB.md` §9 미결로 남긴다.
     - `program_count`·`counsel_count`·`progress`·`star`·`has_roadmap` 는 032 그대로(이미 실적 기반).
     - **`s.roster` 컬럼을 뷰에서 제거.** `s.detail` 은 유지(API 가 상세 학생의 phone·language 등을 여기서 읽는다).
     - 추가 컬럼: `s.college_code, s.dept_code, d.college_name`(LEFT JOIN `dc.department`) — `students.py:103` 의 행마다 도는 상관 서브쿼리를 없애고 `/students/summary?groupBy=college` 가 같은 뷰를 쓰게 한다.
     - 유형 이벤트 방어 backfill: `INSERT INTO dc.student_type_event(student_uid,student_type,source,actor_uid) SELECT intg_uid, detail->>'studentType', 'fixture:detail-backfill', NULL FROM dc.student s WHERE detail->>'studentType' IN ('T1',…,'T6') AND NOT EXISTS(SELECT 1 FROM dc.student_type_event e WHERE e.student_uid=s.intg_uid)`. `actor_uid` NULL 허용 확인됨(002). 알려진 DB 에서는 0행이다(시드가 이미 넣음). **append-only 라 되돌릴 수 없으므로** 조건을 "이벤트가 하나도 없는 학생" 으로 좁힌다.
  2. **더미 학과코드 backfill `043_student_department_backfill.sql`** — `UPDATE dc.student s SET college_code=d.college_code, dept_code=d.dept_code FROM dc.department d WHERE s.dept_code IS NULL AND d.dept_name=s.major_label AND (SELECT count(*) FROM dc.department x WHERE x.dept_name=s.major_label)=1`. 동명 학과(지능로봇융합공학과·우주항공공학부 — 2건)는 NULL 로 두고 `dc.import_issue(source_path='src_v2/data/studentsRoster.json', code='AMBIGUOUS_DEPT')` 를 남긴다. 013 이 dept_code 로만 조인하는 것과 같은 **유일성 가드가 있는 fixture 전용 정규화**다 — 학과는 사용자가 "사실" 로 확정한 필드이고 코드 생성이 아니라 라벨→유일 코드 결정이다. 실이관 시 `V_DEP_INF_ALL` 코드가 덮어쓴다(CLAUDE.md 7조 주석을 SQL 머리에 남긴다). `seed.py` 파생 재실행 목록에 추가(새 DB 는 migration 시점에 학생이 없다).
  3. **집계 엔드포인트 `GET /students/summary`** — 아래 §6. `counselorDashboard.ts`(getRiskSummary·getTypeDistribution·getHelloSummary.studentCount)·`dashboard.ts`(getDiagnosisSummary) 의 클라이언트 집계를 대체.
  4. **`/students/lite` 는 만들지 않는다.** (Astra 교정) 초안의 "부팅 시 `loadStudentLite()` 로 스토어 적재" 는 6천명 전량 selector 를 이름만 바꿔 되살리는 것이다. `studentLiteOf` 소비처는 전부 **자기 DTO 의 발생 시점 스냅샷**을 쓴다(CLAUDE.md 2조): 비교과 신청자 DTO 는 이미 `studentNo·grade` 를 싣고(`programs.py:334`), 상담 신청은 `snapshot{name,studentNo,major,grade,studentType,enrollmentStatus}` 를 DB 에 갖고 있다(`counsel.py:197`). 부족한 키만 DTO 에 추가한다(§7 표).
  5. **backend `roster` 스프레드 제거** — 뷰만 고치면 끝나지 않는다. `students.py:78`(`roster()`), `students.py:128`(`GET /students/{identity}`), `counsel.py:196`(신청 스냅샷 — 더미의 가짜 studentType·status 가 스냅샷에 박힌다), `jobs.py:730`, `growth.py:67`. 다섯 곳 모두 `{**detail-유래 필드, 학사 4필드, 이벤트 유래 studentType, status}` 로 바꾼다. `seed_demo.py` 는 시연 전용 가드가 있어 손대지 않는다.
  6. 프론트 `studentRoster.ts`: JSON import 제거, `STUDENT_ROSTER`·`getFullRoster`·`mergeDetailedIntoRoster`·`getRosterFilterOptions`·`getRosterSummary`·`getRosterTotal`·`studentNoOf`·`studentLiteOf`·`isHighRisk`·`isCoreCare`·`isStarTrack`·`RISK_RULE` 삭제(판정은 서버 `HIGH/CORE` 상수 한 곳). 남는 것: 타입·CSS 유틸(`enrollStatusClass`·`studentTypeClass`·`typeSwatchClass`·`typeColorVar`·`rosterTierClass`·`TYPE_TINT`)·`queryStudentRoster`·`fetchRosterMetadata`·새 `queryStudentSummary`. `STUDENTS`·`getStudentType` import 도 사라진다.
- 새 테이블을 만들지 않는 이유: 학생 정본은 `dc.student`이고 파생값은 전부 기존 이벤트 테이블에 있다.

### 4. DDL
- `042_student_list_truth.sql`: `CREATE OR REPLACE VIEW dc.student_list`(위 정의 — 컬럼 추가만 있으므로 REPLACE 가능; `roster` 제거는 컬럼 삭제라 `DROP VIEW … ; CREATE VIEW …` 로 쓴다. 뷰를 참조하는 다른 뷰·함수 없음 확인 필요 — `\d+` 의존성 조회를 §9 에 넣는다) + 유형 이벤트 방어 INSERT.
- `043_student_department_backfill.sql`: 위 UPDATE + import_issue INSERT(`ON CONFLICT DO NOTHING`). 멱등.
- rollback: 042 → 032 파일의 뷰 정의를 그대로 다시 실행(스크립트 보관 불필요 — 032 가 곧 rollback). backfill 행은 **삭제 불가**(append-only) — 0행이 정상이며, 행이 생겼다면 그 자체가 "detail 에 유형이 있는데 이벤트가 없던 학생" 이라는 데이터 결함 기록이다. 043 → `UPDATE dc.student SET college_code=NULL,dept_code=NULL WHERE detail IS NULL AND entry_year IS NULL`(학사 JSON 3명은 `entry_year` 가 있다) + import_issue 행 삭제.

### 5. Query와 인덱스
| API | 규모·빈도 | filter/order | 인덱스 (Astra 확인) | EXPLAIN 기준 |
|---|---|---|---|---|
| `/students` | 6천명 목표·화면당 1 | 뷰 + scope + `major_label/grade/student_type/tier/status` + ILIKE | `ix_student_type_event_latest(student_uid,decided_at DESC,id DESC)` 031 ✔ · `program_apply_student(student_uid)` 018 ✔ · `counsel_request_student(student_uid,requested_at DESC)` 002 ✔ · `student_major_grade` 001 ✔ · `roadmap_item` PK(student_uid,id) ✔ · `star_track` PK ✔ · `department` PK ✔ | LATERAL type·progress 가 Index Scan, count 서브쿼리 2개가 Index Scan. **scope 조인**(`staff_student_scope` 뷰 = UNION 3가지)이 Seq Scan 을 타면 `fixture_student_scope` PK·`org_assignment(college_code,dept_code)` — 후자는 인덱스가 없다. 6천명·조직 100건 규모면 Hash Join 으로 충분 — 필요 시 `ix_org_assignment_dept(college_code,dept_code) WHERE is_active` 를 E3 045 에 함께 넣는다 |
| `/students/summary` | 홈 진입당 1 | GROUP BY type/grade/college + FILTER 3종 | 동일 | 6천명 기준 < 200ms. 뷰를 pull-up 하면 참조하지 않는 count 서브쿼리는 평가되지 않지만 LATERAL 2개는 남는다 — 넘으면 summary 전용 SQL 을 `dc.student` 에서 직접 쓴다(물질화 금지) |
| `/students/metadata` | 목록 진입당 1 | 동일 | 동일 | 동일 |

### 6. API 계약
| method/path | request | response | 권한 | 오류 |
|---|---|---|---|---|
| `GET /students/summary` | `groupBy=type\|grade\|college`, `departments[]`, `studentIds[]`(= `/students` scope 파라미터 그대로) | `{total, groups:[{key:string\|null, label:string, count:number, avgProgress:number}], risk:{base:number, high:number, core:number, star:number}}` — `base` = `grade<>1` 인 모수(홈 카드 비율의 분모), `key` null = 유형 미정/학과코드 없음(label `'미정'`/`'기타'`), 유형은 T1~T6 전부 0건이라도 낸다(도넛 범례 고정) | staff(scope) | 400 `{code:'INVALID_GROUP_BY'}` |

기존 골든 패스 규약대로 오류 본문은 `{code,message}`, 목록 봉투는 `{items,totalCount,page,pageSize}`(summary 는 목록이 아니라 봉투 없음).

### 7. mock → API 매핑
| mock key | API | DB source | 규칙 |
|---|---|---|---|
| `id` | `id` | `person.alias` | |
| `studentNo,name,major,grade` | 동일 | `student`·`person` | 학사 유래 |
| `studentType` | 동일 | `student_type_event` 최신 | **없으면 null**(더미는 null) |
| `tier` | 동일 | `student_type_code.tier_label` | type null→null |
| `progress` | 동일 | `dc.roadmap_progress` | 로드맵 없으면 0, `hasRoadmap=false` |
| `status` | 동일 | `detail.enrollmentStatus` else `'재학'` | roster 폴백 금지 → `/students/metadata.options.statuses` 가 `['재학']`(+detail 값) 로 줄어든다. 의도된 결과 |
| `phone,gpa,language` | 동일 | `detail`(있는 학생만) else **null** | **roster 폴백 금지.** `roster()` 가 키를 명시적으로 만든다(스프레드 제거로 키가 사라지지 않게) |
| `competencyScore,typeScores,targetRole,targetCompanySummary,roadmapSummary` | 동일 | `detail`/`roadmap` | 더미 null |
| `penaltyTotal,penaltyEntries` | — | `dc.penalty_entry` | 로스터 응답에서 **제거**. Astra 확인: `penalties.ts` 는 이미 `/penalties*` 만 쓰고, `ProgramBlacklist.tsx:93` 은 서버 `BlacklistRow.studentNo` 가 있어 `studentNoOf` 폴백이 죽은 코드다. `ProgramDetail.tsx:265` 의 `a.penaltyTotal` 은 비교과 신청자 DTO 의 것(별개). 영향 범위 = `RosterStudent` 타입 2필드 삭제뿐 |
| `programCount,counselCount` | 동일 | 뷰 `program_count`·`counsel_count` | **현재 `roster()` 가 뷰 값을 매핑하지 않고 roster jsonb 의 시드값을 내보낸다**(버그) — `row['program_count']`·`row['counsel_count']` 로 교정 |
| (추가) `collegeName,hasRoadmap,hasDetail` | 동일 | 뷰 | 계약 fixture 에 포함 |
| (DTO 보강) 상담 신청 `studentGrade,studentType,studentStatus` | `counsel.py dto()` | `snapshot.grade/studentType/enrollmentStatus` | `counselStats.ts:174`·`psychTests.ts:71`·`counselJournals.ts:67`·`counselorDashboard.ts` typeOf 맵이 `studentLiteOf` 대신 이 값을 쓴다. 발생 시점 스냅샷이므로 현재 유형과 다를 수 있다 — 홈 타임라인의 유형 배지가 "신청 당시 유형" 이 되는 것은 2조에 맞는 변화 |

### 8. 구현 파일
- DDL: `backend/migrations/042_student_list_truth.sql`, `043_student_department_backfill.sql`(+ `seed.py` 파생 재실행 목록)
- API: `backend/app/students.py`(summary 추가, `roster()`·상세의 roster 스프레드 제거, `college_name` 서브쿼리 → 뷰 컬럼), `counsel.py:196`(스냅샷 소스), `counsel.py dto()`(3키 추가), `jobs.py:730`, `growth.py:67`
- frontend: `src_admin/data/studentRoster.ts`(위 §3-6), `counselorDashboard.ts`, `dashboard.ts`(getDiagnosisSummary → summary groupBy=type; 나머지는 E5b), `StudentDetailView.tsx:764`(→ `/students/{id}`), `StudentPicker.tsx`·`AssistantAdvisor.tsx`·`AssistantAdvisorRecords.tsx`(getRosterFilterOptions → `fetchRosterMetadata`), `StudentDetail.tsx`(crumb → 이미 받는 상세 응답의 name), `ProgramDetail.tsx`·`programExport.ts`(신청자 DTO 스냅샷), `counselStats.ts`·`psychTests.ts`·`counselJournals.ts`(상담 DTO 스냅샷), `ProgramBlacklist.tsx`(폴백 제거), `advisorAssigns.ts`·`profCounselRecords.ts`(**E3 라운드에서 함께** — E1 이 `getFullRoster` 를 지우면 tsc 가 깨지므로 E1+E3 는 한 라운드)
- 제거: `src_v2/data/studentsRoster.json` → `backend/seeds/v2/studentsRoster.json`(E0 규칙)
- 갱신: `DB_SCHEMA.md`(뷰 정의), `DB.md` §8-3(로스터 행 추가·완료), §9(gpa 산식 미결)

### 9. 자동 검증 게이트
- `backend/tests/contracts/test_students_contract.py`: 계약 fixture = **팀장 승인 `fixtures/students_roster.json`** 두 변형 — ① 상세 학생(김채원: 문자열 gpa·phone·studentType), ② 더미(`studentType:null, tier:null, gpa:null, phone:null, …, progress:0, hasRoadmap:false, hasDetail:false`). 키 집합 = mock 21키 − {penaltyTotal,penaltyEntries} + {collegeName,hasRoadmap,hasDetail}. `assert_same_json_shape(fixture_variants, /students items)`. `/students/summary` 3 groupBy 각각 fixture 비교.
- `backend/tests/test_students.py`: scope 밖 403/빈 목록, summary `groupBy` 오류 400, `risk.high+core` 가 `/students/metadata.summary` 와 일치, 더미의 `programCount===0`(roster 시드값 아님).
- `test_boot_contract.py`: `backend/app/*.py` 에서 `['roster']` 참조 0(seed_demo 제외) — 소스 grep 테스트; admin 5역할 부팅 시 `getFullRoster|STUDENT_ROSTER|studentLiteOf` 참조 0.
- 왕복 QA: 상담사 홈 집계 = `/students/summary`; 학생 목록에서 더미가 「유형 미정 · 0% · 재학」으로 보임; 김채원·김창원·이지우는 기존과 동일; 조교(asst_kim)로 `/students` 가 컴퓨터공학과·경영학과 학생을 보인다(043+046 이후).

---

## E2. 조직·교직원 프로필

### 1. 기존 계약
| 항목 | 경로/값 |
|---|---|
| 원본 JSON | `src_admin/data/departments.seed.json`(79행 `{collegeCode,deptCode,collegeName,deptName,course}`) · `src_v2/data/professors.seed.json`(단대 5 → 학과 → 교수 28명 `{id,name,title,major,room}`) · `src_admin/data/professors/{cse-1,biz-1}.json`(`{id,empNo,name,role,roleLabel,dept,collegeName,email,officeHours}`) · `src_admin/data/assistants/{asst_kim,asst_park}.json`(`+departments[]`) · `src_admin/data/counselors/*.json`(8명 — 프론트 import 없음 → E0 고아) |
| 현재 loader | `departments.ts`(`collegeOf`·`collegeOfDept`·`deptNameOf`·`departmentOf`·`getCollegeOptions`·`majorsOfCollege`) · `src_v2/data/professors.ts`(`PROFESSOR_GROUPS`·`findDefaultSelection`) · `src_admin/data/professors.ts`(`PROFESSORS`·`getProfessorById`·`getProfessorDepartments`) · `assistants.ts` · `deptAssigns.ts`(`getActiveAssigns`·`getAssignedDeptNames`·`getAssignHistory`) · `professorProfiles.ts`(localStorage `dc_professor_profile` — `{accept, officeHours, intro}` 교수 「상담 노출 설정」) · `src_v2/data/professorProfilesRead.ts`(`getAcceptMap`) |
| 기존 API | `GET /system/organizations`(dc.department 페이징, **administrator 전용**) · `GET /system/staff` · `GET /counselor-profiles` · `PUT /counselor-profiles/{identity}`(`counsel_operations.py:68-88`, `expectedVersion` + `counsel_operation_event` 감사) · `GET /development/identities`(staff 전원 `profile` — 개발 토큰만 검사, 부팅 시 `staffStore`에 적재) |
| 기존 table | `dc.department` · `dc.staff(role_code, profile jsonb, version)` · `dc.person(profile)` · `dc.org_assignment` |
| **Astra 확인** | `dc.staff.profile` 은 시드가 **JSON 행 전체**를 넣는다(`seed_domains.py:22-24`). 단, `cse-1`·`biz-1` 은 `professors/*.json` 이 `professors.seed.json` 그룹 항목을 **덮어써서 `title·major·room` 이 빠진다**(`:11-17` 순서). 나머지 26명은 그룹 항목만 있어 `empNo` 없음(`person.source='local'`, uid `local:{id}`). 조직 배정은 교수 2명(cse-1→`C07-10`, biz-1→`C05-04`·`C05-02` 종료)뿐이고 **조교는 0건**이다. `deptAssigns.seed.json` 의 코드는 프로필 라벨(cse-1 컴퓨터공학과=`C07-07`)과 어긋난다 — fixture 결함, 그대로 둔다 |

### 3. 재사용 판정
- 판정: `REUSE_TABLE_AND_API` + `EXTEND_QUERY_OR_API`
- 학과 트리: `dc.department` 그대로. `/system/organizations` 는 관리자 전용이라 `GET /departments`(전량 ≤500행, 페이징 없음) 추가. 프론트 `departments.ts` 는 부팅 시 `loadDepartments()` 로 스토어 적재 후 기존 동기 함수 유지(시그니처 불변). `roadmapProgressStats.ts`·`deptAssigns.ts` 도 같은 스토어를 본다.
- 교수·조교 프로필: `dc.staff.profile` 재사용. 044 로 그룹 항목 키(`title·major·room`)를 **기존 키를 지키며 병합**(`profile = seed_entry || profile`). `GET /staff/{identity}` + `PUT /staff/{identity}/profile` 로 `professorProfiles.ts` 의 localStorage 편집을 대체. `counsel_operations.py` 의 `staff_row`·`audit`·낙관적 잠금 패턴을 그대로 쓴다(같은 `profile` jsonb, 같은 `version`).
- 학생 상담신청 교수 목록(`PROFESSOR_GROUPS`): `GET /staff?role=professor&groupBy=college`. 그룹 키는 **`org_assignment`(활성, role='professor') 의 `(college_name, dept_name)` 우선, 없으면 `profile->>'collegeName'`/`profile->>'dept'` 라벨**. E3 046 이 교수 28명의 org_assignment 를 유일성 가드로 backfill 하면 라벨 폴백은 실제로 쓰이지 않는다 — 폴백은 이관 전 fixture 안전망이고 `DB.md` §9 에 "교수 소속 정본 = 학사 org_assignment, 폴백 제거 시점" 을 남긴다.

### 4. DDL
- `044_staff_profile_merge.sql`: `UPDATE dc.staff f SET profile = e.entry || f.profile FROM (seed_source 'src_v2/data/professors.seed.json' 을 단대→학과→교수로 펼친 행) e JOIN dc.person p ON p.alias=e.entry->>'id' WHERE f.intg_uid=p.intg_uid AND NOT (f.profile ?& array['title','major','room'])`. 스키마 변경 없음, 멱등. **`seed_domains.py:11-17` 도 병합 순서를 `{**group_entry, **detail_row}` 로 고쳐** 새 DB 에서 같은 결과가 나오게 한다(044 는 기존 DB 용).
- rollback: `UPDATE dc.staff SET profile = profile - array['title','major','room'] WHERE intg_uid IN (cse-1, biz-1 uid)`. 나머지는 원래 있던 키라 되돌릴 것이 없다.

### 5. Query와 인덱스
| API | 규모 | 인덱스 |
|---|---|---|
| `GET /departments` | 79행(≤500) 부팅 1회 | PK `(college_code,dept_code)` 정렬 그대로 |
| `GET /staff?role=` | 교직원 ≤ 수백 | `dc.staff` PK + `org_assignment(staff_uid,…)` UNIQUE 선두 컬럼. 추가 인덱스 없음 |
| `GET /staff/{identity}` | 1행 | `person.alias` UNIQUE |

### 6. API 계약
| method/path | response | 권한 | 캐시 |
|---|---|---|---|
| `GET /departments` | `[{collegeCode,deptCode,collegeName,deptName,course}]` (`departments.seed.json` 과 동일 shape) | `principal`(전 역할 — 개인정보 없는 조직 디렉터리. 학생 SPA 는 지금 안 쓰지만 공유 컴포넌트가 `collegeOf` 를 부를 수 있다) | HTTP 캐시 헤더 없음(개발 토큰 헤더 경로라 공유 캐시 불가). 부팅 스토어 1회 적재, 변경은 이관 배치에서만 → 재조회 없음 |
| `GET /staff?role=professor&groupBy=college` | `[{name(단대), divisions:{학과명:[{id,name,title,major,room,accept:boolean}]}}]` — `professors.seed.json` 구조 + `accept`(`profile.counselAccept`, 기본 true). **학생 노출용이라 `empNo·email` 을 내지 않는다** | `principal` | 없음 |
| `GET /staff?role=assistant\|career\|psych` | `[{id,name,role,roleLabel,dept,collegeName,departments?,email,officeHours?,version}]` | staff | |
| `GET /staff/{identity}` | `professors/cse-1.json` 구조 + `orgAssignments:[{id,collegeCode,deptCode,collegeName,deptName,roleCode,validFrom,validTo,isActive}]`(활성·종료 모두 — `deptAssigns.getAssignHistory` 대체) + `counselProfile:{accept,officeHours,intro}` + `version` | 본인 또는 staff. 학생 → 403 | |
| `PUT /staff/{identity}/profile` | body `{expectedVersion, accept, officeHours, intro}` → `{version}` | 본인만(교수). 저장 키 `counselAccept`·`officeHours`·`intro`(상담사 `officeHours` 와 같은 키, 충돌 없음). `counsel_operation_event(entity='PROFILE')` 감사 | 409 `{code:'VERSION_CONFLICT'}` |

`/development/identities`·`/counselor-profiles` 는 **변경하지 않는다** — 전자는 `profile ? 'roleLabel'` 로 걸러 `{**profile,id,name,role}` 를 내고, 044 가 추가하는 키는 `title·major·room` 뿐이라 `StaffUser` 타입에 없는 키가 늘어날 뿐 기존 필드 의미가 바뀌지 않는다. `counselor-profiles` 는 role career/psych 만 읽는다.

### 8·9. 구현·검증
- 구현: `backend/app/staff.py`(새 라우터 — `departments`·`staff` 3개), `seed_domains.py:11-17` 병합 순서, `shared/departmentStore.ts`(+ `bootstrap.ts` 적재), `src_admin/data/departments.ts`·`deptAssigns.ts`·`professors.ts`·`assistants.ts`·`professorProfiles.ts`, `src_v2/data/professors.ts`·`professorProfilesRead.ts`.
- 계약 테스트 `test_staff_contract.py`: `departments.seed.json[0]`, `professors.seed.json[0]`(그룹 구조 — `accept` 는 fixture 에 추가해 팀장 승인), `professors/cse-1.json`(+`orgAssignments`·`counselProfile`·`version` 추가 fixture) 각각 shape 비교. 학생 principal 로 `GET /staff/cse-1` 403, `GET /staff?role=professor` 응답에 `email` 키 없음.
- 제거: 5개 JSON → `backend/seeds/admin|v2/…`. `dc_professor_profile` localStorage 제거.

---

## E3. 전담교수 배정 · 조교 학과 담당

### 1. 기존 계약
| 항목 | 경로/값 |
|---|---|
| 원본 JSON | `advisorAssigns.seed.json`(16행 전부 `status:'active'`: `{id,studentId,professorId,professorName,assignedAt(YYYY-MM-DD),status,by(asst_kim\|asst_park),snapshot{studentNo,name,major,grade,status}}`) · `deptAssigns.seed.json`(3행 교수 — 이미 013 이 `org_assignment` 로 적재) |
| 현재 loader | `advisorAssigns.ts`(localStorage `dc_advisor_assign` + seed, `getActiveAssignByStudent`·`getAdviseeStudentIds`·`getAdviseeRoster`·`assignAdvisor`·`queryAdvisorRoster`(tab all/assigned/unassigned·major/grade/status/year·q)·`getAdvisorTabCounts`·`getAssignYearOptions`·`getProfessorAdvisorCounts`·`getAdvisorRosterForExport`) · `deptAssigns.ts` |
| 쓰는 화면 | `AssistantAdvisor.tsx`(조교가 배정/해제) |
| 읽는 화면 | `ProfessorAdvisees`·`ProfessorStudents`·`AssistantStudents`·`profCounselRecords.ts`(`scopeAssignments` — 배정 × 로스터 조인) |
| 기존 API/table | `dc.org_assignment` + `PUT /system/org-assignments/{id}`(관리자) · **`dc.staff_student_scope` 뷰**(009) · `dc.fixture_student_scope`(시드가 `source='fixture:advisor-assignment'` 로 교수→학생 16행을 넣는다, `seed_domains.py:32-35`) |

### 3. 재사용 판정
- **조교 학과 담당(deptAssigns)** = `dc.org_assignment` 그대로(`REUSE`). 본인 조회는 E2 `GET /staff/{identity}.orgAssignments` 로 받는다(별도 엔드포인트 없음).
- **전담교수 배정(advisorAssigns)** = 학생↔교수 1:1(활성) + 이력. `org_assignment` 는 교직원↔학과라 의미가 다르다 → **`CREATE_TABLE_AND_API`** `dc.advisor_assignment`.
- **권한 범위 동기화 = 트리거도 서비스 코드도 아니다 (Astra 결정).** `staff_student_scope` 는 뷰이므로 **뷰에 세 번째 UNION 가지**(`SELECT professor_uid,student_uid,'advisor_assignment' FROM dc.advisor_assignment WHERE released_at IS NULL`)를 붙인다. 배정·해제가 곧 권한이며 동기화할 사본이 없다. 현행 `CO_ADVISER` 계승. 018 의 "가변 aggregate + append-only 이벤트 표" 패턴과 다르다: 여기서는 **행 자체가 이력**이고 변경은 `released_*` 한 번뿐이라 이벤트 표를 두지 않고, 대신 **release-once 트리거**로 그 외 UPDATE·DELETE 를 막는다.
- 동시 배정 경합(두 조교가 같은 학생): ① 부분 UNIQUE `(student_uid) WHERE released_at IS NULL` 이 두 번째 INSERT 를 `UniqueViolation` 으로 거절 → 409. ② 해제 직후 재배정·이중 해제는 `pg_advisory_xact_lock(hashtextextended('advisor:'||student_uid,0))` 로 학생 단위 직렬화(코드베이스의 code-group·notice 잠금과 같은 방식). ③ 해제는 `UPDATE … WHERE id=%s AND released_at IS NULL RETURNING` 으로 0행이면 409.
- 조교 권한: `POST` 는 (a) 호출자 `role_code='assistant'`, (b) 학생이 호출자의 `staff_student_scope` 안(= 조교 `org_assignment` 학과), (c) 교수 `role_code='professor'` 이고 학생 `(college_code,dept_code)` 에 활성 `org_assignment(role='professor')` 보유("학생 학과의 교수만" 규칙을 코드로). 셋 다 서버에서 검사, 프론트는 다시 판정하지 않는다.
- API:
  | method/path | request | response | 권한 |
  |---|---|---|---|
  | `GET /advisor-assignments` | `professorId?`, `studentId?`, `active?=true` | `{items:[AdvisorAssign 구조 + releasedAt\|null], totalCount, page, pageSize}` | staff(교수는 본인 것만 강제) |
  | `GET /advisor-assignments/roster` | `/students` 파라미터 + `tab=all\|assigned\|unassigned`, `year?`, `professorId?` | `{items:[RosterStudent + advisor:{professorId,professorName,assignedAt}\|null], …}` — `queryAdvisorRoster`·`getAdviseeRoster`·`profCounselRecords.scopeAssignments` 가 쓰는 조인. 정렬 `assigned 먼저, assigned_on DESC, student_no` | staff(scope) |
  | `GET /advisor-assignments/summary` | `departments[]`, `professorId?` | `{all, assigned, unassigned, years:[string], professors:[{id,name,count}]}` — 탭 카운트·연도 옵션·교수별 인원 | staff(scope) |
  | `POST /advisor-assignments` | `{studentId, professorId, assignedAt(date)}` + `Idempotency-Key` | 201 AdvisorAssign | assistant(위 a·b·c) — 403 `{code:'OUT_OF_SCOPE'}`, 409 `{code:'ALREADY_ASSIGNED'}`, 422 `{code:'PROFESSOR_DEPT_MISMATCH'}` |
  | `POST /advisor-assignments/{id}/release` | `{reason?}` | 200 | assistant(같은 scope) — 409 `{code:'ALREADY_RELEASED'}` |

### 4. DDL
- `045_advisor_assignment.sql`:
  ```sql
  CREATE TABLE dc.advisor_assignment (
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   student_uid text NOT NULL REFERENCES dc.student(intg_uid),
   professor_uid text NOT NULL REFERENCES dc.staff(intg_uid),
   assigned_by_uid text NOT NULL REFERENCES dc.person(intg_uid),
   assigned_on date NOT NULL,                       -- 화면 assignedAt
   released_at timestamptz, released_by_uid text REFERENCES dc.person(intg_uid), release_reason text,
   snapshot jsonb NOT NULL,                         -- {studentNo,name,major,grade,status,professorName} 배정 시점
   created_at timestamptz NOT NULL DEFAULT now(),
   CONSTRAINT ck_advisor_assignment_release CHECK ((released_at IS NULL)=(released_by_uid IS NULL)),
   CONSTRAINT ck_advisor_assignment_snapshot CHECK (snapshot ?& array['studentNo','name','major','grade','professorName'])
  );
  CREATE UNIQUE INDEX uq_advisor_assignment_active ON dc.advisor_assignment(student_uid) WHERE released_at IS NULL;
  CREATE INDEX ix_advisor_assignment_professor ON dc.advisor_assignment(professor_uid,assigned_on DESC) WHERE released_at IS NULL;
  CREATE INDEX ix_advisor_assignment_student_history ON dc.advisor_assignment(student_uid,assigned_on DESC,id);
  CREATE INDEX ix_org_assignment_dept ON dc.org_assignment(college_code,dept_code) WHERE is_active;
  CREATE INDEX ix_student_dept ON dc.student(college_code,dept_code) WHERE dept_code IS NOT NULL;
  -- release-once: 그 외 컬럼 변경·이중 해제·DELETE 거부
  CREATE FUNCTION dc.advisor_assignment_release_only() RETURNS trigger …  -- OLD.released_at IS NOT NULL → RAISE; NEW.(student_uid,professor_uid,assigned_by_uid,assigned_on,snapshot,created_at) <> OLD.(…) → RAISE
  CREATE TRIGGER advisor_assignment_release_only BEFORE UPDATE ON dc.advisor_assignment FOR EACH ROW EXECUTE FUNCTION dc.advisor_assignment_release_only();
  CREATE TRIGGER advisor_assignment_no_delete BEFORE DELETE ON dc.advisor_assignment FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
  CREATE OR REPLACE VIEW dc.staff_student_scope AS  -- 009 정의 + 세 번째 가지
   SELECT … fixture_student_scope UNION SELECT … org_assignment UNION
   SELECT professor_uid,student_uid,'advisor_assignment'::text FROM dc.advisor_assignment WHERE released_at IS NULL;
  GRANT SELECT,INSERT,UPDATE ON dc.advisor_assignment TO dc_app;
  ```
  `professor_uid` 가 교수인지는 CHECK 로 표현할 수 없어 서비스 코드 + 테스트로 고정한다. 037 알림 트리거는 뷰를 읽으므로 그대로 동작한다.
- `046_advisor_assignment_backfill.sql`(**데이터만, `seed.py` 파생 재실행 목록에 추가** — 013 과 같은 이유로 새 DB 는 migration 시점에 학생·교직원이 없다):
  1. `INSERT INTO dc.advisor_assignment(id,student_uid,professor_uid,assigned_by_uid,assigned_on,snapshot) SELECT md5('advisor-fixture:'||j->>'id')::uuid, st.intg_uid, pf.intg_uid, by.intg_uid, (j->>'assignedAt')::date, j->'snapshot' || jsonb_build_object('professorName',j->>'professorName') FROM dc.seed_source s CROSS JOIN LATERAL jsonb_array_elements(s.payload) j JOIN dc.person sp ON sp.alias=j->>'studentId' JOIN dc.student st ON st.intg_uid=sp.intg_uid JOIN dc.person pp ON pp.alias=j->>'professorId' JOIN dc.staff pf ON pf.intg_uid=pp.intg_uid JOIN dc.person by ON by.alias=j->>'by' WHERE s.path='src_admin/data/advisorAssigns.seed.json' AND j->>'status'='active' ON CONFLICT (id) DO NOTHING;` (released 행이 생기면 `released_at` 도 매핑 — 현재 0건)
  2. `DELETE FROM dc.fixture_student_scope WHERE source='fixture:advisor-assignment'` — 뷰 가지로 대체됐으므로. `seed_domains.py:32-35` 도 삭제(새 DB 는 1 로 대신).
  3. 조교 담당 학과 — **명시 코드**로 `org_assignment` 2행: asst_kim → `(C07,C07-07)`·`(C05,C05-03)`, asst_park → `(C05,C05-03)`, `role_code='assistant'`, `valid_from=DATE '2026-03-02'`, `id=md5('org-fixture:asst-…')::uuid`, `updated_by='local:system-admin'`, `ON CONFLICT DO NOTHING`. (`assistants/*.json.departments` 라벨을 사람이 코드로 옮긴 것 — 런타임 이름 추론 아님)
  4. 교수 28명 `org_assignment(role='professor')` — `profile->>'dept'` 라벨이 `dc.department.dept_name` 과 **유일하게** 일치할 때만(043 과 같은 가드), `valid_from=DATE '2026-03-02'`, `id=md5('org-fixture:professor:'||alias||':'||dept_code)::uuid`. 이미 있는 cse-1(`C07-10`)·biz-1 행은 유지된다(교수는 복수 배정 가능, UNIQUE 는 `valid_from` 포함).
- rollback: 046 → `DELETE FROM dc.org_assignment WHERE id IN (위 md5 id)`; `INSERT INTO dc.fixture_student_scope SELECT professor_uid,student_uid,'fixture:advisor-assignment' FROM dc.advisor_assignment WHERE released_at IS NULL ON CONFLICT DO NOTHING`; `ALTER TABLE dc.advisor_assignment DISABLE TRIGGER advisor_assignment_no_delete; DELETE …; ENABLE`. 045 → 009 의 뷰 정의로 `CREATE OR REPLACE VIEW`, `DROP TABLE dc.advisor_assignment`, `DROP FUNCTION`, `DROP INDEX ix_org_assignment_dept`. 순서: 046 → 045.

### 5. Query와 인덱스
| query | 인덱스 |
|---|---|
| 학생의 활성 배정 1건 / 이중 배정 거절 | `uq_advisor_assignment_active` |
| 교수의 지도학생 목록 | `ix_advisor_assignment_professor` |
| 학생 배정 이력 | `ix_advisor_assignment_student_history` |
| `roster` 조인 `student_list LEFT JOIN advisor_assignment ON student_uid AND released_at IS NULL` | `uq_advisor_assignment_active`(부분 UNIQUE 가 곧 조인 인덱스) |
| scope 뷰 세 번째 가지 | 동일 |
| 조교 scope(`org_assignment` × 학생 학과) | `ix_org_assignment_dept` + `student(college_code,dept_code)` — 학생 쪽은 FK 만 있고 인덱스가 없다. 6천명 Seq Scan 1회는 허용 범위지만 `/students` 마다 돌므로 **`ix_student_dept(college_code,dept_code) WHERE dept_code IS NOT NULL` 을 045 에 함께 만든다** |

### 9. 검증
- 계약: `advisorAssigns.seed.json[0]` ↔ `GET /advisor-assignments` item(`releasedAt:null` 추가 fixture). `GET /advisor-assignments/roster` item = E1 fixture + `advisor` 두 변형(null / 객체).
- 행동 `test_advisor_assignments.py`: 조교가 담당 학과 밖 학생 배정 → 403; 같은 학생 이중 활성 배정 → 409(두 커넥션 동시 INSERT 로 UniqueViolation 경로까지); 다른 학과 교수 → 422; 배정 후 교수로 `GET /students/{id}` 200, 해제 후 404(scope 뷰 가지 검증); 해제된 행 UPDATE/DELETE → DB 예외; 교수 principal 로 `professorId` 타인 지정 시 본인으로 강제.
- 왕복: `AssistantAdvisor` 배정→`ProfessorAdvisees` 즉시 반영, 새로고침 후 유지, localStorage `dc_advisor_assign` 키 없음.
- 제거: `dc_advisor_assign` localStorage, 두 JSON, `seed_domains.py:32-35`.

---

## E4. 교수 상담기록 — PENDING_USER

`profCounselRecords.seed.json`(7행: `{id,studentId,professorId,professorName,categoryCode('01'…),method(대면\|비대면),date,summary?,requestId?,createdAt,snapshot{studentNo,name,major,grade}}` + localStorage `dc_advisor_nudges`). 현행 `CON_PROF_INFO`는 **신청+결과 한 행**(18.4만건). 우리 `dc.counsel_record`는 `request_id` 필수라 "신청 없는 기록"을 못 담는다. 선택지:

- **(b) 권장 — 기록 시 `counsel_request`(type=PROF, 교수가 생성, status=DONE)를 같은 트랜잭션에 만들고 `counsel_record`에 기록**: 현행 1행 구조를 그대로 계승, FK·게이트·통계가 한 테이블을 본다. `category_code`는 `counsel_record`에 컬럼 추가(ALTER).
- (a) `counsel_record.request_id` NULL 허용 + `student_uid`·`professor_uid` 컬럼 추가: 테이블은 하나지만 상담 통계·이벤트·게이트 쿼리 전부에 NULL 분기가 생긴다.

**Astra 설계 의견(확정 아님):** (b) 에 동의한다. 덧붙일 기술 사항 세 가지 — ① 교수가 만든 `counsel_request` 는 `method_code`·`slot_date=date`·`requested_at=date` 를 기록 날짜로 채우고 `source_payload` 에 `{origin:'PROF_RECORD'}` 를 남겨 학생 신청과 구분한다(상담 통계에서 "신청 확정률" 분모에 들어가면 안 된다 — `counselorDashboard.getPerformance` 가 이미 신청 기준이므로 `origin` 필터가 필요). ② `dc.counsel_event` 에 `REQ→DONE` 전이 한 건을 같은 트랜잭션에 넣어 append-only 규칙을 지킨다. ③ 독려(`dc_advisor_nudges`) 는 상담기록이 아니라 알림이다 — `dc.notification(tone='counsel', source_kind='ADVISOR_NUDGE')` 로 보내고 최근 독려 시각은 그 표에서 읽는다(새 표 불필요). `categoryCode` 는 `code_item(group='PROF_COUNSEL_CATEGORY')` 운영 코드로 두는 것이 CURRENT 코드관리 계승에 맞다.

**팀장 확정 (revision 2, 사용자 결정 2026-09-10 `04-decisions.md` D3):** **(b) 채택 + Astra ①②③ 포함.**

- `POST /counsel-requests` 교수 발의 경로: principal 이 `role=professor` 이고 body 에 `initiatedBy:'PROFESSOR'`·`studentId`·`record{summary,categoryCode,method,date}` 가 오면 한 트랜잭션에 `counsel_request(type_code=PROF, status_code='DONE', counselor_uid=교수, requested_at=slot_date=completed_at=date, source_payload.origin='PROF_RECORD')` + `counsel_record(status DONE, category_code)` + `counsel_event` 두 행(`REQUESTED`,`COMPLETE`). 권한: `dc.staff_student_scope`(E3 배정 가지) 안의 학생만, 조교·상담사 403.
- DDL(047 또는 Astra 재배번): `ALTER TABLE dc.counsel_record ADD category_code text NULL REFERENCES dc.code_item` (group `PROF_COUNSEL_CATEGORY`, 018 두 층 규약). 시드 `profCounselRecords.seed.json` 7행 backfill(`source='fixture'`).
- 통계 분모: `counselorDashboard.getPerformance` 등 "신청 확정률" 계산은 `origin<>'PROF_RECORD'` 필터.
- 독려(`dc_advisor_nudges`) → `dc.notification(tone='counsel', source_kind='ADVISOR_NUDGE')`. 새 표 없음. 최근 독려 시각은 notification 에서 읽는다.
- 프론트 `profCounselRecords.ts`: localStorage 제거. `queryProfRecords` → `GET /counsel-records?type=교수&professor=me`(DTO 에 `categoryCode`·`snapshot{studentNo,name,major,grade}` 추가), 통계 → `GET /counsel-records/summary?groupBy=professor|student`.
- 계약 fixture: `profCounselRecords.seed.json[0]` + 추가 키. 이 절은 **Astra 재리뷰 후** `READY_FOR_SOL`. 실행 순서는 E3 뒤(권한이 배정에 의존).

---

## E5. 팝업 · 관리자 대시보드 시드

### E5a 팝업 — `ALTER_EXISTING_TABLE`(`dc.notice`)
- 원본: `popups.seed.json` 4행 `{id,image('/pop01.png' 정적 자산 경로),alt,href}`. 학생 메인 공지 팝업, "오늘 그만 보기" 는 localStorage(뷰어 편의 — 유지).
- Astra 확인 036·037: `dc.notice(category CHECK IN ('PROGRAM','CAREER','SYSTEM'), title NOT NULL, summary NOT NULL, body text[] NOT NULL, posted_at date, pinned, version, deleted_at)` + `ix_notice_listing(pinned DESC,posted_at DESC,id) WHERE deleted_at IS NULL`. 037 은 `notification` 쪽만 만진다. `NoticeBody` 는 `body min_length=1`, `/notices`·`/system/notices` 는 `kind` 를 모른다 → 컬럼만 추가하면 **팝업이 공지 목록에 섞여 나온다.**
- `047_notice_popup.sql`(DDL):
  ```sql
  ALTER TABLE dc.notice
   ADD COLUMN kind text NOT NULL DEFAULT 'NOTICE' CHECK (kind IN ('NOTICE','POPUP')),
   ADD COLUMN image_path text CHECK (image_path IS NULL OR (image_path LIKE '/%' AND image_path NOT LIKE '//%')),
   ADD COLUMN href text CHECK (href IS NULL OR (href LIKE '/%' AND href NOT LIKE '//%')),
   ADD COLUMN starts_on date, ADD COLUMN ends_on date,
   ADD CONSTRAINT ck_notice_popup_shape CHECK (kind<>'POPUP' OR (image_path IS NOT NULL AND href IS NOT NULL)),
   ADD CONSTRAINT ck_notice_popup_period CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on>=starts_on);
  CREATE INDEX ix_notice_popup_active ON dc.notice(starts_on,ends_on) WHERE kind='POPUP' AND deleted_at IS NULL;
  ```
  기존 행은 DEFAULT 'NOTICE' 로 통과, 기존 CHECK·인덱스와 충돌 없음(037 의 `notification.route` 와 같은 경로 CHECK 패턴). 팝업 행: `category='SYSTEM'`, `title=alt`, `summary=''`, `body='{}'`, `posted_at=CURRENT_DATE`.
- `048_notice_popup_seed.sql`(데이터, `seed.py` 파생 재실행 목록): `INSERT INTO dc.notice(id,kind,category,title,summary,body,posted_at,image_path,href) SELECT j->>'id','POPUP','SYSTEM',j->>'alt','', '{}', CURRENT_DATE, j->>'image', j->>'href' FROM dc.seed_source s, jsonb_array_elements(s.payload) j WHERE s.path='src_v2/data/popups.seed.json' ON CONFLICT (id) DO NOTHING`.
- API: `GET /notices?kind=POPUP` → `{items:[{id,image,alt,href}]}`(mock shape — `image_path`→`image`, `title`→`alt`) 활성 기간만; **`/notices`·`/system/notices` 기본 `kind='NOTICE'` 조건 추가**(계약 회귀 방지). 관리: `PUT /notices/{id}` 에 `kind='POPUP'` 분기 모델(`{image,alt,href,startsOn,endsOn,pinned}`), 이미지 업로드는 지금 없으므로 정적 경로 문자열만(업로드가 생기면 `dc.file_object`).
- rollback: 048 → `DELETE FROM dc.notice WHERE kind='POPUP'`(시드 행은 `notice_event` 없음), 047 → `DROP INDEX; ALTER TABLE DROP CONSTRAINT ×2, DROP COLUMN ×5`.
- 계약: `popups.seed.json[0]` ↔ `GET /notices?kind=POPUP` item. `GET /notices` 응답에 `id LIKE 'pop-%'` 없음.

### E5b 대시보드 — `EXTEND_QUERY_OR_API`
- `dashboard.seed.json`: `period`, `stats[{id,label,value,unit,deltaValue,deltaUnit,deltaDir,deltaLabel,icon,tone,spark[8]}]`, `traffic{daily,weekly,monthly}`, `diagnosis{total,segments}`, `notices[]`.
- `GET /system/dashboard?from=&to=`(administrator): `stats` 는 기간 내 실 이벤트 count(진단 완료 학생 수 = `diagnosis_attempt DONE` distinct student, 상담 = `counsel_request`, 비교과 신청 = `program_apply`, 채용 지원 = `job_application`), `deltaValue`= 직전 동일 기간 대비, `spark` = 기간을 8 구간으로 나눈 count(타임스탬프가 있는 표만). **`traffic` 은 소스가 없다** — 인증/접속 로그 도메인(#9) 전까지 `null` 로 내려보내고 화면은 「집계 준비 중」(0 위장 금지). `diagnosis` 는 E1 `/students/summary?groupBy=type` 과 같은 SQL 을 재사용(별도 계산 금지). `notices` 는 `dc.notice kind='NOTICE'` 최신 N.
- 계약 fixture: `dashboard.seed.json` 에서 `traffic:null` 변형을 팀장이 승인. `icon` 은 문자열 키(`STAT_ICONS` 매핑은 프론트).

---

## 실행 순서와 게이트

1. **E0** 고아 JSON 28개 이동 + `seed.py` 키 매핑 + 계약 테스트 경로 2곳 → Sol 즉시 착수(migration 없음).
2. **E2** (044) — 독립적이고 작다. E3 의 교수 선택 UI 가 `GET /staff?role=professor` 를 필요로 하므로 E1 보다 먼저.
3. **E1 + E3 한 라운드** (042·043·045·046) — E1 이 `getFullRoster` 를 지우면 `advisorAssigns.ts`·`profCounselRecords.ts` 가 깨지고, E3 의 roster 조인은 E1 뷰를 전제한다. `tsc -b` 게이트는 라운드 끝에 한 번.
4. **E5** (047·048 + `/system/dashboard`).
5. **E4** 사용자 결정 후(revision 2).
6. 완료 조건: `src_v2/data/**/*.json` + `src_admin/data/**/*.json` = **0개**, `grep -rn "\.json'" src_v2 src_admin shared` = 0, `seed.py` 의 옛 위치 스캔 제거, DB.md §8-3 갱신, admin 5역할·v2 3학생 콘솔 오류 0.

## 10. 완료 조건
- [ ] revision 1 Astra `ASTRA_APPROVED`
- [ ] E4 사용자 결정 반영(revision 2)
- [ ] migration 042~048 빈 DB·기존 DB 적용, `seed.py` 파생 재실행 목록(043·046·048) 갱신
- [ ] 계약 테스트 5종 통과(students·staff·advisor-assignments·popups·dashboard) + 팀장 승인 fixture 4개(students_roster 2변형·staff accept·advisor roster·dashboard traffic null)
- [ ] 프론트 JSON import 0 · localStorage 업무 데이터 파일 수 10 → ≤5
- [ ] `npm run build` · `tsc -b`
- [ ] `DB_SCHEMA.md`·`DB.md` §8-3·§9 갱신 · 팀장 왕복 QA `PASS`

---

## Astra 리뷰 (revision 1)

**판정: `ASTRA_APPROVED` (revision 1 — 아래 13건 교정을 반영한 이 문서 기준)**. 초안 그대로였다면 `ASTRA_CHANGES_REQUIRED` 였다(번호 충돌·뷰를 테이블로 오인·path 재매핑이 시드를 깨는 세 가지가 구현 불가 수준). 교정은 전부 기술 오류·누락이며 업무 의미 변경(`USER_DECISION_REQUIRED`)은 E4 하나뿐이다(초안과 동일). 팀장이 §10 fixture 와 043 방식을 확인하면 `READY_FOR_SOL` 로 올려도 된다. schema/API/권한/계약을 다시 바꾸면 revision 을 올리고 재승인 받는다(`.ai/interop.md`).

### 교정 항목 (13건)
1. **migration 번호 충돌** — 마지막 적용은 038 이 아니라 041(`039_authority_inheritance`·`040_authority_legacy_seed`·`041_admin_menu_seed` 이미 존재). 042~048 로 재배번.
2. **E0 path 재매핑 migration 폐기** — `import_issue.source_path` FK(cascade 없음), 013·023·026·038 이 리터럴 경로로 시드 후 재실행됨(수정 불가), 12개 파일이 남아 있는 상태의 일괄 replace 가 `seed.py:52` 예외. `seed_source.path` 를 보관 키로 고정하고 `seed.py` 가 물리 경로를 매핑한다. §E0-8 영향 파일 표를 실제 grep 으로 채움(수정 대상은 `seed.py` + 계약 테스트 2줄뿐).
3. **E1 뷰**: `student_type_event.actor_uid` NULL 허용 확인, 표가 append-only 라 "행 삭제 rollback" 불가 → 방어 INSERT 를 "이벤트 0건 학생" 으로 좁힘. 시드가 이미 이벤트를 넣으므로 실제 0행. `gpa` 는 text 유지(HIGH/CORE 술어 전제), `student_course` 가중평균은 §9 미결로. `roster` 컬럼 제거는 `DROP VIEW` 필요.
4. **E1 backend 4곳** — 뷰 밖에서 `student.roster` 를 스프레드하는 `students.py:78,128`·`counsel.py:196`·`jobs.py:730`·`growth.py:67` 을 교정 대상에 추가. 특히 `counsel.py:196` 은 더미의 가짜 유형을 상담 스냅샷에 박는다. 또 `roster()` 가 뷰의 `program_count/counsel_count` 를 매핑하지 않는 현행 버그를 지목.
5. **`/students/lite` 삭제** — "부팅 시 전량 lite 적재" 는 6천명 selector 의 재림. `StudentPicker` 는 이미 `queryStudentRoster` 페이징이고 옵션만 `fetchRosterMetadata` 로 바꾸면 된다. `studentLiteOf` 소비처 8곳은 각 DTO 스냅샷(비교과 신청자 DTO 는 이미 보유, 상담 DTO 는 3키 추가)으로 해결.
6. **penalty 제거 영향 = 0** — `penalties.ts` 는 `/penalties*` 전용, `ProgramBlacklist.studentNoOf` 는 죽은 폴백, `roadmapProgressStats.ts` 도 이미 `/roadmaps`. 초안의 소비처 목록에서 세 파일을 뺐다.
7. **더미 학과코드 backfill(043)** — 3명만 코드가 있어 조직 파생 scope·단대 집계·조교 배정 검사가 성립하지 않았다. 유일성 가드 + import_issue 기록 방식으로 추가(CLAUDE.md 7조를 fixture 정규화에 한해 적용, 이관 시 덮어씀). **팀장이 이 방식을 확인할 것.**
8. **E2 profile** — `staff.profile` 은 이미 JSON 전체를 담고 있다(초안 "일부만" 오류). 실제 결함은 `professors/*.json` 이 그룹 항목을 덮어 `title·major·room` 이 빠지는 것 → 044 는 병합 UPDATE 로 축소, `seed_domains.py:11-17` 순서도 교정. `/development/identities`·`counselor-profiles` 충돌 없음 확인. 학생용 `GET /staff?role=professor` 에서 `empNo·email` 제외(최소 노출). `GET /departments` 는 principal 전 역할, HTTP 캐시 없음·부팅 1회 적재.
9. **E3 scope 동기화 결정** — `staff_student_scope` 는 뷰(009)라 "같은 트랜잭션 행 삽입" 불가. 트리거·서비스 코드 모두 아닌 **뷰 UNION 가지**로 확정. release-once 트리거 + DELETE 금지로 018 패턴과의 차이를 명시. 동시 배정은 부분 UNIQUE(409) + 학생 단위 advisory lock.
10. **E3 fixture 전제** — 조교 `org_assignment` 0건, 교수 26명 org_assignment 없음 → 046 에 명시 코드(조교)·유일성 가드(교수) backfill 추가, `fixture_student_scope` 의 advisor 행 제거 + `seed_domains.py:32-35` 삭제. `student(college_code,dept_code)`·`org_assignment(college_code,dept_code)` 인덱스 부재 → 045 에 추가.
11. **E3 API 보강** — `queryAdvisorRoster`(tab·year·counts) 와 `profCounselRecords.scopeAssignments` 는 배정 × 로스터 조인이라 `/advisor-assignments` 목록만으로는 못 옮긴다 → `/advisor-assignments/roster`·`/summary` 추가.
12. **E5a** — `kind` 없이 컬럼만 추가하면 팝업이 `/notices`·`/system/notices` 에 섞인다 → 두 목록에 `kind='NOTICE'` 기본 조건, 팝업 shape CHECK·기간 CHECK·경로 CHECK(037 패턴), 부분 인덱스, 시드 migration 분리(048, 재실행 목록). 036 기존 제약·인덱스와 충돌 없음 확인.
13. **실행 순서** — E1 이 `getFullRoster` 를 지우면 E3 대상 파일이 깨지고 E3 조인은 E1 뷰를 전제 → E2 → (E1+E3) → E5 → E4 로 재배열. E5b `dashboard.ts` 의 `STUDENT_ROSTER` 참조는 E1 에서 함께 제거.

### 예상 주요 query ↔ 인덱스 대응
§E1-5, §E2-5, §E3-5 표. 신규 인덱스 4개(`uq_advisor_assignment_active`·`ix_advisor_assignment_professor`·`ix_advisor_assignment_student_history`·`ix_notice_popup_active`) + 보강 2개(`ix_org_assignment_dept`·`ix_student_dept`). 기존 인덱스 재사용 6개 확인.

### 위험·migration·rollback
- 되돌릴 수 없는 것: `student_type_event` 방어 INSERT(0행 예상). 나머지는 각 절의 rollback 절차대로 데이터 → DDL 역순.
- 새 DB 경로: 043·046·048 은 migration 시점에 대상 행이 없어 0건으로 지나가고 `seed.py` 가 재실행한다 — 세 파일에 DDL 을 섞지 않는다.
- `/students/metadata.options.statuses`·`highRiskCount`·`coreCareCount` 가 더미 가짜값 제거로 줄어든다 — 의도된 결과이며 왕복 QA 기대값에 적었다.

### JSON 호환성 테스트
`assert_same_json_shape` 가 키 정확 일치·`null≠string` 이라, 값 의미가 바뀐 E1 은 팀장 승인 fixture 2변형이 계약이다. E2·E3·E5 는 원본 JSON[0] + 추가 키 fixture. 항목은 각 §9 에 적었다.

### 팀장이 결정할 잔여 사항
- 043 더미 학과코드 유일성-가드 backfill 방식 승인(7조와의 관계).
- 계약 fixture 4개 승인(§10).
- E4 사용자 결정(초안과 동일), 그리고 Astra 의견 ①~③ 포함 여부.
- `DB.md` §9 에 추가할 미결 2건: gpa 산식, 교수 소속 라벨 폴백 제거 시점.

## 팀장 승인 (revision 2 · 2026-09-10)

- Astra 교정 13건 전부 수용. 프로세스 대조: 7조(코드 쌍)·10조(집계는 데이터층)·11조(append-only)·14조(판정식 미구현) 위반 없음.
- 잔여 결정: ① 043 더미 학과코드 backfill 승인 — fixture 정규화 한정, 비유일 학과명은 `import_issue` 기록 후 코드 NULL, API 코드에 이름 매칭 금지. ② §10 계약 fixture 4개 승인(Sol 작성 → 팀장 검증). ③ E4 = (b)+①②③(위 절). ④ `DB.md` §9 에 gpa 산식·교수 소속 라벨 폴백 제거 시점 등재.
- 실행: **1라운드 Sol = E0(고아 JSON 이동·`seed.py` 매핑) + E2**, 2라운드 = E1+E3, 3라운드 = E5, 4라운드 = E4(Astra 재승인 후). 각 라운드마다 팀장 검증(`06-verification.md`) 뒤 다음 라운드.


## 재개 승인 및 E4 기술 계약 (revision 3 · 2026-09-10)

사용자의 중단 작업 마무리 지시에 따라 승인된 업무 결정을 유지하고 구현·검증을 재개한다. [e4-review.md](e4-review.md) 전문을 E4의 구현 계약으로 편입한다. E4의 위 초안과 충돌하면 이 기술 재리뷰가 우선한다. Astra 판정은 해당 문서의 정확한 계약에 묶이며, migration 049·050을 추가 예약한다. 전체 완료 조건의 migration 범위는 042~050이다. E0~E3·E5는 기존 승인 범위 그대로다. 기존 Opus 팀장의 새 검증이나 승인을 받은 것으로 표시하지 않으며 이번 재개 실행의 검증자는 Codex다.

## E5 구현 세부 (revision 4)

[e5-addendum.md](e5-addendum.md)를 E5 구현 계약에 편입한다. 기존 업무 결정은 유지하며 날짜 경계·실측 카드·기존 관리자 화면 연결만 구체화한다.
