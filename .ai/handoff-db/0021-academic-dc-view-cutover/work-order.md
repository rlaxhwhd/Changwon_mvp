# 0021 학사 복제본 전산원 DC_V_* 전환 · 학과코드 통일 · 학생 로그인 새 코드체계

- revision: 2 (2026-11-25 Astra 교정 — rev 1 대비 바뀐 곳은 각 절의 **[rev2]** 표시와 §5 요약)
- 상태: **READY_FOR_SOL** (rev 2 · ASTRA_APPROVED 조건부 — `architecture-review.md` §8 필수 조건 전부 이행. 팀장 확인 2026-11-25)
- 작성: 팀장(Claude Opus), 2026-11-25 · 교정: Astra(DB 설계 리뷰), 2026-11-25
- 사용자 요청(2026-11-25): 「학사코드, 학과코드등 모두 완벽하게 통일해서 적용되게 테스트 돌려가면서 될 때 까지 작업」,
  「로그인 뷰를 새 코드체계에 맞추는데 … 테스트 학생 정리하지말고 academic에 맞게 비어있는 컬럼은 다른 학사 학생의 정보로 채워넣고 계속 테스트 할 수 있게」.
- 사용자 확정 선택: ① 데이터는 전산원 뷰에서 **실제 적재**(dreamcatch 계정 → `@V_BRDB`, SELECT만) ② 테스트 학생 빈 칸은 같은 학과 실학생 값으로 **개인정보까지 전부 복사**
  ③ 로그인은 지금처럼 **학적 상태 무관 학생 전체**(`USER_TY_CD='0001'`). 현행 Oracle 업무데이터 이관은 이번 범위가 아니다.
- 근거: `haksa.md`, 원본 `docs/Dream_view.xlsx`(2026-11-20, 16뷰·247컬럼), 이 폴더의 `c-code-map.csv`.

## 1. 실측 사실 (2026-11-25, 읽기 전용 · 집계만 조회)

| 항목 | 결과 |
|---|---|
| 접근 | `ALL_TAB_COLUMNS@V_BRDB`에 14개 뷰·224컬럼. **엑셀과 이름·순서·타입·길이 불일치 0**. `REQUEST.DC_V_LECT_OPEN_INF`·`DC_V_LECT_CAP_INF`는 ORA-00942(미생성/무권한) |
| 행 수 | USR_INF 117,378 · ADD_JOB_PART 17 · COL 16 · DEPT 595 · MAJOR 782 · ORG 180 · PART 875 · **STU_SUGANG 4,326,226** · SUBJ 34,193 · CURRI 54,092 · CAP 390 · STU_CAP 97,715 · USR_MAJOR 23,133 · CODE 352 |
| 신분 | 학생 `0001`(106,101, INTG_UID 7~8자리 숫자, **학생 중 INTG_UID 중복 0**), 교원 `0002`, 직원 `0003`, 조교 `0004`. 교직원 INTG_UID=로그인ID(비숫자), **사번=EMP_NO**(일부 NULL·중복). 전체 117,378행 vs distinct 116,854 — 중복은 교직원 쪽 |
| 학적 | `HOFC_STA_CD` 0001 재학·0002 휴학·0003 수료·0004 제적·0005 졸업·0006 재직·00007 퇴직, 학생 NULL 56행. `UNIV_CD` 00 학부·01 석사·02 박사·03~12 특수대학원·90 전문학사·91/92 석박통합 |
| 성별 | `SEX` '0' 남 / '1' 여 (현행 미러는 0001/0002 를 가정한 코드가 있음) |
| 조직 | `DEPT_CODE` 595 전부 유일, 학생 `HAKBU_CD` 100% DEPT 연결, `MAJOR_CD` 100%(채워진 103,437) MAJOR 연결. 학생 `DAEHAK_CD` ≠ 학과의 `COL_CODE` 10,430건(개편 전 졸업생 추정) → **학생의 단대는 학과의 COL_CODE 로 파생**. COL·DEPT 코드 충돌 0. **MAJOR_CODE 가 DEPT_CODE 와 같은 값 312건**(gubun 0 은 정의상 동일, 1·2·3 도 존재) → 조직 트리를 단일 코드 공간으로 합치면 안 된다 |
| 동명 학과 | 과정별·단대별 동명 다수(경영학과 205/1302/2302/6321, 사용중 학과명 중복 88건). 이름 매칭 금지(CLAUDE.md 규칙 7) |
| 우리 쪽 | `dc.department` 80행 중 79행이 자체 C-코드. 참조: org_assignment 30/30, curriculum 60/60, subject.open_dept_cd 43/52, department_staff_assignment 29/1,767(나머지 1,738행의 college/dept 는 이미 학사 코드 1/101), student 8/20, student_login_override 1. 시드 5파일·`seed_care7_test_student.py`·테스트 4파일. 프론트에는 C-코드 리터럴 없음 |
| **[rev2] 전공 코드** | `department_staff_assignment.major_code` 비어있지 않은 1,132행(활성 169행 = `academic_assistant`)은 **옛 미러 트리의 `M`+전공코드 형식**(`M101`, `MM003`). 옛 미러는 lvl3 전공에 `M`을 붙였고 학생 `major_cd`도 `M…`였다. 새 `MAJOR_INF.MAJOR_CODE`에는 접두어가 없다(위 312건 동일값이 증거). 따라서 college/dept 와 달리 **major 는 학사 코드가 아니다** |
| **[rev2] dc.student 조직** | 학사 출신 11행은 college/dept 가 NULL(옛 투영이 MAJOR_CD 를 dept 로 넣어 FK 대상 없음). `enroll_student` 는 `ON CONFLICT DO NOTHING` 이라 투영을 고쳐도 기존 행은 갱신되지 않는다 → 학과·전공 배정 스코프(`staff_student_scope`)에서 빠진다 |
| **[rev2] 의존 뷰 체인** | `academic.v_usr_inf`·`v_dep_inf_all` 위에 `student_login_source`·`fixture_student_login_source`·`academic_people`·`academic_student_details`·`academic_organizations`·`department_staff_candidates`·`academic_joint_appointments`, 그 위에 `department_assignment_targets`·`_whole_targets`·`department_assignment_student_scope` → `staff_student_scope`(교수·조교 권한 판정). 컬럼 타입(varchar 길이)이 바뀌어 `CREATE OR REPLACE` 불가 — DROP/CREATE 재구성 필요 |
| **[rev2] 시드 원장** | `app.seed` 는 `dc.seed_source.checksum` 이 파일과 다르면 `RuntimeError('Seed changed after import…')`. 신규 DB 재구축(`rebuild-test-db.sh`)은 마이그레이션 → 시드 순서이고 013·043·046·051 등을 시드 뒤에 재실행한다 |
| 테스트 학번 | 가짜 7명(20441231·20661231·20771231·20881231·20991231·20211304·20196208)과 로그인번호 20990001/20990002 는 **새 뷰에 없음**(충돌 없음). 20990001→20211304, 20990002→20196208(`dc.fixture_student_login`). 검증 학생 20243003(학과 405)·20262324(507) 및 기존 학사 출신 dc.student 11명은 새 뷰에 존재. override 2명: 20180001(실제 졸업생, 학과 101 → override 전자공학과 714), 20261231(실제 학과 270 → override 경영학과) |

