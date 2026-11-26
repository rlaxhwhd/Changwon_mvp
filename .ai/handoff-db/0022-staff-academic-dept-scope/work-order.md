# 0022 교수·조교 학과 배정 범위를 학사 학생 전체로 확장

- revision: 2 (rev 1 팀장 작성 → rev 2 Astra 교정, 2026-11-26. 바뀐 곳은 **〔rev2〕** 로 표시)
- 상태: **READY_FOR_SOL** — Astra 판정 `ASTRA_APPROVED`(조건부, `architecture-review.md` §2 필수 조건 전제)
- 작성: 팀장(Claude Opus), 2026-11-26
- 사용자 요청(2026-11-26): 현행 드림캐치처럼 시스템관리자가 컴공 소속 교수·조교를 타학과에 추가하면 그 학과 학생을 볼 수 있어야 한다.
  → 배정 기능(관리자 「교수학과배정」·「조교학과배정」, `dc.department_staff_assignment`·`dc.org_assignment` → `dc.staff_student_scope`)은 **이미 있다**.
  문제는 범위가 `dc.student`(첫 로그인한 학생만, 로컬 20행)에만 조인되는 것. **사용자 선택(2026-11-26, 원문 「1번으로 진행해줘」): 배정 학과의 학사 학생 전체로 넓힌다.**
- 선행: 0021(176~178) — `dc.student_login_source` 가 학사 학생 전체(USER_TY_CD 0001, 학적 무관, override·local 반영)와 `(college_code, dept_code)` 를 준다.

## 1. 실측 (로컬 Docker, 2026-11-26)

| 항목 | 값 |
|---|---|
| 교수 `70201`(소속 컴퓨터공학과, 추가 배정 전자공학과 5/714) `GET /students` | 5명, 19~21ms, 2.3KB · `/students/metadata` 13~15ms |
| 조교 `80301`(컴퓨터공학과 5/414 · 경영학과 8/205) | 6명, 20ms, 2.8KB · metadata 15~22ms |
| 같은 학과 학사 학생(`dc.student_login_source`) | 5/414 1,821(재학·휴학 332) · 5/714 321(255) · 8/205 3,710(328) |
| **결함** 교수·조교 학생 「보기」 | `StudentDetailView` 가 `GET /academic-students/{id}?optional=true` 를 부르는데 `authorize()` 가 `students.1` 메뉴(career·psych)만 허용 → **403**. 지금도 교수·조교 상세가 열리지 않는다 |
| 활성 배정 | `org_assignment` 29 · `department_staff_assignment`(legacy_id NULL) 169 |
| 인덱스 | `academic.dc_v_usr_inf(hakbu_cd)`·`(intg_uid)` 있음, `local_usr_inf` PK(intg_uid) |

〔rev2〕 Astra 추가 실측(트랜잭션 안 CREATE → EXPLAIN ANALYZE → ROLLBACK, DB 불변 확인):

| 항목 | 값 |
|---|---|
| `academic.dc_v_usr_inf` | 117,378행(학생 106,101) · `student_login_source` 106,108 |
| `department_staff_assignment` 활성 169행 | **전부 `major_code<>''`**(전공 배정), 72명, 113학과, `source=academic_assistant`. 로컬엔 이 사번의 `dc.staff` 행이 0 → 지금은 가지가 비어 있다(첫 로그인 후 살아난다). 실측은 트랜잭션 안에서 72명의 `person`·`staff` 행을 임시 생성해 했다 |
| `staff_student_scope` 의존 뷰 | 0개. 참조 함수 `dc.notify_source_event`(진단 재응시 알림, `student_uid=` 단독 조건) 1개 |
| rev 1 뷰의 staff 1명 전체 학생 | 70201 32ms · 80301 51ms · 전공배정 조교 16098 **111ms** — `student_login_source` 의 `COALESCE(override, hakbu_cd)` 가 학과 술어를 인덱스로 못 내리고 학생 10.6만 행 병렬 seq scan, 행 추정 1~3 vs 실제 5,531 |
| rev 2 뷰(§3-1) | 같은 모양 3.5 / 6.9 / 4.0ms (`ix_dc_v_usr_inf_hakbu_cd` 인덱스 스캔). 점조회 0.3~0.5ms |

## 2. 범위

