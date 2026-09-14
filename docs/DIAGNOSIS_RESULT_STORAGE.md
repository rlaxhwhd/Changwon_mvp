# 진단 종류·결과·숫자 점수 저장

2026-09-14, 마이그레이션 `069_diagnosis_numeric_scores.sql`.

## 구조

| 테이블 | 내용 |
|---|---|
| `dc.code_item` (`DIAGNOSIS_TEST`) | 진단 종류: CCORE, C1~C6 |
| `dc.diagnosis_factor_definition` | 진단별 평가 영역 코드·정의 버전 |
| `dc.diagnosis_attempt` | 학생·진단·응시 회차·진행 상태 |
| `dc.diagnosis_result` | 학생·진단·회차별 결과 원본 `payload`, 실시일, 출처 |
| **`dc.diagnosis_factor_score`** | 결과의 영역별 숫자 점수와 외부 판정 수준 |
| `dc.diagnosis_result_factor` | 기존 영역 연결 기록. 보존하지만 조회 API는 새 점수 테이블을 사용 |

새 테이블 주요 컬럼:

- 키: `student_uid`, `test_id`, `attempt_no`, `position`.
- 영역: `test_code`, `factor_code`, `definition_version`, `source_factor_code`, `factor_name`.
- **점수: `raw_score numeric`, `t_score numeric`, `percentile numeric`, `level text`.**
- 보존·검증: `raw_factor jsonb`, `validation_issues text[]`.

종류마다 별도 점수 테이블이나 가변 점수 컬럼을 만들지 않고, 평가 영역 하나를 행 하나로 저장한다. 학생 결과에는 `(학생, 검사, 회차)` 외래키로 연결한다. 영역 코드가 확인된 행은 영역 정의에도 외래키로 연결한다. 진단별 집계를 위한 `(test_code, factor_code)` 인덱스가 있다.

## 반입과 조회

외부 페이지에서 진단한 결과를 API로 받아 우리 DB에 저장한다는 확정 방향을 따른다. 외부 API 주소·인증·외부 결과 ID의 중복 및 개정 정책은 아직 정하지 않았으며 이번 작업에서 외부 수집 API를 만든 것은 아니다.

현재 내부 저장 형식 `payload.factors`의 `rawScore`, `tScore`, `percentile`, `level`을 숫자 컬럼과 수준 컬럼으로 옮긴다. 원본의 부가 필드도 `payload`와 `raw_factor`에 보존한다. 외부 실제 필드명이 다르면 후속 반입 어댑터에서 명시적으로 매핑해야 한다.

`diagnosis_result` INSERT 또는 payload UPDATE 시 트리거가 같은 트랜잭션에서 해당 회차의 점수 행을 다시 만든다. 점수 테이블은 원본의 조회·집계용 투영이므로 직접 편집하지 않는다. 결과를 수정하면 삭제된 영역도 투영에서 제거된다. 재응시는 별도 회차로 저장해 이전 결과와 섞이지 않는다. 외부 개정 이력 보존 방식은 수집 계약에서 정한다.

`GET /api/v1/diagnosis/students/{identity}`는 새 테이블의 숫자를 읽어 기존 `factors` 응답 형식을 유지한다. 학생·교직원 조회 권한과 미완료/PRECOMPUTED 결과 비공개 조건은 유지한다. 기존 JSON 전체를 새로 만들거나 기존 점수를 다시 계산하지 않는다.

## 결측·잘못된 값

- 없는 점수와 판정은 NULL이며 0점·보통 등으로 대체하지 않는다. 실제 0은 0으로 보존한다.
- 원점수와 T점수의 음수·범위를 임의로 제한하지 않는다. NaN·무한대·숫자가 아닌 값은 원본을 보존하고 숫자 컬럼에는 NULL과 검증 표시를 남긴다.
- 백분위는 0~100이다. 범위를 벗어나면 `INVALID_PERCENTILE`로 남긴다.
- 정의에 없는 영역도 삭제하지 않는다. `factor_code`는 NULL, 원래 코드·명칭·점수는 보존하고 `UNMAPPED_FACTOR`로 구분한다. 표시 이름의 유사도나 순서로 다른 영역의 점수에 연결하지 않는다.
- 수준·등급을 자체 산출하지 않는다. `level`은 제공된 외부 판정 문자열이다.

## 이관·검증

- 기존 결과 **8건의 영역 33개**를 숫자 점수 행으로 이관했다. 현재 원천에는 T점수만 있어 원점수와 백분위는 NULL이다.
- 전후 원본 payload 집계 해시가 일치했다: 원본 결과와 점수는 변경하지 않았다.
- 신규 회귀 테스트 7개 통과: 원본·소수점, 조회 응답, 결측/0/미연결 영역, 잘못된 값, 수정 시 동기화, 재응시/권한, PRECOMPUTED 비공개 및 개발 완료·멱등성.
- 기존 진단 테스트의 목록·코멘트·조회 횟수 관련 3개도 통과했다. 나머지 2개는 테스트 DB의 jiwoo가 미응시 초기 상태라는 전제와 충돌했다. 같은 비공개·완료 흐름은 신규 테스트의 독립 학생 fixture로 검증했다.
- 069 적용 후 재실행을 확인했다. 테스트 쓰기는 격리 DB에서 수행했다.
- 실제 로컬 API를 사용하는 관리자 학생 상세의 C3 결과 모달에서 T점수 59.68 표시를 확인했다. 브라우저 오류는 없었다.
- 로컬 DB 적용 전 백업: Git 제외 `_workspace/backups/dreamcatch-before-diagnosis-numeric.dump`. Oracle 변경 없음.
