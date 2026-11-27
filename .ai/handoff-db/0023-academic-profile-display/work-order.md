# 0023 학사 GPA·핵심역량·연락처·주소를 학생 마이페이지와 교직원 학생 상세에 표시

- revision: 3 (rev 1 팀장 작성 2026-11-27 → 〔rev2〕 Astra 교정 2026-11-27, 근거는 `architecture-review.md` → 〔rev3 팀장〕 §3-2-6 GPA 출처 일원화(API 만, DB 불변))
- 상태: **READY_FOR_SOL** — Astra 조건부 승인(`architecture-review.md` §2 필수 조건). migration 180 은 아래 §3-1 〔rev2〕 SQL 그대로만 적용한다
- 사용자 요청(2026-11-27, 원문): 「뷰테이블의 학생들 정보를 토대로 실제 화면에 뿌려줘야해 예를들어 학점 즉, GPA나 역량점수 처럼 말야 지금 admin에서 학생 상세정보 모달에 학점은 나오는데 학생으로 들어가서 마이페이지 보면 없어 또한 휴대폰, 메일, 주소등 정보 다 나와야해」
- 사용자 확정(2026-11-27, AskUserQuestion):
  1. **핵심역량 = 원점수 그대로 + 그래프는 학생 본인 최고 축 기준**(5축 중 최댓값을 바깥 테두리로 — 모양만). 100점 기준 목표선(상위90/중간75/하위60)은 숨긴다. 백분위·임의 100점 환산 금지.
  2. **연락처·주소 = 학생 본인 마이페이지 + 교직원 학생 상세 모달**(그 학생을 볼 권한 있는 교직원만). 엑셀 내보내기에는 넣지 않는다.
- 선행: 0021(176 `dc.academic_student_details`, `academic.dc_v_stu_cap_inf` 적재) · 0022(179 범위).

## 1. 실측 (로컬 Docker, 2026-11-27, ego-browser `C:/Users/njob/ego/academic-profile/round-01.mjs`)

| 항목 | 값 |
|---|---|
| 학생 `20262324` · 역량 보유 재학생 1명(학번 스크래치 파일, 출력 안 함) 마이페이지 `/v2/mypage/portfolio` 「학사 정보」 | 학교·학과·학년·학번·주전공 값 있음, **GPA 미입력** |
| 같은 화면 「연락처」 | **이메일·휴대폰 미입력**, 주소 칸 없음 |
| 메인 `/v2/main`·라운지 `/v2/lounge` 「5대 핵심역량」 | 둘 다 **잠김**(`coreCompetencyScores` null) |
| 화면 API | portfolio 진입 9호출, `/students/:id/portfolio` **2회**(83ms·12ms — 성장 스토어 revision 재조회, 기존 동작) · 콘솔 오류 0 · 실패 0 |
| 상담사 `GET /academic-students/{id}` | 51~56ms, `gpa` 값 있음, 연락처 키 없음 |
| `GET /students/{id}` 프로필 | 14~80ms, `coreCompetencySource=null` |
| 원인 | 포트폴리오 `growth.profile_dto` 는 GPA 를 fixture `detail.gpa` 에서만, 연락처를 자기입력 `growth_profile.contact_*` 에서만 읽는다. 역량은 개발 fixture 만 읽는다 |
| 학사 데이터(학생 106,108명) | 휴대폰 103,034 · 이메일 74,709 · 주소 105,592 · 우편번호 105,108 · 평점 103,108(≤4.5) · 이수학점 103,108(졸업생 중앙 140) |
| `academic.dc_v_stu_cap_inf` | 97,715행 = 19,543명 × CORE ACE1~5, (intg_uid,cap_cd) 중복 0, `cap_score` numeric 0~147(중앙 5~11), `dc_v_cap_inf.max_score` NULL. 재학 880명·졸업 15,277명. **검증용 학생 2명은 0행** |
| 권한 | `dc_app` → `academic.dc_v_stu_cap_inf`·`academic.usr_inf` SELECT **없음**, `dc.academic_student_details` 있음 |
| 인덱스 | `ix_dc_v_stu_cap_inf_intg_uid` 있음. `academic_student_details` 점조회 0.12ms(인덱스) |
| 적재 방식 | `sync_academic.py` 는 대상 표를 `DELETE`+`INSERT`(stage 만 DROP) → 의존 뷰 추가 안전. `academic_student_details` 의존 뷰 0 |
| `ACE1~5` ↔ `dc.core_competency` | 지역형 리더(LOCAL_LEADER)·창의적 사고(CREATIVE)·실용적 융복합(CONVERGENCE)·의사소통(COMMUNICATION)·글로벌(GLOBAL) — 라벨 표기가 달라 이름 매칭 금지, 코드 대응표로 |

