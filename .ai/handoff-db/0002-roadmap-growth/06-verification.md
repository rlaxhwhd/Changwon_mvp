# 로드맵·IAP + 성장활동 — 독립 검증 (C6)

- 검증: 2026-09-09 / `db-ecc-reviewer`(Opus) / 구현자와 별도 컨텍스트
- 입력: `04-decisions.md`(APPROVED) · `03-opus-review.md` §3·§4 · `05-implementation.md`
- 대조: 실행 스택(DB·API·두 SPA) + gstack `/browse` + 실제 PostgreSQL 조회 + 코드 열람

## 판정: **REJECT**

> ⚠ **검증 도중 작업 트리가 바뀌었다.** 1차 검증에서 찾은 블로커 2건(D1·D3)이
> 16:52 에 수정돼 들어왔다(`students.py` · `bootstrap.ts` · `roadmap.py` mtime).
> 그 둘은 **재검증해서 해소를 확인했다.** 아래는 **현재 트리 기준**이다.
> 남은 블로커는 **D2 계열 1건**이며, 이것이 승인서 Q1 의 핵심 조건이다.

---

## 1. 브라우저 왕복 QA — 수행함

### 스택

| 구성 | 결과 |
|---|---|
| DB `dreamcatch-dev-db` (15432) | Up. `024`·`025`·`026` 적용 확인(`dc.schema_migration`) |
| API 18100 | ⚠ **원래 떠 있던 프로세스(PID 9992)는 구버전이었다** — `/openapi.json` 에 로드맵·성장 라우트가 0건(72 paths). 종료 후 재기동. 최종 검증 시점 104 paths |
| 화면 | vite 2개가 떠 있었다(5173·5174, 동시 작업). **둘 다 `/api/v1/roadmap/capabilities` 에 401 → 신규 API 프록시 확인.** 최종 왕복은 5174 에서 수행(5173 은 검증 중 종료됨) |
| `.env.local` | `DC_API_TARGET=http://127.0.0.1:18100` 확인 |

> 구버전 API 가 떠 있었다는 사실 자체가, 이 라운드가 실행 스택 위에서 한 번도
> 확인되지 않았다는 방증이다(`05-implementation.md` §7-8 자기 신고와 일치).
> **재검증 시 반드시 `/openapi.json` 의 라우트 존재부터 확인할 것** — 구버전이 떠 있으면
> 화면이 조용히 옛 동작을 보여준다.

---

## 2. 해소 확인된 1차 블로커 2건

### D1 (해소) — 확정 계획 없는 학생이 두 SPA 를 죽이던 문제

1차 검증에서 `students.py` 가 확정 계획이 없으면 `targetCompany` 를 프로필에서 pop 했고,
프론트 5곳(`students.ts:354` · `RoadmapStatus.tsx:107,119` · `RoadmapEditorPanel.tsx:190` ·
`studentDetail.ts:302,303` · `counselChatbot.ts:33`)이 이를 필수로 읽어
**`jiwoo` 하나 때문에 `/admin` 전 경로와 `/v2`(jiwoo)가 부팅 중 크래시**했다.
타입 선언이 필수라 `tsc -b` 가 잡지 못했다.

현재 `backend/app/students.py:23~33` 은 지우지 않고 **확정 계획이 있을 때만 덮어쓰고**
`setdefault('targetCompany',{})` 로 모양을 보존한다.

**재검증(브라우저):**

| 화면 | 결과 |
|---|---|
| `/admin` `career_park`(진로취업상담사) | ✅ 렌더 — 담당 학생 115명 대시보드. 콘솔 오류 0 |
| `/admin` `psych_han`(심리상담사) | ✅ 렌더 |
| `/admin` `cse-1`(교수) | ✅ 렌더 — 지도학생 5명 |
| `/admin` `system-admin` | ✅ 렌더 — `/admin/system` |
| `/v2/main` `jiwoo`(계획 없음) | ✅ 렌더. 콘솔 오류 0 |

API 실측: `bootstrap/profiles` 3명 모두 `targetCompany` 가 dict 로 내려온다.

### D3 (해소) — 상담사 아닌 교직원의 `/admin` 부팅 403

1차 검증에서 `shared/bootstrap.ts:42` 의 `loadRoadmapRequests()` 가 무가드라
`GET /roadmap-requests` 403 을 받는 교수·조교·심리상담사·시스템관리자의 부팅이 끊겼다
(「요청에 실패했습니다. (403) / 다시 연결」).

현재는 `GET /api/v1/roadmap/capabilities` 신설 + `if (roadmapCapability().canManageRequests)`
가드가 들어갔다. 역할별 실측:

```
career_park  canManageRequests=true    psych_han    false
cse-1        false                     system-admin false
```