## 2. 설계

### 2-1. 원본 복제 테이블 (migration 176)
- `academic.dc_v_<view>` 16개(소유 스키마명은 접두어로 남기지 않음 — 16개 이름이 유일). 컬럼·순서는 `ALL_TAB_COLUMNS@V_BRDB` 그대로, 타입은 053 규칙(VARCHAR2/CHAR→varchar(n) 후행 공백 보존, NUMBER→numeric(p,s)/numeric, DATE→timestamp without time zone). BYTE 길이를 PostgreSQL 문자 길이로 옮기므로 항상 수용된다(문자 수 ≤ 바이트 수). LECT_OPEN·LECT_CAP 은 엑셀 정의로 빈 테이블. DDL 은 `dc_view_columns.json` 에서 한 번 생성해 **정적 SQL 로 커밋**한다(런타임 생성 금지).
- PK 없음(원본 중복 보존). **[rev2]** NOT NULL 도 선언하지 않는다 — 원본 nullability 는 동기화의 메타 대조가 지킨다(뷰 재정의로 NULL 이 생기면 COPY 실패보다 드리프트 보고가 먼저 나와야 한다).
- 인덱스: usr_inf(intg_uid), **[rev2]** usr_inf(emp_no) `WHERE emp_no IS NOT NULL`(교직원 후보·스코프의 DISTINCT ON 키 — 술어 푸시다운 대상), usr_inf(hakbu_cd), stu_sugang_inf(intg_uid), dept_inf(dept_code), major_inf(major_code), code_inf(code_grp,code), usr_major_inf(intg_uid), stu_cap_inf(intg_uid). 이 외 인덱스는 EXPLAIN 근거 없이 추가하지 않는다.
- 컬럼 명세 정본: `backend/academic/dc_view_columns.json`(OWNER,TABLE_NAME,COLUMN_ID,COLUMN_NAME,DATA_TYPE,DATA_PRECISION,DATA_SCALE,CHAR_LENGTH,CHAR_USED,DATA_LENGTH,NULLABLE).
- **로컬 테스트 인원 테이블** `academic.local_usr_inf`: `dc_v_usr_inf` 와 같은 컬럼(같은 타입) + `intg_uid` PK(NOT NULL) + `note text` + `created_at timestamptz NOT NULL DEFAULT now()`. 동기화가 건드리지 않는다(DB.md §3-4 학사/자체 분리). dc_app 권한 없음.
- 통합 뷰 `academic.usr_inf` = `dc_v_usr_inf` UNION ALL `local_usr_inf`. **[rev2]** ① 두 갈래 모두 **명시 컬럼 목록**(35컬럼)으로 고르고 `note`·`created_at` 은 내보내지 않는다 ② 파생 컬럼 `origin`('source'|'local')을 끝에 붙인다 ③ 로컬 갈래는 `NOT EXISTS (원본 같은 INTG_UID)` 로 원본 우선(방어선). **충돌 자체는 정상 상태가 아니다** — 동기화가 공개 전에 충돌을 발견하면 전체 중단한다(§2-2). 조용히 가리면 가짜 학생의 dc.* 업무 이력(진단·상담·로드맵)이 같은 번호의 실제 학생에게 붙는다.
- 기존 053/054 미러 테이블·sync_run 은 남긴다(forward-only). **[rev2]** 더 이상 읽지 않는 `v_usr_inf`·`v_usr_inf_dup_inf`·`com_hakjuk` 등은 11만 명 개인정보 사본이므로 **검증 PASS 후 바로 다음 마이그레이션에서 삭제**하고 DB.md §9 에 기한과 함께 등록한다. `com_con_*`·`fu_ass_dept`(관리자 조회의 상담사·조교 배정 데이터셋)는 새 원본이 없으므로 **옛 코드 그대로 동결된 legacy** 다 — 새 코드와 조인하지 않고, 조회 화면 설명에 「이전 학사 코드 기준(동결)」을 표시한다.

