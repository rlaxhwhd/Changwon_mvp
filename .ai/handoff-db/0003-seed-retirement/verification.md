# 재개 검증 기록

검증자: Codex. 기존 Opus 팀장의 최종 PASS를 대신 기록하지 않는다. 사용자 요청에 따라 중단 작업을 재개하고 실제 실행 결과를 기록한다.

## 기준선

- 별도 `seed_retirement_r1_test` 생성. 기존 개발 DB를 초기화하지 않음.
- migration 001~041 → seed 성공: `sourceFiles=43`, `students=120`.
- 기존 backend 전체 pytest: **112 passed** (2026-09-10).
- 044 기존 시드 DB 적용 성공. seed 재실행 `already_imported`, 43 보관 키 유지.
- 브라우저 QA 별도 API 18103 / Vite 5183. 기존 18100 / 5173 / 5174 서버는 유지.

## 라운드 상태

| 라운드 | 상태 | 검증 |
|---|---|---|
| E0+E2 | 재개 검증 통과 | 빈 DB seed43/120, 기존112 pytest + staff 계약3, build, 8신원 화면 진입 및 교수프로필 저장/재조회 통과. 계약 회귀 보강은 계속 |
| E1+E3 | 구현 진행 | 1라운드 검증 후 착수 |
| E5 | 준비 중 | 2라운드 통과 후 구현 |
| E4 | Astra 재리뷰 완료 | revision 3 기술 계약 편입; E5 뒤 구현 |

## 확인한 문서 차이

- 실제 시드 보관 파일 수는 43이며 작업지시서의 과거 실측 40과 다르다. 수를 맞추기 위해 파일을 버리지 않는다.
- 교수 기록 fixture는 7행이다(04-decisions의 11행은 과거 오기).
- 04-decisions D2의 path 재매핑(039)은 후속 Astra 리뷰가 폐기했다. 기존 `seed_source.path`를 유지하는 work-order E0가 정본이다.
- 배정 해제는 advisor 권한 가지만 없앤다. 같은 학과 교수의 org_assignment 권한은 유지되므로 그 경우 200이 정상이다. advisor만으로 접근하는 별도 테스트 데이터로 해제 후 404를 검증한다.

## E0+E2 재개 검증

- 새 `seed_retirement_resume_test`: migration 001~041 및 044 → seed 43파일/120명 성공.
- backend 전체 기존 112 passed. 새 staff 계약 3 passed.
- `npm run build` 통과.
- 브라우저 5교직원 역할 + 3학생, 19개 경로 오류 0 (`browser-smoke-results.json`).
- 교수 프로필 UI 저장 → PostgreSQL → 페이지 새로고침 값 유지 → 원값 복구 성공. `dc_professor_profile` 없음 (`profile-roundtrip.cjs`).
- 프론트 JSON 5개 남음: 로스터·배정·교수기록·팝업·대시보드. 후속 라운드 대상과 일치.

## 2026-09-11 재개

- Docker Desktop 및 기존 dreamcatch-dev-db 기동. 개발 DB는 041까지 적용된 상태였음.
- 개발 DB archive 43개와 파일 43개 대조: 누락/신규 보관키 0. 성장일지 파일만 CRLF/LF 차이(파싱된 JSON 동일). 해당 파일의 줄바꿈을 기존 archive와 일치하는 LF로 복원하여 체크섬 일치 확인.
- 기존 개발 DB `app.seed --root ..`: `already_imported`, 43개. 기존 데이터를 덮어쓰지 않음.
- 새 `seed_retirement_r2_test`에 독립 검증 스키마 준비. E1+E3 실제 구현 재착수.
