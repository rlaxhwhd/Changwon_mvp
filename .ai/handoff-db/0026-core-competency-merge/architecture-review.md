# 0026 architecture-review — 핵심역량 교과 + 비교과(이뤄드림) 합산

- 리뷰어: Astra(DB 설계 리뷰) · 2026-11-27
- 대상: `work-order.md` rev1(팀장) → **rev2 로 직접 교정**
- **판정: ASTRA_APPROVED — 조건부(APPROVED WITH CONDITIONS)**. 승인 revision = **rev2**.
- 범위: 설계 리뷰만. **어떤 DB 에도 적용·실행하지 않았다**(로컬 포함, 트랜잭션 ROLLBACK 측정도 하지 않음). 업체 MySQL·Oracle 접속 없음. `.env.local` 값은 열지 않았다(키 이름만 작업지시서에서 인용). 따라서 이 문서의 성능 수치는 0023 실측을 근거로 한 **예상**이며, 실측은 조건 C9 로 Sol 에게 넘긴다.
- 확인한 원본: 마이그레이션 053·059·060·063·065·176·178·179·180·181·182, `backend/app/students.py`·`student_login.py`, `backend/scripts/sync_academic.py`·`release_parity.py`·`audit_schema.py`, `docs/CORE_COMPETENCY_DB.md`, `src_v2/data/competency.ts`·`pages/Main.tsx`·`pages/mypage/Portfolio.tsx`·`pages/AiLounge.tsx`, `src_admin/data/studentDetail.ts`·`components/StudentDetailView.tsx`, `backend/tests/test_academic_profile_display.py`·`academic_test_support.py`, 0023 work-order·review. 호출자는 graft(`profile` → `profiles`·`student`, `getCompetencyAxes` → Main·AiLounge·Portfolio·`getCompetencyRadar`·`getCompetencyOverall`).
- Atlas 공유 기억: 이 세션에 Atlas 도구가 없어 조회·저장하지 않았다.

## 1. 사실 검증 결과(rev1 §2)

| rev1 사실 | 판정 | 보충 |
|---|---|---|
| 180 뷰 = CORE ACE1~5 VALUES 대응, 원점수 | 맞음 | 점수 NULL 행은 뷰에서 빠진다 → API 의 5행 검사에서 「4행 = null」로 처리된다 |
| `students.py:74-82` 5행·5코드 | 맞음 | `profile()` 은 `/bootstrap/profiles` 에서 **학생마다** 호출 — 상담사는 `dc.student` 전원(기존 N+1) |
| 학번 = `academic.usr_inf.intg_uid` | 맞음 | 단 `usr_inf` 는 원본 ∪ local 이다. 테스트 계정은 local 만이 아니다(아래 §2-2) |
| 마이페이지 문구 | 맞음 | 같은 「학사 …(교과·비교과 이수 누계)」 표현이 메인 범례·교직원 `GapTab` 에도 있다 |
| 학사 수집 패턴 | 맞음 | 추가: advisory lock 480093, 한 트랜잭션 DELETE+INSERT, 20% 감소 중단, 공개 후 ANALYZE |
| pymysql 없음, `requirements-academic.txt` | 맞음 | JPype1==1.7.1 만 있음 |
| (누락) 프론트 분기 | **rev1 에 없음** | `competency.ts:42`·`Main.tsx:157` 이 `=== 'ACADEMIC'` 리터럴. 새 값이면 0~100 개발 모드(목표선 75·갭)로 조용히 떨어진다 |
| (누락) 스키마 점검 도구 | **rev1 에 없음** | `release_parity.py`·`audit_schema.py` 가 `('dc','academic')` 하드코딩 |

## 2. 교정한 설계와 근거

