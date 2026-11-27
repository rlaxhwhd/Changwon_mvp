# 0023 구현 기록 — 학사 GPA·핵심역량·연락처·주소 표시

- 상태: **IMPLEMENTED_FOR_LEAD_REVIEW**
- 구현: codex-sol-implementer 역할(2026-11-27). 기준 지시서 `work-order.md` rev 3 + `architecture-review.md` §2 필수 조건.
- 시작 조건 메모: `architecture-review.md` 승인 revision 은 **2**, 현재 지시서는 **rev 3**(〔rev3 팀장〕 §3-2-6 — DB 객체 변경 없음, Astra 승인 뷰만 사용). 팀장 지시로 진행했다. `.ai/db/GOLDEN_PATH.md` = READY.
- Graft MCP 는 이 세션에 노출되지 않아 호출자 추적은 원본 grep 으로 했다(`resolve_student` 2종·`profile_dto`·`apply_academic`·`academic_student_details` 소비처·`getCompetencyAxes`/`getCompetencyRadar` 소비처).
- 학생 실제 행 값은 출력·기록하지 않았다(테스트는 합성 값, 로컬 DB 확인은 건수만). Oracle 접속·CentOS 배포·커밋·푸시 없음.

## 1. 변경 파일

| 파일 | 내용 |
|---|---|
| `backend/migrations/180_academic_profile_display.sql` (신규) | §3-1 〔rev2〕 SQL 그대로 |
| `backend/app/students.py` | `profile()` — ① 〔rev3〕 `student_gpa()` 가 `legacy_detail`·null 일 때만 `academic_student_details.academic_gpa` 로 `gpa`(str)·`gpaSource='academic'` ② 개발 fixture 분기 **다음**·개발 누계 분기 **앞**에 학사 핵심역량 분기(5행·5코드일 때만 `ACADEMIC`, 값 float) |
| `backend/app/growth.py` | `resolve_student` 에 `LEFT JOIN dc.academic_student_details x` 로 `academic_gpa`·`isu_grade AS academic_credits` **두 열만**. 연락처 helper `academic_contact()` 신설. `profile_dto(student,row,owner,contact=None)` — `gpa` 학사 우선, `credits`(number), `academic`(owner 이고 contact 가 있을 때만, 빈 문자열→null). `GET …/growth/profile`·`GET …/portfolio` 는 owner 일 때만 contact 조회·전달. **PATCH 는 전달하지 않음**(`academic: null`) |
| `backend/app/jobs.py` | `resolve_student` 같은 2열 JOIN. **채용 지원(`POST /jobs/{id}/applications`)의 인라인 학생 SELECT 에도 같은 2열 JOIN**(§2 참조) |
| `backend/app/portfolio_document.py` | `apply_academic` — `student.get('academic_gpa')` 우선, 없으면 `detail.gpa` |
| `backend/app/academic_students.py` | 상세의 기존 `foreigner_code` 점조회를 `foreigner_code,mobile,email,post_code,address` 로 넓힘(추가 쿼리 없음, 범위 검사·`optional` 분기 뒤 그대로). 응답에 `mobile·email·postCode·address`(빈 문자열 null). `ROSTER`·목록·메타·export 불변 |
| `backend/tests/test_academic_profile_display.py` (신규) | §4 1~10 (8개 테스트) |
| `src_v2/data/competency.ts` | `CompetencyAxisView.plot` 추가, `target`·`gap` → `number \| null`. `ACADEMIC` 이면 `plot = score/peak*100`(peak 0 이면 0), target·gap null. 그 외 `plot=score`, 기존 target·gap. `formatCompetencyScore()`(소수 둘째 자리·뒤 0 제거). `getCompetencyOverall` 불변 |
| `src_v2/components/CompetencyRadarChart.tsx` | 현재 면 = `plot`, 목표 면은 모든 축 target 이 있을 때만, aria-label 은 원점수 |
| `src_v2/pages/Main.tsx` | 막대 `--value` = `plot`, 숫자 = 원점수 표기, 목표선 없으면 「목표 수준」 범례 숨김, 학사일 때 범례 줄에 「학사 핵심역량 원점수 · 그래프는 내 가장 높은 역량 기준」 |
| `src_v2/pages/AiLounge.tsx` | 변경 없음(차트 컴포넌트가 목표 면을 자동으로 숨긴다) |
| `src_admin/data/studentDetail.ts` | `weakest` — gap 이 null 이면 `plot` 최소 축 |
| `src_admin/components/StudentDetailView.tsx` | 「역량 GAP」 — 학사면 설명 문구 교체, 목표 마커·「목표 수준」 범례·갭 숨김, 원점수 표시, 막대 폭 `plot`. `AcademicStudentHeader` 에 휴대폰·이메일·주소(「(우편번호) 주소」, 없으면 「없음」, 긴 값은 title) |
| `src_admin/components/StudentDetailView.css` | 학사 식별 바 셋째 줄 배치(휴대폰·이메일 5열, 주소 10열). 기존 클래스·토큰만 |
| `src_admin/data/academicStudents.ts` | `AcademicStudentDetail` 에 `mobile·email·postCode·address` |
| `shared/growthStore.ts` | `GrowthProfile` 에 `credits: number \| null`, `academic: {…} \| null` |
| `src_v2/data/portfolio.ts` | `ProfileData` 에 `academicEmail·academicPhone·address·credits`. `email/phone` 은 자기입력 원값 그대로 |
| `src_v2/pages/mypage/Portfolio.tsx` | 학사 정보에 이수학점, 연락처 = 학사 값 우선·없으면 자기입력, 주소 추가, 출처 문구 교체, 새 패널 「핵심역량」(`getCompetencyAxes(getActiveStudent())`, 없으면 Empty「학사 핵심역량 점수가 아직 없습니다」). **`saveIntro` 는 `dto.profile.email/phone` 원값**을 보낸다 |

