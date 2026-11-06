# 0010 프로그램 관리 — 필터·학생 명단 엑셀

상태: 팀장 직접 구현. Astra 리뷰 요청.

## 요구 (2026-11-06 사용자)
`/admin/programs/manage` 에 대분류·소분류·인증여부·회계연도·운영기간·운영상태·상세검색·학생상태 필터.
학생상태는 신청·대기·선발·탈락·취소·수료·미수료·참석·불참(벌점3·2·1점). 「프로그램 등록」 옆에 「그룹 프로그램 등록」 버튼(버튼만).
엑셀은 상단 필터에 맞는 학생 명단. 학생상태 미선택이면 해당 프로그램의 모든 학생. 양식은 `비교과_관리_학생.xlsx` 22칸.

사용자 답변: 인증여부 = 참여 인증서 발급 여부. 신청 = 취소를 뺀 모든 신청자, 대기 = 예비번호 개념. 학생상태를 고르면 프로그램 목록도 좁힌다. 상세검색 = 프로그램명·담당자.

## 재사용 판정
- 목록 필터: 이미 적재된 `getPrograms()` 스토어(신청자 포함)에서 판정. 새 조회 API 없음.
- 엑셀: 휴대전화·이메일·성별이 필요해 `applicant_dto` 에 넣으면 모든 목록 응답에 개인정보가 실린다 → 전용 `POST /programs/export`.
- 시트 쓰기: 기존 `xlsx_export.workbook_sheets`. 상담사 판정: 기존 `is_counselor`.

## 설계
- 158: `dc.program.certificate_issued boolean NOT NULL DEFAULT true` — 기존 프로그램은 등록 화면 기본값인 발급.
- 158: `dc.academic_student_details` 끝에 `hp AS mobile`, `email` 추가(147 과 같은 CREATE OR REPLACE).
- `POST /programs/export` `{programIds, statuses}` — 상담사(career·psych)만, 그 외 403. statuses 가 비면 취소 포함 전체.
- 학생상태 판정은 현재 상태 하나다. 선발 = 선발이면서 결과 없음, 수료·미수료·참석·불참은 결과 기준, 신청만 취소 제외 전체.
  서버 `STUDENT_STATES` 와 프론트 `matchesStudentState` 가 같은 판정이다.
- 선발기준 학년·학적 = 신청 시점 스냅샷. 학적은 스냅샷에 없어 이번에 `studentStatus` 를 더한다. 없는 옛 행은 현재값으로 채운다.
- `certificateIssued` 는 ProgramBody 선택값. 옛 클라이언트가 생략하면 저장값을 유지한다.

## 범위 밖
그룹 프로그램 등록 기능, 엑셀 머리글 굵게·병합(작성기 미지원), 사진의 「엑셀 다운로드(PG)」.

## Astra 리뷰

**판정: 수정 요청** (ASTRA_APPROVED 아님). 158의 DDL 자체는 안전하다. 필수 수정 5건을 반영하면 승인한다. 사용자 확인 1건(「선발」의 의미)은 별도다.
리뷰 시점: 2026-11-06, 작성 중인 `backend/app/programs.py` 와 미적용 상태의 158. 로컬 DB는 157까지 적용돼 있고 158은 트랜잭션 안에서 시험한 뒤 ROLLBACK 했다. 코드 파일은 고치지 않았다.

### 필수 수정

