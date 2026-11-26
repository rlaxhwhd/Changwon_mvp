# 0021 — Astra architecture review

- 판정: **ASTRA_APPROVED** — `work-order.md` **revision 2**(이 리뷰가 교정한 판), 아래 「필수 조건」 전부를 전제로 한다. revision 1 은 그대로는 승인하지 않는다.
- 일자: 2026-11-25. 검토자: codex-astra-db-reviewer 역할(위임 실행).
- 범위: 설계 승인이다. DB 변경·마이그레이션 적용·Oracle 접속은 하지 않았다. 로컬 `dreamcatch-dev-db` 는 읽기 전용으로만 조회했다(뷰 정의·의존·집계·EXPLAIN). 런타임 테스트·성능 측정 결과를 주장하지 않는다.
- 이 리뷰가 고친 파일: `work-order.md`(rev 1→2), `DB_SCHEMA.md`(176 설계 요약 1문단, 「미적용」 표시).

## 1. 검증한 사실 (로컬 DB, 2026-11-25)

| 확인 | 결과 | 설계 영향 |
|---|---|---|
| academic 의존 뷰 | `student_login_source`·`fixture_student_login_source`·`academic_people`·`academic_student_details`·`academic_organizations`·`department_staff_candidates`·`academic_joint_appointments`·`academic_counselors`·`academic_assistant_assignments`·`academic_sync_status`, 2차로 `department_assignment_targets`·`_whole_targets`·`department_assignment_student_scope` → `staff_student_scope` | rev 1 표에 scope 체인이 없었다. varchar 길이가 바뀌어 CREATE OR REPLACE 불가 → 명시 DROP/CREATE + 재GRANT |
| 옛 미러 교직원 키 | 교원·직원·조교 `intg_uid` 는 숫자 사번, `login_id` 는 비숫자 | 새 뷰는 INTG_UID=로그인ID, EMP_NO=사번 → **EMP_NO 를 키로 쓰는 판단이 맞다**(배정 staff_uid 1,573/1,595 숫자) |
| 옛 전공 코드 | 옛 트리 lvl3 와 학생 `major_cd` 모두 `M`+코드(`M101`, `MM003`). `department_staff_assignment.major_code` 1,132행 전부 `M…`(활성 169행) | rev 1 은 이를 「이미 학사 코드」로 셌다 — **누락**. 접두어 제거 이관 추가 |
| dc.student 조직 | 학사 출신 11행 college/dept NULL, `enroll_student` 는 ON CONFLICT DO NOTHING | 투영만 고치면 기존 학생은 영원히 스코프 밖 → refresh 에서 정합 |
| dc.department FK | `student`·`org_assignment` → `(college_code, dept_code)` 만 FK. 나머지 참조(배정·override·curriculum·subject)는 FK 없음 | rev 1 의 「참조 없으면 삭제」는 FK 없는 참조를 놓친다 → 삭제 금지로 교정 |
| 학적 라벨 | `student_contact.ACADEMIC_STATUS` 가 0003=제적·0004=수료 | 새 계약(0003 수료·0004 제적)과 반대 → 정정 |
| 성별 소비처 | programs.py:393, survey.py:346, employment_report.py:23/122, StudentChargeTable 옵션이 '0001'/'0002' | 원값 '0'/'1' 로. 저장된 employment_report 는 두 도메인 모두 해석 |
| 프론트 리터럴 | AcademicDirectory.tsx 상태 '89'/'90' | 0006/00007 로 |
| 시드 원장 | `app.seed` 는 checksum 불일치 시 RuntimeError, 신규 DB 는 시드 뒤 013·043·046·051 재실행 | 시드 파일 교체와 함께 `dc.seed_source` 원장 갱신 필요 |
| 기준 성능 | 현재 로그인 조회 0.126 ms(식 인덱스), 교수·조교 스코프 확인 0.29 ms(DISTINCT ON 키 푸시다운) | 새 정의에서 두 경로가 같은 인덱스 접근을 유지해야 한다 |
| 외부 발송 | backend 에 SMS/메일 발송 코드 없음 | 기증 학생 연락처 복사의 현재 위험은 화면 노출뿐 |

## 2. 검토 요청 9건 답변

