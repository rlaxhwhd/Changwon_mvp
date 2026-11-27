# 0026 implementation — 핵심역량 교과(학사) + 비교과(이뤄드림) 합산

상태: **IMPLEMENTED_FOR_LEAD_REVIEW**
구현: Sol · 2026-11-27 · 기준 = `work-order.md` rev2 + `architecture-review.md` 조건 C1~C12
범위 밖으로 남긴 것: 업체 MySQL 접속(dry-run 포함)·`--publish`·ego-browser 화면 검증·커밋·푸시(지시대로 팀장 단계).
Atlas 공유 기억: 이 세션에 Atlas 도구가 없어 조회·저장하지 않았다.

## 1. 변경 파일

| 파일 | 내용 |
|---|---|
| `backend/migrations/183_core_competency_program_merge.sql` (신규) | rev2 §3-1·§3-2 SQL 두 블록을 **작업지시서에서 그대로 추출**(손 편집 없음). 스키마 `eco`·3표·CHECK·복합 FK·인덱스·합산 뷰·COMMENT·REVOKE/GRANT·`lock_timeout`. `security_invoker` 없음, `eco` 에 `dc_app` 권한·`ALTER DEFAULT PRIVILEGES` 없음. 180·176 뷰, `sync_academic.py` 무수정 |
| `backend/app/students.py` | `profile()` 의 180 읽기를 `dc.student_core_competency_combined` 읽기로 교체(rev2 §3-4 코드 그대로), source `'ACADEMIC_PROGRAM'`. 개발 fixture 경로 다음·065 경로 앞 위치 유지, 쿼리 수 불변 |
| `backend/scripts/sync_eco_competency.py` (신규) | 업체 수집기. dry-run 기본, `--publish` 명시 공개 |
| `backend/requirements-academic.txt` | `PyMySQL==1.1.1` 고정 추가(API 이미지 의존성 아님). 로컬 `backend/.venv` 에 설치·버전 확인(1.1.1) |
| `backend/scripts/release_parity.py` · `audit_schema.py` | 스키마 목록 `('dc','academic')` → `('dc','academic','eco')` (각 9곳), audit docstring |
| `src_v2/data/competency.ts` | `isRawCompetencySource()` export(`'ACADEMIC_PROGRAM'`·`'ACADEMIC'` → true). `getCompetencyAxes` 리터럴 교체, 머리 주석 갱신 |
| `src_v2/pages/Main.tsx` | 범례 리터럴 → `isRawCompetencySource`, 문구 「교과·비교과 이수 누계 원점수 · 그래프는 내 가장 높은 역량 기준」 |
| `src_v2/pages/mypage/Portfolio.tsx` | 출처 「학사 교과 이수와 이뤄드림 비교과 이수 기록을 합산합니다.」, 빈 상태 「핵심역량 점수가 아직 없습니다」 |
| `src_admin/components/StudentDetailView.tsx` | `GapTab` raw 설명 「교과(학사)·비교과(이뤄드림) 이수 누계를 합한 원점수입니다. 그래프는 학생의 가장 높은 역량을 기준으로 그립니다.」 (판정 로직 무변경 — `target == null`) |
| `backend/tests/contracts/test_core_competency_contract.py` (신규) | 계약 시험 4개(§6 1~11, C2~C4) |
| `backend/tests/test_eco_competency_sync.py` (신규) | 수집기 시험 24개(가짜 업체 행·가짜 pymysql, 네트워크 없음) |
| `backend/tests/test_academic_profile_display.py` | `'ACADEMIC'` 단언 3곳 → `'ACADEMIC_PROGRAM'`(케이스 삭제 없음, C4) |
| `docs/CORE_COMPETENCY_DB.md` | 「이뤄드림 비교과 합산 (183)」 절 — 원천·수집·대상 제외·운영 순서(A3)·롤백 (C12) |
| `DB_SCHEMA.md` | 183 항목을 적용 결과로 갱신(로컬 적용, `eco` 0행, 서버 미배포) |
| `DB.md` §9 | #48 인정 조건(D2) · #49 교과 없는 학생 안내(D3) · #50 이중 집계(D4) |
| `docs/LOCAL_AI_WORKFLOW.md` | 183 로컬 반영 기록(백업 경로·회귀 id) |