1. **원값 jsonb 단일 저장 → 원값 + 펼친 지급 행.** rev1 은 뷰가 읽을 때마다 `jsonb_array_elements` 로 펼친다. 그러면 ① 잘못된 원소(문자열 point 등)가 들어오면 읽기 시점 캐스트 오류가 마이페이지와 상담사 부팅 전체(학생마다 같은 뷰)를 500 으로 만든다 ② 학생 단위 점조회에 jsonb 파싱 비용이 든다. 수집 시점 검증 + CHECK 로 실패를 쓰기 쪽으로 옮기고, `(student_id, essential) INCLUDE (point)` 로 index-only 합산을 쓴다.
2. **테스트 계정 차단 범위 확장(local → local·override·fixture).** `dc.student_login_override`(060 `20180001`, `20261231`)는 **실학생 학사 행 위에 이름·소속만 바꾼** 로그인이다. rev1 처럼 `usr_inf.intg_uid` 로 매칭하면 local 은 걸러질지 몰라도 override 계정은 실학생 uid 그대로라 그 실학생의 교과·비교과 점수가 가명 계정에 붙는다. 대상 학생을 `academic.dc_v_usr_inf`(= `origin='source'`) 로 한정하고 override·fixture uid 를 `NOT EXISTS` 로 뺀다. 182(사진 `origin='source'` 만)와 같은 원칙을 override·fixture 까지 넓혔다.
   - local 계정이 학번 매칭만으로 남의 점수를 받는 경로: local uid 는 원본에 없는 번호다(`localIntgUidCollisions` 차단). 그런데 업체에는 학사 사본에 아직 없는 학번(신입·사본 지연)이 있을 수 있다 — 그 학번과 local uid 가 같으면 실학생 점수가 붙는다. 원본 한정이 이 경로를 닫는다.
3. **교과 원천 이상 시 처리: 「교과 부분만 제외」 → 「학생 전체 제외」.** 교과가 4행·중복·NULL 인 학생에게 비교과만 더해 보여주면 「교과+비교과」 라벨 아래 부분 합이 나간다. 0023 계약(부분·중복은 그리지 않는다)과 `CORE_COMPETENCY_DB.md`(부분 합계를 전체 점수로 제공하지 않는다)를 따른다.
4. **180 뷰 재사용, CTE 금지.** ACE 대응·NULL 제외를 한 곳에 둔다(재생성 금지). PG17 은 두 번 이상 참조되는 CTE 를 물질화하므로, 학생 집합을 CTE 로 두면 점조회마다 학사 학생 전원을 계산한다. LATERAL 점조회 구조로 `student_uid` 술어가 `dc_v_usr_inf` 인덱스로 내려가게 했다.
5. **`coreCompetencySource` 값과 프론트 단일 판정.** 합산 뷰 원점수는 `'ACADEMIC_PROGRAM'` 로 고정(원천 존재 여부와 무관 — 화면은 원점수/0~100 구분만 쓴다). 리터럴 비교 두 곳을 `isRawCompetencySource()` 하나로 모은다. 이 조건 없이 값만 바꾸면 tsc·빌드는 통과하고 화면만 목표선 75 와 음수 갭을 그린다.
6. **수집기 안전장치 구체화.** dry-run 기본(첫 접속에서 title 정확 문자열·자릿수·상태 교차를 실제로 확인한 뒤 공개), 파이썬 `json` 의 `NaN`/`Infinity` 기본 허용 차단, bool 이 int 를 통과하는 문제 차단, 키 집합 검사(업체 스키마 변화 = 학사 수집기의 컬럼 drift 와 같은 중단), 오류 메시지에서 `str(e)` 금지(pymysql 접속 오류 문자열에 호스트 포함), TRUNCATE 금지(AccessExclusive 가 프로필 읽기를 막음), 하한 20%·0행, 별도 advisory lock.
7. **운영 도구.** `release_parity.py`·`audit_schema.py` 에 `eco` 를 넣지 않으면 로컬·서버 parity 점검에서 183 구조가 통째로 빠진다.

`DB_SCHEMA.md` 에는 183 대기 항목만 추가했다(적용 전 상태 명시).