**① 타입·인덱스·433만 행 공개.** 053 규칙(VARCHAR2/CHAR→varchar(n), NUMBER→numeric(p,s)/numeric, DATE→timestamp)은 맞다. BYTE 길이를 문자 길이로 옮기므로 항상 수용된다. CHAR 를 varchar 로 두어 해시 대조에 필요한 패딩 바이트가 보존된다. NOT NULL 은 선언하지 않는다(메타 대조가 지킨다). 인덱스는 rev 1 목록에 `usr_inf(emp_no) WHERE emp_no IS NOT NULL` 을 꼭 넣는다 — 스코프 뷰의 DISTINCT ON 키 푸시다운이 이 인덱스를 탄다. 공개 방식은 **DELETE+INSERT(MVCC)를 유지**한다. TRUNCATE 는 공개 트랜잭션 동안 ACCESS EXCLUSIVE 로 읽기를 막는다. 테이블 이름 교체는 의존 뷰가 옛 OID 를 계속 가리켜서 안 된다. 파티션 교체는 원본과 같은 컬럼 계약을 깨므로 과하다. 대신 아래 넷을 필수로 한다. (a) 스테이징을 autocommit 세션 임시 테이블(인덱스 없음)로 분리하고 공개만 짧은 트랜잭션으로 한다. 지금 코드는 추출 전체를 한 트랜잭션으로 묶어 수십 분 xid 를 잡는다. (b) 변경 없는 뷰는 공개를 생략한다. (c) 공개 후 ANALYZE 하고 SUGANG 은 VACUUM(ANALYZE). (d) JPype 컬럼 메타를 결과셋당 한 번만 읽고 fetchSize ≥ 5,000, SUGANG 전용 timeout. SUGANG 은 정상 상태에서 힙·인덱스가 약 2배(추정 1~1.5GB)가 되고 갱신마다 같은 규모의 WAL 을 쓴다 — 첫 적재에서 실측한다. 현재 SUGANG 을 읽는 앱 경로는 없다.

**② 가산 다중집합 해시.** 이 용도(신뢰 원본의 복사 무결성, 비적대적)에는 충분하다. 우연 충돌은 무시할 수준이고 순서 무관·O(1) 메모리라 433만 digest Counter(수백 MB)를 피한다. XOR 는 같은 행 두 번이 상쇄되어 안 되지만, 합 mod 2^256 + 행 수는 중복·누락을 잡는다. 적대적 위조 방어(키 없는 선형 해시)는 보장하지 않으며 여기서는 요구되지도 않는다. 정규화(Decimal 표기, NULL≠'', DATE→isoformat)는 기존 `fingerprint` 를 그대로 쓴다. 같은 해시를 sync_run 보고에 남기면 「변경 없는 뷰 생략」의 근거로도 쓴다.

**③ `academic.usr_inf` 원본 우선과 로컬 분리.** 분리 테이블 + UNION ALL 은 승인한다(동기화가 지우지 않고 dc_app 에 노출되지 않는다). 다만 **조용한 원본 우선은 위험하다.** 20211304·20196208 은 실제처럼 생긴 번호다. 같은 번호의 실제 학생이 원본에 생기면 가짜 학생의 dc.* 이력(진단·상담·로드맵)이 실제 학생 계정에 붙는다. 그래서 뷰의 원본 우선은 방어선으로만 두고 **동기화가 충돌을 발견하면 공개하지 않게** 했다. 시드 스크립트도 삽입 전에 충돌을 검사한다. 명시 컬럼 목록과 `origin` 컬럼을 붙이고, 로컬 인원 로그인은 `dc.person.source='local'` 로 등록한다.

**④ dc.department 투영과 176 재매핑.** C-코드 이관 순서 ①학사 행 upsert(DO NOTHING) → ②참조 6곳 UPDATE → ③C 행 DELETE → ④잔존 시 RAISE 는 FK 위반 없이 진행되고 맞다. MAP 63건은 단사이고(대상 중복 0, 참조 합 171), DELETE 16건은 참조 0 이다. 잠금은 80행 테이블의 ADD COLUMN(상수 기본값, rewrite 없음)과 소수 행 UPDATE·명시 DROP VIEW 라 짧다. 다만 의존 뷰를 읽는 요청과 엇갈리지 않게 `lock_timeout='5s'` 를 둔다. ASSERT 대신 RAISE 를 쓴다(check_asserts=off 로 꺼진다). 교정한 점은 다섯이다. (a) refresh 는 삭제하지 않고 비활성만 한다 — FK 없는 참조 4곳과 동시 삽입 경합 때문이다. (b) 빈 원본이면 RAISE. (c) 학과 단대 이동은 dc.department 키를 제자리 UPDATE 한다. 이를 위해 student·org_assignment FK 를 ON UPDATE CASCADE 로 다시 만든다. (d) `dept_code` 단독 유일 인덱스 — curriculum·subject 가 dept 만으로 참조하기 때문이다. (e) refresh 마지막 단계에서 dc.student 조직을 학사와 정합한다. 이관한 모든 행은 append-only `dc.org_code_remap` 에 남긴다. 학사 코드가 원래부터 있던 1,738행과 구분해야 해서 CSV 역매핑으로는 되돌릴 수 없다. 전공 `M` 접두어 제거도 176 에 넣는다. 원본 존재 확인은 첫 동기화 직후 검증으로 한다(마이그레이션 시점엔 학사 테이블이 비어 있다).

