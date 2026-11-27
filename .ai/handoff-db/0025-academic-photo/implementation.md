# 0025 구현 기록

상태: **IMPLEMENTED_FOR_LEAD_REVIEW** — 2026-11-27, Sol(codex-sol-implementer 역할, 위임 실행).
기준: `work-order.md` rev3, `architecture-review.md` 조건부 APPROVED(필수 조건 1~8, 9 해소). 골든 패스 0024.
마이그레이션 182 는 **파일만** 작성했다 — 로컬 DB(dreamcatch-dev-db 의 운영 개발 DB)·Docker 에 적용하지 않았다. 테스트는 `run_regression.py` 가 만드는 격리 DB(`dc_regression_*_test`)에서만 돌았다. 실제 chains 요청·학생 실제 값·사진 조회 없음.

## 변경 파일

| 파일 | 내용 |
|---|---|
| `backend/migrations/182_academic_photo.sql` (신규) | §2-1 SQL 그대로: `SET LOCAL lock_timeout='5s'` → `CREATE OR REPLACE VIEW dc.academic_student_details`(181 16열 이름·순서 불변 + 끝에 `CASE WHEN a.origin = 'source' THEN a.photo END AS photo_file`). 새 테이블·인덱스·COMMENT·GRANT 재실행 없음, `security_invoker` 미사용, 다른 뷰·academic 스키마·`sync_academic.py` 무변경. 롤백 주석에 181 정의 16열 SQL 전문과 순서 |
| `backend/app/settings.py` | `academic_photo_base_url = 'http://chains.changwon.ac.kr/onestop/haksa/photo/'`(env `DC_ACADEMIC_PHOTO_BASE_URL`). `field_validator`: 비어 있지 않으면 `http://`·`https://` 시작 + `/` 끝 + `?`·`#` 없음, 어기면 기동 시 실패. 빈 값 = 기능 꺼짐 |
| `backend/app/auth.py` | `pooled_principal` — `jobs.deep_principal` 본문·docstring 을 옮김(사진 프록시 사용 한 줄 추가). `from .db import connection, pool` |
| `backend/app/jobs.py` | `deep_principal` 정의 삭제 → `from .auth import pooled_principal as deep_principal`(호출처 16곳 무변경, 동작 불변) |
| `backend/app/academic_photo.py` (신규) | `PHOTO_NAME`·`photo_name()`(형식 판정 유일 지점, base 빈 값이면 None), `academic_photo_name(conn, uid)`, `client(transport=None)`(`Timeout(5, connect=3)`·`follow_redirects=False`·`trust_env=False`), `clock()`, `fetch_academic_photo(name)`(URL = base + `quote(name, safe='')` + `startswith(base)` 단언 → `BoundedSemaphore(8)` 비대기 획득, 실패 503 → `_download`: 전체 마감 8초·`Content-Length` 2 MiB 선검사·`iter_bytes()` 누적 2 MiB·매직 바이트 판정·상태 매핑 404/410→404, 그 밖→502·`httpx.HTTPError`→502 `from None`), `photo_response(name)`(None→404 「사진이 없습니다.」, 성공은 새 `Response` + `nosniff`·`private, no-store`). 로그는 상태 코드·예외 클래스명·사유 단어만 |
| `backend/app/growth.py` | `academic_contact` 한 SQL 문에 `d.photo_file` 추가, dict 에 내부 키 `hasPhoto` 만(파일명 미적재). `profile_dto` 는 `ACADEMIC_PROFILE_KEYS` 튜플 그대로, `owner and contact` 일 때 `academic['photoUrl']` 를 따로 조립(`/api/v1/students/{quote(intg_uid)}/academic-photo` 또는 null) → owner `academic` 정확히 11키. 새 라우트 `GET /students/{identity}/academic-photo`(`Depends(pooled_principal)` → `with pool.connection()` 안에서 `resolve_student`+`require_owner`+파일명 → 블록 밖 `photo_response`) |
| `backend/app/academic_students.py` | `academic_subject(conn, user, identity, lookup)` 추출(authorize → lookup → alias 해석 → 범위). `detail()` 은 ROSTER lookup 으로 호출해 돌려받은 identity 로 기존 `optional`·후속 쿼리를 그대로 잇는다(쿼리·순서·응답 불변) + `photoUrl`(`/api/v1/academic-students/{quote(identity)}/photo` 또는 null). `PHOTO_LOOKUP`(student_login_source ⋈ academic_student_details 점조회, service CTE 미실행) + 새 라우트 `GET /academic-students/{identity}/photo`(`pooled_principal` → 블록 안 판정·파일명 → 블록 밖 상류). 범위 밖·행 없음 = 같은 404 「학사 학생정보가 없습니다.」 |
| `backend/tests/test_academic_photo.py` (신규) | §2-7 테스트 1~12(아래 표) |
| `backend/tests/test_academic_profile_display.py` | 0024 동등 단언을 11키 동등 단언으로 갱신(부분집합 완화 없음): `ACADEMIC_KEYS`·`expected_academic`·`EMPTY_ACADEMIC` 에 `photoUrl`(이 학생들은 사진 값이 없어 null), 뷰 열 목록에 `DETAIL_COLUMNS_0025=['photo_file']`, 학사 상세 키 집합에 `DETAIL_KEYS_0025={'photoUrl'}`. 함수명 `…exactly_ten_keys…` → `…exactly_eleven_keys…` |
| `shared/ProtectedImage.tsx` | 선택 prop `fallback?: ReactNode` — 주면 로딩 중·실패 때 그것을 그린다. 안 주면 기존 동작 그대로(`PortfolioSheet`·`PortfolioEditor` 불변, `PORTFOLIO_PHOTO` 동작 무변경) |
| `shared/growthStore.ts` | `GrowthAcademic.photoUrl: string \| null` |
| `src_admin/data/academicStudents.ts` | `AcademicStudentDetail.photoUrl: string \| null` |
| `src_v2/pages/mypage/Portfolio.tsx`·`.css` | 마스트헤드: `dto.profile.academic.photoUrl` 이 있으면 `pf-monogram` 같은 박스(`pf-monogram--photo`: `overflow: hidden`, img `object-fit: cover`)에 `ProtectedImage`, fallback = 기존 모노그램(`aria-hidden`). 없으면 기존 모노그램 그대로(요청 0). alt 「{이름} 증명사진」 |
| `src_admin/components/StudentDetailView.tsx`·`.css` | `AcademicStudentHeader`: 인적사항 표를 `.sdv-person`(flex, gap 16px) 으로 감싸 왼쪽에 `.sdv-id-photo`(96×128, 3:4, `--border`·`--muted`·`--text-sub` 토큰, 새 색·폰트 없음). `photoUrl` 있으면 `ProtectedImage`(fallback 「사진 없음」), 없으면 「사진 없음」만(요청 0). 표는 `flex: 1; min-width: 0` + 기존 `table-layout: fixed` 라 1280px 에서 가로 넘침 없음(정적 판단 — 화면 측정은 팀장 §3) |

