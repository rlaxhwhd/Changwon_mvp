# E0 + E2 구현 기록 — round 1

- 상태: `IMPLEMENTED_FOR_LEAD_REVIEW`
- 기준 작업지시서: `work-order.md` revision 4 (`READY_FOR_SOL`)
- migration: 추가 없음. 기존 `044_staff_profile_merge.sql`은 변경하지 않았다.

## 구현 결과

- `shared/staffDirectoryStore.ts`: 교수 그룹·교직원 목록은 export한 배열을 제자리 갱신해 모듈 평가 시점 참조가 API 적재 뒤에도 살아 있다. 교수 flat 디렉터리는 `role: professor`를 포함하는 서버 응답을 받아 `StaffUser` selector가 정상 조회한다.
- `shared/departmentStore.ts`, `src_admin/data/departments.ts`: 학과 배열을 제자리 적재하고 selector가 호출 시 현재 배열을 조회한다. 초기 빈 배열에서 만든 Map이 계속 비어 있던 경로를 제거했다.
- `backend/app/staff.py`: 학생 공개 교수 응답은 `empNo`·`email` 없이 최소 필드만 내고, flat 응답에는 관리자 adapter가 요구하는 `role`·`roleLabel`·`dept`를 붙인다. 상세 조회는 staff 전용, 프로필 수정은 본인 전용 optimistic version update로 유지한다.
- `backend/tests/contracts/test_staff_contract.py`: 상세 응답 exact shape, 학생 상세 거부, 본인 수정·stale 409·타인 수정 거부, flat 교수 타입/최소 노출, 한 교수의 복수 활성 조직 그룹 노출을 고정했다.
- `src_admin/data/departments.ts`, `src_v2/data/professors.ts`: DB loader 전환이 끝난 상태에 맞게 주석을 갱신했다.

## 검증

- `DC_DB_NAME=seed_retirement_resume_test .venv/Scripts/python.exe -m pytest tests/contracts/test_staff_contract.py -q` → `5 passed`.
- 저장된 resume test DB에는 seed를 재실행하지 않았다.
- 저장소 루트 `npm run build` → TypeScript project build 및 Vite production build 통과.

## 제한

- E1/E3 학생·지도교수 배정 및 bootstrap 변경은 round 2 범위라 수정하지 않았다.
- E0의 `growthJournal.seed.json` 줄바꿈/checksum 복원은 팀장이 별도로 처리한다.