| 화면 | 이번에 | 이유 |
|---|---|---|
| 교수 「학생 검색」 `/professor/students` | **학사 전체(배정 학과)** | 사용자 요청 |
| 조교 「학생 현황」 `/assistant/students` | **학사 전체(배정 학과)** | 사용자 요청 |
| 두 화면의 「보기」 상세 | **403 해소** — 범위 안 학사 학생이면 학사 상세 | 결함 |
| 교수 「지도학생」(`professorId`) · 조교 「전담교수 배정」(`/advisor-assignments/roster`) | 그대로 | `advisor_assignment.student_uid` FK → `dc.student`. 미로그인 학생 배정은 학생 행 생성이 필요한 별도 작업 |
| 상담·진단·로드맵·채용·비교과 등 `staff_student_scope` EXISTS 술어 | 뷰 확장으로 자동 포함(그 표에 행이 있어야 보이므로 결과는 사실상 불변) | 술어 단일 유지 |
| 상담사(career·psych) `/academic-students` | 불변 | |

## 3. 설계

### 3-1. DB (migration 179, Astra 승인 전 적용 금지)

`dc.staff_student_scope` 에 **학사 학생 가지**를 더한다. 기존 4가지(fixture · org_assignment×dc.student · advisor · department_assignment_student_scope)는 그대로 둔다 — `dc.student` 에만 있는 서비스 전용 fixture 가 계속 보여야 한다.

〔rev2〕 rev 1 의 `JOIN dc.student_login_source ON (college_code, dept_code)` 는 **쓰지 않는다**. `student_login_source.dept_code` 가 `COALESCE(override.dept_code, hakbu_cd)` 라 학과 술어가 인덱스로 내려가지 못해(§1 실측) 교수·조교의 모든 EXISTS 세미조인(학생·채용·비교과·진단·상담·통계)이 매 요청 학생 10.6만 행을 훑는다. 대신 **같은 의미를 인덱스 순서로 다시 쓴다**:
- 학사 행(override 없음): 배정 `(college, dept)` → `dc_v_dept_inf(dept_code, col_code)` 확인 → `academic.usr_inf.hakbu_cd = dept`(인덱스) — `student_login_source` 의 「학과 = HAKBU_CD, 단대 = 그 학과 COL_CODE」 규칙 그대로.
- override 행: `dc.student_login_override` 의 `(college_code, dept_code)` 로만 맞춘다(override 우선 규칙 그대로).
- 전공 배정: `academic_people.major_cd` 는 `usr_inf.major_cd` 그 자체라 `u.major_cd` 를 직접 비교한다(`academic_people` 의 소속명 DISTINCT ON 조인 3개 제거).
- 두 배정 표의 활성 조건은 `dc.department_academic_grant` 한 곳에 둔다(두 가지가 같은 술어를 재사용).
- 이 재작성은 `student_login_source` 와 **결과 동일**해야 한다 — 로컬 실측 108,955쌍(72명 dsa 활성화 상태) 양방향 EXCEPT 0. 계약 테스트 §4-9 로 고정한다.

