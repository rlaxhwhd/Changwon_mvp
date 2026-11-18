# 0014 적용·검증 결과 — 2026-11-18 (로컬까지만, 서버 배포 없음)

- 승인: architecture-review.md ASTRA_APPROVED, work-order revision 1. 승인 뒤 리뷰 후속 1 에 따라 166 의 롤백 주석만 정정
  (DDL 동일, 리뷰가 재검토 불필요로 명시) — 최종 SHA256 `62f2712c88eda0e7685516d7469df5f529bbcbcde1765d7176b41273499bdbf3`.
  후속 2·3 은 `DB_SCHEMA.md`·`DB.md` 에 반영. 권고 「direct_input 은 실제 전송값(빈 값 제외)」 반영.
- 테스트 DB `dreamcatch_test`(PostgreSQL 17.11): 소유자(postgres, db 컨테이너 psql)로 166 을 단일 트랜잭션 적용 + `dc.schema_migration`
  체크섬 기록. 적용 전후 세션 행 30 → 30, `mode<>'cover'` 0 건. CHECK 확인(`ck_job_interview_finished`, `ck_job_interview_mode_input`,
  `ck_job_interview_mode_resume`, `job_interview_session_mode_check`, `job_interview_session_direct_input_check`). `dc_app` 으로 migrate.py 재실행 → 적용 없음(체크섬 일치, no-op).
- `tests/test_deep.py` 24 passed(기존 22 + 자소서 없이·기업별 2). 자소서 없이: 빈 필수값 422·Deep 미호출, no_cover 전송 본문·`direct_input`·NULL 자소서 행.
  기업별: 자동완성·직무 목록 응답, 미등록 기업 404, 질문 없는 직무 404, 거부된 면접 미기록, 전송 본문 `company`·`job_category`·`workTask`.
- `npx tsc -b` 통과. `npm run docker:up` 완료 — 로컬 DB 166 적용(세션 8행 모두 cover), API 로그 오류 없음.
- ego-browser(로컬 Docker, 학생 로그인): 질문 방식 3종 선택 가능, 기업별에서 「엔씨」 입력 → 자동완성 10건, 선택 후 직무 목록 19건(「전체」 포함),
  자소서 없이 → 경험 글 textarea 표시·자소서 카드 숨김, 가로 스크롤 없음. 실제 Deep 테스트 서버로 `POST /job-interviews`:
  미등록 기업 404, 기업별(전체·게임개발+담당 업무) 201 ×2, 자소서 없이 201, 빈 기업명 422. 저장 행의 `mode`·`direct_input`·NULL `resume_id` 확인.
  진입 주소(티켓)는 두 방식 모두 302 → `/external/interview/direct-start` 200(start_direct.js 포함).
  동의서 버전 상향으로 기존 학생은 1회 재동의가 필요하며 로컬 테스트 학생은 재동의 뒤 진행했다.
- 미확인: 면접 시작②의 iframe 화면이 끝까지 진행되는지(카메라·마이크 필요)와 Deep 결과 데이터 API 의 응답 스키마(완료된 면접 없음).
  검증으로 만든 Deep 세션(미완료)이 로컬 테스트 학생 이력에 남는다.
