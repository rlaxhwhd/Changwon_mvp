# 로드맵·IAP + 성장활동 — 현행 조사

작성일: 2026-09-09 · 역할: codex-db-architect · 대상: DB.md §8-3의 3번·4번

상태: **DRAFT_FOR_OPUS_REVIEW**

## 1. 조사 범위와 사실의 경계

이번 작업은 구현 전 설계다. 소스·DDL·테스트·마이그레이션은 수정하지 않았다. 운영 DB 접속이나 적용 이력 조회도 수행하지 않았다. **023까지 적용되었다는 것은 사용자 제공 전제**이며, 아래 데이터 수량은 저장소의 DDL·seed 경로와 fixture를 근거로 한다. 구현자는 실제 DB에서 같은 수량·제약·checksum을 별도로 확인해야 한다.

필수 입력인 `AGENTS.md`, `.claude/agents/codex-db-architect.md`, `.ai/interop.md`, `.ai/handoff-db/_schema.md`, **`spec_v1.md` 전체**, **`PROCESS.md` 전체**, **`SPEC.md` 전체**, `DB.md` §8-3~8-7·§9를 읽었다. 추가로 `CLAUDE.md`, `STU_README.md`, `Counsel_README.md`, 실제 백엔드·프론트 연결을 대조했다. 실제 DDL → DB.md의 상태·소유권 → PROCESS의 업무 규칙 → SPEC의 제품 계약 → spec_v1의 설계 원안 순으로 충돌을 판단한다.

참조 구현은 비교과 `018_program_operations.sql`, `programs.py`, `test_programs.py`, `shared/programStore.ts`, `src_admin/data/programs.ts`; 채용 `022_job_operations.sql`, `023_job_seed.sql`, `jobs.py`, `files.py`, `gates.py`, `test_jobs.py`다. AI는 `019_ai_artifacts.sql`·`020_ai_artifact_backfill.sql`·`021_ai_resume_review.sql`을 확인했다. 기존 패턴 중 범용 `require_staff`, 학과명 필터, 전체 페이지 선적재 같은 잔존 문제까지 복제하지는 않는다.

## 2. 핵심 판정

1. **로드맵은 테이블 신설 사업이 아니다.** 현재 계획·축·칸·변경 이력·세대 스냅샷·학생 요청이 이미 존재한다. 빠진 것은 전용 API와 편집 트랜잭션, 근거·권한·상태 계약이다.
2. 전용 로드맵 엔드포인트는 없지만 **간접 DB 조회와 쓰기는 있다**. `students.py`가 학생 프로필에 축·칸을 넣고, `programs.sync_roadmap()`이 비교과 결과로 칸을 갱신한다. seed도 최초 행을 쓴다. “API 0”을 “DB를 아무도 읽거나 쓰지 않는다”로 해석하면 안 된다.
3. `roadmap.version`은 이미 세대 번호다. `roadmap_snapshot UNIQUE(student_uid, version)`과 함께 유지해야 한다. 편집용 잠금 번호를 따로 두되 **generation 컬럼을 추가하지 않는다**.
4. 로컬 생성·override·프로그램 가상 칸·DB 프로필이 섞여 정본이 갈린다. 현재 재생성은 실제 화면의 최종 구성과 완료 상태 전체를 보존하지 못한다.
5. 성장활동에는 학생별 localStorage, 학생별 JSON fixture, 모든 학생에게 공통인 샘플, 메모리에만 있는 상태가 섞여 있다. 이를 모두 “이관할 실적”으로 가져오면 타인의 실적과 가짜 점수가 생긴다.
6. AI 4테이블·STAR·파일·자소서·학사 자격 데이터는 이미 있다. 각 행의 의미와 소유권을 확인한 뒤 재사용해야 하며, 이름이나 `r1` 같은 우연한 ID 일치로 병합할 수 없다.

## 3. 기존 DB의 수용 범위

