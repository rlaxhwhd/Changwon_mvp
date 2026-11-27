# 0027 작업지시서 — 내 성장 머리말: 목표 기업 표시·학생 직접 입력 (rev2, Astra 교정 2026-11-27 · rev1 팀장 2026-11-27)

상태: **ASTRA_APPROVED** (rev2, 조건부 — 조건은 `architecture-review.md` §3 C1~C10). 〔rev2〕 Sol 구현 가능. 마이그레이션 184 는 격리 테스트 DB 에서 먼저 적용·검증한 뒤 로컬에 반영한다. 이 리뷰에서는 어떤 DB 에도 적용하지 않았다.

## 1. 사용자 지시 (원문)

> v2/growth 에서 상단 카드에 좌측에 '이름 나오는거랑 성장기록, 학과 1학년 문구 적부 삭제' 단, MY GROWTH RECORD 는 좌측 상단에 위치하게 하고 왼쪽엔 목표 기업이 나오게 했으면 좋겠어
> 로드맵 생성시에 목표기업을 정했다면 그대로 보여주고 아니라면 직접 추가할 수 있게

해석:
- 머리말(`.gh-cover`) 왼쪽 칸에서 이름 모노그램(아바타)·「OOO의 성장 기록」 제목·「학과 · N학년 · 학번」 줄을 지운다. `MY GROWTH RECORD`(4학년은 기존대로 `CAREER PORTFOLIO`) 표지는 왼쪽 위에 남긴다.
- 그 자리에 **목표 기업**을 보인다.
  - 로드맵에 목표 기업이 있으면 그 값을 그대로 보인다(학생이 고치지 않는다 — 상담사가 정한 값이다).
  - 없으면 학생이 직접 추가(입력)할 수 있다. 추가한 값은 학생이 고치거나 지울 수 있다.
- 〔rev2〕 **「로드맵에서 목표 기업을 정했다」의 판정**: 확정(`confirmed`) 로드맵의 `target_company` 가 **객체이고 `name` 이 공백 아닌 문자열**일 때만이다. 상담사가 생성 화면의 희망 기업 칸에 입력한 값은 `{"name": …}` 객체로 저장되고(`roadmap.py` `target_company()`), 입력하지 않으면 **생성 모델이 쓴 요약 문자열**(예: 「미정」, 「미정 — 상담에서 확인」, 업종 요약)이 jsonb **문자열**로 저장된다. 모델 요약은 「정한 기업」이 아니므로 학생 입력 경로를 연다. 지금 화면도 이 경우 `targetCompany?.name` 이 없어 「미정」을 보이므로 표시 의미는 바뀌지 않는다. (사용자 확인 권장 항목 U1 — 기본값으로 진행)

## 2. 확인한 사실

