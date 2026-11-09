# 대표 포트폴리오 작업지시서

- 상태: `ASTRA_APPROVED` (architecture-review.md)
- revision: `2` (Astra 교정: DDL CHECK 추가·인덱스 조건 단순화, 권한 함수 명시, 파일 URL prefix, 감사 target_kind, 지정 순서, version 미증가, 자소서 문항 라벨)
- 담당 구현: 팀장 직접(Codex Sol 미투입) — Astra 승인 후 구현
- 대상 handoff: `.ai/handoff-db/0011-portfolio-representative/`
- 관련 화면/기능: 학생 `/v2/mypage/portfolio` 「포트폴리오」 탭, 교직원 학생 상세 「포트폴리오」 탭(`src_admin/components/StudentDetailView.tsx` `PortfolioTab`)

## 0. 사용자 확정 (2026-11-09)

- 이력서와 포트폴리오는 같은 뜻이다. 학생은 회사 제출용 포트폴리오 여러 벌 중 **한 벌을 대표로 지정**한다.
- 대표 포트폴리오의 용도: ① 마이페이지 포트폴리오의 미리보기·PDF 대상 ② **교직원 학생 상세 「포트폴리오」 탭에 표시**. 채용 지원 모달의 기본 선택은 **아님**.
- 교직원 학생 상세에서는 대표 포트폴리오 문서를 **전부** 보여 준다(학생이 쓴 이메일·휴대폰·주소·생년월일 포함). 이것은 D06(학생 상세에 자기입력 연락처 미노출)을 대표 포트폴리오에 한해 넓히는 사용자 결정이다. 학생이 대표로 지정한 것을 공개 동의로 본다.
- 이메일·휴대폰은 나중에 학사 DB 연동값이 된다. 포트폴리오 문서 안의 이메일·휴대폰은 회사별로 다르게 쓸 수 있게 편집 가능하게 둔다(학사값 수정이 아니다 — 현행 그대로).
- 기존 모듈 원칙 「교직원은 미제출 초안을 볼 수 없다」(student_portfolio.py 머리말)는 대표 포트폴리오 한 벌에 한해 예외가 된다. 대표가 아닌 초안은 여전히 학생 본인 전용이다.

## 1. 기존 계약

| 항목 | 경로/값 |
|---|---|
| 원본 mock JSON | 없음 — 신규 계약 |
| 현재 loader/selector | `shared/portfolioStore.ts` `portfolioList`, `loadPortfolioDetail`; `shared/usePortfolioStore.ts` |
| 쓰는 화면 | `src_v2/pages/mypage/portfolio/PortfolioVersions.tsx` (목록·만들기·복제·이름 변경·삭제) |
| 읽는 화면 | 위 + 교직원 `StudentDetailView.tsx` `PortfolioTab`(현재는 성장 기록 projection `GET /students/{id}/portfolio` 를 ResumeSheet 로 그림) |
| 기존 API | `GET/POST /students/{identity}/portfolios`, `GET/PUT /students/{identity}/portfolios/{id}`, `POST …/{id}/delete`, `GET /portfolio-files/{file_id}`(업로더 본인 전용) |
| 기존 table | `dc.student_portfolio`(159), `dc.student_portfolio_event`(action CHECK CREATE·DELETE) |

## 2. 데이터 요구

| 동작 | 읽기/쓰기 | 필드 | 소유자 | 권한 | 생명주기/이력 |
|---|---|---|---|---|---|
| 대표 지정 | 쓰기 | portfolio id | 학생 | 학생 본인 | 학생당 살아 있는 대표 최대 1벌. 다른 벌을 지정하면 이전 대표는 해제. 지정 이력 남김 |
| 대표 해제 | 쓰기 | — | 학생 | 학생 본인 | 대표 없음 상태 허용 |
| 대표 삭제 | 쓰기 | — | 학생 | 학생 본인 | 논리삭제 시 대표도 해제 |
| 목록에 대표 표시 | 읽기 | `representative: boolean` | 학생 | 학생 본인 | — |
| 대표 문서 열람 | 읽기 | portfolio_dto 전체 | 학생 | 학생 본인 + 학생 상세 권한(`resolve_student` in growth.py: `students.1` 메뉴 + 상담사 전 학생 / 그 외 staff_student_scope) | 교직원 열람은 감사 기록 |
| 대표 문서 파일(사진·첨부) | 읽기 | 파일 스트림 | 학생 | 위와 같음 | 현재 대표 문서가 참조하는 파일만 |

## 3. 재사용 판정

- 판정: `ALTER_EXISTING_TABLE` + `EXTEND_QUERY_OR_API`
- 근거: 대표 여부는 포트폴리오 한 벌의 단일 속성이고 학생당 0~1개다. 별도 테이블은 필요 없다. 권한은 학생 상세의 기존 `growth.resolve_student` 를 재사용한다.
- 만들거나 바꿀 것: `dc.student_portfolio.is_representative`, 부분 unique 인덱스, `student_portfolio_event.action` 에 지정·해제 추가, API 3개 + 목록 필드.