| 실제 구조와 근거 | 현재 담는 것 | 부족하거나 주의할 것 |
|---|---|---|
| `002_counsel_roadmap.sql:65` `dc.roadmap` | PK `student_uid`, 목표 직무, JSONB 목표 기업, 세대 `version`, `confirmed`, 생성자·시각 | 상담 FK·편집 잠금·확정자/시각 없음. 3상태는 없음. 최종 유형 컬럼을 넣을 이유 없음 |
| 같은 파일 `:71` `roadmap_axis` | PK `(student_uid,axis)`, IAP/CORE/GROWTH, headline/rationale | AI 근거가 일반 text. 축별 버전 없음. 현재 계획의 축만 보유 |
| 같은 파일 `:75` `roadmap_item` | PK `(student_uid,id)`, 축 FK, 위치·제목·우선순위·중요도·why, TODO/DONE, program FK, 편입 구분·만료, 행 `version` | 완료 시각·수료 회차 근거·자동편입 유일성·정렬 유일성 없음. program 있는 칸과 수동 칸의 쓰기 권한은 DB에 표현되지 않음 |
| 같은 파일 `:83` `roadmap_item_event` | actor, before/after JSONB, created_at | append-only. item_id에는 현재 칸 FK가 없으므로 재생성 후에도 보존 가능. 세대·행위·인과 이벤트 식별자 부족 |
| 같은 파일 `:88` `roadmap_snapshot` | UUID, 학생, version, payload, actor, created_at, UQ `(student_uid,version)` | 이미 불변 저장소. 현재 코드가 완전한 payload를 보장하지 않음. 과거 스냅샷을 현행 프로그램 목록으로 재계산하면 안 됨 |
| 같은 파일 `:93` `roadmap_request` | 요청 ID·학생 FK·축·제목·사유·상태·payload·version | axis NOT NULL인데 프론트는 선택값. 상태 코드 FK·처리자/시각·변경 이력·대상 세대·반영한 수정 근거 없음 |
| 같은 파일 `:100`~`:110` | `dc.reject_history_change()` 및 이력 UPDATE/DELETE 거부 트리거, 앱 권한 | 기존 불변 테이블은 수정 backfill 금지. 현재 축·칸 DELETE 권한은 재생성 용도로 이미 존재 |
| `005_student_projection.sql:5` `dc.star_track` | 학생 PK/FK + payload JSONB | 이미 학생별 STAR 레코드가 있다. 전용 API와 AI 분리 없음. 점수·선발·인증의 운영 정책까지 확정된 것은 아님 |
| `005_student_projection.sql:18`·`:25` `student_list` | has_roadmap, 칸 count 기반 이행률 | confirmed·만료와 같은 필터가 아님. roster JSON fallback도 있어 신규 API 집계와 불일치 가능 |
| `019_ai_artifacts.sql:31`~`:87` | ai_run/comment/suggestion/score, 코드그룹 복합 FK, 전부 append-only | run의 subject는 다형 포인터이지 실체 FK가 아님. 신규 로드맵 참조는 소유권·세대 검증을 추가해야 함 |
| `020_ai_artifact_backfill.sql` | 기존 학생 추천은 이미 ACTIVITY_RECO run으로 이관, `model='fixture'` | 성장 추천용 새 AI 테이블·동일 추천 중복 run 불필요. roadmap rationale/why는 아직 미분리 |
| `021_ai_resume_review.sql`, `023_job_seed.sql` | r1→20211304, r2→20196208의 실제 자소서와 평가 연결 | portfolio.ts의 동명 ID 상수는 다른 내용. 기존 연결을 덮어쓰면 안 됨 |
| `022_job_operations.sql:110` 이후 `file_object` | 실제 파일 메타·업로더·소유 종류/ID·slot·삭제 상태·저장 경로 | owner_kind가 채용 전용, slot도 LOGO/ATTACHMENT/RESUME. 재사용하려면 CHECK와 files.py의 소유권 경로 확장이 필요 |
| `001_foundation.sql` `student_cert`, `academic.py:29`·`:52` | 학생-자격 연결, 취득일·번호·verified·added | 현 API의 on/off는 자격 **선택**도 저장한다. 행 존재를 취득/검증으로 간주하면 안 됨. 다회 어학·자기신고 증빙 전체를 담는 그릇도 아님 |

