# 0027 architecture-review — 내 성장 머리말 목표 기업(학생 직접 입력)

- 리뷰어: Astra(DB 설계 리뷰) · 2026-11-27
- 대상: `work-order.md` rev1(팀장) → **rev2 로 직접 교정**(교정 위치는 본문 〔rev2〕 표기)
- **판정: ASTRA_APPROVED — 조건부(APPROVED WITH CONDITIONS)**. 승인 revision = **rev2**. 업무 의미 확인 권장 2건(U1·U2)은 기본값으로 진행 가능하며 승인을 막지 않는다.
- 범위: 설계 리뷰·문서만. **어떤 DB 에도 적용하지 않았다**(로컬 포함). 로컬 개발 DB 에는 읽기 전용 SELECT 2개(로드맵 `target_company` 모양 집계, `growth_profile` 건수)만 실행했다. 코드 수정 없음.
- 확인한 원본: `backend/app/growth.py`(전체), `students.py:30-60`, `roadmap.py:355-420,580-620`, `roadmap_generator.py:20-60,100-125`, `ai_context.py` `company_goal`, `student_portfolio.py:205-226`, `jobs.py` `idempotent`·`remember`, 마이그레이션 001·002·022·025·126·183, `shared/growthStore.ts`, `src_v2/pages/growth/GrowthHome.tsx`, `src_v2/pages/mypage/Portfolio.tsx`, `src_v2/data/students.ts`, 테스트 `test_growth.py`·`test_academic_profile_display.py`·`test_academic_photo.py`·`test_boot_contract.py`. 호출자 탐색은 이 세션에 graft MCP 가 없어 grep 으로 대신했다(`profile_dto`·`growth_profile`·`saveGrowthProfile`·`targetCompany`·`desired_company`).
- Atlas 공유 기억: 이 세션에 Atlas 도구가 없어 조회·저장하지 않았다.

## 1. 사실 검증 결과(rev1 §2)

| rev1 사실 | 판정 | 보충 |
|---|---|---|
| 로드맵 목표 기업 = `{"name"}` 또는 `{}` | **틀림** | 상담사가 희망 기업을 입력하지 않으면 `target_company(body, source)` 가 생성 모델의 `Outcome.targetCompany`(str, ≤1000자, 「미정이면 미정이라고 쓴다」)를 **jsonb 문자열**로 저장한다. 레거시 이관은 `{name, industry, role, matchScore, requirements}` 객체. 로컬 5건 = 레거시 객체 2 + 문자열 3(전부 「미정…」). 검증 학생 20262324 도 문자열 「미정」 |
| `students.py` 확정 로드맵만 덮어쓴다 | 맞음 | 문자열 모양이 그대로 내려가 프론트 `TargetCompany`(객체) 타입과 어긋난다 — 기존 불일치. `students.ts:364` 가 「undefined · undefined」를 만든다(범위 밖 보고) |
| `growth_profile` 자기입력·version·이벤트 | 맞음 | **version 은 프로필과 성장 자료 쓰기가 공유**한다(`bump_profile`) → 목표 기업 저장도 다른 탭의 자료 쓰기와 409 로 경쟁한다. 프론트 409 처리 필요 |
| PATCH 전체 치환 | 맞음 | rev1 이 놓친 반대 방향: 화면이 `targetCompany` 만 보내면 `intro=''`·`email/phone=None` 으로 **자기소개·연락처가 지워진다** |
| GET 응답 `profile` 에 추가 | 표현 정정 | GET `/growth/profile` 은 평평한 DTO, `profile` 래퍼는 `/portfolio` 에만 있다. 둘 다 `profile_dto` 를 거치므로 한 곳 수정으로 양쪽에 생긴다 |
| PATCH 호출처 = Portfolio 1곳 | 맞음 | — |
| (누락) 응답 키 집합 단언 | rev1 에 없음 | `test_academic_profile_display.py` 가 PATCH 응답 `set(body) == GROWTH_PROFILE_KEYS | {...}` 로 정확히 비교 — 키 추가 시 갱신 필요 |
| (누락) 기업 제출 문서 | rev1 에 없음 | `student_portfolio.py` `personal` 이 `growth_profile` 을 직접 읽어 기업 제출 문서를 만든다 — 목표 기업이 새면 다른 기업에 제출되는 문서에 실린다 |

## 2. 교정한 설계와 근거

