# 학사 원본 복제

## 전산원 DC_V_* 뷰 (2026-11-25 전환, migration 176 · handoff 0021) — 현재 원천

이 절이 현재 정본이다. 아래 「2026-09-11 기록」은 옛 9개 미러의 이력이며, 그 테이블은 롤백 경로로만 남아 있고 앱이 읽지 않는다(삭제 기한 `DB.md` §9 #46).

- **원천**: dreamcatch 계정 → `@V_BRDB` 링크 대상의 `INTRANET`(USR·ADD_JOB_PART·COL·DEPT·MAJOR·ORG·PART)·`REQUEST`(STU_SUGANG·SUBJ·CURRI·CAP·STU_CAP·USR_MAJOR·CODE·LECT_OPEN·LECT_CAP) 뷰 16개. 명세 `backend/academic/dc_view_columns.json`(`ALL_TAB_COLUMNS@V_BRDB` 2026-11-25, LECT_OPEN/LECT_CAP 은 엑셀 추정). SQL 은 메타 SELECT 1종 + 뷰별 명시 컬럼 SELECT 만 허용한다.
- **사본**: `academic.dc_v_<view>`(PK·NOT NULL 없음, 원본 중복 보존, CHAR 패딩 보존). 로컬 테스트 인원 `academic.local_usr_inf` 는 동기화가 건드리지 않고, `academic.usr_inf` 가 둘을 합친다(`origin` = source|local).
- **실행**(PowerShell, 저장소 루트 — 비밀번호는 Git 제외 secrets 파일, 값을 출력하지 않는다):

```powershell
$academicJdbc = Get-ChildItem "$env:APPDATA/DBeaverData/drivers" -Recurse -Filter 'ojdbc11-*.jar' | Select-Object -First 1 -ExpandProperty FullName
backend/.venv/Scripts/python.exe backend/scripts/sync_academic.py --source dc-views `
  --oracle-url 'jdbc:oracle:thin:@//203.246.1.146:1521/dream' --oracle-user dreamcatch `
  --oracle-password-file deploy/secrets/oracle_password_local `
  --jvm "$env:LOCALAPPDATA/DBeaver/jre/bin/server/jvm.dll" --jdbc $academicJdbc `
  --pg-password-file deploy/secrets/postgres_password_local
```

  옵션: `--query-timeout`(뷰별, 기본 120초) · `--long-query-timeout`(STU_SUGANG, 기본 1800초) · `--fetch-size`(기본 5000). Oracle 로그인 실패는 재시도하지 않는다(계정 잠금 위험).
- **절차**: 세션 advisory lock → 메타 대조 → 뷰마다 autocommit 세션 임시 테이블에 COPY 하며 순서 무관 가산 다중집합 해시(행 sha256 의 합 mod 2^256 + 행 수)로 원본 스트림과 사본을 대조 → 메타 재대조 → 공개 전 검사 → **짧은 공개 트랜잭션 하나**(큰 테이블부터 DELETE+INSERT, 마지막에 `dc.refresh_department_from_academic()`, `academic.sync_run` 기록 `source_label='DC_VIEWS'`) → 공개한 테이블 ANALYZE(STU_SUGANG 은 VACUUM ANALYZE).
- **중단(전체 미공개)**: 컬럼 드리프트, 지난 공개 때 행이 있던 뷰의 missing, 20% 초과 행 감소, 값 대조 실패, 학생(`USER_TY_CD='0001'`) INTG_UID 중복, DEPT_CODE 중복, COL_CODE 중복, **사본 USR 와 `local_usr_inf` 의 INTG_UID 충돌**. 실패해도 직전 공개본이 그대로 남는다.
- **건너뜀**: 원본에 없는 뷰는 `missing`, 처음 보인 엑셀 추정 뷰가 명세와 다르면 `drift_new`(그 뷰만, 명세 교체는 새 마이그레이션). (행 수, 해시)가 지난 공개와 같고 대상 행 수도 같으면 `unchanged`(DELETE+INSERT 생략).
- **보고만**: haksa.md §2 논리 키 중복 건수, 「같은 사번·다른 이름」 건수(`checks.empNoSharedByDifferentNames`). 행 값은 출력하지 않는다.
- **학과 투영**: `dc.department` = 학사 학과(`(COL_CODE, DEPT_CODE)`, `dept_code` 단독 유일). refresh 는 빈 원본이면 거부, 학과 단대 이동은 키를 제자리 UPDATE(학생·조직배정 FK `ON UPDATE CASCADE`, 배정·override 는 같은 문장에서), 사라진 학과는 삭제하지 않고 `is_active=false`, 마지막에 학사 출신 `dc.student` 의 학과 코드·라벨을 학사 값에 맞춘다. 바뀐 행은 append-only `dc.org_code_remap` 에 남는다. `course` = `CODE_INF(CODE_GRP='UNIV_CD')` 표시명.
- **로컬 적용 순서(고정)**: 백업 → `python -m app.migrate`(176) → `sync_academic.py --source dc-views` → `backend/scripts/seed_local_academic_test_students.sql`(리허설 후 `-v apply=true -v confirm_local=yes`) → `npm run docker:up` → 화면 검증. 176 만 적용하고 동기화 전이면 `dc.department` 는 C-코드 이관 대상 63행뿐이다.
- **SUGANG 비용**: 갱신마다 사본만큼 dead tuple 과 WAL 이 생긴다(첫 적재 실측은 아래). 현재 SUGANG 을 읽는 앱 경로는 없다.

### 첫 적재 결과 (로컬 `dreamcatch`, 2026-11-25)

- 1차 실행: 14개 뷰 스테이징·대조는 끝났으나 공개 트랜잭션의 학과 투영이 `DEPT_INF.USE_FLAG` NULL 행에서 `dc.department.is_active` NOT NULL 위반으로 실패 → **전체 롤백(공개 없음)**. migration 177 로 `is_active = COALESCE(USE_FLAG='1', false)` 수정.
- 2차 실행(177 적용 후): **14개 공개 · 2개 missing(LECT_OPEN·LECT_CAP)**, 컬럼 드리프트 0, 값 대조 전부 일치.

| 뷰 | 행 수 | 추출(초) |
|---|---:|---:|
| INTRANET.DC_V_USR_INF | 117,378 | 28.3 |
| INTRANET.DC_V_ADD_JOB_PART | 17 | 0.0 |
| INTRANET.DC_V_COL_INF | 16 | 0.0 |
| INTRANET.DC_V_DEPT_INF | 595 | 0.2 |
| INTRANET.DC_V_MAJOR_INF | 782 | 0.2 |
| INTRANET.DC_V_ORG_INF | 180 | 0.0 |
| INTRANET.DC_V_PART_INF | 875 | 0.1 |
| REQUEST.DC_V_STU_SUGANG_INF | 4,326,226 | 453.1 (스테이징 대조 포함 515.9) |
| REQUEST.DC_V_SUBJ_INF | 34,193 | 2.6 |
| REQUEST.DC_V_CURRI_INF | 54,092 | 5.5 |
| REQUEST.DC_V_CAP_INF | 390 | 0.1 |
| REQUEST.DC_V_STU_CAP_INF | 97,715 | 6.2 |
| REQUEST.DC_V_USR_MAJOR_INF | 23,133 | 2.2 |
| REQUEST.DC_V_CODE_INF | 352 | 0.1 |

- 공개 트랜잭션 11.5초, 공개 WAL 약 0.94GB(944,575,248 B). SUGANG 힙 418MB · 인덱스 62MB · 합계 480MB(첫 적재 — 갱신 후 dead tuple 로 약 2배 예상).
- 공개 전 검사: 학생 INTG_UID 중복 0 · DEPT_CODE 중복 0 · COL_CODE 중복 0 · 로컬 충돌 0. 보고: USR INTG_UID 중복 1(교직원) · SUGANG 논리 키 중복 32 · 같은 사번·다른 이름 1 · 그 밖 0.
- 학과 투영: `dc.department` 595(활성 389), 단대 이동 0, 단대 미연결 0, 학사 출신 학생 조직 정합 11건. 학생 로그인 투영 106,108(원본 106,101 + 로컬 7), 학과·단대 NULL 0.
- 3차(같은 날 재실행): 13개 `unchanged`(공개 1.1초, WAL 약 98MB), USR_INF 만 원본 값이 바뀌어 재공개(행 수 동일, UPD_DT 갱신 없음 — 재조회로 해시 결정성 확인). UPD_DT 로 증분 판정하지 않는다.
- 행 값은 콘솔·로그에 남기지 않았다(건수·코드·해시만). sync_run 의 뷰별 sha256 은 다음 실행의 `unchanged` 판정 근거다.

## 2026-09-11 기록 (옛 9개 미러 · 이력)

2026-09-11 사용자 지시에 따라 원본 Oracle에는 SELECT만 실행한다.
초기 원천은 기존 DREAMCATCH의 9개 학사 미러 테이블이며 BRDB 직접 연결이 아니다.
로컬 PostgreSQL `academic`에 원본 전체를 보존한다. 관리자 조회 화면은 `dc.academic_*`
읽기 모델을 통해 복제본을 조회한다. 기존 상담·배정 업무 테이블로의 자동 투영과
새벽 스케줄 등록은 아직 하지 않았다. LLM·GPA 정책도 변경하지 않는다.

## 구조와 검증

- `backend/academic/source_columns.json`: 실제 USER_TAB_COLUMNS로 확인한 174개 컬럼의 명세. 행 데이터 없음.
- `053_academic_mirror.sql`: 9개 원본 대응 테이블과 `academic.sync_run`. 스키마만 생성한다.
- `backend/scripts/sync_academic.py`: DBeaver Oracle JDBC 드라이버를 이용한 반복 실행 가능한 복제 도구.
- Oracle 실행 SQL은 코드에 고정된 컬럼 메타데이터 SELECT 1종과 명시적 컬럼 SELECT 9종만 허용한다. 임의 SQL·프로시저·쓰기·세션 변경·commit 호출이 없다.
- 원본 테이블마다 하나의 SELECT로 스트리밍한다. 모든 테이블이 동일 시점이라는 보장은 없다. 현재 계정의 `V$DATABASE` 조회 권한이 없어 전역 SCN을 확보하지 않았다.
- 문자열의 선행 0·공백·NULL을 보존한다. NUMBER는 JDBC BigDecimal → Python Decimal → PostgreSQL numeric으로 옮겨 float 반올림을 피한다. CHAR는 PostgreSQL varchar에 저장해 후행 공백을 보존한다.
- 소스 PK를 추측하지 않는다. 중복 행도 그대로 적재한다. 서비스용 인덱스·조인은 후속 투영 단계에서 결정한다.
- 임시 테이블 COPY 후 전체 행의 SHA-256 다중집합(중복 횟수 포함)을 소스 스트림과 대조한다. 행 순서와 숫자의 표시상 소수점 자릿수 차이는 무시한다.
- 9개 검증 완료 후 한 로컬 트랜잭션으로 공개한다. 오류는 전체 롤백한다. 이전에 데이터가 있던 테이블의 행수가 20% 넘게 감소하면 자동 반영을 거부한다.
- 배치끼리는 PostgreSQL advisory lock으로 직렬화한다. API 계정에는 원본 영역 접근 권한을 부여하지 않는다.
- 성공 이력·테이블별 행수·검증 해시는 `academic.sync_run`에 저장한다. 실패 시 프로세스는 1로 종료하며 원본 값·비밀번호를 로그에 출력하지 않는다.

## 로컬 실행 (PowerShell, 저장소 루트)

비밀번호는 Git 제외된 `deploy/secrets/oracle_password_local`과
`deploy/secrets/postgres_password_local`에서 읽는다. 명령행에 넣지 않는다.
먼저 기존 마이그레이션 도구로 053까지 로컬 DB에 적용한다.

```powershell
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements-academic.txt
$academicJdbc = Get-ChildItem "$env:APPDATA/DBeaverData/drivers" -Recurse -Filter 'ojdbc11-*.jar' | Select-Object -First 1 -ExpandProperty FullName
backend/.venv/Scripts/python.exe backend/scripts/sync_academic.py `
  --oracle-url 'jdbc:oracle:thin:@//203.246.1.146:1521/dream' `
  --oracle-user dreamcatch `
  --oracle-password-file deploy/secrets/oracle_password_local `
  --jvm "$env:LOCALAPPDATA/DBeaver/jre/bin/server/jvm.dll" `
  --jdbc $academicJdbc `
  --pg-password-file deploy/secrets/postgres_password_local
```

대상 호스트는 코드에서 `127.0.0.1`로 고정하며 기본 포트 15432, DB dreamcatch다.
다른 로컬 시험 DB는 `--pg-database`로 지정한다. 원본 조회 결과는 콘솔이나
Git 파일로 출력하지 않는다. 버전 관리에는 코드·스키마·집계 결과만 보관한다.

## 복구와 후속 연결

실패한 적재는 자동 롤백되어 마지막 성공 데이터가 유지된다. 성공한 스냅샷을
이전 상태로 되돌려야 한다면 보관한 로컬 pg_dump를 별도 DB에 복구하고 검증한 후
`academic` 데이터만 반영한다. 전체 업무 DB를 덮어쓰지 않는다.
053은 forward-only이며 되돌림이 필요하면 새 마이그레이션을 작성한다.

매일 새벽 운영 배치로 전환하기 전 12c 중계 DB(`V_BRDB` 링크 대상 — 학사DB 자체가 아니다, `CURRENT.md` §4-2)가 실제 제공하는 뷰·추출 완료 시각·키를 확인하고,
동일 시점 추출 계약과 실패 알림·백업 보존 정책을 연결한다. `dc`로 반영할 학사 소유
필드와 외부 상담사 등 로컬 소유 필드를 구분한 다음 서비스 조회를 전환한다.
현재 DREAMCATCH에서 0행인 수강·강의·학적 4개는 원천 데이터 공급이 필요하다.

## 최초 복제 결과 (2026-09-11)

실행 ID: `33c8c01a-ee3e-4861-b92a-b9099211b68d`.
로컬 `dreamcatch`에 053 적용 후 총 117,934행을 적재했다.

| 원본 → academic의 소문자 테이블 | 행수 |
|---|---:|
| V_USR_INF | 114,174 |
| V_DEP_INF | 1,688 |
| V_DEP_INF_ALL | 1,926 |
| V_ADD_JOB_PART | 17 |
| V_USR_INF_DUP_INF | 129 |
| V_SUGANG | 0 |
| V_LECT_INF | 0 |
| COM_HAKJUK | 0 |
| COM_HAKBYUNDONG | 0 |

임시 적재 값 대조 후 커밋했고, 별도 연결로 최종 테이블을 다시 전체 조회해
9개 모두 소스 스트림 해시·행수와 일치함을 확인했다. API 계정의 academic 접근은 없다.
원본 SQL 허용 목록, 문자열·정밀도·중복 보존, 실패 롤백 테스트 3개 통과.
적재 전 백업은 Git 제외된
`_workspace/backups/dreamcatch-before-academic-20260911-135355.dump`에 보관했다.

## 관리자 화면 연결 (2026-09-11)

- 경로: **회원관리 → 학사 인원·조직 조회**, `/admin/members/academic`.
- 교수·조교·직원·학생·졸업/학적 종료·미분류 인원을 통합 ID, 이름, 조직 코드로 검색한다. 처음에는 재직(`89`) 교수만 조회하고 전체 상태에서 과거 인원까지 조회한다.
- 조직은 `V_DEP_INF_ALL`의 1,926건을 보존하며 사용 중 1,282건을 기본 표시한다. 조직명으로 합치거나 코드 앞자리 0을 제거하지 않는다.
- 상담사 등록 `COM_CON_INF` **21건**, 담당 단대 `COM_CON_TAR` **325건**, 조교 담당 학과 `FU_ASS_DEPT` **202건**을 추가 복제했다. 추가 3개 테이블의 59개 컬럼, 중복, NULL, DATE 시각도 보존한다.
- 총 12개 원본 테이블, 233개 컬럼, 118,482행. 9개 학사 테이블과 추가 3개 테이블은 각각 별도 복제 실행이다.
- 추가 복제는 기존 명령에 `--staff-only`를 붙인다. `backend/academic/counselor_columns.json`의 고정 명세만 허용하며 054 마이그레이션이 필요하다.
- Oracle DATE는 시간대가 없는 `timestamp without time zone`으로 변환한다. JDBC LocalDateTime과 Python datetime의 값을 해시로 대조한다.
- 원본 `CONPWD`는 접근이 차단된 academic 보관 영역에만 존재한다. API 조회 뷰와 화면에는 포함하지 않는다.
- 055는 제한된 읽기 뷰, 056은 관리자 메뉴 등록이다. API 계정에 academic 스키마 권한을 주지 않는다. `/system/academic/*`는 시스템 관리자 권한을 검사한다.
- 목록에 존재한다는 이유로 로그인 계정·상담 가능 여부·학생 접근 범위를 생성하지 않는다. 기존 `dc.staff`, `dc.person`, 상담 이력과 수동 배정은 유지한다. 상담 구분 `CON_GB`의 미확정 의미는 원본 코드로 표시한다.
- 기본 30건, 최대 100건씩 조회하며 검색·상태 필터는 서버에서 실행한다. 갱신 후 읽기 뷰는 다음 요청부터 새 복제본을 읽는다.
- 검증: 읽기 전용 API 테스트 2개, 복제 테스트 3개, 빈 DB 56개 마이그레이션과 재실행, `tsc -b`, Chrome MCP 브라우저 왕복 통과. 재직 교수 1,883명, 재직 조교 104명, 상담사 21명과 필터·페이지 이동·검색 결과 없음 동작을 확인했다.
- 작업 전 백업: `_workspace/backups/dreamcatch-before-directory-20260911-140830.dump`. 복구 시 별도 DB에 복원하여 검증하고 이미 적용한 마이그레이션은 수정하지 않는다.
