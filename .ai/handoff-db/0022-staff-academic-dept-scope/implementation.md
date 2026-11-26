# 0022 구현 기록

- 상태: **IMPLEMENTED_FOR_LEAD_REVIEW**
- 구현: codex-sol-implementer 역할(Claude 위임 실행), 2026-11-26
- 근거: `work-order.md` rev 2 (READY_FOR_SOL) · `architecture-review.md` ASTRA_APPROVED(조건부) §2·§6 순서 · `baseline.md`
- **로컬 Docker DB(`dreamcatch`)에 179 를 적용하지 않았다.** 격리 테스트 DB(`dc_regression_*_test`)에서만 적용·실행했다. 커밋·푸시·배포 없음.

## 1. 변경 파일

| 파일 | 내용 |
|---|---|
| `backend/migrations/179_staff_academic_dept_scope.sql` (신규) | work-order §3-1 rev 2 SQL 그대로 — `dc.department_academic_grant`, `dc.department_academic_student_scope`, `dc.staff_student_scope` CREATE OR REPLACE(5번째 가지 `department_academic`), `SET LOCAL lock_timeout='5s'`, 세 뷰 `GRANT SELECT … TO dc_app`, 롤백 주석 |
| `backend/app/auth.py` | `student_access` 의 비상담사 교직원 허용 SQL(범위 `staff_student_scope` ∪ 본인 담당 `counsel_request`)을 `staff_may_read(conn, user, student_uid) -> bool` 로 추출. `student_access` 는 이 함수를 호출(동작 불변) |
| `backend/app/academic_students.py` | `authorize()` → `scoped` 반환(`students.1` 메뉴=전체 / `dc.staff.role_code` professor·assistant=범위 / 그 외 403). `roster_query(diagnosed, scoped)` — 범위 술어 `STAFF_SCOPE` 를 roster CTE 끝(`LEFT JOIN service v USING(intg_uid)` 다음) 한 곳에만, 자리표시자는 값 목록 맨 앞 uid(목록 `[uid,*filters,pageSize,offset]`, 메타 `[uid]`). 메타·목록·diagnosed 변형 공통. 범위 모드는 `readable` 쿼리 생략·`canReadDetail=True`. 상세는 점조회(+alias→intg_uid 해석) 뒤 `scoped` 이면 `staff_may_read` 검사, 범위 밖이면 행이 없는 것과 같은 경로(→ 같은 404, `optional=true` 면 `student_access` 경로)로 보낸다. 내보내기 `scoped` 이면 403 |
| `backend/tests/test_staff_academic_scope.py` (신규) | work-order §4 1~11 (아래 §3) |
| `src_admin/components/StudentRosterTable.tsx` | `professorId` 없고 `viewerRole` professor·assistant 이면 학사 로스터 모드 — 목록 `queryAcademicStudents`, 메타 `fetchAcademicStudentMetadata()`(기존 `src_admin/data/academicStudents.ts` 재사용, 새 data 함수 없음). 학적 기본값 「재학」. 학사 모드 목록 파라미터에서 `departments/studentIds/professorId` 제외. 지도학생(`professorId`) 경로는 `/students` 그대로 |
| `src_admin/pages/ProfessorStudents.tsx` · `AssistantStudents.tsx` | 부제 — 「현재 유효한 학과·전담학생 배정에 따른 학사 학생(서비스 미이용 포함)」 / 「현재 유효한 학과 배정에 따른 학사 학생(서비스 미이용 포함)」 |

migration 번호: **179**.

## 2. 지시서와 다르게 간 곳 / 해석한 곳

- 설계 변경 없음. SQL 은 지시서 텍스트 그대로다.
- **범위 밖 상세 404 문구**: 지시서 「학사 행이 있든 없든 범위 밖이면 같은 404 문구」를 「같은 요청에서 존재하지 않는 학생이 받는 응답과 같게」로 구현했다 — `optional` 없음: `학사 학생정보가 없습니다.`, `optional=true`: `student_access` 의 `학생을 찾을 수 없습니다.`(기존 경로). 테스트가 범위 밖 학생과 없는 학생의 응답 본문이 같음을 두 경우 모두 확인한다.
- 내보내기 403 문구는 `학생 목록 내보내기 권한이 없습니다.`(새 문구). 교수·조교 화면에는 내보내기 버튼이 없다.
- 메타는 범위 모드일 때만 파라미터를 넘긴다(`[uid]`); 상담사 경로는 이전처럼 파라미터 없이 실행한다(SQL 문자열 불변).
- 프론트 창 포커스 시 목록·메타 재조회(기존 동작)는 그대로 두었다. 진입 시 목록·메타 각 1회, 필터 변경은 목록만 다시 부른다(메타 effect 의존성은 범위 키뿐).

