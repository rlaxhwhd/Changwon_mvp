# 진단 결과표 데이터 계약

2026-09-08 사용자 제공 항목을 반영한다. 제공된 숫자는 **예시**이며 학생 점수로 적재하지 않는다.

| 검사 | 항목 코드 | 표시명 | 보조 명칭 |
|---|---|---|---|
| C2 | EXPERIENCE | 경험 지향형 | |
| C2 | REFLECTION | 반성적 관찰형 | |
| C2 | CONCEPTUALIZATION | 추상적 개념화형 | |
| C3 | DIRECTION | 진로몰입 수준 | Direction |
| C3 | ENRICHMENT | 네트워킹 활용능력 | Enrichment |
| C3 | FOUNDATION | 문제해결능력 | Foundation |
| C3 | INTERPERSONAL | 대인상호작용능력 | 별도 영문 명칭 미제공 |
| C3 | TARGET_FITNESS | 고용적합성 수준 | Target fitness |
| C4 | RESEARCH_ANALYSIS | Research & Analysis | |
| C4 | EMPLOYABILITY_BRANDING | Employability branding | |
| C4 | INTERVIEW_ARTICULATION | Articulation for interview | |
| C4 | EMPLOYMENT_STRATEGY | Design of Employment Strategy | |

C3의 대인상호작용능력은 독립된 다섯 항목 중 하나로 해석한다. C5·C6 결과 항목은 추가 예정이며 임의 생성하지 않는다. CCORE·C1은 이번 지시의 변경 대상이 아니다.

## 저장과 표시

- 정의: `dc.diagnosis_factor_definition`, 표시명: `dc.code_item`의 `DIAGNOSIS_FACTOR` 그룹. 관리자 `/admin/system`에서 기존 표시명을 수정할 수 있다. 항목 코드의 추가·변경은 검사 정의 변경이므로 배포로 관리한다.
- 결과: `dc.diagnosis_result`, 응시: `dc.diagnosis_attempt`. 결과의 `factors`는 `factorCode`, 응시 당시 `name`, `tScore`, 선택적인 `level`을 사용한다. 값이 없는 항목은 0점으로 만들지 않고 미등록으로 표시한다.
- C2·C3·C4 수준은 제공된 `level`을 표시한다. 이번 예시만으로 낮음·보통·높음 경계값이나 채점식을 확정하지 않는다.
- 기존 JSON 결과 원본은 DB에 보존한다. 기존 요인과 새 요인의 대응이 확인되지 않은 점수는 이름 유사성이나 배열 순서로 매핑하지 않는다.
- `PRECOMPUTED`는 응시 전 준비한 예시 결과다. 실제 완료 이력 및 학생 결과 조회에서 제외한다.
- `/development/diagnosis/{test_id}/complete`는 SSH 개발 환경의 검증용 기능이다. 기존 결과를 사용한 기록에는 `source=development:fixture`를 남긴다. 실제 검사·채점으로 표시하지 않는다. C5·C6는 이 기능으로도 생성하지 않는다.
- C2·C3·C4 예시 결과가 현재 항목에 대응하지 않으면 개발 테스트 기록도 거부한다. 점수표 항목 추가만으로 진단 완료 상태를 만들지 않는다.
- 학생 화면의 완료 판정은 DB의 응시 이력으로만 결정한다. 유형 존재 및 모듈의 공통 `recentAt`으로 완료를 추정하지 않는다.
- 검사 현황·요약·코멘트·권유는 `/api/v1/diagnosis/*`를 사용한다. 코멘트와 권유는 append-only이며 외부 SMS/메일 전송은 하지 않는다.

## 남은 연결

실제 문항·채점 엔진, 재응시 승인, 진단유형 변경 신청 업무는 별도 구현이 필요하다. 결과 항목의 명칭과 점수표 정의만으로 채점 엔진을 만들지 않는다.