**⑤ 교직원 키 EMP_NO.** 승인한다. 옛 미러 교직원 intg_uid 가 사번이었으므로 기존 dc.staff·배정 키와 이어진다. 조건은 넷이다. 사번 NULL 은 후보에서 뺀다. `DISTINCT ON (emp_no, role_code)` 로 한 사번의 교원·조교 역할을 둘 다 보존하고, 재직 우선 → upd_dt → intg_uid 순으로 결정적으로 고른다. 스코프의 비활성 판정은 역할까지 맞춘다. 「같은 EMP_NO·다른 이름」 건수와 활성 배정 staff_uid 의 후보 적중 건수를 동기화 보고에 남긴다. 향후 SSO 는 로그인ID(INTG_UID)로 들어오므로 INTG_UID→EMP_NO 해석이 필요하다 — DB.md §9 에 등록 권고.

**⑥ (lvl, dept_cd) 트리와 소비처.** 키 설계는 맞다(MAJOR·DEPT 코드 312건 겹침). 교정한 점은 셋이다. (a) **lvl3 에 gubun 0 전공을 포함한다.** 옛 트리도 학과와 같은 전공을 두었고, 활성 조교 배정 169행이 그 전공을 가리킨다. 빼면 배정 대상 목록과 `ACTIVE_PROFESSOR_ORGS` 조인에서 사라진다. (b) 옛 컬럼 집합(grp_cd/grp_nm/ordering/dept_sub_nm 포함)을 유지하고 gubun_code 를 덧붙인다. 관리자 조회 화면이 grp_nm 을 쓴다. (c) 소비처는 lvl 을 명시한다. 로스터는 d/m/c 조직 조인 셋을 아예 지우고 `student_login_source` 의 이름을 쓴다(lvl 을 빠뜨리면 행이 불어나 건수가 틀린다). roadmap_generator 4곳은 lvl, 관리자 조회 정렬은 `lvl,dept_cd` 로 한다. 옛 lvl4(기관 503행)는 새 트리에 없어 조회 화면에서 빠진다 — 업무 의존 없음, 필요하면 후속으로 다룬다.

**⑦ fixture 경로 폐기.** 승인한다. 로그인 번호 20990001/2 의 실제 uid(20211304·20196208)가 가짜 7명 안에 있어 로컬에서는 `local_usr_inf` + `fixture_student_login` 조인으로 유지된다. 대신 시드 스크립트를 돌리지 않은 DB(신규 테스트 DB·서버)에서는 fixture 로그인이 사라진다. 테스트는 필요한 인원을 스스로 넣는다. 로그인 조회는 `student_no=… OR intg_uid=…` 가 COALESCE 식 때문에 11만 행 스캔이 되므로 fixture 번호를 먼저 uid 로 풀고 `intg_uid=` 단일 조건으로 바꾼다. academic.v_usr_inf 에 쓰던 테스트 12파일·스크립트 4개는 옮기거나 퇴역한다. 그대로 두면 오류 없이 효과만 사라진다.

**⑧ 권한.** 구조는 맞다. dc 뷰는 소유자(postgres) 권한으로 academic 을 읽고, dc_app 은 academic USAGE 가 없다(053). 필수: 재생성한 모든 dc 뷰에 GRANT SELECT TO dc_app, `security_invoker` 를 켜지 않는다. 새 academic 테이블·`local_usr_inf` 에 dc_app 권한을 주지 않는다. `refresh_department_from_academic()` 은 `REVOKE EXECUTE FROM PUBLIC`(함수 기본 EXECUTE 는 PUBLIC 이다), SECURITY INVOKER, search_path 고정. `dc.org_code_remap` 은 dc_app 권한 없음, 기존 `reject_history_change` 트리거.

**⑨ 롤백.** forward-fix 만 승인한다. 앱만 되돌리는 것은 금지다. 옛 앱은 폐기된 `fixture_student_login_source`·옛 신분코드 1101/1301·'89' 를 읽어 로그인·스코프가 깨진다. 되돌림은 새 마이그레이션으로 한다. 보존한 옛 미러 위에 옛 뷰 정의를 재생성하고, `dc.org_code_remap` 을 역순 적용하고, seed_source 원장을 복원한다. 그러므로 옛 미러(11만 명 개인정보 사본) 삭제는 검증 PASS 이후, 기한을 DB.md §9 에 적고 바로 다음 마이그레이션에서 한다.

## 3. 그 밖에 고친 결함 (work-order rev 2 반영)

