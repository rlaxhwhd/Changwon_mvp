# 0009 추천채용 지원 — 추천 선생님

상태: 팀장 직접 구현 (단일 속성 확장). Astra 리뷰 요청.

## 요구 (2026-11-05 사용자)
추천채용 지원 모달의 드림캐치 포트폴리오 첨부 카드 밑에 「추천 선생님」 select.
목록 = 진로취업상담사, 「없음」 항목 포함·기본값. 나중에 추천 선생님별 통계가 필요하다.

## 재사용 판정
- 목록: 기존 `GET /counselor-profiles` + 프론트 `getCounselorCards('career')`. 새 API 없음.
- 저장: 제출 회차의 단일 속성 → `dc.job_application_attempt` 컬럼 확장. 새 테이블 없음.

## 설계
- 157: `recommender_uid text REFERENCES dc.staff(intg_uid)`, `snap_recommender_name text`, 둘 다 NULL 허용.
  NULL = 없음. 두 컬럼은 함께 NULL 이거나 함께 값이 있다(CHECK).
  통계용 부분 인덱스 `(recommender_uid) WHERE recommender_uid IS NOT NULL`.
- 회차 단위인 이유: 취소 후 재지원에서 선택이 달라질 수 있고, 회차 테이블은 append-only 다.
- `POST /jobs/{id}/applications` 에 선택값 `recommenderId`(person.alias). `role_code='career'` 가 아니면 422.
- 이름 스냅샷은 서버가 만든다: `COALESCE(profile->>'displayName', person.name)` — 목록 표시명과 같다.
- 응답 `currentAttempt` 에 `recommenderId`, `recommenderName` 추가.

## 범위 밖
통계 화면, 교직원 지원자 화면·CSV 표시.

## Astra 리뷰

판정: `ASTRA_APPROVED` — 설계·157 수정 없음. 정적 리뷰이며 157 은 실행해 보지 않았다. 남은 일은 아래 「후속」 2건이다.

- **회차 테이블:** 맞다. 재지원마다 선택이 달라지고 스냅샷이 이미 회차에 있다. 새 테이블은 필요 없다.
- **FK:** `dc.staff(intg_uid)` 가 맞다(`counselor_uid` 와 같은 패턴, ON DELETE 기본값). 코드에 `dc.staff` 삭제 경로가 없다. 앞으로 fixture 교직원을 퇴역시키면 이 FK 가 막으므로 그 마이그레이션이 정리해야 한다.
- **CHECK:** 충분하다. 기존 행과 LEGACY 행은 둘 다 NULL 이라 통과한다. 표시명은 `Profile.name` min_length=1, `person.name` NOT NULL 이라 서버 경로로 위반되지 않는다. 빈 문자열 금지 CHECK 는 더하지 않는다.
- **부분 인덱스:** 지금 규모에는 없어도 되고, 있어도 쓰기 비용이 무시할 만하다. 유지한다. 기간 조건용 복합 인덱스는 통계 query 가 정해질 때 추가한다.
- **ALTER 안전성:** 기본값 없는 NULL 컬럼 추가라 테이블을 다시 쓰지 않고, 행을 UPDATE 하지 않으므로 `job_attempt_immutable` 이 발동하지 않는다. 트리거를 끌 필요도 없다. attempt 에 ACCESS EXCLUSIVE, `dc.staff` 에 SHARE ROW EXCLUSIVE 를 잠깐 잡으며, CHECK·FK 검증 스캔은 행 수가 적어 짧다. 한 ALTER 로 묶어도 되고 `CONCURRENTLY` 도 필요 없다.
- **dc_app 권한:** 추가 GRANT 불필요. 022 의 테이블 단위 `SELECT,INSERT` 가 새 컬럼을 포함하고, 이 테이블에 컬럼 단위 GRANT·REVOKE 가 없다. FK 검사는 dc_app 권한으로 돌지 않는다.
- **응답 호환성:** 키 추가뿐이고 `attempt_dto` 호출자는 `current_attempt` 하나다. `recommenderId` 는 선택값이라 옛 요청도 통과하고, 프론트는 없음을 `null` 로 보내 `min_length=1` 에 걸리지 않는다. `current_attempt` 의 N+1 은 기존 그대로이고 JOIN 은 PK 조회 1건만 늘린다.

후속:
1. `backend/tests` 에 recommender 테스트가 아직 없다. 생략 시 NULL, career 저장·응답 키, psych·미존재 alias 422, 재지원 시 회차별로 다른 값 유지를 추가한다.
2. 통계를 만들 때 집계 단위를 정해야 한다. 회차 행을 그대로 세면 취소 후 재지원이 중복 집계되므로, 지원 건 기준이면 `(a.id,a.current_attempt_no)=(t.application_id,t.attempt_no)` 로 조인한다. 취소 건 포함 여부는 업무 결정이며 이번 범위 밖이다.

## 구현 기록

상태: `PASS` — 팀장 직접 구현, Sol 미사용(단일 속성 확장). 설계 이탈 없음.
후속 1 은 `test_recommender_is_kept_per_attempt_and_must_be_a_career_counsellor` 로 반영했다.
로컬 Docker 에서 임시 공고로 지원을 끝까지 실행해 저장을 확인했고, 검증 데이터는 지웠다.
