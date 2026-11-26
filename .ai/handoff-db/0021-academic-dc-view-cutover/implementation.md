# 0021 구현 기록 (Sol)

- 상태: **IMPLEMENTED_FOR_LEAD_REVIEW**
- 기준: `work-order.md` revision 2 (READY_FOR_SOL) · `architecture-review.md` ASTRA_APPROVED(조건부, §8 필수 조건) · `.ai/db/GOLDEN_PATH.md` READY
- 일자: 2026-11-25. 커밋·푸시·`npm run docker:up`·서버 배포는 하지 않았다(팀장 몫).
- 팀장 확정 반영: `UNIV_CD 90`(전문학사) = 학부.

## 1. 마이그레이션

| 파일 | SHA256 | 적용 |
|---|---|---|
| `backend/migrations/176_academic_dc_view_cutover.sql` | `b0173b725a3274113a2428c815b1c97fa34af2d20f2a1d365e8615facc646f82` | 테스트 DB(`dreamcatch_test`·회귀 DB) → 로컬 기존 DB 사본(`dc_0021_existing_test`) → 로컬 `dreamcatch` |
| `backend/migrations/177_academic_refresh_null_use_flag.sql` | `6f9593c365b8e6980af064b92c2db2e8edb7005abe8ac7050bac7b8ae25ee2f4` | `dreamcatch_test` → 로컬 `dreamcatch` (**승인 설계와 다른 곳 §8-1**) |

- 176 은 `dc_view_columns.json`·`c-code-map.csv`·새 시드 파일에서 한 번 생성한 정적 SQL(생성기는 커밋하지 않음 — 런타임 생성 없음). 순서는 architecture-review §7-2 그대로: 16 원본 테이블·인덱스 9개 → `local_usr_inf`·`academic.usr_inf`(명시 35컬럼 + `origin`, 원본 우선 NOT EXISTS) → `dc.org_code_remap`(append-only 트리거, PUBLIC 권한 회수) → `dc.department` 컬럼 3개 → C-코드 이관(①대상 upsert DO NOTHING ②참조 6곳 UPDATE ③C 행 DELETE ④잔존 시 RAISE, 모두 로그) → `department_dept_code_key`(dept_code 단독 유일) → student·org_assignment FK `ON UPDATE CASCADE` 재생성 → 전공 `M` 접두어 제거(+로그) → seed_source 원장 갱신(옛 LF·CRLF checksum 일 때만, 그 밖 값이 남으면 RAISE) → 뷰 11개 명시 DROP(CASCADE 없음)·재생성·`GRANT SELECT TO dc_app` → `dc.refresh_department_from_academic()`(SECURITY INVOKER, `search_path=pg_catalog`, PUBLIC EXECUTE 회수). `SET LOCAL lock_timeout='5s'`.
- 로컬 백업: `_workspace/backups/dreamcatch-before-0021-20261125-164553.dump`(pg_dump -Fc, 176 적용 전, Git 제외).
- 기존 DB 경로 검증(백업 복원 사본 `dc_0021_existing_test`): 176 적용 후 로그 = c_code_target department 62 · c_code_map department 63/student 8/org_assignment 30/department_staff_assignment 29/student_login_override 1/curriculum 60/subject 43 · c_code_delete department 16 · major_prefix 1,132. `dc.org_code_remap` 건수 = 176 이 바꾼 행 수(위 합계). 신규 DB(빈 DB 마이그레이션 → 시드) 경로: 176 은 C-코드 0건으로 통과, 시드가 학사 코드 학과 63행을 넣는다.

## 2. 변경 파일

