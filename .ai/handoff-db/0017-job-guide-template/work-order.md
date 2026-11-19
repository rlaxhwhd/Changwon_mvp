# 0017 채용공고 모집요강 템플릿 — 적용 전 Astra 검토

- revision: 2 (Astra 교정 — 변경점은 `architecture-review.md`「교정한 설계」)
- 상태: ASTRA_APPROVED (마이그레이션 미적용 — 어떤 DB에도 적용하지 않았다)
- 사용자 요청(2026-11-19): 상담사가 모집요강에 공고 이미지(추천채용 의뢰서 내용을 따로 그린 그림)를 붙이고 있다.
  공고 등록 화면에서 **템플릿 3종 중 하나를 고르고 입력칸에 값만 넣으면, 학생 화면에 그 디자인으로 자동으로 그려지게** 한다.
  사용자 확정: A안(값을 저장하고 화면이 그린다 — 이미지 생성·HTML 틀 삽입 아님), 3종 모두(포스터형·핵심 숫자형·요강 문서형).
  시안: https://claude.ai/artifact/NzTmxg5DTujhECxtTbEtXw (2번 상단 밝게·주황 제거, 3번 숫자 초록·폰트 Pretendard 로 수정해 구현)
- 팀장 기본값(사용자에게 되묻지 않음): 모든 교내 공고(일반·추천)에 선택 가능, 기본 「사용 안 함」. 기존 모집요강 편집기는
  템플릿 아래 「추가 안내(선택)」로 남긴다. 기존 공고는 바뀌지 않는다(템플릿 NULL).

## 데이터 판단

| 요구 | 판단 |
|---|---|
| 템플릿 종류 | 공고 1건의 단일 속성 → `job_posting.guide_template` 컬럼 |
| 템플릿 입력값 | 공고 1건에 딸린 문서 한 덩어리, 따로 조회·집계·검색하지 않는다, 같은 생명주기·권한 → `job_posting.guide_fields jsonb`. 별도 표 불필요 |
| 자동으로 채우는 값 | 회사명·공고제목·연봉·근무지·근무형태·마감일시·채용유형은 **기존 컬럼에서 읽는다** — jsonb 에 복사하지 않는다(한 사실 한 곳) |
| 그리기 | 프론트 공유 컴포넌트 하나(`src_v2/components/JobGuide.tsx`)가 3종을 그린다. 학생 상세와 교직원 등록 폼 미리보기가 같이 쓴다. 값은 React 텍스트로만 넣는다(HTML 주입 없음) |

## 마이그레이션 `backend/migrations/169_job_guide_template.sql`

```sql
-- 169: 채용공고 모집요강 템플릿 (2026-11-19 사용자 요청, 작업지시서 0017)
--
-- 템플릿 종류와 입력값을 공고 행에 둔다. 입력값은 공고 1건에 딸린 문서 한 덩어리라 따로 조회·집계·검색하지 않는다 → jsonb.
-- 회사명·공고제목·연봉·근무지·근무형태·마감·채용유형은 기존 컬럼에서 읽고 여기에 복사하지 않는다(한 사실 한 곳).
-- 키·길이 검증은 API(GuideFields, extra=forbid)가 한다. DB 는 열거·모양·짝만 지킨다.
ALTER TABLE dc.job_posting
  ADD COLUMN guide_template text,
  ADD COLUMN guide_fields jsonb,
  ADD CONSTRAINT posting_guide_template CHECK (guide_template IN ('POSTER','HIGHLIGHT','DOCUMENT')),
  ADD CONSTRAINT posting_guide_fields_object CHECK (guide_fields IS NULL OR jsonb_typeof(guide_fields)='object'),
  -- 템플릿을 끄면 입력값도 없다(숨은 값 저장 금지). 템플릿이 있으면 입력값 객체가 반드시 있다.
  ADD CONSTRAINT posting_guide_pair CHECK ((guide_template IS NULL)=(guide_fields IS NULL));
COMMENT ON COLUMN dc.job_posting.guide_template IS
  '모집요강 템플릿(NULL=사용 안 함). POSTER 포스터형 · HIGHLIGHT 핵심 숫자형 · DOCUMENT 요강 문서형';
COMMENT ON COLUMN dc.job_posting.guide_fields IS
  '템플릿 입력값(JSON object, guide_template 과 함께 NULL). 키·길이는 API(GuideFields)가 검증. 회사명·연봉·근무지·마감 등은 기존 컬럼에서 읽고 여기 복사하지 않는다';
```