1. **학적 라벨 반전**: `ACADEMIC_STATUS` 0003/0004 정정(학생목록 상태 필터·표시가 수료↔제적을 바꿔 보여 준다).
2. **대학원 판정**: `univ_cd<>'00'` 은 90(전문학사)을 대학원으로 넣는다 → `('01'…'12','91','92')`. `academicLevel` 계약은 '학부'|'대학원' 두 값뿐이라 90 은 학부로 둔다 — **팀장 확인 항목**(업무 의미가 작아 사용자 결정으로 올리지 않았다. 다르게 판단하면 계약 변경이므로 재리뷰).
3. **성별**: 표시 '0'→남·NULL→없음·그 외→여, 필터 '1' 은 `<>'0'`. `sexCode` 키 유지, 값 도메인만 원값.
4. **시드 원장**: 바뀐 시드 파일의 checksum/payload 를 176 이 갱신(원장은 이력이 아니다).
5. **동기화 공개 전 검사**: 학생 INTG_UID·DEPT_CODE·COL_CODE 중복과 로컬 충돌은 중단, 기타 논리 키 중복은 보고만.
6. **새로 나타난 missing 뷰 드리프트**는 그 뷰만 건너뛴다(엑셀 추정 명세 때문에 매일 동기화 전체가 멈추지 않게).
7. **legacy 데이터셋**(`com_con_*`·`fu_ass_dept`)은 옛 코드로 동결됐다고 조회 화면에 표시하고 새 코드와 조인하지 않는다.
8. **테스트 인원 스크립트 안전장치**: 명시 확인 변수 + DB 이름 검사 + 값 미출력 + 원본 충돌 검사. 외부 발송을 붙이면 `origin='local'` 제외.

## 4. 예상 주요 query ↔ 인덱스

| 경로 | 빈도 | 접근 | 비고 |
|---|---|---|---|
| 학생 로그인(`student_login_source` by uid) | 로그인마다 | fixture_student_login PK → `dc_v_usr_inf(intg_uid)` + local PK, dept_inf(dept_code), col 소량 | OR+COALESCE 금지. EXPLAIN 증거 필수 |
| 교수·조교 스코프(`staff_student_scope`) | 학생 단위 권한 확인마다 | department_staff_assignment 활성 부분 인덱스, student (college,dept) FK, 후보 DISTINCT ON → `usr_inf(emp_no)` 부분 인덱스로 푸시다운 | 현재 0.29 ms 기준. 같은 수준 유지 확인 |
| 학생 목록(로스터) | 관리자 화면 | 학생 10.6만 행 해시 조인(student_login_source·people·details 모두 usr_inf 1회씩) | 조직 조인 3개 제거로 줄어든다. jit=off 유지, 전후 시간 비교 |
| 학과 배정 대상/목록 | 관리자 | 조직 트리 1,393행(16+595+782) 메모리 조인 | 작아 인덱스 불요 |
| `/departments` | 부팅·드롭다운 | dc.department 595행 PK 순회 | 응답 ~595행, active 필터는 프론트 |
| dept refresh | 동기화 1회 | dept_inf(dept_code), col/code 소량, dc.student by intg_uid | 공개 트랜잭션 마지막 단계 |
| 동기화 변경 판정 | 동기화 1회 | sync_run 최근 1행 report | — |
| 향후 수강 이력 | 미구현 | `stu_sugang_inf(intg_uid)` | 지금 소비처 없음. 인덱스는 유지(나중에 큰 테이블에 CREATE INDEX 하지 않게) |

## 5. 위험 · migration · rollback

- 176 은 한 러너 트랜잭션에서 실행된다. DDL 대상은 80행 테이블·뷰·빈 테이블뿐이라 잠금 시간이 짧다. `lock_timeout` 을 두어 대기열을 만들지 않는다. FK 재생성은 dc.student·org_assignment 검증 스캔(소량)만 한다.
- 신규 DB: 176 은 학사 테이블이 비어 C-코드 0건 상태로 통과하고, 시드가 학사 코드 학과를 넣는다. 기존 DB: 176 이 이관하고 원장을 갱신한다. 그 뒤 첫 동기화 → refresh(595행·정합) 순서다. **동기화 전에는 dc.department 가 MAP 대상 63행뿐**((5,714) 포함)이라 학생 로그인의 학과 연결은 동기화 뒤에 완성된다 — 로컬 적용 순서를 「migrate → sync → seed_local_academic_test_students → docker:up 검증」으로 고정한다.
- 개인정보: 옛 미러 사본, `local_usr_inf` 의 기증 값은 로컬 한정이다. 옛 미러 삭제 기한을 등록한다.
- 롤백: §2 ⑨. 앱만 롤백 금지, 로그 기반 역변환, 옛 미러는 PASS 전 보존.

## 6. JSON 호환성 테스트 항목

- `/auth/student/login`·`/auth/student/me`: 키 `id,name,studentNo,major,grade` 불변. 20243003·20262324·20990001(→20211304)·20441231·졸업생 허용, 교직원 거부, override 우선, 원본·로컬 충돌 시 동기화 중단.
- `/departments`: 기존 키 `collegeCode,deptCode,collegeName,deptName,course` 불변 + `univCode`(string|null)·`active`(boolean) 추가. C-코드 0.
- 학생 목록·상세(`/academic-students…`): `sexCode` 값 '0'/'1', `sex` 라벨, `academicLevel` ∈ {'학부','대학원'}, `status` 라벨(0003 수료·0004 제적), `major`/`college` 이름, 건수가 학생 수와 같다(행 증식 없음).
- 관리자 학사 조회 `/system/academic/{people,organizations,joint-appointments}`: 컬럼 키 유지(organizations 에 gubun_code 추가), 상태 필터 0006/00007, 페이지 결정성.
- 학과 배정 `/system/department-assignments…`: 목록 키 불변, 전공 접두어 제거 후 기존 활성 조교 배정이 같은 행에 붙는다.
- 프로그램 명단·만족도·취업보고 성별 표시(옛 저장값과 새 원값 모두).