## 3. 필수 조건 (Sol·팀장 — 하나라도 빠지면 승인 무효)

1. **C1 SQL**: 183 은 rev2 §3-1·§3-2 SQL 그대로(스키마·3표·CHECK·복합 FK·인덱스·뷰·COMMENT·REVOKE/GRANT·`lock_timeout`). `security_invoker` 를 켜지 않는다. `eco` 의 어떤 객체에도 `dc_app` 권한을 주지 않고 `ALTER DEFAULT PRIVILEGES` 도 쓰지 않는다. 180 뷰·176 뷰·`sync_academic.py` 는 수정하지 않는다.
2. **C2 대상 학생**: 합산 뷰는 `academic.dc_v_usr_inf` 원본 학생만, `dc.student_login_override`·`dc.fixture_student_login` uid 제외. local·override·fixture 각각에 업체 지급 행과 교과 CORE 를 넣은 계약 테스트가 모두 `coreCompetencyScores=None` 이어야 한다.
3. **C3 부분 합 금지**: 교과 행이 있으나 5행·5코드가 아닌 학생(4행·5행4코드·NULL 점수)은 비교과 지급 행이 있어도 `None`. 교과 없음 + 비교과 있음 → 5축(없는 축 0), 교과 5행 + 비교과 없음 → 교과값 그대로.
4. **C4 계약**: 응답 키 집합 불변(점수 있음·없음 학생의 `set(keys)` 동일), 값 `float`, 5코드 정확히, `coreCompetencySource='ACADEMIC_PROGRAM'`, API 는 `'ACADEMIC'` 을 더 내지 않는다. 개발 fixture 경로 순서·결과 불변(`test_care7_test_student.py`·`test_competency_examples.py` 무수정 통과). `test_academic_profile_display.py` 의 `'ACADEMIC'` 단언은 새 값으로 바꾸되 케이스는 지우지 않는다.
5. **C5 프론트**: `isRawCompetencySource()` 를 `competency.ts` 에 두고 `competency.ts:42`·`Main.tsx:157` 의 리터럴을 대체한다. 저장소 전체에 `coreCompetencySource ===` 리터럴 비교가 남지 않는다(grep 결과를 구현 기록에 첨부). 문구는 rev2 §3-4 대로.
6. **C6 수집기 비밀**: `.env.local` 의 세 키만 직접 파싱, `os.environ`·명령줄·로그·`sync_run`·예외 문자열·커밋에 접속 값 없음. 오류는 예외 클래스명 + 정수 errno 만. 단위 테스트로 report·stdout 에 접속 값과 학번이 없음을 확인한다.
7. **C7 수집기 검증·공개**: rev2 §3-3 검증 목록 전부(중단 조건과 제외 조건 구분 포함), dry-run 기본·`--publish` 명시, 세션 `pg_try_advisory_lock`, 한 트랜잭션 DELETE+COPY(TRUNCATE 금지)·건수 재확인, 20% 감소·0행 중단, 공개 후 ANALYZE, 중단 시 `ABORTED` 기록. 업체 쪽은 고정 문 4개만(`max_execution_time`·`START TRANSACTION READ ONLY`·SELECT·`COMMIT`).
8. **C8 운영 도구**: `release_parity.py`·`audit_schema.py` 의 스키마 목록에 `'eco'` 추가. 183 적용 후 두 도구 실행 결과에 `eco` 3표·뷰가 나타나는지 확인.
9. **C9 실측**: 격리 DB 에서 `SELECT competency_code,score FROM dc.student_core_competency_combined WHERE student_uid=$1` 의 custom·generic plan 을 EXPLAIN(ANALYZE 는 이 읽기 쿼리에만) — `ix_dc_v_usr_inf_intg_uid`, `ix_dc_v_stu_cap_inf_intg_uid`, `ix_eco_skill_point_student`(Index Only Scan) 사용, Seq Scan·전체 집계 없음, p50 ≤ 0.3ms. 넘으면 구현을 멈추고 계획을 첨부해 재리뷰. 로컬 Docker 반영 후 학생 마이페이지와 상담사 부팅(`/bootstrap/profiles`) 응답 시간을 전후 같은 조건으로 비교 기록.
10. **C10 적용 순서**: 격리 DB 적용·재실행·테스트 통과 → 로컬 백업(`docker:up` 경로) → 183 로컬 적용 → dry-run(사용자에게 업체 접속 고지) → 보고 검토(D2 해당 시 사용자 확인) → `--publish` → 브라우저 검증. 공개 전 화면 검증 금지(뷰는 빈 `eco` 에서 교과만 보인다 — 그 상태도 C3·C4 로 정상이어야 한다).
11. **C11 개인정보**: 검증 학생 학번·이름·점수 개별값을 문서·로그·커밋·스크린샷에 남기지 않는다. 브라우저 대조는 소유자 권한 SQL 결과를 화면과 비교만 하고 기록하지 않는다. 첫 로그인으로 로컬 `dc.person`/`dc.student` 행이 생긴다는 점을 사용자에게 알린다.
12. **C12 문서**: `docs/CORE_COMPETENCY_DB.md` 에 183 절(원천·수집 절차·대상 제외 규칙·롤백), `DB_SCHEMA.md` 183 항목을 적용 결과로 갱신, `DB.md` §9 에 D2~D4 미결 등록. 구현 기록에 rev2 와 다르게 간 곳을 명시.