라운지 문구(`AiLounge.tsx`)는 rev2 대로 그대로 두었다. `CLAUDE.md`·`RAG_VECTOR.md`·기존 미추적 scratch 파일은 건드리지 않았다(둘의 기존 수정은 이 작업 이전부터 있던 것).

## 2. 호출자 확인 (graft CLI)

- `profile`(students.py) ← `profiles`(`/bootstrap/profiles`) · `student`(`/students/{id}`) 둘뿐 — rev2 §2 와 같음.
- `getCompetencyAxes` ← `getCompetencyRadar`(admin studentDetail) · `getCompetencyOverall` · `AiLounge` · `Main` · `Portfolio` — 같음.
- C5 grep(저장소 추적 파일 전체, md 제외): `git grep -n "coreCompetencySource ===\|coreCompetencySource==\|== *'ACADEMIC'"` →
  `src_v2/data/competency.ts:42:  return source === 'ACADEMIC_PROGRAM' || source === 'ACADEMIC'` (헬퍼 내부 1곳만, 화면 리터럴 비교 0).

## 3. 실행한 명령과 결과

| 명령 | 결과 |
|---|---|
| `backend/.venv/Scripts/python.exe scripts/run_regression.py …` (fresh 격리 DB, 전 마이그레이션 1~183 처음부터 적용 + seed + 전체 pytest) | **`dc_regression_20261127063402_b2af89_test`: 10 failed / 871 passed / 2 skipped.** 기준선 `dc_regression_20261127053353_38f602_test`(10 failed / 843 passed) 와 **실패 집합 diff 0**(같은 10개). +28 passed = 새 계약 4 + 수집기 24 |
| 같은 DB 에서 대상 5파일 `-rA` (계약·수집기·`test_academic_profile_display`·`test_care7_test_student`·`test_competency_examples`) | 49 passed. 개발 fixture 2종 시험 무수정 통과(C4) |
| `npx.cmd tsc -b` | exit 0 |
| `npm run docker:migrate` | 백업 `_workspace/db-backups/local-before-migrate-20261127063915888.dump` → `Applied 183_core_competency_program_merge.sql` |
| `npm run docker:up` | 전 컨테이너 healthy(재백업·마이그레이션 no-op 포함) |
| `audit_schema.py` (로컬, 소유자) | migrations 183, checksum_mismatches 0, duplicate_indexes 0. `eco` 3표·합산 뷰 출현. `eco` 의 `dc_app`/PUBLIC grant 0 |
| `release_parity.py --data` (로컬) | `eco.roadmap_application`·`eco.roadmap_application_skill_point`·`eco.sync_run` 이 data 목록에 출현, 183 applied (C8) |
| 로컬 권한 확인 | `has_schema_privilege('dc_app','eco','USAGE')=f`, 합산 뷰 SELECT=t, `pg_default_acl` 0행, `eco.roadmap_application` 0행 |

기존 알려진 실패 10개(기준선과 동일): test_api pagination · test_boot_contract 2 · test_counsel_history_menu · test_development_roadmap 2 · test_diagnosis access · test_growth portfolio projection · test_retire_jiwoo · test_roadmap_generator live provider.

## 4. 계약(mock→API) 매핑 결과

새 키 없음. `coreCompetencyScores`(5코드 → float | null)·`coreCompetencySource`(string | null) 키·중첩·타입 불변, 값 도메인만 `'ACADEMIC'` → `'ACADEMIC_PROGRAM'`.

