# 0004 심리상담사 — 작업지시·결정·구현 기록 (팀장 직접, 2026-09-11)

Codex 토큰 소진으로 하네스 없이 팀장이 직접 구현했다(CLAUDE.md 「Codex 토큰이 소진되면 팀장이 직접 구현한다」). Astra 리뷰 없음 — 재리뷰 대상은 §5.

## 1. 요구

사용자: 심리상담사는 별도 로그인 유형이고 사진의 6화면만 필요하다 — 상담스케줄 · 상담현황 · 검사현황 · 포트폴리오 관리(=학생관리) · 상담통계 · **추가 심리상담신청**.
심리검사는 **CARE 7+ 경로와 아예 별개**(자체 설문지 + 상담, 웹은 기록만). 심리상담사는 진로취업 상담 기록을 볼 수 없다.
추가 심리상담신청 = **교수 방식**(학생 신청 없이 상담사가 기록 → 신청 DONE + 기록 한 트랜잭션).

## 2. 결정

| # | 결정 | 이유 |
|---|---|---|
| D1 | **폴더를 만들지 않는다.** psych 는 `src_admin` 안의 역할(`StaffRole`) | 폴더 경계는 뷰포트·셸(학생 모바일 / 교직원 데스크톱)이지 로그인 유형이 아니다. 교수·조교와 같은 방식 |
| D2 | 메뉴 축소는 `dc.menu_auth` 마이그레이션(058) + `navConfig.roles` 동시 | 정본은 `menu_auth`(`GET /metadata` 가 역할별로 거른다). 코드 `roles` 는 같은 사실의 방어선 |
| D3 | 심리검사 = `dc.psych_test_result` 1표, `request_id` UNIQUE FK | 결과 1건 = 심리상담 신청 1건(기존 화면 의미 그대로). 척도는 jsonb(도구마다 다르고 우리가 채점하지 않음). `diagnosis_*` 와 연결 없음 |
| D4 | 추가 심리상담신청 = `POST /counsel-records/psych` — 교수 엔드포인트와 `direct_record()` 공유 | 같은 트랜잭션 모양(신청 DONE·기록·REQUESTED/COMPLETE 이벤트·idempotency). `origin=PSY_RECORD`, `type_code=PSY`, `topic` 자유 텍스트, `topic_code` NULL |
| D5 | psych 발의 기록은 **담당 학과 범위를 묻지 않는다** | 심리상담은 전교 대상(psych 4명 모두 `staff_student_scope` 120명). 기록이 생기면 `student_access` 가 `counsel_request.counselor_uid` 로 열람을 연다 |
| D6 | 심리 신청 처리 모달에서 로드맵 섹션 숨김 | 로드맵은 CARE 7+ 진로 경로의 것. 진단·유형 표시는 그대로(사용자 지시 범위 밖) |

## 3. 구현

| 층 | 파일 |
|---|---|
| SQL | `057_psych_test_result.sql` · `058_psych_menu.sql`(psych 에서 `diagnosis`·`diagnosis.0`·`counsel.3` 제거, `counsel.6` 추가) |
| API | `app/psych_tests.py`(`GET /psych-tests` · `PUT /psych-tests/{requestId}`, psych 전용) · `app/counsel_records.py`(`direct_record` 공용화 + `POST /counsel-records/psych`) · `main.py` 등록 |
| 테스트 | `tests/test_psych.py` 2건 — 발의 기록 DONE·idempotent·career 404/403·학생 403 / 검사 결과 upsert·완료 검증·ETC 검사명·career 403 |
| 프론트 | `data/psychTests.ts`(localStorage → API) · `pages/PsychTests.tsx`(await + 오류 표시, reload 제거) · `pages/PsychCounselRecordNew.tsx`(신규) · `data/counselRequests.ts::addPsychCounselRecord` · `App.tsx` 라우트 · `navConfig.ts` · `bootstrap.ts`(psych 만 `loadPsychTests`) · `CounselRequests.tsx`(D6) |

### 검증 중 발견해 같이 고친 것 (설계 이탈 아님, 기존 결함)

