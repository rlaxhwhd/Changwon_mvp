# 0018 — 채용공고 경력 구분 「경력무관」 추가

- 요청(2026-11-20 사용자): "신입, 경력 선택값도 정규직 옆에 표시하고 경력 필드값에 경력무관 데이터값 추가해줘"
- 마이그레이션: `backend/migrations/170_job_career_any.sql`

## 변경

`dc.code_item` 에 `('JOB_CAREER_TYPE','ANY','경력무관',sort_order=2)` 1행 추가. 스키마 변경 없음.

## 재사용 판단

- `JOB_CAREER_TYPE` 은 022 에서 만든 운영 코드 그룹(`fixed_codes=false`). 등록 폼(`src_admin/pages/JobForm.tsx` 라디오)·학생 목록/상세·엑셀 출력이 모두 `code_item` 을 읽는다 → 코드 행 추가만으로 노출. 앱 코드 변경 불필요.
- 앱은 `NEW`/`EXPERIENCED` 값으로 분기하지 않는다(grep 확인: 테스트 픽스처 `'NEW'` 1곳뿐).
- 공고 저장 검증 `check_code(conn,'JOB_CAREER_TYPE',…)` 과 `job_posting_option`·`job_posting.career_primary_code`(API `jobType`) 복합 FK 가 활성 코드를 받는다.

## 트래픽·인덱스·권한

- 1행 INSERT. 조회 경로·인덱스 변화 없음. 관리자 코드 관리 화면에서도 같은 행을 수정할 수 있다(감사 `code_item_event`). 마이그레이션 삽입은 기존 022/155 와 같이 이벤트 없이 넣는다.

## 롤백

미사용(옵션·`career_primary_code`·`code_item_event` 모두 0건)이면 DELETE 후 `metadata_revision` 수동 증가(DELETE 는 트리거가 올리지 않음), 사용 중이면 `is_active=false`(UPDATE 라 revision 자동 증가). — Astra 교정 2026-11-20

## 검증

- 로컬 Docker `docker:up` 부트스트랩으로 적용 → `GET /metadata` 코드에 `경력무관` 노출, 등록 폼 라디오 3개, 저장·조회 왕복.
- 테스트 DB 에 같은 SQL 적용 후 `tests/test_jobs.py` 회귀.