| 항목 | 사실 | 근거 |
|---|---|---|
| 로드맵 목표 기업 | `dc.roadmap.target_company jsonb NOT NULL`. 〔rev2 정정〕 모양이 세 가지다: ① 상담사 입력 `{"name": …}` ② 상담사 미입력 시 생성 모델 요약 **jsonb 문자열**(`Outcome.targetCompany: str`, 최대 1000자) ③ 레거시 이관 객체 `{name, industry, role, matchScore, requirements}`(name 이 `""` 일 수 있음). rev1 의 「`{"name": …}` 또는 `{}`」는 틀렸다 | `roadmap.py:414-416` · `roadmap_generator.py:24-25,48` · `seed_domains.py:146` |
| 로컬 실태(읽기 전용 집계) | 로드맵 5건 = 레거시 객체 2건(name 있음) + COUNSEL 문자열 3건(전부 「미정…」). 검증 학생 20262324 의 확정 로드맵 값은 **문자열 「미정」** → 학생 입력 경로. 20243003 = 로드맵 없음(내 성장 화면 게이트로 잠김) | 로컬 DB SELECT |
| 학생에게 내려가는 값 | `students.py` `profile()` 이 **확정 로드맵이 있을 때만** `targetRole`·`targetCompany` 를 덮어쓴다 — 초안은 새지 않는다. 없으면 `{}`. 〔rev2〕 문자열 모양이면 프론트 타입(`TargetCompany` 객체)과 다르다 — 기존 타입 불일치이며 이번 범위에서는 셀렉터가 방어한다 | `backend/app/students.py:45-55` |
| 화면 사용처 | `GrowthHome.tsx` `goalCompany = student.targetCompany?.name \|\| '미정'` → 머리말 태그 「관심 기업 · …」·오른쪽 PROFILE 카드 「관심 기업」 | `src_v2/pages/growth/GrowthHome.tsx:88-90,183-191,226-232` |
| 학생 자기 입력 저장소 | `dc.growth_profile`(025): `intro`·`contact_email`·`contact_phone`·`version`(낙관적 잠금 — 〔rev2〕 **성장 자료 쓰기도 같은 version 을 올린다**, `bump_profile`)·`updated_*`. 변경은 `dc.growth_event(action='PROFILE_UPDATE', before_value/after_value jsonb)` 에 쌓인다(불변 트리거) | `025_growth_operations.sql:52,123-140` · `growth.py` `update_profile`·`bump_profile` |
| 프로필 API | `GET/PATCH /students/{id}/growth/profile`. GET 응답은 **평평한 profile DTO**(〔rev2 정정〕 `profile` 래퍼는 `/portfolio` 응답에만 있다 — 같은 `profile_dto` 를 쓴다). PATCH 는 `ProfileBody(extra='forbid')` = `expectedVersion`·`intro`·`email`·`phone` **전체 치환**(빠진 키는 기본값 ''/None 으로 덮인다). 멱등 키 필수, 소유자만 | `growth.py:128-222` |
| PATCH 호출처 | `shared/growthStore.ts` `saveGrowthProfile` 하나 ← `Portfolio.tsx` 자기소개 저장(`intro`·`email`·`phone` 를 원값으로 되돌려 보냄) | graft·grep |
| 〔rev2〕 기존 유사 구조 | ① `dc.counsel_request.desired_company`(126) — CARE 7+ 상담 **신청 1건의 속성**(신청 시점 값, 이후 수정 경로 없음) ② `dc.job_wishlist` — 공고 찜(posting FK) ③ `dc.company` — 교내 공고용 기업 사전(학생 쓰기 불가) ④ `dc.student_job_interest` — 직무(job_role) 관심. **학생이 언제든 고치는 「내 목표 기업 1개」를 담는 곳은 없다** | 마이그레이션 001·022·126 |
| 〔rev2〕 응답 키 집합 계약 | `test_academic_profile_display.py` `GROWTH_PROFILE_KEYS` 가 PATCH 응답 키를 **정확히 같음**으로 단언한다 — 새 키를 넣으면 이 집합을 함께 고쳐야 한다 | `backend/tests/test_academic_profile_display.py:30,233` |
| 〔rev2〕 회사 제출 포트폴리오 | `student_portfolio.py` 의 `personal` 은 `growth_profile` 의 intro·연락처를 직접 읽어 **기업에 제출되는 문서**를 만든다 | `backend/app/student_portfolio.py:222-225` |
| 네트워크(현행, 20262324, 1280px) | `/v2/growth` API 14건·실패 0. `growth/profile` 65ms·917B **이미 이 화면에서 읽는다**. 기존 중복: `growth/activity-log` 2회(이번 범위 밖) | ego-browser 측정 |

## 3. 설계 (〔rev2〕 Astra 교정 반영 — 이대로 구현)

### 3-1. DB (마이그레이션 184 `184_growth_target_company.sql`)

```sql
-- 0027: 학생이 직접 적은 목표 기업. Astra 승인(0027 architecture-review rev2).
-- 롤백(forward-only 관례, 필요 시 수동): ① API·화면을 0027 이전으로 되돌린다(키 제거)
--   ② ALTER TABLE dc.growth_profile DROP COLUMN target_company;  — 학생 입력값이 사라진다. growth_event 이력은 남는다.
SET LOCAL lock_timeout = '5s';

ALTER TABLE dc.growth_profile
  ADD COLUMN target_company text,
  ADD CONSTRAINT ck_growth_profile_target_company CHECK (
    target_company IS NULL
    OR (char_length(target_company) BETWEEN 1 AND 200
        AND target_company = btrim(target_company)
        AND target_company !~ '[[:cntrl:]]'));

COMMENT ON COLUMN dc.growth_profile.target_company IS
 '학생이 직접 적은 목표 기업(0027). 확정 로드맵에 상담사가 정한 기업({"name"})이 있으면 화면은 그쪽을 보이고 이 값은 보존만 한다. 로드맵 값을 여기 복사하지 않고, 이 값을 로드맵·회사 제출 문서로 옮기지 않는다.';
```
- 〔rev2〕 제약 이름을 `DB_SCHEMA.md` §1 표준(`ck_{table}_{purpose}`)으로 명시하고 `char_length`(126 `desired_company` 와 같은 표기)·제어문자 금지를 더했다. 기본값 없는 NULL 열 추가라 행 재작성은 없고, CHECK 검증 스캔은 `growth_profile` 행 수(학생 수 이하)만큼이다.
- 길이 200 = `roadmap.py` `Generate.targetCompany`·126 `desired_company` 상한과 같다.
- 행이 없는 학생은 PATCH 의 기존 `ensure_profile` 이 만든다 — 새 생성 경로 없음.
- 인덱스 불필요(학생 1명 PK 조회만, 기업명으로 찾는 질의 없음).
- 〔rev2〕 `growth_event.action` CHECK 는 바꾸지 않는다 — 기존 `PROFILE_UPDATE` 를 쓴다.
- 권한: 기존 `dc.growth_profile` 에 대한 `dc_app` 권한이 열 단위가 아니면 추가 GRANT 불필요. Sol 은 적용 후 `dc_app` 으로 SELECT/UPDATE 가 되는지 계약 테스트로 확인한다.
- 〔rev2〕 `DB_SCHEMA.md` 에 184 대기 항목을 Astra 가 추가했다 — Sol 은 적용 결과(로컬 적용일·서버 미배포)로 갱신한다.