```sql
-- 179_staff_academic_dept_scope.sql
-- 0022: 교수·조교 학과 배정 범위를 학사 학생 전체로(사용자 확정 2026-11-26). 의존 뷰 0 → CREATE OR REPLACE(열 이름·타입·순서 동일).
-- 롤백: 176 의 staff_student_scope 정의로 CREATE OR REPLACE 후 DROP VIEW dc.department_academic_student_scope, dc.department_academic_grant.
SET LOCAL lock_timeout = '5s';

-- 현재 유효한 학과 배정(두 표). major_code '' = 학과 전체.
CREATE VIEW dc.department_academic_grant AS
SELECT a.staff_uid, a.college_code, a.dept_code, ''::text AS major_code
FROM dc.org_assignment a
WHERE a.is_active AND a.valid_from <= CURRENT_DATE AND (a.valid_to IS NULL OR a.valid_to >= CURRENT_DATE)
UNION ALL
SELECT a.staff_uid, a.college_code, a.dept_code, a.major_code
FROM dc.department_staff_assignment a
JOIN dc.staff st ON st.intg_uid = a.staff_uid AND st.role_code = a.role_code
WHERE a.is_active AND a.legacy_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM dc.department_staff_candidates c
                  WHERE c.staff_uid = a.staff_uid AND c.role_code = a.role_code AND NOT c.is_active);

-- 배정 학과의 학사 학생(서비스 등록 여부·학적 무관). dc.student_login_source 와 같은 소속 규칙을
-- 인덱스 순서(hakbu_cd / intg_uid)로 쓴 것 — 결과 동일성은 계약 테스트가 지킨다.
CREATE VIEW dc.department_academic_student_scope AS
SELECT g.staff_uid, u.intg_uid::text AS student_uid
FROM dc.department_academic_grant g
JOIN academic.dc_v_dept_inf d ON d.dept_code::text = g.dept_code AND d.col_code::text = g.college_code
JOIN academic.usr_inf u ON u.hakbu_cd::text = g.dept_code AND u.user_ty_cd = '0001'
WHERE (g.major_code = '' OR u.major_cd::text = g.major_code)
  AND NOT EXISTS (SELECT 1 FROM dc.student_login_override o WHERE o.intg_uid = u.intg_uid::text)
UNION ALL
SELECT g.staff_uid, o.intg_uid
FROM dc.department_academic_grant g
JOIN dc.student_login_override o ON o.college_code = g.college_code AND o.dept_code = g.dept_code
JOIN academic.usr_inf u ON u.intg_uid::text = o.intg_uid AND u.user_ty_cd = '0001'
WHERE (g.major_code = '' OR u.major_cd::text = g.major_code);

CREATE OR REPLACE VIEW dc.staff_student_scope AS
SELECT staff_uid, student_uid, source FROM dc.fixture_student_scope
UNION
SELECT a.staff_uid, s.intg_uid AS student_uid, 'org_assignment'::text AS source
FROM dc.org_assignment a
JOIN dc.student s ON s.college_code = a.college_code AND s.dept_code = a.dept_code
WHERE a.is_active AND a.valid_from <= CURRENT_DATE AND (a.valid_to IS NULL OR a.valid_to >= CURRENT_DATE)
UNION
SELECT professor_uid AS staff_uid, student_uid, 'advisor_assignment'::text AS source
FROM dc.advisor_assignment WHERE released_at IS NULL
UNION
SELECT staff_uid, student_uid, 'department_staff_assignment'::text AS source
FROM dc.department_assignment_student_scope
UNION
SELECT staff_uid, student_uid, 'department_academic'::text AS source
FROM dc.department_academic_student_scope;

-- security_invoker 는 켜지 않는다(176 과 같이 소유자 권한으로 academic 을 읽는다).
GRANT SELECT ON dc.department_academic_grant, dc.department_academic_student_scope, dc.staff_student_scope TO dc_app;
```

- 조직 식별은 `(college_code, dept_code)` 쌍(CLAUDE.md 7조). 단대는 학생 `DAEHAK_CD` 가 아니라 **학과의 COL_CODE**(0021 규칙)라 `dc.department` 키와 같은 체계다.
- 전공 배정(major_code≠'')은 기존 `department_assignment_student_scope` 와 같은 의미(학생 `major_cd` 일치).
- 학적 상태로 거르지 않는다(로그인과 같은 학생 전체 — 화면 필터가 학적을 고른다).
- 〔rev2〕 같은 (교직원, 학생) 쌍이 `org_assignment` 와 `department_academic` 두 source 로 나올 수 있다. 소비처는 모두 EXISTS·집합·`DISTINCT`·`LIMIT 1` 이라 영향 없음(전수 확인: `academic_students`·`advisor_assignments`·`auth`·`counsel*`·`diagnosis`·`growth`·`jobs`·`professor_counsel_manage`·`programs`·`roadmap`·`seed_demo`·`stats`·`students`·트리거 `notify_source_event`). **이 뷰를 JOIN 해 행 수를 세는 새 코드를 만들지 않는다.**
- 〔rev2〕 새 인덱스 없음 — 필요한 `dc_v_usr_inf(hakbu_cd)`·`(intg_uid)`·`dc_v_dept_inf(dept_code)`·`department_staff_assignment_active`(staff_uid 포함)·`org_assignment` UNIQUE(staff_uid 선두)가 이미 있다.
- 〔rev2〕 Astra 검토 요청 답: ① 점조회는 rev 1·2 모두 `intg_uid` 인덱스로 내려간다(0.3~0.7ms). 「staff 1명 전체」는 rev 1 이 seq scan(32~111ms), rev 2 가 hakbu_cd 인덱스(3.5~6.9ms). ② 의존 뷰 0, 열 동일 → `CREATE OR REPLACE` 안전, GRANT 유지(재GRANT 는 무해하게 함께 둔다). ③ 상담사 경로는 `staff_student_scope` 를 `staff_uid=상담사 AND student_uid=ANY(100)` 로만 읽어 0.6→0.9ms, 상담사 전체 학생 목록 1.22~1.24s 로 0021 측정 범위 안. 교수 EXISTS 세미조인(학생·비교과) 0.2~0.7 → 3.6~4.5ms.

### 3-2. API — `backend/app/academic_students.py` 재사용

새 엔드포인트를 만들지 않는다. 학사 로스터(`ROSTER`)를 교수·조교에게 **범위로 좁혀** 연다.