`CLAUDE.md`·`DB_SCHEMA.md`·`backend/app/programs.py` 등 다른 세션 변경은 건드리지 않았다(`DB_SCHEMA.md` 의 180 문단 「미적용」 표시도 그대로 — 팀장이 갱신).

## 2. 지시서와 다르게 간 곳

1. **채용 지원 경로에 JOIN 추가** — 지시서 §3-2-5 는 「`apply_academic` 호출자의 학생은 전부 두 resolve 함수에서 온다(`jobs.lock_portfolio` 포함)」고 했으나, 실제 `jobs.apply()`(`POST /jobs/{posting_id}/applications`)는 `resolve_student` 를 거치지 않고 학생을 인라인 SELECT 로 읽어 `lock_portfolio`→`apply_academic` 에 넘긴다. 그대로 두면 **제출 시점 검사·스냅샷의 GPA 가 포트폴리오 화면(학사 평점)과 달라진다.** 지시서의 「다른 경로가 생기면 같은 JOIN 을 건다」에 따라 같은 2열(GPA·이수학점) JOIN 만 추가했다. 연락처·주소는 싣지 않았다(스냅샷은 `snapshot_values` 가 명시 키만 쓰므로 새 열이 들어가지 않는다). 이 경로 자체를 직접 단언하는 새 테스트는 없다 — 기존 `test_jobs`·`test_student_portfolio` 제출 테스트가 회귀로 통과.
2. 학사 행이 없는 학생(owner)의 `academic` 은 `{…: null}` 이 아니라 `null` 이다(§3-2-3 「contact 를 받았을 때만」 문자 그대로 — 점조회 결과가 없으면 contact 없음). 학사 행이 있고 값이 빈 문자열이면 `{mobile:null,…}`.
3. Main 의 학사 안내 한 줄은 새 클래스 없이 기존 `.competency-legend` 줄의 `<span>` 으로 넣었다(디자인 토큰·기존 클래스만 규칙).

## 3. 실행한 명령과 결과

| 명령 | 결과 |
|---|---|
| 격리 DB `dc_0023_sol_test` 생성(run_regression 과 같은 env, migrate+seed — 스크래치 스크립트) | 180 적용 성공, seed imported |
| `pytest tests/test_academic_profile_display.py` | **8 passed** |
| 관련 기존: `test_gpa_policy test_care7_test_student test_competency_examples test_staff_academic_scope test_academic_students test_growth test_student_portfolio test_core_competency test_empty_student_profile test_boot_contract test_growth_catalog test_growth_journal` (+신규) | 173 passed, 2 failed(`test_boot_contract` 2건) — **HEAD 코드로 되돌려 같은 DB 에서 돌려도 같은 2건 실패**(기존 실패, 아래 기준선 집합에 포함) |
| `test_jobs test_job_wish_deadline test_academic_sync test_student_contact` | 52 passed |
| `scripts/run_regression.py`(새 격리 DB `dc_regression_20261127010942_aba24e_test`, 전체) | **10 failed, 799 passed, 2 skipped** — 실패 10건 집합이 직전 기준선(`dc_regression_20261126011832_f242df_test.log`, 10 failed·788 passed)과 **동일**(diff 0). 통과 +11 = 신규 8 + 0022 이후 추가분 |
| `npx.cmd tsc -b` | exit 0 |
| `npm run docker:migrate` (로컬 개발 DB, 백업 `_workspace/db-backups/local-before-migrate-20261127011359360.dump`) | `Applied 180_academic_profile_display.sql` |
| 로컬 DB `SET LOCAL ROLE dc_app` 집계(건수만) | details 106,108행(우편번호 105,113·주소 105,592 채움) · cap 97,715행·19,543명·5코드 · 서비스 학생 중 5행 보유 6명 · 검증 학생 2명 cap 0행 — Astra 실측과 일치 |

기존 실패 10건(이번 변경 무관, 기준선과 동일): `test_api::test_server_pagination_and_aggregates`, `test_boot_contract` 2건, `test_counsel_history_menu::…keeps_existing_contract`, `test_development_roadmap` 2건, `test_diagnosis::test_result_access_and_precomputed_not_exposed`, `test_growth::test_portfolio_projection_has_no_shared_sample_data`, `test_retire_jiwoo::…`, `test_roadmap_generator::test_live_provider_…`.

