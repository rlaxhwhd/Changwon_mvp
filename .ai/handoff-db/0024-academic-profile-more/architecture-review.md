# 0024 — Astra architecture review

- 판정: **ASTRA_APPROVED (조건부)** — `work-order.md` **revision 2**(이 리뷰가 교정한 판, 〔Astra〕 표시). §2 필수 조건 전부가 전제다. rev 1 은 방향(가산 뷰·0023 경계·새 API 호출 없음)이 맞지만, 코드·전공 조인의 행 증식 방어가 없고 API 키 이름이 작업 트리의 미커밋 코드와 충돌해 그대로는 승인하지 않는다.
- 일자: 2026-11-27. 검토자: codex-astra-db-reviewer 역할(위임 실행).
- 측정 방식: 로컬 `dreamcatch-dev-db` 에서 **BEGIN → CREATE (OR REPLACE) VIEW → `SET LOCAL ROLE dc_app` SELECT → EXPLAIN ANALYZE → ROLLBACK** 만 했다(rev 1 SQL·rev 2 SQL·합친 쿼리 3회). 종료 후 `academic_student_details` 12열·`dc.academic_student_majors` 없음을 확인했다 — **커밋된 DB 변경 0**. 학생 값은 집계만 보았고 EXPLAIN 리터럴은 마스킹했다. API·프론트·테스트 실행은 하지 않았다.
- 코드 탐색: 이 세션에 Graft MCP 가 노출되지 않아 원본 grep 으로 `academic_student_details` 소비처·`academic_contact`·`profile_dto`·`detail()` 호출 경로를 추적했다.
- 이 리뷰가 고친 파일: `work-order.md`(rev 1→2), `DB_SCHEMA.md`(180 문단 앞에 181 요약 1문단, 「미적용」 — 뷰 2개 계약과 LATERAL 선택 이유를 스키마 이력에 남기기 위함).

## 1. 검증한 사실과 교정

### 1-1. 사실 (로컬 DB, 집계만)

| 확인 | 결과 | 설계 영향 |
|---|---|---|
| 원천 인덱스 | 176 이 이미 생성: `ix_dc_v_usr_major_inf_intg_uid(intg_uid)`, `ix_dc_v_code_inf_code(code_grp,code)`, `ix_dc_v_major_inf_major_code(major_code)` | **새 인덱스 불필요**. sync 는 같은 트랜잭션 DELETE+INSERT(MVCC)라 인덱스는 유지되고 공개 후 ANALYZE 된다 |
| `(code_grp,code)` 중복 / `major_code` 중복 | 0 / 0 (현재) | 그러나 `sync_academic.py` 에서 `codeKeyDuplicates`·`majorCodeDuplicates`·`usrMajorKeyDuplicates` 는 **REPORT_CHECKS(보고형)** — 다음 sync 에서 중복이 생겨도 공개된다 → 교정 1 |
| 라벨 조인 커버리지 | 유형·비NULL 상태·전공 코드 미조인 0. `major_stat` NULL 4,035행. `MAJOR_TYPE 9` 만 `use_yn<>'Y'`(원천 행 0) | 라벨 NULL 은 상태 NULL 에서만 생긴다 |
| 학생 신분 | `dc_v_usr_major_inf` uid 16,890명 전부 `user_ty_cd='0001'`. `local_usr_inf` uid 0 | 뷰 안 반결합 불필요(1-4). 테스트 학생은 `majors=[]` |
| 학생당 행 | 전체 최대 17, 재학·휴학 중앙값 1·p99 4·최대 9. `(intg_uid,major_seq)` 중복 2,755쌍 | 정렬 `major_seq, type_code` 두 열 필수. 응답 크기 영향 미미 |
| `CREATE OR REPLACE VIEW dc.academic_student_details`(+4열) | 성공. 기존 12열 이름·타입·순서 동일, ACL `dc_app=SELECT` 유지, `dc_app` 으로 새 4열 SELECT 성공 | 추가 GRANT 불필요 |
| 새 열 원값 품질(학생 106,108행) | `age`·`enter_dt` 100% 유효 8자리 날짜(출생 1934~2010, 미래 0). `isu_smt_cnt` 음수·소수 0(최대 30). `grad_exp_ym` 형식 위반·빈 문자열 0. **`tel` 공백만 115행** | API 는 `strip()` 후 빈 값 → `None`(교정 3). 날짜 검증은 방어로 유지 |
| 소비처 | `growth.py`·`jobs.py`(2)·`programs.py`·`survey.py`·`students.py`·`academic_students.py` 모두 열 명시, `SELECT *`/`x.*` 없음 | 열 추가가 export·스냅샷·멱등 표에 새지 않는다 |
| 작업 트리 | `backend/app/academic_students.py`·`src_admin/data/academicStudents.ts` 에 **미커밋 변경**: `graduationExpectedMonth`(같은 파싱이 detail 안에 따로 있음), `majorName`(주전공, `academic_people ⋈ academic_organizations lvl='3'` 점조회 1개 추가) | rev 1 의 `expectedGraduationMonth` 와 이름 충돌·파서 이중화 → 교정 2. `majorName` 은 지시서 범위 밖 → 필수 조건 5 |