| §6 항목 | 시험 | 결과 |
|---|---|---|
| 1 교과만 → 교과값, float, `ACADEMIC_PROGRAM` | `test_academic_program_merge_values_and_partial_rules` | 통과 |
| 2 비교과만 → 없는 축 0.0, 0.1+0.2 = 0.3 정확, 빈 배열 신청서 무영향 | 같음 | 통과 |
| 3 둘 다 → 축별 합(뷰 직접: academic 2 + program 1.5 = 3.5) | 같음 · `test_view_columns_and_privileges` | 통과 |
| 4 둘 다 없음 → None/None | 같음 | 통과 |
| 5 교과 4행 / 5행4코드 / NULL 점수 + 비교과 → None | 같음 | 통과 |
| 6 학사 원본에 없는 학번의 지급 행 → 뷰 0행 | `test_local_override_fixture_and_unknown_numbers_get_nothing` | 통과 |
| 7 local·override·fixture(각각 교과 5행 + 지급 행) → 뷰 0행·API None (180 뷰에는 그대로 5행) | 같음 | 통과 (C2) |
| 8 키 집합 동일(교과만·없음·local·둘 다), `/bootstrap/profiles` = `/students/{id}`, source ∈ `(None,'DEVELOPMENT_CARE7_TEST','ACADEMIC_PROGRAM')`, `'ACADEMIC'` 없음 | `test_response_keys_unchanged_and_bootstrap_matches_detail` | 통과 (C4) |
| 9 개발 fixture 2종 기존 시험 | `test_care7_test_student.py`·`test_competency_examples.py` 무수정 | 통과 |
| 10 `dc_app`: 뷰 SELECT 성공, `eco.*` 3표 `permission denied for schema eco` | `test_view_columns_and_privileges` | 통과 |
| 11 뷰 열 순서 `[student_uid, competency_code, academic_score, program_score, score]` | 같음 | 통과 |

API 호출은 모두 `SET LOCAL ROLE dc_app` 후 수행(소유자 계정은 GRANT 누락을 못 잡는다).

## 5. 수집기 (C6·C7)

- 접속 값: `--vendor-env-file`(기본 저장소 루트 `.env.local`)에서 `pro_ip`(host[:port], port 없으면 3306)·`pro_id`·`pro_pw` 세 키만 파싱. 다른 줄은 보관하지 않는다. `os.environ`·argv·출력·`sync_run`·예외 문자열에 넣지 않는다. 키 누락은 키 **이름**만 보고. 이 세션에서 `.env.local` 은 열지 않았다.
- 오류 출력: `error_line()` = 예외 클래스명 + 정수 errno 만(`str(e)`·traceback 없음). 시험: 호스트·계정·비밀번호가 메시지에 든 가짜 `OperationalError(2003, …)` → `FAILED (OperationalError, errno 2003); existing copy unchanged.`
- 업체 문: `VENDOR_STATEMENTS` 4개(`SET SESSION max_execution_time = 60000` · `START TRANSACTION READ ONLY` · rev2 SELECT · `COMMIT`)만, 목록 밖 문은 `ValueError`. pymysql `charset='utf8mb4'`·`autocommit=False`·`connect_timeout=5`·`read_timeout=120`·`write_timeout=10`, 재시도 없음. 시험으로 실행 순서·인자 확인.
- 검증(전체 중단, `Abort(code)`): JSON 문법·`NaN`/`Infinity`(`parse_constant` 거부)·UTF-8 strict·최상위 배열·원소 키 정확히 4개·essential int(bool 제외) 1~5·child int == 0·point int/Decimal(bool·str 제외) 유한 ≥0·title(고정 시) 정확 일치·`application_id` int·중복. **제외(행만, 건수 보고)**: `student_id` 가 `^\S{1,40}$` 아님(빈 값·공백·None). 빈 배열 허용(원값만).
- 공개(`--publish`): 세션 `pg_try_advisory_lock(hashtextextended('eco-competency-sync',0))` 실패 → `LOCK_BUSY` 종료 → title 미고정이면 업체 접속 **전에** `TITLES_NOT_PINNED` → 업체 읽기·검증 → 하한(현재 행 있고 유효 0행 = `ZERO_ROWS`, 20% 초과 감소 = `ROW_DECREASE`) → 한 트랜잭션(`lock_timeout 10s`·`statement_timeout 60s`, `sync_run` PUBLISHED INSERT, 지급 행·원값 DELETE, 두 표 COPY, count 재확인 불일치 = `COUNT_MISMATCH` 롤백; TRUNCATE 없음) → 커밋 후 `ANALYZE` 두 표 → unlock. 중단 시 별도 autocommit 으로 `ABORTED`(분류 코드·건수만).
- 보고(집계만): 업체 행·유효 행·학생 수, 제외 행, 빈 배열, 원소 수, essential 별 원소 수·point 합/최소/최대(문자열 Decimal)·최대 소수 자릿수, distinct (essential,title) 수(문자열은 dry-run 출력에만), `statusByCompleted`(`상태|완료` 교차 건수), `notConfirmedOrIncompleteRows`(D2 판단용), 같은 신청서 안 essential 중복 건수, 학사 원본 매칭·미매칭 학생 수, override/fixture 로 제외될 학생 수, `maxSourceUpdatedAt`(A2, 시각만), `titlesPinned`, (공개 시) `previousRows`. 학번·이름·학생별 점수 없음 — 시험으로 출력·report 에 학번 문자열이 없음을 확인.
- 시험(네트워크 없음, 격리 DB): 위 중단 16종 파라미터 + 중복 id·타입 drift, 소수 합·빈 배열·학번 제외 집계, env 3키·오류 비노출, 고정 문, 공개 교체(누적 아님)·20% 감소·0행·검증 실패 시 기존 사본 유지, 공개 트랜잭션 중간 FK 실패 시 기존 행 유지 + `ABORTED`, lock 점유 시 종료·title 미고정 시 업체 미접속, dry-run PG 쓰기 0.