1. **권한 — `is_counselor` 만으로는 부족하다.** `programs.1`(프로그램 관리)의 `menu_auth` 는 `career` 뿐이다. 심리상담사는 이 화면이 없는데도 전 프로그램 학생의 휴대전화·이메일·지원동기를 받을 수 있다(`psych` 4명). `is_counselor(user)` **그리고** `MENU_PREDICATE('programs.1')` 둘 다 요구한다. `academic_students.authorize` 와 같은 방식이다. `is_counselor` 를 빼면 안 된다 — 관리자가 메뉴를 교수에게 열면 담당 범위 없이 전 학생 명단이 나간다. `jobs.py` 는 `programs` 를 import 하지 않아 순환이 없다. 위 설계의 「상담사(career·psych)」 문구도 고친다.
2. **내려받기 기록이 없다.** 연락처가 든 대량 명단인데 누가 언제 받았는지 남지 않는다. 기존 `administration.audit` 로 `dc.admin_event` 에 한 줄 남긴다. 값은 `{programCount, statuses, rowCount}` 만 넣고 학번·연락처는 넣지 않는다. `dc_app` INSERT 권한과 entity CHECK 없음은 확인했다. 새 테이블은 필요 없다. 국립대 공공기관의 다운로드 사유 확인 의무는 기억에 의존한 내용이라 내부관리계획 확인이 필요하다. 사유 입력 UI는 이번 범위에 넣지 않는다.
3. **현재기준 학년·학적과 새 스냅샷의 출처가 틀렸다.** 규칙 1 위반이다.
   - `student_login.py` 는 `dc.student` 를 `ON CONFLICT DO NOTHING` 으로 넣고 `detail` 을 채우지 않는다. 그래서 `s.grade` 는 첫 로그인 값에서 멈추고 `detail->>'enrollmentStatus'` 는 비어 「재학」으로 떨어진다.
   - 로컬 신청자 19행 측정: 학적이 기본값으로 채워진 행 10, 그중 학사상 재학이 아닌 행 2, 학년 불일치 6. 시험 데이터가 섞인 수치지만 원인은 위 코드다.
   - 스냅샷은 더 나쁘다. `insert_application` 의 `studentStatus` 가 틀린 값을 영구히 고정한다.
   - 교정: export 는 `dc.student_login_source`(`hofc_sta_cd`, `stu_schgr`)를 LEFT JOIN 해 ROSTER 와 같은 CASE 로 판정하고, 학사 행이 없는 픽스처만 `detail` 로 대체한다. CASE 는 복사하지 말고 상수로 공유한다. `insert_application` 도 같은 출처로 `grade`·`studentStatus` 를 찍는다(`intg_uid` 인덱스 조회 1건).
   - `applicants_of` 의 `student_status` 도 같은 결함이지만 기존 코드라 이번 범위 밖이다.
4. **`ORDER BY array_position(%s::text[],a.program_id)` 를 바꾼다.** 행마다 배열을 선형 탐색한다. 합성 측정(프로그램 2,000 × 신청 100,000)에서 2.67초였고, `unnest(%s::text[]) WITH ORDINALITY` 조인은 0.21초였다. `JOIN unnest(%s::text[]) WITH ORDINALITY o(id,ord) ON o.id=a.program_id ... ORDER BY o.ord,...` 로 바꾸면 `ANY` 도 함께 빠진다. 목록 전체를 내려받으면 이 크기가 된다.
5. **158의 Rollback 주석이 실행 불가능하다.** `CREATE OR REPLACE VIEW` 는 열을 지울 수 없어 「147 정의로 다시 만든다」는 실패한다. `DROP VIEW` → `CREATE VIEW` → `GRANT SELECT ... TO dc_app` 순서로 적는다(DROP 하면 권한이 사라진다, 의존 객체는 0건). 적용 후에는 체크섬이 잠기므로 **158을 적용하기 전에** 고친다.

### 사용자 확인 1건 — 업무 의미

**「선발」에 수료·미수료·참석·불참까지 된 학생을 포함하는가.** 지금 설계는 결과가 없는 학생만 선발로 본다. 그러면 결과 입력이 끝난 프로그램은 목록에 선발 N명으로 나오는데 필터·엑셀은 0명이다. 선발자 관리(`selectedApplicants`)·`program_application_counts.selected` 는 결과가 있어도 선발로 세고, 엑셀 제목도 「(선발학생) 목록」이다. 사용자 답변은 「신청」만 정의했고 「현재 상태 하나」는 팀장 설계다. 사용자가 포함을 고르면 `'SELECTED'` 조건에서 `outcome_code IS NULL` 만 빼면 되고 스키마 변경은 없다.

