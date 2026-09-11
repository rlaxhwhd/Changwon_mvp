# 현재 DB 구조 평가 — 2026-09-10

**결론: 도메인 분리와 이력 설계는 양호하지만, 운영 이관 전 데이터 정합성·파생 통계·시드 경계·조회 성능 보강이 필요하다.** 전면 재설계보다 기존 테이블·API를 보강하는 편이 맞다.

작성 역할: Astra DB 설계 리뷰어. 현재 구조에 대한 평가이며 특정 work-order revision의 `ASTRA_APPROVED` 또는 구현 완료 판정이 아니다. 요청 범위에 맞춰 실제 DB는 읽기만 했으며 실행 DDL·API·기존 데이터는 변경하지 않았다.

## 1. 확인 범위와 증거 수준

- 저장소: `backend/migrations/001`~`028`, `DB_SCHEMA.md`, `DB.md`, `spec_v1.md`, 관련 `SPEC.md`·`PROCESS.md`, 골든 패스, API 조회/쓰기 경로, 진단 selector, 테스트 디렉터리.
- 실측 대상: 로컬 Docker `dreamcatch-dev-db`, DB `dreamcatch`, schema `dc`. 모든 SQL은 `BEGIN READ ONLY` 안에서 실행했다. 운영 VPS와 학교 DB는 조사하지 않았다.
- DB의 적용 대장에 001~028이 있고 로컬 파일도 존재한다. checksum 목록은 조회했지만 전체 파일과의 checksum 일치 검증까지 수행하지 않았다.
- 카탈로그 실측: **테이블 77, view 5, index 144(PK/UNIQUE 포함), FK 172, CHECK 139**. 학생 projection은 **120행**이다.
- 아래 CHECK 관련 두 위반 조건과 진단 코멘트 소유자 불일치를 조회한 결과는 모두 **0건**이다. 설계 허점이 곧 현재 데이터 손상을 뜻하지 않는다.
- 부하 시험, `EXPLAIN (ANALYZE, BUFFERS)`, 신규 DB 재구축, backend pytest, 빌드, 화면 QA는 이번 문서 리뷰에서 실행하지 않았다. 과거 검증 기록을 이번 실행 결과로 간주하지 않는다.

## 2. ECC 적용

`find-skills`로 설치 위치를 확인했다. 현재 노출된 로컬 스킬에는 ECC가 없어서 공식 저장소의 다음 문서를 읽어 이번 평가의 기준으로 적용했다. 글로벌 설치나 프로젝트 에이전트 역할 추가는 하지 않았다.

