-- 학생 상단바 「상담센터」 → 「학생상담센터」(2026-10-26 사용자 지시). 경로 표시는 navConfig 라벨이 같은 이름을 쓴다.
UPDATE dc.menu SET label='학생상담센터', version=version+1 WHERE menu_code='stu-counsel' AND label='상담센터';