### 1-2. 교정 1 — 다전공 뷰 조인을 LATERAL LIMIT 1 로

rev 1 의 평범한 LEFT JOIN 은 현재 데이터에선 행이 불지 않지만, 유일성을 보장하는 것은 DB 제약도 sync 차단 검사도 아니다. 다음 동기화에서 코드표에 같은 `(MAJOR_TYPE, 1)` 이 두 줄 생기면 학생의 다전공이 조용히 두 배가 된다. rev 2 는 세 조인 모두 `LEFT JOIN LATERAL (… ORDER BY … LIMIT 1) ON true` — 원천 1행 = 뷰 1행이 구조로 보장되고, 동률일 때 사용 중(`use_yn='Y'`) 라벨·`sort_no` 순으로 결정적이다.

부수 효과로 더 빠르다. 최다 17행 학생에서 rev 1 은 플래너가 `dc_v_major_inf` 782행을 순차 해시해 **1.08ms**, rev 2 는 세 조인 모두 인덱스 점조회(Memoize)로 **0.20ms**(generic plan 0.21ms 동일). 행 0 학생은 둘 다 0.05ms.

### 1-3. 교정 2 — 공통 함수 하나, 한 SQL 문, 키 이름 하나

- 위치: `growth.py` 의 기존 `academic_contact(conn, uid)` 를 넓혀 0023 연락처 + 이번 6필드 + `foreigner` 를 **한 SQL 문**으로 읽고 가공 dict 를 돌려준다. `academic_students.py` 는 이를 import 해 기존 `details` 점조회를 대체한다(growth 는 academic_students 를 import 하지 않으므로 순환 없음). `student_contact.py` 는 「연락 퍼널」 집계 모듈이라 목적이 다르다.
- 쿼리 수: rev 1 은 두 엔드포인트 모두 +1(다전공 별도 쿼리). rev 2 는 다전공을 상관 서브쿼리 `jsonb_agg(… ORDER BY major_seq, type_code)` 로 같은 문장에 실어 **+0**. 실측 0.3ms(dc_app, 최다 17행). 이득은 왕복 1회(로컬 ~0.2ms)보다 **한 스냅샷**이다 — READ COMMITTED 에선 문장마다 스냅샷이 달라, 두 문장 사이에 sync 공개가 끼면 새 세대의 다전공과 옛 세대의 학사 행이 섞일 수 있다.
- 키 이름: `graduationExpectedMonth` 로 통일(미커밋 백엔드·admin 타입이 이미 사용, 기존 `graduationMonth` 와 접두가 맞는다). 미커밋 `detail()` 안의 중복 파싱은 지운다.
- `profile_dto` 는 dict 를 펼치지 않고 **명시 키 10개만** 고른다 — 공통 함수가 `foreigner` 를 함께 만들기 때문에, 펼치면 학생 응답 계약이 바뀐다.

### 1-4. 학생 신분 필터 — 넣지 않는다

반결합 `EXISTS (… academic.usr_inf … user_ty_cd='0001')` 는 `usr_inf` 가 source∪local UNION 뷰라 점조회 비용이 작지만, (a) 원천 uid 가 전부 학생이고 (b) 호출처 2곳이 학생·범위 검사를 통과한 uid 로만 점조회하며 (c) 180 `academic_student_core_competency` 도 같은 형태다. 방어는 COMMENT(「API must apply student access scope」)와 「호출처 2곳 한정」 필수 조건으로 둔다.

### 1-5. 0023 경계 점검