- `authorize(conn, user)` → 반환값 `scoped: bool`.
  - `students.1` 메뉴 권한(career·psych·관리자 부여) → 지금처럼 전체(`scoped=False`).
  - 그 밖의 교직원 중 `dc.staff.role_code IN ('professor','assistant')` → `scoped=True`.
  - 그 외 403(지금과 같음). 학생 403.
  - `SET LOCAL jit=off` 는 두 경우 모두 유지.
- 〔rev2〕 **목록·메타: 범위 술어는 `roster` CTE 안에 한 번만 넣는다.** `roster_query(diagnosed=False, scoped=False)` 가 `scoped` 이면 roster CTE 끝(`LEFT JOIN service v USING(intg_uid)` 다음)에
  `WHERE EXISTS(SELECT 1 FROM dc.staff_student_scope g WHERE g.staff_uid=%s AND g.student_uid=a.intg_uid)` 를 붙인다. 그러면 목록·메타(옵션 배열·`summary` 집계 전부)·`diagnosed` 변형이 같은 모집단을 본다 — `filters()` 에 넣으면 `metadata()` 는 `filters()` 를 쓰지 않아 집계·옵션이 전체 학생으로 새어 나간다(rev 1 누락).
  - roster CTE 에는 다른 자리표시자가 없으므로 **값 목록 맨 앞에 `user['intg_uid']` 하나**를 넣는다(목록 `[uid, *filter_values, pageSize, offset]`, 메타 `[uid]`). `diagnosed` 변형은 `academic` 조각을 재사용하므로 같은 위치다 — 두 변형 모두 테스트한다.
  - 실측(§1 조건, 페이지 100): 재학 기본 70201 90ms · 80301 198ms · 16098 100ms / 「전체」 196 · 335 · 188ms / 메타 161 · 357 · 156ms. 「staff 범위 CTE 를 먼저 MATERIALIZED 로 만들고 조인」 변형도 재봤으나 같은 수준이라 단순한 쪽을 택한다.
- 〔rev2〕 **상세 `/{identity}`: 범위 술어를 roster 에 넣지 않는다.** 지금처럼 `ROSTER … WHERE intg_uid=%s` 점조회(1.5ms) 뒤, `scoped` 이면 **`student_access` 와 같은 허용 규칙**(범위 `staff_student_scope` 또는 본인 담당 `counsel_request.counselor_uid`)을 점조회로 검사하고 아니면 **404**. 이 허용 쿼리는 `auth.student_access` 안의 것을 `auth.py` 의 작은 함수(예: `staff_may_read(conn, user, student_uid)`)로 꺼내 둘이 함께 쓴다 — 같은 SQL 을 복사하지 않는다.
  - `optional=true` 이고 학사 행이 없는 서비스 전용 fixture 는 지금처럼 `student_access()` 로 넘긴다(같은 규칙).
  - 범위 밖 존재 여부를 알리지 않는다: 학사 행이 있든 없든 범위 밖이면 같은 404 문구.
- `scoped` 이면 `canReadDetail` 은 그 행이 범위 안이므로 true(목록 후 `readable` 쿼리 생략 가능). 상담사 경로의 `readable` 계산은 그대로.
- **내보내기 `POST /academic-students/export` 는 `students.1` 전용 유지**(`scoped` 이면 403 — 교수·조교 화면에 내보내기 없음, 권한을 넓히지 않는다).
- 메타의 `diagnosed` 등 상담사 전용 필터는 그대로 두되 범위 술어가 항상 함께 걸린다(roster 안이므로 자동).

### 3-3. 프론트

- `StudentRosterTable`: `professorId` 가 **없고** `viewerRole` 이 `professor`·`assistant` 이면 학사 로스터 모드 — 목록 `queryAcademicStudents`, 메타 `fetchAcademicStudentMetadata`(`src_admin/data/academicStudents.ts` 재사용). `professorId` 가 있으면(지도학생) 지금처럼 `/students`.
- 학사 모드의 학적 필터 기본값은 **「재학」**(조교 전담교수 배정 화면과 같은 기본; 졸업생까지 수천 명이 기본으로 뜨지 않게). 「전체」 선택 가능.
- 상세 「보기」는 그대로 `StudentDetailModal` — 학사 상세 API 가 범위 안에서 200 을 주므로 서비스 기록 없는 학생은 `AcademicServiceDetail`(학사 헤더·활동 요약) 경로로 열린다. 화면 컴포넌트를 새로 만들지 않는다.
- 부제 문구는 「현재 유효한 학과 배정에 따른 학사 학생(서비스 미이용 포함)」 정도로 사실대로.
- 〔rev2〕 목록과 메타는 화면 진입 시 각 1회만 — 필터 변경은 목록만 다시 부른다(메타는 범위 전체 기준이라 필터와 무관). ego-browser 에서 중복 호출 0 을 확인한다.