### 3-2. API (`backend/app/growth.py`)

〔rev2〕 **제안 A 채택 — 단, 네 필드 모두 「보낸 키만 바꾼다」로 확장한다.** rev1 A 는 `targetCompany` 만 생략≠null 로 다뤘는데, 내 성장 화면이 `{expectedVersion, targetCompany}` 만 보내면 `intro` 기본값 `''`·`email/phone` 기본값 `None` 이 그대로 UPDATE 되어 **자기소개·연락처가 지워진다.** 별도 엔드포인트(B)는 같은 행·같은 version·같은 이벤트를 쓰는 두 번째 쓰기 경로라 이점이 없다.

- `ProfileBody`:
  - `expectedVersion: int = Field(ge=0)` (필수, 그대로)
  - `intro: str = Field(default='', max_length=5000)` · `email` · `phone` 그대로
  - 추가 `targetCompany: str | None = Field(default=None, max_length=200, pattern=r'^[^\x00-\x1f\x7f]*$')` — `str_strip_whitespace` 로 앞뒤 공백 제거. **빈 문자열은 None(지움)으로 정규화**(email/phone 의 `or None` 과 같은 규칙).
  - `expectedVersion` 외 네 필드 중 `model_fields_set` 에 하나도 없으면 **422 `INVALID_FIELD`**(바꿀 것이 없는 요청이 version 만 올리지 않게).
- `update_profile`:
  - 멱등 digest 는 `body.model_dump_json(exclude_unset=True)` 로 만든다 — 생략과 null 이 다른 요청으로 구분되게.
  - `before = ensure_profile(...)` 뒤, **`model_fields_set` 에 있는 필드만** 새 값으로, 나머지는 `before` 값으로 UPDATE 한다(열 목록을 동적으로 만들지 말고 네 열을 항상 SET 하되 값만 고른다 — SQL 문 하나 유지).
  - `growth_event(PROFILE_UPDATE)` 의 `before_value`·`after_value` 에 `targetCompany` 를 더해 **네 필드 전체 스냅샷**을 남긴다(append-only). 기존 키 `intro`·`email`·`phone` 이름은 바꾸지 않는다.
  - version 은 기존대로 +1. 충돌은 기존 409 `VERSION_CONFLICT`(`currentVersion` 포함).
- `profile_dto`: `data['targetCompany'] = row['target_company'] if row else None` — **본인·범위 통과 교직원 모두** 싣는다(intro 와 같은 공개 범위, 연락처 D06 규칙과 다름). GET·PATCH 응답·`/portfolio` 의 `profile` 에 같은 키가 생긴다.
- 서버는 「확정 로드맵에 기업이 있으면 학생 입력을 막는」 검사를 **하지 않는다**. 숨겨진 값의 저장은 무해하고, 로드맵 확정과의 경쟁 조건만 만든다. 우선순위는 표시층 규칙이다(§3-3).
- 〔rev2〕 하지 않는 것(서버):
  - `students.py` `profile()` 의 `targetCompany` 에 학생 입력값을 합치지 않는다 — 그 키는 교직원 화면(로드맵 편집기·상담 처리 모달·상담 챗봇)이 「확정 로드맵 목표」로 읽는다.
  - `student_portfolio.py` `personal`(기업 제출 문서)에 넣지 않는다 — 다른 기업에 제출되는 문서에 목표 기업이 실리면 학생에게 불리하다.
  - 로드맵 생성 입력(`generation_input`)·AI 코멘트 문맥에 넣지 않는다(요청 범위 밖).