## 7. Sol 실행 순서

1. 사전 확인: rev 2 와 이 리뷰를 읽는다. Graft 로 §2-5 소비처를 다시 찾아 목록에 빠진 곳이 없는지 확인하고, 빠진 곳이 있으면 보고한다.
2. 176 작성: academic 16 테이블(정적 DDL)·인덱스 → `local_usr_inf`·`academic.usr_inf` → `dc.org_code_remap` → dc.department 컬럼·C 이관(+로그)·잔존 RAISE·`dept_code` 유일·FK ON UPDATE CASCADE 재생성 → 전공 `M` 제거(+로그) → seed_source 원장 갱신 → 뷰 체인 명시 DROP/CREATE + GRANT → refresh 함수 + EXECUTE 회수.
3. 시드 5파일·`seed_care7_test_student.py`·테스트 12파일·스크립트 4개 교체. 신규 `seed_local_academic_test_students.sql`.
4. `sync_academic.py --source dc-views`: 스테이징/공개 분리, 메타 캐시, 공개 전 검사, 변경 없는 뷰 생략, refresh 마지막, 공개 후 ANALYZE/VACUUM, 보고 확장. `test_academic_sync` 갱신.
5. API 소비처 → 프론트 리터럴(AcademicDirectory·StudentChargeTable·드롭다운 active/course).
6. `rebuild-test-db.sh` + pytest(기존 실패 4건 제외) + 계약 테스트 → `npx tsc -b`.
7. 로컬 DB 백업 → migrate → 실적재 sync(소요·크기·WAL 기록) → 테스트 인원 스크립트(리허설 후 apply) → §3-2 동기화 후 검증 → EXPLAIN 2건 → `npm run docker:up` → ego-browser 검증(콘솔 0·실패 0·전후 응답시간).
8. `implementation.md` 에 승인 설계와 다르게 간 곳, 측정값, 보고 항목(전공 미매칭·사번 중복·jsonb 잔재·단대 미연결)을 남긴다.

## 8. 필수 조건 (승인의 전제)

1. rev 2 §2-1~§2-6·§3 의 **[rev2]** 항목을 모두 구현한다. 특히 전공 `M` 접두어 이관, dc.student 조직 정합, scope 체인 재생성·재GRANT, lvl3 gubun 0 포함, 로그인 uid 단일 조건 조회.
2. refresh 는 삭제하지 않고, 빈 원본을 거부하고, 단대 이동을 제자리 키 UPDATE(+CASCADE)로 처리하고, PUBLIC EXECUTE 를 회수한다.
3. 모든 코드 이관 행을 `dc.org_code_remap` 에 남긴다. 역변환은 로그로만 한다.
4. 동기화는 스테이징/공개를 분리하고, 로컬 인원 충돌·학생 uid/DEPT/COL 중복이면 공개하지 않는다. 공개 후 ANALYZE 한다.
5. 바뀐 시드 파일과 `dc.seed_source` 원장이 같은 커밋에서 일치한다(rebuild + 기존 DB `already_imported` 둘 다 확인).
6. 첫 동기화 후 §3-2 검증(활성 배정 college/dept/major 원본 존재, 학사 출신 dc.student 조직 NULL 0)을 통과하거나, 미매칭을 행 id 와 함께 보고해 팀장 판단을 받는다.
7. 로그인·스코프 EXPLAIN 이 인덱스 경로임을 implementation.md 에 남긴다.
8. 옛 미러 삭제는 PASS 이후 별도 마이그레이션으로 하고, 기한을 DB.md §9 에 등록한다. 그 전에는 롤백 경로로 보존한다.
9. 팀장 확인 항목: UNIV_CD 90 을 학부로 분류하는 것. 다르게 정하면 계약 변경이므로 revision 증가와 재리뷰.

## Astra 사후 리뷰 (2026-11-25)

- 대상: `implementation.md` §8 「승인 설계와 다르게 간 곳」 1~5 와 로컬 원장 대조. 그 밖의 구현은 이 사후 리뷰 범위가 아니다(팀장 검증 몫).
- 방법: 파일 대조(diff·sha256)와 로컬 `dreamcatch-dev-db`/`dreamcatch` **읽기 전용** 조회(`BEGIN READ ONLY … ROLLBACK`)만 했다. DDL·DML·마이그레이션 적용·Oracle 접속은 하지 않았다. 행 값은 조회하지 않았다(건수·카탈로그만).
- 종합 판정: **5건 모두 APPROVED**. 178 은 필요 없다. 권고 2건은 차단 조건이 아니다.

