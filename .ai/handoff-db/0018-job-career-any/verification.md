# 0018 검증 (2026-11-20, 팀장)

- Astra 승인(architecture-review.md, 롤백 주석 교정 반영) 후 적용.
- 테스트 DB(`dreamcatch_test`): 170 SQL + `schema_migration` 체크섬 한 트랜잭션으로 적용. `tests/test_jobs.py` 32 통과 · 1 실패(`test_gate_blocks_incomplete_diagnosis_and_opens_for_completed` — 영속 테스트 DB 의 jiwoo 진단 상태로 게이트가 열려 있음. 경력 코드와 무관).
- 로컬 Docker(`dreamcatch`): `docker:up` 부트스트랩으로 적용 → `JOB_CAREER_TYPE` = NEW 신입 · EXPERIENCED 경력 · ANY 경력무관.
- 화면: 교직원 `/admin/jobs/new` 경력 라디오 3개(신입·경력·경력무관). 학생 공고 상세 포스터형 pill 「정규직 · 신입 · 수습 3개월」.
- 서버(CentOS) 미적용 — 배포 지시 없음.