- [postgres-patterns](https://github.com/affaan-m/everything-claude-code/blob/main/skills/postgres-patterns/SKILL.md): 조회 조건과 인덱스, 타입, 정합성 검토.
- [database-migrations](https://github.com/affaan-m/everything-claude-code/blob/main/skills/database-migrations/SKILL.md): 적용된 migration 보존, 데이터 보정과 스키마 변경 분리, 복구·잠금 검토.
- [database-reviewer](https://github.com/affaan-m/everything-claude-code/blob/main/agents/database-reviewer.md): N+1, 소유권, 권한, 동시성 관점의 참고 자료. 별도 에이전트로 실행하지 않았다.

ECC의 일반 권고를 일괄 적용하지 않았다. `intg_uid` 문자열은 학사 식별자 계약이므로 bigint로 바꾸지 않는다. FastAPI가 접근 경계인 현 구조에 Supabase `auth.uid()`를 가져오지 않는다. 모든 FK에 기계적으로 인덱스를 추가하거나 모든 OFFSET을 교체하지 않고 실제 조회와 데이터 규모로 판단한다.

## 3. 테이블 구성

아래는 실측한 77개 테이블의 분류다. 이름 앞의 `dc.`는 생략했다.

| 영역 | 수 | 테이블 |
|---|---:|---|
| 이관 관리 | 3 | schema_migration, seed_source, import_issue |
| 사람·조직·접근 범위 | 10 | person, student, staff, department, fixture_student_scope, org_assignment, auth_role, auth_user, menu, menu_auth |
| 학사·역량·관심 정보 | 12 | skill, subject, curriculum, course_skill, student_course, cert, cert_skill, job_role, job_skill, student_cert, student_job_interest, student_program_history |
| 운영 코드·관리 이력 | 5 | code_group, code_item, code_item_event, metadata_revision, admin_event |
| 상담 | 3 | counsel_request, counsel_record, counsel_event |
| 진단·유형·STAR projection | 8 | diagnosis_attempt, diagnosis_result, diagnosis_comment, diagnosis_nudge, diagnosis_factor_definition, student_type_event, student_type_rule, star_track |
| 비교과·벌점·찜 | 6 | program, program_apply, program_apply_event, penalty_entry, program_wishlist, program_wishlist_event |
| AI 산출물 | 4 | ai_run, ai_comment, ai_suggestion, ai_score |
| 채용·기업·자소서 | 12 | company, job_posting, job_posting_option, job_posting_event, job_stage, job_application, job_application_attempt, job_application_event, job_wishlist, job_resume, job_resume_event, job_access_event |
| 공통 파일 | 1 | file_object |
| 로드맵 | 8 | roadmap, roadmap_axis, roadmap_item, roadmap_item_event, roadmap_snapshot, roadmap_request, roadmap_event, roadmap_request_event |
| 성장 자료 | 4 | growth_profile, growth_entry, growth_event, growth_entry_file |
| 명령 멱등성 | 1 | idempotency |

테이블 수 자체는 과도하지 않다. 현재값, 제출 회차, 사건 이력, 코드, 파일의 생명주기가 달라 분리할 근거가 있다. `growth_entry.content`처럼 종류별 본문만 JSONB이고 소유권·분류·날짜가 컬럼인 구조는 합리적이다. 기존 이력에 원본이 없는 외부 프로그램 참조나 다형 AI 근거를 무조건 FK 누락으로 판정하지 않았다.

## 4. 수정 우선순위

P1은 운영 데이터 이관 또는 규모 확대 전에 우선 해결할 항목, P2는 무결성·성능·검증 보강이다. 현재 120행에서 장애가 발생했다는 의미가 아니다.

### F1 · P1 · 시연 점수 보정이 실제 결과를 덮어쓸 수 있음

근거: `backend/migrations/028_followup_diagnosis_scores.sql:28` 이후의 UPDATE, `backend/app/seed.py`의 migration 파일 재실행.

028은 고정 학생 UID와 검사 종류, JSON 항목 존재 여부로 결과를 선택한다. `source='fixture'`나 fixture 학생 여부, 특정 회차로 제한하지 않는다. 동일 UID의 실데이터가 들어 있는 DB에 적용하면 실제 결과의 factors까지 시연값으로 교체할 수 있다. C4 INSERT도 학생 존재만 확인한다. 주석의 “시연용”은 실행 조건이 아니다.

현재 로컬에서 실제 점수가 손상됐다는 증거는 없다. 위험은 운영 이관 경로다. 시연용 DML을 명시적인 개발 seed 실행으로 분리하고 source·회차·학생 출처를 검증해야 한다. 이미 적용된 028은 수정하지 않는다. 다만 **028 이후 migration만 추가해도 028 실행 시점의 위험이 없어지는 것은 아니다**. 운영 데이터 적재 전에 migration을 완료하는 순서와 기존 데이터 DB의 사전검사를 배포 절차로 고정해야 한다. 복구는 원본/백업과 대조하며 점수를 역추정하지 않는다.

### F2 · P1 · 현재 학생 분류가 초기 JSON 집계에 의존함

근거: `backend/migrations/024_roadmap_operations.sql:295`, `backend/app/students.py:7`.

`dc.student_list.program_count`와 `counsel_count`는 각각 `student.roster`의 `programCount`·`counselCount`를 읽는다. `HIGH`·`CORE` 분류와 관리 통계가 이 값을 사용한다. 상담 완료와 비교과 결과 쓰기는 실제 업무 테이블을 갱신하며 roster 집계를 갱신하는 경로는 확인되지 않았다. 따라서 실적이 늘어도 초기 분류 근거가 유지된다.

현재값이 필요한 분류라면 기존 상담·신청·이수 테이블에서 집계한다. 현행 값이 “특정 기간/이관 시점 실적”이라면 기간과 출처를 명시한 별도 지표로 표현해야 한다. **신청/출석/수료 중 무엇을 세는지, 일반/CARE 7+/교수상담 중 무엇을 포함하는지는 팀장이 업무 의미를 확정해야 한다.** 단순 count로 임의 교체하지 않는다.

### F3 · P2 · 비교과 CHECK 두 개가 NULL을 통과시킴

근거: `backend/migrations/018_program_operations.sql:67`, `:124`. 실제 DB의 `pg_get_constraintdef`와 SELECT 식 평가로 확인했다.

| 제약 | 허용하면 안 되는 조합 | 현재 식 평가 | 교정 방향 |
|---|---|---|---|
| program_entry_needs_types | roadmap_entry=REQUIRED, care_types={} | array_length({},1)이 NULL → CHECK 통과 | `roadmap_entry='NONE' OR cardinality(care_types)>0` |
| apply_points_need_absence | absence_points=1, outcome_code=NULL | false OR NULL → CHECK 통과 | `absence_points=0 OR outcome_code IS NOT DISTINCT FROM 'ABSENT'` |

PostgreSQL CHECK는 false만 거부하고 NULL은 허용한다. [PostgreSQL 제약 문서](https://www.postgresql.org/docs/17/ddl-constraints.html), [배열 함수 문서](https://www.postgresql.org/docs/17/functions-array.html).

현재 위반 데이터는 각각 0건이다. `ProgramBody`와 `OutcomeBody` 검증이 정상 API 경로를 방어하므로 API로 바로 재현되는 결함이라고 단정하지 않는다. DB 직접 적재·후속 서비스에도 정합성을 보장하려면 신규 migration으로 교정해야 한다. 새 제약 추가 → 위반 조사 → VALIDATE → 기존 제약 제거 순서를 설계한다.

### F4 · P1 · 진단 목록 N+1과 초기 이력 테이블의 조회 인덱스 누락

근거: `backend/app/diagnosis.py:68` 이후 loop, `backend/app/students.py:15`, 실제 `pg_indexes` 조회.

진단 목록은 count와 목록 조회 후 **행마다 최신 코멘트 1회 + 최근 권유 1회**를 더 조회한다. 따라서 이 endpoint 본문만 20행에서 42회, 허용 최대 100행에서 202회의 SQL을 실행한다. 인증 쿼리는 별도다. `diagnosis_comment`, `diagnosis_nudge`, `student_type_event`는 실제 DB에 id PK 인덱스만 있다.

8천 명의 유형·진단 조회로 늘면 반복 조회와 이력 정렬 비용이 누적된다. 현재 지연 시간은 측정하지 않았으므로 “느리다”는 실측 판정은 아니다. 페이지 대상 ID를 먼저 결정한 뒤 코멘트·권유를 일괄 조회하거나 인덱스를 사용하는 lateral join으로 합친다.

| 실제 조회 | 인덱스 후보 | 이유 |
|---|---|---|
| 학생 최신 유형 | student_type_event(student_uid, decided_at DESC, id DESC) | 학생별 최신 1건 |
| 응시 최신 코멘트 | diagnosis_comment(attempt_id, created_at DESC, id DESC) | 페이지 장식용 최신 1건 |
| 학생 코멘트 이력 | diagnosis_comment(student_uid, created_at, id) | 상세 응답의 학생별 조회 |
| 학생·검사 최근 권유 | diagnosis_nudge(student_uid, test_id, created_at DESC) | max(created_at) 조회 |

후보를 모두 즉시 생성하는 것이 아니라 대표 데이터의 `EXPLAIN (ANALYZE, BUFFERS)`와 쓰기 비용으로 결정한다. `counsel_event`도 PK만 있으나 현재 이벤트 조회 빈도를 검토한 후 인덱스를 정한다.

### F5 · P2 · 응시와 코멘트의 학생 소유권을 DB가 함께 보장하지 않음

근거: `backend/migrations/015_diagnosis_events.sql:1`, 실제 FK 목록, `backend/app/diagnosis.py`의 댓글 읽기/쓰기.

`diagnosis_comment.attempt_id`와 `student_uid`는 각각 유효한 부모만 검사한다. A 학생 응시와 B 학생 UID를 함께 저장해도 두 FK를 만족한다. 학생 코멘트 조회는 `c.student_uid`를 기준으로 하므로 직접 적재 오류가 잘못된 학생 응답으로 이어질 수 있다. 현재 불일치는 0건이고 정상 API는 응시에서 학생을 가져와 저장한다.

`diagnosis_attempt(id,student_uid)` UNIQUE + 코멘트의 `(attempt_id,student_uid)` 복합 FK로 보강한다. `roadmap_request_event`의 요청/학생도 같은 패턴으로 검토한다. 로드맵·성장에서는 이미 학생을 포함하는 복합 FK를 사용하므로 새 패턴을 도입할 필요가 없다.

### F6 · P2 · 진단 결과와 정의의 연결 키가 변경 가능한 명칭임

근거: `backend/migrations/017_factor_label_management.sql:1`, `028_followup_diagnosis_scores.sql:12`, `src_v2/data/diagnosisResults.ts:47`.

정의에는 안정적인 factor_code가 있고 명칭은 관리자 변경 대상이다. 그런데 028 결과에는 factorCode가 없고 화면이 이름을 대응 키로 사용한다. 이름 불일치로 결과가 표시되지 않는 문제를 점수 payload의 라벨 수정으로 해결한 상태여서, 향후 라벨 변경 시 다시 어긋날 수 있다.

신규 결과에는 검사 코드·정의 버전·factor_code를 보존하고 API/selector도 같은 코드로 연결한다. legacy는 확인 가능한 매핑만 적용하고 원문 라벨을 스냅샷으로 남긴다. 점수나 판정식을 새로 만들어 채우지 않는다. 별도 점수 테이블이 필요한지는 검색·집계·검사 버전 요구가 확정된 후 판단하며, 가변 결과 JSONB 자체를 결함으로 보지는 않는다.

### F7 · P2 · 기존 데이터 위의 migration 경로와 운영 실행기 보강 필요

근거: `backend/migrations/018_program_operations.sql:122`~`:135`, `backend/app/migrate.py:12`~`:25`.

018은 `apply_selected_at` CHECK를 먼저 추가한 뒤 snapshot에서 selection_code와 selected_at을 UPDATE한다. SELECTED인데 snapshot 시각이 NULL인 행은 첫 UPDATE에서 실패하므로 뒤의 `selected_at=applied_at` 보정까지 도달하지 못한다. 빈 DB migration → seed 성공만으로 기존 데이터 업그레이드 안전성을 입증할 수 없다. 신청 시각을 선발 시각으로 대입하는 것도 실제 선발 시각을 안다는 뜻이 아니므로 출처 표기가 필요하다.

실행기는 advisory lock·checksum 검증을 갖춘 점이 좋다. 다만 미적용 파일 전체가 하나의 트랜잭션 안에서 실행되어 잠금이 마지막까지 유지되며 `CREATE INDEX CONCURRENTLY`를 그대로 넣을 수 없다. [PostgreSQL CREATE INDEX](https://www.postgresql.org/docs/17/sql-createindex.html).

운영 전 대표 기존 데이터 업그레이드와 복구 리허설을 추가한다. 신규 테이블의 작은 인덱스는 기존 방식으로 충분하며, 실제로 온라인 인덱스가 필요한 경우에만 별도 실행 모드·실패 복구·적용 기록 계약을 만든다. 이미 적용된 파일을 수정하여 checksum을 우회하지 않는다.

### F8 · P2 · 전용 mock→API 계약 게이트가 아직 비어 있음

근거: `backend/tests/contracts/`에는 README, helper, __init__만 있고 엔티티별 `test_*`가 없다. `assert_same_json_shape`를 엔티티 테스트에서 호출하는 사용처도 확인되지 않았다.

`test_boot_contract.py`와 도메인 동작 테스트는 존재한다. 따라서 “테스트가 없다”가 아니라, AGENTS.md가 요구하는 mock 키·중첩·타입 검증 게이트가 실제로 연결되지 않았다는 평가다. 후속 변경은 기존 비교과·진단 fixture와 API를 연결하는 계약 테스트부터 고정해야 한다.

## 5. 유지할 설계와 보류할 범위

- **채용:** 현재 지원과 제출 회차 분리, current_attempt의 지연 FK, 단계의 공고 범위 복합 FK가 적절하다. 재지원 때문에 과거 제출 자료를 덮어쓰지 않는다.
- **로드맵:** 세대 version과 편집 lock_version을 구분하고 재생성 전 snapshot을 남긴다. 확정 3축×5개 기본 칸을 지연 제약 트리거로 검증하는 것은 좋은 방어다.
- **성장:** 자기신고와 학사 사실을 분리하고 기존 file_object를 재사용한다. 파일 연결 해제 후 재연결도 이전 연결을 남길 수 있다.
- **이력·벌점:** append-only 트리거와 제한된 쓰기 grant, 벌점 원장 합산은 유지한다. AI 표의 ON DELETE CASCADE가 있어도 불변 트리거가 정상 삭제를 막는 구조임을 보존주기 설계에서 고려한다.
- **운영 코드:** 고정 group 생성열 + 복합 FK로 코드 그룹 혼입을 막는 패턴을 유지한다.
- **보안 경계:** 현재 API 권한 검사가 중심이고 fixture_student_scope와 개발 identity가 존재한다. 이것은 `DB.md`에서 인증 미완료로 이미 관리하는 범위다. SSO·실제 역할·동의·민감자료 열람 감사가 없는데 운영 준비 완료로 승격해서는 안 된다. RLS 부재만으로 현 구조가 잘못됐다고 단정하지 않는다.
- **미착수 도메인:** 슬롯 운영, 진단 채점, 공지·알림, STAR 정책은 `DB.md`의 미결과 일치한다. 정책 없이 테이블이나 판정식을 추가하지 않는다.

## 6. 후속 작업과 이번 문서 교정

팀장은 F1/F3/F5의 기술 보강과 F2의 집계 정의를 분리해 revision이 있는 작업지시서를 작성할 수 있다. 신규 번호는 착수 직전 조회한다. 일반 구현은 프로젝트 역할 계약대로 Sol이 맡고, 이번 평가서를 구현 승인으로 대신하지 않는다.

검증은 (1) 시연 seed의 운영 데이터 불변성, (2) NULL/빈 배열 직접 쓰기 거부, (3) 다른 학생 응시 FK 거부, (4) 상담·비교과 변경 후 집계 갱신, (5) 페이지 크기와 무관한 조회 횟수, (6) mock 계약과 기존 데이터 업그레이드/복구를 포함한다. 해당 pytest·계약 테스트·빌드·필요 화면 왕복을 마친 뒤 완료 판정한다.

이번에 직접 교정한 `DB_SCHEMA.md`는 027·028 migration 누락, 학생의 선택적 로드맵/성장 프로필, 응시당 결과 최대 1건, nullable 부모 관계, 학생에 귀속된 로드맵 이력, 프로필 사건도 포함하는 성장 이력 관계다. 실행 스키마를 바꾼 것이 아니라 문서를 DDL에 맞췄다.

---

## 7. 처리 기록 <span>(2026-09-10, 이 문서 접수 후)</span>

| 항목 | 상태 | 무엇을 했나 |
|---|---|---|
| **F1** 시연 DML | **닫힘(앞으로)** | 시연 데이터를 `backend/app/seed_demo.py` 로 분리했다. migrate·seed 어느 쪽도 부르지 않으며 가드 3겹(개발환경·fixture 전용 DB·`--yes`)을 둔다. 이미 적용된 028 은 수정하지 않았다 — **028 실행 시점의 위험은 그대로 남는다.** 운영 데이터 적재 전 사전검사는 여전히 배포 절차의 몫이다 |
| **F3** CHECK NULL 구멍 | **닫힘** | `029_constraint_null_gaps.sql`. NOT VALID → VALIDATE → 옛 제약 제거. 빈 배열·NULL outcome 이 실제로 거부되는 것을 확인했다 |
| **F5** 이력 소유권 | **닫힘** | `030_history_ownership_fk.sql`. 진단 코멘트·로드맵 요청이력에 학생 포함 복합 FK. 남의 응시+내 UID 조합이 거부되는 것을 확인했다 |
| **F4** N+1·인덱스 | **닫힘** | `031_diagnosis_lookup_index.sql` + `diagnosis.py` 일괄 조회. 실측 pageSize 5→4 회, 100→5 회(이전 14/204). 회귀 테스트 2건 추가. `counsel_event` 인덱스는 **넣지 않았다** — 읽기 경로가 없다 |
| **F2** 집계 정의 | **닫힘** | `032_student_list_live_counts.sql`. 팀장 결정(2026-09-10): **상담=완료된 것(status DONE, 진로취업 일반·CARE 7+·심리·교수 네 유형 합산) · 비교과=수료한 것(outcome COMPLETED)**. roster JSON 폴백을 제거했다 |
| **F6** factor_code | **열림** | 미착수 |
| **F7** 기존 데이터 업그레이드 | **열림** | 리허설·운영 실행기 미착수 |
| **F8** 계약 게이트 | **열림** | `backend/tests/contracts/` 여전히 비어 있다 |

### 이 문서가 놓쳤던 것 — 유형이 화면과 서버에서 갈라져 있었다

`dc.student_list.student_type` 은 `roster->>'studentType'` 까지 COALESCE 로 폴백해
**화면에는 119 명이 유형 보유**로 뜬다. 그런데 `gates.py`·`roadmap.py`·`jobs.py` 는
뷰가 아니라 `dc.student_type_event` 를 직접 읽고 거기에는 **8 행뿐이었다.** 즉 명단에
T3 으로 보이는 학생이 상담·로드맵·취업지원에서는 유형 미확정으로 막혔다.

선언값을 이벤트로 승격해 119 명을 맞췄다(`seed_demo.confirm_types`). 유형을 점수에서
계산하지 않았다 — 명단이 이미 말하고 있는 값을 옮겨 적었을 뿐이다(CLAUDE.md 14조).

승격 중 **선언 유형과 실제 응시한 후속검사가 어긋나는 학생 3 명**(roster=T1 인데 c5 응시)을
발견했다. 어느 쪽이 맞는지 알 수 없으므로 **고르지 않고** `import_issue`
(`TYPE_FOLLOWUP_MISMATCH`) 에 기록했다. 임의로 하나를 고르면 그것이 판정 로직이 된다.

### 파이프라인 데이터 적재 <span>(2026-09-10 · `seed_demo.py`)</span>

진단→상담→로드맵→역량개발 각 단계의 **테이블은 다 있었고 데이터가 없었다.** 적재 결과:

| 단계 | 이전 | 이후 |
|---|--:|--:|
| 유형 확정 이벤트 | 8행 / 7명 | **119명** |
| 완료 상담 | 7건 | **171건** (CARE 7+ 91 · 일반 38 · 심리 24 · 교수 18) |
| 상담 기록지 | 5건 | **151건** |
| 확정 로드맵 | 2건 | **23건** (3축·5칸 불변식 위반 0) |
| 종료 비교과 회차 | 0건 | **6건** |
| 비교과 수료 | 0건 | **107건 / 79명** |

**지어내지 않은 것 — 대상이 좁아진 이유다.**

- **로드맵 23건**: `target_role`·`target_company` 가 NOT NULL 인데 우리가 아는 목표 직무는
  roster 가 선언한 33 명분뿐이다. 그중 CARE 7+ 완료 상담이 있는 학생에게만 만들었다.
  목표가 없는 학생에게 목표를 붙이면 데이터가 아니라 창작이다.
- **교수상담 18건**: 학생 120 명 중 117 명이 `dept_code` 가 비어 학과로는 교수를 못 붙인다.
  앱이 실제로 쓰는 담당범위(`staff_student_scope`)로 이었고, 담당 교수가 없는 학생의
  교수상담은 만들지 않았다.

**`CORE` 분류는 여전히 0 명이다 — 결함이 아니라 fixture 의 모양이다.**
`students.py:8` 의 CORE 는 `gpa<2.5 AND program_count>=3 AND counsel_count>=1 AND progress>=60`
이다. 조건을 좁혀 가면 저학점·비 T5·상담 보유까지 6 명이 남는데, **그 6 명 전원이 T1 이고
roster 에 `targetRole` 이 없어 로드맵이 없다** → 이행률 0% → 탈락. CORE 를 채우려면
그 학생들의 목표 직무가 업무 입력으로 들어오거나, `progress>=60` 요건을 다시 봐야 한다.
숫자를 맞추려고 목표를 지어내지 않았다.
