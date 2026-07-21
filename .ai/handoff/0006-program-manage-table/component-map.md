# 0006 프로그램 관리 컴포넌트 맵

- `src_admin/pages/ProgramManage.tsx`: `getPrograms()` 단일 소스를 사용하는 프로그램 운영 관리 테이블. 행 선택 시 `ProgramDetail`로 이동.
- `src_admin/pages/ProgramDetail.tsx`: 기존 출석·신청자 관리에 공고 내용 요약을 추가.
- `src_admin/pages/ProgramForm.tsx`: 기존 `.pf` 폼에 회차·담당자 저장 필드를 연결.
- `src_admin/data/schema/program.ts` 및 `programs.seed.json`: 운영 관리용 프로그램 메타데이터의 JSON 스키마·초기 데이터.
