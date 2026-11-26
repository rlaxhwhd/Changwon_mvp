# 0022 — Astra architecture review

- 판정: **ASTRA_APPROVED (조건부)** — `work-order.md` **revision 2**(이 리뷰가 교정한 판), 아래 §2 필수 조건 전부를 전제로 한다. revision 1 의 SQL 은 그대로는 승인하지 않는다(성능·추정 오류, §1-2).
- 일자: 2026-11-26. 검토자: codex-astra-db-reviewer 역할(위임 실행).
- 범위: 설계 승인. 로컬 `dreamcatch-dev-db` 에서 **트랜잭션 안 CREATE VIEW → EXPLAIN (ANALYZE, BUFFERS) → ROLLBACK** 으로만 측정했다. 커밋된 DB 변경 없음(종료 후 `staff_student_scope` 68행·새 뷰 부재 확인). 학생 행 값은 출력하지 않고 집계·계획만 봤다. API·프론트 구현·테스트 실행은 하지 않았다.
- 이 리뷰가 고친 파일: `work-order.md`(rev 1→2, 〔rev2〕 표시), `DB_SCHEMA.md`(`staff_student_scope` 문단에 179 요약 1문단, 「미적용」 표시).

## 1. 검증한 사실과 교정

### 1-1. 사실 (로컬 DB, 2026-11-26)

| 확인 | 결과 | 설계 영향 |
|---|---|---|
| 규모 | `dc_v_usr_inf` 117,378(학생 106,101) · `local_usr_inf` 7 · override 2 · `student_login_source` 106,108 | 학생 전체 스캔 1회 ≈ 30~50ms. 교수 EXISTS 가 매 요청 이를 치르면 안 된다 |
| `department_staff_assignment` 활성 169 | 전부 전공 배정(`major_code<>''`), 72명·113학과, 로컬 `dc.staff` 매칭 0 | 전공 가지가 주 경로. 로컬에선 비어 있어 **임시 staff 72명을 트랜잭션 안에서 만들어** 측정 |
| 의존 | `staff_student_scope` 에 의존하는 뷰 0. 참조 함수 `notify_source_event`(재응시 알림, `student_uid=` 단독) | `CREATE OR REPLACE` 안전(열 이름·타입·순서 동일, 실제 실행 성공). 트리거 경로 10~12ms 로 rev 1·2 동일 |
| 소비처 | 전부 EXISTS·`= ANY`·`DISTINCT`·`LIMIT 1`. JOIN 해서 행을 세는 곳 없음 | 같은 쌍이 두 source 로 나와도 무해. 새 코드도 이 규칙을 지킨다 |
| 권한 | 새 뷰 소유자 postgres, `SET ROLE dc_app` 으로 세 뷰 SELECT 성공 | GRANT 3개 필수(178 교훈) |

### 1-2. 교정 1 — 학사 가지를 `student_login_source` 조인에서 인덱스 순서 재작성으로

rev 1 은 `JOIN dc.student_login_source s ON s.college_code=a.college_code AND s.dept_code=a.dept_code`. 이 뷰의 `dept_code`·`college_code` 는 `COALESCE(override, hakbu_cd / dept_inf.col_code)` 라 배정 쪽 학과 값이 `dc_v_usr_inf(hakbu_cd)` 인덱스로 내려가지 못한다. 실측 계획: 학생 10.6만 행 Parallel Seq Scan, 행 추정 1~3 vs 실제 5,531 — 추정 오류는 호출자 계획(중첩 루프 선택)까지 오염시킨다.

rev 2: 활성 배정을 `dc.department_academic_grant` 하나로 모으고, 학사 행은 `dept_inf(dept_code, col_code)` 확인 → `usr_inf.hakbu_cd` 인덱스, override 행은 override 표의 `(college, dept)` 로만 맞춘다. 전공은 `academic_people` 를 거치지 않고 `u.major_cd` 직접 비교(같은 열, 소속명 DISTINCT ON 조인 3개 제거). **결과 동일성**: 72명 dsa 활성화 상태에서 참조 쿼리(rev 1 의미)와 양방향 EXCEPT 0, 108,955쌍 일치. 동일성은 계약 테스트(§4-9)로 고정한다 — 두 곳에 같은 소속 규칙이 생기는 대가다.

대안 검토: (a) `student_login_source` 에 원 `hakbu_cd` 열을 추가해 이중 술어로 — override 행 때문에 OR 가 필요해 인덱스를 못 탄다. (b) 범위를 표로 물질화 — 배정·학적 변경 동기화가 생겨 「배정 표가 곧 권한」 원칙 위반. 둘 다 기각.

