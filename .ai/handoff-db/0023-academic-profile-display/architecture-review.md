# 0023 — Astra architecture review

- 판정: **ASTRA_APPROVED (조건부)** — `work-order.md` **revision 2**(이 리뷰가 교정한 판), 아래 §2 필수 조건 전부를 전제로 한다. rev 1 의 SQL·API 는 방향이 맞으나 그대로는 승인하지 않는다(개인정보 범위·영구 저장, §1-2·§1-3).
- 일자: 2026-11-27. 검토자: codex-astra-db-reviewer 역할(위임 실행).
- 범위: 설계 승인. 로컬 `dreamcatch-dev-db` 에서 **트랜잭션 안 CREATE (OR REPLACE) VIEW → `SET ROLE dc_app` SELECT → EXPLAIN (ANALYZE) → ROLLBACK** 으로만 측정했다(2회: rev 1 SQL, rev 2 최종 SQL). 커밋된 DB 변경 없음 — 종료 후 새 뷰 0개, `academic_student_details` 신규 열 0개, ACL 원래 값 확인. 학생 행 값은 출력·기록하지 않았다(EXPLAIN 의 리터럴도 마스킹, 건수·계획·시간만). API 컨테이너에서는 읽기 쿼리 시간만 쟀고 롤백했다. API·프론트 구현·테스트 실행은 하지 않았다. Oracle 접속 없음.
- 코드 탐색: 이 세션에 Graft MCP 가 노출되지 않아 원본 grep 으로 호출자를 추적했다(`resolve_student` 2종·`profile_dto`·`apply_academic`·`academic_student_details` 소비처 전부).
- 이 리뷰가 고친 파일: `work-order.md`(rev 1→2, 〔rev2〕 표시, 상태 READY_FOR_SOL), `DB_SCHEMA.md`(158 문단 앞에 180 요약 1문단, 「미적용」 표시).

## 1. 검증한 사실과 교정

### 1-1. 사실 (로컬 DB, 2026-11-27)

| 확인 | 결과 | 설계 영향 |
|---|---|---|
| `CREATE OR REPLACE VIEW dc.academic_student_details`(끝에 2열) | 성공. 기존 10열 이름·타입·순서 동일, 새 열 `post_code varchar(12)`·`address varchar(400)`. ACL `{postgres=arwdDxtm, dc_app=r}` **그대로** | 추가 GRANT 불필요(①). 의존 뷰 0·참조 함수 0 |
| `SET ROLE dc_app` | 두 뷰 SELECT 성공(106,108행 / 97,715행·19,543명·5코드). 같은 역할로 `academic.dc_v_stu_cap_inf` 직접 SELECT 는 `permission denied for schema academic` | 소유자 권한으로 읽는 구조 확인(②, 178 교훈). `security_invoker` 를 켜면 깨진다 |
| 학번당 행 수 | `dc_v_usr_inf` 117,378행 중 NULL uid 524, 비NULL uid 중복 0. 학생(`0001`) 기준 `usr_inf` 중복 0. local 가지는 source 에 있으면 제외(NOT EXISTS) | DB 제약은 없다. **동기화 공개 전 차단 검사** `studentIntgUidDuplicates`·`localIntgUidCollisions`(sync_academic.py `BLOCKING_CHECKS`)가 0/1행을 보장 |
| §3-2-2 JOIN 행 수 | `dc.student ⋈ person` 23 = `… LEFT JOIN academic_student_details` 23 (매칭 23) | 행 수 불변 확인 |
| 핵심역량 원천 | CORE 만 존재(ACE1~5 각 19,543행), 학생별 정확히 5행, NULL 점수 0, 음수 0, scale 0(정수), 5축 모두 0인 학생 0. `base_dt` 전부 NULL, `dept_cd` 단일값. `(intg_uid,cap_div,dept_cd,cap_cd)` 중복은 **보고형 검사만** | API 의 「5행」 판정만으로는 중복 1건+누락 1건(5행·4코드)을 못 거른다 → 5코드 확인 추가 |
| 코드 대응 | 학사 `cap_nm`(지역형 리더역량·창의적 사고역량·실용적 융복합역량·의사소통역량·글로벌역량) ↔ `dc.core_competency`(LOCAL_LEADER·CREATIVE·CONVERGENCE·COMMUNICATION·GLOBAL, sort_order 1~5) 일치 | VALUES 고정 대응 유지(⑤) |
| 로컬 서비스 학생 | `dc.student` 23명 중 cap 5행 6명, 0행 17명. 개발 fixture(`20261231`·예시 2명)는 cap 0행 | 기존 테스트 `test_care7_test_student`·`test_competency_examples` 의 null 단언이 바뀌지 않는다 |
| 학사 값 품질 | 연락처·주소·우편번호 빈 문자열 0. 재학·휴학 중 평점 0 이 소수 존재(이수학점 0 과 대부분 겹침) | 빈 문자열→null 은 방어용으로 유지. 평점 0 은 학사 값 그대로 표시(임의 숨김 금지) |
| `/bootstrap/profiles` 비용 | API 와 같은 설정(`SET LOCAL jit=off`)에서 `profile()` 학생당 **1.78ms**(23명 41ms). 추가 점조회 학생당 **0.22ms**(왕복 포함) | +12%. 상담사 부팅의 N+1 은 기존 구조(학생당 쿼리 6~7개) — 이번 1개 추가는 수용, 배치 경로 신설 불요(④) |
| 소비처 | `programs.py`(명단 엑셀)·`survey.py`·`academic_students.py` 모두 `academic_student_details` 열을 **명시 선택** — `x.*` 없음 | 열 추가가 기존 export·스냅샷에 새지 않는다 |

