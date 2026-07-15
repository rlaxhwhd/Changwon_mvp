# review-content — counsel-requests (검색/필터 바)

## 5단계: 내용 정합성 (content-reviewer)

> 기준: `ui-spec.md`(진실의 원천) 대비 Codex 구현의 **내용** 일치. 디자인/코드 품질은 design-reviewer 담당(제외). 정적 코드 대조, 소스 미수정.
> 대상: `src_admin/pages/CounselRequests.tsx` (285–314 폼, 200–250 상태/필터, 227–237 list), `src_admin/data/schema/counselRequest.ts`.

### 1. 컨트롤·라벨 — **PASS**
- 검색 placeholder "이름, 학번 검색" — `CounselRequests.tsx:291` ✓ (aria-label "이름 또는 학번 검색" `:292`)
- 유형 옵션 라벨·value — `:301-303`
  - `value="전체"` → "전체 유형" ✓
  - `value="진로취업"` → "진로취업 상담" ✓
  - `value="심리"` → "심리상담" ✓
  ui-spec 20–33행 마크업과 라벨·value 문자열 정확히 일치.
- "검색" 버튼 라벨 — `:312` ✓ / "초기화" 버튼 라벨 — `:313` ✓
- 유형 value ↔ 스키마 enum 일치 — `counselRequest.ts:7` `CounselRequestType = '진로취업' | '심리'`. 옵션 value `진로취업`·`심리`가 enum과 정확히 일치. 타입 캐스트도 `'전체' | CounselRequestType`로 일관(`:298`). ✓

### 2. 동작 정합 — **PASS**
- 이름·학번 부분일치(대소문자 무시) — `:231-236`. `query.trim().toLowerCase()` 후 `studentName.toLowerCase().includes()` OR `studentId.toLowerCase().includes()`. 공백이면 전체 통과. ui-spec 40행·57-59행과 동일. ✓
- 유형 필터 `req.type` 비교 — `:230` `typeFilter === '전체' || req.type === typeFilter`. ✓
- 날짜 = 기존 `selectedDate` 재사용 — `:308` `value={selectedDate}`. 신규 날짜 상태 없음(state 선언 `:200-209`에 `query`·`typeFilter`만 추가, 날짜는 재사용). onChange가 `updateSelectedDate`(`:239-243`)로 `selectedDate`+`month` 동기화 → 캘린더 양방향 공유. ui-spec 42행 준수. ✓
- 초기화 = query/typeFilter/selectedDate/tab 리셋 — `resetFilters` `:245-250`: `setQuery('')`, `setTypeFilter('전체')`, `setTab('전체')`, `updateSelectedDate(initialKey)`(selectedDate+month 월 동기화). ui-spec 44행의 4개 항목 전부 커버. ✓
- 검색 버튼 submit 어포던스 — `:285` `<form onSubmit={e => e.preventDefault()}>` + `:312` `type="submit"`. Enter 키 검색 성립, 라이브 필터라 submit은 no-op(죽은 버튼 아님). ui-spec 43행 준수. ✓
- list deps — `:237` `[all, selectedDate, tab, typeFilter, query]`. ui-spec 61행과 동일. ✓

### 3. 용어·범위 — **PASS**
- 부적합 용어 유입 없음. 회원/유저/고객/customer 매치 0건. `admin`은 CSS 클래스명(`admin-page`, `admin-page-head/title/desc`)에만, `user`는 Font Awesome 아이콘명(`fa-user-tie`)에만 등장 — 모두 기술 식별자이며 사용자 대면 문구 아님. 대면 카피는 "학생"(`:281` "학생들이 신청한…")·"상담사" 도메인 유지. ✓
- 범위 준수 — 추가물은 검색/유형/날짜/검색/초기화 컨트롤뿐. ui-spec "하지 말 것"(77–84행) 위반 없음: 상세 패널 신규 없음(기존 `SlotForm`/`ReassignForm` 유지 `:86-184`), "+등록/생성" 버튼 없음, :root 토큰 변경 없음(이 파일 무관), 아바타 이니셜/아이콘 없음(`:398` 빈 `counsel-person-photo` 플레이스홀더 유지). ✓

### 4. JSON 값 매핑 — **PASS**
- 데이터는 seed/localStorage 로더에서 파생(`getRequestsByAssignee`, `counselRequests.ts:39`). `studentName`/`studentId`/`type`는 스키마 필드(`counselRequest.ts:15-34`)로 실값 보유 — 검색·유형 필터가 빈 필드 대조가 아님. ✓
- 필터 결과 `list`(`:227-237`) 단일 파생이 하위 전부에 반영:
  - 헤더 "N건" — `:375` `<em>{list.length}건</em>` ✓
  - 푸터 "총 N건" — `:427` `총 {list.length}건` ✓
  - 테이블 행 — `:393` `list.map(...)` ✓
  - CSV — `:264` `list.map(...)` (엑셀 다운로드가 필터 결과만 내보냄) ✓
- 하드코딩 카운트 없음. (탭 배지 `counts[item]` `:327`은 상태별 전체 집계로 `all` 기준 — 필터 무관한 상태 카운트가 의도이며 ui-spec은 헤더/푸터/CSV만 요구, 범위 밖·정상.) ✓

---

## 종합: **PASS** (4/4 항목 PASS, REJECT 0)

ui-spec 대비 내용 정합성 완전 일치. 라벨·placeholder·유형 옵션 문자열이 스펙과 동일하고, 유형 value가 스키마 enum(`진로취업`|`심리`)과 정확히 매칭. 검색/유형/날짜/초기화 동작이 스펙대로이며 날짜는 기존 `selectedDate` 재사용으로 캘린더와 동기화. 부적합 도메인 용어 유입 없음, "하지 말 것" 범위 미침범. 필터 결과가 단일 `list` 파생으로 헤더·푸터·테이블·CSV에 하드코딩 없이 반영됨. 재작업 불필요.