## 2. 범위

| 화면 | 이번에 |
|---|---|
| 학생 마이페이지(포트폴리오 「기본 정보」 탭) | 학사 정보에 **GPA(학사)·이수학점**, 연락처에 **휴대폰·이메일(학사)·주소(우편번호+주소)**, 새 칸 **핵심역량(학사 원점수 5개)** |
| 학생 메인·AI라운지 「5대 핵심역량」 그래프 | 학사 원점수로 열림 — 숫자 원점수, 도형은 본인 최고 축 기준, 목표선·「목표 수준」 범례 숨김 |
| 교직원 학생 상세 헤더(학사 상세, `AcademicStudentHeader`) | **휴대폰·이메일·주소** 추가(학점은 이미 있음) |
| 교직원 학생 상세 「역량 GAP」 탭(서비스 학생) | 학사 원점수면 목표 마커·갭 숨기고 원점수 표시 |
| 회사 제출용 포트폴리오 문서 학력 GPA(`apply_academic`) | 학사 평점으로(마이페이지와 같은 값) |
| 엑셀 내보내기·목록 | **불변**(연락처 추가 안 함) |
| 자기입력 연락처(`growth_profile.contact_*`)·회사 제출용 문서의 개인 연락처 | **불변**(학사 값을 자기입력 칸에 복사하지 않는다) |

## 3. 설계

### 3-1. DB — `backend/migrations/180_academic_profile_display.sql` 〔rev2〕

```sql
-- 0023: 학사 GPA·연락처·주소·핵심역량을 화면에(사용자 확정 2026-11-27). Astra 조건부 승인(0023 architecture-review).
-- 롤백(forward-only 관례, 필요 시 수동): ① API 가 post_code·address·새 뷰를 읽지 않게 되돌린다
--   ② DROP VIEW dc.academic_student_core_competency;
--   ③ DROP VIEW dc.academic_student_details; → 176 정의로 CREATE VIEW(열 삭제는 OR REPLACE 불가) → GRANT SELECT ... TO dc_app.
--   ③ 직전에 이 뷰에 의존하는 뷰가 없음을 확인한다(180 시점 0개).
SET LOCAL lock_timeout = '5s';

-- 기존 열 이름·타입·순서 유지, 끝에만 추가(CREATE OR REPLACE 규칙). 의존 뷰 0.
CREATE OR REPLACE VIEW dc.academic_student_details AS
SELECT a.intg_uid, a.sex AS sex_code, a.grade AS academic_gpa, a.out_dt, a.for_yn AS foreigner_code,
       a.hp AS mobile, a.email, a.grad_exp_ym, a.isu_grade, a.curri_year,
       a.post AS post_code, a.addr1 AS address
FROM academic.usr_inf a
WHERE a.user_ty_cd = '0001';

-- 학사 핵심역량 원점수. 100점 환산·목표선 없음(사용자 확정). CORE 만.
-- ACE1~5 ↔ 우리 코드는 학사 cap_nm 으로 확인한 고정 대응(이름 매칭 금지). 바뀌면 같은 열로 CREATE OR REPLACE.
-- 〔rev2〕 쓰지 않는 base_dt(전부 NULL)·upd_dt 는 내지 않는다. 점수 NULL 행은 「점수 없음」이라 내지 않는다.
CREATE VIEW dc.academic_student_core_competency AS
SELECT c.intg_uid AS student_uid, k.code AS competency_code, c.cap_score AS score
FROM academic.dc_v_stu_cap_inf c
JOIN (VALUES ('ACE1','LOCAL_LEADER'),('ACE2','CREATIVE'),('ACE3','CONVERGENCE'),
             ('ACE4','COMMUNICATION'),('ACE5','GLOBAL')) m(cap_cd, code) ON m.cap_cd = c.cap_cd
JOIN dc.core_competency k ON k.code = m.code
WHERE c.cap_div = 'CORE' AND c.cap_score IS NOT NULL;
COMMENT ON VIEW dc.academic_student_core_competency IS
 'Academic DC_V_STU_CAP_INF CORE raw scores (no max, no 0..100 normalization). API must apply student access scope.';
-- security_invoker 는 켜지 않는다 — 소유자 권한으로 academic 을 읽는다(dc_app 은 academic 스키마 권한 없음, 176·178).
REVOKE ALL ON dc.academic_student_core_competency FROM PUBLIC;
GRANT SELECT ON dc.academic_student_core_competency TO dc_app;
```