## 테스트 ↔ §2-7 매핑 (`backend/tests/test_academic_photo.py`)

| §2-7 | 테스트 |
|---|---|
| 1 | `test_view_adds_photo_file_last_and_app_role_reads_it`(17번째 열, 기존 16열 순서, `dc_app` 조회) + 0024 `test_app_role_reads_both_views…` 열 목록 갱신 |
| 2 | `test_owner_gets_photo_url_and_photo_others_are_denied_without_upstream` — `/growth/profile`·`/portfolio` 11키·`photoUrl` 형태·파일명/`hasPhoto`/`photo_file` 부재, 다른 학생 404, career·psych 403, 메뉴 없는 교직원 403, 거부 시 상류 0회, 본인 200(상류 1회 = base+파일명) |
| 3 | `test_staff_detail_photo_in_scope_and_out_of_scope_body_matches_missing_row` — 상담사·범위 안 교수 `photoUrl`(alias 상세 포함), 범위 밖 교수: 사진 있는 학생·alias·사진 없는 학생 모두 「학사 행 없는 학번」 404 와 **바이트 동일**, 메뉴 없는 교직원·학생 403, 범위 통과자 사진 없음 404, 상담사·교수(alias 경로) 200 |
| 4 | `test_bad_file_names_get_no_url_and_no_upstream`(DB 값 6종) + `test_photo_name_is_the_single_format_gate`(101자·100자 경계) |
| 5 | `test_upstream_status_mapping`(404·410→404, 403·500·302→502, 302 두 번째 요청 0회), `test_upstream_connection_failures_are_502`(ConnectError·ConnectTimeout·ReadTimeout, 로그에 파일명·URL 없음), `test_non_image_or_empty_body_is_502`, `test_declared_length_over_limit_is_not_read`(본문 조각 0개 읽음), `test_streamed_body_over_limit_stops_reading`(길이 헤더 없음, 3조각에서 중단), `test_total_deadline_stops_slow_stream`(가짜 시계) |
| 6 | `test_success_headers_and_media_type_follow_magic_bytes`(`.jpg` 인데 PNG → `image/png`, nosniff·`private, no-store`, `Set-Cookie`·`Server` 미전달) + 각 오류 테스트의 본문 파일명/URL 부재 |
| 7 | `test_empty_base_turns_feature_off`, `test_bad_base_fails_settings_validation`(ftp·끝 `/` 없음·스킴 없음·`?`·`#`) |
| 8 | `test_concurrency_cap_returns_503_without_upstream`(8슬롯 점유 → 503·상류 0회 → 반납 후 200) |
| 9 | `test_photo_routes_hold_no_request_connection`(두 라우트 `route.dependant` 재귀에 `app.db.connection` 없음·`pooled_principal` 있음, `jobs.deep_principal is pooled_principal`). jobs·deep 테스트 회귀는 대상 실행에 포함 |
| 10 | 0022~0024 학사 상세 테스트(범위 밖 404·optional null·alias) 대상 실행 통과 + `test_service_only_student_detail_and_photo` |
| 11 | `test_lists_exports_staff_profiles_and_patch_carry_no_photo`(목록·export·교직원 growth/portfolio·PATCH 처음/재생·`dc.idempotency`) + 0024 11키 동등 단언 |
| 12 | `test_local_origin_photo_is_hidden_and_source_control_is_shown`(local → 뷰 NULL·`photoUrl` null·두 엔드포인트 404 「사진이 없습니다.」·상류 0회, source 대조군 `photoUrl` 있음) |

