# 0026 작업지시서 — 핵심역량 교과(학사) + 비교과(이뤄드림) 합산 (rev2, Astra 교정 2026-11-27 · rev1 팀장 2026-11-27)

상태: **ASTRA_APPROVED (조건부)** — 조건은 `architecture-review.md` §3. 승인 revision = **rev2**(이 문서).
Sol 은 rev2 §3 을 그대로 구현한다. 183 은 격리 테스트 DB 에서 먼저 검증한 뒤 로컬에 적용한다. 업체 MySQL 접속은 §3-3 의 dry-run 1회부터 사용자에게 알린 뒤 한다.

> rev2 표기: 〔rev2〕 = Astra 가 추가·교정한 곳. 교정 이유는 `architecture-review.md` §2.

## 1. 사용자 지시 (원문)

> 학사 CORE는 이뤄드림 - 비교과프로그램에 있는 5대핵심역량과 전산원에서 준 5대 핵심역량은 같은 의미야
> 비교과 프로그램을 통해 얻는거랑 교과목을 들어서 얻는 방식의 차이일뿐이지 그래서 결국 뷰 테이블 2종류를 합쳐서 하나의 점수로 우리 화면에 뿌려줘야 하는거야 이해했지? 그래서 우선 핵심역량 비교과에 있는 학생들 정보만으로도 확인 가능할거같아

해석:
- 5대 핵심역량은 하나다. 교과 이수분은 전산원 `DC_V_STU_CAP_INF`(CORE ACE1~5), 비교과 이수분은 이뤄드림(업체) `VW_ECO_ROADMAP_APPLICATION.skill_scores` 다.
- 화면에는 축마다 **교과 점수 + 비교과 점수 = 한 점수**를 보인다. 환산·백분위·100점 정규화는 하지 않는다(0023 사용자 확정 유지).
- 검증은 비교과 점수가 있는 학생으로 한다. 교과 CORE 보유자는 2021학번 이하뿐이고 검증용 학생 2명은 교과 CORE 행이 없다.

## 2. 확인한 사실