`seed_domains.py:122`~`:134`는 `roadmapAxes`가 있는 학생만 초기 계획을 confirmed=true로 넣는다. 김채원·김창원의 기본 fixture는 각 3축·15칸이다. `roadmapOutcome`은 이 경로에서 생성 결과로 적재하지 않는다. 요청 상태 변환은 대기→REQ, 승인→APPROVED, 반려→REJECTED인데 화면의 **반영완료**와 맞지 않는다. 생성자·상담 ID가 없는 fixture에 최근 상담을 임의 결합하지 않아야 한다.

## 4. localStorage·상수·JSON의 확정 목록

`rg`로 대상 데이터 모듈, `src_v2/pages/growth/` 전체 파일 목록, 실제 소비자와 저장 호출을 추적했다. 요청 저장은 사용자가 지목한 `roadmap.ts` 자체가 아니라 **`roadmapRequests.ts`**에 있다.

| 저장소/소스 | 쓰기·읽기 근거 | 의미와 이관 판단 |
|---|---|---|
| `dc_roadmap` | `roadmapGenerated.ts:24`·`:48`·`:61`, `roadmap.ts:114` 이후 | 학생별 생성된 계획. createdBy가 이름/ID로 혼용되고 targetCompany는 string. DB의 기업 JSONB와 DTO 정규화 필요 |
| `dc_roadmap_snapshots` | `roadmapGenerated.ts:25`·`:69`·`:128` | 브라우저 세대 스냅샷. 누락·동일 세대 충돌 가능, DB 스냅샷을 overwrite하면 안 됨 |
| `dc_roadmap_overrides` | `roadmapOverrides.ts:22`·`:29`·`:128`·`:166` | 축 덩어리 교체, 확정 bool, 별도 편집 version, 메모 history. reset은 수정 이력까지 삭제 |
| `dc_roadmap_requests` | `roadmapRequests.ts:9`·`:16`·`:46`·`:56`·`:84` | 요청 목록 통째 저장, 클라이언트 학생 정보·ID·처리시각. 상태는 대기/반영완료/반려 |
| `dc_growth_portfolio_{studentId}_projects` | `GrowthHome.tsx:57`·`:82` 이후 | 초기 공통 PROJECTS + 학생별 배열, index로 편집/삭제. 프로젝트 실적의 소유권을 확인해야 함 |
| 같은 접두사 `_skills` | 같은 파일 `:13`·`:82` 이후 | 공통 SKILLS + 자기입력 숙련도. 학사/AI 역량 점수와 별개 |
| 같은 접두사 `_qualifications` | 같은 파일 `:35`·`:82` 이후 | 자격·어학 혼합 자유문자열. 취득/검증 사실로 자동 승격 금지 |
| 같은 접두사 `_records` | `growthRecords.ts:11`·`:21`·`:26`, `GrowthHome.tsx:86` | 공통 타임라인을 학생별 저장. “진단 완료/비교과”라고 적혀 있어도 원천 이벤트가 없는 사용자 기록 |
| `cwnu-growth-journal-{studentId}` | `growthJournal.ts:32`·`:35`·`:50` | 학생별 일지 배열 override. seed는 두 학생에만 소유권 있음. numeric ID가 학생 간 중복 가능 |
| `growthJournal.seed.json` | `growthJournal.ts:8`·`:30` | 날짜·분류·STAR 서술·tags·bookmarked·resumeUsed. resumeUsed는 수동 표식이며 실제 채용 제출 이력이 아님 |
| `portfolio.ts`의 INITIAL_* | `portfolio.ts:100`·`:112`·`:118`·`:123`·`:150`·`:171` | **localStorage 없음**. `/mypage/Portfolio.tsx:36`~`:41`의 useState로만 편집, 교직원은 원래 상수 읽음 |
| `buildProfile` | `portfolio.ts:83` | 이름/학번은 학생에서 오지만 연락처·소개문은 합성 기본값. 실제 연락처로 import 금지 |
| `starTrack.seed.json` | `starTrack.ts:15`·`:116`·`:119` | **localStorage 없음**. DB의 star_track 대신 JSON을 읽고 있음 |
| `dc_program_wishlist` | `wishlist.ts:7`·`:11`·`:29`; ProgramApply/ProgramNotice | 성장 화면에서 추가 발견한 미이관 저장소. 학생 ID 없는 공통 키. 자동 소유권 부여 불가 |
| 오늘 미션·퀘스트·미션 로그 상수 | 아래 화면 목록 | 영속 결과/정책 원천이 없음. 브라우저 샘플을 운영 이력으로 적재할 수 없음 |