위 표대로 4역할 전부 `/admin` 이 렌더된다. **해소.**

---

## 3. 남은 블로커 — D2: 승인서 Q1 의 「재확정까지 잠근다」가 화면에서 성립하지 않는다

`04-decisions.md` Q1: *「재생성 중에는 … 그동안 학생의 비교과·취업지원은 **재확정될 때까지
잠긴다.**」* + *「⚠ 잠긴 동안 학생 화면이 빈 화면이 되면 안 된다. 사유와 다음 단계를 주어야
한다(`CLAUDE.md` 13조). 이 잠금은 게이트 판정 한 곳에서만 한다.」*

**크래시는 없어졌다.** 그러나 잠기지 않는다.

### D2a (BLOCKER) — 초안 상태에서 비교과·취업지원이 그대로 열려 있다

구현자는 이 함정을 알고 전용 함수를 만들었다 — `src_admin/data/roadmapGenerated.ts:8~23`

```ts
// ★ 「있다(hasRoadmap)」와 「확정됐다(confirmed)」는 다른 사실이다. 예전 코드는 둘을
//   같은 함수로 답해서, 초안만 있는 학생에게도 다음 단계가 열렸다.
export function hasRoadmap(studentId: string): boolean {          // :16 초안 포함
  return Boolean(envelope?.roadmap) || Boolean(envelope?.pending)
}
export function hasConfirmedRoadmap(studentId: string): boolean {  // :22 확정만
  return Boolean(roadmapEnvelope(studentId)?.roadmap?.confirmed)
}
```

**그런데 `hasConfirmedRoadmap` 은 코드 전체에서 한 번도 호출되지 않는다.**
게이팅을 조립하는 곳은 여전히 초안 포함 함수를 쓴다.

- `src_v2/data/pipeline.ts:19` `import { hasRoadmap } from '../../src_admin/data/roadmapGenerated'`
- `src_v2/data/pipeline.ts:84` `roadmapConfirmed: hasRoadmap(student.id),`

`careerProcess.ts:459~460` 이 `growth`·`employment` 를 `roadmapConfirmed` 로 여닫으므로,
**초안이면 열린다.**

**브라우저 실측** — `chaewon` 의 계획을 `reopen` 으로 `DRAFT` 로 만든 뒤
(`dc.roadmap.status_code='DRAFT'`, `lock_version=4`), `dc_active_student=chaewon` 확인 후:

| 화면 | 기대(Q1) | 실제 |
|---|---|---|
| `/v2/growth/program` | 잠김 + 사유 | ❌ **완전히 열림** — 「비교과 프로그램 신청」·「김채원님께 추천」·프로그램 카드 목록 |
| `/v2/jobs` | 잠김 + 사유 | ❌ **완전히 열림** — 교내 채용공고 목록 |

서버는 옳다. 같은 상태에서 `POST /programs/prog_003/applications` (as `chaewon`) →
`{"detail":"상담사가 로드맵을 확정해야 합니다. 재생성 중에는 확정 전까지 잠깁니다."}`.
즉 **데이터가 새지는 않지만, 학생은 잠긴 줄 모르고 들어갔다가 마지막에 거절당한다.**

이는 동시에 `CLAUDE.md` 13조 위반이다 — 잠금 술어가 두 벌이다.
`gates.py` 는 `confirmed`, `pipeline.ts` 는 `존재`. 승인 범위 §4-4
「게이트 단일 정책 확장」이 서버에서만 끝나고 화면 쪽이 남았다.

### D2b — 잠금 화면의 사유가 틀렸다

`/v2/growth/roadmap-status` (chaewon, DRAFT):

> 「아직 로드맵이 생성되지 않았습니다. **진단을 마치고 상담을 완료하면** 상담사가 3축
> 로드맵을 확정합니다.」 + `상담 신청` 버튼

`chaewon` 은 진단(`ccore`·`c3`)도 CARE7 상담도 이미 완료했고 계획도 **있다**(초안일 뿐).
서버는 이 상태를 정확히 구분해 보낸다:

```json
{"roadmap":null,"pending":true,
 "gate":{"eligible":false,"reasons":[{"code":"ROADMAP_CONFIRMATION_REQUIRED",
   "message":"상담사가 로드맵을 확정해야 합니다. 재생성 중에는 확정 전까지 잠깁니다.",
   "nextRoute":"/growth/roadmap-status"}]}}
```

화면이 `pending` 과 `gate.reasons` 를 읽지 않고 「미생성」 문구로 떨어진다.
빈 화면은 아니므로 13조를 최소한으로는 지키지만, **다음 단계를 틀리게 안내한다.**

### D2c (경미) — 거절 응답의 모양이 두 벌