### 팀장 실행 명령 (비밀 값 없음, 저장소 루트, 업체 접속 고지 후)

```powershell
# 의존성(이미 backend/.venv 에 설치됨 — 새 환경에서만)
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements-academic.txt
# 1) dry-run (기본, PG 쓰기 0) — 출력의 titles·statusByCompleted·notConfirmedOrIncompleteRows·maxScale 확인
backend/.venv/Scripts/python.exe backend/scripts/sync_eco_competency.py --pg-password-file deploy/secrets/postgres_password_local
# 2) dry-run 의 titles 를 backend/scripts/sync_eco_competency.py 의 EXPECTED_TITLES 에 {1:'…',…,5:'…'} 로 고정(추측 금지)
#    → 수집기 시험 재실행 → (D2 해당 시 사용자 확인)
# 3) 공개
backend/.venv/Scripts/python.exe backend/scripts/sync_eco_competency.py --pg-password-file deploy/secrets/postgres_password_local --publish
```

선택 인자: `--vendor-env-file`(기본 `.env.local`), `--vendor-database`(기본 `coursemos`), `--pg-port`(15432), `--pg-database`(dreamcatch). 실패 시 종료 코드 1 과 한 줄 분류만 stderr 로 나온다.

## 6. C9 실측

### 격리 DB (`dc_regression_20261127063402_b2af89_test`, 합성 규모: 학사 학생 106,000 · CORE 19,500명×5 · eco 신청 13,400 / 학생 4,200 / 지급 행 40,200)

쿼리 `SELECT competency_code,score FROM dc.student_core_competency_combined WHERE student_uid=$1`(PREPARE, 교과 5행+지급 행 보유 학생). `jit=off`.

| 조건 | custom plan | generic plan |
|---|---|---|
| 같은 트랜잭션 삽입·ANALYZE 후 ROLLBACK | 0.387 ms (EXPLAIN ANALYZE) | 0.224 ms |
| 커밋 + `VACUUM (ANALYZE)` 후(합성 행 삭제로 정리) | 0.600 ms (첫 실행, 캐시 냉) | 0.378 ms |