| 항목 | 사실 | 근거 |
|---|---|---|
| 교과 점수 | `dc.academic_student_core_competency`(180) = `academic.dc_v_stu_cap_inf` CORE, ACE1~5 → `LOCAL_LEADER·CREATIVE·CONVERGENCE·COMMUNICATION·GLOBAL` 고정 대응(VALUES). 원점수 누계(0~147), max 없음. **점수 NULL 행은 뷰에서 빠진다** | `backend/migrations/180_academic_profile_display.sql` |
| 교과 점수 범위 | 점수 보유자 = 2017~2021학년도 학부 이수분(2022학번~ 0명). 2022 이후 교과분은 전산원 요청 중 | 메모리·0023 실사 |
| 화면 읽기 | `students.py` `profile()` 이 5행·5코드일 때만 `coreCompetencyScores` + `coreCompetencySource='ACADEMIC'`. 그 앞은 개발 fixture(`DEVELOPMENT_CARE7_TEST`), 뒤는 065 개발 경로 | `backend/app/students.py:63-94` |
| 〔rev2〕 `profile()` 호출 빈도 | `GET /students/{id}` 와 `GET /bootstrap/profiles` 의 **학생마다** 호출(학생 로그인 = 1명, 상담사 = `dc.student` 전원 — 기존 N+1). 0023 실측: 학생당 1.78ms, 핵심역량 점조회 0.055~0.074ms | graft `profile` 호출자 · 0023 architecture-review |
| 〔rev2〕 프론트 분기 | `src_v2/data/competency.ts:42` 와 `src_v2/pages/Main.tsx:157` 이 **문자열 `'ACADEMIC'` 과 같을 때만** 원점수 모드(목표선 없음·본인 최고 축 기준)로 그린다. 다른 값이면 0~100 개발 모드(목표선 75·갭)로 **조용히** 떨어진다. 타입이 `string \| null` 이라 tsc 가 못 잡는다. 교직원 `GapTab` 은 `target == null` 로 판단해 자동 반영 | 원본 |
| 표시 문구 | 마이페이지 「학사 기록(교과·비교과 이수 누계)에서 가져옵니다.」·빈 상태 「학사 핵심역량 점수가 아직 없습니다」, 메인 범례 「학사 핵심역량 원점수 · …」, 교직원 `GapTab` 「학사 핵심역량 원점수(교과·비교과 이수 누계)입니다. …」. 라운지는 「비교과 프로그램과 수강 강의활동으로 쌓은 역량입니다.」(그대로 맞음) | `Portfolio.tsx:337,341` · `Main.tsx:157` · `StudentDetailView.tsx:596` · `AiLounge.tsx:114` |
| 학번 ↔ uid | 학사 학생은 `academic.usr_inf.intg_uid` 가 학번 그 자체(`student_login_source.student_no = COALESCE(fixture 학번, intg_uid)`) | `dc.student_login_source`(176) |
| 〔rev2〕 테스트 계정 3종 | ① `origin='local'`(`academic.local_usr_inf`, 실학생 값 복사본 — 182 가 사진을 막은 이유) ② **`dc.student_login_override`** — 실학생 학사 행 위에 이름·소속만 바꾼 로그인(060 `20180001`, `CORE_COMPETENCY_DB.md` `20261231`). 학사 uid 가 실학생 것이라 uid 로 붙이면 **그 실학생 점수가 붙는다** ③ `dc.fixture_student_login`(fixture uid ↔ 서비스 학번). `student_login_source.local_override = (override OR origin='local')` | 059·060·063·176·182 |
| 〔rev2〕 학사 학생 유일성 | `dc_v_usr_inf` 에 PK 없음. 단 `user_ty_cd='0001'` intg_uid 중복과 local 충돌은 동기화 **공개 전 차단 검사**(`studentIntgUidDuplicates`·`localIntgUidCollisions`) | `sync_academic.py:182-187` |
| 업체 뷰 명세 | `VW_ECO_ROADMAP_APPLICATION`(신청서 1행, 키 `application_id`): `student_id`(학번)·`program_id`·`topic_id`·`application_status_code`(WRITING/WAITING/PENDING/CONFIRMED)·`is_completed`·`completion_date`·`skill_scores`·`updated_at`. `skill_scores` = `[{"essential":역량번호,"title":"역량명","child":하위역량번호,"point":지급점수}]`, **지급 이력이 있는 신청서만 값, 없으면 NULL**. 연동 범위 = 2026-01-01 이후 등록 프로그램 | `docs/program_view.xlsx`(Git 제외) |
| 업체 실측 (2026-11-27 사용자 승인 1회 읽기) | MySQL 5.7, 스키마 `coursemos`. 신청 20,275행/4,958명, `skill_scores` 있음 13,419건/4,222명. essential 1~5 = 지역형 리더·창의적 사고·실용적 융복합·의사소통·글로벌 → ACE1~5 1:1, child 전부 0, 건당 point 0.1~16. 〔rev2〕 상태×완료 교차 건수·title 정확 문자열·point 소수 자릿수는 **미측정** | 메모리 |
| 우리 비교과 배점 구조 | 065 `dc.core_competency_allocation*` 는 **우리 `dc.program` 수료**용 배점 구조(현재 배점 0건). 이뤄드림 실적과는 별개 | `docs/CORE_COMPETENCY_DB.md` |
| 학사 수집 패턴 | `backend/scripts/sync_academic.py` — 호스트에서 수동 실행, 허용 목록 SELECT 만, 비밀번호는 **파일 인자**, 목적지 루프백 고정·`postgres`. 〔rev2〕 세션 advisory lock `480093`, 스테이징 → 검증 → **한 트랜잭션 DELETE+INSERT**(MVCC — 읽기는 이전 세대), 행 수 20% 초과 감소 시 중단, 공개 후 ANALYZE, `academic.sync_run` 에 집계만 | 원본 |
| 의존성 | backend venv 에 pymysql 없음. 학사 수집 전용 `backend/requirements-academic.txt`(JPype1==1.7.1) 가 있다 | 확인 |
| 〔rev2〕 권한 기본값 | `ALTER DEFAULT PRIVILEGES` 없음 — 새 스키마·테이블은 `dc_app` 에 자동 부여되지 않는다. 180·181·182 는 `security_invoker` 없이 소유자(`postgres`) 권한으로 `academic` 을 읽는다 | migrations grep |
| 〔rev2〕 스키마 점검 도구 | `backend/scripts/release_parity.py`·`audit_schema.py` 가 스키마를 `('dc','academic')` 로 **하드코딩** — `eco` 를 추가하지 않으면 parity·audit 에서 보이지 않는다 | 원본 |
| 〔rev2〕 DB | PostgreSQL 17(고정 digest). numeric `NaN` 은 `Infinity` 보다 크게 정렬된다 | `docs/POSTGRES_SETUP.md` |
| 〔rev2〕 계약 테스트 | `test_academic_profile_display.py:177,188,190` 이 `'ACADEMIC'` 과 허용 집합 `(None,'DEVELOPMENT_CARE7_TEST','ACADEMIC')` 를 단언한다 — 의도된 계약 변경으로 함께 고친다 | 원본 |