### 검토 항목별 판단

**(1) `dc.program` 컬럼 — 안전.**
- PostgreSQL 17이라 상수 기본값 `NOT NULL` 추가는 메타데이터 변경이고 재작성이 없다. `lock_timeout='3s'` 도 유효하다(`migrate.py` 가 한 트랜잭션).
- `dc.program` 을 참조하는 뷰 0건, 열 단위 ACL 0건. 테이블 권한(`dc_app=arwd`)이 새 열을 덮는다. 시험에서 `dc_app` 읽기·UPDATE 권한을 확인했다.
- 앱의 `SELECT p.*` 류 사용도 없다. `WRITABLE` 과 `program_values` 순서, PUT 생략 시 저장값 유지(`certificate_issued` 복원 목록)도 맞다.
- 기존 행이 전부 「발급」이 되는 것은 추정값이다. 이전에 미발급을 고른 값은 저장된 적이 없어 복구할 수 없다. 이관 시 현행 값이 있으면 명시 매핑한다(CURRENT.md 에서 해당 컬럼은 못 찾았다).

**(2) 뷰 확장 — 안전. 응답 누출 없음.**
- 끝에 추가라 `CREATE OR REPLACE` 가 성립하고 ACL 도 유지된다(시험 확인). `academic.v_usr_inf` 는 `hp varchar(40)`, `email varchar(100)` 이고 `dc_app` 의 학사 원본 직접 접근은 여전히 없다.
- 사용처 전수 확인: ROSTER(`academic_students.py`, `employment_report.py` 가 재사용)는 `x.sex_code` 등 열을 지정하고 `to_jsonb(p)` 는 roster 의 지정 열만 본다. `survey.py`, `foreigner` 조회, `backend/scripts` 3개도 열 지정이다. `x.*` 는 없다. 뷰 의존 객체·함수 0건.
- `applicant_dto` 와 `program_apply_event` 에 연락처가 안 들어간다.
- 별도 연락처 뷰는 채택하지 않는다. 앱 역할이 `dc_app` 하나라 DB 권한 분리 효과가 없고, 교직원 쪽 선례(071 `hp AS mobile`)도 있다.
- 학생 92,521행의 `intg_uid` 는 로컬에서 유일하고 인덱스도 있다. UNIQUE 제약은 아니라 원본 중복 시 행이 늘어나는 것은 ROSTER 와 같은 전제다.
- `docs/ACADEMIC_STUDENT_FILTERS_2026-09-21.md` 의 「성별·평점·졸업일만 노출」과 `DB_SCHEMA.md` 를 갱신한다.

**(3) 전용 `POST /programs/export` — 맞는 선택.** 목록 응답에 연락처를 싣지 않고, 선례(`/academic-students/export`)와 같고, 서버 커서·`no-store`·상태 화이트리스트 조립이 적절하다. `ids` 는 `ANY` 또는 조인으로 PK 앞열을 탄다. 권한은 위 필수 1·2를 반영해야 충분하다.

**(4) 판정·스냅샷.**
- `LIVE_APPLY` 는 `program_application_counts` 와 같은 기준이고 `cancelled_at` 없는 관리자 취소도 잡는다. `export_state` 와 필터 판정도 일치한다.
- 「대기」는 `PENDING`(라벨 대기)이다. 심사 전 학생도 포함되고 예비번호 칸은 없다. 양식에 번호 칸이 없으니 그대로 둔다. 실제 번호가 필요해지면 별도 작업이다.
- 「참석·불참」을 결과 기준으로 보는 것은 맞다(벌점 1~3 라벨과 일치). 다만 `attendance_code='NO_SHOW'`(벌점 10)만 있는 학생은 선발로 잡히는데 집계 뷰의 `absent` 에는 들어간다. 숫자가 다를 수 있음을 알고 간다.
- `ABSENT` + 벌점 0은 API가 막지만 CHECK 는 허용한다. 이관 데이터에서 나오면 벌점 필터에 안 잡힌다.
- 옛 행을 현재값으로 메우는 것은 받아들인다. backfill 은 이력을 지어내게 되므로 하지 않는다. 필수 3으로 그 현재값이 학사 기준이 된다.
- 양식 파일이 저장소에 없어 「학적/구분」 값 형식(「재학」인지 「재학/학부」인지)은 대조하지 못했다. 팀장이 원본과 맞춘다.