**백엔드**
- `backend/app/student_login.py` — 조회를 `WHERE intg_uid=COALESCE((SELECT student_uid FROM dc.fixture_student_login WHERE student_no=%s),%s)` 단일 조건으로, `fixture_student_login_source` 폴백 제거.
- `backend/app/academic_students.py` — 로스터에서 `academic_people`·조직 d/m/c 조인 제거(학과·단대명은 `student_login_source`), 성별 라벨·필터(`'0'`=남, `'1'` 필터 = `sex_code<>'0'`, NULL 제외), `academicLevel` 판정을 UNIV_CD 로.
- `backend/app/student_contact.py` — `ACADEMIC_STATUS` 0003=수료·0004=제적으로 정정, `ACADEMIC_LEVEL`(대학원 = 01~12·91·92, 그 외 학부)·`SEX_LABEL` 상수 추가.
- `backend/app/roadmap_generator.py` — 조직 조인 4곳에 `lvl`(d·m=2, c=1, o=3).
- `backend/app/programs.py`(명단 엑셀 성별), `backend/app/survey.py`(만족도 스냅샷 성별), `backend/app/employment_report.py`(저장 스냅샷은 옛 `0001/0002`와 새 `0/1` 모두 해석, 학사 조회는 새 원값).
- `backend/app/department_assignments.py` — 후보 폴백·`ACTIVE_PROFESSOR_ORGS` 비활성 판정·배정 목록 후보 조인에 `role_code` 일치 추가(한 사번 두 역할).
- `backend/app/academic_directory.py` — 정렬 people=`intg_uid,emp_no,user_ty_cd`, organizations=`lvl,dept_cd`, people 검색에 `emp_no`.
- `backend/app/staff.py` — `/departments` 에 `univCode`·`active` 추가(기존 키 유지).
- `backend/app/seed.py` — 학과 시드의 `univCode`/`active` 를 넣고, 시드 뒤 재실행하는 **적용된 046** 의 조교 fixture C-코드(`C07:C07-07`, `C05:C05-03`)를 실행 직전 학사 코드(`5:414`, `8:205`)로 치환(§8-3).
- `backend/app/seed_care7_test_student.py` — 경영학과 `(8,205)`.
- `backend/scripts/sync_academic.py` — `--source dc-views`(기본 `mirror` 는 기존 동작 유지), `--query-timeout`·`--long-query-timeout`(SUGANG 1800s)·`--fetch-size`(5000). 결과셋당 메타 1회 캐시. 실패 메시지는 예외 클래스 + PostgreSQL 객체 이름만(행 값 없음).
- `backend/scripts/seed_local_academic_test_students.sql`(신규, 로컬 전용) · `backend/scripts/register_test_student.sql`(local_usr_inf·학사 코드·성별 0/1·lvl) · 퇴역 스텁 3개(`care7_academic_test_students.sql`, `add_local_service_students_to_academic.sql`, `add_fixture_academic_profiles.sql` — 실행하면 exit 3 로 중단하고 대체 스크립트를 안내).
- 시드 5개(`backend/seeds/admin/departments.seed.json` 63행 + `univCode`/`active`, `deptAssigns.seed.json`, `v2/academic/{curriculum,subjects,studentAcademic}.json`) — C-코드 → 학사 코드, LF.
- `.gitattributes` — 위 시드 5개 `text eol=lf` 고정(원장 checksum 이 작업본 바이트라 Windows autocrlf 가 CRLF 로 바꾸면 `app.seed` 가 멈춘다).

**테스트**
- 신규: `backend/tests/contracts/test_academic_contract.py`, `backend/tests/academic_test_support.py`(원본 대역 `dc_v_*`·`local_usr_inf` 삽입 헬퍼).
- 확장: `backend/tests/test_academic_sync.py`(dc-views 6건), `backend/tests/test_student_login.py`(3건), `backend/tests/test_department_assignments.py`(한 사번 두 역할 1건).
- `academic.v_usr_inf`/옛 코드에서 이전: `test_academic_students`, `test_care7_test_student`, `test_diagnosis_retake`, `test_diagnosed_metadata`, `test_employment_report`, `test_department_assignments`, `test_student_login`, `test_student_contact`, `test_retire_jiwoo`, `test_register_test_student`, `test_academic_sync`, `test_academic_directory`('89'→'0006').