| # | 항목 | 판정 |
|---|---|---|
| 1 | 177 `refresh_department_from_academic()` NULL-안전 `is_active` | **APPROVED** |
| 2 | 학생 조직 정합 시 `major_label` 동기화 | **APPROVED** |
| 3 | `seed.py` 가 적용된 046 의 C-코드 2개를 실행 시 치환 | **APPROVED**(권고 1) |
| 4 | `.gitattributes` 시드 5개 `eol=lf` | **APPROVED** |
| 5 | 옛 미러 쓰기 스크립트 3개 퇴역 스텁 | **APPROVED** |
| — | 로컬 원장 176·177 checksum | **일치** |

### 1. migration 177 — APPROVED

- 176(2526–2624행)과 177 의 함수 블록을 diff 했다. 차이는 정확히 3곳뿐이다: `CREATE` → `CREATE OR REPLACE`, upsert 의 `s.use_flag = '1'` → `COALESCE(s.use_flag = '1', false)`, `REVOKE` 앞 주석 1줄. 시그니처(인자 없음 → `jsonb`)·`LANGUAGE plpgsql`·`SECURITY INVOKER`·`SET search_path = pg_catalog`·본문의 다른 문장(단대 이동, 비활성화, 학생 정합, 반환 키)·`REVOKE EXECUTE … FROM PUBLIC` 은 그대로다.
- 의미는 승인 설계와 같다(「'1' 이면 활성, 그 밖은 비활성」). 원본 `USE_FLAG` 가 NULL 을 허용하므로 176 은 첫 공개를 롤백시키는 결함이었고, 적용된 176 을 고치지 않고 forward `CREATE OR REPLACE` 로 고친 것이 맞다. `ON CONFLICT … WHERE (…) IS DISTINCT FROM (…)` 비교에 `is_active` 가 들어 있어 NULL→false 전환도 멱등하게 한 번만 갱신된다.
- 로컬 카탈로그: `prosecdef=f`, `proconfig={search_path=pg_catalog}`, owner `postgres`, `proacl={postgres=X/postgres}`(PUBLIC·`dc_app` EXECUTE 없음), `prosrc` 에 수정식 포함. `dc.department` 595행 중 `is_active IS NULL` 0, 활성 389(implementation §4 와 일치). 호출자는 `sync_academic.py` 공개 트랜잭션 하나(소유자 연결)뿐이라 권한 변화가 없다.
- `test_academic_sync` 에 `use_flag=None` 학과 재현 케이스가 있다. 177 헤더의 롤백 주석(176 본문 복원 시 NULL 원본에서 실패)도 정확하다.

### 2. `major_label` 동기화 — APPROVED

- 실제로는 176 함수 본문에 이미 있고 177 이 그대로 옮겼다(diff 에 차이 없음). 범위: `(college_code, dept_code)` 가 학사와 다른 행만, `major_label = COALESCE(NULLIF(l.dept_name,''), x.major_label)` — NOT NULL 열에 NULL 이 들어가지 않는다.
- 근거: `student_login.py` 가 첫 로그인 때 `major_label = dept_name or '소속 미등록'` 으로 넣는다. 정합으로 코드만 바꾸면 라벨이 옛 값/'소속 미등록' 으로 남아, `major_label` 을 읽는 다수 소비처(`diagnosis.py` 의 학과명 필터 `major_label = ANY(...)`, 상담·명단 스냅샷 원천, `deep.py`)가 코드와 다른 학과를 보게 된다. 학사가 정본(규칙 1)이므로 같은 행에서 같이 맞추는 것이 옳다.
- 이력: 이미 기록된 이벤트 스냅샷(상담·진단·지원 등)은 자기 `snapshot` 을 갖고 있어 소급 변경되지 않는다. 코드 변화는 `org_code_remap(reason='academic_alignment')` 로 남는다. 이전 라벨 문자열은 로그에 없지만, 학사 투영 값이고 이전 코드로 재구성 가능하므로 append-only 원칙 위반으로 보지 않는다.
- 한계(후속 후보, 차단 아님): 코드는 같고 학사 학과명만 바뀐 경우(학과 개칭)는 라벨을 맞추지 않는다.

### 3. `seed.py` 의 046 치환 — APPROVED (권고 1)