**교직원 상담 투영이 「학생 owner」를 거쳤다.** `src_admin/data/counselRequests.ts::getCounselRequests` 와 `profCounselRequests.ts::allRows` 가 `getCounselOwners()`(= `STUDENTS` 3명 + `counselSeed` 데모)를 평탄화해 만들어져, 로스터 120명 중 상세 프로필이 없는 학생의 신청은 서버가 내려줘도 접수함·일지·통계·교수 접수에서 **조용히 사라졌다**(추가 심리상담신청 첫 저장이 일지에 안 떠서 발견). 두 투영을 `shared/counselStore.counselRequests()` 서버 DTO 직독으로 바꾸고, DTO 타입(`StoredCounselRequest`)에 서버가 이미 보내던 `studentGrade·studentType·studentStatus` 를 올렸다. `getCounselStudentProfile` 은 owner 가 없으면 로스터 경량 행으로 채운다. 소비처 없던 `CounselRequest.studentTrack` 제거.

## 4. 검증

- `npx tsc -b` 통과. pytest `dreamcatch_test`: 122 passed · 2 new · **5 failed 는 전부 `test_roadmap.py`** — 작업 트리의 미커밋 Codex 작업(`roadmap_generator.py` 503 `ROADMAP_GENERATOR_UNAVAILABLE`) 때문이며 이 작업과 무관.
- 브라우저(chrome-devtools, psych_lee): 메뉴 = 홈·상담 관리(접수함·일정·일지·심리검사·통계·추가 심리상담신청)·학생 관리·설정. 추가 심리상담신청 저장 → 일지에 1건(완료) → 심리검사 결과 작성 완료 → 목록 즉시 갱신. 콘솔 오류 0, 실패 요청 0. `career_kim` 의 `/counsel-requests` 에 심리 건 없음, `/psych-tests` 403.
- 부팅 API 27건 중 다수가 500ms~1.1s — API 재기동 직후 콜드 + 병렬 27건 큐잉. 0003 검증 때는 최대 309ms. 변경과 무관하나 재확인 권장.

## 5. Astra 재리뷰 대상

- D5 범위 정책(전교 vs 담당 학과) — 운영 정책 확인 필요.
- `psych_test_result.open_to_student` 를 학생 화면이 아직 읽지 않는다(학생 열람 API 없음).
- `getCounselStudentProfile` 로스터 폴백의 `phone·gpa·language` 는 `—` — 로스터 경량 행에 없다. 모달이 필요로 하면 `/students/{id}` 로 바꿀 것.

## 6. 후속 — 로스터 더미 퇴역 (062, 2026-09-11)

사용자: "로스터 더미는 아예 지우고 … 모든 곳에서 안 나오게". 학생 fixture 는 상세 3명(chaewon·changwon·jiwoo)만 남긴다.

- `backend/seeds/v2/studentsRoster.json`(112) · `students/counselSeedStudents.json`(5) 삭제. `seed.py` 는 상세 3명만 적재하고 `seed_domains.py` 는 없는 학생을 가리키는 시드 행을 세어서 건너뛴다(`skippedRows` 로 보고 — advisorAssigns 14 · counselRecords 1 · diagnosisAttempts 193 · diagnosisResults 164).
- `062_retire_roster_dummies.sql`: `person.source='fixture'` 이고 상세 3명이 아닌 학생과 종속 행 전부 삭제(상담·로드맵·진단·비교과·채용·성장·배정·알림·학사 개인행). append-only 가드 트리거는 이 마이그레이션 안에서만 DISABLE→ENABLE. Codex 가 넣은 `source='local'` 홍길동(060)과 학사 미러(`academic.*` 11만 행)는 건드리지 않는다 — 그래서 DB 재구축이 아니라 마이그레이션으로 했다.
- 테스트 4건을 3명 fixture 에 맞춤: `test_api` 페이징(2+1) · `test_jobs` 게이트 대상(jiwoo) · `test_roadmap` 목록(pageSize 2, 로드맵 있는 학생의 학과) · 집단상담 계약(참여자 비면 members 키 제외).
- 결과: `DC_ROADMAP_PROVIDER=fixture` 로 133 passed. 남은 4 failed 는 Codex 미커밋 테스트 — `test_roster_scaling`(dc_app 에 `fixture_student_scope` INSERT 권한 없음 · 조교 담당 학생이 더미였음) · `test_student_login`(테스트 DB 에 학사 미러 없음). 그쪽 작업에서 정리할 것.
- 브라우저(career_kim): 홈·담당/전체 학생 목록(3명)·접수함·이행률·검사 현황 어디에도 더미 이름 없음, 콘솔 오류 0.