`GrowthHome.useStoredList()`는 mount 후 effect에서도 초기 샘플을 저장한다(`:68`). 따라서 **학생 접두사 키에 값이 있다는 것만으로 사용자가 직접 작성한 사실이라고 증명되지 않는다**. 명시적인 미리보기·행 단위 선택·소유 확인이 필요한 이유다. 로그인용 `dc_active_student`/`dc_active_staff`는 업무 정본 키가 아니므로 이번 제거 대상과 구분한다.

## 5. 성장 화면 전체의 배선

`src_v2/pages/growth/`는 TSX 11개, CSS 10개다. CSS 10개는 GrowthHome, GrowthJournal, GrowthMissionLog, ProgramApply, ProgramCardGrid, ProgramDetail, ProgramReco, QuestBoard, RoadmapStatus, TodayGrowthMission이다. CSS 검색상 저장/API 경로는 없고 ProgramApply.css의 data-URI 화살표는 데이터 이관 대상이 아니다. `ProgramReco.css`는 독립 화면이 아니다.

| 화면 | 현재 데이터·행동 | 필요한 서버 경계 |
|---|---|---|
| `GrowthHome.tsx:13`~`:86` | 4종 사용자 배열 CRUD, 공통 초기 실적, legacy finalRoadmap/phases | 소유권 있는 항목 API + 현행 3축 요약. 4학년 분기와 별도 XP 숫자를 서버 자격으로 오인하지 않기 |
| `GrowthJournal.tsx` | loadJournalEntries, bookmark 저장, 클라이언트 검색/분류/집계, 고정 키워드 수 | 서버 페이지·SQL 집계·한 행 수정 |
| `GrowthJournalForm.tsx` | max(id)+1, 폼 일괄 배열 저장, desc를 situation으로 만듦 | 서버 ID·expectedVersion·입력 검증. 상황/역할/행동/결과/배움/자소서 메모 유지 |
| `TodayGrowthMission.tsx:24`·`:139` | 단어 10개·전공/NCS 각 3개, 고정 합격 기준, 부분문자열 채점, useState 제출, 고정 달력 | 진단 응시와 구분된 학습 미션 계약 필요. 문제/채점/재응시 정책 승인 전 운영 성취로 저장 금지 |
| `GrowthMissionLog.tsx:42` | 공통 9개 샘플 로그, 화면 필터·페이지·통계 | 실제 소유된 attempt 목록·SQL 요약. 오늘 미션 결과와 현재 연결 없음 |
| `QuestBoard.tsx:96` | 일간/월간/학기 퀘스트, 고정 XP·Lv23·랭킹·연속일, 대부분 이동 링크 | 공식 보상 정책·근거 이벤트 없으므로 계산기/포인트 지급을 새로 만들 수 없음 |
| `RoadmapStatus.tsx:30` | getStudentRoadmap을 학생 ID만으로 useMemo, JS 이행률 | 공통 서버 현재 계획·같은 만료 정책·구독 revision. 변경 후 stale 방지 |
| `ProgramApply.tsx` | 비교과 API 캐시를 JS 필터·페이지, local wish, 학생 추천 + 1.8초 가짜 AI 잠금해제 | 서버 page/filter, 본인 찜, ACTIVITY_RECO 조회. 시간경과를 AI 생성 성공으로 표시하지 않기 |
| `ProgramDetail.tsx` | 프로그램 상세 + async applyToProgram, 서버 성공 후 완료 표시 | 이미 이관된 신청 API 유지. 새 통합 게이트와 회귀 검증만 연결 |
| `ProgramNotice.tsx` | 기존 프로그램 로더, 지원자 배열 수·편입 표시·wish | 글로벌 지원자 수를 scoped 배열 길이로 계산하지 말고 허용된 SQL 요약 사용 |
| `ProgramCardGrid.tsx` | 전달받은 VM 렌더·선택·wish 콜백 | DB 직접 접근 없음. 새 목록 응답에 연결하는 것으로 충분 |