1. **「로드맵에서 정했다」 판정 = 확정 로드맵 `target_company` 가 객체이고 `name` 이 공백 아닌 문자열.** 모델 요약 문자열은 상담사가 정한 기업이 아니다(`roadmap.py` 주석 「상담사가 입력한 희망 기업이 정본이다 — 모델이 바꿔 쓴 이름을 저장하지 않는다」). 지금 화면도 이 경우 「미정」을 보이므로 표시 의미 변화가 없다. 판정은 프론트 데이터층 셀렉터 하나에 둔다(머리말·태그·PROFILE 카드 공용).
2. **부분 갱신을 네 필드 전체로 확장.** rev1 A 안은 `targetCompany` 만 생략≠null 이었다. 새 호출처(내 성장)가 `{expectedVersion, targetCompany}` 만 보내면 기본값이 기존 값을 덮는다. `model_fields_set` 에 있는 필드만 새 값, 나머지는 잠근 `before` 값으로 SET 한다. SQL 문은 하나로 유지(동적 열 목록 금지). Portfolio 호출부는 그대로 안전하다.
3. **멱등 digest 를 `exclude_unset=True` 로.** `model_dump_json()` 은 생략과 `null` 을 같은 JSON 으로 만든다 → 같은 키로 「지우기」와 「아무것도 안 바꾸기」가 같은 요청으로 재생될 수 있다.
4. **빈 요청 422, 빈 문자열 = 지움.** 네 필드 모두 생략이면 version 만 오르는 무의미한 쓰기·이벤트를 막는다. `''` 은 `null` 로 정규화(email/phone `or None` 규칙과 같다).
5. **제약 보강.** 제약 이름 `ck_growth_profile_target_company`(DB_SCHEMA §1), `char_length`(126 과 같은 표기), 제어문자 금지(API `pattern` + DB CHECK 이중). 한 줄 입력값에 개행이 들어가면 머리말 레이아웃이 깨진다.
6. **공개 범위 확정.** 교직원 GET(범위 통과)에는 싣는다(intro 와 같음). 기업 제출 포트폴리오·`students.py` 부트 프로필 `targetCompany`·로드맵 생성 입력에는 싣지 않는다. 부트 프로필에 합치면 교직원 로드맵 편집기·상담 모달·상담 챗봇이 학생 입력값을 「확정 로드맵 목표」로 오인한다.
7. **보존(숨김) 유지, 서버 차단 없음.** 로드맵이 기업을 가지면 학생 값은 지우지 않고 화면에서만 숨긴다. 로드맵 코드가 `growth_profile` 을 쓰지 않는다(도메인 결합·부수효과 삭제 금지). 서버가 「로드맵 기업 있으면 학생 쓰기 거부」를 하면 로드맵 확정과의 경쟁만 생기고 얻는 것이 없다.
8. **기존 구조 재사용 검토 결과 — 열 추가가 맞다.** `counsel_request.desired_company`(신청 1건의 신청 시점 속성, 수정 경로 없음)·`job_wishlist`(공고 FK)·`dc.company`(교내 공고 기업 사전, 학생 쓰기 불가)·`student_job_interest`(직무) 어느 것도 「학생 1명이 언제든 고치는 목표 기업 1개」와 의미·소유권·생명주기가 맞지 않는다. 1:1 별도 테이블은 조인·잠금만 늘린다.

`DB_SCHEMA.md` 에 184 대기 항목을 추가했다(적용 전 상태 명시).

## 3. 필수 조건 (Sol·팀장 — 하나라도 빠지면 승인 무효)

