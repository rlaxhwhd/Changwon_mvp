# 0006 — 구현 기록 (2026-09-16, 팀장 직접)

## 변경 파일
- `backend/migrations/088_menu_role_visibility_schema.sql` — `auth_role.portal`·`version`, `menu_auth` INSERT/DELETE, `auth_role` UPDATE 권한.
- `backend/migrations/089_menu_role_visibility_seed.sql` — 역할 student/company/external, 포털, 학생 메뉴 `stu-*` 42건 + menu_auth.
- `backend/app/administration.py` — `GET /system/auth-roles`, `PUT /system/auth-roles/{role}/menus`.
- `backend/app/metadata.py` — 학생(person.kind=STUDENT)은 역할 `student` 메뉴.
- `backend/tests/test_administration.py` — 2건 추가(역할별 치환·409/422/404/403, 학생 metadata 반영).
- `backend/scripts/rebuild-test-db.sh` — 컨테이너가 `POSTGRES_PASSWORD_FILE` 로 떠서 `printenv POSTGRES_PASSWORD` 가 비어 `set -e` 로 조용히 종료되던 것 수정(비밀 파일에서 읽음).
- `src_admin/pages/MenuVisibility.tsx`(신규) · `SystemManagement.tsx`(메뉴 탭 교체, 옛 MenuForm 이동) · `SystemManagement.css`.
- `src_admin/components/navConfig.ts` — 하드코딩 `roles` 제거, `getNavSections()` 무인자. 호출 3곳(GNB·SectionSidebar·PageCrumb) 갱신.
- `src_v2/components/navConfig.ts` — `getNavSections()` 신설(`stu-` 메뉴로 노출·라벨·순서), `GNB.tsx` 2곳 사용.
- `DB_SCHEMA.md`(088·089) · `CLAUDE.md` 이벤트 표 1행.

## Astra 승인 설계와 다른 곳
Astra 리뷰 없이 진행. 리뷰 시 볼 곳: (1) `menu_auth` 집합 치환의 잠금 = `auth_role` 행 `FOR UPDATE` + version, (2) 상위 미허용 자식 422 를 서버에서도 강제, (3) 학생 메뉴 `stu-` 접두어(PK 충돌 회피).

## 검증
- pytest 전체 269 passed / 2 skipped(학사 미러 standalone) — 새 test DB.
- `npx tsc -b` 통과.
- Chrome MCP: 교수에게 `jobs`·`jobs.0` 허용 저장 → identity `cse-1` GNB 에 「채용공고」 등장 → 원복. 학생 `stu-jobs.4` 해제 → /v2 GNB 「기업정보 플랫폼」에서 공지사항 사라짐 → 원복. 콘솔 오류 0, 실패 요청 0. API: auth-roles 12ms · menus 21ms · metadata 27ms(curl, 로컬).
- 메뉴 탭 초기 조회가 2회 나가는 것은 React StrictMode(dev) 이중 마운트 — 다른 화면과 같다.

## 미결(사용자 확인 필요)
- 기업회원·외부회원은 포털이 없어 메뉴 0건. 어느 포털·어떤 페이지를 줄지 정해지면 `dc.menu` 시드만 추가하면 된다(화면·API 변경 없음).
- 학생 포털 로그인 화면이 `dc_active_staff` 를 지운다(기존 동작) — 같은 브라우저에서 두 포털을 오가면 admin 쪽 세션이 풀린다. 이번 범위 밖.