### 3-3. 화면 (`src_v2/pages/growth/GrowthHome.tsx` · `.css` · `shared/growthStore.ts`)

- `shared/growthStore.ts`:
  - `GrowthProfile` 에 `targetCompany: string | null` 추가(주석: 학생 입력값, 로드맵 값 아님).
  - `saveGrowthProfile` 입력 타입을 `{ intro?: string; email?: string | null; phone?: string | null; targetCompany?: string | null }` 로 넓힌다. `JSON.stringify` 가 `undefined` 키를 빼므로 생략과 `null`(지움)이 그대로 구분된다. Portfolio 호출부는 고치지 않는다(지금처럼 세 키를 보내도 안전).
- 〔rev2〕 우선순위 셀렉터 하나(`src_v2/data/` 아래, 예: `growthTargetCompany(student, growthProfile)`):
  - 반환 `{ name: string; source: 'ROADMAP' | 'SELF' } | null`.
  - ROADMAP: `student.targetCompany` 가 **객체**이고 `typeof name === 'string' && name.trim() !== ''` 일 때만. 문자열·`{}`·빈 name 은 ROADMAP 아님(§1 판정).
  - SELF: 그 외에 `growthProfile?.targetCompany` 가 있으면.
  - 둘 다 없으면 `null`.
  - 머리말·`goalCompany`(머리말 태그 「관심 기업」·PROFILE 카드 「관심 기업」)가 **모두 이 셀렉터 하나**를 읽는다(없으면 「미정」).
- 머리말 왼쪽: 아바타·제목 h2·학과 줄 삭제. 남는 것 = 왼쪽 위 표지(`MY GROWTH RECORD`/`CAREER PORTFOLIO`) + **목표 기업** 블록.
  - ROADMAP: 기업명 + 「로드맵에서 정한 목표」 표시, 편집 버튼 없음.
  - SELF: 기업명 + 고치기·지우기(지우기 = `targetCompany: null`).
  - null: 「목표 기업을 추가해 보세요」 + 추가 버튼 → 인라인 입력(`maxLength=200`, 앞뒤 공백 제거 후 1자 이상일 때만 저장 활성) → 저장.
  - 저장·지우기는 `await` + 실패 표시(CLAUDE.md 쓰기 규칙, 기존 `error` 상태·`saving` 재사용). 〔rev2〕 409(`VERSION_CONFLICT`)는 「다른 곳에서 성장 기록이 바뀌었습니다. 새로 불러온 뒤 다시 저장해 주세요」로 알리고 `ensureGrowth(student.id, true)` 로 다시 읽는다 — 입력값은 지우지 않는다.
  - 저장 성공 뒤 `saveGrowthProfile` 내부 `refresh` 가 GET 을 다시 부른다 — 추가 호출은 그 1회뿐이다.
- h2 가 사라지므로 `aria-labelledby="growth-title"` 대상을 목표 기업 블록 제목(예: 시각적 라벨 「목표 기업」에 `id="growth-title"`)으로 옮긴다.
- `studentDisplayName` import 가 머리말 삭제로 쓰이지 않게 되면 제거한다(본인이 만든 고아만).
- 모바일(760 이하) 기존 1열 규칙 유지. DESIGN.md 토큰만 사용.

### 3-4. 하지 않는 것

- 학생 입력값을 로드맵 생성 기본값(상담사 화면)으로 넘기지 않는다 — 요청 범위 밖. 필요하면 별도 지시.
- 로드맵 초안의 기업은 학생에게 보이지 않는다(기존 규칙 유지).
- 확정 로드맵 기업과 학생 입력이 둘 다 있으면 학생 입력은 **지우지 않고 보존**한다(화면에서만 숨김). 로드맵이 재생성되어 기업이 없어지면 다시 보인다. 〔rev2〕 로드맵 쪽 코드가 `growth_profile` 을 쓰지 않는다(도메인 결합 금지).
- 〔rev2〕 상담 신청의 `desired_company`(126)를 학생 목표 기업으로 자동 채우지 않는다(신청 시점 속성이라 생명주기가 다르다). 입력 칸 기본값으로 제안할지는 사용자 확인 항목 U2.
- `activity-log` 중복 호출은 고치지 않는다(별 건으로 보고).
- 〔rev2〕 기존 결함(범위 밖, 보고만): `src_v2/data/students.ts:364` `targetCompanySummary` 가 문자열 모양 `targetCompany` 에서 「undefined · undefined」가 된다. `students.py` 의 문자열 모양이 프론트 `TargetCompany` 타입과 어긋난다.