## 3. 설계 (rev2 — Astra 승인본)

### 3-1. 원천 사본 — migration `183_core_competency_program_merge.sql`

〔rev2〕 rev1 의 jsonb 단일 테이블을 **원값 테이블 + 지급 행 테이블**로 나눈다. 화면 읽기는 jsonb 를 파싱하지 않는다 — 잘못된 원소가 읽기 시점 캐스트 오류(= 마이페이지·상담사 부팅 500)가 되지 않고 수집 시점에 막힌다.

```sql
-- 0026: 핵심역량 교과(학사 CORE) + 비교과(이뤄드림) 합산(사용자 확정 2026-11-27). Astra 조건부 승인(0026 architecture-review).
-- 롤백(forward-only 관례, 필요 시 수동, 순서 중요. CASCADE 금지):
--   ① API 를 dc.academic_student_core_competency(180) 읽기·coreCompetencySource='ACADEMIC' 로 되돌리고 프론트 문구를 되돌린다.
--   ② DROP VIEW dc.student_core_competency_combined;
--   ③ DROP TABLE eco.roadmap_application_skill_point; DROP TABLE eco.roadmap_application; DROP TABLE eco.sync_run; DROP SCHEMA eco;
--   업체 사본은 업체 DB 가 원천이라 재수집으로 복구된다. 180 뷰·학사 사본은 건드리지 않는다.
SET LOCAL lock_timeout = '5s';

CREATE SCHEMA eco;
REVOKE ALL ON SCHEMA eco FROM PUBLIC;
COMMENT ON SCHEMA eco IS
 'Vendor (Iruodream) read-only copy. Written only by backend/scripts/sync_eco_competency.py as the DB owner. dc_app has no privilege.';

-- 수집 실행 기록. 집계만(학번·이름·점수 개별값·접속 정보 금지). append-only.
CREATE TABLE eco.sync_run (
  id uuid PRIMARY KEY,
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('PUBLISHED', 'ABORTED')),
  report jsonb NOT NULL
);
CREATE TRIGGER eco_sync_run_immutable BEFORE UPDATE OR DELETE ON eco.sync_run
  FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();

-- 업체 신청서 중 skill_scores 가 있는 행의 원값(감사·재처리용). 키 = 업체 application_id.
CREATE TABLE eco.roadmap_application (
  application_id bigint PRIMARY KEY,
  student_id text NOT NULL CHECK (student_id ~ '^\S{1,40}$'),
  program_id bigint,
  topic_id bigint,
  application_status_code text,
  is_completed boolean,
  completion_date timestamp,
  skill_scores jsonb NOT NULL CHECK (jsonb_typeof(skill_scores) = 'array'),
  source_updated_at timestamp,
  sync_run_id uuid NOT NULL REFERENCES eco.sync_run (id),
  UNIQUE (application_id, student_id)
);

-- skill_scores 원소 1개 = 1행(수집기가 검증 후 펼친다). 화면 합계는 이 표만 읽는다.
CREATE TABLE eco.roadmap_application_skill_point (
  application_id bigint NOT NULL,
  seq smallint NOT NULL CHECK (seq >= 1),            -- 배열 위치(1부터)
  student_id text NOT NULL,
  essential smallint NOT NULL CHECK (essential BETWEEN 1 AND 5),
  child integer NOT NULL CHECK (child = 0),          -- 하위역량 의미가 생기면 설계부터 다시
  point numeric NOT NULL CHECK (point >= 0 AND point < 'Infinity'),   -- NaN 은 Infinity 보다 커서 함께 걸러진다
  PRIMARY KEY (application_id, seq),
  FOREIGN KEY (application_id, student_id) REFERENCES eco.roadmap_application (application_id, student_id)
);
-- 프로필 점조회: (student_id, essential) 등치 + point 합 → index-only.
CREATE INDEX ix_eco_skill_point_student ON eco.roadmap_application_skill_point (student_id, essential) INCLUDE (point);
```