### 주요 query와 인덱스

| 경로 | 인덱스 |
|---|---|
| `program_apply` 프로그램 목록 필터 | PK `(program_id, student_uid)` 앞열 |
| 학사 연락처·학적 LEFT JOIN | `ix_academic_user_intg_uid` |
| `program_round`, `department` | 각 PK |

새 인덱스는 필요 없다. 상태 조건은 프로그램 단위로 좁힌 뒤 거르는 것이라 부분 인덱스도 불필요하다. 로컬 신청이 19행뿐이라 실행계획 측정은 의미가 없어 하지 않았다.

### 위험·적용 순서

- 순서: 158 → API → web. 새 API는 `PROGRAM_COLUMNS` 가 `certificate_issued` 를 읽어 옛 DB에서 `/programs` 전부가 500이 된다. 옛 API + 새 DB 는 안전하다.
- 트랜잭션이 program·뷰 잠금을 차례로 잡아, `academic_students.detail`(뷰 → program 순서)과 드물게 교착할 수 있다. 전체가 ROLLBACK 되므로 재실행하면 된다.
- 신청자 전체를 `getPrograms()` 에 싣는 재사용은 지금은 괜찮지만 이관 뒤 크기가 커진다. 구현 후 로컬 Docker 측정에서 `/programs` 응답 크기를 함께 본다.

### 테스트 항목

- 권한: career 200 / psych·professor·assistant·admin·학생 403, 비로그인 401.
- 감사: 내려받기 1회에 `admin_event` 1행, 값에 연락처·학번 없음.
- 누출: `/programs`, `/programs/{id}`, `/academic-students`, `/academic-students/{id}` 응답에 `mobile`·`email` 키 없음.
- 상태: 11개 코드 × 취소(`cancelled_at`, 관리자 취소 둘 다)·결과 조합 표를 서버와 `matchesStudentState` 가 공유. 빈 statuses 는 취소 포함, 미지 코드는 422.
- 스냅샷: 학사가 휴학인 학생의 신청에 휴학이 찍히고, 이후 학사가 바뀌어도 선발기준은 그대로, 현재기준만 변경.
- `certificateIssued`: 생성 기본 true, PUT 생략 시 유지, false 저장 후 목록 DTO 반영.
- 엑셀: 22칸 순서, `programIds` 순서 유지, 학사 행 없는 픽스처 학생 누락 없음.

### 실행 순서

1. 158 Rollback 주석 수정(필수 5) — 적용 전.
2. 필수 1·2·3·4 반영.
3. 사용자에게 「선발」 의미 확인, 답에 맞춰 `STUDENT_STATES` 와 프론트 판정 확정.
4. 위 테스트 추가 → 158 적용 → 재리뷰 없이 팀장 검증으로 마감해도 된다(설계 변경이 위 범위를 넘으면 재리뷰).

## 구현 기록

상태: `PASS` — 팀장 직접 구현, Sol 미사용. Astra 필수 수정 5건을 모두 반영했다.
「선발」은 사용자가 「선발된 인원이 1명이라도 있으면 그 프로그램이 나온다」로 정했다. `outcome_code IS NULL` 조건을 뺐다.
158 은 Astra 결과가 오기 전에 로컬에 적용됐다. 주석 수정으로 체크섬이 달라져 로컬 `dc.schema_migration` 의 158 체크섬만 맞췄다. 서버에는 아직 적용 전이다.
양식 원본 대조: 「학적/구분」 값은 「재학」·「졸업」 형식이라 ROSTER 표시명과 같다.
