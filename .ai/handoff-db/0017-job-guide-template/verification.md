# 0017 적용·검증 결과 — 2026-11-19 (로컬까지만, 서버 배포 없음)

- 승인: architecture-review.md ASTRA_APPROVED, work-order revision 2. 169 SQL 은 Astra 확정본 그대로,
  SHA256 `0373040d929508896d8f7cdc322f9313852511988f6be99addb32e39cc9f5ef4`.
- 테스트 DB `dreamcatch_test`: db 컨테이너 psql(postgres)로 169 단일 트랜잭션 적용 + `dc.schema_migration` 체크섬 기록.
- pytest(테스트 DB): 신규 `tests/test_job_guide_template.py` 15건(파라미터 포함) 통과 — 17키 모양·문서/단계 공백 다듬기 / 템플릿만 보내면 기본 객체 /
  422 8종(모르는 템플릿·모르는 키·길이·서류 13개·단계 7개·공백 단계·공백 서류명·서류 안 모르는 키) / 템플릿 없이 값만 → SQL NULL·옛 본문 NULL /
  PATCH 전환·끄기 + 이력 before/after / 멱등 재전송 같은 공고·다른 값 409 / DB CHECK 4종 직접 거절.
  test_jobs·test_jobs_review_security·test_job_wish_deadline 와 함께 61 passed, 1 failed — 실패는 기존 `test_gate_blocks_incomplete_diagnosis_and_opens_for_completed`(0016 때부터 재사용 테스트 DB 데이터로 실패, 무관).
- `npx tsc -b` 통과. `npm run docker:up` 완료 — 로컬 DB 169 적용.
- ego-browser(로컬 Docker, 진로취업상담사):
  - 등록 폼 「모집요강 템플릿」에서 요강 문서형 선택 → 입력칸·서류 칩 5개(자격증 사본 해당자)·전형 3단계 → 미리보기에서 3종 전환 확인 → 등록.
    API 응답 guideTemplate=DOCUMENT, guideFields 17키, documents·steps 그대로.
  - **수정 폼에서 연봉만 4,000→4,200 으로 바꿔 저장 → 템플릿·한 줄 소개 유지**(Astra 필수 확인).
  - 상세(학생과 같은 JobDetailView): 문서형 렌더, 마감 숫자 초록 rgb(21,128,61), 폰트 Pretendard. 템플릿 폭 375px 로 줄이면 한 열·넘침 0.
  - 콘솔 오류 0 · 실패 요청 0. 교직원 `/jobs` 목록 102ms·716KB(공고 본문 HTML 이 대부분 — 템플릿 키 추가분은 작다).
  - 페이지 가로 스크롤은 창 폭 1176 < 교직원 최소폭 1280 때문(템플릿 유무와 같음).
- 발견·수정: 문서형 표가 공용 `shared/tableAlignment.css`(모든 표 가운데 !important)에 걸려 가운데 정렬 → `<dl>` 정의 목록으로 바꿈.
  미리보기 제목 크기를 덮던 `.jge-preview h3` → 직계 자식만. 포스터형 모집분야에 제목·담당업무가 겹쳐 나오던 것 → 담당업무가 있으면 그것만.
- 검증용 공고 `[검증] 0017 템플릿`(job_96aa8dc3e9aa)은 사용자가 화면에서 볼 수 있게 로컬 DB 에 남겼다.
- 미확인: 학생 로그인으로 `/v2/jobs/:id` 를 직접 열지는 않았다(같은 공용 컴포넌트, 교직원 상세로 확인).