외부 소비자도 함께 전환해야 한다.

- `src_admin/components/StudentDetailView.tsx:35`·`:629`~`:634`: 포트폴리오 탭이 INITIAL_*를 읽는다. 학생이 편집해도 상담사에게 반영되지 않는다. 같은 파일의 성장·STAR 탭도 대상이다.
- `src_admin/data/studentDetail.ts:248`·`:297`·`:335`, `studentRoster.ts:13`·`:15`·`:274`: 계획·요청 수·이행률·STAR 선발을 로컬에서 조립한다.
- `src_admin/data/roadmapProgressStats.ts:214`의 `getRoadmapProgressStats(departments: string[])`도 전환 대상이다. 학과명 배열 필터와 클라이언트 통계 계약을 조직 코드쌍 필터·서버 SQL summary로 바꿔야 한다.
- `StudentDetailView.tsx:84`는 **성장·퀘스트 탭을 심리상담사에게도 노출**한다. 같은 파일 `:504` 이후는 scoreInputs의 고정 성장 수치와 일지를 읽는다. 로드맵·포트폴리오·STAR의 career 제한을 성장 탭 전체에 일괄 복제하면 현행 제한 열람 범위를 바꾸므로, 공유 필드 계약을 별도로 확인해야 한다.
- `src_admin/components/RoadmapCreatePanel.tsx:25`·`:157`~`:164`: 시드 outcome + 타이머, 선택한 목표 이름만 바꾸고 동일 15칸 주입. 실제 서버 생성 성공과 무관하게 완료 콜백 호출.
- `src_admin/components/RoadmapEditorPanel.tsx`: 로컬 clone 전체 저장, 수동 칸의 status 수정·축 문구 편집·칸 추가삭제·reset. 프로그램 칸은 UI에서 잠그지만 서버 제약은 없다. CORE/GROWTH까지 가변 편집 가능하여 고정 5칸 계약과 충돌한다.
- `src_admin/pages/RoadmapCreate.tsx`: 목록에서 StudentDetailModal의 목표 달성 계획으로 진입. 별도 생성 화면/새 UX를 만들 필요가 없다.
- `src_admin/pages/RoadmapRequests.tsx`: 목록 전체·count·상태 변경 후 reload. “편집기 반영” 링크만으로 요청 ID와 실제 수정이 결합되지 않는다.
- 학생 `/roadmap`·`/roadmap/skill-tree`·변경요청 화면, 라운지의 성장기록, 공용 RoadmapAxisBoard·StarRoadmapCard·ResumeSheet도 같은 DTO/cache를 읽어야 한다.
- `src_v2/data/pipeline.ts`: 프론트가 검사·상담 완료를 따로 계산하며 `roadmapConfirmed: hasRoadmap(...)`으로 존재를 확정과 혼동한다.

## 6. 트랜잭션·게이트의 실제 공백

### 6.1 재생성 및 가상 프로그램 칸