### 2-2. 동기화 (`backend/scripts/sync_academic.py --source dc-views`)
- 메타 SQL: `ALL_TAB_COLUMNS@V_BRDB WHERE OWNER IN('INTRANET','REQUEST') AND TABLE_NAME IN(…) ORDER BY OWNER,TABLE_NAME,COLUMN_ID`. 데이터 SQL: 명세 컬럼만 `SELECT … FROM "OWNER"."VIEW"@V_BRDB`. 허용 목록 외 SQL 금지(기존 원칙).
- 명세에 있는데 원본에 없는 뷰는 `missing` 으로 보고하고 건너뜀. **이전 실행에서 행이 있던 뷰가 missing 이 되면 전체 중단.** 컬럼 드리프트는 전체 중단. **[rev2]** 단, 이전에 missing 이던 뷰(LECT_OPEN·LECT_CAP)가 처음 나타났는데 엑셀 추정 명세와 다르면 그 뷰만 `drift_new` 로 보고·건너뛰고 나머지는 공개한다(엑셀 추정치 때문에 매일 동기화 전체가 멈추지 않게). 명세 교체는 새 마이그레이션으로 한다.
- 433만 행 대응: 행 해시 Counter 대신 **순서 무관 가산 다중집합 해시**(sha256 을 정수로 더해 mod 2^256 + 행 수)로 원본 스트림·스테이징 대조. 20% 초과 감소 거부 유지.
- **[rev2] 스테이징과 공개를 분리**: 세션 advisory lock(`pg_advisory_lock`) → autocommit 으로 세션 임시 테이블(`LIKE dest INCLUDING DEFAULTS` — 인덱스 없이, `ON COMMIT PRESERVE ROWS`)에 뷰별 COPY·검증 → **짧은 공개 트랜잭션 하나**. 추출 전체(수십 분)를 한 트랜잭션으로 묶어 xid 를 잡고 있지 않는다.
- **[rev2] 추출 성능**: 결과셋마다 컬럼 타입·숫자 여부를 한 번만 읽어 캐시(행마다 `getMetaData()`/`getColumnTypeName()` JPype 호출 금지), `setFetchSize` 5,000 이상, SUGANG 은 별도 query timeout(측정 후 결정, 기본 120초로는 부족할 수 있다). 장시간 원격 조회의 ORA-01555 등은 실패=전체 미공개로 처리하고 재시도한다. 학번·연도 범위 분할 조회는 한 뷰의 스냅샷 일관성을 깨므로 쓰지 않는다.
- **[rev2] 공개 전 검사(모두 위반 시 전체 중단)**: 학생(`USER_TY_CD='0001'`) INTG_UID 중복, DEPT_CODE 중복, COL_CODE 중복, 스테이징 usr_inf 와 `academic.local_usr_inf` 의 INTG_UID 충돌. 그 밖 논리 키(haksa.md §2) 중복 건수와 「같은 EMP_NO·다른 USR_NM」 건수는 보고만 한다(값은 출력하지 않는다).
- **[rev2] 변경 없는 뷰 생략**: (행 수, 해시)가 마지막으로 커밋된 sync_run 보고의 같은 뷰 값과 같고 현재 대상 행 수도 같으면 DELETE+INSERT 를 생략하고 `unchanged` 로 기록한다.
- 공개: **[rev2]** 한 트랜잭션에서 큰 테이블부터 DELETE+INSERT(MVCC — 읽기는 이전 세대를 계속 본다, TRUNCATE·이름 교체는 쓰지 않는다: 전자는 읽기를 막고 후자는 의존 뷰가 옛 OID 를 계속 가리킨다) → usr_inf·조직 테이블 → **마지막에** `dc.refresh_department_from_academic()` → `academic.sync_run`(source_label 'DC_VIEWS', snapshot_mode 는 기존 CHECK 값 'per-table-select'). dc.department 행 잠금은 refresh 부터 커밋까지만 잡힌다. `lock_timeout='10s'` 유지.
- **[rev2] 공개 후(autocommit)**: 공개한 테이블 `ANALYZE`, `stu_sugang_inf` 는 `VACUUM (ANALYZE)`. SUGANG 은 매 갱신마다 사본만큼 dead tuple 이 생겨 정상 상태에서 힙·인덱스가 약 2배(실측 전 추정 1~1.5GB)가 되고 WAL 도 그만큼 쓴다 — 첫 적재 때 테이블·인덱스 크기, 소요시간, WAL 양을 기록한다.
- 비밀번호는 파일 인자(기존). 로컬은 `.env.local` 의 값을 Git 제외 secrets 파일로 옮겨 사용(값을 출력·커밋하지 않음). 실패 메시지에 행 값을 넣지 않는다(기존 원칙).