**프론트**
- `src_admin/pages/AcademicDirectory.tsx` — 상태 0006 재직(기본)·00007 퇴직·0001~0005, people 에 사번, organizations 에 구분 코드, 상담사·조교 담당 데이터셋에 「이전 학사 코드 기준(동결)」 안내.
- `src_admin/components/StudentChargeTable.tsx` — 성별 옵션 `'0'`/`'1'`(키 `sexCode` 유지).
- `src_admin/components/StatsFilterBar.tsx` — `/departments` 드롭다운은 `active` 만, 같은 학과명이 둘 이상이면 `(과정)` 을 붙인다.
- `src_admin/data/schema/department.ts` — `course?: string`, `univCode?: string|null`, `active: boolean`(쓰지 않게 된 `DegreeCourse` 타입 제거).

**문서**: `DB.md` §3-3·§9 #46(옛 미러 삭제 기한)·#47(SSO 로그인ID→사번), `docs/ACADEMIC_SYNC.md`(전산원 절·첫 적재 결과), `docs/STUDENT_LOGIN.md`, `CLAUDE.md` 규칙 8, `SPEC.md` §7-2·§7-3·§7-4, `DB_SCHEMA.md`(176·177 로컬 적용).

## 3. 실행한 명령과 결과

| 단계 | 명령 | 결과 |
|---|---|---|
| 변경 전 기준선 | `backend/.venv/Scripts/python.exe scripts/run_regression.py` | **10 failed / 765 passed / 2 skipped** |
| 테스트 DB 재구축 | `bash backend/scripts/rebuild-test-db.sh` | 마이그레이션 → 시드 imported(41 파일) 통과 |
| 변경 후 회귀(176+177) | `scripts/run_regression.py` (빈 DB 전체 마이그레이션 → 시드 → pytest) | **10 failed / 779 passed / 2 skipped** — 실패 10건은 기준선과 **같은 테스트·같은 메시지**(아래) |
| 독립 실행 테스트 | `python tests/test_academic_directory.py`(로컬 `dreamcatch`, 앱 계정 읽기 전용) | 2 passed |
| 빌드 게이트 | `npx tsc -b` | exit 0 |
| 빌드 | `npm run build` | exit 0 |
| 기존 DB 사본 시드 원장 | `python -m app.seed`(사본) | 0021 시드 5개 checksum = 파일 sha256 확인. **이 작업과 무관한 기존 원장 불일치 3건**(`students/chaewon.json`·`changwon.json`·`popups.seed.json`)이 변경 전부터 있어 그대로면 RuntimeError — 사본에서 그 3행만 맞춘 뒤 `already_imported` 확인. 로컬 `dreamcatch` 는 같은 3건 때문에 `app.seed` 가 여전히 멈춘다(변경 전과 동일) |

기존 실패 10건(변경 전후 동일): 메모리 지침의 4건 `test_boot_contract::test_student_portal_boots_while_the_plan_is_a_draft`, `test_boot_contract::test_student_type_is_one_answer_for_screen_and_server`, `test_counsel_history_menu::test_counsel_history_menu_keeps_existing_contract`, `test_development_roadmap::test_staff_requires_both_menu_and_student_scope` + 변경 전부터 실패하던 6건 `test_api::test_server_pagination_and_aggregates`, `test_development_roadmap::test_out_of_scope_student_denied`, `test_diagnosis::test_result_access_and_precomputed_not_exposed`, `test_growth::test_portfolio_projection_has_no_shared_sample_data`, `test_retire_jiwoo::test_exact_fixture_retirement_preserves_other_students_and_masters`(단독 실행은 통과 — 전체 실행 순서 의존), `test_roadmap_generator::test_live_provider_creates_without_fixture_and_records_actual_inputs`. 로그: `backend/var/dc_regression_20261125073503_feac8e_test.log`(전) · `dc_regression_20261125081504_3bb0ac_test.log`(후).

## 4. 실적재 동기화 보고 (로컬 `dreamcatch`)

비밀번호: `.env.local` 의 `dbpw` 값을 Git 제외 `deploy/secrets/oracle_password_local` 에 출력 없이 덮어썼다. Oracle 로그인 실패 0회. 로그: `_workspace/sync/dc-views-{first,second,rerun}.log`(Git 제외, 건수·해시만).