1. **C1 SQL**: 184 는 rev2 §3-1 SQL 그대로(`lock_timeout`·열·`ck_growth_profile_target_company`·COMMENT·롤백 주석). 기본값·인덱스·백필 없음. `growth_event` CHECK 는 건드리지 않는다. 적용된 마이그레이션(025 등)은 수정하지 않는다.
2. **C2 부분 갱신**: `ProfileBody` 네 필드 모두 `model_fields_set` 기준 부분 갱신, 생략 필드는 `before` 값 유지, 빈 요청 422(version·이벤트 불변). `targetCompany` 는 strip 후 `''`→`None`, 200자 초과·제어문자 422.
3. **C3 멱등**: digest 는 `identity + body.model_dump_json(exclude_unset=True)`. 같은 키로 생략 vs `null` → 409.
4. **C4 이력**: `PROFILE_UPDATE` 의 before/after 는 `intro`·`email`·`phone`·`targetCompany` 네 키 전체 스냅샷. 기존 키 이름 불변.
5. **C5 DTO 범위**: `profile_dto` 에 `targetCompany: str | None`(본인·범위 교직원 공통). `students.py` 부트 프로필·`student_portfolio.py` `personal`·`roadmap_generator.generation_input`·AI 코멘트 문맥에는 넣지 않는다 — 계약 테스트로 부트 프로필과 제출 문서에 키가 없음을 확인.
6. **C6 판정 셀렉터**: `src_v2/data/` 아래 함수 하나가 `{name, source:'ROADMAP'|'SELF'} | null` 을 낸다. ROADMAP = `student.targetCompany` 가 객체 + `name.trim()` 비어 있지 않음. 머리말·태그 「관심 기업」·PROFILE 카드 「관심 기업」이 모두 이 셀렉터만 읽는다(`targetCompany?.name` 직접 읽기가 GrowthHome 에 남지 않는다).
7. **C7 쓰기 UX**: 저장·지우기는 `await` + 실패 표시. 409 는 안내 후 `ensureGrowth(id, true)` 재조회, 입력값 유지. 저장 성공 시 추가 네트워크는 PATCH 1 + 기존 `refresh` GET 1 뿐. `saveGrowthProfile` 은 선택 키 타입으로 넓히되 Portfolio 호출부는 고치지 않는다.
8. **C8 계약 테스트**: rev2 §5 의 1~11 을 새 파일로, `GROWTH_PROFILE_KEYS` 에 `'targetCompany'` 추가(케이스 삭제 금지), `test_growth.py`·`test_academic_photo.py`·`test_boot_contract.py` 무수정 통과. 회귀 기준선 FAILED 집합 비교(알려진 4건 제외 규칙 유지). `npx tsc -b` 통과.
9. **C9 적용 순서**: 격리 `_test` DB 적용·재실행(두 번째 실행이 실패해도 되는 ALTER 이므로 마이그레이션 러너의 적용 이력으로 1회만 도는지 확인)·테스트 통과 → 로컬 백업(`docker:up` 경로) → 184 로컬 적용 → `npm run docker:up` → ego-browser 검증. 서버 배포 없음.
10. **C10 화면 검증·기록**: 20262324(문자열 「미정」 → SELF 경로)로 추가→새로고침→고치기→지우기, 포트폴리오 자기소개 저장 후 목표 기업 유지. ROADMAP 경로는 브라우저 안 응답 패치로 `{name}` 객체와 문자열 두 모양을 각각 확인. 1280·390, 콘솔 오류 0·실패 요청 0·호출 수 증가 0. 검증 학생의 실제 입력값·이름을 문서·커밋·스크린샷 설명에 남기지 않는다. 구현 기록에 rev2 와 다르게 간 곳을 명시하고 `DB_SCHEMA.md` 184 항목을 적용 결과로 갱신.

## 4. 예상 주요 query 와 인덱스 대응표

| query | 호출처·빈도 | 경로 | 비용 |
|---|---|---|---|
| `SELECT * FROM dc.growth_profile WHERE student_uid=$1` | 내 성장·포트폴리오·교직원 상세 GET(이미 호출 중) | `growth_profile_pkey` 1행 | 불변 — 열 1개 추가, 응답 +수십 B |
| `pg_advisory_xact_lock` + `SELECT … FOR UPDATE` + `UPDATE … WHERE student_uid=$1` + `INSERT growth_event` | 목표 기업 저장·지우기(학생 수동, 드묾) | PK 1행 잠금, `growth_event_timeline` 인덱스 갱신 | 기존 자기소개 저장과 동일 |
| `dc.idempotency` 조회·INSERT | 위 PATCH 마다 | 기존 PK | 동일 |
| 기업명 검색·집계 | **없음** | — | 인덱스 불필요. 향후 「목표 기업별 학생 수」 같은 집계가 생기면 그때 정규화(기업 사전 연결) 여부를 다시 리뷰 |

화면 호출 수: 읽기 추가 0(`growth/profile` 은 이미 이 화면에서 읽는다). 쓰기 시 PATCH 1 + 재조회 GET 1.

## 5. 위험·migration·rollback