### 2-3. 조직 코드 통일
- `dc.department` 정본 = 학사 학과. 키 `(college_code=DEPT_INF.COL_CODE, dept_code=DEPT_INF.DEPT_CODE)`. 컬럼 추가: `univ_code text`, `is_active boolean NOT NULL DEFAULT true`(USE_FLAG='1'), `source text NOT NULL DEFAULT 'academic'`. `course` = CODE_INF(`CODE_GRP='UNIV_CD'`) 표시명(없으면 univ_code, 그것도 없으면 '미상' — course 는 NOT NULL). `college_name`=COL_NAME(단대 미연결이면 COL_CODE 를 쓰고 건수 보고), `dept_name`=DEPT_NAME.
- **[rev2] `dept_code` 단독 유일 인덱스**를 C-코드 이관 뒤 176 에서 만든다. `curriculum.dept_code`·`subject.open_dept_cd` 가 dept 만으로 참조하므로 이 불변식이 필요하다(DEPT_CODE 595 전부 유일 실측과 일치).
- **[rev2] `dc.refresh_department_from_academic()`** (SECURITY INVOKER, `SET search_path = pg_catalog`, 모든 이름 스키마 한정, `REVOKE EXECUTE … FROM PUBLIC` — 함수 기본 EXECUTE 는 PUBLIC 이다):
  1. `academic.dc_v_dept_inf` 가 0행이면 RAISE(빈 원본으로 전체 비활성화 금지).
  2. **학과 단대 이동 먼저**(같은 DEPT_CODE, COL_CODE 변경): 영향 행을 이관 로그에 먼저 남기고 → `dc.department` 키를 **제자리 UPDATE**(`college_code` 만) → FK 가 `student`·`org_assignment` 를 따라오게 하고(176 에서 두 FK 를 `ON UPDATE CASCADE` 로 다시 만든다), FK 없는 `department_staff_assignment`·`student_login_override` 는 같은 트랜잭션에서 UPDATE. 「새 행 삽입 → 참조 갱신 → 옛 행 삭제」 방식은 `dept_code` 단독 유일 인덱스와 충돌하므로 쓰지 않는다. 조직개편은 실제로 있었고(DAEHAK_CD 불일치 10,430건) 다시 생긴다.
  3. 학사 학과 upsert(이름·course·univ_code·is_active 갱신). 이동을 먼저 처리해야 upsert 가 `dept_code` 유일 인덱스에 걸리지 않는다.
  4. 원본에서 사라진 행은 **삭제하지 않고** `is_active=false`, 건수를 보고(rev 1 의 「참조 없으면 삭제」는 FK 없는 참조 4곳을 모두 검사해야 하고 동시 삽입과 경합하므로 버린다).
  5. **dc.student 조직 정합**: `dc.student_login_source` 의 (college_code, dept_code)와 다른 dc.student 행을 갱신(학사가 정본 — CLAUDE.md 규칙 1. 전과 학생의 스코프가 새 학과로 옮겨가는 것이 맞는 동작). 갱신 건수 보고.
