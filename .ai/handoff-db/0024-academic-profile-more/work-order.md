# 0024 학사 졸업예정·입학·이수학기·생년월일·집전화·다전공을 학생 마이페이지와 교직원 학생 상세에 표시

작성: 팀장(Claude Code Opus), 2026-11-27. 상태: **ASTRA_APPROVED (조건부) — revision 2** 〔Astra〕 2026-11-27. 필수 조건은 `architecture-review.md` §2. 교정한 곳은 〔Astra〕 표시. 마이그레이션은 아직 어떤 DB 에도 적용하지 않았다(리뷰는 롤백 트랜잭션 안에서만 측정).

사용자 지시(2026-11-27): 「뷰테이블에 있는 학사정보 다 연동되어야 하거든 어느정돈 됐는데 프로필 사진, 예상졸업년월(있는지 모름)등등 연결해줘」.
선택(AskUserQuestion): **졸업예정·입학·이수학기 / 다전공 / 생년월일·집전화** 세 묶음. 트랙·교육과정 연도는 고르지 않았다 → 범위 밖.
**증명사진은 범위 밖** — `PHOTO` 는 「학번_n.jpg」 파일명뿐이고 이미지 위치·접근 방식이 없다(전산원 확인 요청 #5 미회신, 현행 소스는 이 PC에 없음). 사용자가 경로를 찾아 알려 주기로 함. 파일명을 응답에 싣지 않는다.

**〔팀장 rev3〕 소유 분담(2026-11-27, 동시 작업 세션 `changwon-mvp-main-53` 과 합의):** 그 세션이 사용자 지시로 교직원 학생상세 모달을 현행 포트폴리오처럼 재배치 중이다(인적사항 표·「기본사항」 탭·주전공 `majorName`·`graduationExpectedMonth`). 그래서
- **교직원 화면(`StudentDetailView.tsx/.css`, `src_admin/data/academicStudents.ts` 타입)은 그 세션이 소유한다** — 0024 는 이 파일들을 고치지 않는다. §3-3 의 교직원 헤더 항목은 그 세션이 0024 응답 키를 읽어 그린다.
- **`majorName`(주전공)은 그 세션의 변경·커밋이다** — Astra 필수 조건 5 는 (b)의 변형: 0024 범위에 넣지 않고, 0024 커밋에도 섞지 않는다.
- 0024 는 그 세션이 4개 파일을 dev 에 커밋한 **뒤** 그 위에서 `academic_students.py` `detail()` 만 고친다(공유 함수 사용·`grad_exp_ym` 별도 파싱 제거·응답 키 6개). 그 전에는 181·`growth.py`·학생 마이페이지·테스트만 진행한다.
- 〔팀장 rev4〕 그 세션이 dev `6779c96` 으로 4개 파일을 커밋하고 사용권을 넘겼다. 그 세션의 화면은 인적사항 표(성명·학번 / 주소 / 생년월일·성별 / 핸드폰·이메일, 생년월일은 `birthDate` 를 점 표기로)와 「기본사항」 탭(단과대학·학부/학과 / 전공·학년 / 학적·졸업(예정)년도 / 평균평점·외국인)이다. 나머지 키는 그 세션이 그리지 않으므로 **0024 2단계가 그 레이아웃 위에 최소로 더한다**: 인적사항 표에 「집전화」, 기본사항 탭에 「입학일」「이수학기」 1행과 「다전공」(span) 1행 — 기존 `InfoCell`·`sdv-info-table` 패턴, 새 CSS 클래스·색 없음. `academicStudents.ts` 에 5키 추가, `birthDate?` 의 `?` 제거. §3-3 의 「`AcademicStudentHeader` 에 칸 추가」 지시는 이것으로 대체한다. 다전공 span 행은 `InfoCell` 의 `span`(colSpan 3)을 쓴다 — `shared/tableAlignment.css` 가 모든 td 를 `!important` 로 가운데 맞추므로, td 를 직접 만들면 `dc-cell-long` 을 붙여 왼쪽 정렬한다(그 세션 안내).

공개 범위는 0023 학사 연락처와 같다(사용자 확정 2026-11-27, 다시 묻지 않음): **학생 본인 GET + 그 학생을 볼 권한이 범위 검사로 확인된 교직원의 학사 상세. 엑셀·목록·ROSTER·resolve 함수·PATCH 응답·멱등 저장에는 넣지 않는다.**

## 1. 실측 (로컬 DB, 2026-11-27, 집계만 — 학생 값 미출력)

재학생(`user_ty_cd='0001' AND hofc_sta_cd IN('0001','0002')`) 11,138명 기준.

| 원천 열 (`academic.usr_inf` = `DC_V_USR_INF`) | 채움 | 형태 | 비고 |
|---|---|---|---|
| `grad_exp_ym` | 753 | `YYYYMM` (현재 전부 202702) | 4학년 750·5학년 3. 졸업사정 등록자만(haksa.md: 최신 차수 졸업 판정) — **비면 「없음」이 정상** |
| `enter_dt` | 11,138 | `YYYYMMDD` | 입학일 |
| `isu_smt_cnt` | 11,138 | numeric | 이수 학기 수 |
| `age` | 11,138 | `YYYYMMDD` | **이름은 age 지만 생년월일**(DB_VIEW_REQUEST: 생년월일=AGE) |
| `tel` | 8,839 | 문자 | 집전화 |
| `photo` | 11,012 | `99999999_9.jpg` | **이번 범위 밖** |

다전공 `academic.dc_v_usr_major_inf`(`intg_uid, major_type, major_seq, major_cd, major_stat, curri_year`): 23,133행 / 16,890명, 재학생 1,572명. 학생당 최대 17행. `(intg_uid,major_type,major_seq)` 중복 0. `major_cd` 23,133행 전부 `academic.dc_v_major_inf.major_code`(782행, 유일)와 조인됨. 주전공은 이 뷰에 없다.
코드 라벨 `academic.dc_v_code_inf(code_grp,code,code_nm,sort_no,use_yn,upd_dt)`:
- `MAJOR_TYPE` 1=복수전공 2=부전공 3=융합전공 4=연계전공 5=융합전공 6=마이크로디그리 7=USG공유대학 융합전공 8=나노디그리 9=학생설계전공
- `MAJOR_STAT` 01=승인 02=이수 중 03=이수 완료 04=취소 05=포기 06=이수 실패. 원천에 `major_stat` NULL 행 있음(3,903행).

〔Astra〕 추가 실측(2026-11-27, 집계만):
- 인덱스는 176 이 이미 만들었다 — `ix_dc_v_usr_major_inf_intg_uid(intg_uid)`·`ix_dc_v_code_inf_code(code_grp,code)`·`ix_dc_v_major_inf_major_code(major_code)`. **새 인덱스 불필요.** sync 는 테이블을 DELETE+INSERT(같은 트랜잭션, MVCC)로 채우므로 인덱스는 그대로 남고 공개 후 ANALYZE 된다.
- `(code_grp,code)` 중복 0·`major_code` 중복 0 은 **현재 값일 뿐 보장이 아니다** — `sync_academic.py` 에서 `codeKeyDuplicates`·`majorCodeDuplicates`·`usrMajorKeyDuplicates` 는 보고형(`REPORT_CHECKS`)이고 차단 검사가 아니다. → §3-1-2 를 LATERAL LIMIT 1 로 교정.
- `major_stat` NULL 은 현재 4,035행(유형 1·2·4·5·6). 비NULL 상태·유형·전공 코드는 전부 라벨과 조인된다. `MAJOR_TYPE 9`(학생설계전공)는 `use_yn<>'Y'` 이나 원천 행 0.
- `(intg_uid, major_seq)` 중복 2,755쌍 — 같은 순번에 유형이 다른 행이 흔하다. 정렬은 `major_seq, type_code` 두 열이 필요하다.
- `dc_v_usr_major_inf` 의 uid 는 16,890명 **전부 학생(`user_ty_cd='0001'`)**, `local_usr_inf`(로컬 테스트 학생 7명) uid 는 0 — 테스트 학생 `20262324`·`20243003` 은 다전공 `[]` 가 정상. 재학·휴학생 학생당 다전공 중앙값 1·p99 4·최대 9.
- 새 원천 열 품질(학생 106,108행): `age`·`enter_dt` 전부 유효한 8자리 날짜(출생 1934~2010, 미래 0), `isu_smt_cnt` 음수·소수 0(최대 30), `grad_exp_ym` 형식 위반 0·빈 문자열 0, **`tel` 공백만 115행**(빈 문자열 0) → API 는 strip 후 빈 값이면 `None`.

화면 실측 기준선: 0023 검증(`.ai/handoff-db/0023-academic-profile-display/verification.md` §3, ego `round-02.mjs`·`round-03.mjs`) 이후 해당 화면·API 변경 없음 → 그 「후」 값이 이번 「전」이다. 마이페이지 진입 호출 9회, 상담사 학사 상세 API 53~79ms, 포트폴리오 응답 8.3KB(20262324).
**이번 설계는 새 API 호출을 만들지 않는다** — 기존 `GET …/portfolio`(본인)·`GET …/growth/profile`(본인)·`GET /academic-students/{id}`(교직원 상세) 응답에 필드만 더한다.

## 2. 범위

| 화면 | 추가 |
|---|---|
| 학생 마이페이지 `/v2/mypage` 「학사 정보」 패널 | 생년월일 · 입학일 · 이수학기 · 졸업예정 · 다전공(목록) |
| 학생 마이페이지 「연락처」 패널 | 집전화 |
| 교직원 학생상세 모달 헤더(`AcademicStudentHeader`) | 생년월일 · 입학일 · 이수학기 · 졸업예정 · 집전화 · 다전공 |

범위 밖: 사진, 트랙, 교육과정 연도, 엑셀 내보내기, 학사 학생 목록, 포트폴리오 문서(회사 제출용)·채용 지원 스냅샷.

## 3. 설계

### 3-1. DB — `backend/migrations/181_academic_profile_more.sql`

1. `CREATE OR REPLACE VIEW dc.academic_student_details` — 180 정의의 열 이름·타입·순서를 그대로 두고 **끝에만** 추가:
   `a.enter_dt AS admission_date, a.isu_smt_cnt AS completed_semesters, a.age AS birth_date, a.tel AS home_phone`.
   원값 그대로(문자열 가공은 API 한 곳). WHERE 불변. 기존 GRANT 유지 확인.
   〔Astra〕 롤백 트랜잭션에서 실측: OR REPLACE 성공, 기존 12열 이름·타입·순서 동일, ACL `dc_app=SELECT` 유지, `dc_app` 으로 4열 SELECT 성공. 파일 첫 줄에 `SET LOCAL lock_timeout = '5s';`(180 관례 — 이 뷰를 읽는 명단 엑셀·설문·학사 목록이 AccessExclusive 를 잠깐 기다린다).
2. 새 뷰 `dc.academic_student_majors` — 〔Astra〕 코드·전공명 조인은 **LATERAL LIMIT 1** 로 고정한다(유일성이 sync 차단 검사로 보장되지 않음, §1 추가 실측). 원천 행 1개 = 뷰 행 1개가 구조로 보장된다:
   ```sql
   CREATE VIEW dc.academic_student_majors AS
   SELECT u.intg_uid AS student_uid, u.major_seq, u.major_type AS type_code, t.code_nm AS type_label,
          u.major_cd AS major_code, m.major_name, u.major_stat AS status_code, s.code_nm AS status_label
   FROM academic.dc_v_usr_major_inf u
   LEFT JOIN LATERAL (SELECT x.major_name FROM academic.dc_v_major_inf x
                      WHERE x.major_code = u.major_cd
                      ORDER BY x.major_name LIMIT 1) m ON true
   LEFT JOIN LATERAL (SELECT x.code_nm FROM academic.dc_v_code_inf x
                      WHERE x.code_grp = 'MAJOR_TYPE' AND x.code = u.major_type
                      ORDER BY x.use_yn = 'Y' DESC, x.sort_no NULLS LAST, x.code_nm LIMIT 1) t ON true
   LEFT JOIN LATERAL (SELECT x.code_nm FROM academic.dc_v_code_inf x
                      WHERE x.code_grp = 'MAJOR_STAT' AND x.code = u.major_stat
                      ORDER BY x.use_yn = 'Y' DESC, x.sort_no NULLS LAST, x.code_nm LIMIT 1) s ON true;
   COMMENT ON VIEW dc.academic_student_majors IS
    'Academic DC_V_USR_MAJOR_INF double/minor/convergence majors with labels; one row per source row. API must apply student access scope.';
   REVOKE ALL ON dc.academic_student_majors FROM PUBLIC;
   GRANT SELECT ON dc.academic_student_majors TO dc_app;
   ```
   - 학생 신분 제한은 하지 않는다. 〔Astra〕 판단: **반결합 불필요** — 원천 uid 16,890명 전부 학생이고, 호출자는 학생·범위 검사를 통과한 uid 로만 점조회한다. 180 `academic_student_core_competency` 도 같은 형태다. 대신 COMMENT 와 §3-2 의 「호출처 2곳 한정」으로 막는다.
   - 상태 전체(취소·포기·이수 실패 포함)를 낸다 — 학사 원값을 숨기지 않고 상태 라벨로 구분한다. 정렬은 `major_seq, type_code`(같은 순번 2,755쌍이라 두 열 모두 필요).
   - 〔Astra〕 측정(롤백 트랜잭션, jit=off, 최다 17행 학생): 원안 LEFT JOIN 1.08ms(782행 `dc_v_major_inf` 순차 해시) → LATERAL 0.20ms(세 조인 모두 인덱스 점조회, generic plan 0.21ms 동일). 행 0 학생 0.05ms. 뷰 전체 행 수 23,133 = 원천과 동일, 라벨 NULL 0.
   - `security_invoker` 끔(소유자 권한, 180 관례 — `dc_app` 은 academic 스키마 권한이 없다). `dc_app` SELECT 실측 성공.
   - 인덱스: 〔Astra〕 이미 있음(176) — 추가하지 않는다. academic 스키마 인덱스를 이 migration 에서 만들지 않는다(소유는 176·sync).
3. 롤백 주석: API 원복 → `DROP VIEW dc.academic_student_majors` → details 는 **180 정의(12열)** 로 `DROP VIEW` → `CREATE VIEW` → `GRANT SELECT ON dc.academic_student_details TO dc_app`(열 삭제는 OR REPLACE 불가). DROP 직전 의존 뷰 0 확인. 〔Astra〕 롤백 주석에 180 정의 SQL 을 그대로 적어 둔다.

### 3-2. API

공통 가공 함수 1개 — 두 엔드포인트가 같은 함수를 쓴다(복제 금지).
〔Astra〕 위치·모양 확정: `growth.py` 의 기존 `academic_contact(conn, uid)` 를 **넓혀** 이 함수 하나가 학사 연락처(0023) + 이번 6필드를 **한 SQL 문**으로 읽고 가공한 dict 를 돌려준다(행 없으면 `None`). `academic_students.py` 는 `from .growth import academic_contact` 로 재사용한다(growth 는 academic_students 를 import 하지 않아 순환 없음). `student_contact.py` 는 「연락 퍼널」 집계 모듈이라 두지 않는다. 다전공은 상관 서브쿼리 `jsonb_agg(... ORDER BY major_seq, type_code)` 로 같은 문장에 싣는다 — 상세당 쿼리 수 **+0**(기존 1행 점조회를 넓힘), 두 뷰를 한 스냅샷으로 읽어 sync 공개와 엇갈린 조합이 나오지 않는다. 실측 0.3ms(최다 17행 학생, dc_app). 모양:
```sql
SELECT d.foreigner_code, d.mobile, d.email, d.post_code, d.address, d.grad_exp_ym,
       d.admission_date, d.completed_semesters, d.birth_date, d.home_phone,
       (SELECT coalesce(jsonb_agg(jsonb_build_object('typeCode', m.type_code, 'typeLabel', m.type_label,
                 'majorCode', m.major_code, 'majorName', m.major_name, 'statusLabel', m.status_label)
               ORDER BY m.major_seq, m.type_code), '[]'::jsonb)
        FROM dc.academic_student_majors m WHERE m.student_uid = d.intg_uid) AS majors
FROM dc.academic_student_details d WHERE d.intg_uid = %s
```
가공 규칙(Python, 이 함수 안에서만):
- `birthDate`: `birth_date` 가 유효한 `YYYYMMDD` 날짜(`date(y,m,d)` 성공)면 `YYYY-MM-DD`, 아니면 `None`.
- `admissionDate`: `admission_date` 같은 규칙.
- 〔Astra〕 `graduationExpectedMonth`(키 이름 교정 — 작업 트리의 미커밋 `academic_students.py`·`src_admin/data/academicStudents.ts` 가 이미 이 이름을 쓴다. `expectedGraduationMonth` 와 두 이름이 생기지 않게 한다): `grad_exp_ym` 이 `^\d{4}(0[1-9]|1[0-2])$` 이면 `YYYY-MM`, 아니면 `None`. 미커밋 `detail()` 안의 같은 파싱은 지우고 이 함수 값을 쓴다.
- `completedSemesters`: 정수값이면 `int`, `None`·소수는 `None`.
- `homePhone`: 〔Astra〕 `strip()` 후 빈 값이면 `None`(공백만 115행 실측). 0023 의 `mobile·email·postCode·address` 도 같은 함수에서 같은 `or None` 규칙 유지(동작 불변).
- `majors`: `[{typeLabel, majorName, statusLabel}]` — `typeLabel = type_label or type_code`, 〔Astra〕 `majorName = major_name or major_code`(전공 마스터에 없는 코드도 빈 칸이 되지 않게), `statusLabel` 은 라벨 없으면 `None`(원천 NULL 4,035행). 행이 없으면 `[]`. 코드 키(`typeCode`·`majorCode`)는 SQL 에서만 쓰고 응답에 내지 않는다.
- `foreigner`(Y/N→bool, 그 밖 `None`)도 같은 dict 에서 만들되 **교직원 상세만** 쓴다.

1. `growth.py`
   - `academic_contact(conn, uid)` = 위 공통 함수. 여전히 **본인 GET(`/growth/profile`·`/portfolio`)에서만** 부른다(호출처 2곳 불변).
   - `profile_dto(...)['academic']` 는 〔Astra〕 **명시한 키 10개만** 고른다: `mobile, email, postCode, address`(0023) + `homePhone, birthDate, admissionDate, completedSemesters, graduationExpectedMonth, majors`. dict 를 통째로 펼치지 않는다(`foreigner` 가 학생 응답에 새지 않게). `owner` 가 아니거나 PATCH 응답이면 지금처럼 `academic=None`(멱등 저장 금지 유지).
2. `academic_students.py` `detail()` — 범위 검사·`optional` 분기 **뒤** 기존 `details` 점조회를 공통 함수 호출 하나로 바꾼다(쿼리 수 +0). 응답에 `homePhone, birthDate, admissionDate, completedSemesters, graduationExpectedMonth, majors` 추가(기존 `foreigner, mobile, email, postCode, address` 값·키 불변). **ROSTER·목록·export·메타 불변.**
   - 〔Astra〕 작업 트리의 미커밋 변경(`majorName` 주전공 점조회 = `dc.academic_people ⋈ dc.academic_organizations(lvl='3')`, `graduationExpectedMonth`)은 이 지시서 §2 범위에 없다. 팀장이 **둘 중 하나**를 정한다: (a) 0024 범위에 「주전공명」을 명시 편입 — §2 표·§3-3·§4 테스트(값·없음 `None`·목록/export 키 불변)에 넣고 Sol 이 같은 커밋으로 다룬다(실측: lvl 3 `dept_cd` 중복 0/750, 점조회 1개 추가 수용), 또는 (b) Sol 착수 전에 되돌린다. 승인·테스트 없는 필드가 섞여 커밋되지 않게 한다.
3. `resolve_student`(growth·jobs)·`jobs.apply`·`portfolio_document`·`students.profile`·`/bootstrap/profiles`·`programs.py` 명단 엑셀·`survey.py` 는 건드리지 않는다. 〔Astra〕 `dc.academic_student_details` 를 `x.*`/`SELECT *` 로 읽는 곳이 없음을 확인했다(전부 열 명시) — 새 열이 기존 export·스냅샷에 새지 않는다. 새 코드도 `SELECT *` 를 쓰지 않는다.

### 3-3. 프론트

- `shared/growthStore.ts`: `academic` 타입에 6필드.
- `src_v2/data/portfolio.ts`: 뷰모델에 `birthDate, admissionDate, completedSemesters`(「n학기」), `expectedGraduation`, `homePhone`, `majors`(문자열 배열 「복수전공 경영학과 · 이수 중」) — 빈 값은 `''`/`[]`.
- `src_v2/pages/mypage/Portfolio.tsx`: 「학사 정보」에 생년월일·입학일·이수학기·졸업예정·다전공(없으면 기존 `Value` 빈 표시와 동일), 「연락처」에 집전화. 학사 값은 보기 전용(`fa-lock`) — 자기입력·저장 경로에 넣지 않는다.
- `src_admin/data/academicStudents.ts`: 타입 6필드. 〔Astra〕 졸업예정 키는 `graduationExpectedMonth`(미커밋 타입과 같은 이름, 학생 `growthStore` 도 같은 이름).
- `src_admin/components/StudentDetailView.tsx` `AcademicStudentHeader`: 생년월일·입학일·이수학기·졸업예정·집전화·다전공 칸. 기존 「졸업년월」(졸업생 `out_dt`)은 그대로 두고 「졸업예정」을 별도 칸으로. 다전공은 여러 개면 한 칸에 「·」로 잇고 `title` 에 전체. `StudentDetailView.css` 그리드가 1280px 에서 깨지지 않게만 조정. 새 색·폰트 금지(DESIGN.md 토큰).

## 4. 계약 테스트 — `backend/tests/test_academic_profile_display.py` 에 추가 (0023 파일 재사용)

1. `dc_app` 이 두 뷰를 읽고, `academic_student_details` 는 180 열이 같은 순서로 앞에 있고 4열이 끝에 붙는다(가산 변경).
2. 본인 `GET /growth/profile`·`/portfolio` → `academic` 에 6필드, 날짜 형식 변환(유효/무효 원값 각각), 졸업예정 없음 → `None`.
3. 다전공: 라벨 조인·상태 NULL·여러 행 정렬, 행 없음 → `[]`. 코드 라벨 없는 원값 → 코드 그대로.
4. 다른 학생 / 교직원이 `growth/profile` 을 볼 때·PATCH 응답 → `academic` 없음(기존 테스트 확장), 멱등 저장 행에 새 필드 없음.
5. 학사 상세: 범위 안 교직원은 6필드, 범위 밖은 기존과 같은 404, 목록·export 응답 키 불변(새 키 0).

〔Astra〕 빠진 경우 — 아래도 같은 파일에 둔다(6·7·8·10 은 승인 필수):
6. **행 증식 방지**: 테스트 트랜잭션 안에서 `dc_v_code_inf` 에 `('MAJOR_TYPE', 기존코드)` 중복 행, `dc_v_major_inf` 에 같은 `major_code` 중복 행을 넣어도 `dc.academic_student_majors` 행 수 = 그 학생 원천 행 수, 응답 `majors` 길이 불변.
7. **개인정보 비노출 문자열 검사**(0023 `contact_strings` 확장): 합성 생년월일·입학일·집전화 문자열이 (a) 교직원이 읽은 `growth/profile`·`/portfolio`, (b) 범위 밖 404 본문, (c) 목록·export, (d) PATCH 첫 응답·재생 응답, (e) `dc.idempotency.response` 에 **없다**. 기존 `academic == {...}` 동등 단언은 새 10키 dict 로 **교체**한다(부분집합 단언으로 느슨하게 바꾸지 않는다).
8. **키 집합 고정**: 본인 `academic` 키 = 정확히 10개(`foreigner` 없음), 상세 최상위 키 = 기존 + 6개(+ 팀장이 (a)를 고르면 `majorName`). `GROWTH_PROFILE_KEYS | {'credits','academic'}` 최상위 불변.
9. 값 경계: 집전화 공백만 → `None`; `completed_semesters` NULL → `None`; 날짜 원값이 8자리지만 달력에 없는 값(예: 2월 30일) → `None`; `grad_exp_ym` 13월 → `None`; 전공 마스터에 없는 `major_cd` → `majorName` = 코드값.
10. 정렬: 같은 `major_seq` 에 유형 2개 + 다른 순번 1개 → `(major_seq, type_code)` 순서로 고정.
11. 학사 행 없는 서비스 fixture(`optional=true`)는 기존대로 `None`, 본인 `academic` 은 `None` — 새 helper 가 `None` 행에서 예외를 내지 않는다.
12. `dc_app` 역할로 상세·본인 GET 을 실행(`SET LOCAL ROLE dc_app`, 0023 테스트 관례) — 소유자 권한 뷰 경로 확인.

격리 `_test` DB, `backend/scripts/run_regression.py`. 기준선 실패 집합 = `dc_regression_20261127010942_aba24e_test`(10 실패)와 diff 0.

## 5. 검증(팀장)

`npx.cmd tsc -b` → 대상 회귀 → 전체 격리 회귀 diff → Astra 승인 후 `npm run docker:migrate`·`npm run docker:up` → ego-browser 로 20262324·다전공 보유 재학생 마이페이지와 상담사 학사 상세 모달 재측정(호출 수 동일, 응답 크기·시간, 콘솔 0·실패 0, 1280px 헤더 깨짐 없음). 학생 값은 출력하지 않는다.
〔Astra〕 검증 학생 `20262324`·`20243003` 은 `local_usr_inf` 라 다전공 원천 행이 없다(`majors=[]` 가 정상). 다전공 화면 확인은 다전공 행이 있는 재학생(재학·휴학 1,572명 중 하나)을 집계 쿼리로 골라 그 학생 세션과 상담사 상세로 본다 — 학번·값은 기록하지 않는다. `dc_app` 계정으로 로컬 Docker 실행(0023 필수 조건 6 관례)과 `GET /academic-students/{id}` 전후 시간 비교(기준 53~79ms)를 생략하지 않는다.