테스트 기법: 상류는 `academic_photo.client` 를 `원본 client(transport=httpx.MockTransport(...))` 로 바꿔 운영 설정(리다이렉트 미추적 등)을 그대로 쓰며 호출 수를 센다. base 는 `http://photo.invalid/`. 사진 라우트의 `pool.connection()` 은 기존 관례(`test_ai_final_process`)대로 롤백 전용 트랜잭션 `db` 로 돌린다. API 호출은 `SET LOCAL ROLE dc_app`.

## 실행한 명령과 결과

| 명령(`backend/` 에서) | 결과 |
|---|---|
| `.venv/Scripts/python.exe scripts/run_regression.py -k "academic_photo"` | **36 passed**, 819 deselected (`dc_regression_20261127053242_989e2b_test`) |
| `.venv/Scripts/python.exe scripts/run_regression.py -k "academic_photo or academic_profile_display or academic_students or staff_academic_scope or growth or portfolio or jobs or deep"` | **249 passed, 1 failed**, 605 deselected (`dc_regression_20261127053259_076cc9_test`). 실패 1건 `test_growth::test_portfolio_projection_has_no_shared_sample_data` 는 0021~0023 기록의 **기존 실패 10건** 중 하나(실행 순서상 다른 테스트가 남긴 자소서가 섞임 — 이번 변경과 무관) |
| 전체 격리 회귀 `.venv/Scripts/python.exe scripts/run_regression.py` | **843 passed, 10 failed, 2 skipped** (`dc_regression_20261127053353_38f602_test`). 실패 10건은 0021~0024 기록의 기존 실패 10건과 **이름까지 동일**(diff 0): `test_api::test_server_pagination_and_aggregates`, `test_boot_contract` 2건, `test_counsel_history_menu::…keeps_existing_contract`, `test_development_roadmap` 2건, `test_diagnosis::test_result_access_and_precomputed_not_exposed`, `test_growth::test_portfolio_projection_has_no_shared_sample_data`, `test_retire_jiwoo::…`, `test_roadmap_generator::test_live_provider_…` |
| 저장소 루트 `npx.cmd tsc -b` | exit 0 |