- NULL 허용·기본값 없음 → 카탈로그 변경만, 테이블 재작성 없음. CHECK 3개는 기존 행 검증 스캔 1회(전부 NULL 이라 통과, job_posting 은 수천 행 이하 → 짧은 ACCESS EXCLUSIVE). 기존 행 NULL = 종전 그대로.
- 제약에 이름을 붙인다(022 의 `posting_*` 규칙) — 롤백·진단 시 이름으로 지운다.
- 권한: dc_app 은 job_posting SELECT/INSERT/UPDATE 를 이미 가진다(022 GRANT). 새 GRANT 없음. 인덱스 없음(이 컬럼으로 조건 검색·정렬하지 않는다).
- 롤백: 앱만 되돌리면 컬럼은 무해(옛 앱은 `SELECT *` 로 읽고 DTO 에 안 넣는다, INSERT·UPDATE 는 명시 컬럼 목록이라 두 컬럼을 건드리지 않는다 → 짝 CHECK 위반 없음).
  단 옛 앱으로 되돌린 동안 템플릿 공고를 수정하면 값은 남고 화면엔 안 보인다 — 의도된 무해.
  스키마까지 내려야 하면 `ALTER TABLE dc.job_posting DROP COLUMN guide_fields, DROP COLUMN guide_template;`(제약은 컬럼과 함께 제거) — 새 마이그레이션으로만.

## 코드