읽기 계열은 `{code, message, nextRoute}` 를 주는데, 게이트 거절
(`POST /programs/{id}/applications`)은 `{"detail": "<문자열>"}` 만 준다.
화면이 사유는 띄울 수 있어도 다음 단계 링크를 만들 수 없다.

---

## 4. 승인 범위 이행 — 직접 대조

Q3 제외 4건은 **정말 미구현이다.**

| 제외 항목 | 확인 |
|---|---|
| 오늘 미션 | 024·025 에 테이블 없음, `growth.py` 에 엔드포인트 없음 |
| 퀘스트·XP·레벨·랭킹 | 마이그레이션 언급은 주석뿐, 테이블·API 0 |
| STAR 판정 | `growth.py:558~579` 는 `payload` 그대로 + 단계 수만 SQL 로 센다. `metricsStatus='POLICY_PENDING'` 고정, **쓰기 API 없음**, 합격·장학 계산 없음 |
| 채용 포트폴리오 제출 | `jobs.py:224 canApplyWithPortfolio: False` · `:227 PORTFOLIO_SERVICE_UNAVAILABLE` · `:784 raise HTTPException(503,…)` — **무변경** |

E1~E19 표본 대조 전부 이행. E1(`position>0` + `enumerate(start=1)`) ·
E2(`confirmed` = `GENERATED ALWAYS AS (status_code='CONFIRMED') STORED`) ·
E4(`dc.roadmap_item_alive()` 한 벌 + `student_list` 뷰 교체 + roster 폴백 제거) ·
E7(024:209~220 `schema_version` CHECK + `student_uid` FK) · E13(409 `SNAPSHOT_VERSION_EXISTS`) ·
E14(대리 UUID PK + 부분 유니크) · E16(GRANT 명시, DELETE 없음) · E17(`created_at` NULL 허용).

참조 패턴 준수 — 생성열 + 복합 FK(`roadmap_item_*_fk` 6개), append-only 트리거 4개
(`roadmap_event_immutable` · `roadmap_request_event_immutable` · `growth_event_immutable` ·
`program_wishlist_event_immutable`), `lock_version`/`version` 낙관적 잠금
(409 `VERSION_CONFLICT` + `currentVersion` 실측 확인), `Idempotency-Key` 헤더 필수,
서버 페이징(`page/pageSize/totalCount`).

7조 — 신규 API 는 `collegeCode`/`deptCode` 쌍만 받는다(`roadmap.py:222~230`, 근거 주석 포함).
`students.py:57` 의 기존 `major_label=ANY(%s)` 는 손대지 않았고 복제도 없다.

---

## 5. 성장활동 시드 오염 — DB 직접 조회, **깨끗함 (PASS)**

```
dc.growth_entry   20211304 JOURNAL 6 · 20196208 JOURNAL 3   (9행, 그 외 없음)
  → 9행 전부 legacy_ref.sourcePath = "src_v2/data/growthJournal.seed.json", source_kind='IMPORTED'
dc.growth_profile 2행 — contact_email·contact_phone·intro 전부 빈 값
dc.program_wishlist 0행
```

소유자 없는 행 0 · 전 학생 공통 샘플(`INITIAL_*`·`GROWTH_RECORDS`) 0 ·
합성 연락처(`student@cwnu.ac.kr`·`010-1234-5678`) 0 · `dc_program_wishlist` 0.
`src_v2/data/portfolio.ts` 에 `INITIAL_` 은 주석 한 줄만 남았고 상수는 삭제됐다.

교정 C6 열람 범위도 지켜졌다 — `GET …/growth/events` 가 교직원에겐
`action/actorName/createdAt/entryId/id`, 본인에겐 `+beforeValue/afterValue`.

---

## 6. 잔여 위험 5건(구현자 신고) 판정

| # | 판정 |
|---|---|
| ① 비교과 게이트가 확정 로드맵만 요구 | **사실관계는 맞다. 근거 설명은 부정확하다. 별건 유지에는 동의.** DB 확인: `changwon` 은 `ccore` 만 완료, T4 후속진단 미완료 → 확대하면 서버가 잠근다. 그러나 **프론트 `StageGate` 가 이미 `changwon` 의 비교과를 잠그고 있다**(브라우저 확인 — 사유 + 4단계 + 「후속진단 응시하기」). 따라서 「확대하면 `changwon` 이 즉시 잠긴다」는 화면 기준으로 이미 참이고, 실제 위험은 「서버가 화면보다 느슨해 UI 우회가 가능하다」 쪽이다. 승인 범위를 넘지 않으므로 확대 보류 자체는 옳다. **단 D2a 와 합치면 「단일 정책」(13조)은 미달이므로 별건 등록 필요** |
| ② `students.py:57 major_label=ANY(%s)` | **동의.** 복제 없음 |
| ③ AI 원문 text 잔존 | **동의.** 소비자 전환 전 삭제가 더 위험하다 |
| ④ `restore-edit` 는 현재 세대 BASE 칸만 | **동의.** 스냅샷 immutable 과 일관 |
| ⑤ 스냅샷 상담사 전용 | **동의.** `DB.md` #37 열린 채 유지 |
| (⑧ 브라우저 왕복 미수행) | 이번에 수행했고 그 자리에서 D1·D2·D3 이 나왔다. 이 절차가 왜 필수로 승격됐는지가 그대로 증명됐다 |