### 1-2. 교정 1 — 연락처·주소를 공유 resolve 함수에 싣지 않는다

rev 1 은 `growth.resolve_student`·`jobs.resolve_student` 에 6열(GPA·이수학점·휴대폰·이메일·우편번호·주소)을 LEFT JOIN 한다. 두 함수는 growth 17곳·jobs·student_portfolio 등 30여 경로가 공유하고 교직원 요청도 지난다. 연락처가 필요한 곳은 학생 본인 GET 두 곳(`/growth/profile`·`/portfolio`)뿐이다.

rev 2: resolve 함수에는 **`academic_gpa`·`academic_credits` 두 열만**(GPA 는 `apply_academic` 이 두 resolve 경로 모두에서 필요하다 — jobs 지원 잠금·학생 포트폴리오=jobs, 교직원 대표 포트폴리오 열람=growth). 연락처는 growth.py 의 점조회 helper 하나를 **owner 일 때만** 부른다(0.04ms, 본인 GET 에만 쿼리 1개 추가). 측정상 JOIN 비용은 두 안이 같다(0.13ms vs 기준 0.04ms) — 교정 이유는 성능이 아니라 개인정보 최소 조회·영향 범위다.

### 1-3. 교정 2 — PATCH 응답의 학사 연락처가 `dc.idempotency` 에 영구 저장되는 문제

`PATCH /students/{id}/growth/profile` 은 `remember()` 로 응답 전체를 `dc.idempotency.response`(JSONB)에 저장한다. rev 1 처럼 `profile_dto` 가 owner 이면 `academic` 을 싣게 하면 **학사 휴대폰·이메일·주소가 멱등 표에 사본으로 쌓인다**(보존 정책 없음). 화면(`shared/growthStore.ts saveGrowthProfile`)은 PATCH 응답을 쓰지 않고 `refresh()` 로 다시 읽으므로, rev 2 는 PATCH 응답에서 `academic: null` 로 둔다. 재생(replay) 응답과 첫 응답의 모양도 같아진다.

### 1-4. 교정 3 — 뷰와 판정의 견고성

- 새 뷰에 `c.cap_score IS NOT NULL` — rev 1 API 의 `float(None)` 500 을 원천 차단하고 「점수 없음」을 4행→null 로 일관 처리.
- 쓰지 않는 `base_dt`(전부 NULL)·`upd_dt` 를 뷰에서 뺐다(API·화면 미사용). 필요해지면 끝에 열을 붙이는 OR REPLACE 로 충분하다.
- API 판정을 「5행 **그리고** 5코드」로. 코드 중복은 원천에서 보고형 검사뿐이다.
- `REVOKE ALL … FROM PUBLIC` 은 새 뷰에선 무해한 명시(기본 PUBLIC 권한 없음)라 유지.

### 1-5. 확인 요청 ①~⑤ 답

| # | 질문 | 답 |
|---|---|---|
| ① | OR REPLACE 로 열 추가 시 GRANT 유지 | 유지된다(실측 ACL 동일). 롤백은 DROP→176 정의 CREATE→GRANT 가 필요(열 삭제는 OR REPLACE 불가) |
| ② | `SET ROLE dc_app` 두 뷰 SELECT | 성공. academic 직접은 거부 — 소유자 권한 경로 확인 |
| ③ | 점조회 계획 | details: `ix_dc_v_usr_inf_intg_uid` + local `local_usr_inf_pkey`(0.04~0.06ms). cap: `ix_dc_v_stu_cap_inf_intg_uid` 비트맵(0.055~0.074ms). generic plan(`$1`)도 동일 인덱스 |
| ④ | bootstrap N+1 비용 | 학생당 +0.22ms(+12%). 수용 |
| ⑤ | VALUES vs 코드표 열 | VALUES. `dc.core_competency` 는 FK 2개가 참조하는 우리 코드표 — 학사 원천 코드를 섞지 않는다. 대응이 바뀌면 같은 열로 OR REPLACE |