- **[rev2] 이관 로그** `dc.org_code_remap`(id, table_name, row_key text, old_college, old_dept, old_major, new_college, new_dept, new_major, reason, changed_at) — append-only, 기존 `dc.reject_history_change()` 트리거로 UPDATE/DELETE 거부, dc_app 권한 없음. 176 의 C-코드·전공 접두어 이관과 3번 단대 이동이 바꾼 모든 행을 남긴다. 역변환은 이 로그로만 한다(학사 코드가 원래부터 있던 1,738행과 구분할 수 없으므로 CSV 역매핑은 금지).
- **176 에서 C-코드 이관**: `c-code-map.csv` 의 MAP 63건을 VALUES 로 박아 ① 대상 학사 학과 행을 dc.department 에 먼저 upsert(이름은 CSV 값, `ON CONFLICT DO NOTHING` — 기존 (5,714) 보존, 다음 동기화가 갱신) ② student · org_assignment · department_staff_assignment · student_login_override 의 (college,dept) 와 curriculum.dept_code · subject.open_dept_cd 를 UPDATE(+이관 로그) ③ C-코드 dc.department 행 DELETE ④ **[rev2]** `DO $$ … IF EXISTS(C-코드 잔존 — 위 6곳과 dc.department) THEN RAISE EXCEPTION` (ASSERT 는 `plpgsql.check_asserts=off` 로 꺼질 수 있어 쓰지 않는다). FK(student/org_assignment → department)는 ①→②→③ 순서로 위반 없이 진행. MAP 대상 매핑 규칙: 학부(UNIV 00) + 학과명 + 단대 일치, 동명 주·야 쌍은 DAY_FLAG='1', 3건 수동(행정학과→202, 국제무역학과→212, 수리과학과→156a — 156a 는 옛 미러 lvl2 학과 코드로도 존재). DELETE 16건은 참조 0 확인됨. MAP 은 단사(같은 대상 중복 0) 확인.
- **[rev2] 176 에서 전공 접두어 이관**: `department_staff_assignment.major_code` 의 `M` 하나를 떼어 새 MAJOR_CODE 로 맞춘다(전 행 — 비활성 이력 행도 같은 코드 체계로. 접두어 제거는 단사라 활성 부분 유일 인덱스와 충돌하지 않는다). 마이그레이션 시점엔 학사 테이블이 비어 존재 검증을 못 하므로 **첫 동기화 직후 검증**(§3-2)에서 활성 행의 (dept, major) 가 MAJOR_INF(DEPT_CODE 일치)에 모두 있는지 확인하고, 없으면 건수와 행 id 를 보고한다(삭제·비활성 금지 — 관리자 판단).
- dc.student 학과 의미 = `HAKBU_CD`(학과). **지금 로그인 투영이 `MAJOR_CD` 를 dept_code 에 넣는 버그 수정.** 전공 범위는 기존처럼 `dc.academic_people.major_cd` 로 판정.
- jsonb 잔재(seed_source.payload 5, idempotency.response 1, job_posting_event.after_value 1, program.detail 2, job_posting.content_html 1, code_item 1)는 Sol 이 내용을 확인해 업무 의미가 있으면 보고 — 이력·스냅샷은 수정하지 않는다(append-only). `job_application_attempt.snap_college_code/snap_dept_code` 도 스냅샷이라 그대로 둔다(조인하지 않고 표시만 한다). **[rev2] 예외: `dc.seed_source` 는 이력이 아니라 시드 가져오기 원장**이다 — 아래 시드 교체와 같은 커밋의 176 에서 바뀐 시드 파일의 `checksum`(새 파일 바이트의 sha256)과 `payload` 를 새 파일 내용으로 갱신한다. 안 하면 기존 DB 에서 `python -m app.seed` 가 RuntimeError 로 멈춘다.
- 시드 JSON(`backend/seeds/admin/departments.seed.json`·`deptAssigns.seed.json`, `v2/academic/curriculum.json`·`subjects.json`·`studentAcademic.json`)과 `seed_care7_test_student.py`, 테스트를 학사 코드로 교체.

### 2-4. 읽기 모델 뷰 재정의 (이름 유지, 원본만 새 테이블)
**[rev2] 재구성 절차**: 176 에서 `SET LOCAL lock_timeout='5s'` 후 의존 역순으로 명시 DROP(`CASCADE` 금지 — 목록을 적는다): `staff_student_scope` → `department_assignment_student_scope` → `department_assignment_whole_targets` → `department_assignment_targets` → `department_staff_candidates` → `academic_joint_appointments` → `academic_organizations` → `academic_student_details` → `academic_people` → `fixture_student_login_source` → `student_login_source`. 정방향으로 다시 만들고 **모두 `GRANT SELECT … TO dc_app`**(DROP 으로 권한이 사라진다). `staff_student_scope` 는 현재 정의와 같게, `fixture_student_scope` 는 그대로. 뷰는 기본 `security_invoker=false`(소유자 권한으로 academic 을 읽는다)를 유지한다.

