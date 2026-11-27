# 0027 구현 기록 — 내 성장 머리말 목표 기업

상태: **IMPLEMENTED_FOR_LEAD_REVIEW** (Sol · 2026-11-27)
근거: `work-order.md` rev2(ASTRA_APPROVED) · `architecture-review.md` C1~C10. U1·U2 는 Astra 기본값(팀장 확정)으로 구현했다 — U1 로드맵 값이 문자열 요약뿐이면 미정으로 보고 학생 입력 허용, U2 상담 신청 희망 기업으로 미리 채우지 않음.

## 1. 변경 파일

| 파일 | 내용 |
|---|---|
| `backend/migrations/184_growth_target_company.sql` (신규) | rev2 §3-1 SQL 그대로 — `lock_timeout 5s`, `target_company text` NULL 열, `ck_growth_profile_target_company`, COMMENT, 롤백 주석. 기본값·인덱스·백필·GRANT 없음(025 의 테이블 단위 GRANT 가 새 열을 덮는다) |
| `backend/app/growth.py` | `ProfileBody.targetCompany`(≤200, 제어문자 거부), `PROFILE_FIELDS` 네 필드 중 하나도 안 보내면 422 `INVALID_FIELD`(version·이벤트 불변), 멱등 digest = `identity + model_dump_json(exclude_unset=True)`, UPDATE 한 문장이 네 열을 항상 SET 하되 보내지 않은 필드는 잠근 `before` 값, `PROFILE_UPDATE` before/after 네 키 스냅샷, `profile_dto.targetCompany` |
| `backend/tests/test_growth_target_company.py` (신규) | rev2 §5 1~11 → 9개 테스트(롤백 전용 `db` 픽스처 + `SET LOCAL ROLE dc_app`, 합성 학생 2명) |
| `backend/tests/test_academic_profile_display.py` | `GROWTH_PROFILE_KEYS` 에 `'targetCompany'` 추가(케이스 삭제 없음) |
| `shared/growthStore.ts` | `GrowthProfile.targetCompany: string \| null`, `saveGrowthProfile` 입력을 선택 키로(`intro?`·`targetCompany?` 추가), `reloadGrowth(id)` 추가(§3 참고) |
| `src_v2/data/growthTargetCompany.ts` (신규) | 우선순위 셀렉터 `growthTargetCompany(student, profile)` → `{name, source:'ROADMAP'\|'SELF'} \| null` |
| `src_v2/pages/growth/GrowthHome.tsx` | 머리말 아바타·「OOO의 성장 기록」 h2·「학과 · N학년 · 학번」 줄 삭제. 왼쪽 위 표지(MY GROWTH RECORD / 4학년 CAREER PORTFOLIO) + 그 아래 목표 기업 블록(ROADMAP = 읽기 전용 + 「로드맵에서 정한 목표」, SELF = 고치기·지우기, 없음 = 추가 버튼 → 인라인 입력). 머리말 태그·PROFILE 카드 「관심 기업」도 같은 셀렉터. `aria-labelledby="growth-title"` 은 「목표 기업」 라벨로 이동. 고아가 된 `studentDisplayName` import 제거 |
| `src_v2/pages/growth/GrowthHome.css` | `.gh-cover-profile` 을 세로 배치로, `.gh-avatar`·`.gh-cover-profile p`(내가 만든 고아) 삭제, `.gh-target*` 추가. 색은 기존 `--gh-accent`·`--gh-accent-soft`·`--gh-accent-border`·`--gh-sub`·`--gh-border`·`--gh-text` 만. 760 이하 기존 1열 규칙 그대로 |
| `DB_SCHEMA.md` | 184 항목 상태 = 구현 완료 · 격리 적용·재실행 확인 · 로컬 적용 · 서버 미배포 |
| `DB.md` | §8-3 「4 성장 활동」 설명에 184 한 줄 |

노출 제외 3곳(C5)은 코드 변경 없이 그대로 둔 것이 구현이다 — `students.py` 부트 프로필은 `dc.roadmap` 만 읽고, `student_portfolio.py` `personal` 은 `intro`·`contact_email`·`contact_phone` 만 명시적으로 고르고, `roadmap_generator.generation_input`·AI 코멘트 문맥은 `growth_profile` 을 읽지 않는다(grep). 계약 테스트 §5-11 이 부트 프로필·교직원 부트 묶음·제출 문서에 값이 없음을 확인한다.

## 2. 마이그레이션 184

- 격리 테스트 DB: `run_regression.py` 가 새 DB 에 001~184 적용(로그 `Applied 184_growth_target_company.sql`). 같은 DB(`dc_regression_20261127080956_4df13b_test`)에 `app.migrate` 를 다시 돌려 184 가 적용 이력으로 건너뛰어짐(출력 없음·exit 0)을 확인. 제약 존재, `dc_app` 의 새 열 UPDATE 권한 `t`.
- 로컬: `npm run docker:migrate` — 백업 `_workspace/db-backups/local-before-migrate-20261127081343956.dump` 뒤 `Applied 184_growth_target_company.sql`.
- `docker:up`(새 API·웹 이미지 반영)은 하지 않았다(팀장 담당). 지금 떠 있는 옛 API 는 새 열을 무시하므로 적용 순서상 안전하다(NULL 열 추가).
- 서버 배포 없음.

## 3. 승인안과 다르게 간 곳