### 1-3. 교정 2 — API 범위 술어 위치

rev 1 은 범위 EXISTS 를 `filters()` 에 더한다고 했으나 `metadata()` 는 `filters()` 를 쓰지 않는다 → 교수 메타의 `summary`·`options`(학과·단대 목록)가 학생 전체로 샌다. rev 2: `roster_query(…, scoped)` 가 roster CTE 안에 한 번 넣는다(목록·메타·diagnosed 변형 모두 같은 모집단). 자리표시자는 값 목록 맨 앞 하나.
상세는 점조회 후 `student_access` 와 **같은 허용 규칙**(범위 또는 본인 담당 상담) 함수를 공유한다 — rev 1 의 「범위 밖 상담 담당 허용」을 roster 술어에 넣으면 목록 의미까지 바뀌므로 분리했다.

## 2. 필수 조건 (승인 전제)

1. 179 는 rev 2 §3-1 SQL 그대로(뷰 이름·열·GRANT 포함). `student_login_source` 직접 조인으로 되돌리지 않는다. `student_login_source`·176 뷰는 수정하지 않는다.
2. 계약 테스트 §4-9 동일성(override·local·전공·비활성 후보·staff 없음·만료 배정 픽스처 포함)과 §4-7 `SET ROLE dc_app` 을 반드시 둔다. 둘 중 하나라도 없으면 미승인으로 본다.
3. API 범위 술어는 roster CTE 안 한 곳. 메타가 범위 밖 학과를 옵션으로 내지 않는 테스트(§4-1). 상세 허용 SQL 은 `auth.py` 함수 하나를 `student_access` 와 공유(복사 금지).
4. 내보내기는 `scoped` 이면 403. `authorize` 의 교수·조교 판정은 `dc.staff.role_code`(범위 뷰의 dsa 가지와 같은 근거).
5. 팀장 검증 §5 의 교수 기존 화면 응답 시간 비교와 dc_app 로컬 Docker 실행(소유자 계정이 아닌 앱 계정)을 생략하지 않는다.

## 3. 예상 주요 query 와 인덱스

| 모양 | 사용처 | 인덱스·계획 | rev 1 | **rev 2** | 기존(176) |
|---|---|---|---|---|---|
| 점조회 `staff_uid=$1 AND student_uid=$2` | `auth.student_access`·jobs·programs·growth·roadmap·advisor | 각 가지에 `intg_uid` 내려감 → `ix_dc_v_usr_inf_intg_uid` | 0.3~0.7ms | **0.3~0.7ms** | 0.1~0.2ms |
| staff 1명 전체 70201 / 80301 / 전공조교 16098 | 세미조인의 해시 빌드측 | `org_assignment` UNIQUE·`department_staff_assignment_active`(staff_uid) → `dc_v_dept_inf_dept_code` → `ix_dc_v_usr_inf_hakbu_cd` | 32 / 51 / 111ms | **3.5 / 6.9 / 4.0ms** | 0.2ms |
| `student_list` EXISTS 세미조인(students.scope) 70201 | 교수 `/students` | 해시 세미조인 | 57ms | **3.6ms** | 0.7ms |
| `program_apply` 지원자 범위 70201 / 16098 | programs·jobs 의 applicant_scope | 동일 | 36 / 109ms | **4.1 / 4.5ms** | 0.2ms |
| bootstrap/profiles `EXISTS OR EXISTS` 70201 | 교수 부팅 | hashed SubPlan | 2.0ms | 3.7ms | 0.3ms |
| `student_uid=$1` 단독 | `notify_source_event`·seed_demo | intg_uid 내려감, 배정 전체와 조인 | 10ms | 12ms | 0.1ms |
| 상담사 `readable`(staff=상담사, 100 ids) | `academic-students` 목록 | 동일 | 0.8ms | **0.9ms** | 0.6ms |
| 뷰 전체(모든 staff) | 없음(참고) | — | 986ms | 438ms | — |
| 교수·조교 학사 목록(재학, 100행) 70201 / 80301 / 16098 | `GET /academic-students` scoped | roster CTE 안 EXISTS → 해시 세미조인 | — | **90 / 198 / 100ms** | — |
| 같은 목록 「전체」 | 〃 | 〃 | — | 196 / 335 / 188ms | — |
| 메타 70201 / 80301 / 16098 | `GET /academic-students/metadata` scoped | 〃 | — | 161 / 357 / 156ms | — |
| 상세 점조회 + 범위 | `/{identity}` | intg_uid | — | 1.5~1.8ms | — |
| 상담사 전체 학생 목록 | 불변 경로 | — | — | 1.22~1.24s | 0021 기준 1.37~1.40s(API) |