- **1차**: 메타 대조 통과·14개 뷰 스테이징 대조 일치 → 공개 트랜잭션의 학과 투영에서 `NotNullViolation`(`dc.department.is_active`) → **전체 롤백, 공개 없음**. 원인과 수정은 §8-1.
- **2차(177 적용 후)**: `COMMITTED: 14 views published`.

| 뷰 | 행 | sha256(가산 해시) | 추출 s |
|---|---:|---|---:|
| INTRANET.DC_V_ADD_JOB_PART | 17 | 5324fce2061bbc1ab49958acae6e03c2e7d913edba79583a35f2046d9fd02071 | 0.0 |
| INTRANET.DC_V_COL_INF | 16 | 15cdc9328dff52809f420ec01fc5bb58697d97c37a0a74d10097e8e470160c47 | 0.0 |
| INTRANET.DC_V_DEPT_INF | 595 | 3951648e7e3fdc3d4193f2befadc48857a1d80107a72dcf21ee73e37c19317b1 | 0.2 |
| INTRANET.DC_V_MAJOR_INF | 782 | f81c6cec07c5ae7a94517b3a1a57743d095445d700663e87919098d16b8b647d | 0.2 |
| INTRANET.DC_V_ORG_INF | 180 | 08e64b11a5a2ede6acdc7fb1a5973ba59f7d8ef3be7fd9aa16b0525cba77f052 | 0.0 |
| INTRANET.DC_V_PART_INF | 875 | ee9e79443b0a9388faf60c6b9a6c91feb61127560bee45a403dc62b08d43f86c | 0.1 |
| INTRANET.DC_V_USR_INF | 117,378 | 4fcb7f31828d65b9d354feb20df0e8cca9f691c23624f22e83636f5c19f9b522 | 28.3 |
| REQUEST.DC_V_CAP_INF | 390 | acca7f8fc07ad50cf61ad127388a00efa7f88f7f4a068fcd452c28c4e0b92fe6 | 0.1 |
| REQUEST.DC_V_CODE_INF | 352 | eceb72e1be65b76eeeecd15ec7a3b32529f632552cd6f5cd3355aef191bf51ff | 0.1 |
| REQUEST.DC_V_CURRI_INF | 54,092 | 49c5bf4e374196207efc4ad6c193c8b0f516637289afbdfbf4159d3240cb130c | 5.5 |
| REQUEST.DC_V_STU_CAP_INF | 97,715 | d7446e8bff5cdc296eb4f055f7baa9fb8e271939bad5b3d8b845ac57d25c8de1 | 6.2 |
| REQUEST.DC_V_STU_SUGANG_INF | 4,326,226 | f9c1159c5f6a990ee1962708eecbe62e4040e2544301c05ea2bfa2661282473b | 453.1 (대조 포함 515.9) |
| REQUEST.DC_V_SUBJ_INF | 34,193 | d43ef67726b23d132aeab25e99220b73bcad059e9d83ed282c33803bc138bfe9 | 2.6 |
| REQUEST.DC_V_USR_MAJOR_INF | 23,133 | 03c0f15adc9101b584e35951252ca8f327d5f2fdd31263c801d6924ce63bfccc | 2.2 |
| REQUEST.DC_V_LECT_OPEN_INF | — | missing | |
| REQUEST.DC_V_LECT_CAP_INF | — | missing | |

