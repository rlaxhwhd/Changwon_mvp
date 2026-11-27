# 0024 구현 기록

상태: **IMPLEMENTED_FOR_LEAD_REVIEW (1·2단계)** — 2026-11-27, Sol(codex-sol-implementer 역할, 위임 실행).
기준: `work-order.md` rev2 + 팀장 rev3 소유 분담 문단, `architecture-review.md` §2 필수 조건·§6 실행 순서. 골든 패스 0023.

## 1단계 — 181 · growth · 학생 마이페이지 · growth 경로 테스트

### 변경 파일

| 파일 | 내용 |
|---|---|
| `backend/migrations/181_academic_profile_more.sql` (신규) | rev2 §3-1 그대로: `SET LOCAL lock_timeout='5s'` → `CREATE OR REPLACE VIEW dc.academic_student_details`(180 12열 + 끝에 `admission_date, completed_semesters, birth_date, home_phone`, WHERE 불변) → 새 뷰 `dc.academic_student_majors`(LATERAL LIMIT 1 세 개, ORDER BY 지시서와 동일) · COMMENT · `REVOKE ALL FROM PUBLIC` · `GRANT SELECT TO dc_app`. `security_invoker` 미사용. 인덱스·academic 스키마·176/179/180·`sync_academic.py` 무변경. 롤백 주석에 180 정의 SQL 전문과 순서(API 원복 → majors DROP → 의존 뷰 0 확인 → details DROP/CREATE/GRANT) |
| `backend/app/growth.py` | `academic_contact(conn, uid)` 를 한 SQL 문(details 점조회 + `dc.academic_student_majors` 상관 서브쿼리 `jsonb_agg(... ORDER BY major_seq, type_code)`)으로 확장, 가공 dict 반환(행 없으면 `None`). 가공 규칙은 이 함수(와 이 함수 전용 헬퍼 `academic_text`·`academic_date`·`GRAD_EXP_YM`) 안에만. 반환 키: `foreigner`(Y→True·N→False·그 외 None), `mobile·email·postCode·address`(0023 규칙 `or None` 그대로), `homePhone`(strip 후 빈 값 None), `birthDate`·`admissionDate`(유효한 YYYYMMDD 만 `YYYY-MM-DD`), `completedSemesters`(정수만 int), `graduationExpectedMonth`(`\d{4}(0[1-9]|1[0-2])` 만 `YYYY-MM`), `majors`(`[{typeLabel: label or code, majorName: name or code, statusLabel: label or None}]`, 코드 키 비노출). `profile_dto` 는 `ACADEMIC_PROFILE_KEYS` 명시 10키만 고른다(`foreigner` 없음). 호출처는 기존 본인 GET 2곳 그대로 |
| `shared/growthStore.ts` | `GrowthAcademic`·`GrowthAcademicMajor` 타입 추가, `GrowthProfile.academic` 에 6필드 |
| `src_v2/data/portfolio.ts` | `ProfileData` 에 `birthDate, admissionDate, completedSemesters`(「n학기」), `expectedGraduation`, `homePhone`, `majors`(「유형 전공명 · 상태」 문자열 배열, 상태 라벨 없으면 「유형 전공명」) — 빈 값 `''`/`[]` |
| `src_v2/pages/mypage/Portfolio.tsx` | 「학사 정보」 주전공 아래 다전공(여러 줄 `dd`, 없으면 `Value` 빈 표시 「미입력」)·생년월일·입학일·이수학기·졸업예정, 「연락처」 휴대폰 아래 집전화. 기존 `pf-dl`/`Value` 패턴만, CSS·색·폰트 변경 없음. 보기 전용(자기입력·저장 경로 무변경) |
| `backend/tests/test_academic_profile_display.py` | 아래 테스트 |

금지 파일(`academic_students.py`·`src_admin/data/academicStudents.ts`·`StudentDetailView.tsx/.css`·`CLAUDE.md`·`RAG_VECTOR.md`·`programs.py`)은 손대지 않았다. 작업 중 동시 세션이 그 4개 파일을 `6779c96` 으로 커밋했다(작업 트리 clean). 커밋·푸시 안 함.

### Migration

- 번호 **181**. 격리 `_test` DB 에만 적용(회귀 러너의 `app.migrate`). **로컬 개발 DB(dreamcatch) 미적용** — 팀장이 `npm run docker:migrate`.