- `backend/app/jobs.py`
  - `class GuideDoc(BaseModel)`: `extra='forbid'`, `str_strip_whitespace`(중첩 모델은 부모 config 를 물려받지 않는다 — 직접 둔다),
    `name: str(1..60)`, `note: str(..40)=''`, `optional: bool=False`.
  - `class GuideFields(BaseModel)`: `extra='forbid'`, `str_strip_whitespace`. 모두 선택, 문자열 기본 `''`:
    `headline(..80)` 한 줄 소개 · `emphasis(..20)` 강조 단어 · `duty(..300)` 담당업무 · `workHours(..100)` 근무시간 ·
    `employmentNote(..100)` 채용형태 보충(예: 수습 3개월) · `salaryNote(..100)` 급여 비고 · `qualification(..500)` 자격요건 ·
    `preferred(..500)` 우대사항 · `industry(..100)` 업종 · `revenue(..50)` 매출액 · `headcount(..50)` 근로자수 ·
    `address(..200)` 근무지 상세(없으면 기존 location) · `applyMethod(..500)` 신청방법 · `contact(..200)` 문의처 · `note(..200)` 하단 안내 ·
    `documents: list[GuideDoc] = Field(default_factory=list, max_length=12)` ·
    `steps: list[Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]] = Field(default_factory=list, max_length=6)`.
    여러 줄 칸(duty·qualification·preferred·applyMethod)은 줄바꿈을 그대로 저장한다 — 화면이 `white-space: pre-line` 으로 그린다.
  - `PostingBody.guideTemplate: str | None = Field(default=None, pattern='^(POSTER|HIGHLIGHT|DOCUMENT)$')`,
    `guideFields: GuideFields | None = None`. `consistent` validator 에 추가:
    템플릿 NULL 이면 `self.guideFields = None`(남은 값 숨김 저장 금지 — DB `posting_guide_pair` 와 같은 규칙).
    템플릿이 있고 `guideFields` 가 없으면 `self.guideFields = GuideFields()` — **`{}` 가 아니라 기본값이 채워진 전체 키 객체**를 저장한다
    (저장값 = 응답값이 늘 같은 모양이 되게. revision 1 의 「빈 객체 `{}`」는 `model_dump()` 결과와 모순이라 교정).
    정규화는 validator 안에서 끝나므로 멱등 해시(`body.model_dump_json()`)도 정규화된 값 기준이다.
  - `POSTING_WRITABLE` 끝에 `,guide_template,guide_fields`, `posting_values` 끝에
    `body.guideTemplate, Jsonb(body.guideFields.model_dump(mode='json')) if body.guideFields else None`.
    ★ NULL 은 반드시 파이썬 `None` 으로 넘긴다 — `Jsonb(None)` 은 SQL NULL 이 아니라 JSON `null` 이 되어
    `posting_guide_fields_object`·`posting_guide_pair` 위반(500)이 난다.
  - `posting_dto`: `'guideTemplate': row['guide_template'], 'guideFields': row['guide_fields']`
    (psycopg 가 jsonb 를 dict 로 돌려준다. 저장된 dict 를 그대로 — 읽을 때 GuideFields 로 재검증하지 않는다. 나중에 키를 빼면 옛 행이 읽기에서 터진다).
  - 외부 수집 공고(source='external')에는 영향 없음 — 수집 경로(023 시드·레거시 이관)는 명시 컬럼 INSERT 라 두 컬럼 NULL(짝 CHECK 충족),
    `update_posting` 은 외부 공고를 403 으로 막으므로 템플릿을 붙일 수 없다.
  - 이력: `posting_event` before/after 는 `posting_dto` 전체라 두 키가 자동으로 들어간다(공고 속성이므로 정상, 별도 코드 없음).
  - 트랜잭션: 기존 create/update 트랜잭션 안의 같은 INSERT/UPDATE 문에 열이 붙을 뿐 — 추가 쿼리·잠금 없음. 낙관적 잠금(`expectedVersion`)·멱등 그대로.
  - ★ PATCH 는 전체 치환이다 — 본문에 `guideTemplate` 이 없으면 템플릿이 꺼진다(다른 필드와 같은 의미). 따라서 프론트 `JobForm` 의
    수정용 draft 초기화(`existing → draft`, 현재 필드를 하나씩 복사하는 객체)에 `guideTemplate: existing.guideTemplate, guideFields: existing.guideFields`
    를 **반드시** 추가한다. 빠뜨리면 템플릿 공고를 다른 칸만 고쳐 저장해도 템플릿이 사라진다.
- 화면
  - `src_admin/data/schema/job.ts`: `JobGuideTemplate = 'POSTER'|'HIGHLIGHT'|'DOCUMENT'`, `JobGuideFields`, `JobPosting.guideTemplate/guideFields`, Input 동일, `blankJob` NULL.
  - `src_v2/components/JobGuide.tsx` + `.css`(`.jg-` 스코프): `job` 하나를 받아 3종 중 하나를 그린다. 빈 값 항목은 렌더하지 않는다.
    색은 템플릿 스코프 안에 고정(DESIGN.md 밖 — 사용자 요청에 따른 의도된 divergence, `.pf` 처럼 스코프 격리). 폰트는 앱 Pretendard.
  - `src_v2/components/JobDetailView.tsx` 모집요강 섹션: 템플릿이 있으면 `JobGuide` → 그 아래 `content` 가 있으면 「추가 안내」.
  - `src_admin/pages/JobForm.tsx`: 「모집요강」 행에 템플릿 선택(사용 안 함 / 3종 버튼), 선택 시 입력칸 + 실시간 미리보기(같은 `JobGuide`).
    편집기는 그 아래 유지(템플릿 사용 시 라벨 「추가 안내」).

## 테스트(신규 `backend/tests/test_job_guide_template.py`)