| 뷰 | 새 정의 |
|---|---|
| `dc.student_login_source` | `academic.usr_inf WHERE user_ty_cd='0001'`. `student_no = COALESCE(fixture_student_login.student_no, intg_uid)`(LEFT JOIN ON f.student_uid=a.intg_uid), `college_code = COALESCE(override, 학과의 COL_CODE)`, `dept_code = COALESCE(override, HAKBU_CD)`, `dept_name = COALESCE(override, DEPT_NAME)`, `college_name = COALESCE(override, COL_NAME)`, `univ_cd`·`hofc_sta_cd`·`user_ty_cd`·`stu_schgr` 노출. **[rev2]** `local_override = (override 있음) OR origin='local'`(로컬 인원은 dc.person.source='local' 로 등록) |
| `dc.fixture_student_login_source` | 폐기(DROP). 로컬 학생은 `academic.local_usr_inf` 로 일원화. `student_login.py` 의 fallback 경로 제거 |
| `dc.academic_people` | 같은 컬럼명 유지, 값은 새 코드. `orgz_nm` = **[rev2]** COALESCE(HAKBU_CD 학과명, PARTID 부서명, ORGID 기관명)(교직원은 학과가 없을 수 있다), `major_cd2`=MAJOR_CD1, `prof_id`=NULL, `emp_no` 추가(끝에). category: 0001+재학·휴학→student, 0001+수료·제적·졸업→graduate, **[rev2]** 0001+그 외·NULL→other, 0002→professor, 0004→assistant, 0003→employee |
| `dc.academic_student_details` | 학생 전체(0001). `sex_code`='0'/'1' 원값, academic_gpa=GRADE, out_dt, foreigner_code=FOR_YN, mobile=HP, email + `grad_exp_ym`, `isu_grade`, `curri_year` 추가 |
| `dc.academic_organizations` | (lvl,dept_cd) 쌍: lvl1=COL, lvl2=DEPT(up=COL_CODE), lvl3=MAJOR(up=MAJOR_INF.DEPT_CODE, DEPT_CODE NULL 제외). **[rev2] lvl3 는 gubun 0 을 포함한 전체 전공** — 옛 트리도 학과와 같은 전공(M101 ⊂ 101)을 두었고, 활성 조교 배정 169행이 바로 그 전공(접두어 제거 후 '101')을 가리킨다. 빼면 그 배정이 배정 대상 목록에서 사라진다. 옛 컬럼 집합 유지: dept_cd, dept_nm, dept_up_cd, grp_cd('0001'/'0002'/'0003'), grp_nm('단대'/'학과'/'전공'), ordering(LISTORDER), lvl, use_yn(USE_FLAG='1'→'Y' 아니면 'N'), dept_sub_nm(약칭), univ_code + 끝에 `gubun_code`. **소비처 조인은 lvl 을 반드시 지정**(MAJOR·DEPT 코드 겹침) |
| `dc.department_staff_candidates` | 0002→professor, 0004→assistant. `staff_uid = employee_no = EMP_NO`(기존 dc.staff·배정 키가 사번 — 옛 미러는 교직원 intg_uid 가 사번이었다), EMP_NO NULL 제외, is_active = HOFC_STA_CD='0006'. **[rev2]** `DISTINCT ON (emp_no, role_code) ORDER BY emp_no, role_code, (hofc_sta_cd='0006') DESC, upd_dt DESC NULLS LAST, intg_uid` — 한 사번이 교원·조교 행을 모두 가져도 역할을 잃지 않고, 결과가 결정적이다 |
| `dc.department_assignment_student_scope` | **[rev2]** 비활성 판정 `NOT EXISTS(… c.staff_uid=a.staff_uid AND c.role_code=a.role_code AND NOT c.is_active)` — 역할까지 맞춘다. 나머지 현재 정의 유지 |
| `dc.academic_joint_appointments` | `dc_v_add_job_part`(컬럼명 intg_uid, emp_no, orgid, partid — 옛 뷰와 같음) |
| `dc.department_assignment_targets`·`_whole_targets` | 새 academic_organizations 로, lvl 조건 명시(현재 정의와 같은 구조) |

