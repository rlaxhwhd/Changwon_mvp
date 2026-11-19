# 0017 Astra 설계 리뷰 — 채용공고 모집요강 템플릿

- 판정: **ASTRA_APPROVED** (교정 후 승인 — 업무 의미 변경 없음, USER_DECISION_REQUIRED 없음)
- 승인한 `work-order.md` revision: **2**
- 마이그레이션 169: 어떤 DB에도 적용하지 않았다(테스트 DB 포함). 앱 코드·프론트는 건드리지 않았다.
- `DB_SCHEMA.md` 변경 없음(공고 행에 열 2개 추가, 새 엔티티 아님).

## 검토 요청 답변

### 1. jsonb 한 컬럼 vs 정규화 표 → **jsonb 승인**
- 소유권·생명주기·권한이 공고와 완전히 같다(공고와 함께 생성·수정·논리삭제, 관리 권한도 `require_manage` 하나).
- cardinality: 공고 1건당 문서 ≤12·단계 ≤6, 개별 행으로 조회·집계·검색·참조(FK)하는 요구가 없다. 정규화하면 `job_posting_option` 처럼
  delete-insert 치환 + 목록마다 `ANY(ids)` 쿼리 1개가 늘 뿐 얻는 것이 없다.
- 「한 사실 한 곳」 확인: 회사명·제목·연봉·근무지·근무형태·마감·채용유형은 기존 열에서 읽고 jsonb 에 복사하지 않는다(설계대로).
  `address`(근무지 상세)는 `location_text` 의 보충값이라 중복이 아니다(없으면 화면이 `location` 으로 폴백).

### 2. DB CHECK 범위 → **열거·object 모양 + 짝 제약 추가**
- 승인: 템플릿 열거, `jsonb_typeof='object'`. 키·길이 검증은 API(`extra='forbid'`) — 템플릿 키 변경마다 DB 마이그레이션이 필요해지는 결합을 피한다.
- **추가**: `posting_guide_pair CHECK((guide_template IS NULL)=(guide_fields IS NULL))`. revision 1 의 API 규칙(템플릿 NULL→값 NULL, 템플릿 있으면 값 객체)을
  DB 불변식으로 고정한다. 022 `posting_source_pair` 와 같은 패턴. 수동 SQL·향후 수집기·백필이 반쪽 상태를 만들지 못한다.
- 제약 3개에 이름을 붙였다(022 `posting_*` 명명).
- 크기 상한 CHECK(`pg_column_size`)는 두지 않는다 — API 길이 합 상한이 약 6천 자(한글 최악 ~18KB)라 충분히 묶인다.

### 3. `/jobs` 목록 응답 크기 → **목록 DTO 에 유지**
- 목록이 이미 `content`(`content_html`, `JOB_CONTENT_MAX_CHARS`=20,000,000)를 싣는다. 템플릿 값은 상한 약 6천 자·보통 1~2KB 로 상대적으로 무시 가능.
- 학생 상세(`JobDetailView`)와 교직원 `JobForm` 은 동기 셀렉터 `getJobById`(readAll 로 채운 스토어)를 읽는다. 목록에서 빼면
  상세 진입 시 `/jobs/{id}` 지연 조회·로딩 상태를 새로 만들어야 하고, 목록·상세 DTO 가 갈라진다(SPEC §5 로더 동기 유지 규칙과 충돌).
- 목록 경량화가 필요해지면 `content` 와 함께 묶어 한 번에 다룰 문제다(별 작업). 이번엔 ego-browser 로 `/jobs` 응답 크기·시간 전후만 기록한다.

## 교정한 설계(revision 1 → 2)

| # | 교정 | 근거 |
|---|---|---|
| 1 | 짝 CHECK `posting_guide_pair` 추가, 제약 이름 부여, COMMENT 보강 | API 규칙을 DB 불변식으로. 롤백·진단 시 이름으로 식별 |
| 2 | 템플릿만 있고 값 생략 시 `{}` → `GuideFields()` 기본값 전체 객체 | revision 1 은 「`{}` 저장」과 「`Jsonb(model_dump())`」가 모순. 저장값=응답값이 늘 17키 같은 모양 |
| 3 | `Jsonb(model_dump(mode='json'))`, NULL 은 파이썬 `None` | `Jsonb(None)` 은 JSON `null` → `jsonb_typeof='null'` 로 CHECK 위반 500 |
| 4 | `GuideDoc` 에 `str_strip_whitespace` 직접, `steps` 원소는 `Annotated[str, StringConstraints(strip_whitespace, 1..40)]` | 중첩 모델은 부모 config 를 물려받지 않는다 — 공백 이름이 통과 |
| 5 | `posting_dto` 는 저장 dict 그대로, 읽기 재검증 금지 | 키를 나중에 빼면 `extra='forbid'` 재검증이 옛 행 읽기를 깨뜨린다 |
| 6 | ★ `JobForm` 수정 draft 초기화에 `guideTemplate`·`guideFields` 복사 필수 | PATCH 는 전체 치환 — 현재 draft 는 필드를 하나씩 복사하므로 빠뜨리면 다른 칸만 고쳐도 템플릿이 지워진다(데이터 소실) |
| 7 | 테스트 추가: 키 집합·타입, 생략 시 기본 객체, 멱등 재전송/409, PATCH 생략=끄기, DB 제약 직접 위반, 중첩 extra | 응답 계약 고정 + 회귀 방지 |
| 8 | 배포: API·웹 동시(`docker:up`) | 새 웹이 옛 API 에 `guideTemplate` 을 보내면 `extra='forbid'` 로 422(0016 과 같은 함정) |

## 영향 검토