- 〔rev2〕 `eco` 분리 확정(Q1). 학사 수집기의 `academic` 전체 교체·차단 검사·`sync_run` 과 섞지 않는다.
- 〔rev2〕 `application_status_code`·`is_completed` 는 저장만 하고 화면 합계 조건에는 쓰지 않는다(Q3). 바꿔야 하면 뷰만 OR REPLACE.
- 〔rev2〕 rev1 의 `synced_at` 은 `sync_run_id` 로 대체(실행 기록과 연결, 시각은 `sync_run`).

### 3-2. 합산 뷰 — 같은 183

```sql
-- 화면 점수 = 교과(180 뷰) + 비교과(업체 지급 합계). 환산·정규화·목표선 없음.
-- 대상 = 학사 원본(dc_v_usr_inf, 즉 origin='source') 학생 중 서비스 로그인이 재정의되지 않은 사람.
--   local·override·fixture 계정은 실학생 값을 받지 않는다(182 사진과 같은 원칙, override·fixture 까지 확장).
-- 교과 행이 있는데 5행·5코드가 아니면(부분·중복·NULL) 그 학생은 행을 내지 않는다 — 부분 합을 전체 점수로 보이지 않는다.
-- 두 원천 모두 없으면 행 없음. 한쪽이라도 있으면 5개 축 전부(없는 축 0).
-- 점조회 전용(WHERE student_uid = $1). CTE 를 쓰지 않는다(두 번 참조되면 물질화되어 전원을 계산한다).
CREATE VIEW dc.student_core_competency_combined AS
SELECT u.intg_uid AS student_uid, m.code AS competency_code,
       a.score AS academic_score, p.score AS program_score,
       COALESCE(a.score, 0) + COALESCE(p.score, 0) AS score
FROM academic.dc_v_usr_inf u
CROSS JOIN LATERAL (SELECT count(*) AS n, count(DISTINCT c.competency_code) AS codes
                    FROM dc.academic_student_core_competency c WHERE c.student_uid = u.intg_uid) av
CROSS JOIN LATERAL (SELECT EXISTS (SELECT 1 FROM eco.roadmap_application_skill_point q
                                   WHERE q.student_id = u.intg_uid) AS has) pv
CROSS JOIN (VALUES (1::smallint, 'LOCAL_LEADER'), (2::smallint, 'CREATIVE'), (3::smallint, 'CONVERGENCE'),
                   (4::smallint, 'COMMUNICATION'), (5::smallint, 'GLOBAL')) m(essential, code)
JOIN dc.core_competency k ON k.code = m.code
LEFT JOIN LATERAL (SELECT c.score FROM dc.academic_student_core_competency c
                   WHERE c.student_uid = u.intg_uid AND c.competency_code = m.code) a ON true
LEFT JOIN LATERAL (SELECT sum(q.point) AS score FROM eco.roadmap_application_skill_point q
                   WHERE q.student_id = u.intg_uid AND q.essential = m.essential) p ON true
WHERE u.user_ty_cd = '0001'
  AND NOT EXISTS (SELECT 1 FROM dc.student_login_override o WHERE o.intg_uid = u.intg_uid)
  AND NOT EXISTS (SELECT 1 FROM dc.fixture_student_login f WHERE f.student_uid = u.intg_uid)
  AND (av.n > 0 OR pv.has)
  AND (av.n = 0 OR (av.n = 5 AND av.codes = 5));
COMMENT ON VIEW dc.student_core_competency_combined IS
 'Core competency raw score = academic CORE (180 view) + vendor program points. Point lookup by student_uid only. API must apply student access scope.';
-- security_invoker 는 켜지 않는다 — 소유자 권한으로 academic·eco 를 읽는다(dc_app 은 두 스키마 권한 없음, 176·180).
REVOKE ALL ON dc.student_core_competency_combined FROM PUBLIC;
GRANT SELECT ON dc.student_core_competency_combined TO dc_app;
```