## 2. 필수 조건 (승인 전제)

1. 180 은 rev 2 §3-1 SQL 그대로(뷰 이름·열 3개·`cap_score IS NOT NULL`·GRANT·`lock_timeout` 포함). `security_invoker` 를 켜지 않는다. 176·179 뷰와 `sync_academic.py` 는 수정하지 않는다.
2. 학사 연락처·주소는 **(a) 학생 본인 GET `/growth/profile`·`/portfolio` 의 `profile.academic`** 과 **(b) 범위 검사를 통과한 `GET /academic-students/{id}`** 에서만 나간다. 공유 resolve 함수·`ROSTER` CTE·목록·메타·export·PATCH 응답·`dc.idempotency`·이벤트/스냅샷 어디에도 넣지 않는다.
3. 상세의 연락처 조회는 범위 검사·`optional` 분기 **뒤**의 기존 `foreigner_code` 점조회를 넓히는 방식(추가 쿼리 없음).
4. `profile()` 학사 분기는 「5행·5코드」일 때만 `ACADEMIC`. 개발 fixture 분기 순서·조건 불변.
5. 계약 테스트 rev 2 §4 의 1(dc_app)·3(중복/NULL)·5(idempotency)·6(export 키 불변)·9(JSON 키)를 반드시 둔다. 하나라도 없으면 미승인으로 본다.
6. 팀장 검증 §5 의 `/bootstrap/profiles` 전후 시간 비교와 `dc_app` 계정 로컬 Docker 실행을 생략하지 않는다.

## 3. 예상 주요 query 와 인덱스

| 모양 | 사용처 | 인덱스·계획 | 실측(웜, jit=off) |
|---|---|---|---|
| `academic_student_core_competency WHERE student_uid=$1` | `students.profile()`(`/students/{id}`·`/bootstrap/profiles` 학생마다) | `ix_dc_v_stu_cap_inf_intg_uid` 비트맵 → VALUES·core_competency(5행) 해시 | 0.055~0.074ms(있음·없음·학사 전용 학생 모두) |
| `academic_student_details WHERE intg_uid=$1`(4~6열) | 상세 연락처, growth 연락처 helper | `ix_dc_v_usr_inf_intg_uid` + `local_usr_inf_pkey` | 0.04~0.06ms (generic 0.076ms) |
| resolve: `student ⋈ person LEFT JOIN details`(2열) | growth·jobs resolve 전 경로 | 바깥 1행 → Nested Loop, source 가지 인덱스 매개변수화, local 가지 7행 재스캔 | 0.13~0.19ms (기준 0.04ms) |
| 대안: 스칼라 서브쿼리 | (참고) | 두 가지 모두 매개변수화 | 0.10~0.12ms — JOIN 과 차이 미미해 rev 1 모양 유지 |
| `/bootstrap/profiles` 루프 | 상담사 부팅 | 기존 학생당 6~7 쿼리 | 학생당 1.78ms → 약 2.0ms |

새 인덱스 불필요. local 가지의 비매개변수화는 0021 구조(0022 §3 에도 기록)로 7행이라 무시한다.

참고(이번 범위 밖): `dc.student_gpa()` 는 정책표가 비어 있어도 추정 비용 1.3e7 이라 **JIT 가 켜진 세션에서 호출당 ~700ms**(컴파일)다. 요청 경로는 `db.connection()` 이 `SET LOCAL jit=off` 라 0.28ms 지만, 스크립트·배치에서 `profile()` 을 부르면 그대로 맞는다.

## 4. 위험 · migration · rollback