## 4. DDL (후보 `backend/migrations/161_student_portfolio_representative.sql`)

최종본은 `architecture-review.md` §2 (Astra 교정). 요지:

```sql
ALTER TABLE dc.student_portfolio
 ADD COLUMN is_representative boolean NOT NULL DEFAULT false,
 ADD CONSTRAINT ck_student_portfolio_representative_live CHECK(NOT is_representative OR deleted_at IS NULL);
CREATE UNIQUE INDEX uq_student_portfolio_representative ON dc.student_portfolio(student_uid) WHERE is_representative;
ALTER TABLE dc.student_portfolio_event
 DROP CONSTRAINT student_portfolio_event_action_check,
 ADD CONSTRAINT student_portfolio_event_action_check CHECK(action IN ('CREATE','DELETE','REPRESENT','UNREPRESENT'));
```

- 삭제된 행은 대표일 수 없다는 것을 CHECK 로 DB 가 보장한다 → 부분 인덱스 조건은 `WHERE is_representative` 로 충분.
- `CONCURRENTLY` 금지 — migrate.py 가 전 파일을 한 트랜잭션으로 실행한다. 테이블이 작아 일반 CREATE INDEX 로 충분.
- CHECK 이름 `student_portfolio_event_action_check` 는 로컬 DB 에서 확인했다(2026-11-09).
- backfill 없음(기존 행은 모두 대표 아님). 학생이 직접 지정한다.
- 테이블 규모: 학생당 최대 20벌. 현재 로컬 행 수는 수 건.
- 복구: 앱을 먼저 되돌린다(구 앱은 새 컬럼을 읽지 않는다). 컬럼·인덱스는 남겨도 무해. 되돌려야 하면 새 forward migration 으로 `DROP INDEX`·`DROP COLUMN`, CHECK 는 새 action 행이 없을 때만 좁힌다.

## 5. Query와 인덱스

| 동작 | 규모 | 조건 | 인덱스 |
|---|---|---|---|
| 대표 조회 | 학생 상세 열 때 1회 | `student_uid=? AND is_representative` (deleted_at IS NULL 은 CHECK 로 보장되나 쿼리에도 남겨도 됨) | `uq_student_portfolio_representative` |
| 목록 | 기존 | 기존 + 컬럼 하나 | 기존 `ix_student_portfolio_listing` |
| 지정 | 드묾 | lock_student → 이전 대표 false → 대상 true | PK |

## 6. API 계약

| method/path | request | response | 권한 | 오류·동시성 |
|---|---|---|---|---|
| `GET /students/{identity}/portfolios` | — | 기존 + `items[].representative: boolean` | 학생 본인 | — |
| `POST /students/{identity}/portfolios/{id}/representative` | `{ representative: boolean }` (extra forbid) | `{ id, representative }` | 학생 본인(`owner`) | 404 없는 벌. `lock_student` → 대상 `get_portfolio(lock=True)`. 같은 값이면 이벤트 없이 그대로 반환(멱등). 지정은 **이전 대표 해제 UPDATE 를 먼저**, 대상 설정을 나중에(비지연 unique 인덱스). `version`·`updated_at` 은 올리지 않는다 |
| `GET /students/{identity}/representative-portfolio` | — | `portfolio_dto` (`files` URL 은 전부 아래 대표 파일 경로) 또는 `null` | **`growth.resolve_student`**(학생 본인 / `students.1` 메뉴 + career·psych 전 학생, 그 외 `staff_student_scope`). `jobs.resolve_student` 를 쓰지 않는다(메뉴 검사 없음) | 대표가 있고 교직원이면 `jobs.audit_document(conn,user,'STUDENT_PORTFOLIO',portfolio_id)` |
| `GET /students/{identity}/representative-portfolio/files/{file_id}` | — | 파일 스트림 | 위와 같음 | `file_id ∈ file_references(현재 대표 document)` 이고 file_object 가 READY·`uploaded_by=학생 uid`·(owner_kind,slot) ∈ {(STUDENT_PORTFOLIO,PORTFOLIO_PHOTO),(STUDENT_PORTFOLIO,PORTFOLIO_DOCUMENT),(GROWTH_ENTRY,PORTFOLIO_ATTACHMENT)} 일 때만, 아니면 404. 교직원이면 `audit_document(...,'FILE',file_id)` |
| `POST …/{id}/delete` | 기존 | 기존 | 기존 | 같은 UPDATE 에서 `is_representative=false`(CHECK 가 요구). 이벤트는 DELETE 한 건만 |

