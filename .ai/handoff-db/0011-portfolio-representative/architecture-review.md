# 대표 포트폴리오 — Astra 설계 리뷰

- 판정: `ASTRA_APPROVED`
- 승인한 work-order revision: `2` (이 리뷰에서 교정)
- 리뷰일: 2026-11-09
- 근거 확인: `backend/app/student_portfolio.py`, `growth.py`(resolve_student·download_growth_file), `jobs.py`(resolve_student·audit_document·application_portfolio_file·RESUME_SELECT), `portfolio_document.file_references`, `files.get_file`, `migrations/022`(job_access_event)·`159`, `migrate.py`, 로컬 DB(PostgreSQL 17.11) 카탈로그 읽기 전용 조회. DB 쓰기·migration 적용 없음.

## 1. 교정한 설계와 근거

| # | 원안 | 교정 | 근거 |
|---|---|---|---|
| 1 | 부분 unique `WHERE is_representative AND deleted_at IS NULL` | CHECK `NOT is_representative OR deleted_at IS NULL` 추가, 인덱스는 `WHERE is_representative` | "삭제된 벌은 대표가 아니다"를 DB 가 보장. 삭제 경로가 플래그를 안 지우는 버그를 CHECK 가 즉시 실패시킨다 |
| 2 | 인덱스 생성 방식 미정 | 일반 `CREATE UNIQUE INDEX` (CONCURRENTLY 금지) | `migrate.py` 가 한 연결·한 트랜잭션에서 모든 파일을 실행 → CONCURRENTLY 는 트랜잭션 블록 안에서 에러. 대상 행 수 건, 학생당 ≤20벌이라 잠금 시간 무시 가능 |
| 3 | CHECK 이름 확인 필요 | `student_portfolio_event_action_check` 확인 | `pg_constraint` 조회 결과 그대로 존재 |
| 4 | 권한 `growth.resolve_student` (모듈은 `jobs.resolve_student` import 중) | 대표 GET 두 경로는 반드시 `growth.resolve_student` | `jobs.resolve_student` 는 `students.1` 메뉴 검사가 없다. 학생 상세 탭과 같은 판정이어야 한다. growth 판은 `(student, is_owner)` 튜플을 반환 |
| 5 | 파일 URL 미정 | `file_map` 에 prefix 인자, 대표 경로는 모든 파일을 `/api/v1/students/{identity}/representative-portfolio/files/{id}` 로 | `/portfolio-files/` 는 업로더 본인 전용, `/growth-files/` 는 `staff_student_scope` 만 보고 career·psych 전 학생 규칙이 없다 → 교직원이 사진·첨부를 못 연다 |
| 6 | 지정 순서 미정 | 이전 대표 해제 UPDATE → 대상 설정 UPDATE | unique 인덱스는 비지연이라 문장마다 검사. 순서가 반대면 23505 |
| 7 | version 처리 미정 | 지정·해제는 `version`·`updated_at` 을 올리지 않는다 | 대표 여부는 문서 내용이 아니다. 올리면 다른 창의 편집기 저장이 VERSION_CONFLICT, 목록 정렬(updated_at)도 흔들린다. 이력은 event 행이 남긴다 |
| 8 | 감사 테이블 판단 요청 | `dc.job_access_event` 재사용, `jobs.audit_document` 그대로 호출 | 열람 감사 테이블은 이것 하나(다른 것은 care7_annual_access 전용). `target_kind` 에 CHECK 가 없어 constraint 변경 불필요(022 정의 + 로컬 카탈로그 확인). action 은 기존 `VIEW_DOCUMENT` 로 CHECK 범위 안 |
| 9 | 삭제 시 이벤트 미정 | DELETE 한 건만. UNREPRESENT 별도 기록 안 함 | 삭제가 대표 해제를 함의. 같은 UPDATE 로 플래그를 지우는 것은 CHECK 가 강제 |