`roadmapOverrides.ts`의 base 선택은 학생 roadmapAxes를 generated보다 먼저 사용한다. 생성된 새 계획이 있어도 초기 seed가 우선할 수 있다. `roadmap.ts`의 재생성 snapshot 대상은 generated 저장소이며 base+override+가상 프로그램 칸이 반영된 최종 보드 전체가 아니다. snapshot 추가·새 계획 저장·override 삭제도 하나의 원자적 작업이 아니다.

`roadmap.ts:71` 이후의 programCells는 현재 프로그램 목록·현재 학생 유형으로 `prog-{programId}` 칸을 **조회 때 가상 생성**한다. DB 칸으로 옮기고 이 코드가 남으면 중복된다. 현재 마감은 브라우저에서 프로그램 신청 종료일 문자열 끝에 23:59:59를 붙인다. 서버의 Asia/Seoul 정책과 경계값 계약이 필요하다.

### 6.2 비교과 결과 연동은 이미 지켜지는 규칙

`programs.py:361`의 sync_roadmap은 학생·프로그램이 같은 **현재 칸**을 잠그고 TODO/DONE 및 item.version을 변경한 후 item_event를 남긴다. 결과 처리 `:417`, 신청 제거 `:463`에서 호출한다. **선발·출석은 닫지 않고 outcome=COMPLETED만 닫으며, 수료 철회/취소는 다시 연다.**

하지만 부모 roadmap은 잠그지 않는다. 새 재생성/전체 편집과 동시에 실행하면 구세대 행에 쓰거나 완료를 덮어쓸 수 있다. 프로그램 개설 `:204`, 수정 `:216`은 roadmap_entry/care_types 저장만 하고 DB 칸을 추가하지 않는다. 기존 테스트 `test_programs.py:88`은 칸을 직접 넣고 수료 규칙을 검사한다. 이것은 자동편입이 구현되었다는 증거가 아니다.

### 6.3 상담 근거와 순환 게이트

`counsel.py:253` 부근은 CARE7 완료에 “아무 confirmed roadmap” + 요청 finalType을 검사한 후 `student_type_event`에 유형을 append한다. `gates.py`의 employment_gate도 완료 CARE7와 확정 계획의 **동일 상담 관계**를 확인하지 않는다. roadmap에는 FK가 없어 검사할 수도 없다.

상담사가 생성할 때 완료 상담을 요구하면 상담 완료가 확정 로드맵을 요구하는 조건과 순환한다. 생성·조정은 담당 CARE7 확정 예약/진행 맥락에서, 학생 다음 단계는 상담 완료+확정 이후라는 `spec_v1.md:388`의 규칙을 적용해야 한다. 유형의 정본은 `student_type_event` 그대로다.

### 6.4 프로필 우회 경로

`students.py:18`~`:28`은 confirmed 여부·만료·AI 근거 권한을 구분하지 않고 roadmapAxes를 프로필에 넣는다. `/students/{identity}`의 detail/roster와 bootstrap에도 legacy domain 필드가 남을 수 있다. 전용 API에만 권한을 걸고 이 프로필을 그대로 두면 초안·민감 근거 노출과 이중 정본이 남는다. 기존 집계 view와 프로필 응답도 같은 read service를 사용하거나 대상 필드를 제거해야 한다.

## 7. AI·STAR·파일·포트폴리오 경계