- 〔rev2〕 교과 부분은 180 뷰를 **재사용**한다(ACE 대응·NULL 제외를 한 곳에만 둔다). 원천 이상 판정(5행·5코드)도 뷰로 옮긴다(Q4). API 는 방어로 5행·5코드만 다시 확인한다.
- 〔rev2〕 rev1 「교과 이상이면 교과 부분을 쓰지 않는다」 → **학생 전체를 내지 않는다**로 교정. 교과를 빼고 비교과만 보이면 부분 합이 「교과+비교과」로 표시된다(`CORE_COMPETENCY_DB.md` 「부분 합계를 전체 점수로 제공하지 않는다」).
- 〔rev2〕 대상 학생은 `academic.usr_inf` 가 아니라 `academic.dc_v_usr_inf`(원본)만. override·fixture 도 제외(rev1 은 local 만 고려).
- 〔rev2〕 essential→코드 대응은 뷰의 VALUES(180 과 같은 방식, 우리 코드표 `sort_order` 에 업체 번호를 섞지 않는다). 대응이 바뀌면 같은 열로 OR REPLACE.
- 〔rev2〕 **동작 변화**: override 계정(`20180001` 등)은 지금 180 경로로 실학생 교과 CORE 가 보일 수 있으나, 183 이후 보이지 않는다. 의도된 변화다(사용자 확인 사항 D1).
- 180 뷰는 지우지 않는다(합산 뷰가 의존, 롤백 경로).

### 3-3. 수집기 — `backend/scripts/sync_eco_competency.py`

- 호스트에서 수동 실행(학사 수집기와 같은 운영). 의존성은 `backend/requirements-academic.txt` 에 `PyMySQL==1.1.1` 고정(런타임 API 이미지에는 넣지 않음).
- 〔rev2〕 **모드**: 기본 `--dry-run`(업체 읽기·검증·보고만, PG 쓰기 0). 공개는 `--publish` 를 명시해야 한다. 첫 접속은 dry-run 이며 그 보고(§3-3 출력)로 title 정확 문자열·소수 자릿수·상태 교차 건수를 확정한 뒤 공개한다.
- 접속 정보: 〔rev2〕 `--vendor-env-file <경로>`(기본 `.env.local`)에서 `pro_ip`(host:port)·`pro_id`·`pro_pw` **세 키만** 직접 파싱한다. `os.environ` 에 넣지 않고, 명령줄 인자로 비밀번호를 받지 않는다. PG 는 학사 수집기와 같이 루프백·`postgres`·`--pg-password-file`. **값을 출력·로그·예외 메시지·`sync_run`·커밋에 남기지 않는다.** 〔rev2〕 오류는 `type(e).__name__` 와 정수 errno 만 남긴다 — `str(e)`/traceback 금지(pymysql 접속 오류 문자열에 호스트가 들어간다). 접속 실패 시 재시도하지 않는다.
- 업체 쪽: 〔rev2〕 고정 문 목록만 실행 — `SET SESSION max_execution_time = 60000`, `START TRANSACTION READ ONLY`, 아래 SELECT 1개, `COMMIT`. pymysql `connect_timeout=5`·`read_timeout=120`·`write_timeout=10`·`charset='utf8mb4'`·`autocommit=False`. 쓰기·DDL·`SHOW`·`information_schema`·다른 뷰 조회 금지.
  `SELECT application_id,student_id,program_id,topic_id,application_status_code,is_completed,completion_date,skill_scores,updated_at FROM VW_ECO_ROADMAP_APPLICATION WHERE skill_scores IS NOT NULL`
- 검증(하나라도 어기면 **전체 중단, 기존 사본 유지**, `ABORTED` 기록):
  - 〔rev2〕 `skill_scores` 는 str/bytes(UTF-8 strict) → `json.loads(..., parse_float=Decimal, parse_constant=<예외>)`. `NaN`/`Infinity` 토큰 거부(파이썬 기본은 받아들인다).
  - 최상위 JSON 배열. 원소는 객체이고 키가 정확히 `{essential,title,child,point}`(〔rev2〕 누락·추가 키 = 스키마 변화 → 중단).
  - `essential` 은 int(bool 제외) 1~5, `child` 는 int(bool 제외) == 0, `point` 는 int/Decimal(bool·str 제외) 유한·0 이상.
  - `title` 은 essential 번호별 기대 문자열과 **정확히** 일치(이름은 검증용, 대응은 번호). 기대 문자열은 dry-run 보고의 실제 값으로 스크립트 상수에 고정(추측 금지).
  - `application_id` int·중복 없음. 빈 배열 `[]` 은 허용(원값만 저장, 지급 행 0) — 건수 보고.
  - 〔rev2〕 `student_id` 가 `^\S{1,40}$` 가 아니면(공백 포함·빈 값) 그 행만 **제외하고 건수 보고**(자르기·trim 금지, 어차피 학사와 매칭 불가).