이벤트 action `REPRESENT`·`UNREPRESENT` 확장은 맞다. 대표 지정은 학생의 명시 행위이고, 교직원 공개 범위(D06 예외)를 바꾸는 동의 이벤트이므로 append-only 이력이 필요하다. `student_portfolio_event` 는 이미 이 벌의 생명주기 이력이고 `seq` 규칙(record_event)을 그대로 쓴다. 다른 벌로 갈아탈 때는 이전 벌 UNREPRESENT + 새 벌 REPRESENT 두 행.

## 2. 최종 migration — `backend/migrations/161_student_portfolio_representative.sql`

160(`160_c5_psych_screening.sql`)이 이미 있으므로 161 은 비어 있다(로컬 DB 적용 이력은 159 까지, 160 미적용).

```sql
-- Representative portfolio: a student marks at most one live portfolio as representative.
-- Staff with student-detail access read only that one. Design: .ai/handoff-db/0011-portfolio-representative.
-- Runs inside migrate.py's single transaction, so no CONCURRENTLY. Table is tiny (<=20 rows per student).
-- Rollback: revert the app first (old app never reads the column). Column, CHECK and index are harmless.
-- Narrow the event CHECK only when no REPRESENT/UNREPRESENT rows exist.

ALTER TABLE dc.student_portfolio
 ADD COLUMN is_representative boolean NOT NULL DEFAULT false,
 ADD CONSTRAINT ck_student_portfolio_representative_live CHECK(NOT is_representative OR deleted_at IS NULL);

-- One representative per student. Deleted rows cannot be representative (CHECK above).
CREATE UNIQUE INDEX uq_student_portfolio_representative ON dc.student_portfolio(student_uid)
 WHERE is_representative;

ALTER TABLE dc.student_portfolio_event
 DROP CONSTRAINT student_portfolio_event_action_check,
 ADD CONSTRAINT student_portfolio_event_action_check
  CHECK(action IN ('CREATE','DELETE','REPRESENT','UNREPRESENT'));
```

- GRANT 추가 불필요: dc_app 은 student_portfolio SELECT/INSERT/UPDATE, student_portfolio_event SELECT/INSERT, job_access_event SELECT/INSERT 를 이미 가진다.
- `ADD COLUMN ... DEFAULT false` 는 PG11+ 에서 메타데이터 변경(재작성 없음). CHECK 검증 스캔·인덱스 생성은 수 행.
- 주석은 ASCII 로 둔다(파일 체크섬 고정, 인코딩 문제 회피). 적용 후 파일 수정 금지.

## 3. 구현 규칙 (Sol/팀장이 그대로 따른다)

### 3-1. `POST /students/{identity}/portfolios/{portfolio_id}/representative`
1. `owner(conn,user,identity)` (학생 아니면 403 SCOPE_DENIED, 남의 학생 404).
2. body `RepresentBody{ representative: bool }`, `extra='forbid'`.
3. `lock_student(conn, uid)` → `target = get_portfolio(conn, uid, id, lock=True)` (삭제·없음 404).
4. `target.is_representative == body.representative` → 이벤트 없이 `{id, representative}` 반환.
5. true: `UPDATE dc.student_portfolio SET is_representative=false WHERE student_uid=%s AND is_representative AND id<>%s RETURNING id` → 반환 행마다 `record_event(...,'UNREPRESENT')`; 이어서 `UPDATE ... SET is_representative=true WHERE id=%s AND student_uid=%s`; `record_event(...,'REPRESENT')`.
6. false: `UPDATE ... SET is_representative=false WHERE id=%s AND student_uid=%s`; `record_event(...,'UNREPRESENT')`.
7. `version`·`updated_at`·`updated_by` 를 건드리지 않는다. 멱등 키 불필요(상태 지정형, 4번이 멱등).
8. 23505 는 lock_student 직렬화로 정상 경로에선 나지 않는다. 방어로 잡으면 409 `REPRESENTATIVE_CONFLICT`.

### 3-2. 목록
`list_portfolios` SELECT 에 `is_representative AS representative` 추가. 그 외 불변.

