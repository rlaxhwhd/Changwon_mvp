# 0014 AI 인터뷰 질문 방식 3종(자소서 없이·기업별) — 적용 전 Astra 검토

- revision: 1
- 상태: ASTRA_APPROVED (architecture-review.md 2026-11-18 — 적용 전 필수 후속 4건 문서 반영 조건)
- 사용자 요청: 2026-11-18, 「Deep_APII_V2 문서 읽고 면접결과랑 자소서 결과 더 자세히 데이터 받는지 확인하고 다 진행해줘」.
- 근거 문서: `docs/Deep_APII_V2.xlsx`(커밋 금지) — 면접 시작②(`POST /external/v1/interview/direct/sessions`, mode `no_cover`/`company`),
  기업명 자동완성(`GET …/interview/companies/search?q&limit`), 직무 목록(`GET …/interview/companies/job-categories?company`).
- 신규 마이그레이션: `backend/migrations/166_job_interview_session_mode.sql`
  SHA256 `62f2712c88eda0e7685516d7469df5f529bbcbcde1765d7176b41273499bdbf3`
  (승인 시 `bd5833de…`; 승인 후 리뷰의 후속 1에 따라 롤백 주석만 정정 — DDL 동일, 재검토 불필요로 명시됨).
  롤백 규칙: `SELECT count(*) FROM dc.job_interview_session WHERE mode <> 'cover'` 가 0 이면 앱만 되돌리고 166 은 둔다. 0 이 아니면 forward-fix.
- 코드: `backend/app/deep.py`(create_direct_interview·search_companies·job_categories·call params), `backend/app/jobs.py`
  (InterviewBody source 분기, cover_interview_info/direct_interview_info, interview_dto mode, GET /job-interview-companies 2개,
  동의서 버전 2026-11-18), `backend/tests/test_deep.py`(FakeDeep 확장 + 테스트 2개), 화면 `src_v2/pages/jobs/AiInterview.tsx`·`interviewApi.ts`.

## 무엇이 바뀌나

164 는 자소서 기반 면접만 알아 `resume_id`·`resume_snapshot` 이 NOT NULL 이었다. Deep 면접 시작②는 자소서 없이(학생이 적는
경험 글 ≤1000자) 또는 기업별 질문(Deep 에 질문이 등록된 기업명 + 직무)으로 면접을 만든다. 166 은

- `mode text NOT NULL DEFAULT 'cover' CHECK IN ('cover','no_cover','company')` 추가 — 기존 행은 모두 'cover'.
- `direct_input jsonb` 추가 — 학생이 직접 입력해 Deep 에 보낸 값의 발생 시점 스냅샷
  (`{"interview_content": "…"}` 또는 `{"company": "…", "job_category": "…"}`), Deep 필드명 그대로.
- `resume_id`·`resume_snapshot` NOT NULL 해제 + CHECK `ck_job_interview_mode_resume`((mode='cover') = (resume_id IS NOT NULL),
  resume_id NULL ⇔ resume_snapshot NULL), `ck_job_interview_mode_input`((mode='cover') = (direct_input IS NULL)).
- `interview_info` 는 전과 같이 Deep `interview_info` 그대로(workTask 선택 포함). 불변 트리거·인덱스·UNIQUE·권한은 164 그대로.

API: `POST /job-interviews` 본문에 `source`(cover|none|company, 기본 cover) 와 직접 입력 필드(jobType≤15, company·position·
workTask·jobCategory≤100, content≤1000)를 추가했다. 기존 자소서 기반 본문은 그대로 동작한다(source 생략 = cover).
빈 필수값은 Deep 호출 전에 422. Deep 의 `company_not_found`/`question_not_found` 는 404 로 안내한다. 기업명·직무 목록 조회는
학생 본인 토큰으로 Deep 을 그대로 호출하고 DB 는 건드리지 않는다. 결과 데이터 API(GET interview/results, /results/{id})는
응답 스키마가 문서에 없고 로컬에 완료된 면접이 없어 이번 범위에서 화면을 만들지 않았다(결과 화면은 기존 iframe).

## 검토 요청 사항

ALTER 의 잠금·재작성 여부(상수 기본값 ADD COLUMN·DROP NOT NULL·CHECK 추가 — 소량 테이블), CHECK 의 모드별 정합성(기존 행 통과),
불변 트리거와 새 컬럼의 관계(종료 1회 UPDATE 만 허용되는지), `interview_dto` 의 NULL 처리, 직접 입력값 길이 한도(Deep 한도와 일치),
본인·학생 권한(`deep_principal`·`require_deep`), 자동완성 호출 빈도(입력 멈춤 300ms 디바운스, 서버 측 제한 없음 — 필요 여부),
동의서 버전 상향(수집 항목 문구에 「직접 입력한 면접 내용」 추가 → 전원 1회 재동의)의 적절성, 롤백(앱 되돌리기 → 자소서 없는 행 보존).

## 적용 순서(승인 뒤)

승인 전에는 테스트 DB 포함 어떤 DB에도 166 을 적용하지 않는다. 승인 후 테스트 DB(dreamcatch_test, 15432) 적용 → `tests/test_deep.py`
→ `npx tsc -b` → `npm run docker:up`(로컬 Docker, 166 자동 적용) → ego-browser 검증 → 커밋·푸시. CentOS 서버 배포는 하지 않는다.