- 반영(`--publish`): 〔rev2〕 확정 방식 —
  1. 세션 `pg_try_advisory_lock(hashtextextended('eco-competency-sync', 0))` 실패 시 즉시 종료(동시 실행 금지). 학사 수집기 lock(480093)과는 별개.
  2. 하한: 현재 `eco.roadmap_application` 행이 있고 새 유효 행 수 < 현재 × 0.8 이면 중단(학사 수집기와 같은 20%). 새 유효 행 0 이면 현재 행이 있을 때 항상 중단.
  3. 한 트랜잭션: `SET LOCAL lock_timeout='10s'`·`statement_timeout='60s'` → `eco.sync_run`(PUBLISHED, 집계 report) INSERT → `DELETE FROM eco.roadmap_application_skill_point` → `DELETE FROM eco.roadmap_application` → 두 표 COPY → 두 표 count 가 기대값과 같은지 확인(다르면 ROLLBACK). `TRUNCATE` 금지(AccessExclusive 로 마이페이지 읽기를 막는다).
  4. 커밋 후 autocommit 으로 `ANALYZE eco.roadmap_application, eco.roadmap_application_skill_point`.
  5. 중단 시 별도 autocommit 으로 `ABORTED` 행(분류 코드·건수만).
- 출력·`sync_run.report`(집계만): 업체 행 수·학생 수, 제외 행 수(학번 형식), 빈 배열 수, 원소 수, essential 별 (원소 수·point 합·최소·최대·최대 소수 자릿수), distinct (essential,title) 와 건수(dry-run 만 title 문자열 출력), `application_status_code × is_completed` 교차 건수, 학사 원본 매칭 학생 수·미매칭 학생 수, override/fixture 로 제외될 학생 수, 같은 신청서 안 essential 중복 건수. **학번·이름·학생별 점수는 출력하지 않는다.**

### 3-4. API·화면

- `students.py` `profile()`: 〔rev2〕 개발 fixture 경로 다음, 065 개발 경로 앞에서 180 읽기를 아래로 바꾼다.
  ```python
  combined=conn.execute('SELECT competency_code,score FROM dc.student_core_competency_combined WHERE student_uid=%s',
                        (row['intg_uid'],)).fetchall()
  combined_scores={r['competency_code']:float(r['score']) for r in combined}
  if len(combined)==5 and len(combined_scores)==5:
      data['coreCompetencyScores']=combined_scores
      data['coreCompetencySource']='ACADEMIC_PROGRAM'
      return data
  ```
  쿼리 수는 그대로 1개(추가 왕복 0). 응답 키 집합 불변. `academic_score`·`program_score` 는 응답에 내지 않는다(사용자 「하나의 점수」).
- 〔rev2〕 `coreCompetencySource` 새 값 = **`'ACADEMIC_PROGRAM'`**(합산 뷰에서 온 원점수 — 어느 원천이 있는지와 무관). API 는 더 이상 `'ACADEMIC'` 을 내지 않는다.
- 〔rev2〕 프론트 원점수 판정 단일화: `src_v2/data/competency.ts` 에 `isRawCompetencySource(source)`(`'ACADEMIC'`·`'ACADEMIC_PROGRAM'` → true, 옛 값은 배포 전환 중 캐시 대비)를 export 하고, `competency.ts:42` 와 `Main.tsx:157` 의 `=== 'ACADEMIC'` 리터럴을 이 함수로 바꾼다. 다른 곳에 리터럴 비교를 새로 만들지 않는다.
- 교직원 학생상세: `GET /students/{id}` → 같은 `profile()` 이라 자동 반영(graft 확인: 호출자 `profiles`·`student` 둘뿐). `GapTab` 은 `target == null` 판정이라 코드 변경 없이 원점수 모드.
- 문구(합산이라는 사실만, 산식 노출 없음):
  - 마이페이지 출처: 「학사 교과 이수와 이뤄드림 비교과 이수 기록을 합산합니다.」 빈 상태: 「핵심역량 점수가 아직 없습니다」.
  - 메인 범례: 「교과·비교과 이수 누계 원점수 · 그래프는 내 가장 높은 역량 기준」.
  - 교직원 `GapTab` raw 설명: 「교과(학사)·비교과(이뤄드림) 이수 누계를 합한 원점수입니다. 그래프는 학생의 가장 높은 역량을 기준으로 그립니다.」
  - 라운지 문구는 그대로.