## 3. 테스트 (`backend/tests/test_staff_academic_scope.py`, 8개)

픽스처(롤백 전용 트랜잭션): 단대 1·학과 2(D1 범위·D2 범위 밖), 학사 학생(전공 M1), **local_usr_inf 학생**(M2), **override 학생 2**(D2→D1 유입 · D1→D2 유출), 범위 밖 학사 학생, 학사 행 없는 서비스 전용 학생 2(D1·D2). 배정: 교수 org_assignment 활성(D1), **만료 org_assignment**(valid_to 과거), 조교 **전공 배정**(D1·M1), **비활성 후보 조교**(학사 교직원 행 HOFC≠0006), **`dc.staff` 없는 배정**.

| 지시서 §4 | 테스트 | 확인 |
|---|---|---|
| 9 동일성 | `test_rewrite_matches_student_login_source_semantics` | 179 뷰 ↔ 참조 쿼리(활성 조건 × `student_login_source` (college,dept) + `academic_people.major_cd`) 양방향 EXCEPT 0(테스트 DB 전체), 픽스처 교직원 5명의 쌍 집합이 기대값과 정확히 일치(만료·비활성 후보·staff 없음 → 0, override 유입 포함·유출 제외, local 포함), `staff_student_scope` 에 서비스 전용 학생(org×student 가지) 유지 |
| 7 dc_app | `test_app_role_reads_new_scope_views` | `SET LOCAL ROLE dc_app` 으로 세 뷰 SELECT. 목록·메타 테스트도 `dc_app` 으로 API 를 실행 |
| 1·5 | `test_professor_lists_department_academic_students_and_metadata_stays_in_scope` | 서비스 미등록 학사 학생 포함 3명, 범위 밖 0, `totalCount = summary.total`, `options.majors/colleges/collegeMajors` 에 범위 밖 학과 없음, `dc.student` 행 증가 0 |
| 4 | `test_major_assignment_and_invalid_assignments_grant_nothing_else` | 전공 배정 조교는 M1 학생만, 비활성 후보 조교·만료 배정 교수 목록·메타 0 |
| 3·11 | `test_detail_scope_alias_counsel_and_existence_hiding` | 범위 안 200, 범위 밖 404 = 없는 학생과 같은 본문(optional 유무 각각), alias 해석 뒤 검사(범위 안 alias 200·밖 404), 서비스 전용 범위 안 `null` 200·밖 404, 범위 밖이나 본인 담당 `counsel_request` 있으면 200(목록엔 미포함), 무권한 교직원·학생 403(목록·메타·상세) |
| 2 | `test_release_removes_students_from_list_and_detail` | 배정 비활성화 후 목록 0·상세 404 |
| 6·8 | `test_counselor_unchanged_keys_match_and_export_is_counselor_only` | 상담사 결과(범위 밖 포함 5명)·`canReadDetail` 불변, 목록 최상위·항목 키 집합 교수 = 상담사(21키), 메타 summary/options 키 동일, 내보내기 교수·조교 403 · 상담사 200 |
| 10 | `test_diagnosed_variant_keeps_the_scope` | `filters.diagnosed=Y` 목록·`metadata?diagnosed=true` 모두 범위 밖 진단 학생 제외(상담사는 둘 다 보임) |

**변이 확인(red)**: 격리 DB 에서 ① `department_academic_grant` 의 dc_app GRANT 회수 + override 제외 조건 삭제 → 5 failed(동일성·dc_app·목록·전공·해제), ② 메타를 범위 없이 실행하도록 코드 변경 → 3 failed(목록/메타·전공·diagnosed). 원복 후 8 passed.

