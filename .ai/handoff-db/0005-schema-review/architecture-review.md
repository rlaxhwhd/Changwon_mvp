# Architecture review

판정: ASTRA_APPROVED (work-order revision 1의 기술 설계 범위)

새 엔티티나 점수 정책 없이 기존 복합 학생 FK와 낙관적 잠금을 재사용한다.
심리척도는 가변 JSON 배열로 유지하되 컨테이너 타입을 검사한다.
상담 사건 인덱스는 실제 requestId 필터·created_at/id 정렬을 지원한다.
예약 시각 CHECK는 날짜만 있는 직접 상담 기록과 호환된다.

수정 범위·정규화 판단·SQL 대응·위험/복구는 [DB 리뷰](../../../docs/DB_REVIEW_2026-09-16.md).
적용 순서: 백업/사전검사 → 신규 migration → API/웹 동시 배포 → 소유권/충돌/상담 기록 확인.
리뷰 승인은 운영 배포 또는 전체 테스트 PASS 판정이 아니다.