---

## 7. 회귀 테스트 진위 — 직접 되돌려 확인

`backend/app/students.py` 의 `data.pop('roadmapAxes'…)` / `data.pop('roadmapOutcome'…)`
두 줄을 `pass` 로 되돌리고 실행:

```
FAILED tests/test_roadmap.py::test_profile_no_longer_carries_the_plan
1 failed
```

원복 후 `diff` 로 원본과 동일함을 확인했다. **가짜 회귀가 아니다.**

**단, 테스트가 D2a 를 잡지 못한다** — `test_draft_is_stored_and_hidden_until_the_counselor_confirms`
는 서버 응답만 본다. 화면 게이팅을 검사하는 테스트가 없다.

---

## 8. 완료 게이트

| 게이트 | 결과 |
|---|---|
| 빈 `dreamcatch_test` 재생성 → migrate | ✅ `024`·`025`·`026` Applied |
| seed | ✅ `{"status":"imported","sourceFiles":43,"students":120}` |
| `pytest -q` (`dc_app`) | ✅ **89 passed** |
| `npx.cmd tsc -b` | ✅ exit 0 |
| `npm run build` | ✅ built in 2.54s |
| 업무용 localStorage 제거 | ✅ 대상 도메인 데이터층 실호출 0(주석만 잔존). 잔여 10파일은 미이관 도메인·활성사용자 스텁 |
| **브라우저 왕복 QA** | ❌ **D2a·D2b — Q1 의 잠금이 화면에서 성립하지 않는다** |
| `DB.md` §8-3 일치 | ⚠ 3번 「완료」는 시기상조 |

### `DB.md` §8-3

- 4번 성장활동 「부분」 + 제외 4건 명시 → **정확**
- localStorage 파일 수 10 → 실측과 일치
- **3번 로드맵·IAP 「완료」 → 시기상조.** 표의 판정 기준이 「데이터층이 localStorage 를 읽는지 +
  API 가 있는지」 둘뿐이라 **화면 게이팅이 틀려도 완료로 적힌다.** D2a 가 정확히 그 사각지대다.
  D2 해소 전까지 「완료」로 두지 말 것

---

## 9. 구현자에게 돌려보내는 수정 범위

새 업무 결정은 필요 없다. 전부 기술 결함이다.

1. **D2a** — `src_v2/data/pipeline.ts:19,84` 이 `hasRoadmap` 대신
   **이미 만들어 둔 `hasConfirmedRoadmap`**(`src_admin/data/roadmapGenerated.ts:22`)를 쓰게 한다.
   현재 그 함수는 호출자가 0이다.
   회귀: 계획을 `DRAFT` 로 만든 학생의 `/v2/growth/program` · `/v2/jobs` 가 잠기는지.
2. **D2b** — `/v2/growth/roadmap-status`(및 `StageGate`)가 서버의 `pending` 과
   `gate.reasons[].message`·`nextRoute` 를 그대로 쓰게 한다. 화면이 문구를 다시 만들지 않는다.
   「미생성」과 「재생성 중 확정 대기」는 다른 상태다.
3. **D2c** — 게이트 거절 응답을 읽기 계열과 같은 `{code, message, nextRoute}` 로 맞춘다.
4. 화면 게이팅 회귀를 남긴다 — 지금 테스트는 서버 응답만 보므로 D2a 를 영영 못 잡는다.
5. 재검증 시 `/openapi.json` 으로 **API 가 현재 코드인지** 먼저 확인한다.

### 검증 중 개발 DB 에 남긴 변화 (원복 완료)

- `chaewon` 로드맵 `reopen`↔`confirm` 2왕복 → `status_code=CONFIRMED` 복귀, `lock_version` 1→5,
  `roadmap_event` 4행 추가(append-only 라 원복 불가·정상)
- QA 성장일지 1건 생성 후 API 로 소프트 삭제 → 활성 `growth_entry` 9행 복귀
- `dreamcatch_test` 는 재생성했다
- 18100 의 구버전 API 프로세스(PID 9992) 종료