- 교과·비교과 내역 분리 표시, 프로그램별 목록은 이번 범위 아님.
- 〔rev2〕 `backend/scripts/release_parity.py`·`audit_schema.py` 의 스키마 목록에 `'eco'` 추가.
- 〔rev2〕 문서: `docs/CORE_COMPETENCY_DB.md` 에 「이뤄드림 비교과 합산(183)」 절(원천·수집·대상 제외 규칙·롤백), `DB_SCHEMA.md` 183 항목 확정, `DB.md` §9 에 D2~D4 미결 등록.

### 3-5. 범위 밖

- 우리 `dc.program` 수료 → 065 배점 연결(이뤄드림이 운영 중인 동안 이중 집계 위험 — 별도 결정).
- 업체 `VW_ECO_ROADMAP_PROGRAM_TOPIC.essential_skills`(비율) 수집.
- 2022 이후 교과 CORE(전산원 회신 대기), 전공역량.
- 자동 주기 실행·서버 배포(서버 DB 의 `eco` 는 빈 채로 남는다 — 서버 배포 지시가 있을 때 별도).
- 상담사 부팅의 학생별 N+1(`profile()` 전체) 일괄화 — 기존 문제, 권고만.

## 4. Astra 답변 (rev1 질문)

1. **스키마**: `eco` 분리. 소유자·수집기·교체 주기·검증 규칙이 `academic` 과 다르고, 학사 수집기의 차단 검사·`sync_run` 의미와 섞이면 안 된다. `REVOKE ALL ON SCHEMA eco FROM PUBLIC`, `dc_app` 권한 없음, 기본 권한 설정도 없음.
2. **저장 형태**: 둘 다 — 원값 jsonb(`eco.roadmap_application`, 감사·재처리) + 펼친 지급 행(`eco.roadmap_application_skill_point`, 화면 합계). 검증은 수집기(1차)와 CHECK(2차) 두 곳. 읽기 경로에서 jsonb 파싱을 없애 런타임 캐스트 오류를 원천 차단하고 `(student_id, essential) INCLUDE (point)` index-only 합산을 쓴다. 규모(≈13k 신청·수만 원소)상 이중 저장 비용은 무시할 수준.
3. **인정 조건**: 업체 명세 「지급 = 인정」을 따른다 — `skill_scores` 가 있으면 인정. 상태·완료 여부로 다시 판정하지 않는다(외부 확정 결과를 재판정하지 않는 프로젝트 원칙). 단 dry-run 보고의 `status × is_completed` 교차에서 CONFIRMED·완료가 아닌 지급 행이 1건이라도 있으면 화면 검증 전에 사용자에게 묻는다(D2). 조건이 바뀌면 뷰만 OR REPLACE.
4. **5행 규칙·이상 처리 위치**: 뷰. 교과 행이 있으면 5행·5코드일 때만, 아니면 학생 전체 제외. 두 원천 중 하나라도 있으면 5축 전부(없는 축 0). API 는 5행·5코드 방어 확인만.
5. **반영 방식**: 한 PG 트랜잭션 DELETE+INSERT(COPY), TRUNCATE 금지. 하한 = 현재 대비 20% 초과 감소 또는 0행이면 중단. 세션 `pg_try_advisory_lock(hashtextextended('eco-competency-sync',0))`, 실패 시 종료. 공개 후 ANALYZE.
6. **타입·자릿수**: `point numeric`(척도 미지정, 정확 합계). 수집기는 `Decimal` 로만 다룬다(float 금지). API 는 기존 계약대로 `float`. 화면은 기존 `formatCompetencyScore`(소수 둘째 자리, 뒤 0 제거). dry-run 에서 최대 소수 자릿수가 2 를 넘으면 보고하고 팀장이 판단.
7. **검증 학생**: 공개 후 로컬에서 소유자 권한 집계로 고른다 — 지급 행 있음 ∧ 학사 원본 ∧ override/fixture 아님 ∧ (가능하면) 교과 CORE 5행 보유자 1명 + 비교과만 1명. 학번은 셸 변수로만 넘기고 문서·로그·커밋·스크린샷에 남기지 않는다. 첫 로그인이 로컬 `dc.person`/`dc.student` 행을 만든다는 점을 사용자에게 알린다.