### 3-3. `GET /students/{identity}/representative-portfolio`
1. `student, is_owner = growth.resolve_student(conn, user, identity)` — 학생 본인 / 교직원은 `students.1` 메뉴(없으면 403 MENU_DENIED) + role career·psych 전 학생, 그 외 `staff_student_scope`(없으면 404).
2. `row = SELECT * FROM dc.student_portfolio WHERE student_uid=%s AND is_representative AND deleted_at IS NULL`. 없으면 `null`(200), 감사 없음.
3. `portfolio_dto(conn, row, student, prefix=f'/api/v1/students/{identity}/representative-portfolio/files/')` — 모든 파일(사진·성장 첨부·포트폴리오 첨부) URL 을 이 prefix 로.
4. `jobs.audit_document(conn, user, 'STUDENT_PORTFOLIO', row['id'])` (STAFF 일 때만 기록하는 기존 함수. 본문·PII 를 넣지 않는다).
5. 교직원 전용 쓰기 경로는 만들지 않는다. 기존 `/portfolios*` 경로는 계속 학생 본인 전용(`owner`).

### 3-4. `GET /students/{identity}/representative-portfolio/files/{file_id}` (file_id 는 `ID_PATTERN`)
1. 3-3 의 1·2 와 같은 판정. 대표 없으면 404.
2. `photo, attachments = file_references(row['document'])`; `file_id` 가 그 안에 없으면 404. (portfolio_dto 의 `files` 맵과 같은 집합이다.)
3. `SELECT * FROM dc.file_object WHERE id=%s AND state='READY' AND uploaded_by=%s` (학생 uid) 이고 `(owner_kind,slot)` 이 사진이면 `(STUDENT_PORTFOLIO,PORTFOLIO_PHOTO)`, 첨부면 `(STUDENT_PORTFOLIO,PORTFOLIO_DOCUMENT)` 또는 `(GROWTH_ENTRY,PORTFOLIO_ATTACHMENT)` 일 때만 허용, 아니면 404. — 저장 시 `check_files` 와 같은 규칙을 열람 시 다시 적용해 문서에 박힌 남의 파일 id 를 막는다.
4. `audit_document(conn, user, 'FILE', file_id)` 후 `files.stream(row)`.
5. 판정은 "현재" 대표 기준이다. 해제·삭제·다른 벌 지정 직후 이전 파일은 404. 제출본(job_attempt_portfolio)과 달리 스냅샷이 아니므로 READY 가 아닌 파일은 열지 않는다.

### 3-5. 삭제
`UPDATE dc.student_portfolio SET deleted_at=now(),deleted_by=%s,version=version+1,is_representative=false WHERE ...` — 같은 문장. 이벤트 DELETE 한 건.

### 3-6. 자소서 불러오기 문항 = 분야 라벨 (사용자 결정 2026-11-09)
팀장 제안 그대로 승인:
```sql
SELECT r.id,r.title,r.content,COALESCE(c.label,r.category_label_legacy,'') AS category_label
FROM dc.job_resume r
LEFT JOIN dc.code_item c ON (c.group_code,c.code)=('JOB_RESUME_CATEGORY',r.category_code)
WHERE r.student_uid=%s AND r.deleted_at IS NULL ORDER BY r.updated_at DESC,r.id
```
`'question': row['category_label'] or row['title']`, `'answer': row['content']`, 항목 제목 `row['title']`.
- 인덱스: `job_resume_owner (student_uid, updated_at DESC, id) WHERE deleted_at IS NULL` 가 조건·정렬을 그대로 덮는다. code_item 은 PK `(group_code, code)` 조회. 확인함.
- 권한: dc_app 은 `code_item` SELECT 보유(로컬 확인).
- 라벨 우선순위는 `jobs.resume_dto` 의 `category_label or category_label_legacy` 와 같다. JOB_RESUME_CATEGORY 22개 코드 로컬 존재.
- 영향 범위: `create_portfolio`(성장 기록에서 새로 만들기)와 `portfolio-source` 응답. 이미 만든 포트폴리오 문서는 바뀌지 않는다(backfill 없음, 학생 문서 원본 보존이 맞다).