〔rev2〕 Astra 확인 결과(실측은 `architecture-review.md` §1·§3): ① CREATE OR REPLACE 후 `academic_student_details` ACL `{postgres=…, dc_app=r}` 그대로 — 추가 GRANT 불필요 ② `SET ROLE dc_app` 으로 두 뷰 SELECT 성공(106,108행 / 97,715행·19,543명·5코드), academic 직접 SELECT 는 거부 ③ 점조회 0.04~0.07ms(각 `intg_uid` 인덱스) ④ 1쿼리 추가 = 학생당 0.22ms(현재 `profile()` 학생당 1.78ms 의 +12%) — 수용, 배치화 불요 ⑤ VALUES 유지(우리 코드표에 학사 코드를 섞지 않는다).

### 3-2. API

1. **`students.profile()`** (`backend/app/students.py`) — 개발 fixture 예시(`development_core_competency_score`, fixture 학생만) 분기 **다음**, 개발 누계 분기 **앞**에:
   ```python
   academic=conn.execute('SELECT competency_code,score FROM dc.academic_student_core_competency WHERE student_uid=%s',(row['intg_uid'],)).fetchall()
   scores={r['competency_code']:float(r['score']) for r in academic}
   if len(academic)==5 and len(scores)==5:   # 〔rev2〕 같은 코드 중복(원천 보고형 검사만 있음)이면 그리지 않는다
       data['coreCompetencyScores']=scores
       data['coreCompetencySource']='ACADEMIC'
       return data
   ```
   5행·5코드가 아니면 기존 흐름 그대로(null). 범위는 기존 `/students/{id}`·`/bootstrap/profiles` 접근 검사를 그대로 따른다. 〔rev2〕 `/bootstrap/profiles` 도 학생마다 이 한 쿼리를 그대로 부른다(배치용 별도 경로를 만들지 않는다 — 비용은 review §3).
2. **`growth.resolve_student`**·**`jobs.resolve_student`** 의 학생 SELECT 에 `LEFT JOIN dc.academic_student_details x USING(intg_uid)` 로 〔rev2〕 **`x.academic_gpa, x.isu_grade AS academic_credits` 두 열만** 싣는다. 연락처·주소는 여기 싣지 않는다 — 이 두 함수는 growth·jobs·포트폴리오 30여 경로(교직원 포함)가 공유하므로 학사 개인정보를 필요 없는 요청마다 읽지 않는다. 행 수 불변은 실측(23=23)과 동기화 공개 전 차단 검사(`studentIntgUidDuplicates`·`localIntgUidCollisions`)가 보장한다.
3. **`growth.profile_dto(student, row, owner, contact=None)`** 〔rev2〕:
   - `gpa` = `academic_gpa` 가 있으면 `str(academic_gpa)`(학사 상세 `gpa` 의 `::text` 와 같은 표기), 없으면 `detail.gpa`. `credits` = `academic_credits` 숫자(JSON number), 없으면 null — 본인·교직원 공통.
   - `academic` = `contact` 를 받았을 때만 `{mobile, email, postCode, address}`(빈 문자열은 null), 아니면 `null`.
   - 연락처 조회는 growth.py 의 helper 하나: `SELECT mobile,email,post_code,address FROM dc.academic_student_details WHERE intg_uid=%s`. **`GET …/growth/profile`·`GET …/portfolio` 에서 `owner` 일 때만** 부른다. 교직원 연락처는 학사 상세 헤더(4)로만 연다 — 포트폴리오 projection 의 D06 경계 유지.
   - **`PATCH …/growth/profile` 응답은 `contact` 를 넘기지 않는다(`academic: null`).** 응답이 `dc.idempotency.response` 에 영구 저장되므로 학사 연락처·주소를 그 표에 복사하지 않는다. 화면은 PATCH 응답을 쓰지 않고 `refresh()` 로 다시 읽는다(`shared/growthStore.ts` `saveGrowthProfile`) — 이 동작을 유지한다.
   - 기존 `email`/`phone`(자기입력) 키·의미 불변.