### 테스트 (rev2 §4 중 growth 경로)

0023 기존 테스트 변경:
- §4-1 열 계약: `DETAIL_COLUMNS + 0023 2열 + 0024 4열`(끝에만 추가) 동등 단언.
- §4-4 소유자 `academic == {...}` 동등 단언을 새 10키 dict(`expected_academic`)·빈 학생 `EMPTY_ACADEMIC` 으로 **교체**(부분집합 단언 아님). 교직원 GET 비노출 검사를 `private_strings`(0023 연락처 + 집전화·생년월일/입학일 원값·표시값·다전공 이름·미등록 전공 코드)로 확장.
- §4-5 PATCH: `dc.idempotency.response` 비노출 검사를 `private_strings` 로 확장, 첫 응답·재생 응답 본문도 검사.

0024 신규(fixture 확장: `s` 에 합성 집전화(앞뒤 공백)·생년월일·입학일·이수학기 6·졸업예정 202702·다전공 3행(뒤섞어 삽입), `s0` 경계값, 학사 행 없는 서비스 학생 `sx`, 합성 코드 `Y1..Y4`·합성 전공 코드):

| 테스트 | 덮는 항목 |
|---|---|
| `test_0024_majors_view_columns_and_app_role_reads_new_columns` | 1(majors 뷰 열 순서) · 12(`SET LOCAL ROLE dc_app` 로 새 4열·majors 뷰 SELECT, 뷰는 원값) |
| `test_0024_duplicate_code_or_major_master_rows_do_not_multiply_majors` | 6(코드표 `MAJOR_TYPE`·`MAJOR_STAT` 중복 행 + 전공 마스터 중복 행 → 뷰 행 수 = 원천 3, 응답 `majors` 동일·라벨 결정적) |
| `test_0024_owner_academic_has_exactly_ten_keys_with_formats_and_boundaries` | 2 · 3 · 8(본인 키 정확히 10, `foreigner` 없음, 최상위 키 불변) · 9(공백만 집전화·NULL 이수학기·2월 30일·13월 입학일·13월 졸업예정 → None, 전공 마스터에 없는 코드 → 코드값, 라벨 없는 유형 → 코드값, 상태 NULL → None) · 10(같은 순번 유형 2개 + 다른 순번 → `(major_seq, type_code)`) · 졸업예정 미등록 → None |
| `test_0024_staff_reads_and_patch_carry_no_new_academic_values` | 4 · 7(a)(d)(e): `career_kim`·`psych_lee` 의 growth/profile·portfolio `academic=None`·비노출, PATCH 첫 응답·재생 응답 `academic=None`·비노출, 멱등 행에 값·새 키 이름 없음 |
| `test_0024_service_student_without_academic_row_gets_null` | 11(growth 쪽): `academic_contact` 가 행 없음에서 `None`, 본인 GET `academic=None` |

2단계로 미룬 것(지시대로): 5(학사 상세 6필드·범위 밖 404), 7(b)(c)·8 의 상세·목록·export 부분, 11 의 `optional=true` 상세.

### 실행한 명령과 결과

| 명령 | 결과 |
|---|---|
| `npx.cmd tsc -b` | exit 0 |
| `backend> .venv/Scripts/python.exe scripts/run_regression.py -k "academic_profile_display or growth or portfolio"` | **123 passed**, 693 deselected (`dc_regression_20261127030509_*` 후속 실행) |
| `backend> .venv/Scripts/python.exe scripts/run_regression.py` (격리 전체) | `dc_regression_20261127030714_b0df57_test` — **10 failed, 804 passed, 2 skipped** |
| 실패 집합 diff vs 기준선 `dc_regression_20261127010942_aba24e_test`(10 실패) | **diff 0**(같은 10건). 통과 +5 = 신규 0024 테스트 5개 |

동시 세션의 `academic_students.py` 변경(현재 `6779c96`)으로 인한 새 실패 없음 — 0023 상세·목록·export 테스트 통과.

### mock → API 매핑