`npm run docker:up`(API·web 재기동)과 ego-browser round-02·`/bootstrap/profiles` 전후 시간 비교는 **하지 않았다** — 지시서 §5 팀장 검증 범위. `docker:migrate` 가 API 이미지를 다시 빌드했지만 실행 중 컨테이너 교체 여부는 확인하지 않았다(새 뷰는 추가형이라 옛 코드와 공존 가능).

## 4. 계약 테스트 ↔ §4 매핑

| §4 | 테스트 | 비고 |
|---|---|---|
| 1 | `test_app_role_reads_both_views_and_columns_are_additive` | 기존 10열 순서 + `post_code,address`, 새 뷰 열 정확히 3개, `SET LOCAL ROLE dc_app` SELECT, 코드 ⊆ `core_competency` |
| 2·9 | `test_academic_core_competency_is_raw_and_keys_are_unchanged` | 원점수 float, 학사 0행 null, 두 학생 `/students/{id}` 키 집합 동일, `/bootstrap/profiles` 같은 값, source ∈ {null,DEV,ACADEMIC} |
| 3 | `test_partial_duplicate_or_null_scores_are_not_drawn` | 4행 · 5행·4코드(중복) · NULL 점수(뷰에서 4행) → 모두 null |
| 4·8·9 | `test_growth_profile_and_portfolio_carry_academic_values_to_owner_only` | 본인 `gpa='3.71'`·`credits`·`academic`, 교직원 `academic` null·응답에 연락처 문자열 없음, 키 = 기존 + `credits`·`academic`, 빈 문자열 → null |
| 5 | `test_intro_patch_keeps_self_contact_and_stores_no_academic_contact` | PATCH 응답 `academic` null(재생 포함), `growth_profile.contact_*` null, `dc.idempotency.response` 에 학사 연락처·주소 문자열 없음 |
| 6 | `test_academic_detail_contact_in_scope_only_and_list_export_unchanged` | 상담사·범위 안 교수 연락처·주소, 범위 밖 교수 404(본문에 값 없음), 목록 키 0022 §5 와 동일, export 헤더 13열 불변·값 없음 |
| 7 | `test_company_portfolio_education_gpa_is_academic` | 학생 생성·GET, 교직원 대표 포트폴리오 열람 모두 학사 평점 |
| 10 | `test_profile_gpa_falls_back_to_academic_only_for_empty_legacy_detail` | detail 없는 학사 학생 → `academic`, 학사 평점 없으면 `legacy_detail`·null, fixture `chaewon` → detail 값·`legacy_detail`. 정책 활성 경로는 `test_gpa_policy` 무수정 통과 |

모든 API 단언은 픽스처 생성 뒤 `SET LOCAL ROLE dc_app` 상태에서 돈다(앱 계정 권한 확인).

## 5. 변이 확인

| 변이 | 결과 |
|---|---|
| `students.profile()` 판정을 `len(academic)==5` 만으로(5코드 검사 제거) | `test_partial_duplicate_or_null_scores_are_not_drawn` **실패** → 되돌림 |
| PATCH 응답에 `academic_contact()` 를 넘겨 학사 연락처를 싣게 함 | `test_intro_patch_keeps_self_contact_and_stores_no_academic_contact` **실패** → 되돌림 |

## 6. mock→API 매핑

프론트 JSON 파일 없음(0003 퇴역). 새 화면 데이터는 모두 기존 API 응답의 추가 키로만 온다 — 새 호출 없음.

| 화면 값 | API 키 |
|---|---|
| 마이페이지 GPA·이수학점 | `GET /students/{id}/portfolio` `profile.gpa`·`profile.credits` |
| 마이페이지 휴대폰·이메일·주소 | 같은 응답 `profile.academic.{mobile,email,postCode,address}` (없으면 자기입력 `profile.phone/email`) |
| 메인·라운지·마이페이지 핵심역량 | 부팅 프로필(`/bootstrap/profiles`·`/students/{id}`) `coreCompetencyScores`·`coreCompetencySource='ACADEMIC'` |
| 교직원 학사 상세 헤더 | `GET /academic-students/{id}` `mobile·email·postCode·address` |
| 교직원 역량 GAP | 서비스 학생 프로필 `coreCompetency*` |

## 7. 남은 제한

- `dc.student_list`(목록 뷰)의 `gpa` 는 여전히 `student_gpa()` 결과라 실학생은 null 일 수 있다(지시서 범위 밖, 뷰 변경 필요).
- fixture 처럼 `detail.gpa` 와 학사 평점이 둘 다 있는 학생은 `/students/{id}` = detail 값, 마이페이지·문서 = 학사 값으로 갈린다(지시서 우선순위 그대로. 실학생은 detail 이 없어 해당 없음).
- 채용 지원 경로 GPA(§2-1)는 직접 단언 테스트가 없다.
- 학사 연락처·주소 열람 기록(접속기록)은 남지 않는다 — Astra 비차단 관찰 2(`DB.md` §9 후보).
- 격리 테스트 DB `dc_0023_sol_test`·`dc_regression_20261127010942_aba24e_test` 는 남겨 두었다(기존 runner 관례).