## 4. 예상 주요 query 와 인덱스 대응표

| query | 호출처·빈도 | 경로(예상) | 예상 비용·근거 |
|---|---|---|---|
| `dc.student_core_competency_combined WHERE student_uid=$1` | `profile()` — 학생 마이페이지·메인·라운지 부팅 1회, `GET /students/{id}`(교직원 상세) 1회, 상담사 `/bootstrap/profiles` 학생마다 | `ix_dc_v_usr_inf_intg_uid`(1행) → `student_login_override_pkey`·`fixture_student_login` unique(student_uid) 반조인 → `ix_dc_v_stu_cap_inf_intg_uid`(≤5행, av + 축별 a) → `ix_eco_skill_point_student` Index Only(EXISTS 1회 + 축별 sum 5회) | 인덱스 탐색 ≈15회, 0023 점조회 0.055~0.074ms 대비 약 2~4배 → 0.3ms 이내 예상(C9 로 실측). 쿼리 수 불변(180 읽기 1개를 대체) |
| 같은 뷰 전체 SELECT | 없음(금지) | 학사 학생 전원 × LATERAL | 점조회 전용 — COMMENT 에 명시, 화면·export 에서 쓰지 않는다 |
| 수집 공개 `DELETE`×2 + `COPY`×2 | 수동 실행 1회 | 신청 ≈13k행·지급 행 수만 행, PK·FK·인덱스 갱신 | 1초대 예상. RowExclusive 만 — 읽기는 이전 세대(MVCC) |
| 수집 하한 `count(*) FROM eco.roadmap_application` | 수동 실행 1회 | 13k행 seq/IOS | 무시 가능 |
| 검증 학생 선정 집계 | 수동 1회(소유자) | 지급 행 `GROUP BY student_id` + 원본 반조인 | 일회성 |

상담사 부팅: 학생당 `profile()` 기존 ≈1.78ms 중 이 쿼리 증분은 ≈0.1~0.2ms(+5~10%) 예상. 수용하되, 전체 N+1 은 아래 권고 A1.

## 5. 위험·migration·rollback 검토