- AI 원문은 불변 산출물, 상담사가 채택한 계획은 운영 상태다. 축 rationale/칸 why의 AI 원문과 사람이 고친 문구를 같은 mutable text로 계속 저장해서는 안 된다. 신규 run/기존 suggestion 참조와 별도 상담사 메모가 필요하다.
- `starTrack.ts:38`·`:95`·`:103`·`:147`의 검사 목록·C-PASS 단계·마일리지/장학 기준은 미결 #29/#30과 연결된다. 기존 payload의 사실을 조회하는 것과 코드의 임시 산식을 공식 판정기로 옮기는 것은 다르다.
- `jobs.py:217`·`:755` 이후는 포트폴리오 capability를 꺼 두고 PORTFOLIO 제출을 503으로 거부한다. 이 범위에서 provider를 설계할 수 있지만, 학생의 현재 편집 내용을 live 참조하는 것으로 제출 완료를 만들면 안 된다. 기존 `job_application_attempt`에 **제출 당시 스냅샷**을 새 attempt insert 시 저장해야 한다.
- `files.py`의 실제 파일 저장을 재사용하되 채용용 owner/slot 검증도 확장해야 한다. 파일 bytes는 DB rollback과 자동으로 같이 복구되지 않는다. 업로드 후 미결합 파일과 제출에 사용된 파일의 생명주기를 구분해야 한다.
- student_cert는 취득 사실과 관심 선택이 섞인 기존 관계다. 같은 자격을 고른 것, 학생이 취득했다고 쓴 것, 학사/기관이 검증한 사실을 서로 덮어쓰지 않아야 한다.

## 8. 확인된 충돌과 설계 인계

| 충돌 | 근거/우선순위 | 설계 처리 |
|---|---|---|
| spec_v1 서두·§7.2의 generation 미구현/신설안 | 실제 roadmap.version·snapshot UQ + 사용자 지시 | 기존 version=세대 유지, 별도 lock_version만 제안 |
| spec_v1의 roadmap 최종 유형 컬럼 | student_type_event가 정본 | 새 현재 유형 컬럼 금지. 스냅샷에 당시 값·event ID를 기록하는 것은 역사적 증거 |
| 2값 confirmed vs 3상태 | PROCESS §6.7·spec_v1 §7.2 | 중간 저장 필요 여부는 USER_DECISION_REQUIRED |
| 상담 근거 요구 vs FK 부재 | spec_v1 §6.2·7.1, 실제 counsel.py | 신규 관계는 composite FK, legacy는 근거 확인 없는 임의 backfill 금지 |
| 초기 3×5·IAP만 증가 vs 임의 칸 편집 | PROCESS §6, EditorPanel | 서버 수량 제약, UI도 동일 capabilities에 맞춤 |
| 수료 vs 문서 일부의 선발 체크 표현 | 사용자 지시·spec_v1 §7.2·완료된 비교과 구현 | COMPLETED만 닫는 규칙 유지 |
| 프로그램 개설 시 전체 대상 편입 vs 조회 가상 칸 | PROCESS §6.4·CLAUDE 이벤트표, programs.py | DB 자동편입 범위를 이번 설계에 포함, 변경·과거 프로그램 재연결은 결정 분리 |
| localStorage 협업 설명 vs DB 전환 완료 도메인 | Counsel_README 과거 설명보다 DB.md 우선 | 두 SPA는 API/DB 공통 정본, 로컬 fallback 금지 |
| 모든 TS 코드 고정 vs 운영 코드 DB화 | DB.md §8-5 | 구조 코드 CHECK+복합 FK, 운영 분류는 DB 코드 |
| SPEC의 과거 별도 AI DB 구상 vs 기존 4테이블 | 실제 019~021·사용자 지시 | 새 AI 저장소/테이블 없음 |
| 성장/포트폴리오 샘플 vs 실제 실적 | 실제 프론트와 DB.md의 provider 미구현 | 자동 seed 복제 금지, 소유권 있는 fixture만 이관 |
| STAR 단계·재응시·연간 재생성·승격 시 편입 | DB.md §9 #29/#30/#31/#33/#37/#38 | 정책을 추정하지 않고 후속 문서 결정 대장에 남김 |

다음 문서 `02-migration-design.md`에 재사용/최소 확장 판정, API·락·이력·권한·이관/롤백·테스트 및 spec_v1 전장 추적표를 정의한다. 이 조사만으로 DB.md §8-3을 완료로 바꾸지 않는다.

**DRAFT_FOR_OPUS_REVIEW**