## mock → API 매핑

| 화면 | 이전 | 이후 |
|---|---|---|
| 학생 마이페이지 포트폴리오 마스트헤드 | 이름 모노그램만 | `GET /students/{id}/portfolio` → `profile.academic.photoUrl` → (값 있을 때만) `GET /students/{intg_uid}/academic-photo` blob. 실패·로딩 = 모노그램 |
| 교직원 학사 상세 인적사항 | 표만 | `GET /academic-students/{id}?optional=true` → `photoUrl` → (값 있을 때만) `GET /academic-students/{intg_uid}/photo` blob. 실패·로딩·없음 = 「사진 없음」 |

호출 수: `photoUrl` null 이면 +0, 값이 있으면 화면당 +1.

## 지시서와 다른 점

1. **`fetch_academic_photo` 위에 `photo_response(name)` 를 하나 더 두었다.** 두 라우트가 같은 「None → 404 사진 없음 → 상류 → 새 Response + 헤더」 를 쓰므로 응답 조립을 한 곳에 모았다. 상류 호출은 여전히 `fetch_academic_photo` 한 곳뿐이고, 판정 순서(403 → 범위·존재 404 → 형식 404 → 503 → 상류)는 같다. `fetch_academic_photo` 는 방어적으로 `photo_name()` 을 다시 확인한다(라우트 밖에서 불려도 경로가 붙지 않게).
2. **`client(transport=None)` 인자** — 테스트가 운영 설정 그대로 MockTransport 만 끼우게 하는 이음매. 운영 호출은 인자 없이 쓴다. 가짜 시계용 `clock()` 함수도 같은 목적.
3. **테스트 4의 101자 파일명은 DB 가 아니라 `photo_name()` 단위 테스트로 확인했다.** 원천 열이 `varchar(60)` 라 101자 값을 학사 대역 테이블에 넣을 수 없다(아키텍처 리뷰 비차단 5). DB 경유 케이스는 `../x.jpg`·`a/b.jpg`·`a.gif`·`a b.jpg`·`%2e%2e.jpg`·`x.jpg?y=1`.
4. **교직원 증명사진 칸은 `photoUrl` 이 null 이어도 「사진 없음」 칸으로 그린다**(요청은 보내지 않음). 현행 포트폴리오 화면처럼 표 왼쪽 자리를 고정해 학생마다 표 폭이 바뀌지 않게 했다.
5. 0024 테스트 함수명 `test_0024_owner_academic_has_exactly_ten_keys_with_formats_and_boundaries` → `…exactly_eleven_keys…`(단언이 11키로 바뀌어 이름이 틀리게 되므로).

## 남은 제한

- ego-browser 화면 검증(마이페이지·교직원 상세, 1280px 넘침, 사진 요청 상태·Content-Type·바이트 수·P50)은 하지 않았다 — 마이그레이션 적용·Docker 반영과 함께 팀장 §3.
- chains 가 없는 파일에 실제로 404 를 주는지는 미확인(팀장 §3 에서 검증 학생 2명분 상태만 기록).
- 182 적용 후 local 원천 학생 `photo_file IS NOT NULL` = 0 재확인은 팀장 §3.
- 지시서 §4 의 제약(운영 서버 아웃바운드, 부정 캐시 없음, 열람 기록 없음, 서버↔chains 평문) 그대로.