## 4. 실행한 명령과 결과

| 명령 | 결과 |
|---|---|
| 변경 전 기준선 `backend/.venv/Scripts/python.exe scripts/run_regression.py` (`dc_regression_20261126005224_d27aa3_test`) | **10 failed / 780 passed / 2 skipped** — 0021 기준선 10건과 같은 집합 |
| 대상 테스트 `run_regression.py -k "staff_academic_scope or academic_students or department_assignments or diagnosed_metadata or student_login"` (`dc_regression_20261126005923_80459e_test`) | 32 passed |
| `pytest tests/test_staff_academic_scope.py` (같은 DB) | 8 passed |
| `npx tsc -b` | exit 0 |
| 변경 후 격리 전체 회귀 `scripts/run_regression.py` | **10 failed / 788 passed / 2 skipped** (`dc_regression_20261126010347_4439d0_test`) — 실패 집합이 변경 전 기준선과 **동일(diff 0)**, 신규 실패 0. 통과 +8 = 새 테스트 8개 |

기존 실패 10건(전후 동일): `test_api::test_server_pagination_and_aggregates`, `test_boot_contract::test_student_portal_boots_while_the_plan_is_a_draft`, `test_boot_contract::test_student_type_is_one_answer_for_screen_and_server`, `test_counsel_history_menu::test_counsel_history_menu_keeps_existing_contract`, `test_development_roadmap::test_out_of_scope_student_denied`, `test_development_roadmap::test_staff_requires_both_menu_and_student_scope`, `test_diagnosis::test_result_access_and_precomputed_not_exposed`, `test_growth::test_portfolio_projection_has_no_shared_sample_data`, `test_retire_jiwoo::test_exact_fixture_retirement_preserves_other_students_and_masters`, `test_roadmap_generator::test_live_provider_creates_without_fixture_and_records_actual_inputs`.

eslint(참고, 게이트 아님): `StudentRosterTable.tsx` 의 `set-state-in-effect` 오류 1·`exhaustive-deps` 경고 1 은 변경 전부터 있던 줄(`setMetadataError('')`, 메타 effect 의존성 배열)이다.

## 5. mock→API 매핑

| 화면 | 이전 | 이후 |
|---|---|---|
| 교수 「학생 검색」 `/professor/students` | `GET /students` · `/students/metadata` (dc.student 범위) | `GET /academic-students` · `/academic-students/metadata` (학사 학생 × `staff_student_scope`), 학적 기본 「재학」 |
| 조교 「학생 현황」 `/assistant/students` | 같음 | 같음 |
| 두 화면 「보기」 | `GET /academic-students/{alias}?optional=true` 403 | 범위 안 200(학사 상세 / 서비스 전용 `null` → 기존 상세), 범위 밖 404 |
| 교수 「지도학생」(`professorId`) | `/students` | 변경 없음 |

응답 키는 상담사 모드와 같다(테스트 고정). 새 엔드포인트·새 data 함수 없음.

## 6. 남은 제한 · 팀장 확인 필요

- 179 는 로컬 Docker DB 에 **미적용** — `npm run docker:migrate`/`docker:up` 후 work-order §5 검증(ego-browser 교수 70201·조교 80301, 응답 시간, 상담사 전체 학생, 교수 기존 화면, `staff_student_scope` 행 수)은 팀장 몫.
- 학적 select 의 「재학」 기본값은 메타 `statuses` 에 「재학」이 없을 때(범위 학생이 전원 졸업 등) 선택 상자에 「전체」로 보이면서 필터는 「재학」으로 걸린다. 그 경우 목록도 0명이라 실사용 영향은 작다고 판단해 그대로 두었다.
- 작업 중 같은 작업 트리에 이 작업과 무관한 미커밋 변경이 생겼다(`backend/app/counsel_dashboard.py`, `backend/tests/test_program_selection.py`, `src_admin/data/counselorDashboard.ts`·`programs.ts`, `src_admin/pages/Home.tsx`·`ProgramDetail.tsx`·`ProgramShell.tsx`·`TestAdminHome.css`). 건드리지 않았고, 변경 후 회귀에는 그 변경도 함께 포함돼 실행됐다. 커밋 시 0022 파일만 골라야 한다.
