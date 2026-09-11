# 채용·취업(jobs) DB 전환 설계 — Opus 프로세스 검증

- 작성: 2026-09-09 / db-process-reviewer(Opus) / C3
- 대상: [01-current-state.md](01-current-state.md) · [02-migration-design.md](02-migration-design.md) (둘 다 `DRAFT_FOR_OPUS_REVIEW`)
- 읽은 정본: `spec_v1.md` 전문 · `DB.md` §3·§8-0~§8-6·§9 · `PROCESS.md` · `SPEC.md`(§2·§3-6·§7-0·§7-11·§10) · `.ai/handoff-db/_schema.md`
- 대조한 실제 코드: `backend/migrations/001~021` · `backend/app/*.py` 전체 · `backend/tests/{conftest,test_programs}.py` · `shared/{api,programStore}.ts` · `src_admin/data/{jobsSource,jobApplications,jobApplicationExport,studentRoster,departments,programs}.ts` · `src_admin/data/schema/{job,jobApplication}.ts` · `src_admin/pages/JobForm.tsx` · `src_v2/{App.tsx,data/pipeline.ts,components/JobApplyModal.tsx,pages/jobs/*}`
- **소스·DDL·테스트·migration을 수정하지 않았다.** 이 문서는 교정 설계와 질문만 담는다.

**최종 상태: `NEEDS_USER_DECISION`** — 기술 오류 14건은 아래 §3에서 직접 교정했다. 남은 것은 업무 의미를 정해야 하는 질문 3개(§8)뿐이며, 그 답 없이는 **채용 도메인의 왕복(학생 지원 → 상담사 전형 진행 → 학생 타임라인)을 열 수 없다.**

---

## 1. 총평

설계의 뼈대는 승인 가능하다. 비교과 패턴(생성열+복합 FK, append-only 이벤트, version 낙관적 잠금, Idempotency-Key, 부모→자식 잠금 순서, `staff_student_scope` 범위 SQL)을 정확히 읽었고, 비교과가 남긴 결함(통계의 범위 누락, `student_access`의 "과거 상담 담당" 우회 경로)을 계승하지 않겠다고 명시한 것은 옳은 판단이다. 전형 단계를 enum 이 아니라 데이터로 두고 이름 스냅샷으로 과거를 복원하는 설계, 재지원을 회차(attempt)로 쌓아 직전 제출 스냅샷을 덮지 않게 한 설계, 파생값(effectiveStatus)을 저장하지 않고 응답마다 계산하는 설계는 모두 `CLAUDE.md` 2·3·10·11조에 맞는다.

그러나 **세 종류의 문제가 있다.**

| 등급 | 내용 | 절 |
|---|---|---|
| **치명** | 마이그레이션 **019·020·021(AI 산출물 4테이블)을 못 봤다.** 자소서 AI 평가를 "AI DB 책임"으로 미루고 `job_resume.ai_result_ref` 라는 느슨한 참조를 새로 만들려 한다. 이미 서비스 DB 안에 정본이 있고, 그 정본이 **불변(append-only)이라 나중에 고칠 수 없는 포인터**를 자소서 ID `r1`·`r2` 로 이미 박아 두었다 | §2 |
| **치명** | 인가 설계가 `administration.py` 의 `auth_user` 검사를 재사용하라고 쓰여 있다. **`dc.auth_user` 에는 `local:system-admin` 한 행뿐이고 진로취업 상담사는 한 명도 없다.** 그대로 구현하면 전 상담사가 403 이 된다 | §3 E02 |
| **치명** | J1·J2 를 승인해도 **학생은 지원할 수 없다.** 두 제출 경로가 각각 #41(파일)과 #4(포트폴리오)에 막혀 있어, 이 도메인의 존재 이유인 지원 왕복이 열리지 않는다. 설계는 이 사실을 인정하지만 대안을 제시하지 않았다 | §6·§8 Q1 |

나머지는 컬럼명 오기·과잉 nullable·이름 공간 문제이며 아래에서 직접 고쳐 썼다.

---

## 2. ★ 019·020·021 을 설계가 놓쳤다 — AI 산출물은 재사용한다

### 2.1 사실

| 사실 | 근거 |
|---|---|
| AI 산출물 4테이블은 **서비스 DB(`dc` 스키마) 안에** 있다 | `019_ai_artifacts.sql` — `dc.ai_run` · `dc.ai_comment` · `dc.ai_suggestion` · `dc.ai_score` |
| 코드그룹 `AI_RUN_KIND` 에 **`RESUME_REVIEW`(자기소개서 평가)** 가 이미 있다 | `019:26` |
| 자소서 평가 결과가 **이미 적재돼 있다** — 점수 10행·개선제안 6행 | `021_ai_resume_review.sql` |
| 그 행들은 자소서를 **`subject_kind='RESUME'`, `subject_id='r1'/'r2'`** 로 가리킨다. 소유 학생도 지정돼 있다(`20211304`=chaewon, `20196208`=changwon) | `021:11-13`, `src_v2/data/students/{chaewon,changwon}.json:3` |
| 021 은 **채용 도메인을 기다린다고 명시**한다 — "채용 도메인이 들어오면 이 포인터가 실제 행을 가리키게 된다" | `021:1-9` 헤더 |
| `dc.ai_run` 은 **UPDATE·DELETE 가 트리거로 거부된다.** 나중에 `subject_id` 를 다시 매핑할 수 없다 | `019:80-87` + `dc.reject_history_change()` (`002:100`) |

### 2.2 설계의 오판

- `02-migration-design.md` §3.5: `job_resume` 에 `ai_result_ref nullable text` 를 두고 "AI DB FK를 서비스 DB에 만들지 않는다"
- `01-current-state.md` §5.4·§5.5: "실제 AI 호출·모델·프롬프트·입력 근거는 없다 … 실제 추천/평가 결과는 AI DB 책임이다(`SPEC.md:1200·1267`)"

두 서술 모두 **019~021 이전의 사실**이다. `_schema.md` 문서 우선순위상 「실제 적용된 DB 구조 = `backend/migrations/`」가 정본이므로 `SPEC.md` §10 쪽이 낡았다.

### 2.3 교정 설계 (사용자 질문 아님 — 확정)