### 2-5. 코드 소비처 (Sol)
`student_login.py`(dept=HAKBU_CD·college=COL_CODE, fixture 경로 제거, **[rev2]** 조회를 `WHERE intg_uid = COALESCE((SELECT student_uid FROM dc.fixture_student_login WHERE student_no=%s), %s)` 로 바꿔 `dc_v_usr_inf(intg_uid)` 인덱스를 타게 한다 — `student_no=… OR intg_uid=…` 는 COALESCE 식 때문에 11만 행 전체 스캔이 된다), `academic_students.py`(성별 0/1, 대학원 판정, **[rev2]** d/m/c 세 조직 조인을 지우고 `student_login_source` 의 dept_name·college_name 을 쓴다 — lvl 누락 시 행이 불어난다), `student_contact.py`(**[rev2]** `ACADEMIC_STATUS` 0003=수료·0004=제적으로 정정 — 현재 반대로 매핑돼 있다), `roadmap_generator.py`(조직 조인 4곳에 lvl, `o`=lvl3), `programs.py`(:393 성별), `survey.py`(:346 성별), `department_assignments.py`, `staff.py`(`/departments` 에 `univCode`·`active` 추가 — 기존 키 유지), `administration.py`(학과 수동 생성 경로가 있으면 학사 소유 위반 → 보고).
**[rev2] 추가 소비처**: `academic_directory.py`(organizations 정렬 `lvl,dept_cd`, people 정렬 `intg_uid,emp_no,user_ty_cd` — 키가 더는 유일하지 않아 페이지가 흔들린다), `employment_report.py`(`SEX` — 저장된 `employment_report.sex_code` 는 스냅샷이라 옛 '0001'/'0002' 와 새 '0'/'1' 을 모두 해석), `stats_kpi.py`(0001/0005 는 새 코드와 같음 — 확인만).
**[rev2] 프론트**: `src_admin/pages/AcademicDirectory.tsx` 상태 리터럴 89/90 → 0006/00007, `src_admin/components/StudentChargeTable.tsx` 성별 옵션 '0001'/'0002' → '0'/'1'(API 키 `sexCode` 유지, 값 도메인만 학사 원값). `/departments` 를 쓰는 드롭다운은 `active` 만 노출(라벨 조회는 전체)하고 같은 이름이 둘 이상이면 과정(course)을 붙인다.
**[rev2] 성별 판정**: haksa.md 는 「0 남 · 그 외 여」. 표시는 `'0'`→남, NULL/''→없음, 그 외→여. 필터 '1' 은 `sex_code<>'0'`(NULL 제외)로 해석한다.
**[rev2] 학부/대학원**: `academicLevel` 은 `'학부'|'대학원'` 만 허용하는 계약이다. 대학원 = `univ_cd IN ('01'…'12','91','92')`, 그 외(00·90 전문학사·NULL) = 학부. (`univ_cd<>'00'` 은 90 을 대학원으로 잘못 넣는다.) 90 의 분류: **팀장 확정 2026-11-25 — 학부**(현행 동작과 동일, 계약 변경 없음).
**신분 리터럴 규칙**: `STUDENT_ENROLLED` 의미를 `user_ty_cd='0001' AND hofc_sta_cd IN('0001','0002')` 로 갱신(CLAUDE.md 규칙 8·SPEC §7-2·§7-3 — 옛 1101 도 재학+휴학이었으므로 의미 보존). 로그인은 학생 전체(사용자 확정).
**[rev2] academic.v_usr_inf 에 쓰던 코드 전부 교체**: 테스트 `test_academic_students`·`test_care7_test_student`·`test_diagnosis_retake`·`test_diagnosed_metadata`·`test_employment_report`·`test_department_assignments`·`test_student_login`·`test_student_contact`·`test_retire_jiwoo`·`test_register_test_student`·`test_academic_sync`·`test_academic_directory`(상태 '89'), 스크립트 `register_test_student.sql`·`care7_academic_test_students.sql`·`add_local_service_students_to_academic.sql`·`add_fixture_academic_profiles.sql` 는 `academic.local_usr_inf`(로컬 인원) 또는 `dc_v_*`(테스트 DB 원본 대역)로 옮기거나 퇴역한다. 옛 테이블에 쓰면 오류 없이 아무 효과가 없어진다.

### 2-6. 테스트 학생 (로컬 전용 스크립트, migration 아님)
`backend/scripts/seed_local_academic_test_students.sql` (`-v apply=false` 리허설 기본):
- 대상: 가짜 7명(intg_uid 기준 — 20990001/2 의 실제 uid 20211304·20196208 포함). 각자 `academic.local_usr_inf` 1행. 값: INTG_UID·USR_NM·USER_TY_CD='0001'·HAKBU_CD(176 이후의 dc.student.dept_code)·DAEHAK_CD(그 학과 COL_CODE)·STU_SCHGR(dc.student.grade 가 있으면)·UNIV_CD='00'·**[rev2] EMP_NO=NULL** 은 테스트 고유값, **나머지 모든 컬럼은 같은 HAKBU_CD·UNIV 00·HOFC 0001 실학생 중 INTG_UID 최소 1명(donor)에게서 그대로 복사(연락처·주소·생년월일 포함 — 사용자 선택)**. donor 가 없으면 같은 단대에서 선택, 그래도 없으면 실패.
- **[rev2] 안전장치**: `-v confirm_local=yes` 와 `current_database()='dreamcatch'` 가 아니면 중단. 복사한 값을 출력하지 않는다(건수·donor 존재 여부만). 실행 전 원본(dc_v_usr_inf)과 INTG_UID 충돌을 검사해 있으면 중단. 외부 발송(SMS·메일)을 나중에 붙이면 `origin='local'` 인원은 반드시 제외한다(복사된 연락처는 실제 학생 것이다 — 현재 발송 경로 없음 확인).
- 로그인 번호 20990001/20990002 는 `dc.fixture_student_login` 그대로.
- override 2명(20180001·20261231)은 `dc.student_login_override` 유지 — 학과코드만 학사 코드(714, 205). 실제 학생이라 local 행은 만들지 않는다.
- 재실행 안전(ON CONFLICT DO NOTHING), 원본 동기화로 지워지지 않음.
- **[rev2] 범위**: 이 스크립트를 돌리지 않은 DB(신규 테스트 DB, CentOS 서버)에서는 fixture 로그인(20990001/2 포함)이 더는 되지 않는다(fixture 경로 폐기의 결과). 테스트는 필요한 인원을 스스로 `local_usr_inf` 에 넣는다. 서버 반영은 별도 지시 시 이 스크립트 실행을 배포 절차에 넣을지 팀장이 판단한다.