경로(두 plan 동일): `Index Scan ix_dc_v_usr_inf_intg_uid`(1행) → `ix_dc_v_stu_cap_inf_intg_uid`(av 집계·축별 교과, Index/Bitmap) → 축별 합 `ix_eco_skill_point_student` — **VACUUM 후 Index Only Scan**(Heap Fetches 0), VACUUM 전(방금 적재)은 같은 인덱스의 Bitmap Heap Scan → override `student_login_override_pkey`·fixture `fixture_student_login_student_uid_key` Index Only 반조인. EXISTS(eco) 는 Index Only Scan(교과 있는 학생은 미실행). HashAggregate·학생 전원 집계·CTE 물질화 없음.

반복 점조회 2,000회(plpgsql 캐시 plan, 섞인 학생: 둘 다/교과만/비교과만/없음):

| 뷰 | p50 | p95 | max |
|---|---|---|---|
| 183 합산(ROLLBACK 측정) | **0.059 ms** | 0.104 ms | 1.25 ms |
| 183 합산(VACUUM 후) | **0.054 ms** | 0.114 ms | 1.19 ms |
| 180 교과(같은 데이터, 비교) | 0.022 / 0.017 ms | 0.032 / 0.031 ms | — |

### 로컬 DB (실 규모 학사 사본 121,578행·CORE 102,715행 + 합성 학생 4,200·eco 40,200행, 한 트랜잭션 ROLLBACK, 롤백 후 `eco` 0행 확인)

custom 0.251 ms / generic 0.218 ms (EXPLAIN ANALYZE). 반복 p50 **0.086 ms** · p95 0.125 ms (180: 0.022 / 0.035 ms). 경로는 위와 같고, 축별 합은 방금 삽입한 행이라 Bitmap(`ix_eco_skill_point_student`).

**판정: p50 ≤ 0.3 ms 충족.** 지시서 문구와 글자 그대로 다른 점(팀장·Astra 판단용):
- `Seq Scan` 이 있다 — 대상은 **`dc.core_competency`(5행·1 페이지)** 뿐이고(180 뷰·183 뷰의 코드표 조인), 로컬 DB 에서는 `dc.student_login_override`(2행)·`dc.fixture_student_login`(7행)도 1페이지라 Seq Scan 을 골랐다. 학생·원천 표의 Seq Scan 은 없다.
- `Materialize` 가 있다 — 학생 한 명의 ≤5행 내부 결과(180 서브쿼리 5행·코드표 5행·override 0행)를 5축 루프에서 재사용하는 노드다. 지시서가 막으려던 「학생 전원 CTE 물질화」와는 다르다.
- 축별 합의 Index Only Scan 은 가시성 맵이 설정된 뒤(VACUUM)에 나온다. 수집기는 rev2 대로 공개 후 `ANALYZE` 만 하므로 autovacuum 전까지는 Bitmap Heap Scan(측정상 p50 0.059 ms)이다. 필요하면 공개 후 `VACUUM (ANALYZE)` 로 바꾸는 것을 권고(학사 수집기의 SUGANG 처리와 같은 방식) — rev2 와 달라지므로 적용하지 않았다.

### 로컬 API 응답 시간(같은 조건 전후, curl 25회, 개발 identity, 로컬 Docker)

| 요청 | 전 median / p90 | 후 median / p90 | 크기 전 → 후 |
|---|---|---|---|
| 상담사 `GET /bootstrap/profiles` (career_kim, 24명) | 66.5 / 112.2 ms | 67.5 / 113.6 ms (2회차 81.7 / 91.4) | 49,128 → 49,082 B |
| fixture 학생 본인 `GET /bootstrap/profiles` | 12.2 / 29.6 ms | 11.6 / 28.5 ms | 17,757 B 동일 |
| 상담사 `GET /students/{fixture}` | 11.7 / 29.2 ms | 13.0 / 30.7 ms (2회차 12.3 / 24.5) | 17,671 B 동일 |

차이는 측정 잡음 범위. 쿼리 수 불변. 상담사 부팅 크기 −46 B: 로컬 roster 의 **override 계정 1명**이 이전 180 경로로 받던 학사 CORE 를 더 받지 않는다(rev2 의도된 동작 변화, D1). 나머지 원점수 학생 6명은 `ACADEMIC_PROGRAM`(로컬 `eco` 비어 교과값 그대로). 실학생 비교과 점수 화면 검증은 `--publish` 후 팀장 단계(C10).