## 4. 예상 주요 query와 인덱스 대응표

| query | 빈도 | 인덱스 |
|---|---|---|
| 대표 1건 조회 `student_uid=? AND is_representative` | 학생 상세 포트폴리오 탭·학생 포트폴리오 탭 열 때 1회 | `uq_student_portfolio_representative` (학생당 0~1행) |
| 이전 대표 해제 `student_uid=? AND is_representative AND id<>?` | 드묾 | 같은 부분 인덱스 |
| 대상 잠금·설정 | 드묾 | `pk_student_portfolio` |
| 목록 | 기존 | `ix_student_portfolio_listing` |
| 파일 판정 | 파일 1개당 1회 | `file_object` PK |
| 감사 INSERT | 교직원 열람당 1 + 파일당 1 | `job_access_event_actor` (append-only, 8천 명 규모에서 무시 가능) |
| 자소서 투영 | 포트폴리오 생성·불러오기 | `job_resume_owner`, `code_item_pkey` |

N+1 없음: 대표 GET 은 portfolio 1행 + `file_object id=ANY` 1회 + `load_certs` 1회.

## 5. 위험·migration·rollback

- 잠금: 세 ALTER 와 인덱스가 짧게 ACCESS EXCLUSIVE/SHARE 를 잡는다. 행 수가 작아 밀리초 단위. 운영 적용 시에도 동일.
- rollback: 앱을 먼저 되돌린다. 구 앱 INSERT 는 기본값 false 로 통과한다. 단 구 앱의 삭제 UPDATE 는 플래그를 지우지 않으므로 대표인 벌을 삭제하면 CHECK 위반(500)이 난다 → 구 앱으로 되돌릴 때는 forward migration 으로 `UPDATE dc.student_portfolio SET is_representative=false WHERE is_representative` 를 먼저 실행한다(이벤트 행은 남긴다). 스키마 되돌림은 새 forward migration 으로만.
- 개인정보: 대표 지정 = 교직원 공개 동의(사용자 결정 0절). 비대표 초안은 여전히 학생 전용 — 대표 경로는 대표 1벌 외의 id 를 받지 않는다(경로에 portfolio id 자체가 없다). 감사 행에는 id 와 해시만.
- 동시성: `lock_student` 가 지정·저장·삭제를 학생 단위로 직렬화하고, 부분 unique 가 최후 방어.
- 경쟁: 학생이 대표 문서를 저장하는 동안 교직원 GET 은 커밋된 직전 판을 본다(허용).

## 6. JSON 호환성 테스트 항목

- `GET /students/{id}/portfolios` `items[]` 기존 키(`id,title,updatedAt,version,complete`) 유지 + `representative: boolean`.
- `POST …/representative` 응답 정확히 `{id: string, representative: boolean}`.
- `GET …/representative-portfolio` 응답이 `portfolio_dto` 와 같은 키(`id,title,document,version,updatedAt,complete,missing,files`) 또는 JSON `null`. `files` 는 `{fileId: file_dto}` 이고 url 이 대표 파일 prefix.
- work-order §8 테스트 전부.

## 7. 실행 순서

1. `161_student_portfolio_representative.sql` 추가(§2 텍스트 그대로) → 로컬 migrate.
2. `student_portfolio.py`: `file_map`/`portfolio_dto` prefix 인자(기본값 기존 동작), 목록 컬럼, 지정 API, 삭제 UPDATE, 대표 GET·파일 GET(`growth.resolve_student` import), 자소서 투영 쿼리.
3. 계약·권한 테스트(§6, work-order §8).
4. `shared/portfolioStore.ts` → 학생 목록·탭 → 교직원 `PortfolioTab`. `npx tsc -b`.
5. ego-browser 로 학생·career·교수 역할 네트워크 측정(중복 호출·감사 행 수), 로컬 Docker 반영.

## 8. USER_DECISION_REQUIRED

없음. (D06 확장·대표=공개 동의·자소서 문항 라벨은 사용자 확정 사항으로 반영됨.)