- **트랜잭션**: 기존 create/update 의 같은 INSERT/UPDATE 문에 열 2개가 붙는다. 추가 쿼리·잠금 없음. `get_posting(lock=True)` + `expectedVersion` 낙관적 잠금 그대로 → lost update 없음.
- **멱등**: `idempotent()` 해시 입력은 validator 정규화 뒤의 `model_dump_json()` — 템플릿 끔/기본 객체 정규화가 해시에 반영된다. 응답 저장(`remember`)은 `jsonable_encoder` 로 dict 그대로 직렬화 가능.
- **권한**: 쓰기는 `require_manage`(메뉴 `jobs`), 읽기는 기존 `/jobs`·상세와 동일(학생 공개). 값은 공고 공개 내용(문의처 포함)이며 학생 개인정보 없음. 새 GRANT 불필요(022: `SELECT,INSERT,UPDATE ON dc.job_posting TO dc_app`).
- **이력**: `posting_event` before/after = `posting_dto` 전체 → 두 키 자동 포함. `job_posting_event` 는 append-only 트리거(022) 그대로. 이벤트 행이 템플릿 값만큼 커지지만 이미 `content` 를 싣고 있어 무시 가능.
- **외부 수집 공고**: 쓰는 곳은 023 시드(명시 컬럼 INSERT)와 레거시 이관뿐 → 두 열 NULL, 짝 CHECK 충족. `update_posting` 이 `source<>'manual'` 을 403 으로 막아 템플릿을 붙일 수 없다. 화면은 NULL 이면 기존 모집요강만.
- **XSS**: 값은 React 텍스트 노드로만 렌더(HTML 주입 없음). `content_html` 처럼 `clean_html` 필요 없음. 줄바꿈은 CSS `pre-line`.

## 예상 주요 query 와 인덱스 대응

| query | 빈도 | 인덱스 |
|---|---|---|
| `/jobs` `SELECT * ... WHERE deleted_at IS NULL ORDER BY posted_at DESC,id LIMIT/OFFSET` | 부팅마다 readAll | `job_posting_listing`(기존). 새 열은 같은 행에서 읽힘(TOAST 는 크기 따라 자동) |
| `/jobs/{id}` PK 조회 | 상세·쓰기 후 refresh | PK |
| POST/PATCH 의 INSERT/UPDATE ... RETURNING * | 상담사 쓰기 | PK |
| 템플릿으로 필터·정렬 | 없음 | 인덱스 없음(만들지 않는다) |

## 위험 · migration · rollback

- additive: 열 2개(NULL, 기본값 없음) + 이름 있는 CHECK 3개 + COMMENT. 재작성 없음. CHECK 검증 스캔 1회 — 기존 행 전부 NULL 이라 통과, 표가 작아 잠금 순간적.
  migrate.py 가 파일 단위로 실행·체크섬 대장으로 재실행을 막는다.
- 백필 없음: 기존 공고 NULL = 종전 화면 그대로(팀장 기본값).
- 롤백: 앱만 되돌리면 된다. 옛 앱은 `SELECT *` 결과의 두 열을 DTO 에 안 넣고, INSERT/UPDATE 는 명시 컬럼 목록이라 두 열을 건드리지 않는다 → 제약 위반 경로 없음.
  스키마 제거가 필요하면 새 마이그레이션으로 `DROP COLUMN guide_fields, DROP COLUMN guide_template`(제약 동반 제거).
- 잔여 위험: 프론트 `JobForm` draft 초기화 누락 시 템플릿 소실 — 교정 6 + ego-browser 확인 항목으로 막는다.

## JSON 호환성 테스트 항목

work-order.md 「테스트」 1~9. 핵심:
- `posting_dto` 에 `guideTemplate`(`'POSTER'|'HIGHLIGHT'|'DOCUMENT'|null`), `guideFields`(17키 object | null) 추가. 기존 키·타입 불변.
- 템플릿 공고의 `guideFields` 키 집합 정확히:
  `{headline, emphasis, duty, workHours, employmentNote, salaryNote, qualification, preferred, industry, revenue, headcount, address, applyMethod, contact, note, documents, steps}`,
  `documents[*]` 키 정확히 `{name, note, optional}`(str,str,bool), `steps` 는 `list[str]`.
- 기존·외부 공고는 두 키 모두 `null`(키 자체는 존재).
- `job_posting_event` 스냅샷에 두 키 존재, `wishCount` 는 여전히 없음.
- TS: `JobPosting.guideTemplate: JobGuideTemplate | null`, `guideFields: JobGuideFields | null`, `JobPostingInput` 동일, `blankJob()` 은 둘 다 `null`.

## Sol(또는 팀장)이 그대로 실행할 순서

1. `backend/migrations/169_job_guide_template.sql` 작성(work-order 확정 SQL 그대로). `dreamcatch_test` 적용은 팀장 지시 후에만.
2. `jobs.py`: `GuideDoc` → `GuideFields` → `PostingBody.guideTemplate/guideFields` + `consistent` 정규화 → `POSTING_WRITABLE` 끝 2열 · `posting_values` 끝 2값(None 처리) → `posting_dto` 2키.
3. `tests/test_job_guide_template.py` 신규(1~9) → 기존 test_job* pytest(기존 실패 4건 제외).
4. 프론트: `src_admin/data/schema/job.ts` → `src_v2/components/JobGuide.tsx/.css`(`.jg-` 스코프) → `JobDetailView` → `JobForm`(템플릿 선택·입력·미리보기, ★ 수정 draft 초기화 두 키) → `npx tsc -b`.
5. `npm run docker:up`(API·웹 함께) → ego-browser: 3종 등록·전환·끄기, 템플릿 공고를 다른 칸만 고쳐 저장 후 템플릿 유지, 학생 상세 렌더, 콘솔 오류 0·실패 요청 0, `/jobs` 응답 크기·시간 전후 비교.