| 항목 | 판단 |
|---|---|
| additive 여부 | 새 스키마·새 표·새 뷰만. 기존 객체 변경 없음(180 은 의존 대상이 될 뿐). `CREATE VIEW` 는 참조 표에 짧은 잠금만 — `lock_timeout 5s` |
| 재실행 | 새 DB 에서 처음부터 적용 가능해야 한다(마이그레이션 원장이 중복 적용을 막는다). 같은 DB 재적용은 `CREATE SCHEMA` 에서 실패하는 것이 정상 |
| seed/backfill | 없음. 데이터는 수집기 `--publish` 로만 들어온다. 서버 DB 의 `eco` 는 비어 있고 그때 화면은 교과만 보인다(정상 동작) |
| rollback | 마이그레이션 머리말 ①→②→③ 순서. API·프론트를 먼저 되돌린다. CASCADE 금지. 업체 사본은 재수집으로 복구 |
| 동시성 | 수집기 동시 실행 = advisory lock 으로 거부. 학사 수집기와 동시 실행은 서로 다른 표를 쓰므로 허용(뷰는 각 트랜잭션의 커밋 세대를 읽는다) |
| 신선도 | 수동 수집이라 화면 비교과 점수는 마지막 `--publish` 시점 기준. 학사 사본에 없는 신입생의 지급 점수는 학사 동기화 전까지 보이지 않는다(보고 「미매칭 학생 수」로 추적) |
| 이중 집계(미래) | ① 전산원이 2022+ CORE 를 줄 때 그 값에 이뤄드림 비교과가 섞여 있으면 중복(D4) ② 우리 `dc.program` 수료를 065 배점에 연결하면 이뤄드림과 중복(범위 밖, 별도 결정) |
| 개인정보 | `eco` 는 실학생 ≈4.2k 명의 지급 기록이다. `academic` 과 같은 등급 — 로컬 DB 백업에 포함, 커밋 금지, `dc_app` 직접 읽기 불가, 점수는 범위 검사된 프로필 API 로만 |
| 업체 접속 | 읽기 전용 트랜잭션·문 목록 고정·타임아웃. 비밀은 파일 3키만. 실패 시 재시도 없음 |

## 6. JSON 호환성 테스트 항목

1. 교과만(5행) → 5키 float, 값 = 교과, source `ACADEMIC_PROGRAM`.
2. 비교과만 → 5키, 지급 없는 축 `0.0`, 합계 = 지급 point 합(소수 포함, 예: 0.1+0.2 = 0.3 정확).
3. 둘 다 → 축별 교과+비교과.
4. 둘 다 없음 → `None`/`None`.
5. 교과 4행 / 5행4코드 / NULL 점수 + 비교과 있음 → `None`/`None`.
6. 학사 원본에 없는 학번의 지급 행 → 영향 없음.
7. local·override·fixture 계정(지급 행·교과 CORE 모두 넣음) → `None`/`None`.
8. 키 집합: 1·4·7 의 `set(response)` 동일. `/bootstrap/profiles`(상담사) 행 값 = `/students/{id}` 값. 허용 source 집합 `(None,'DEVELOPMENT_CARE7_TEST','ACADEMIC_PROGRAM')`.
9. 개발 fixture 2종 기존 테스트 무수정 통과.
10. 권한: `SET ROLE dc_app` 으로 뷰 SELECT 성공, `eco.*` SELECT 는 `permission denied for schema eco`.
11. 뷰 열 = `['student_uid','competency_code','academic_score','program_score','score']`(순서 고정 — 이후 변경은 끝에만 추가).

## 7. Sol 실행 순서