- 046 은 `dc.schema_migration` 에 적용돼 파일을 고칠 수 없다. 치환은 **메모리상의 SQL 문자열**에만 적용되고 마이그레이션 파일·checksum 은 건드리지 않는다.
- 매핑 `C07:C07-07 → 5:414`, `C05:C05-03 → 8:205` 는 `c-code-map.csv`(48·31행, 컴퓨터공학과·경영학과)와 일치한다 — 176 이 기존 DB 에서 같은 행을 이관하는 대상과 같다.
- 이 블록은 `seed()` 에서 `dc.seed_source` 가 비어 있을 때(신규 DB)만 실행된다(기존 원장이 있으면 `already_imported` 로 먼저 반환). 따라서 기존 DB 에 중복 행을 만들 수 없다. 또 `org_assignment` 에 `UNIQUE(staff_uid,college_code,dept_code,role_code,valid_from)` 가 있다.
- 차이 기록: 신규 DB 의 fixture 조교 배정 id 는 `md5('org-fixture:asst_kim:5:414')` 처럼 새 코드 기반이고, 기존 DB 는 176 UPDATE 로 코드만 바뀐 옛 id 를 유지한다. fixture 행이고 id 를 외부 참조하는 경로가 없으므로 허용한다.
- **권고 1**: `assert old in body, old` 는 `python -O` 에서 제거된다. 치환 대상이 사라졌을 때 확실히 멈추도록 `if old not in body: raise RuntimeError(...)` 로 바꾼다(동작 변화 없음, 다음 손댈 때).

### 4. `.gitattributes` — APPROVED

- 추가 5줄은 0021 이 바꾼 시드 5개만 `text eol=lf` 로 고정하고 다른 파일은 건드리지 않았다. `core.autocrlf=true` 인 Windows 작업본에서 CRLF 로 바뀌면 `app.seed` 의 바이트 sha256 이 원장과 어긋나 멈추기 때문이며, 원인·범위가 맞다.
- 확인: 5개 파일 모두 CR 0바이트, `git ls-files --eol` = `i/lf w/lf attr/text eol=lf`, 파일 sha256 이 176 의 `UPDATE dc.seed_source SET checksum = …` 5개 값과 정확히 같다.
- 참고: 로컬 원장 불일치 3건(`students/chaewon.json`·`changwon.json`·`popups.seed.json`)은 작업본이 이미 LF 라 줄바꿈 문제가 아니라 내용 변경이다. 이 작업 범위가 아니다.

### 5. 퇴역 스텁 3개 — APPROVED

- 세 파일 모두 `\echo` 안내 → `\set ON_ERROR_STOP on` → `RAISE EXCEPTION` → `\quit` 이다. `ON_ERROR_STOP` 을 RAISE 앞에서 켜므로 psql 은 호출자의 `-v` 설정과 무관하게 exit 3 으로 멈추고 아무것도 쓰지 않는다. 0021 이후 옛 `academic.v_usr_inf` 에 쓰면 오류 없이 효과만 사라지므로, 조용한 no-op 보다 명시적 실패가 맞다.
- 저장소 안 호출자: 이력 문서 `docs/ACADEMIC_STUDENT_ROSTER_2026-09-21.md` 뿐(런타임·테스트·배포 스크립트 참조 0). `_workspace/` 의 옛 서버 스크립트는 원본을 base64 로 박아 둔 Git 제외 이력물이라 스텁의 영향을 받지 않으며, 다시 실행하지 않는다.
- 남은 1개(`register_test_student.sql`)는 `local_usr_inf` 로 이전됐고 승인 §7-3 「스크립트 4개 교체」 범위를 충족한다.

### 로컬 원장 대조 — 일치

| version | 원장 checksum | 파일(러너 방식 `sha256(read_text().encode())`) | 적용 시각(UTC) |
|---|---|---|---|
| `176_academic_dc_view_cutover.sql` | `b0173b72…46f82` | `b0173b72…46f82` | 2026-11-25 08:03:00 |
| `177_academic_refresh_null_use_flag.sql` | `6f9593c3…ee2f4` | `6f9593c3…ee2f4` | 2026-11-25 08:14:55 |

- 두 파일 모두 CR 0바이트라 바이트 해시와 러너 해시가 같다. 175 다음에 176·177 이 순서대로 있고 빈 번호가 없다. 두 파일은 아직 Git 미추적(`??`)이므로 **적용된 지금 바이트 그대로** 커밋해야 한다 — 커밋 전에 내용을 바꾸면 `migrate.py` 가 `Applied migration changed` 로 멈춘다.

## Astra 178 리뷰 (2026-11-25)

**판정: APPROVED (Astra 교정 1건 반영 후)** — 대상 `backend/migrations/178_fixture_login_app_grant.sql`, 테스트 `backend/tests/test_academic_sync.py::test_app_role_can_run_the_student_login_lookup`.

### 1. 178 자체