| 경로 | 새 6필드 | 근거 |
|---|---|---|
| 본인 `GET /growth/profile`·`/portfolio` | 나간다 | `owner` 일 때만 `academic_contact` 호출(불변) |
| 교직원이 읽는 같은 두 GET | 안 나간다 | `owner=False` → `academic=None`(불변) |
| `PATCH …/growth/profile` 응답·`dc.idempotency` | 안 나간다 | `profile_dto(student,row,owner)` 에 contact 미전달(불변) |
| `GET /academic-students/{id}` | 범위 안 교직원만 | 범위 검사·`optional` 분기 뒤에서만 helper 호출. 범위 밖은 helper 를 부르기 전 404 |
| ROSTER·목록·메타·export·`resolve_student`·`/bootstrap/profiles`·`students.profile`·명단 엑셀·설문·포트폴리오 문서·지원 스냅샷 | 안 나간다 | 코드 변경 대상 아님. 열 명시 선택이라 뷰 열 추가가 새지 않음 |

## 2. 필수 조건 (승인 전제)

1. 181 은 rev 2 §3-1 SQL 그대로: `SET LOCAL lock_timeout='5s'`, details 는 180 12열 뒤에 4열만(OR REPLACE), majors 뷰는 **LATERAL LIMIT 1 세 개**·COMMENT·`REVOKE ALL FROM PUBLIC`·`GRANT SELECT TO dc_app`. `security_invoker` 를 켜지 않는다. academic 스키마 인덱스·176/179/180 뷰·`sync_academic.py` 는 수정하지 않는다. 롤백 주석에 180 정의 SQL 을 적는다.
2. 공통 함수는 `growth.academic_contact` 하나(한 SQL 문, 다전공은 `jsonb_agg` 상관 서브쿼리). 호출처는 **본인 GET 2곳 + 범위 검사 뒤의 `academic_students.detail` 1곳**뿐. 가공 규칙(날짜 검증·`strip()`·라벨 폴백·코드 키 비노출)은 이 함수 안에만 둔다.
3. `profile_dto` 는 `academic` 에 명시 키 10개만 싣는다(`foreigner` 없음). PATCH 응답·멱등 저장은 계속 `academic=None`.
4. 졸업예정 키는 두 엔드포인트·두 프론트 타입 모두 `graduationExpectedMonth`. 미커밋 `detail()` 의 별도 파싱은 제거.
5. 작업 트리의 미커밋 `majorName`(주전공) 변경은 팀장이 (a) 0024 범위·테스트에 명시 편입하거나 (b) Sol 착수 전 되돌린다. 승인·테스트 없는 필드를 섞어 커밋하지 않는다.
6. 계약 테스트 rev 2 §4 의 1~5 와 **6(행 증식 방지)·7(비노출 문자열: 교직원 GET·404·목록·export·PATCH·재생·`dc.idempotency`)·8(키 집합 고정)·10(정렬)** 을 반드시 둔다. 0023 의 `academic == {...}` 동등 단언은 새 dict 로 교체하고 부분집합 단언으로 느슨하게 바꾸지 않는다. 하나라도 빠지면 미승인으로 본다.
7. 팀장 검증 §5 의 `dc_app` 로컬 Docker 실행, `GET /academic-students/{id}` 전후 시간 비교, 다전공 보유 재학생 화면 확인을 생략하지 않는다.

## 3. 예상 주요 query 와 인덱스

| 모양 | 사용처 | 인덱스·계획 | 실측(웜, jit=off) |
|---|---|---|---|
| `academic_student_details WHERE intg_uid=$1`(10열) + `majors` 상관 `jsonb_agg` | `academic_contact`(본인 GET 2곳·학사 상세) | `ix_dc_v_usr_inf_intg_uid` + `local_usr_inf_pkey` → `ix_dc_v_usr_major_inf_intg_uid` → Memoize 된 `ix_dc_v_major_inf_major_code`·`ix_dc_v_code_inf_code` 점조회 | 0.3ms(최다 17행) |
| `academic_student_majors WHERE student_uid=$1 ORDER BY major_seq,type_code` 단독 | (참고) | 같음 | 0.20ms, 행 0 학생 0.05ms, generic 0.21ms |
| rev 1 평범한 LEFT JOIN 뷰 | (기각) | `dc_v_major_inf` 782행 Seq Scan+Hash | 1.08ms |
| details 점조회(기존 0023) | — | 위와 같음 | 0.09ms |

8천 명 규모에서 이 경로는 사람이 화면을 열 때 1건씩이다. 목록·export·부팅 루프에는 들어가지 않으므로 N+1 이 없다. 기준선(상세 API 53~79ms) 대비 증가는 서브 ms 로 예상한다 — 팀장 검증에서 확인.

## 4. 위험 · migration · rollback