모두 `jit=off`, 2회째(웜) 값. 새 인덱스 불필요. 80301 목록의 남은 비용은 roster 쪽 `academic.usr_inf` UNION ALL 의 local 가지(NOT EXISTS 가 있는 subquery scan 이라 매개변수화되지 않아 행마다 7행 재스캔) — 0021 구조이며 목표(<500ms) 안이라 이번에 건드리지 않는다. 학사 인원이 늘거나 목표가 바뀌면 local 가지 개선이 다음 레버다.

## 4. 위험 · migration · rollback

- **잠금**: `CREATE OR REPLACE VIEW` 는 `staff_student_scope` 에 AccessExclusive 를 잡는다 → `SET LOCAL lock_timeout='5s'`(178 관례). 실패 시 재시도.
- **추가형**: 열 변경 없음, 기존 4가지 불변. 새 가지는 행을 더하기만 하므로 기존 허용이 줄지 않는다. 늘어나는 것은 교수·조교가 배정 학과 학사 학생을 보는 범위 — 사용자 확정 사항.
- **권한 확대 점검**: 범위가 넓어지면 기존 EXISTS 소비처(채용·비교과·상담·진단·통계)에서도 같은 학생이 보인다. 그 표들은 `dc.student` FK 라 서비스 이용 학생만 행이 있고, 같은 학과 서비스 학생은 이미 `org_assignment` 가지로 보이므로 실질 변화는 「배정 학과 학생인데 `dc.student.college/dept` 가 비었던 학생」 정도다(0021 이 refresh 로 정합). 의도된 확대.
- **개인정보**: 학사 상세는 활동 요약만(상담 노트·심리 기록 없음, 기존 계약). 교수·조교에게 내보내기 열지 않음.
- **rollback**(forward-only 관례, 필요 시 수동): `CREATE OR REPLACE VIEW dc.staff_student_scope AS <176 정의>; DROP VIEW dc.department_academic_student_scope; DROP VIEW dc.department_academic_grant;` — 열 동일이라 OR REPLACE 로 되돌릴 수 있다. API 는 `scoped` 분기를 끄면 이전 동작(403).
- **재실행**: migration 원장이 한 번만 적용한다. 수동 재실행 시 `CREATE VIEW` 가 실패하므로 원장 밖 재적용 금지.
- **로컬 vs 서버**: 서버 미적용. 서버 반영은 사용자 지시가 있을 때만.

## 5. JSON 호환성 테스트 항목

- 교수·조교 모드 `GET /academic-students` 항목 키 집합 = 상담사 모드(`id, studentNo, name, major, collegeName, grade, sex, sexCode, graduationMonth, gpa, academicLevel, status, studentType, star, tier, progress, hasRoadmap, hasDetail, canReadDetail, programCount, counselCount`), 최상위 `items/totalCount/page/pageSize`.
- 메타 `summary`(7키)·`options`(6배열 + `collegeMajors` 객체) 구조 동일, 값은 범위 한정.
- 상세 응답 키 불변, `optional=true` 서비스 전용 fixture 는 `null`.
- `canReadDetail` 는 교수 모드에서 항상 true(boolean).

## 6. Sol 실행 순서

1. `backend/migrations/179_staff_academic_dept_scope.sql` — rev 2 §3-1 SQL 그대로.
2. 테스트 먼저: §4-9 동일성, §4-7 dc_app, §4-1~6·10·11 (격리 DB). 이 단계에서 동일성 테스트가 실패하면 뷰를 고치지 말고 팀장·Astra 에 보고.
3. `auth.py`: `student_access` 의 허용 SQL 을 함수로 추출(동작 불변) → 기존 테스트 통과 확인.
4. `academic_students.py`: `authorize` → `scoped`; `roster_query(diagnosed, scoped)`; 목록·메타 값 앞에 uid; 상세 점조회 후 허용 함수; export scoped 403; scoped 이면 `readable` 생략·`canReadDetail=True`.
5. 프론트 `StudentRosterTable` 학사 모드(재학 기본), 부제 문구. `npx tsc -b`.
6. 격리 전체 회귀 → 기존 실패 집합 diff 0. 구현 기록 `implementation.md` 에 Astra 설계와 다르게 간 곳 명시.
7. 팀장 검증(work-order §5)으로 넘긴다.