1. **jobs 는 AI 테이블·컬럼을 새로 만들지 않는다.** `job_resume.ai_result_ref` 를 **삭제**한다. AI 산출물은 `dc.ai_run(subject_kind, subject_id)` 가 **가리키는 쪽**이며, 자소서 쪽에서 역참조 컬럼을 들 이유가 없다(`CLAUDE.md` 3조 — 파생값을 원본에 넣지 않는다).
2. **`subject_kind` 는 `'RESUME'` 을 그대로 쓴다.** `'JOB_RESUME'` 같은 새 값을 만들지 않는다 — 021 이 이미 `'RESUME'` 로 썼고 그 행은 불변이다.
3. **`job_resume` 의 PK 는 021 이 가리키는 ID 를 보존해야 한다.** 이관/시드에서
   - `r1` → 소유자 `20211304`(chaewon), `r2` → 소유자 `20196208`(changwon), 본문·제목·회사·분야는 `src_v2/pages/jobs/resumeMock.ts:14-45` 의 값 그대로.
   - `r3`(카카오 인턴십 지원서)은 **소유자가 없다** — 021 이 배정하지 않았다. **시드하지 않는다.** 소유자를 지어내지 않는다.
   - 이 두 행을 만들지 않으면 021 의 `ai_run` 2건이 영구 dangling 이 되고, 트리거 때문에 사후 정정도 불가능하다. **이것은 선택이 아니라 제약이다.**
4. `job_resume.origin` 은 `USER|LEGACY` 두 값으로 줄인다. 설계의 `AI_ASSISTED` 는 지금 정직하게 세울 수 없는 값이고(초안 생성 AI 가 없다), 필요해지면 `ai_run` 존재 여부로 질의하면 된다 — 두 벌로 두면 어긋난다.
5. **화면**: 이번 범위에서 `AiConsulting.tsx` 는 **자소서 목록 소스만** `job_resume` 로 바꾼다. 평가 결과 표시(`MOCK_EVALUATION`)는 **건드리지 않는다.** 설계 §7의 "실제 AI 기능은 별도 unavailable 상태"는 현재 화면에서 보이는 것을 없애는 **회귀**이며, 019~021 이 이미 데이터를 갖고 있으므로 올바른 해법은 AI 읽기 API 하나(별도 도메인 작업)다. jobs 가 그것을 대신 만들지 않는다.
6. `AiJobs.tsx` 의 학생 JSON `jobs[]` 숫자 ID 를 `job_posting.id` 와 자동 join 하지 않는다 — 설계의 판단이 옳다. 유지.

> **team-lead 후속(이 handoff 밖)**: `SPEC.md` §10-3 표(`ai_review`·`ai_job_reco` 를 별도 AI DB 로 규정)와 019~021 이 충돌한다. 문서 갱신 대상으로 기록만 남긴다.

---

## 3. 발견한 기술 오류와 교정 설계

존재하지 않는 컬럼·경로, DTO 불일치, 빠진 FK·인덱스, 잘못된 인가/트랜잭션 경계는 아래에서 직접 고쳤다. **구현자는 이 절을 설계 본문보다 우선한다.**

### E01 — `dc.diagnosis_attempt.status` 는 없다

- 설계 §4.2-1: "`dc.diagnosis_attempt` 의 `test_id='ccore'`, `status='DONE'`"
- 사실: 컬럼명은 **`status_code`** (`002:37`). 그리고 기존 서버 게이트는 상태가 아니라 **`completed_at IS NOT NULL`** 로 판정한다(`counsel.py:131`).
- **교정**: 완료 판정은 `completed_at IS NOT NULL` 하나로 통일한다. `status_code='DONE'` 과 두 벌로 두면 상담 게이트와 취업 게이트가 어긋난다.

### E02 — ★ 인가 판정이 틀렸다. 그대로 구현하면 전 상담사가 403 이다

- 설계 §5.1: "`administration.py` 의 유효 `auth_user`/`auth_role` 검사 재사용. AUTH0006 관리자는 실제 활성 부여 확인, AUTH0005 등 총괄은 …"
- 사실:
  - `dc.auth_user` 의 행은 **`('local:system-admin','AUTH0006')` 하나뿐**이다(`009:47`). 다른 삽입 지점이 저장소 전체에 없다.
  - 진로취업 상담사의 역할은 **`dc.staff.role_code='career'`** 이고, `dc.auth_role` 에 `career/psych/professor/assistant` 가 역할 코드로 들어 있다(`012:1-4`).
  - 채용 메뉴 `jobs`·`jobs.0`~`jobs.4` 는 **`career` 에만** 부여돼 있다(`012:61-72`). `AUTH0005` 는 존재하지 않는다.
- **교정**: `metadata.py:19-24` 의 메뉴 권한 술어를 **그대로** 재사용한다. jobs 관리 권한 판정은 다음 하나다.

```sql
EXISTS(SELECT 1 FROM dc.menu m JOIN dc.menu_auth a USING(menu_code)
       WHERE m.menu_code=%s AND m.is_active AND (
         a.role_code=(SELECT role_code FROM dc.staff WHERE intg_uid=%s)
         OR a.role_code IN (SELECT u.role_code FROM dc.auth_user u JOIN dc.auth_role r USING(role_code)
              WHERE u.person_uid=%s AND r.is_active
                AND u.valid_from<=now() AND (u.valid_to IS NULL OR u.valid_to>now()))))
```

  - 공고·기업 CRUD·전형 편집 = `menu_code='jobs'`, 지원자 관리·CSV = `menu_code='jobs.4'`.
  - **AUTH0006 은 자동으로 통과하지 않는다** — `system` 메뉴만 부여돼 있다. 이것이 설계가 말한 "명시적으로 허용한 범위"의 실제 구현이며, 총괄에게 열어야 한다면 `menu_auth('jobs','AUTH0006')` 행을 마이그레이션에 **명시적으로** 추가한다(임의로 넣지 않는다).
  - `require_staff` 단독 사용은 금지 — 설계의 판단 유지.
  - 심리·교수·조교는 이 술어에서 자연히 거부된다(부여 없음). 별도 블랙리스트를 만들지 않는다.

### E03 — 취업 게이트를 새로 만들지 말고 `care_gate` 를 나눠 쓴다

- 설계 §4.2-3: "현재 T1~T6 에 대응하는 c1~c6 DONE 존재. 대응은 `careerProcess` 의 구조 매핑과 서버 테스트로 일치시킨다"
- 사실: 그 매핑은 **이미 DB 에 있다** — `dc.student_type_rule.follow_up_test`(`005:3`, `seed.py:115`)이고, `dc.student_type_code` 뷰가 노출한다(`011:8`). 그리고 그 판정을 하는 **서버 함수가 이미 존재한다**: `counsel.py:126 care_gate()` — 최신 `student_type_event` → 유형 → `{'CCORE', follow_up_test}` ⊆ 완료 검사.
- **교정**(`CLAUDE.md` 12조 재생성 금지 · 14조 임시 판정 로직 금지):
  1. `care_gate` 를 **사유를 반환하는 술어**로 분리한다(예: `backend/app/gates.py` 의 `diagnosis_gate(conn, uid) -> (type_row|None, reasons)`).
  2. `counsel.py` 의 `care_gate` 는 그 술어를 감싸 **기존 409 메시지 그대로** 유지한다(상담 도메인의 동작을 바꾸지 않는다 — 기존 pytest 로 회귀 확인).
  3. `jobs.py` 는 그 술어 결과에 **4·5번만** 덧붙인다. `careerProcess.ts` 의 유형→검사 매핑을 파이썬으로 복제하지 않는다.