## 4. Astra 에게 묻는 것 → 〔rev2〕 답

1. 저장 위치 → **`dc.growth_profile.target_company` 열 추가가 맞다.** 학생 1명당 1값·학생 본인이 고치는 자기입력·낙관적 잠금·이력이 모두 `growth_profile` 의 의미·소유권·생명주기와 같다. `counsel_request.desired_company` 는 신청 1건의 불변 속성, `job_wishlist`·`dc.company` 는 공고·기업 사전 실체라 맞지 않는다. 별도 테이블은 1:1 이라 이득이 없다.
2. PATCH 부분 갱신(A) vs 별도 엔드포인트(B) → **A, 단 네 필드 모두 생략≠null**(§3-2). digest 는 `exclude_unset`, 빈 요청은 422.
3. 둘 다 있을 때 학생 입력 보존 → **보존이 맞다.** 학생 자료를 상담사 행위의 부수효과로 지우지 않는다(이력 append-only·도메인 결합 금지). 숨김은 표시층 셀렉터 하나가 결정한다.
4. 교직원 GET 응답 → **싣는다**(범위 검사 통과한 교직원, intro 와 같은 공개 범위). 단 기업 제출 포트폴리오(`student_portfolio.py`)·`students.py` 부트 프로필에는 싣지 않는다. 교직원 화면 표시 작업은 이번 범위가 아니다.

## 5. 검증 계획

- 〔rev2〕 계약 테스트(새 파일 `backend/tests/test_growth_target_company.py`, 격리 테스트 DB):
  1. GET 본인·범위 교직원 모두 `targetCompany` 키 존재, 미생성 학생 `None`, 값은 `str | None`.
  2. PATCH `{expectedVersion, targetCompany:'X'}` → intro·email·phone **유지**, targetCompany 저장, version +1.
  3. PATCH `{expectedVersion, intro, email, phone}`(Portfolio 모양) → targetCompany **유지**.
  4. PATCH `targetCompany: null` 과 `''` → 둘 다 NULL 저장. 생략은 유지.
  5. 201자·중간 제어문자(`'A\nB'` — 앞뒤 개행은 strip 으로 먼저 잘린다) → 422. 앞뒤 공백은 잘려 저장. DB 직접 UPDATE 로 `' X'`·`''` 넣으면 CHECK 위반(제약 동작 확인).
  6. 네 필드 모두 생략 → 422, version 불변.
  7. 소유자 외(교직원) PATCH → 403, 범위 밖 학생 GET → 404, stale version → 409 + `currentVersion`.
  8. `growth_event` 최신 `PROFILE_UPDATE` 의 before/after 에 `targetCompany` 와 기존 세 키가 모두 있다.
  9. 같은 멱등 키 재전송 → 같은 응답, 같은 키로 `targetCompany` 생략 vs `null` → 409(digest 다름).
  10. 최초 쓰기(`expectedVersion:0`, 프로필 없음)가 targetCompany 만으로도 생성+수정 한 트랜잭션.
  11. `/students/{id}` 부트 프로필의 `targetCompany` 는 학생 입력과 무관(확정 로드맵 없으면 `{}` 그대로). `/portfolios` 제출 문서 `personal` 에 목표 기업 키 없음.
- 〔rev2〕 기존 테스트 갱신: `test_academic_profile_display.py` `GROWTH_PROFILE_KEYS` 에 `'targetCompany'` 추가(케이스 삭제 금지). `test_growth.py`·`test_academic_photo.py` 는 무수정 통과해야 한다.
- 회귀: `scripts/run_regression.py` 전체 — 기준선 FAILED 집합과 비교(알려진 실패 4건 제외 규칙 유지).
- 빌드: `npx tsc -b`.
- 화면(ego-browser, 1280·390): 20262324 = 직접 추가→새로고침 유지→고치기→지우기, 마이페이지 포트폴리오에서 자기소개 저장 후 목표 기업 유지 확인. 확정 로드맵 기업 경로 = 응답 패치(브라우저 안에서만)로 `{name}` 객체·문자열 「미정」 두 모양을 각각 넣어 읽기 전용 표시/학생 입력 경로 확인. 머리말·태그·PROFILE 카드 값 일치. API 호출 수 증가 0(저장 시 PATCH 1 + GET 재조회 1 외), 콘솔 오류 0, 실패 요청 0.