4. **`academic_students` 상세** — 기존 `foreigner_code` 1행 조회를 `SELECT foreigner_code,mobile,email,post_code,address` 로 넓혀(추가 쿼리 없음) `mobile`·`email`·`postCode`·`address` 를 응답에 싣는다(빈 문자열 null). 범위 검사는 0022 그대로(scoped·`staff_may_read`) — 〔rev2〕 이 조회는 범위 검사·`optional` 분기 **뒤**에 둔다(지금 위치). **`ROSTER` CTE 에 연락처 열을 넣지 않는다** — 목록·메타·export 가 같은 CTE 를 쓰므로 그곳에 넣으면 export 가 바뀐다. **export·목록 불변.**
5. **`portfolio_document.apply_academic`** — `gpa = student.get('academic_gpa')` 우선(있으면 `str()`), 없으면 `detail.get('gpa')`. 호출자의 학생은 전부 2의 두 resolve 함수에서 온다(`jobs.lock_portfolio`·`student_portfolio` 의 `owner()`=jobs, 대표 포트폴리오 교직원 열람=growth). 다른 경로가 생기면 같은 JOIN 을 건다.
6. 〔rev3 팀장〕 **`students.profile()` 의 `gpa`** — Astra 판단 항목 1(GPA 출처 두 개) 해소. `dc.student_gpa()` 결과가 `source='legacy_detail'` 이고 `gpa` 가 null 일 때만 `SELECT academic_gpa FROM dc.academic_student_details WHERE intg_uid=%s` 로 채우고 `gpaSource='academic'`. 정책 활성(`course_weighted:*`)·`course_data_incomplete` 는 그대로 둔다. **DB 객체 변경 없음**(`dc.student_gpa()` 불변, Astra 승인 뷰만 사용) — 상담 처리 모달 「성적」·서비스 학생 헤더 「학점」이 마이페이지와 같은 값이 된다. `dc.student_list`(목록 뷰)의 `gpa` 는 이번 범위 밖(뷰 변경 필요). `gpaSource` 를 읽는 화면은 없다(grep). 테스트: fixture 의 `detail.gpa` 학생은 기존 값·`legacy_detail` 유지, detail 없는 학사 학생은 학사 평점·`academic`.

### 3-3. 프론트

1. **`src_v2/data/competency.ts`** — `CompetencyAxisView` 에 `plot`(0~100, 그리기용) 추가, `target`·`gap` 은 `number | null`.
   - `coreCompetencySource==='ACADEMIC'`: `peak = max(점수들)`, `plot = peak>0 ? score/peak*100 : 0`, `target=null`, `gap=null`, `score` 는 원점수.
   - 그 외(개발 fixture 0~100): `plot=score`, target·gap 기존 그대로.
   - `getCompetencyOverall` 은 기존(평균) 유지 — 호출자 확인.
   - `StudentData` 에 `coreCompetencySource` 는 이미 있다.
2. **`CompetencyRadarChart`** — 현재 면은 `plot`, 목표 면은 모든 축 `target!=null` 일 때만. aria-label 은 `score`(원점수).
3. **`Main.tsx`** 역량 카드 — 막대 `--value` 는 `plot`, 숫자는 원점수(소수 둘째 자리까지, 뒤 0 제거), 목표선 없으면 「목표 수준」 범례 숨김. 학사일 때 짧은 안내 한 줄: 「학사 핵심역량 원점수 · 그래프는 내 가장 높은 역량 기준」.
4. **`AiLounge.tsx`** — 차트 컴포넌트만 바뀌면 된다(목표 면 자동 숨김).
5. **`src_admin` 「역량 GAP」(`GapTab`·`studentDetail.getCompetencyRadar`)** — target null 이면 목표 마커·범례·갭 숨기고 원점수 표시, 막대 폭은 `plot`. `weakest` 는 gap null 이면 `plot` 최소 축.
6. **`Portfolio.tsx`·`src_v2/data/portfolio.ts`·`shared/growthStore.ts`(타입)**
   - 학사 정보: GPA(`n / 4.5`), **이수학점**(`n학점`) 추가.
   - 〔rev2〕 `academic`·`credits` 는 GET 응답에만 값이 있다(PATCH 응답의 `academic` 은 null) — 타입은 `… | null`, 화면은 PATCH 응답으로 상태를 덮지 않는다.
   - 연락처 패널: 휴대폰·이메일 = 학사 값 우선, 없으면 자기입력. **주소**(`(우편번호) 주소`) 추가. 출처 문구 「학사 기록에서 가져옵니다. 회사마다 다른 연락처는 회사 제출용 포트폴리오에서 바꿀 수 있습니다.」
   - **자기소개 저장(`saveIntro`)은 자기입력 원값(`dto.profile.email/phone`)을 그대로 돌려보낸다** — 학사 값을 자기입력 칸에 써 넣지 않는다.
   - 새 패널 「핵심역량」: 학생 프로필(메인과 같은 스토어 셀렉터)의 `getCompetencyAxes` 로 5개 원점수 목록. 없으면 `Empty`「학사 핵심역량 점수가 아직 없습니다」. 출처 문구 「학사 기록(교과·비교과 이수 누계)에서 가져옵니다.」