## 4. 테스트 (계약·회귀)

`backend/tests/test_department_assignments.py` 또는 새 파일에:
1. 교수 X 를 학과 D 에 배정 → `dc.student` 에 **없는** D 의 학사 학생(로컬 지원 `academic_test_support.add_academic_user`)이 `GET /academic-students` 에 보이고, 다른 학과 학사 학생은 안 보인다. `totalCount` 와 메타 `summary.total` 이 같다. 〔rev2〕 메타 `options.majors`·`colleges` 에 범위 밖 학과가 없다.
2. 해제(release) 후 그 학생이 목록·상세에서 사라진다(상세 404).
3. 상세 `GET /academic-students/{uid}?optional=true` — 범위 안 200, 범위 밖 404, 교수·조교 아닌 무권한 교직원 403, 학생 403. 〔rev2〕 범위 밖이지만 본인 담당 `counsel_request` 가 있는 학생은 200.
4. 전공 배정(major_code)이 다른 전공 학생을 주지 않는다(기존 `test_major_assignment_never_grants_other_major` 와 같은 모양).
5. `org_assignment` 경로(기존 70201 형태)도 학사 학생을 준다.
6. 상담사 `academic-students` 결과·`canReadDetail` 불변. 내보내기는 교수 403.
7. `SET ROLE dc_app` 으로 `dc.staff_student_scope`·`dc.department_academic_student_scope`·`dc.department_academic_grant` SELECT 가능(178 교훈 — 소유자 계정 테스트는 권한 누락을 못 잡는다).
8. 응답 키 계약: 교수 모드 목록 항목 키 집합 = 상담사 모드 키 집합.
9. 〔rev2〕 **동일성 계약**: `dc.department_academic_student_scope` 의 `(staff_uid, student_uid)` 집합 = 참조 쿼리(§3-1 활성 조건 그대로 `dc.student_login_source` 에 `(college_code, dept_code)` 조인 + 전공은 `academic_people.major_cd`) 집합, 양방향 EXCEPT 0. 픽스처에 **override 학생**(학사 학과와 다른 학과로 override), **local_usr_inf 학생**, **전공 배정**, **비활성 후보(`department_staff_candidates.is_active=false`)**, **`dc.staff` 없는 배정**, **만료된 `org_assignment`(valid_to 과거)** 를 각각 1건 이상 넣는다.
10. 〔rev2〕 `diagnosed=Y` 변형도 범위 밖 학생을 주지 않는다(자리표시자 순서 회귀).
11. 〔rev2〕 서비스 전용 fixture(학사 행 없음) 교수 범위 학생의 `?optional=true` 는 지금처럼 `null` 200, 범위 밖이면 404.

## 5. 검증 (팀장)

- `npx tsc -b`, 격리 전체 회귀(`scripts/run_regression.py`) — 기존 실패 집합과 diff 0.
- `npm run docker:migrate`/`docker:up` 후 ego-browser: 교수 70201 「학생 검색」·조교 80301 「학생 현황」 — 인원(재학 기본)·필터·페이지·「보기」 상세(서비스 학생 20211304, 미이용 학사 학생 각 1명) · 콘솔 오류 0 · 실패 요청 0 · 목록/메타 응답 시간(기준선 20ms 대비, 학사 범위 수천 행에서 목표 < 500ms — 〔rev2〕 DB 실측 90~360ms).
- 상담사 「전체 학생」 응답 시간이 0021 측정(1.37~1.40s / metadata 1.13~1.36s)보다 나빠지지 않는다.
- 〔rev2〕 교수 70201 의 기존 화면(`/students` 지도학생·채용 지원자·비교과 신청자·진단 현황) 응답 시간이 측정 기준선보다 수 ms 이상 늘지 않는다(DB 실측 세미조인 3.6~4.5ms).
- 〔rev2〕 적용 후 `SELECT count(*) FROM dc.staff_student_scope WHERE staff_uid='70201'` = 2,142 근처(5/414 1,821 + 5/714 321 + 기존 fixture 행), 80301 ≈ 5,537.

## 6. 하지 않는 것

- 학생 서비스 행(`dc.student`) 대량 생성, 전담교수 배정의 미로그인 학생 확대, 실제 교원 계정 생성(SSO 전), 서버 배포.
- 〔rev2〕 `dc.student_login_source` 정의 변경, 새 인덱스, `staff_student_scope` 를 행으로 복사하는 물질화(배정 표가 곧 권한).