- 대표 문서의 `version`·`updatedAt` 은 그대로 내려준다. 교직원 쪽은 읽기 전용이다.
- `portfolio_dto` 의 `apply_academic` 을 그대로 쓴다(학사 값은 저장 때와 같은 함수로 채움). `file_map` 에 URL prefix 인자를 추가해 대표 경로에서는 모든 파일을 `/api/v1/students/{identity}/representative-portfolio/files/` 로 내려준다 — 기존 `/portfolio-files/`(업로더 전용)·`/growth-files/`(career 전 학생 미허용)는 교직원이 열 수 없다.
- 자소서 불러오기(사용자 결정 2026-11-09): `source_projection` 의 coverLetter `question` = 자소서 분야 라벨(`code_item` JOB_RESUME_CATEGORY → `category_label_legacy` → `title` 순), `answer` = content, 항목 제목은 `title`. 스키마 변경 없음, 기존 포트폴리오 backfill 없음.

## 7. 프론트 반영

- `shared/portfolioStore.ts`: `PortfolioSummary.representative`, `setRepresentative()`, `loadRepresentativePortfolio()`.
- 학생 목록: 대표 배지, 「대표로 지정」/「대표 해제」. 포트폴리오 탭 맨 위에 대표 포트폴리오 미리보기(`shared/PortfolioSheet`), 머리말 「미리보기·PDF」 대상이 대표.
- 이력서 탭(ResumeSheet, 성장 projection) 삭제. 교직원 `PortfolioTab` 은 대표 포트폴리오를 `PortfolioSheet` 로 그리고, 없으면 「학생이 대표 포트폴리오를 지정하지 않았습니다」 빈 상태.

## 8. 테스트

- 지정 → 목록 representative 1벌, 다른 벌 지정 → 이전 해제, 해제 → 0벌.
- 삭제된 대표는 대표 조회에서 사라지고 다시 지정 가능.
- 다른 학생·권한 없는 교직원 404/403, 상담사(career) 열람 200, 감사 행 1건.
- 대표 아닌 초안 파일은 대표 파일 경로로 404.
- 동시 지정 두 요청 → 대표 1벌(부분 unique).
- 대표 지정·해제 후 해당 벌의 `version`·`updatedAt` 불변(열린 편집기 409 방지).
- 메뉴 없는 교직원 403 MENU_DENIED, 범위 밖 교수 404, psych 200.
- 교직원 GET 응답의 `files[*].url` 이 전부 대표 파일 경로이고, 그 URL 로 사진·성장 첨부·포트폴리오 첨부 200 + 감사 FILE 행.
- 대표가 아닌 다른 벌의 파일 id·남의 파일 id·삭제(READY 아님) 파일 → 404. 대표 해제 직후 이전 대표 파일 → 404.
- 학생 본인 GET 은 감사 행 0건. 대표 없음이면 `null` + 감사 0건.
- 자소서 불러오기: 분야 있는 자소서 → `question`=분야 라벨, 분야 코드 없음·라벨 없음 → `title`.

## 9. Astra 리뷰 요청 사항

- 위 DDL·인덱스·CHECK 교체의 잠금·안전성, 이벤트 action 확장이 맞는지.
- 교직원 열람 감사 테이블 선택(`dc.job_access_event` 재사용 vs 다른 테이블).
- 대표 파일 경로의 권한 판정 방식.

## 10. 구현 기록 (2026-11-09, 팀장)

- Astra 승인(rev 2) 그대로 구현: `161_student_portfolio_representative.sql`(§2 원문), `student_portfolio.py`(목록 컬럼·지정 API·삭제 시 해제·대표 GET·대표 파일 GET·자소서 문항=분야 라벨), 테스트 6건 + 계약 fixture `representative`.
- 회귀: 포트폴리오 관련 83건 통과. 전체 실행의 실패 9건 중 4건은 알려진 제외 대상, 나머지 5건은 C5 심리선별(160)·진단·로드맵·학생 퇴역 쪽으로 이 변경과 무관.
- 로컬 DB: 161 은 2026-11-09 02:24 UTC 에 160 과 같은 트랜잭션으로 적용돼 있었다(이 세션 밖의 docker:up). 이 세션은 160 을 빼고 반영하려 했으나 이미 적용된 뒤였다.
- 프론트: 학생 포트폴리오 탭 상단 대표 미리보기·PDF, 목록 「대표로 지정/해제」, 교직원 학생 상세 「포트폴리오」 탭 = 대표 포트폴리오(PortfolioSheet). 이력서 탭과 `ResumeSheet` 컴포넌트 삭제.
- 브라우저(ego-browser): 학생 대표 지정→미리보기, career_kim 학생 상세 탭 표시, 대표 GET 호출 각 1회, 콘솔 오류 0. 확인용 포트폴리오는 삭제(논리삭제·이벤트·감사 행은 append-only 라 남음).