7. **`src_admin` `AcademicStudentHeader`·`AcademicStudentDetail` 타입** — 휴대폰·이메일·주소(없으면 「없음」).
8. 디자인 토큰·기존 클래스만 쓴다(새 팔레트 금지).

## 4. 계약 테스트 (`backend/tests/test_academic_profile_display.py`)

1. `dc_app` 역할로 두 뷰 SELECT 성공(`SET ROLE dc_app` — 소유자 계정이 아니라 앱 계정으로), `academic_student_details` 신규 열 `post_code`·`address` 존재·기존 10열 이름/순서 불변, 새 뷰 열은 정확히 `student_uid, competency_code, score`, `competency_code` 집합 ⊆ `dc.core_competency.code`.
2. 학사 cap 5행 학생 → `/students/{id}` `coreCompetencySource='ACADEMIC'`, 5키, 값 = 원점수(float). cap 0행 → null. fixture 개발 예시 학생은 기존 `DEVELOPMENT_CARE7_TEST` 유지(`test_care7_test_student`·`test_competency_examples` 무수정 통과 — 해당 fixture 학번은 학사 cap 0행 확인).
3. 4행만 있는 학생 → null(부분 점수로 그리지 않는다). 〔rev2〕 같은 코드 2행 + 나머지 3코드(5행·4코드) → null. `cap_score` NULL 행은 뷰에서 빠져 4행 → null.
4. 학생 본인 `GET /students/{id}/growth/profile`·`/portfolio` → `gpa`(학사, 문자열)·`credits`(number)·`academic.{mobile,email,postCode,address}`; 교직원 → `gpa`·`credits` 있음, `academic` null; 자기입력 `email/phone` 불변.
5. 자기소개 PATCH 후 `growth_profile.contact_*` 에 학사 값이 들어가지 않는다. 〔rev2〕 PATCH 응답 `profile.academic` 은 null 이고, 그 요청의 `dc.idempotency.response` 에 학사 휴대폰·이메일·주소 문자열이 없다.
6. 상담사·범위 안 교수 `GET /academic-students/{id}` → 연락처·주소; 범위 밖 교수 404(0022 그대로); export 열·목록 항목 키에 연락처·주소 없음(키 집합 0022 §5 와 동일).
7. 회사 제출용 포트폴리오 문서 education GPA = 학사 평점(학생 본인 GET·교직원 대표 포트폴리오 열람 두 경로).
8. 학사 값이 빈 문자열이면 null 로 나간다.
9. 〔rev2〕 JSON 계약: `/students/{id}` 키 집합 불변(값만), `coreCompetencySource ∈ {null,'DEVELOPMENT_CARE7_TEST','ACADEMIC'}`; growth profile 키 = 기존 키 + `credits`·`academic` 두 개만 추가.
10. 〔rev3 팀장〕 `/students/{id}` `gpa`: detail 없는 학사 학생 → 학사 평점 문자열·`gpaSource='academic'`; fixture `detail.gpa` 학생 → 기존 값·`legacy_detail`; 정책 활성 시 기존 `test_gpa_policy` 무수정 통과.

## 5. 검증(팀장)

- `npx tsc -b`, 대상 테스트, 격리 전체 회귀(기준선 10 실패 집합 동일).
- ego-browser `round-02`: 같은 두 학생 + 상담사 상세 — GPA·이수학점·휴대폰·이메일·주소 「값」, 역량 보유 학생 메인·라운지 그래프 열림·「목표 수준」 범례 없음·숫자 5개, 20262324 는 잠김 유지(빈 화면 아님), 마이페이지 핵심역량 패널, 콘솔 0·실패 0, 호출 수 불변(추가 API 없음), 응답 시간 비교.
- 〔rev2〕 상담사 `/bootstrap/profiles` 응답 시간 전후 비교(학생당 +0.2ms 수준 예상, +15% 넘으면 보고). 로컬 Docker API 는 `dc_app` 계정으로 두 뷰를 읽는지 확인(소유자 계정 실행 금지).
- 학생 값은 로그·문서·출력에 남기지 않는다(칸 blank/value 만).