1. **API 제어문자 패턴을 C1(\x80-\x9f)까지 넓혔다.** rev2 는 `^[^\x00-\x1f\x7f]*$` 였는데 DB CHECK `[[:cntrl:]]` 는 로컬 PostgreSQL 에서 U+0085 같은 C1 문자도 잡는다(테스트로 확인). 그대로 두면 API 를 통과한 값이 CHECK 에서 500 이 된다 → `^[^\x00-\x1f\x7f-\x9f]*$` 로 맞췄다. 테스트 `A\x85B` 가 API 422·DB CheckViolation 둘 다 확인한다.
2. **409 재조회를 `ensureGrowth(id, true)` 대신 `reloadGrowth(id)` 로.** `ensureGrowth(id, true)` 는 「오래됐으면 다시 읽는다」라 방금 읽은 신선한 캐시에서는 아무것도 하지 않는다(studentCache `isStudentFresh`). 409 직후는 대개 신선하므로 재조회가 조용히 빠진다. growthStore 에 `reloadGrowth`(= `invalidateStudent('growth', id)` + `ensureGrowth(id, true)`) 를 추가해 화면이 그것을 부른다. 입력값은 지우지 않는다.
3. **목표 기업 지우기에 확인창을 붙였다** — 같은 화면의 항목 삭제(`removeItem`)와 같은 `window.confirm` 패턴. 승인안에는 명시가 없었다.
4. **프로필을 아직 못 읽었을 때 추가 버튼을 숨긴다.** `growthProfile?.capabilities.canEdit` 일 때만 추가 버튼, 아니면 로드 오류 문구(`growthLoadError`) 또는 「불러오는 중…」. 읽기 전에 저장하면 version 0 으로 409 가 나기 때문이다.
5. 테스트 수: §5 1~11 을 9개 함수로 묶었다(1·2/3·4/5·6·7·8·9·10·11 — 2·3 과 4·5 를 각각 한 함수에). 항목은 빠짐없다.

## 4. 실행한 명령과 결과

| 명령 | 결과 |
|---|---|
| `backend/.venv/Scripts/python.exe scripts/run_regression.py -k "test_growth or academic_profile_display or academic_photo or boot_contract"` | 2 failed, 99 passed — 실패 2건은 기준선과 같은 `test_boot_contract` 2건. 새 파일 9건·`test_growth.py`·`test_academic_photo.py`·`test_academic_profile_display.py` 통과 |
| `backend/.venv/Scripts/python.exe scripts/run_regression.py` (전체, DB `dc_regression_20261127080956_4df13b_test`) | **10 failed, 880 passed, 2 skipped**. 기준선 `dc_regression_20261127053353_38f602_test`(10 failed, 843 passed) 와 **FAILED 집합 동일**(diff 없음). passed 증가는 새 테스트 9건 + 기준선 이후 다른 작업의 테스트 |
| `app.migrate` 재실행(같은 격리 DB) | exit 0, 적용 없음 |
| `npx.cmd tsc -b` | exit 0 |
| `npm run docker:migrate` | 백업 후 184 적용 |

기준선과 같은 실패 10건(이번 변경과 무관): `test_api::test_server_pagination_and_aggregates`, `test_boot_contract` 2건, `test_counsel_history_menu`, `test_development_roadmap` 2건, `test_diagnosis::test_result_access_and_precomputed_not_exposed`, `test_growth::test_portfolio_projection_has_no_shared_sample_data`, `test_retire_jiwoo`, `test_roadmap_generator::test_live_provider_creates_without_fixture_and_records_actual_inputs`.

## 5. mock → API 매핑

| 화면 값 | 이전 | 이후 |
|---|---|---|
| 머리말 목표 기업 | 없음(이름·학과 줄) | `growthTargetCompany(student, growth/profile)` |
| 머리말 태그 「관심 기업」 | `student.targetCompany?.name \|\| '미정'` | 같은 셀렉터 `?.name \|\| '미정'` |
| PROFILE 카드 「관심 기업」 | 같음 | 같은 셀렉터 |
| 학생 입력 저장 | — | `PATCH /students/{id}/growth/profile {expectedVersion, targetCompany}` → 기존 `refresh` GET 1회 |

읽기 호출 추가 0(`growth/profile` 은 이미 이 화면에서 읽는다). 쓰기 = PATCH 1 + GET 1.

## 6. 남은 것·제한

- **화면 검증(C10) 미수행** — 새 API·웹 이미지가 아직 로컬 Docker 에 없다(`docker:up` 은 팀장 담당). 팀장이 `docker:up` 뒤 ego-browser 로 20262324(문자열 「미정」 → SELF 경로) 추가→새로고침→고치기→지우기, 포트폴리오 자기소개 저장 후 목표 기업 유지, 응답 패치로 ROADMAP 객체·문자열 두 모양, 1280·390, 콘솔 0·실패 요청 0·호출 수 증가 0 을 확인해야 한다.
- 범위 밖 보고(수정 안 함): `src_v2/data/students.ts:364` `targetCompanySummary` 가 문자열 모양 `targetCompany` 에서 「undefined · undefined」가 된다. `students.py` 가 문자열 모양을 그대로 내려보내 프론트 `TargetCompany` 타입과 어긋난다. `growth/activity-log` 중복 호출 2회.
- 프로필 version 을 성장 자료 쓰기와 공유하므로 다른 탭에서 자료를 쓴 직후 목표 기업 저장은 409 가 날 수 있다 — 안내 + 재조회로 처리한다(입력 유지).
- 교직원 화면에 학생 목표 기업 표시는 이번 범위 밖(GET 응답에는 실려 있다).