## 5. 완료 기준

- 183 격리 DB 적용·재실행(새 DB 에서 처음부터), 회귀 기준선(`dc_regression_20261127053353_38f602_test`: 10 failed) 대비 신규 실패 0.
- 〔rev2〕 EXPLAIN 증거(격리 DB, 실제 규모에 가까운 합성 데이터 또는 로컬 사본 위 트랜잭션 ROLLBACK): `WHERE student_uid=$1` 이 custom·generic plan 모두 `ix_dc_v_usr_inf_intg_uid`·`ix_dc_v_stu_cap_inf_intg_uid`·`ix_eco_skill_point_student`(Index Only) 를 쓰고 Seq Scan·Materialize·HashAggregate 전체 집계가 없을 것. 점조회 실행 시간 p50 ≤ 0.3ms(0023 기준 0.07ms 대비 기록).
- 계약 테스트: 교과만·비교과만·둘 다·둘 다 없음·축 누락(0)·교과 4행+비교과 있음(→ null)·교과 5행4코드+비교과(→ null)·교과 NULL 점수+비교과(→ null)·학사에 없는 학번(제외)·**local·override·fixture 계정 각각 비매칭**·`dc_app` 의 `eco` 직접 읽기 거부·`dc_app` 의 합산 뷰 읽기 허용·응답 키 집합 불변·값 float·`coreCompetencySource='ACADEMIC_PROGRAM'`·교직원 `/bootstrap/profiles` 동일 값·기존 `DEVELOPMENT_CARE7_TEST` 테스트(`test_care7_test_student.py`·`test_competency_examples.py`) 그대로 통과.
- 수집기 단위 테스트(네트워크 없음): 잘못된 JSON·`NaN` 토큰·bool point·문자열 essential·essential 6·child≠0·title 불일치·추가/누락 키·`application_id` 중복(모두 중단), 빈 배열 허용, 학번 공백 행 제외, 20% 감소 중단, 0행 중단, lock 점유 시 종료, 공개 트랜잭션 중간 실패 시 기존 행 유지, 출력·report 에 학번·접속 값 없음.
- 수집기 dry-run 1회 → 보고 검토 → `--publish` 1회(사용자에게 업체 접속을 알린 뒤), 보고는 건수만.
- ego-browser: 비교과 점수 보유 학생 로그인 → 마이페이지 핵심역량 숫자 = 교과+비교과(소유자 권한 SQL 로 대조), 메인 범례·목표선 없음, 교직원 상세 동일, 콘솔 오류 0·실패 요청 0·추가 API 호출 0, 프로필 응답 시간 전후 비교. 스크린샷 없음.
- `tsc -b`, `docker:migrate`, `docker:up`, 커밋·dev 푸시. 서버 배포 없음.

## 6. rev2 변경 요약 (rev1 → rev2)

1. 저장: jsonb 단일 → 원값 + 지급 행 2표, CHECK(NaN·Infinity·child·essential), 복합 FK, index-only 인덱스.
2. 대상 학생: `usr_inf` 학번 매칭 → `dc_v_usr_inf`(원본) 전용 + override·fixture 제외.
3. 교과 이상: 「교과 부분만 제외」 → 「학생 전체 제외」(부분 합 금지).
4. 뷰: 180 뷰 재사용, CTE 금지(물질화 방지), 점조회 전용 명시.
5. 수집기: dry-run 기본·`--publish` 명시, 접속 정보 3키 직접 파싱·오류 분류만, 업체 문 목록·타임아웃 고정, JSON `parse_constant` 거부·`Decimal`, 키 집합 검사, 하한 20%·0행, advisory lock, TRUNCATE 금지, ANALYZE.
6. 계약: `coreCompetencySource='ACADEMIC_PROGRAM'` 확정 + 프론트 `isRawCompetencySource` 단일화(리터럴 2곳이 조용히 0~100 모드로 떨어지는 문제).
7. 도구·문서: `release_parity.py`·`audit_schema.py` 에 `eco`, 문서 갱신 목록.
8. 완료 기준: EXPLAIN 증거·점조회 시간·테스트 케이스 확장.