## 7. rev2 와 다르게 간 곳·추가한 것

1. **`EXPECTED_TITLES = None` 상수 + 공개 거부.** rev2 는 「dry-run 보고의 실제 값으로 상수 고정(추측 금지)」. 실제 값을 모르므로 None 으로 두고, None 이면 dry-run 은 title 을 검사하지 않고 출력만 하며 `--publish` 는 업체 접속 전에 `TITLES_NOT_PINNED` 로 중단한다. 팀장이 dry-run 후 상수를 채워야 한다.
2. **`--vendor-database`(기본 `coursemos`) 인자.** rev2 SELECT 는 스키마를 한정하지 않아 접속 DB 지정이 필요했다. 비밀이 아니다.
3. **추가 검증(중단):** JSON 객체 중복 키(파이썬 기본은 뒤 값으로 조용히 덮어씀), `is_completed`(None/bool/0/1/BIT(1) 외)·`program_id`/`topic_id`(int 외)·`application_status_code`(str 외)·`completion_date`/`updated_at`(datetime/date 외) 타입 drift, 행 열 수 ≠ 9. 형식이 정해진 PG 열에 넣기 위한 것이며 모두 분류 코드만 남긴다. `student_id` 가 str 아닌 타입이면 drift 중단, None 은 제외(건수).
4. **`LOCK_BUSY` 는 `ABORTED` 를 기록하지 않는다** — lock 을 못 잡은 실행은 다른 실행이 공개 중일 수 있어 기록 없이 종료한다. lock 을 잡은 뒤의 모든 중단(검증·하한·title·트랜잭션 오류)은 `ABORTED`(코드 `ERROR_<클래스명>` 포함).
5. **보고 추가 항목:** `maxSourceUpdatedAt`(A2), `notConfirmedOrIncompleteRows`, `titlesPinned`, `previousRows`.
6. **드라이버 세션 설정문:** PyMySQL 1.1.1 은 rev2 가 정한 접속 인자(`charset='utf8mb4'`, `autocommit=False`) 때문에 접속 직후 스스로 `SET NAMES utf8mb4` 와 (서버 기본이 autocommit 이면) `SET AUTOCOMMIT = 0` 을 보낸다. 데이터 접근이 아닌 드라이버 세션 설정이며, 우리 코드가 실행하는 문은 고정 4개뿐이다(목록 가드). 그대로 둘지 팀장 판단.
7. 감사 도구 결과의 `fk_without_full_prefix_index` 에 `eco` FK 2건이 잡힌다(`roadmap_application.sync_run_id`, 지급 행 `(application_id, student_id)` → PK `(application_id, seq)` 접두만). rev2 SQL 그대로(C1)라 인덱스를 더하지 않았다 — `sync_run` 은 삭제 불가, 신청서 DELETE 는 지급 행을 먼저 비운 뒤라 FK 확인은 PK 접두 인덱스로 충분.

## 8. 남은 제한·다음 단계(팀장)

- 업체 dry-run → `EXPECTED_TITLES` 고정 → (D2 해당 시 사용자 확인) → `--publish` → 소유자 권한 집계로 검증 학생 선정 → ego-browser(마이페이지·메인 범례·교직원 상세, 콘솔 0·실패 요청 0·추가 호출 0) — 미수행(C10·C11). 첫 로그인이 로컬 `dc.person`/`dc.student` 행을 만든다는 점을 사용자에게 알린다.
- D1(override 계정 점수 미표시) — 로컬 roster 에서 1명 해당, 사용자 확인 사항으로 남긴다. D2~D4 는 `DB.md` §9 #48~#50.
- 커밋·푸시·서버 배포 안 함(지시). 서버 DB `eco` 는 배포 시 빈 채로 시작.
- 권고 A1(부팅 N+1)·A4·A5 는 범위 밖, 변경 없음.
