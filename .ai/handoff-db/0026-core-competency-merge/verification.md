# 0026 팀장 검증 — PASS (2026-11-27)

판정: **PASS** (로컬 Docker 반영, 서버 미배포). Astra rev2 조건 C1~C12 충족. 업체 수집은 로컬 DB 에만 반영.

## 1. 게이트

| 항목 | 결과 |
|---|---|
| Sol 격리 전체 회귀 | `dc_regression_20261127063402_b2af89_test` 10 failed / 871 passed / 2 skipped — 기준선 `…053353_38f602_test` 와 FAILED 집합 동일 |
| 팀장 수정 후 대상 회귀 | `eco_competency_sync or core_competency or academic_profile_display` 62 passed |
| `npx tsc -b` | exit 0 |
| `docker:migrate` | 183 적용(Sol), 백업 `local-before-migrate-20261127063915888.dump` |

## 2. 팀장 수정 (Sol 구현 대비)

1. `read_vendor_env`: 실제 `.env.local` 은 「key : value」 형식이 섞여 있어 `VENDOR_ENV_KEYS_MISSING` 으로 멈췄다 → 키 뒤 첫 구분자(`=` 또는 `:`)로 자르도록 수정, 테스트 추가(값 안의 `:`·`=` 보존).
2. `_completed`: 업체가 `is_completed` 를 명세대로 문자열 `TRUE`/`FALSE` 로 준다(`IS_COMPLETED_TYPE` 중단) → 그 두 값만 추가 허용, 소문자 등은 계속 중단. 테스트 추가.
3. `EXPECTED_TITLES` 고정: 1 지역형 리더역량 · 2 창의적 사고역량 · 3 실용적 융복합역량 · 4 의사소통역량 · 5 글로벌역량.

두 중단 모두 업체 접속·검증 단계에서 멈춰 PG 에 쓴 것 없음(설계대로).

## 3. 업체 수집 (읽기 전용, 사용자에게 알린 뒤)

| 실행 | 결과 |
|---|---|
| dry-run | 13,419행 전부 유효 · 4,222명 · 원소 40,665 · 축별 essential 중복 0 · 빈 배열 0 · 상태 전부 `CONFIRMED|True`(D2 해당 없음) · 업체 최종 수정 2026-11-25 · 학사 매칭 4,148명 / 미매칭 74명 / override·fixture 제외 1명 |
| `--publish` | PUBLISHED 13,419 신청서 · 40,665 점수 행 (직전 0) |
| 합산 뷰 집계 | 점수 학생 23,026명 = 교과+비교과 663 · 비교과만 3,484 · 교과만 18,879 |

## 4. 화면·API (ego-browser, 학번·점수 값 미출력 — 일치 여부만)

| 학생 | 로그인 | `coreCompetencySource` | API 점수 = DB 합산 뷰 | 마이페이지 | 메인 |
|---|---|---|---|---|---|
| V1 (검증 학생 20262324, 비교과만) | 200 | ACADEMIC_PROGRAM | 일치 | 5축 · 합산 문구 | 5축 · 「교과·비교과 이수 누계 원점수」 범례, 목표선 없음 |
| V2 (검증 학생 20243003, 비교과만) | 200 | ACADEMIC_PROGRAM | 일치 | 5축 | 5축 |
| OVERLAP (교과 5축 + 비교과 3축, 학번 미기록) | 200 | ACADEMIC_PROGRAM | 일치 | 5축 | 5축 |
| 상담사 `/bootstrap/profiles` | 200 (114ms, 22명) | 세 학생 모두 ACADEMIC_PROGRAM | 일치 | — | — |

- 프로필 API 16~54ms, 마이페이지 API 호출 15~16건(추가 호출 0), 실패 요청 0, 콘솔 오류 0. 스크린샷 없음.
- OVERLAP 학생은 이번 로그인으로 로컬 `dc.person`·`dc.student` 행이 생겼다(C11, 로컬 DB 한정).
- 검증 스크립트는 학번·기대값을 담아 세션 scratchpad 에만 두고 저장소에 넣지 않았다.

## 5. 남은 것

- D1 override 테스트 계정은 점수를 보이지 않는다(기본값) — 사용자 확인 대상.
- D3 2022학번 이후는 비교과만 합산된다(교과 CORE 원천 없음). D4 전산원 2022~ CORE 수령 시 이뤄드림 중복 여부 확인 — `DB.md` §9.
- 수집은 수동 실행. 운영 서버에서 업체 DB 접근 경로·주기는 미정. 서버 미배포.
