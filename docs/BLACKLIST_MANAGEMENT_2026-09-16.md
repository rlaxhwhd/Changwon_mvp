# 블랙리스트 관리 변경

## 기능 및 권한

- 관리자 상단 로드맵 관리 제거, 뒤 항목 순서 이동, 마지막에 블랙리스트 관리 추가.
- `/admin/blacklists/programs`: 기존 비교과 벌점 검색·목록·CSV·이력·차감·전체 해제 재사용.
- `/admin/blacklists/sms`: 학생 검색, 차단 등록·해제, 사유, 변경 이력, 페이지네이션.
- `/admin/programs/blacklist`는 관리자에게 새 위치로 연결한다. `/admin/systems`는 기존 시스템 관리로 연결한다.
- 비교과 벌점 관리 API는 시스템관리자 전용이고 전체 학생을 조회한다. 학생의 본인 벌점 조회는 유지한다.
  상담사의 출석/노쇼 처리에 따른 자동 벌점 부여·정정은 유지한다.
- SMS와 비교과 벌점은 독립적이다. 모든 SMS 관리 API에서 유효한 AUTH0006 권한을 확인한다.

## DB와 동시 처리

086은 `sms_blacklist`와 `sms_blacklist_event`를 추가한다. 현재 상태는 학생당 1행,
이력은 학생/버전 UNIQUE이며 UPDATE/DELETE 방지 trigger를 적용했다.
FK와 actor 인덱스, 차단 목록용 부분 인덱스를 포함한다.
087은 메뉴 데이터만 변경하며 이전 migration은 수정하지 않는다.

SMS 등록/해제는 `expectedVersion`을 검증하고 불일치는 409로 거절한다.
등록과 발송은 같은 학생의 advisory transaction lock을 사용한다.
`backend/app/sms.py::dispatch_student_sms`는 잠금 후 최신 차단 상태를 읽고,
차단이면 provider callback을 호출하지 않고 `BLOCKED`를 반환한다.
이미 provider에 전달 중인 발송은 회수할 수 없다. 차단 저장 완료 후의 발송부터 막힌다.

## 학교 SMS 연동 후속

사용자가 학교의 기존 SMS 연동 정보를 추후 제공하기로 했다.
현재 저장소에는 SMS 발송 provider/worker/queue가 없으며 실제 SMS를 보내지 않았다.
업체·인증·발신번호·연락처 정본·재시도/중복 방지 계약을 받으면 어댑터를 연결한다.
일괄 발송과 예약/재시도도 수신자 선택 시점만 검사해서는 안 되며,
실제 provider 호출 직전에 위 공통 함수를 통과해야 한다.
callback은 실제 단일 발송 handoff를 동기적으로 수행하고 실패를 그대로 전파한다.
현재의 차단 함수만으로 아직 연결하지 않은 외부 학교 시스템의 발송을 막는 것은 아니다.

## 검증

- 새 001–087 seeded DB 전체 회귀: **266 passed / 2 skipped**, 실패 0건, 69.17초.
  `backend/var/dc_regression_20260916044049_6858c2_test.log`.
- 이후 앱 계정 검증 및 동시 최초 등록 검사를 추가/강화한 집중 검사: **9 passed**.
  동시 등록은 200/409 각 1건. 등록·해제·재등록, 이력 불변성, 비관리자 거부,
  다른 학생의 벌점 조회 거부, blocked callback 미호출, provider 실패 전파 포함.
- `npm run build` 성공.
- Chrome MCP: 격리 테스트 API 18114 / 웹 5178, 관리자 메뉴 순서, 비교과 이력/차감,
  SMS 학생 검색 → 등록 → 목록 → 이력 → 해제 확인. HTTP 모두 200, JS 콘솔 오류 없음.
  해제 PUT 27ms/246bytes, 이어진 목록 GET 25ms/290bytes. 작은 개발 fixture 측정이며 DB 실행 시간은 아니다.
- SMS 목록/이력의 개발 StrictMode 중복 조회를 동일 진행 중 Promise 재사용으로 제거했다.
  수정 후 새 탐색에서 목록 GET 1회 확인. 초기 공통 bootstrap은 여전히 여러 도메인을 조회하며
  jobs 응답 약 1.54MB/392ms가 관측됐다. 이번 SMS API 응답 크기와 구분한다.
- 기존 DB 복사본 upgrade, migration replay, 빈 DB seed, 백업 복원 및 원본 진단 fingerprint 일치 성공.
  `backend/var/rehearsal/20260916044343/result.json`.

## 적용과 복구

현재 적용은 격리된 테스트 DB와 미리보기 서버에 한정한다. 원본 `dreamcatch` 및 기존 컨테이너에는 배포하지 않았다.
배포 시 백업 후 owner migration 실행, API·프런트 함께 갱신한다.
복구가 필요하면 신규 forward migration으로 새 메뉴를 비활성화하고 이전 순서/권한을 복원한다.
차단 데이터와 이력은 보존한다. 학교 SMS 연동 이후에는 UI를 되돌려도 발송 차단 경로를 제거하지 않는다.
