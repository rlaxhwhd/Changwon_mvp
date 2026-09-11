# 학사 원본 복제

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

매일 새벽 운영 배치로 전환하기 전 BRDB 실제 제공 뷰·추출 완료 시각·키를 확인하고,
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
