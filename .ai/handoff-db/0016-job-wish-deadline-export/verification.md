# 0016 적용·검증 결과 — 2026-11-19 (로컬까지만, 서버 배포 없음)

- 승인: architecture-review.md ASTRA_APPROVED, work-order revision 2. 168 SQL 은 Astra 교정본(COMMENT 추가) 그대로,
  SHA256 `ec7ea0dfd24e9b731127c9670eb8ec5c97081339ce1451f9b1e49f17348854d4`.
- 테스트 DB `dreamcatch_test`: db 컨테이너 psql(postgres)로 168 단일 트랜잭션 적용 + `dc.schema_migration` 체크섬 기록.
- pytest(테스트 DB): 신규 `tests/test_job_wish_deadline.py` 7건 통과 —
  마감 18:00 경계(18:00 POSTED·18:01 CLOSED)·23:59 기본·다음날 00:00 CLOSED / 지난 시각 지원 409·시각 전 201 /
  형식 422(`24:00`·`9:00`·`18:00:00`)·ALWAYS·ON_HIRE 는 23:59 정규화·ON_HIRE 제목 수정 시 날짜·시각 유지 /
  wishCount 2→1·학생 응답에도 명수·wishers 7키·최근 찜 순·학생 403·채용 메뉴 없는 교직원 403·삭제 공고 404 /
  posting_event 에 wishCount 없음 / 대시보드 당일 시각 경계(clock 고정, 롤백).
- 기존 test_jobs·test_jobs_review_security·test_counsel_dashboard·test_boot_contract·test_remaining_migrations: 71 passed, 5 failed.
  실패 5건(`test_gate_blocks_incomplete_diagnosis_and_opens_for_completed`, `test_home_jobs_split_internal_open_postings_with_recommended_applicants`,
  test_boot_contract 3건)은 **jobs.py·counsel_dashboard.py 변경을 stash 로 뺀 상태에서도 똑같이 실패** — 재사용 테스트 DB 의 이전 데이터 때문이며 이 변경과 무관.
- `npx tsc -b` 통과. `npm run docker:up` 완료 — 로컬 DB 168 적용, 기존 교내·외부 공고 7건 모두 23:59.
- ego-browser(로컬 Docker):
  - 진로취업상담사: 교내공고 관리 상단 「등록일 ~ 목록 다운로드」(기본 최근 1년), 카드 「지원 N명 · ★ 찜 N명」, 마감 「~10.14 23:59」.
    공고 등록 폼에 성별 행 없음, 지원마감 시각 입력 기본 23:59.
  - 검증용 공고(12-31 18:00)를 API 로 만들고 학생(fixture) 로그인 → 학생 카드 「찜 0명」→ 별 클릭 → 「찜 1명」, 마감 「~12.31 18:00」.
    학생이 `/jobs/{id}/wishers` 호출 시 403. 학생 상세: 성별 「성별 무관」, 지원마감일 「2026-12-31 18:00」.
  - 상담사 카드 「찜 1명」 클릭 → 「찜한 학생 — 넥슨 · …」 모달(번호·이름·학번·대학·학과·학년·찜한 날) 1행, wishers 27ms·0.5KB.
    목록 다운로드 클릭 → xlsx 4.8KB 생성. 콘솔 오류 0 · 실패 요청 0.
  - 검증용 찜 1건은 로컬 DB 에서 지우고 검증용 공고는 API 로 삭제(논리삭제)했다.
- 미확인: 내려받은 엑셀을 열어 열 내용을 눈으로 보지는 않았다(행 조립은 `jobExportRows`, 생성 바이트만 확인).
  교수 등 비상담사 메뉴 보유자의 범위 제한 목록은 pytest 의 권한 술어로만 확인.
