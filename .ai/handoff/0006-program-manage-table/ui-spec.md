# 비교과 프로그램 관리 테이블 + 총회차·담당자 등록 — UI 스펙

> 레퍼런스 이미지(대학 비교과 관리 목록 테이블) 기반. 상담사에 **프로그램 목록(카드) ≠ 프로그램 관리(테이블)** 두 뷰를 둔다.
> **주의:** `ProgramForm.tsx`는 `.pf` 팔레트로 재설계된 상태([[project_programform_uimd_palette]]) — **팔레트·기존 필드 보존**, 필드만 추가.

## 현황 (Phase 0)
- 상담사 nav '비교과 운영' children = 프로그램 목록(/programs)·프로그램 등록(/programs/new)·블랙리스트. `/programs`는 지금 **공유 4×N 카드**(학생과 동일, handoff 0005).
- `ProgramForm`은 이미 **회계년도·운영기간(운영 시작~종료)** 입력을 받지만 `handleSave`가 이를 **저장 안 함**(title·desc·category·접수기간(startDate/endDate)·capacity·location·status만 저장). 총회차·담당자 필드 없음.
- 스키마 `Program`: id·title·desc·category·startDate·endDate·runStartDate?·runEndDate?·capacity·location·status·applicants·createdAt·image?.

## 1) 스키마 + 폼 저장 보강
**`src_admin/data/schema/program.ts`** — `Program`에 추가:
- `sessions: number` (총회차)
- `manager: string` (담당자)
- `fiscalYear: string` (회계년도, 예 "2026")
- (runStartDate/runEndDate는 이미 있음)
`blankProgram()`에 `sessions: 1, manager: '', fiscalYear: String(new Date().getFullYear())` 추가.

**`ProgramForm.tsx`** (.pf 팔레트 보존, 필드만 추가):
- **총회차** 입력(숫자, `type="number" min=1`) — 기존 pf 필드 스타일 따름.
- **담당자** 입력 — 상담사 목록에서 select(있으면) 또는 텍스트 입력. `getActiveCounselor`/counselors 활용 가능.
- **handleSave 수정** — 지금 버리는 값들을 저장하도록: `runStartDate`(폼 운영 시작일)·`runEndDate`(운영 종료일)·`fiscalYear`·`sessions`·`manager` 를 `addProgram({...})`에 포함. (접수기간=startDate/endDate 기존 유지.)

**seed(`programs.seed.json`)** 2건에 `sessions·manager·fiscalYear` 추가(예: sessions 3/1, manager "김진로"/"이하늘", fiscalYear "2026").

## 2) 네비 + 카드→공고내용
- **`navConfig.ts`**: '비교과 운영' children에 **'프로그램 관리'** 추가 — `{ label: '프로그램 관리', path: '/programs/manage', icon: LuList }` (프로그램 목록 다음). 아이콘은 목록과 구분되게(예 목록=LuLayoutGrid/기존, 관리=LuTable/LuClipboardList — react-icons/lu 실존명만).
- **`App.tsx`**: 라우트 `{ path: '/programs/manage', element: <ProgramManage /> }` 추가.
- **카드 클릭(프로그램 목록)** → `/programs/:id`(ProgramDetail) 이미 동작. **ProgramDetail이 공고내용을 보이게 보강**: 제목·분류·설명·**접수기간·운영기간·총회차·담당자·장소·정원·상태** 표시(현재 title·desc·신청자 위주 → 공고 필드 추가). 관리(신청자·출석)는 유지.

## 3) 프로그램 관리 테이블 페이지 (신규 `ProgramManage.tsx`)
카드 아님 — **레퍼런스 스타일 리스트/테이블.**
- 헤더: 제목 "프로그램 관리" + [프로그램 등록](/programs/new) 등 기존 액션.
- 테이블 컬럼: **번호 · 회계년도 · 프로그램명 · 총회차 · 운영기간(runStartDate~runEndDate) · 모집인원(capacity) · 신청인원(applicants.length) · 운영상태 · 담당자(manager)**.
- **운영상태 = 파생**(운영기간 vs 오늘): `오늘<runStart`→운영전 / `runStart≤오늘≤runEnd`→운영중 / `오늘>runEnd`→운영완료. (runStart/End 없으면 '—' 또는 status 폴백.) 상태별 색 칩(admin-chip 계열, 새 색 금지).
- 행 클릭 → `/programs/:id`(ProgramDetail).
- 데이터 = `getPrograms()` 단일소스. `.admin-roster`/`.admin-table` 기존 톤 재사용, 하드코딩 0.
- **이번 제외(데이터 모델 없음)**: 선발인원·수료인원·고정·상단 필터바·엑셀·개인/그룹 등록 구분. (후속 가능.)

## 하드룰
- JSON 동적, 하드코딩 데이터 0, 단일소스 `getPrograms()`.
- 디자인 토큰(src_admin) 준수, 새 팔레트 금지. ProgramForm .pf 팔레트·기존 필드 보존.
- 상담사 아이콘은 react-icons Lucide(실존명만), 학생 src_v2는 손대지 않음(프로그램 목록 카드는 0005 그대로).

## 완료 기준
1. `npx tsc --noEmit` + `npm run build` 통과.
2. 폼에서 총회차·담당자·운영기간·회계년도 입력→등록→ 저장 확인(관리 테이블·상세에 반영).
3. '프로그램 관리' nav·페이지 동작, 레퍼런스형 테이블(운영상태·담당자 포함). 목록 카드 클릭→상세 공고내용.
4. 하드코딩 리터럴 0.