- **잠금**: `CREATE OR REPLACE VIEW` 는 `academic_student_details` 에 AccessExclusive — 명단 엑셀·설문·학사 목록 읽기가 잠깐 대기. `SET LOCAL lock_timeout='5s'`(178·179 관례), 실패 시 재시도.
- **추가형**: 기존 열 불변, 새 뷰는 읽기 전용. 기존 소비처는 열을 명시 선택하므로 영향 없음.
- **권한·노출**: 연락처·주소의 새 노출은 (a) 본인 (b) `students.1` 메뉴 보유 교직원(상담사·심리상담사·관리자)과 0022 범위 안 교수·조교의 상세 1건 조회 — 사용자 확정 범위. 대량 경로(목록·export)는 열지 않는다. 핵심역량 원점수는 기존 프로필 접근 검사를 그대로 따른다.
- **원천 무결성**: 학번당 1행은 동기화 차단 검사에 의존한다(DB 제약 아님). 핵심역량 키 중복은 보고형이라 API 가 5코드로 방어한다. 중복이 생기면 그 학생 그래프가 잠길 뿐 오답을 그리지 않는다.
- **rollback**(forward-only 관례, 필요 시 수동, 순서 중요): API 를 먼저 되돌림 → `DROP VIEW dc.academic_student_core_competency;` → `DROP VIEW dc.academic_student_details;` → 176 정의 `CREATE VIEW` → `GRANT SELECT ON dc.academic_student_details TO dc_app;`. DROP 직전 의존 뷰 0 확인(180 시점 0).
- **재실행**: migration 원장이 한 번만 적용한다. 수동 재실행 시 `CREATE VIEW` 가 실패하므로 원장 밖 재적용 금지.
- **로컬 vs 서버**: 서버 미적용. 서버 반영은 사용자 지시가 있을 때만.

### 비차단 관찰 (팀장 판단)

1. **GPA 두 출처**: `/students/{id}` 의 `gpa` 는 `dc.student_gpa()`(정책표 비어 있음 → `detail.gpa`)라 실학생은 null 이다. 교직원 서비스 학생 상세(`StudentDetailView` 「학점」)는 이 값을 쓴다. 이번 rev 2 로 마이페이지·포트폴리오 문서는 학사 평점이 되므로, 같은 학생이 화면마다 다른 GPA 를 볼 수 있다. 맞추려면 `student_gpa()` 의 `legacy_detail` 분기를 학사 평점으로 대체하는 별도 작업(함수 변경 = 새 migration)이 필요하다.
2. **개인정보 열람 기록**: 학사 상세의 연락처·주소 열람은 기록이 남지 않는다(명단 엑셀은 `admin_event` 에 건수 기록, 158). 접속기록 요구가 있으면 `DB.md` §9 후보.
3. 학사 평점 0(재학·휴학 일부)은 「성적 미산출」일 수 있으나 학사 값이므로 그대로 표시한다. 의미 확인이 필요하면 학사 담당에 묻는다.

## 5. JSON 호환성 테스트 항목

- `GET /students/{id}`: 키 집합 불변. `coreCompetencyScores` 는 null 또는 5키(`LOCAL_LEADER·CREATIVE·CONVERGENCE·COMMUNICATION·GLOBAL`) number 객체, `coreCompetencySource ∈ {null,'DEVELOPMENT_CARE7_TEST','ACADEMIC'}`.
- `/bootstrap/profiles`: 같은 학생이 `/students/{id}` 와 같은 `coreCompetency*` 값.
- `GET /students/{id}/growth/profile`·`/portfolio` `profile`: 기존 키 + `credits`(number|null) + `academic`(`{mobile,email,postCode,address}` 각 string|null, 또는 null). `gpa` 는 string|null. 교직원 요청 `academic` = null, 자기입력 `email`·`phone` 교직원 null 불변.
- `PATCH …/growth/profile` 응답: 같은 키 집합, `academic` = null.
- `GET /academic-students/{id}`: 기존 키 + `mobile·email·postCode·address`(string|null). 목록 항목 키 집합은 0022 §5 와 동일(연락처 없음), export 열 불변.
- 회사 제출용 포트폴리오 문서 `education` 재학 항목 `fields.gpa` = 학사 평점 문자열(없으면 `''`).

## 6. Sol 실행 순서

1. `backend/migrations/180_academic_profile_display.sql` — rev 2 §3-1 SQL 그대로. 격리 DB 에 적용.
2. 테스트 먼저(rev 2 §4): dc_app·열 계약(1) → 핵심역량 분기(2·3) → growth/portfolio 본인·교직원(4·5·7) → 학사 상세·export(6) → 빈 문자열(8) → JSON 키(9).
3. `students.profile()` 학사 분기(5행·5코드).
4. `growth.resolve_student`·`jobs.resolve_student` 에 2열 LEFT JOIN. growth.py 연락처 helper + `profile_dto(student,row,owner,contact=None)`; GET 두 곳만 owner 일 때 contact 전달, PATCH 는 전달하지 않음.
5. `portfolio_document.apply_academic` GPA 우선순위.
6. `academic_students.detail` 의 `foreigner_code` 점조회를 5열로 넓혀 응답 4키 추가. `ROSTER` 불변.
7. 프론트(rev 2 §3-3), `npx tsc -b`.
8. 격리 전체 회귀 → 기존 실패 집합 diff 0. 구현 기록 `implementation.md` 에 Astra 설계와 다르게 간 곳 명시.
9. 팀장 검증(rev 2 §5)으로 넘긴다.