- 게이트 최종 정의(서버 단일 지점, `GET /jobs/eligibility` 와 신청 트랜잭션이 같은 함수를 호출):

| # | 조건 | 실제 근거 | reason code |
|---|---|---|---|
| 1 | 최신 `dc.student_type_event` 로 확정 유형 존재 | `counsel.py:127-130` | `TYPE_REQUIRED` |
| 2 | `CCORE` 완료 | `diagnosis_attempt.completed_at IS NOT NULL` | `CORE_REQUIRED` |
| 3 | 그 유형의 `follow_up_test` 완료 | `dc.student_type_code.follow_up_test` | `FOLLOWUP_REQUIRED` |
| 4 | 본인의 `counsel_request` 중 `type_code IN ('CAREER','JOB')` **AND** care7 **AND** `status_code='DONE'` | `002:8-11` | `CARE7_REQUIRED` |
| 5 | `dc.roadmap.confirmed=true` | `002:68`, 선례 `counsel.py:252` | `ROADMAP_CONFIRMATION_REQUIRED` |

### E04 — `care_track IS NULL` 을 care7 로 읽어야 한다 (PROCESS 위반)

- 설계 §4.2-4: "일반/general·psych·prof·NULL 을 임의로 care7 로 보정하지 않는다"
- 사실: `PROCESS.md` §2-1 구현규칙 4 는 **"값이 없으면 `care7` 로 읽는다 — 없는 것을 일반으로 떨어뜨리면 이미 상담을 마친 학생의 로드맵이 잠긴다"** 로 확정돼 있다. `spec_v1.md:433` 도 같다. 서버 시드도 이미 그렇게 적재한다(`seed_domains.py:46`).
- **교정**: 읽기 폴백은 **`type_code IN ('CAREER','JOB')` 인 행에만** 적용한다 — `care_track IS NULL` → care7. `PSY`·`PROF` 에는 절대 적용하지 않는다. 신규 API 입력은 여전히 명시 필수(`counsel.py:172`). Oracle 적재 정책(#36)은 별개라는 설계의 단서는 유지한다.
- 설계의 서술은 "PSY/PROF 를 care7 로 보정하지 않는다"는 뜻이었다면 옳지만, **`NULL`까지 배제하면 게이트가 PROCESS 와 어긋난다.** 위 문구로 대체한다.

### E05 — `dc.admin_event` 에 `action`/`target` 컬럼은 없다

- 설계 §5.1: "`dc.admin_event` 의 현재 action/target 제약과 맞는 범위는 재사용하고, 맞지 않으면 … `job_access_event` 를 추가한다"
- 사실: `admin_event(entity, entity_id, before_value NOT NULL 아님/after_value NOT NULL, reason NOT NULL, changed_by, changed_at)` (`009:77-81`). 열람·다운로드 감사를 담을 자리가 없다(before/after 가 없는 사건이고 `reason` 이 NOT NULL 이다).
- **교정**: 조건문을 지우고 **`dc.job_access_event` 신설로 확정**한다.
  `job_access_event(id uuid PK, actor_uid text NOT NULL REFERENCES dc.person, action text NOT NULL CHECK(action IN ('EXPORT_CSV','VIEW_DOCUMENT')), target_kind text NOT NULL, target_id text, filter_hash text NOT NULL, row_count integer NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now())` + `reject_history_change` 트리거 + `GRANT SELECT,INSERT`.
  payload 에 CSV 본문·자소서 본문·학생 PII 를 넣지 않는다(설계 유지). 이는 `DB.md` §8-2 「열람 감사로그 — 현행에 없음, 신설 불가피」에 해당한다.

### E06 — 코드그룹 등록에 `managed_by`·`fixed_codes`·생성열 규약이 빠졌다

- 사실: `dc.code_group` 은 `managed_by CHECK('STRUCTURAL'|'OPERATIONAL')` + `fixed_codes boolean` 을 요구한다(`009:2-7`). 018·019 는 **생성열 + 복합 FK** 로 그룹을 고정한다(`018:38,98` · `019:34,42`).
- **§9 #40 판정(설계가 Opus 에 위임한 항목)**: 현재 존재하는 그룹은 `STUDENT_TYPE`·`COUNSEL_TOPIC`·`DIAGNOSIS_TEST`·`COUNSEL_STATUS`·`COUNSEL_TYPE`·`DIAGNOSIS_FACTOR`·`PROGRAM_*` 5종·`AI_RUN_KIND` 뿐이다. **채용 7그룹과 의미가 겹치는 기존 그룹은 없다**(`JOB_CATEGORY`(직종) ≠ `PROGRAM_CATEGORY`(비교과 분류)). **전부 신설로 확정**한다.
- **교정**: 마이그레이션은 아래로 고정한다(`sort_order` 는 019 의 50 다음인 60 부터).

| group_code | label | managed_by | fixed_codes | 초기 seed 원천 |
|---|---|---|---|---|
| `JOB_COMPANY_TYPE` | 기업 구분 | OPERATIONAL | false | `schema/job.ts:26 COMPANY_TYPES` |
| `JOB_EMPLOYMENT_TYPE` | 근무 형태 | OPERATIONAL | false | `:28 EMPLOYMENT_TYPES` |
| `JOB_CATEGORY` | 직종 | OPERATIONAL | false | `:30 JOB_CATEGORIES` |
| `JOB_CAREER_TYPE` | 경력 구분 | OPERATIONAL | false | `:35 CAREER_TYPES` |
| `JOB_GENDER` | 모집 성별 | OPERATIONAL | false | `:37 GENDERS` |
| `JOB_REGION` | 근무 지역 | OPERATIONAL | false | `:45 REGIONS` (**`전체` 제외** — UI sentinel) |
| `JOB_RESUME_CATEGORY` | 자소서 분야 | OPERATIONAL | false | `resumeMock` 의 `categoryLabel` 값 |

  - `code_item.legacy` 는 **NULL 로 둔다** — 현행 Oracle 값이 미확인이다(`schema/jobApplication.ts:92·124` 가 이미 전부 null). 추측해 채우지 않는다(#17·#20).
  - `job_posting_option` 의 `group_code` 는 `kind` 에서 **생성열**로 만든다(018/019 규약). 별도 CHECK 두 개로 흉내내지 않는다.
    `group_code text GENERATED ALWAYS AS (CASE kind WHEN 'EMPLOYMENT' THEN 'JOB_EMPLOYMENT_TYPE' WHEN 'CATEGORY' THEN 'JOB_CATEGORY' WHEN 'CAREER' THEN 'JOB_CAREER_TYPE' WHEN 'GENDER' THEN 'JOB_GENDER' WHEN 'REGION' THEN 'JOB_REGION' END) STORED` + `FOREIGN KEY(group_code,code) REFERENCES dc.code_item(group_code,code)`.
  - **프론트**: `schema/job.ts` 의 6개 상수 배열은 **제거**하고 `metadataStore` 를 읽는다(`ProgramForm` 선례). `JOB_HIGHLIGHT_TAGS`(`서류면제`)는 표시 규칙이므로 코드가 아니다 — TS 에 남긴다.

### E07 — 구조 코드 컬럼을 근거 없이 nullable 로 두었다

- 설계 §3.1: `recruit_type`·`stored_status`·`deadline_mode`·`posted_at` 을 nullable 로 두고 "LIVE 공고는 필수" 라는 이중 검증층을 둔다.
- 사실: 현재 알려진 **모든** 원천이 이 값을 갖는다 — `jobs.seed.json` 6건 전부 `recruitType`/`status`/`source`/`deadline` 보유(`:13,22,23,33…`), `blankJob()` 도 전부 채운다(`schema/job.ts:128-156`). 값이 없는 행은 **한 건도 없다.** Oracle 대량 이관은 #39 로 막혀 이번 범위 밖이다(설계 §9 D07 스스로 명시).
- **교정**: `source`·`recruit_type`·`stored_status`·`deadline_mode`·`posted_at`·`content_format` 을 **NOT NULL + CHECK** 로 둔다(018 의 `status_code NOT NULL DEFAULT 'RECRUITING' CHECK(...)` 규약). 진짜 nullable 은 `deadline_date`(상시·채용시), `salary_text`, `location_text`, `apply_url`, `email`, `content_html`, `deadline_raw` 뿐이다. `record_origin` 은 유지한다. 미지의 legacy 가 실제로 나타나면 그때 additive 로 완화한다 — 없는 미래를 위해 오늘의 제약을 버리지 않는다.

### E08 — `company_id NOT NULL` 이면 외부 피드 문자열이 기업 사전을 오염시킨다

- 설계 §3.1: `job_posting.company_id FK NOT NULL(검증된 기업으로만 이관)`.
- 사실: 외부 seed 6건은 회사명 문자열뿐이고 기업 실체가 없다. NOT NULL 이면 **가져올 때 6개 회사 행을 만들어야** 한다.
- **교정**: `company_id` 는 **nullable**, `CHECK(source<>'manual' OR company_id IS NOT NULL)`. `company_name_snapshot` 은 항상 NOT NULL. 외부 공고는 이름 스냅샷만 갖고 기업 사전에 자동 등록하지 않는다 — 설계 자신의 "이름만 같은 두 회사 자동 병합 금지"와 일관되고, 조교 「학과 추천기업 관리」가 쓸 사전의 신뢰성을 지킨다.

### E09 — 기업 테이블 이름이 도메인에 갇혀 있다

- 사실: `dc.auth`/menu 에 조교 화면 **`asst-companies`「학과추천기업관리」**(`012:97`)가 이미 있고 `/assistant/companies` 는 `NotReady` 자리표시자다(`src_admin/App.tsx:189`). `DB.md` §9 해소표는 `COM_COMP_INF` 를 **"취업통계·추천용 기업 사전(10.4만)"** 으로 확정했다 — 즉 채용 전용 자산이 아니다.
- **교정**: 테이블 이름을 **`dc.company`** 로 한다(컬럼은 설계안 그대로). 채용 고유 속성은 `job_posting` 에 둔다. 지금 `job_company` 로 만들면 조교 도메인이 두 번째 기업 테이블을 만들게 된다. `COM_CPRT_MEBR`(기업회원)과 합치지 않는다는 설계의 경계는 그대로 유지.

### E10 — CSV 「대학」 열이 학과명 매칭이다 (`CLAUDE.md` 7조 위반)

- 사실: `jobApplicationExport.ts:37` → `collegeOf(major)` → `departments.ts:25` 의 **학과명 Map 조회**. 설계는 "CSV 14열 호환 유지"만 말하고 이 위반의 교정을 명시하지 않았다.
- **교정**:
  - 「대학」은 `dc.department` 를 **`(college_code, dept_code)` 쌍으로 조인**해 얻는다(`programs.py:506` 선례). 학과명 매칭·`deptCode` 단독 매칭 모두 금지.
  - `job_application_attempt` 스냅샷은 `college_code`·`dept_code`·`college_label`·`dept_label` 을 **함께** 저장한다(설계에 이미 있음 — 유지).
  - 코드가 없는 학생은 **빈칸**으로 출력한다. `programs.py:551` 주석대로 현재 학생 대부분이 조직 코드를 갖고 있지 않아 **이 열은 대부분 빈칸이 된다.** 이름으로 유추해 채우지 않는다 — 그것이 이 프로젝트의 대표 부채를 재생산하는 길이다.
  - 직원 목록의 「대학·학과」 필터도 같은 코드 쌍으로 건다.

### E11 — 「채용시 마감」이 저장할 때마다 연장된다

- 사실: `JobForm.tsx:138-149` — 주석은 **"등록일 +1개월"** 인데 코드는 `handleSave` 마다 `new Date()` 기준으로 재계산한다. 제목만 고쳐 저장해도 마감이 한 달 밀린다. 주석과 구현이 어긋난 **버그**다.
- **교정**: 서버는 `deadline_mode='ON_HIRE'` 의 날짜를 **최초 등록 시점(또는 다른 모드→ON_HIRE 전환 시점)** 에 한 번 계산해 `deadline_date` 에 확정하고, 이후 PATCH 로 다시 밀지 않는다. 설계 §4.1 의 "실제 JobForm 계산을 parity test" 는 **버그와의 parity** 이므로 폐기하고, 월말 넘침 규칙(`setMonth(+1)` 의 JS 정규화)만 parity 로 남긴다. 이관된 기존 값은 그대로 보존한다(설계 유지).

### E12 — HTTP 상태 코드: 204 금지는 옳고, 생성 200 은 틀렸다

- 사실: `shared/api.ts:26` 은 **무조건** `response.json()` 을 호출한다. 204 는 파싱 실패로 reject 된다. 기존 도메인은 201/204 를 쓴다(`programs.py:203,234`).
- **교정**: 생성은 **201**(기존 패턴과 동일), 삭제·취소·해제는 **200 + JSON 본문**(`{id,deleted:true}` / `{postingId,saved:false}`). 204 금지는 설계대로 유지. 라우터는 `main.py` 와 동일하게 **`prefix='/api/v1'`** 로 등록한다(설계 §6 의 "기존 `/api` prefix 가 있다면"이라는 조건문은 확정 사실로 대체).
- **범위 밖 관찰(고치지 않음)**: `src_admin/data/programs.ts:125` 의 `removeProgram` 은 204 를 `api()` 로 받아 **현재도 reject 된다.** 비교과 도메인의 잠복 결함이므로 별도 티켓으로 team-lead 에 보고한다.

### E13 — 동의 모델은 jobs 사유물이 아니다

- 설계 §3.4: `job_consent_policy` + `job_application_consent` 신설.
- 사실: `DB.md` §8-2 는 **동의를 「시스템: 공통코드·권한·첨부·동의」 그대로 계승** 항목에 두었고, `spec_v1.md:294` 도 **공통 `dc_consent`** 로 잡아 두었다. 비교과는 이미 `program_apply.consents jsonb` 로 받고 있다(`018:118`).
- **교정**: 도입한다면 이름과 소유를 **공통**으로 한다 — `dc.consent_policy(policy_key, revision, …)` · `dc.consent_receipt(subject_kind, subject_id, policy_id, …)`. jobs 는 `subject_kind='JOB_APPLICATION_ATTEMPT'` 로 참조만 한다. 그래야 비교과의 jsonb 동의도 나중에 같은 모델로 수렴한다. **도입 여부 자체는 업무 결정(§8 Q2)이다.**

### E14 — 소소한 스키마 정리

| 항목 | 교정 |
|---|---|
| `job_stage` 의 `id PK` + `UNIQUE(posting_id,id)` | **`PRIMARY KEY(posting_id,id)`** 하나로 충분하다(`roadmap_item` 선례 `002:81`). 중복 제약을 없앤다 |
| 활성 `position` UNIQUE 부분 인덱스 | 부분 유니크 인덱스는 **DEFERRABLE 이 불가능**하다 → 설계의 "임시 순서 영역" 방식이 필수임을 명시. 대안(제약을 두지 않고 `posting FOR UPDATE` 안에서 연속성 검증)도 허용 |
| `(id,current_attempt_no)` DEFERRABLE FK | 유효하다(`attempt` 의 `UNIQUE(application_id,attempt_no)` 가 있고, `db.py:10` 이 요청당 단일 트랜잭션이다). 유지 |
| 이벤트 `action` 이관 매핑 누락 | 현행 한글 kind(`schema/jobApplication.ts:188`)의 매핑을 명시한다 — `지원`→`APPLY`, `단계이동`→`ADVANCE`, `탈락`→`REJECT`, `최종합격`→`PASS`, `지원취소`→`CANCEL`. 재지원의 두 번째 `지원` 은 `REAPPLY` 로 승격 |
| 학생 상세 게이트 | `src_v2/App.tsx:125` 의 `/jobs/:id` 는 `StageGate` 밖이 맞다(설계 지적 정확). **`/jobs/:id` 에 게이트를 두고, `/mypage/applications`(`:131`)는 게이트 밖으로 유지**한다 — `:133-135` 의 상담 현황 선례("신청이 가능하면 그 조회도 가능해야 한다")와 같은 규칙이다 |

---

## 4. 참조 패턴(비교과) 준수 판정

| 패턴 | 준수 | 판정 |
|---|---|---|
| 생성열 + 복합 FK 로 코드그룹 고정 | ⚠️ | 개념은 맞으나 기법을 명시하지 않음 → **E06 에서 확정** |
| append-only 이벤트 + `reject_history_change` 트리거 + 최소 grant | ✅ | posting/application/attempt/resume 이벤트 모두. 018:141-150 규약과 동일 |
| `version` 낙관적 잠금 + `expectedVersion` 409 | ✅ | 찜·생성 제외 규칙까지 타당 |
| Idempotency-Key(advisory xact lock → 저장응답 → hash 불일치 409) | ✅ | `programs.py:276-287` 와 동형. 재지원마다 새 키 규칙도 옳다 |
| 부모 FOR UPDATE → 자식, join 잠금 대상 한정(`FOR UPDATE OF`) | ✅ | `programs.py:112,260` 규약 계승 |
| 서버 페이징 `{items,totalCount,page,pageSize}` | ✅ | `totalCount` 유지 판단 옳음(spec_v1 §6.1 의 `total` 은 실제와 다름) |
| `staff_student_scope` 권한 SQL | ✅ | 목록·상세·이력·통계·CSV 전부에 동일 술어 요구 — **비교과 통계의 범위 누락(`programs.py:121`)을 계승하지 않겠다는 판단이 이 리뷰의 최대 수확이다** |
| `student_access` 의 "과거 상담 담당" UNION 미계승 | ✅ | `SPEC.md` §2(상담사=담당 단과대)에 부합. 다만 **비교과보다 엄격해지는 의도적 분기**이므로 `05-implementation.md` 에 기록하고 테스트로 고정할 것 |
| 생성 201 / 삭제 204 | ❌ | **E12 에서 교정**(생성 201 유지, 삭제는 200+JSON) |
| 인가 진입점 | ❌ | **E02 에서 교정** |

---

## 5. 미결 #41(파일)의 D01 분리 — 검증

**분리 자체는 정확하다.** 파일 접점 5곳(로고·본문 이미지·공고 첨부·지원 서류·이력서 PDF)을 실제 코드 위치까지 짚었고(`01` §4), 포트폴리오와 텍스트 자소서를 #41 에서 **빼낸** 판단이 옳다 — 전자는 참조이고 후자는 텍스트다. CSV 를 #41 대상에서 뺀 것도 옳다(즉시 생성 Blob).

**「파일에 의존하지 않는 범위」의 독립 구현 가능성 판정:**

| 범위 | 파일 독립? | 근거 |
|---|---|---|
| 기업 사전 · 공고 텍스트/분류/마감 · 전형 편집 | ✅ 완전 독립 | 본문 inline 이미지 쓰기를 거부하면 남는 것은 텍스트뿐. 로고는 DTO 에서 capability=false |
| 찜 | ✅ | 파일 무관 |
| 텍스트 자소서(`job_resume`) | ✅ | §2 의 021 연결까지 포함해 완결 |
| 권한·범위·페이징·통계·CSV | ✅ | 스냅샷 컬럼만 있으면 성립 |
| 지원 **상태 엔진**(전이·회차·이력·멱등·동시성) | ✅ 코드로는 독립 | 합성 데이터로 검증 가능 |
| 지원 **왕복**(학생이 실제로 지원) | ❌ **막힌다** | `PORTFOLIO` → #4 미착수, `RESUME_FILE` → #41 미결. **두 경로 모두 닫혀 있다** |

즉 **D01 의 분리는 정확하지만, 분리 결과로 남는 J2 는 "테스트만 되고 쓸 수 없는 엔진"이다.** 설계는 이를 정직하게 적었으나(§1 J2 비고) 해법을 제시하지 않았다. `DB.md` §8-3 이 채용을 1순위로 놓은 이유가 "공고→지원→상태이력→통계 왕복"인데 그 왕복이 열리지 않으면 이 도메인은 완료로 갈 수 없다. → **§8 Q1**.

---

## 6. D02~D07 재판정 — 진짜 업무 결정인가

| ID | 설계의 분류 | Opus 판정 | 근거 |
|---|---|---|---|
| **D01** #41 | USER_DECISION | **유지 (질문 §8 Q1 에 통합)** | 저장 위치·제공 방식·기존 파일 이관은 문서에 답이 없다. 다만 **질문의 형태를 바꾼다** — "파일을 어떻게 저장할까"가 아니라 "지원 왕복을 무엇으로 열까" |
| **D02** 동의 문안 | USER_DECISION | **유지 (§8 Q2). 단 모델은 교정** | 문안·필수/선택·제공 대상은 지어낼 수 없다. 그러나 ① 모델은 jobs 사유가 아니라 공통(E13) ② "동의 없으면 지원 차단"은 **설계가 스스로 만든 차단**이므로 그 자체를 사용자에게 물어야 한다 |
| **D03** 포트폴리오 provider | DEPENDENCY | **유지 (Q1 에 통합)** | `DB.md` §8-3 #4 미착수가 사실. `INITIAL_*` 를 provider 로 승격하지 않겠다는 판단은 옳다(`portfolio.ts:103` 은 공통 상수이고 학생별 영속 저장이 없다) |
| **D04** UID 없는 legacy 자소서·찜 | USER_DECISION | **❌ 닫는다 — 사용자 질문 아님** | 저장소 조사로 답이 나온다: ① `dc_job_wishlist` 는 `string[]` 에 학생 ID 가 아예 없고(`jobWishlist.ts:9`) ② `dc_user_resumes_v1` 도 마찬가지이며(`resumeMock.ts:51`) ③ `SAVED_RESUMES` r1~r3 는 전 학생 공통 모듈 상수다. **정당한 소유자가 존재하지 않으므로 이관 대상이 아니다.** 결론: **브라우저 localStorage 는 일절 수입하지 않는다.** 다만 **021 이 r1·r2 의 소유자를 이미 지정했으므로 그 두 행만 시드한다**(§2.3-3). r3 는 시드하지 않는다 |
| **D05** 채용시 마감 규칙 | USER_DECISION(변경 요청 시) | **비차단으로 강등 (§8 Q3, 권고안 있음)** | 현행 주석이 "등록일 +1개월"이라 기본값이 정해져 있다. E11 로 버그를 교정하고, 무기한 전환만 선택지로 남긴다 |
| **D06** 탈락 사유 필수화(#21) | 기존 유지 | **✅ 닫는다** | `DB.md` #21 은 열려 있으나 **현재 동작(선택 입력) 유지**로 이번 범위는 완결된다. 질문할 필요 없음 |
| **D07** #17/#18/#20/#39 | 기존 유지 | **✅ 닫는다** | 전부 Oracle 대량 이관 전제이고 이번 범위 밖. 개발 fixture 만 다룬다는 경계가 명확 |

**결과: 사용자에게 올릴 것은 3건(Q1·Q2·Q3)뿐이다.** D04·D06·D07 은 여기서 닫았고, D05 는 권고안 확인 수준으로 낮췄다.

---

## 7. 프로세스 적합성 체크

### 7.1 `PROCESS.md`

| 항목 | 판정 |
|---|---|
| §1 파이프라인 ⑤ 취업지원 = 채용·지원·첨삭 | ✅ 첨삭(사람 `SS_JOB_RES` 워크플로)을 jobs 상태에 섞지 않고 포트폴리오 도메인으로 분리한 것 옳음 |
| §2 게이트 「취업지원 = 진단🔒 상담🔒 로드맵🔒」 | ✅ 서버 게이트로 승격. E03·E04 로 판정 근거 교정 |
| §2 구현규칙 1 «잠긴 UI 는 빈 화면이 아니다» | ⚠️ 설계에 `reasons[{code,message}]` 는 있으나 **"다음 단계 링크"** 요구가 빠졌다 → DTO 의 `reasons` 에 `nextRoute` 를 포함하도록 보완(프론트가 문구를 다시 만들지 않게) |
| §2 구현규칙 2·3 «판정은 데이터층 단일 정책, 함수는 하나» | ✅ E03 의 공유 술어로 강화 |
| §2 구현규칙 4 «care_track NULL = care7» | ❌→교정 (E04) |
| §2-1 «일반/심리/교수 상담은 게이트를 채우지 않는다» | ✅ |
| §9 «진단 판정식을 코드에 고정하지 않는다» | ✅ 설계가 점수·판정식·심리검사를 일절 만들지 않음 |
| 소유권 예외(게이트가 뒤로 닫혀도 본인 이력 열람·취소·자소서 CRUD 허용) | ✅ **승인**. `src_v2/App.tsx:133-135` 의 상담 현황 선례와 동일한 규칙이고, **새 지원은 여전히 게이트를 받는다**는 단서가 있다. 사용자 결정 불필요 |

### 7.2 `CLAUDE.md` 코드 작성 규칙

| 조 | 판정 |
|---|---|
| 2 이벤트 스냅샷 | ✅ attempt 에 시점 학적 스냅샷. 클라이언트 제공 신원 거부(extra forbid) |
| 3 파생값 분리 | ⚠️ `ai_result_ref` 가 위반 → **삭제**(§2.3). `effectiveStatus`·통계를 저장하지 않는 것은 ✅ |
| 4 코드+라벨 분리 | ✅ 한글 이벤트 kind 를 영문 action 으로 교정. E14 에 매핑표 추가 |
| 5 정합성은 애플리케이션(+여기서는 DB 제약까지) | ✅ |
| **7 학과명 매칭 금지** | ❌→교정 (E10) |
| **8 신분코드 리터럴 금지 / `STUDENT_ENROLLED`** | ⚠️ 설계에 학적 필터 언급이 없다. **보완**: 지원 자격·직원 목록의 기본 학적 필터는 `SPEC.md` §7-2 의 재학 집합 상수를 쓰고, 학부 한정 리터럴을 쓰지 않는다. 대학원생의 채용 지원을 코드로 막지 않는다(`SPEC.md` §8) |
| **11 append-only** | ✅ attempt·event·consent·resume_event 전부 트리거 방어 |
| 12 재생성 금지 | ❌→교정 (E03 게이트 중복 구현) |
| **14 임시 판정 로직 금지** | ✅ |

---

## 8. 사용자 결정 질문

> team-lead 는 아래 3개만 사용자에게 전달한다. 나머지는 이 문서에서 닫혔다.

### Q1. (필수) 학생이 실제로 지원할 수 있게 하려면 무엇을 열 것인가

**상황**: 지금 지원에는 제출 서류가 반드시 하나 필요하다(현행 `ReAppD` 계승, `jobApplications.ts:227`). 그 두 가지가 **모두 막혀 있다** — 「드림캐치 포트폴리오」는 포트폴리오 도메인(`DB.md` §8-3 #4)이 미착수라 학생별 영속 저장 자체가 없고, 「개별 이력서 파일」은 파일 저장소 미결(#41)이다. 이대로 승인하면 공고·전형·통계는 만들어지지만 **학생이 지원 버튼을 누를 수 없고, 이관 대장 2번을 완료로 바꿀 수 없다.**

| 선택지 | 내용 | 영향 |
|---|---|---|
| **A (권고)** | **텍스트 자소서 제출 경로를 추가한다.** 이번 설계가 만드는 `job_resume`(학생 소유 텍스트 자소서)를 세 번째 제출 종류 `TEXT_RESUME` 로 인정하고, 지원 시 자소서 1건 + 제출 시점 revision 을 귀속한다 | 파일·포트폴리오 없이 **왕복이 오늘 열린다.** #41·#4 를 건드리지 않는다. 상담사 화면에는 "드림캐치 자소서"로 명시 표시되어 파일과 혼동되지 않는다. 단 **"자소서 텍스트만으로 지원 접수를 인정한다"는 업무 판단**이 필요하다 |
| **B** | **#41 을 지금 결정한다** — ① 바이트 정본(관리 볼륨 / 오브젝트 스토리지) ② 제공 방식(인증 다운로드 API / 단기 signed URL) ③ 확장자·용량 한도·보관·기존 `data:` URL 이관 여부 | 공고 로고·본문 이미지·첨부·지원 파일이 한 번에 열린다. 대신 파일 서비스 설계·구현이 이번 범위에 들어와 일정이 커지고, 검증 항목이 배로 는다 |
| **C** | **포트폴리오 도메인(#4)을 먼저 한다** | 순서를 바꾸는 선택. 채용은 그 뒤로 밀린다 |
| **D** | **지원 없이 J1 만 승인** — 공고·기업·전형·찜·자소서·통계까지만 | 가장 작지만 채용 도메인은 **미완료로 남는다.** 학생 화면의 「지원하기」는 계속 비활성 |

**권고: A.** 이유 — (1) #41·#4 를 열지 않고 이 도메인의 핵심 왕복을 검증할 수 있다, (2) 이번 설계가 어차피 만드는 테이블만 쓴다(새 자산 0), (3) A 를 택해도 B 는 나중에 **추가**로 붙는다(제출 종류가 늘어날 뿐 기존 지원 이력은 그대로), (4) 021 이 이미 그 자소서에 AI 평가를 붙여 두어 화면 흐름이 이어진다.
※ A 를 택하더라도 **텍스트 자소서를 자동 PDF 로 바꿔 「개별 이력서 파일」 요건을 우회하지는 않는다**(설계의 금지 조항 유지).

### Q2. (필수) 지원 시 개인정보 제공 동의를 이번 범위에 넣을 것인가

**상황**: 현행 운영 시스템에는 `ReAgree`(개인정보 동의)가 있고(`SPEC.md` S16), 추천채용은 학생 정보를 **기업에 전달**한다. 우리 UI(`JobApplyModal`)에는 동의 단계가 아직 없다. 설계는 동의 정책/영수증 테이블을 만들고 **"승인된 문안이 없으면 신규 지원을 차단"** 하도록 했다 — 이 차단은 현행에도 우리 UI 에도 없던 것을 설계가 새로 세운 것이다.

| 선택지 | 영향 |
|---|---|
| **A (권고)** | **이번 범위에서 제외.** 지원은 동의 없이 열고, 동의는 **공통 모델(`dc.consent_policy`/`consent_receipt`, `DB.md` §8-2·`spec_v1` §5.1)** 로 후속 도메인에서 붙인다. 지금 단계에서 실제 학생 PII 가 기업으로 나가지 않고(기업 전달은 상담사 오프라인 행위), 비교과도 같은 상태(`program_apply.consents jsonb`)다. 나중에 추가는 additive |
| **B** | **문안을 지금 제공하고 포함.** 필요한 것: 동의 제목·본문·필수/선택 구분·제공 대상(어느 기업에 무엇을) ·보관 기간. 새 UI(동의 화면)도 이번 범위에 들어온다 |
| **C** | 임시 문안으로 진행 | **비권고** — 법적 문구를 지어내면 그대로 운영에 남는다 |

### Q3. (확인) 「채용시 마감」의 기간 규칙

현재 등록 폼은 **저장할 때마다** 마감을 오늘+1개월로 다시 계산한다(제목만 고쳐도 한 달 연장된다). 주석이 밝힌 의도는 "등록일 +1개월"이므로, **버그로 보고 등록 시점 1회 고정으로 교정**했다(E11).

- **A (권고)**: 등록일 +1개월 **고정**. 연장이 필요하면 상담사가 마감일을 직접 수정한다
- **B**: 진짜 "채용 시까지" **무기한**(마감일 없음). 목록 정렬·D-day 표시 규칙을 함께 바꿔야 한다
- **C**: 현행처럼 저장할 때마다 자동 연장(롤링)

---

## 9. `spec_v1.md` 반영 / 변경 / 보류 추적

Astra 의 §12 표를 검증했다. 대부분 정확하며, **아래 4행만 정정·보강**한다.

| 원안 절 | Astra 판정 | Opus 정정 |
|---|---|---|
| §4·§4.1 (SQLAlchemy·`modules/`·`db/migrations`) | 미채택(C04) | ✅ 유지. 실제는 psycopg 평면 모듈 + `backend/migrations/` 이며 `DB.md` §8-4 「DDL 정본은 손으로 쓴 SQL」이 우선 |
| §5.1 «신규 논리 참조는 `SPEC.md` §7-11 FileRef» | 채택 | ✅ 유지. `ownerKind/ownerId/slot` 4종 매핑표는 물리 설계를 선점하지 않아 적절 |
| §5.4 「채용: company, posting, apply, **지원 동의**·상태 이력」 | 신규 설계 | ⚠️ **정정** — 동의는 원안 §5.1 의 **공통 `dc_consent`** 계열이고 `DB.md` §8-2 도 「시스템: 동의」로 계승 분류했다. jobs 사유 테이블로 만들지 않는다(E13). 포함 여부는 Q2 |
| §7·§7.1 게이트 서버화 | 채택 | ⚠️ **정정** — 원안이 말한 단일 `StageAccessPolicy` 는 **이미 `counsel.py:care_gate` 로 일부 구현돼 있다.** 새로 쓰지 말고 나눠 쓴다(E03) |
| §8.1 «비동기 읽기» vs `SPEC.md` §5 동기 selector | C06 로 절충 | ✅ 유지. `programStore.ts` 규약(부팅 적재+동기 selector+async 쓰기)과 일치. 다만 «동기 selector 유지 ≠ 전량 preload» 라는 설계의 단서를 **구현 수용 기준으로 승격**한다 |
| §10 수용 기준 «실제 PostgreSQL 테스트 DB, SQLite 대체 금지» | 채택 | ✅ `conftest.py:9` 의 `_test` 가드 유지 확인 |
| §11 보류 항목 | 분리 | ✅ 유지. 단 **D04 는 이 리뷰에서 닫았다**(§6) |
| — (원안에 없던 것) | — | **추가**: 019~021 AI 산출물은 원안 §10(AI DB 분리)보다 **나중에 실제로 적용된 스키마**이므로 원안·`SPEC.md` §10 보다 우선한다 |

---

## 10. 승인 가능한 최종 범위 (Q1~Q3 답변 후)

아래는 **답변이 오면 그대로 `04-decisions.md` 의 승인 단위가 되는** 범위다. §3 의 교정 14건은 전부 포함된 것으로 본다.

| 묶음 | 포함 | 전제 |
|---|---|---|
| **J1 (무조건 승인 가능)** | `dc.company` · `job_posting`(+option·event) · `job_stage` · `job_wishlist` · `job_resume`(+event, r1·r2 시드) · 코드그룹 7종 · 조회/검색/페이징/통계/CSV · `job_access_event` · 메뉴 기반 인가 · `shared/jobStore.ts` 와 양 SPA 배선 | 없음. 파일 입력은 capability=false |
| **J2 (Q1 답변에 종속)** | `job_application` · `job_application_attempt` · `job_application_event` · 게이트/멱등/동시성/취소/재지원/전형 진행 | Q1 = A 이면 **완전 개방**(제출 종류 `TEXT_RESUME`) / B 이면 파일 설계 선행 / C 이면 #4 선행 / D 이면 **엔진만 만들고 신규 지원 비활성** |
| **J3 파일** | 로고·본문 이미지·공고 첨부·`RESUME_FILE` | Q1=B 또는 후속 #41 결정 |
| **J4 포트폴리오** | `PORTFOLIO` 제출·직원 열람 | `DB.md` #4 provider |
| **동의** | 공통 `dc.consent_policy`/`consent_receipt` 참조 | Q2=B |
| **범위 밖(명시)** | 실제 LLM 호출·AI 읽기 API·사람 첨삭 워크플로(`SS_JOB_RES`)·기업 회원 로그인·Oracle 대량 이관·`SPEC.md` §10 문서 갱신 | — |

**완료 판정 조건**(`_schema.md` 「완료 정의」): `06-verification.md=PASS` **그리고** `DB.md` §8-3 2번 행 갱신. Q1=D 로 승인하면 **완료로 표시할 수 없고** "절반"으로 기록한다.

**구현 시 반드시 남길 증거**(설계 §11 목록에 아래를 추가한다):
1. career 상담사 계정이 `/jobs` 관리 API 를 **통과**하는 테스트(E02 회귀 방지 — 이것이 없으면 전 상담사 403 을 배포 후에 발견한다)
2. `care_gate` 분리 후 **기존 상담 테스트가 그대로 통과**함(E03 이 상담 도메인을 깨지 않았음)
3. `care_track IS NULL` 인 `CAREER` 상담이 게이트를 **연다**는 테스트(E04)
4. 021 의 `ai_run` 2건이 `job_resume` 실제 행을 **가리킨다**는 조인 테스트(§2.3-3)
5. CSV 「대학」 열이 학과명이 아니라 `(college_code,dept_code)` 조인에서 나오고, 코드 없는 학생은 빈칸이라는 테스트(E10)

---

## 11. 범위 밖 관찰 (jobs 에서 고치지 않음 — team-lead 별도 처리)

| # | 내용 | 위치 |
|---|---|---|
| O1 | `removeProgram` 이 204 응답을 `api()` 로 받아 **항상 reject** 된다(성공한 삭제가 실패로 보인다) | `src_admin/data/programs.ts:125` + `shared/api.ts:26` |
| O2 | 비교과 통계 `/programs/statistics` 에 **범위 술어가 없다** — 담당 밖 학생까지 집계된다 | `programs.py:121-134` |
| O3 | `SPEC.md` §10-3 이 AI 결과를 별도 AI DB 로 규정하나 019~021 은 서비스 DB 에 적재했다 | 문서 갱신 필요 |
| O4 | `SPEC.md:467` S16 「지원 경로가 없다」는 현 코드와 불일치(UI 시연은 있고 DB 가 없다) — Astra 지적(C01) 유효 | 문서 갱신 필요 |
| O5 | `departments.ts:22` 의 `BY_DEPT_CODE` 가 **학과코드 단독** Map 이다(`CLAUDE.md` 7조는 (단대,학과) 쌍을 요구) | `src_admin/data/departments.ts` |

---

## 12. 최종 상태

**`NEEDS_USER_DECISION`**

- 기술 오류 **14건**(E01~E14) 및 019~021 미반영 1건은 이 문서에서 **교정 완료** — 사용자에게 묻지 않는다.
- 미결 **D04·D06·D07 은 닫았고**, D05 는 비차단으로 강등했다.
- 남은 사용자 질문은 **Q1(지원 왕복을 무엇으로 열 것인가) · Q2(지원 동의 포함 여부) · Q3(채용시 마감 규칙, 권고안 확인)** 3건이다.
- **`04-decisions.md` 에 `APPROVED` 가 기록되기 전에는 어떤 구현 에이전트도 호출하지 않는다.**