1. 생성: `guideTemplate:'DOCUMENT'` + 필드 → 응답·`GET /jobs/{id}`·`GET /jobs` 항목 동일, DB `jsonb_typeof(guide_fields)='object'`.
   `guideFields` 키 집합이 정확히 GuideFields 17키, `documents` 는 `[{name,note,optional}]`, `steps` 는 문자열 배열(타입까지 단언).
2. 템플릿만 보내고 `guideFields` 생략 → 기본값 전체 객체(모든 문자열 `''`, 배열 `[]`) 저장·응답.
3. 422: 알 수 없는 템플릿, 모르는 키(`extra`, 최상위·`documents` 원소 둘 다), 길이 초과, `documents` 13개, `steps` 7개, 공백만 있는 `steps` 원소·`documents.name`.
4. 템플릿 NULL + 필드 보냄 → 저장 NULL 둘 다(SQL NULL — `guide_fields IS NULL` 로 단언, JSON `null` 아님).
5. 수정: 템플릿 바꾸기·끄기 → `job_posting_event` before/after 에 `guideTemplate`·`guideFields` 값. 끄면 after 둘 다 null.
6. 생략한 옛 본문(두 키 없음) → POST 201 NULL 둘 다. 템플릿 공고에 두 키 없이 PATCH → NULL 로 꺼짐(전체 치환 의미 고정).
7. 같은 Idempotency-Key 재전송 → 같은 응답, 새 행·새 이력 없음. 같은 키·다른 `guideFields` → 409.
8. 학생 응답(목록·상세)에도 두 키 존재(공개 정보). 외부 수집 공고·기존 공고는 둘 다 `null`.
9. DB 제약 직접 확인(테스트 DB, 트랜잭션 안에서 롤백): 템플릿만 있고 fields NULL INSERT/UPDATE → `posting_guide_pair` 위반, `guide_fields='[]'` → `posting_guide_fields_object` 위반.

## 검토 요청

1. jsonb 한 컬럼 vs 정규화 표(문서·단계 행) — 조회·집계 요구가 없어 jsonb 를 택함.
2. CHECK 를 DB 에 둘 범위(템플릿 열거·object 타입만, 키 검증은 API).
3. `/jobs` readAll 응답 크기 증가(공고당 수 KB 이내 예상) — 목록 DTO 에서 빼고 상세에서만 줄지.

## 검토 결과(Astra, revision 2)

1. jsonb 유지 — 정규화 표 불필요(근거는 architecture-review.md).
2. DB CHECK = 템플릿 열거 + object 모양 + 템플릿·값 짝. 키·길이는 API.
3. `/jobs` 목록 DTO 에 유지 — 목록이 이미 `content`(최대 2천만 자)를 싣고, 학생 상세·JobForm 이 목록 스토어(`getJobById`)를 읽는다. 빼면 상세 지연 조회 구조가 새로 생긴다.

## 적용 순서(승인 뒤)

테스트 DB 169 적용(팀장 지시 후에만) → `jobs.py`(GuideDoc·GuideFields → PostingBody 필드·validator → POSTING_WRITABLE·posting_values → posting_dto) →
신규 `test_job_guide_template.py` + 기존 test_job* 계열 pytest(기존 실패 4건 제외) →
프론트(schema/job.ts → JobGuide.tsx/.css → JobDetailView → JobForm(★ 수정 draft 초기화에 두 키)) → `npx tsc -b` → `npm run docker:up`(API·웹 함께 — 웹만 먼저 올라가면 `extra='forbid'` 로 422) →
ego-browser: 등록(템플릿 3종 전환·미리보기·끄기) · **템플릿 공고를 다른 칸만 고쳐 저장 → 템플릿 유지** · 학생 상세 렌더 · 콘솔 오류 0 · 실패 요청 0 · `/jobs` 응답 크기·시간 전후 비교 → 커밋·푸시. CentOS 배포 없음.