- **잠금**: OR REPLACE 는 `academic_student_details` 에 AccessExclusive — 학사 목록·명단 엑셀·설문 읽기가 잠깐 대기한다. `lock_timeout='5s'`, 실패 시 재시도.
- **추가형**: 기존 열·뷰 불변, 새 뷰는 읽기 전용. seed·backfill 없음.
- **원천 무결성**: 학번당 학사 1행은 sync 차단 검사가 보장(0023 그대로). 다전공 라벨·전공명 중복은 LATERAL 로 흡수, 다전공 키 `(intg_uid,major_type,major_seq)` 중복은 보고형이라 중복 시 같은 다전공이 두 번 보일 수 있다(현재 0, 화면 표시만 영향 — 비차단 권고 2).
- **개인정보**: 생년월일·집전화의 새 노출은 본인과 `students.1` 메뉴 교직원·0022/179 범위 안 교수·조교의 상세 1건 조회 — 사용자 확정 범위(2026-11-27). 대량 경로 미개방.
- **rollback**(forward-only 관례, 수동, 순서 중요): API 원복 → `DROP VIEW dc.academic_student_majors;` → 의존 뷰 0 확인 → `DROP VIEW dc.academic_student_details;` → 180 정의 `CREATE VIEW` → `GRANT SELECT ON dc.academic_student_details TO dc_app;`.
- **재실행**: 원장이 한 번만 적용. 원장 밖 재적용 금지(`CREATE VIEW` 가 실패).
- **서버**: 미적용. 서버 반영은 사용자 지시가 있을 때만.

### 비차단 권고 (팀장 판단)

1. **취소·포기·이수 실패 다전공 표시**: 최대 9행(재학생)이 헤더 한 칸에 「·」로 이어지면 읽기 어렵다. 학사 값을 숨기지 않는다는 원칙은 유지하되, 화면 정렬을 상태 활성(01·02·03) 우선으로 하거나 `title` 전체 + 칸에는 활성만 보이는 방식을 고려. 업무 의미를 바꾸는 선택이면 사용자 확인.
2. **sync 차단 검사 승격 후보**: `usrMajorKeyDuplicates`·`codeKeyDuplicates` 를 BLOCKING 으로 올릴지는 `sync_academic.py` 소유 작업에서 판단(이번 범위 밖, 수정 금지).
3. **type_code 정렬은 문자열**: 현재 코드 1~9 한 자리라 문제없다. 두 자리 코드가 생기면 `'10'<'2'` — 그때 `sort_no` 기준으로 바꾼다.
4. **열람 기록 없음**: 0023 비차단 2 와 같다. 생년월일까지 열리므로 접속기록 요구가 있으면 `DB.md` §9 후보.

## 5. JSON 호환성 테스트 항목

- 본인 `GET /students/{id}/growth/profile`·`/portfolio` `profile.academic`: 정확히 `{mobile,email,postCode,address,homePhone,birthDate,admissionDate,completedSemesters,graduationExpectedMonth,majors}`. 문자열 키는 string|null, `completedSemesters` int|null, 날짜 `YYYY-MM-DD`, 졸업예정 `YYYY-MM`, `majors` 는 `[{typeLabel:string, majorName:string, statusLabel:string|null}]`(없으면 `[]`). 최상위 키 집합 불변.
- 교직원이 읽은 같은 두 GET·PATCH 응답·재생 응답: `academic=null`.
- `GET /academic-students/{id}`: 기존 키 + 6키(같은 타입), 팀장이 편입하면 `majorName`(string|null). 목록 항목 키·export 헤더 불변.
- 학사 행 없는 학생: 본인 `academic=null`, `optional=true` 상세 `null`.

## 6. Sol 실행 순서

1. 작업 트리 미커밋 변경 처리(필수 조건 5 — 팀장 결정 반영).
2. `backend/migrations/181_academic_profile_more.sql` — rev 2 §3-1 그대로. 격리 DB 적용.
3. 테스트 먼저(rev 2 §4): 열 계약·dc_app(1·12) → 행 증식 방지(6) → 본인 GET 값·형식·경계(2·3·9·10) → 비노출·PATCH·멱등(4·7) → 상세·목록·export·키 집합(5·8) → fixture `None`(11).
4. `growth.academic_contact` 확장(한 SQL·가공 규칙) → `profile_dto` 명시 10키.
5. `academic_students.detail` 의 details 점조회를 helper 호출로 교체, 6키 추가, 중복 파싱 제거.
6. 프론트(rev 2 §3-3), `npx.cmd tsc -b`.
7. 격리 전체 회귀 → 기준 실패 집합(`dc_regression_20261127010942_aba24e_test`, 10건) diff 0. `implementation.md` 에 이 리뷰와 다르게 간 곳 명시.
8. 팀장 검증(rev 2 §5).
