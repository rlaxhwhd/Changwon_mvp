# 0006 — 메뉴관리 역할별 노출 설정 (work order)

상태: `LEAD_DIRECT` — 팀장(Claude Opus)이 직접 설계·구현·검증. Codex Astra/Sol 미투입(사용자가 Chrome MCP·postgres-patterns 를 지정해 즉시 작업 요청).

## 요구
`/admin/system/menus` 를 「역할 select → 그 역할이 보는 페이지 목록 → 노출 허용 토글」로 바꾼다.
역할: 학생·교수·조교·진로취업상담사·심리상담사·기업회원·외부회원.

## 데이터 판정
- 정본은 이미 있다: `dc.menu`(트리) · `dc.menu_auth`(역할↔메뉴, SY_MENU_AUTH 계승) · `dc.auth_role`.
- 없는 것 ① 역할별 menu_auth 쓰기 API (현재 읽기 전용 배열 `roles` 만 노출).
- 없는 것 ② 학생 포털 메뉴 행 — `src_v2/components/navConfig.ts` 하드코딩. → `portal='student'` 행을 시드하고 학생 GNB 가 `/metadata` 메뉴로 필터하도록 배선.
- 없는 것 ③ `student`·`company`·`external` 역할 행. `company`·`external` 은 포털이 아직 없어 토글 대상 메뉴가 0건 — 화면에 그 사실을 표시한다(임의 메뉴 생성 금지).
- 프론트 `src_admin/components/navConfig.ts` 의 하드코딩 `roles` 는 DB `menu_auth` 와 1:1 로 같음(2026-09-16 dev DB 대조) → 하드코딩 필터를 제거해 DB 를 단일 정본으로 만든다. 그렇지 않으면 토글이 거짓말이 된다.

## 스키마 (088 DDL / 089 DML 분리)
- `dc.auth_role` + `portal text NULL CHECK(portal IN ('admin','student'))`, + `version integer NOT NULL DEFAULT 1` (역할별 menu_auth 집합의 낙관적 잠금).
- `GRANT INSERT,DELETE ON dc.menu_auth`, `GRANT UPDATE ON dc.auth_role` TO dc_app.
- 089: auth_role 행(student/company/external, base_group=true), 기존 역할 portal 채움, 학생 메뉴 `stu-*` 시드(+menu_auth student). `stu-` 접두어는 admin 의 `diagnosis`·`counsel`·`roadmap`·`jobs` 와 PK 충돌을 피하기 위함.

## API
- `GET /system/auth-roles` — 관리 가능한 역할(AUTH0006 제외, is_active) `{role_code,label,portal,version}`.
- `PUT /system/auth-roles/{role_code}/menus` `{expectedVersion, menuCodes[], reason}` — 역할 행 `FOR UPDATE`, 409 버전 불일치, 422 AUTH0006/포털 없음/타 포털 메뉴/상위 미허용 자식, 집합 치환(DELETE 잔여 + INSERT 신규) → `auth_role.version+1` → `admin_event(entity='menu_auth', entity_id=role_code)`.
- `GET /metadata` — 학생(person.kind='STUDENT')이면 role `student` 의 메뉴를 준다.

## 프론트
- admin `SystemManagement` menus 탭: 역할 select · 트리 표(들여쓰기) · 체크박스(부모 해제→자식 해제, 자식 허용→부모 허용) · 변경 건수 + 사유 + 저장/되돌리기 · 행별 「명칭·순서」 인라인 수정(기존 PUT 재사용).
- admin `navConfig.getNavSections()` — `roles` 필터 제거, `/metadata` 메뉴만으로 판정.
- student `navConfig.getNavSections()` 신설 — `stu-` 메뉴로 필터·라벨·정렬, GNB 2곳이 사용.

## 검증
pytest(test_administration 추가) · `npx tsc -b` · Chrome MCP: 역할 전환·토글·저장→새로고침 반영, 교수 identity 로 GNB 변화 확인, 콘솔 오류 0 · 실패 요청 0.