- **잠금**: `ALTER TABLE … ADD COLUMN`(기본값 없음)은 메타데이터 변경, `ADD CONSTRAINT CHECK` 는 전 행 검증 스캔이 있으나 새 열이 전부 NULL 이고 행 수가 학생 수 이하라 즉시 끝난다. 둘 다 ACCESS EXCLUSIVE 를 잠깐 잡으므로 `lock_timeout 5s` 로 대기 폭주를 막는다(실패 시 재시도).
- **호환성**: 새 API(부분 갱신)는 기존 요청 모양(Portfolio 의 4키 전송)에 대해 결과가 같다. 유일한 의미 변화는 「키를 생략하면 기존 값 유지」 — 생략으로 연락처를 지우던 호출처는 없다(grep 확인: 호출처 1곳이 항상 세 키를 보낸다).
- **배포 순서**: 마이그레이션 → API → 프론트. API 가 먼저 나가면 `target_company` 열이 없어 500 이므로 순서를 지킨다(로컬 `docker:up` 은 같은 경로에서 함께 반영).
- **롤백**: 코드 먼저 되돌린 뒤 필요 시 `ALTER TABLE dc.growth_profile DROP COLUMN target_company;`(제약은 열과 함께 삭제). 학생 입력값은 사라지지만 `growth_event` 이력에 값이 남는다(불변 트리거 — 지우지 않는다). 열을 남겨 두는 롤백(코드만 되돌림)도 안전하다 — NULL 허용 열이라 옛 코드가 무시한다.
- **잔여 위험**: 프로필 version 공유로 다른 탭의 성장 자료 쓰기 직후 목표 기업 저장이 409 가 될 수 있다 — C7 의 재조회 안내로 처리. 문자열 모양 로드맵 값의 프론트 타입 불일치는 기존 결함(범위 밖 보고).

## 6. JSON 호환성 테스트 항목

- GET `/students/{id}/growth/profile`·PATCH 응답·`/portfolio` `profile`: 기존 키 전부 유지 + `targetCompany`(`str | None`). 기존 키 타입 불변.
- `/students/{id}`·`/bootstrap/profiles` 의 `targetCompany`: 객체(또는 기존 문자열) 그대로 — 학생 입력값과 무관(`test_boot_contract.py` 무수정 통과).
- `/students/{id}/portfolios` 제출 문서 `personal`: 키 집합 불변(목표 기업 없음).
- `growth/events` 교직원 응답: before/after 미노출 규칙 불변.

## 7. Sol 이 그대로 실행할 순서

1. `backend/migrations/184_growth_target_company.sql` 작성(rev2 §3-1 그대로).
2. `growth.py`: `ProfileBody.targetCompany`·빈 요청 422·`exclude_unset` digest·부분 UPDATE·이벤트 네 키·`profile_dto.targetCompany`.
3. 테스트: 새 `test_growth_target_company.py`(§5 1~11), `GROWTH_PROFILE_KEYS` 갱신. 격리 DB 에서 184 적용 후 실행 → 회귀 기준선 비교.
4. 프론트: `growthStore.ts` 타입·`saveGrowthProfile` 선택 키 → `src_v2/data/` 판정 셀렉터 → `GrowthHome.tsx` 머리말(아바타·h2·학과 줄 삭제, 목표 기업 블록, aria 이동, 고아 import 제거)·태그·PROFILE 카드 → `GrowthHome.css`(DESIGN 토큰, 760 이하 1열 유지). `npx tsc -b`.
5. 로컬 백업 → 184 로컬 적용 → `npm run docker:up` → ego-browser 검증(C10) → `implementation.md` 기록·`DB_SCHEMA.md` 갱신 → 팀장 검증 요청.

## 8. 사용자 확인 권장 항목 (기본값으로 진행 가능)

- **U1** 로드맵 생성 때 상담사가 희망 기업을 비워 두어 모델이 쓴 요약(「미정」, 업종 요약 등)만 있는 경우를 「목표 기업을 정하지 않음」으로 보고 학생 입력을 허용한다. **기본값: 그렇게 한다**(지금 화면도 「미정」으로 보인다).
- **U2** 학생이 CARE 7+ 상담 신청 때 적은 희망 기업(`desired_company`)을 목표 기업 입력 칸의 기본값으로 제안할지. **기본값: 하지 않는다**(지시 범위 밖, 신청 시점 값이라 의미가 다르다).