- 원인 진단이 맞다. 063 은 `dc.fixture_student_login_source` 뷰에만 `dc_app` SELECT 를 줬고 원표는 권한이 없었다. 176 이 그 뷰를 DROP 하고 `login()` 이 원표를 서브쿼리로 직접 읽게 되면서 권한이 끊겼다. 뷰는 소유자 권한으로 실행되지만 서브쿼리의 원표는 호출자(`dc_app`) 권한으로 검사된다.
- **교정(직접 수정): 열 단위 → 표 단위 `GRANT SELECT ON dc.fixture_student_login TO dc_app`.**
  - 표의 열이 `student_no, student_uid` 두 개뿐이라 노출 범위가 같다(최소 권한 손실 없음).
  - 저장소 178개 마이그레이션 중 열 단위 GRANT 는 이것 하나였다. 관례는 표·뷰 단위다.
  - 열 ACL 은 `pg_attribute.attacl` 에 있어 `scripts/release_parity.py`(`pg_class.relacl` 해시)와 `scripts/audit_schema.py`(`role_table_grants`)에 보이지 않는다. 서버·로컬 권한 차이를 parity 가 못 잡는다.
- 쓰기 권한 없음(SELECT 만), `SET LOCAL lock_timeout = '5s'`(러너가 트랜잭션 + advisory xact lock 으로 감싸므로 유효), Forward-only·롤백 주석 모두 저장소 관례와 맞다. 롤백 주석도 표 단위 REVOKE 로 맞췄다.
- 교정 후 격리 DB(`dc_view_sync_*_test`, 실행 후 DROP)에서 대상 테스트 **1 passed**. 테스트는 UPDATE 거부까지 단정하므로 쓰기 권한이 새면 잡힌다. 파일은 CR 0바이트 — 아직 어디에도 적용되지 않았으므로 지금 바이트로 커밋하면 된다.

### 2. 176/177 이 만든·다시 만든 객체 중 `dc_app` 권한 누락 — 추가 누락 없음

- `backend/app` 의 `dc.*`/`academic.*` 참조 173개(동적 `dc.{table}` 1곳 포함: `survey_response`·`program_wishlist`·`core_competency_allocation`)를 로컬 `dreamcatch`(176·177 적용, 178 미적용)에서 `has_table_privilege`/`has_any_column_privilege`/`has_function_privilege` 로 대조했다. `dc_app` 이 못 읽는 것은 둘뿐이다.
  - `dc.fixture_student_login` — 178 대상.
  - `dc.student_login_override` — 앱 참조는 `app/seed_care7_test_student.py` 의 INSERT 하나이며, 이 시드는 `docs/CORE_COMPETENCY_DB.md` 에 「DB 소유자로만 실행」으로 정해진 개발 전용 CLI 다. 176 이전부터 같은 상태라 회귀가 아니다. 로그인은 `dc.student_login_source` 뷰(소유자 권한)를 통해서만 읽으므로 권한이 필요 없다.
- 176 이 다시 만든 뷰 10개(`student_login_source`, `academic_people`, `academic_student_details`, `academic_organizations`, `department_staff_candidates`, `academic_joint_appointments`, `department_assignment_targets`, `department_assignment_whole_targets`, `department_assignment_student_scope`, `staff_student_scope`)는 §8 끝의 GRANT 로 모두 재부여됐고 실측 SELECT 가능. `security_invoker` 뷰는 dc 스키마에 0개라 뷰 내부의 `academic.*`·`dc.org_code_remap` 접근은 소유자 권한이다.
- 의도적 무권한 확인: `dc.org_code_remap`(relacl 소유자만), `academic.local_usr_inf`, `academic.usr_inf`, `academic.dc_v_*`, `academic` 스키마 USAGE 자체 없음 — 앱 코드에 직접 참조 0(주석 1줄 제외). `dc.refresh_department_from_academic()` 은 PUBLIC EXECUTE 회수, 앱 호출 0(동기화 스크립트가 소유자로 호출).
- 176 의 `ALTER TABLE dc.department ADD COLUMN` 3개는 기존 표 단위 ACL(`dc_app=r`)이 새 열까지 덮는다. 기본 권한(`pg_default_acl`)은 없어 새 객체는 명시 GRANT 가 필요하다 — 이번 누락의 구조적 원인.
- 로그인 경로(`login` → `enroll_student`)가 닿는 객체: `dc.student_login_source`(r), `dc.fixture_student_login`(178), `dc.department`(r), `dc.person`, `dc.student`(a,r) — 178 적용 후 모두 충족.

### 3. 권고 (비차단)

- 이번 결함은 「테스트가 소유자로 돈다」는 같은 원인으로 다시 날 수 있다. 앱 코드가 참조하는 `dc.*` 이름을 정적으로 모아 `dc_app` 의 SELECT/EXECUTE 를 단정하는 권한 가드 테스트 1개를 두면 새 마이그레이션이 뷰를 표로 바꿀 때 바로 잡힌다(위 §2 대조 쿼리를 그대로 쓰면 된다). 소유자 전용 CLI 예외 목록(`seed_care7_test_student`)은 명시한다.
- 로컬 반영 순서: 178 커밋 대상 바이트 확정 → `app.migrate` 로 로컬 적용 → 로컬 Docker 에서 검증 학생 `20243003`·`20262324` 로그인 200 재확인.