- 행 수는 work-order §1 실측과 전부 일치. 공개 트랜잭션 11.5초, 공개 WAL 944,575,248 B(≈0.94GB). SUGANG 힙 418,037,760 B · 인덱스 61,521,920 B · 합계 479,698,944 B(첫 적재. 이후 갱신마다 dead tuple 로 약 2배 예상). `dc_v_usr_inf` 45MB.
- 공개 전 검사(중단 조건): 학생 INTG_UID 중복 0 · DEPT_CODE 중복 0 · COL_CODE 중복 0 · 로컬 충돌 0. 보고만: USR INTG_UID 중복 1(교직원) · SUGANG 논리 키(INTG_UID+YEAR+SMT+GRAD_DIV+CURI_NUM) 중복 **32** · **같은 EMP_NO·다른 USR_NM 1건** · 그 밖 논리 키 중복 0.
- 학과 투영(refresh): upserted 533 · moved 0 · deactivated 0 · collegeUnlinked 0 · studentsAligned 11 → `dc.department` 595(활성 389). `course` 는 CODE_INF `UNIV_CD` 표시명(학부 318 · 대학원(석사) 95 · 대학원(박사) 66 · 특수대학원 03~12 · 전문학사 21).
- **3차(같은 데이터 재실행, `unchanged` 확인)**: `COMMITTED: 1 views published, 13 unchanged`. 13개 뷰는 (행 수, 해시)가 같아 DELETE+INSERT 를 생략했다(SUGANG 포함 — 공개 1.1초, WAL 97,706,080 B, refresh moved/upserted/deactivated/aligned 모두 0). **USR_INF 만 해시가 달라 다시 공개**했다(행 수 117,378 동일, 해시 `4fcb7f31…` → `6d5422a8…`). 직후 USR_INF 를 한 번 더 원본에서 읽어 해시를 계산하니 공개된 사본과 같았다(`6d5422a8…` = `6d5422a8…`) — 해시는 결정적이고, 두 실행 사이(약 1시간) 원본 값이 실제로 바뀐 것이다. 최근 3시간 `UPD_DT` 행은 0건이라 이 변경은 UPD_DT 에 반영되지 않았다(haksa.md §1·§6-8 「UPD_DT 는 변경 일부만 반영」과 일치 — 증분 적재에 UPD_DT 를 쓰지 않는 근거). 그래서 「같은 데이터 재실행 시 전 뷰 unchanged」는 원본이 그대로였던 13개 뷰로 확인했고, USR_INF 는 원본 변경으로 재공개가 맞는 동작이다.

## 5. 동기화 후 검증 (architecture-review §8-6)

| 항목 | 결과 |
|---|---|
| C-코드 잔존(학과·학생·조직배정·학과담당·override·교육과정·교과목) | **0** |
| 학사 출신 `dc.student` college/dept NULL | **0**(원본에 있는 학생 기준도 0). 11명 정합 로그 `academic_alignment` |
| 학생 로그인 투영 | 106,108행 = 원본 학생 106,101 + 로컬 7, uid 중복 0, 학과·단대 NULL 0. 학적: 0001 8,328 · 0002 2,810 · 0003 3,653 · 0004 16,796 · 0005 74,465 · NULL 56 |
| 활성 배정 (college,dept) ∉ DEPT_INF | **1건** — `4312bd06-fafb-4916-a633-b449e81d0611`(assistant, source `academic_assistant`, `HD0001/1802`, major `Z101` — 옛 미러 트리의 기관 코드 계열). 삭제·비활성하지 않았다(팀장 판단) |
| 활성 배정 major ∉ MAJOR_INF(같은 DEPT_CODE) | **0** (접두어 제거 후 169행 전부 적중) |
| 활성 배정 staff_uid 의 후보(EMP_NO) 적중 | assistant: 74명 중 **70 적중**(재직 60 · **퇴직/비재직 10**), 미적중 4. professor: 24명 중 **0** — 전부 `source='legacy'`(29행, `legacy_id` 있음 → 학과 스코프 대상 아님) 이고 staff_uid 가 fixture 교수 ID 다 |
| 조직 트리 | lvl1 16(사용 14) · lvl2 595(389) · lvl3 750(526) — lvl3 는 gubun 0 포함, DEPT_CODE NULL 전공 32개 제외 |
| 후보 | professor 3,986(재직 1,843) · assistant 601(재직 104) |
| 테스트 학생 스크립트 | 리허설: 대상 7 · 학사 학과 7 · 같은 학과 기증자 7 · 원본 충돌 0 → 적용 `INSERT 0 7`, 재실행 `INSERT 0 0`. 가드: DB 이름 불일치·confirm 누락 모두 exit 3. 값은 출력하지 않음 |
| 검증 학번 로그인 투영 | 20243003 → 5/405 · 20262324 → 5/507 · 20990001(→20211304) → 8/214 · 20990002(→20196208) → 2/201 · 20441231 → 5/414 · 20180001(override, 졸업 0005) → 5/714 · 20261231(override) → 8/205 — 모두 1행, `dc.student` 조직 코드 일치 |
| jsonb 잔재 | C-코드 토큰(`C01`~`C10`, `Cnn-nn`) 일치 0. work-order 의 건수(program.detail 2 등)는 `C0…` 부분 문자열 오탐(hex id `S_…C0…` 등)으로 확인 — 업무 의미 없음. seed_source 5건은 176 이 갱신 |