| 화면 값 | API (`profile.academic`) | 원천 |
|---|---|---|
| 생년월일 | `birthDate` (YYYY-MM-DD) | `usr_inf.age` → `details.birth_date` |
| 입학일 | `admissionDate` (YYYY-MM-DD) | `enter_dt` → `admission_date` |
| 이수학기 「n학기」 | `completedSemesters` (int) | `isu_smt_cnt` → `completed_semesters` |
| 졸업예정 | `graduationExpectedMonth` (YYYY-MM) | `grad_exp_ym` |
| 집전화 | `homePhone` | `tel` → `home_phone` |
| 다전공 「유형 전공명 · 상태」 | `majors[{typeLabel, majorName, statusLabel}]` | `dc.academic_student_majors` |

새 API 호출 없음 — 기존 `GET …/growth/profile`·`GET …/portfolio` 응답 필드만 추가. 쿼리 수 +0(기존 점조회를 넓힘).

### 리뷰와 다르게 간 곳

1. **헬퍼 함수 분리**: 가공 규칙을 `academic_contact` 안에 두되, 문자열/날짜 변환은 같은 모듈의 작은 헬퍼(`academic_text`·`academic_date`·`GRAD_EXP_YM`)로 뺐다. 다른 호출처는 없다(규칙 위치는 growth.py 한 곳 그대로).
2. **0023 연락처 4키는 strip 하지 않는다**: 지시서 「`or None` 규칙 유지(동작 불변)」대로. strip 은 `homePhone` 에만 적용. 날짜·졸업예정 원값도 strip 하지 않는다(원천 형식 위반 0, 위반 시 None).
3. **교직원 비노출 검사 역할**: 지시서 예시의 교수(`prof`) 는 `students.1` 메뉴가 없어 growth GET 이 403 이라, 0023 관례인 `career_kim` 에 `psych_lee` 를 더해 검사했다(둘 다 200·`academic=None`).
4. **테스트 합성 코드**: 다전공 유형·상태는 원천에 없는 합성 코드(`Y1`~`Y4`)와 합성 라벨을 fixture 에서 넣었다 — 테스트 DB 의 학사 코드표 내용에 결과가 의존하지 않게.

### 남은 제한 / 2단계

- 2단계: `academic_students.detail()` 의 details 점조회를 `from .growth import academic_contact` 호출로 교체(범위 검사·`optional` 분기 뒤), `grad_exp_ym` 별도 파싱 제거, 응답 6키 추가, 테스트 5·7(b)(c)·8 상세/목록/export·11 optional. 동시 세션이 4개 파일을 `6779c96` 으로 커밋했으므로 rev3 조건상 착수 가능 상태.
- 화면 실측(ego-browser)·로컬 Docker 반영·`dc_app` 실행 검증은 팀장 §5.
- 다전공이 많은 학생(재학생 최대 9행)은 「학사 정보」 패널에서 다전공 칸이 여러 줄이 된다 — 상태 활성 우선 정렬 등은 Astra 비차단 권고 1(팀장 판단).

## 2단계 — 학사 상세 API · 교직원 화면 · 상세/목록/export 테스트

착수 조건: 동시 세션이 4개 파일을 dev `6779c96` 으로 커밋하고 사용권을 넘김(work-order rev4). 그 레이아웃 위에 최소로 더했다.

### 변경 파일