1. graft 로 `profile`·`getCompetencyAxes`·`coreCompetencySource` 호출자 재확인(rev2 §2 와 같으면 진행).
2. `183_core_competency_program_merge.sql` 작성(rev2 §3-1·§3-2 그대로).
3. 격리 테스트 DB 에 적용·재실행 → C9 EXPLAIN·시간 측정 → 기준 초과 시 중단·재리뷰.
4. `students.py` 교체(rev2 §3-4), 계약 테스트(§6) 작성·통과, 기존 테스트의 `'ACADEMIC'` 단언 갱신.
5. `sync_eco_competency.py` + `requirements-academic.txt`(`PyMySQL==1.1.1`) + 단위 테스트(rev2 §5 목록). 네트워크 없이 통과.
6. `release_parity.py`·`audit_schema.py` 에 `eco`.
7. 프론트: `isRawCompetencySource`, 리터럴 2곳 교체, 문구 4곳. `npx tsc -b`.
8. 회귀 기준선 대비 신규 실패 0 확인(알려진 실패 4건은 보고에서 제외 — 기존 지침).
9. 팀장 확인 후 로컬: 백업 → 183 적용 → dry-run(사용자 고지) → 보고 검토(D2) → `--publish`.
10. ego-browser 검증(rev2 §5), 문서(C12), 구현 기록, 커밋·dev 푸시. 서버 배포 없음.

## 8. 사용자 결정·확인이 필요한 업무 의미 (기술 선택 아님)

- **D1 override 테스트 계정**(`20180001` 홍길동 등 — 실학생 학사 행 위에 이름만 바꾼 로그인): 기본값은 **점수를 보이지 않음**(실학생 점수가 가명에 붙지 않게). 지금 180 경로로 교과 CORE 가 보였다면 사라진다. 그 계정이 실제 본인 학번이라 점수를 보여야 한다면 사용자가 정해야 한다. 차단 아님.
- **D2 인정 조건**: 기본값 = 업체가 지급한 점수는 신청 상태와 무관하게 인정(명세 「지급 = 인정」). dry-run 에서 CONFIRMED·완료가 아닌 지급 행이 있으면 그 건을 넣을지 사용자에게 묻는다. 0건이면 묻지 않는다.
- **D3 교과 누락 학생의 표시**: 2022학번~ 는 전산원 교과 CORE 가 아직 없어 화면 점수 = 비교과만이다. 라벨은 「교과+비교과 합산」으로 나간다. 사용자 원문(「우선 비교과 학생들 정보만으로도 확인 가능」)상 수용으로 보이나, 학생에게 「교과 점수 미반영」 같은 안내가 필요한지는 사용자 판단. 기본값 = 안내 없음(문구는 완결성을 주장하지 않는 「합산합니다」).
- **D4 이중 집계 확인(전산원)**: 0023 문구가 학사 CORE 를 「교과·비교과 이수 누계」라고 적었다. 사용자는 전산원 = 교과로 정의했으므로 이번 설계는 그대로 더한다. 현재는 교과 CORE(2017~2021) 와 이뤄드림(2026~) 기간이 겹치지 않아 중복이 없다. 전산원이 2022+ CORE 를 줄 때 이뤄드림 비교과 점수가 섞여 있지 않은지 확인해야 한다(`DB.md` §9 미결로 등록).

## 9. 비차단 권고

- **A1** `/bootstrap/profiles` 의 학생별 `profile()` N+1(쿼리 ≈6개 × 학생 수)은 기존 문제다. 상담사 학생 수가 커지면 핵심역량·유형·GPA·이행률을 `student_uid = ANY(%s)` 일괄 조회로 바꾸는 별도 작업을 권한다.
- **A2** `sync_run.report` 에 업체 뷰의 최대 `updated_at` 을 남기면 신선도 판단이 쉽다(값은 시각만, 학생 정보 없음).
- **A3** 학사 사본 갱신 직후 eco 미매칭 학생 수가 줄어드는지 보려면 수집기를 학사 동기화 뒤에 실행하는 운영 순서를 `docs/CORE_COMPETENCY_DB.md` 에 적는다.
- **A4** 교직원 상세에서 서비스 행이 없는 학사 학생(로그인 전)은 프로필이 없어 핵심역량이 보이지 않는다(0022 범위 동작). 필요하면 학사 요약 경로에 같은 뷰를 붙이는 별도 작업.
- **A5** `src_admin` 의 옛 `competencyScore`(학생 detail JSON) 표시는 이번 합산과 무관한 레거시다 — 혼동 방지를 위해 정리 후보로만 기록.
