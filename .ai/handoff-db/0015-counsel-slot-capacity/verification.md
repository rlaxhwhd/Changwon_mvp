# 0015 적용·검증 결과 — 2026-11-19 (로컬까지만, 서버 배포 없음)

- 승인: architecture-review.md ASTRA_APPROVED, work-order revision 2. 167 SQL 무수정, SHA256 `3b3c2442006bade57d3cb1b740f018b7c0fc1a8d2488e897e93d1271702c359b`.
- 테스트 DB `dreamcatch_test`: db 컨테이너 psql(postgres)로 167 을 단일 트랜잭션 적용 + `dc.schema_migration` 체크섬 기록. 기존 행 AVAILABLE 5·EXCLUDED 3 모두 capacity 1.
- pytest(테스트 DB): 신규 `tests/test_counsel_slot_capacity.py` 5건(인원 2 → 3번째 409 · 긴 일정 변경 허용 · 인원 1 종전 문구 · `/counsel-slots` available ·
  capacity 0/21 422·excluded 1·옛 본문 기본 1) 포함 34 passed.
  실패 3건(`test_assign_uses_student_gates`, `test_a_student_cancels_any_time_before_the_slot_but_not_after_it_starts`,
  `test_home_jobs_split_internal_open_postings_with_recommended_applicants`)은 **이번 백엔드 변경을 stash 로 뺀 상태에서도 똑같이 실패** —
  재사용 테스트 DB 에 남은 이전 실행 데이터(같은 학생의 미래 14:00 예약 다수 등) 때문이며 이 변경과 무관하다.
- `npx tsc -b` 통과. `npm run docker:up` 완료 — 로컬 DB 167 적용(AVAILABLE 8·EXCLUDED 3 모두 1), 컨테이너 전부 healthy.
- ego-browser(로컬 Docker, 진로취업상담사 박서준):
  - 가능 시간대: 「1시간당 인원」 입력·안내문, 기존 시간대 「· 1명」 표시. 수요일 13:00–15:00 · 2명 추가 → DB capacity 2 저장 확인.
  - 신청 접수함 2026-11-25(수): 「13:00 0/2명 · 2명 가능 · 학생 추가」, 「14:00 0/2명」. 토글 없이 일정 한 화면.
  - 임시 대기 신청 1건(13:00) 넣은 뒤: 「13:00 1/2명」 칸에 신청 카드(상세 보기·상담 처리) + 「1명 더 받을 수 있습니다 · 학생 추가」.
  - 콘솔 오류 0 · 실패 요청 0. `/counsel-schedules/career_park` 30ms, `/counsel-requests` 44~176ms.
  - 검증용 임시 신청 1건과 추가한 수요일 시간대는 로컬 DB 에서 삭제했다(박서준 시간대는 원래 월·화 09–17 · 1명).
- 미확인: 학생 추가 팝업으로 실제 학생을 두 명 채워 「인원 마감」까지 가는 UI 왕복(이 상담사 범위에서 게이트가 열린 학생을 찾지 못함) —
  같은 판정은 pytest(check_slot·/counsel-slots)로 확인했다. 학생 /v2 화면에서의 시각 비활성도 API(`/counsel-slots` available=false)로만 확인.