| 파일 | 내용 |
|---|---|
| `backend/app/academic_students.py` | `from .growth import academic_contact`. `detail()` 의 범위 검사·`optional` 분기 **뒤** details 점조회(`foreigner_code,mobile,email,post_code,address,grad_exp_ym`)를 `academic_contact(conn, identity) or {}` 한 호출로 대체(쿼리 수 +0). 별도 `grad_exp_ym` 파싱 삭제 — `graduationExpectedMonth` 키·「YYYY-MM」 형식은 공통 함수 값. `foreigner·mobile·email·postCode·address` 값 규칙 불변. 응답에 `homePhone, birthDate, admissionDate, completedSemesters, majors` 추가(학사 행 없으면 None/`[]`). `majorName`(6779c96)·ROSTER·목록·export·메타 무변경 |
| `src_admin/data/academicStudents.ts` | `birthDate` 의 `?` 제거, `admissionDate`·`completedSemesters`·`homePhone`·`majors`(`GrowthAcademicMajor[]`, shared 타입 import) 추가 |
| `src_admin/components/StudentDetailView.tsx` | 인적사항 표: 마지막에 「집전화」 span 행(빈 칸이 없어 새 행). 기본사항 탭: 「입학일」(점 표기 — 생년월일과 같은 `replaceAll('-', '.')`)·「이수학기」(「n학기」) 1행, 「다전공」 `InfoCell span` 1행(전공마다 한 줄 `div`). `BasicInfo`·`basicInfoOf` 에 3필드. 서비스 전용 학생 분기(`academicData` 없음)는 기존 객체 그대로라 새 칸은 「없음」. 새 CSS 클래스·색·`.css` 변경 없음, td 직접 생성 없음(`InfoCell` 이 `dc-cell-long` 을 붙임) |
| `shared/growthStore.ts` | `academicMajorText(major)` — 「복수전공 경영학과 · 이수 중」(상태 없으면 「복수전공 경영학과」). 학생 마이페이지와 교직원 상세가 같이 쓴다(문자열 규칙 복제 방지) |
| `src_v2/data/portfolio.ts` | 1단계의 인라인 문자열 조합을 `academicMajorText` 로 교체(출력 동일) |
| `backend/tests/test_academic_profile_display.py` | 아래 3개 테스트 + 상세 키 상수 |

### 테스트

| 테스트 | 덮는 항목 |
|---|---|
| `test_0024_academic_detail_carries_new_fields_in_scope_only` | 5 · 8(상세): `career_kim`·범위 안 교수 — 최상위 키 = 기존 27키 + 0024 5키(정확히), 6필드 값이 본인 GET 과 같음, 0023 연락처·`foreigner` 불변, 경계 학생 `s0` → None/`[]`·키 집합 동일. 범위 밖 교수 404(`optional` 유무 둘 다) · 7(b) 404 본문 비노출 |
| `test_0024_list_and_export_carry_no_new_fields` | 7(c) · 8(목록·export): 목록 항목에 새 키·`graduationExpectedMonth` 없음, 목록·엑셀(헤더 13열, 1행)에 합성 값 없음 |
| `test_0024_service_only_student_optional_detail_is_null` | 11(상세): 학사 행 없는 서비스 학생 `optional=true` → 200 `null`, 없이 → 404 |

### 실행한 명령과 결과

| 명령 | 결과 |
|---|---|
| `npx.cmd tsc -b` | exit 0 |
| `run_regression.py -k "academic_profile_display or academic_students or staff_academic_scope or growth or portfolio"` | **144 passed**, 675 deselected (`dc_regression_20261127031317_4b6aee_test`) |
| `run_regression.py` 격리 전체 | `dc_regression_20261127031348_374b5d_test` — **10 failed, 807 passed, 2 skipped** |
| 실패 집합 diff vs `dc_regression_20261127010942_aba24e_test` | **diff 0**(같은 10건). 통과 +8 = 0024 신규 테스트 8개(1단계 5 + 2단계 3) |

### 리뷰·지시와 다르게 간 곳

1. 다전공 표시 문자열 함수 `academicMajorText` 를 `shared/growthStore.ts` 에 두고 두 SPA 가 같이 쓴다(지시서는 위치를 정하지 않음 — 복제 금지 규칙에 따름).
2. 집전화는 인적사항 표에 빈 칸이 없어 span 새 행으로 넣었다(한 칸만 있는 4열 행의 빈 셀을 피함).
3. 상세 최상위 키 단언은 「기존 + 6」 대신 「기존 27(이미 `graduationExpectedMonth`·`majorName` 포함, 6779c96) + 5」로 적었다 — `graduationExpectedMonth` 는 6779c96 에서 이미 키였고 0024 는 값의 출처만 공통 함수로 바꿨다.

### 남은 제한

- 팀장 §5: `npm run docker:migrate`(181)·`docker:up`, `dc_app` 실행, ego-browser 로 20262324·다전공 보유 재학생 마이페이지와 상담사 학사 상세 재측정(호출 수·`GET /academic-students/{id}` 53~79ms 기준 비교·1280px). 미수행.
- Astra 비차단 권고 1(취소·포기 다전공 표시 순서)·2(sync 차단 검사 승격)는 반영하지 않음 — 다전공은 원천 순서(`major_seq, type_code`)대로 상태 라벨과 함께 전부 보인다.