## 6. EXPLAIN 증거 (로컬 `dreamcatch`, jit=off, ANALYZE)

- **로그인**(`student_login_source` by uid): `Index Scan using ix_dc_v_usr_inf_intg_uid on dc_v_usr_inf` (Index Cond `intg_uid = COALESCE((InitPlan 1).col1, '…')`) + `Index Scan using local_usr_inf_pkey` + `Index Scan using ix_dc_v_dept_inf_dept_code`. 20262324: Planning 1.7ms / **Execution 0.47ms**. 20990001(fixture 번호 → 로컬 인원): **0.19ms**. 전체 스캔 없음(작은 표 col_inf 16행·override·fixture 만 seq).
- **교수·조교 스코프**(`staff_student_scope WHERE staff_uid=… AND student_uid=…`, 실제 적중 1행 — 재직 조교 후보 1명을 롤백 트랜잭션에서 dc.staff·학과 배정으로 임시 등록): `Index Scan using department_staff_assignment_target` → 후보 비활성 판정이 **`Index Scan using ix_dc_v_usr_inf_emp_no on dc_v_usr_inf`**(Index Cond `emp_no = '…'`)로 내려간다. Planning 2.0ms / **Execution 0.32ms**(Astra 기준 0.29ms 와 같은 수준). 로컬에는 현재 살아 있는 학과 스코프 행이 0이다(학과 담당 활성 배정의 staff 가 `dc.staff` 에 없음 — 변경 전과 같은 상태).
- 로스터 SQL(`/academic-students` 1쪽 20건, SQL 만, 앱 계정): 106,108명 **≈1.2s**(3회 1.24/1.21/1.20s), 검색 `q=컴퓨터` 0.24s, 연락 퍼널 23ms. 기준선(HTTP, 구 미러 92,521명) 1.71–2.16s 와 측정 방식이 달라 직접 비교는 Docker 재측정이 필요하다. `/departments` 응답 595행 ≈88KB(기준 80행 10.3KB).

## 7. mock → API 매핑

| 계약 | 결과 |
|---|---|
| `/auth/student/login`·`/me` | 키 `id,name,studentNo,major,grade` 불변(테스트: 졸업생·학적 NULL 허용, 교원·조교 거부, fixture 번호, override 우선, 원본 우선) |
| `/departments` | 기존 5키 + `univCode`(string\|null) + `active`(boolean). 시드 fixture(`departments.seed.json`)도 같은 7키로 맞췄다. C-코드 0, deptCode 유일 |
| `/academic-students`·상세·엑셀 | 항목 키 21개 불변. `sexCode` 원값 `'0'/'1'/null`, `sex` 남자/여자/없음, `academicLevel` 학부/대학원(90 학부, 91·12 대학원), `status` 0003 수료·0004 제적, 건수 = 학생 투영 건수 |
| `/system/academic/organizations` | 옛 컬럼 + `gubun_code`(끝), `lvl` 지정 정렬 |
| 프론트 | 성별 옵션 0/1, 상태 0006/00007, 드롭다운 active — 소스 수준 계약 테스트 |

## 8. 승인 설계와 다르게 간 곳 · 판단