## 3. 검증 기준
1. 빈 DB 마이그레이션 전체 + 재실행, 기존 DB 에 176 적용 후 C-코드 0, FK 위반 0. **[rev2]** `rebuild-test-db.sh`(마이그레이션→시드→파생 재실행) 통과, 기존 DB 사본에서 `python -m app.seed` 가 `already_imported`, 모든 시드 파일 sha256 = `dc.seed_source.checksum`. `dc.org_code_remap` 건수 = 176 이 바꾼 행 수.
2. `sync_academic.py --source dc-views` 실적재: 14뷰 해시 일치, missing 2 보고, dc.department 595(+참조 보존 행) 갱신. **[rev2]** 이어서: 활성 `department_staff_assignment` 의 (college,dept) 가 전부 DEPT_INF 의 (COL_CODE,DEPT_CODE) 에 있고 비어있지 않은 major 가 전부 MAJOR_INF(DEPT_CODE 일치)에 있다(아니면 목록 보고), 활성 배정 staff_uid 의 후보(EMP_NO) 적중 건수 보고, 학사 출신 dc.student 의 college/dept NULL 0, 같은 데이터로 재실행 시 전 뷰 `unchanged`. 첫 적재의 뷰별 소요시간·행 수·SUGANG 테이블/인덱스 크기·WAL 양 기록.
3. pytest 회귀(기존 실패 4건 제외 — 메모리 지침), 신규: 로그인(0001 전체·졸업생 허용·교직원 거부·fixture 번호·override·원본 우선), dept refresh(참조 보존, **[rev2]** 빈 원본 거부·단대 이동 시 참조 갱신+로그·사라진 행 비활성), C-코드 부재, 스코프(학과·전공 배정, **[rev2]** 한 사번 두 역할), **[rev2]** 동기화(로컬 인원 충돌 시 전체 미공개, missing→행 있던 뷰 중단, 변경 없는 뷰 생략), 함수 EXECUTE 가 dc_app 에 없음, dc_app 이 academic 스키마에 접근 불가.
4. `npx tsc -b`, `npm run docker:up`, ego-browser: 학생 20243003·20262324·20990001·20441231 로그인 → 메인 소속 표시, admin 5역할 학생목록·학과배정·통계 화면 콘솔 오류 0·실패 요청 0, 로그인·로스터 API 응답시간 전후 비교. **[rev2]** EXPLAIN 증거: 로그인 조회가 `dc_v_usr_inf` intg_uid 인덱스, 교수·조교 스코프 조회가 emp_no 인덱스를 쓴다.

## 4. Astra 검토 요청 (rev 1) — 답은 `architecture-review.md`
① 16개 원본 테이블 타입 매핑·인덱스, 433만 행 적재 시간/디스크/잠금 ② 가산 해시의 충분성 ③ `academic.usr_inf` 원본 우선 규칙과 로컬 인원 분리 ④ dc.department 투영, 176 의 C-코드 재매핑 순서·FK·잠금 ⑤ 교직원 키 EMP_NO ⑥ academic_organizations 의 (lvl,dept_cd) 와 소비처 조인 ⑦ fixture 경로 폐기 영향 ⑧ 권한 ⑨ 롤백.

## 5. [rev2] 교정 요약 · 롤백
- 교정: 전공 `M` 접두어 이관 누락, dc.student 조직 정합 누락, 의존 뷰 체인(scope 포함) DROP/CREATE·재권한, lvl3 gubun 0 포함, 로그인 조회 인덱스 경로, 스테이징/공개 분리·변경 없는 뷰 생략·공개 후 ANALYZE, 로컬 인원 충돌 시 중단, refresh 삭제 금지·단대 이동(student/org_assignment FK ON UPDATE CASCADE)·빈 원본 거부·EXECUTE 회수·dept_code 단독 유일, 이관 로그, seed_source 원장 갱신, 학적 0003/0004 매핑 정정, 성별·대학원 판정, 추가 소비처·테스트·스크립트·프론트 리터럴.
- **롤백은 forward-fix 만.** 앱만 되돌리면 안 된다(옛 앱은 폐기된 `fixture_student_login_source` 와 옛 신분코드 1101/1301·'89' 를 읽어 로그인·스코프가 깨진다). 되돌려야 하면 새 마이그레이션으로 ① 보존한 옛 미러 위에 059/097/147/055/071/074 시점의 뷰 정의를 다시 만들고 ② `dc.org_code_remap` 을 역순으로 적용해 코드 값을 되돌리고 ③ seed_source 원장을 옛 파일 checksum 으로 되돌린다. 그래서 옛 미러 삭제 마이그레이션은 이 작업의 검증 PASS 이후에만 한다. `academic.dc_v_*` 와 `local_usr_inf` 는 남겨 둔다(앱이 읽지 않으면 무해).