1. **migration 177 추가**(설계는 176 하나). 176 의 refresh 가 `is_active = (USE_FLAG='1')` 로 NULL 을 넣어 첫 실적재 공개가 롤백됐다(원본 `DEPT_INF.USE_FLAG` 는 NULLABLE). 176 은 이미 로컬에 적용돼 checksum 이 고정이라 `CREATE OR REPLACE FUNCTION` 만 하는 177 로 `COALESCE(USE_FLAG='1', false)` 로 고쳤다. 의미는 설계 그대로(‘1’ 이 아니면 비활성). 재현 테스트(`USE_FLAG` NULL 학과)를 `test_academic_sync` 에 넣었다. **Astra 사후 확인 필요**(함수 본문 1식 변경, 권한·시그니처 동일).
2. **refresh 의 학생 정합이 `major_label` 도 맞춘다.** 설계는 (college,dept) 만 명시했지만, 첫 로그인 때 '소속 미등록'으로 굳은 학사 출신 학생은 코드만 고치면 메인 화면 소속이 계속 비어 있다. 코드가 바뀌는 행에 한해 학사 학과명으로 라벨을 맞추고, 바뀐 행은 `academic_alignment` 로 로그에 남겼다(코드 변화만 기록, 라벨 이전값은 로그에 없음).
3. **적용된 046 의 C-코드**: `app.seed` 가 신규 DB 에서 시드 뒤 046 을 다시 실행하는데, 046 이 조교 fixture 배정을 `C07:C07-07`·`C05:C05-03` 리터럴로 넣어 새 시드 학과와 FK 충돌한다. 046 은 고칠 수 없으므로 `seed.py` 가 실행 직전에 그 두 리터럴만 `5:414`·`8:205` 로 치환한다(치환 대상이 없으면 assert 로 멈춘다).
4. `.gitattributes` 에 시드 5개 `eol=lf` 고정(원장 checksum 안정화). 다른 시드 파일은 건드리지 않았다.
5. 옛 `academic.v_usr_inf` 쓰기 스크립트 4개 중 `register_test_student.sql` 은 이전, 나머지 3개는 퇴역 스텁(실행 시 exit 3). `docs/ACADEMIC_STUDENT_ROSTER_2026-09-21.md`·`LOCAL_AI_WORKFLOW.md` 의 옛 스크립트 언급은 이력이라 두었다.
6. `/system/organizations`(관리자 조직배정 등록 폼, `SystemManagement.tsx`)는 `/departments` 가 아니라 비활성 학과도 나온다(과정·코드 표시는 이미 있음). 범위 밖이라 두었다 — 필요하면 후속.
7. 관리자 학사 조회의 옛 lvl4(기관 503행)는 새 트리에 없다(Astra 지적대로 업무 의존 없음).
8. `test_academic_sync` 의 dc-views 통합 테스트는 매번 빈 DB 를 만들어 전체 마이그레이션을 돌린다(약 3초).

## 9. 남은 제한 · 팀장 확인 항목

- **미수행(팀장 몫)**: `npm run docker:up`, ego-browser 검증(학생 20243003·20262324·20990001·20441231 로그인·메인 소속, admin 5역할 학생목록·학과배정·통계 콘솔 0·실패 0), HTTP 응답시간 전후 비교, 커밋·푸시. **주의: 로컬 `dreamcatch` 에 176·177 이 적용돼 있어 지금 떠 있는 옛 API 컨테이너는 폐기된 `fixture_student_login_source` 를 읽으므로 학생 로그인이 실패한다 — docker:up 으로 새 이미지를 올려야 한다.**
- 미매칭 활성 배정 1건(`4312bd06-…`), 퇴직·비재직 후보에 걸린 활성 조교 배정 staff 10명, 후보에 없는 조교 4명, fixture 교수 legacy 배정 24명 — 삭제·비활성하지 않았다.
- 로컬 `app.seed` 는 이 작업과 무관한 기존 원장 불일치 3건으로 여전히 RuntimeError(변경 전과 같음).
- 서버(CentOS)·신규 DB 에서는 `seed_local_academic_test_students.sql` 을 돌리지 않으면 fixture 로그인(20990001/2 포함)이 되지 않는다. 서버 반영 절차에 넣을지는 팀장 판단.
- 옛 미러 삭제: 검증 PASS 후 다음 번호 마이그레이션(DB.md §9 #46). SUGANG 의 정기 갱신 비용(WAL·dead tuple)과 새벽 스케줄 등록은 미착수.
- Atlas 공유 기억: 이 세션에 도구가 없어 조회·저장하지 않았다.
