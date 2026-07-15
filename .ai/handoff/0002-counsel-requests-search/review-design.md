# review-design — 0002-counsel-requests-search

## 4단계: 디자인·유지보수 (design-reviewer)

**종합 판정: PASS (4/4)** — 정적 코드 감사만 수행. 소스 무수정.
감사 델타: `src_admin/pages/CounselRequests.tsx` 검색/필터 바 + `src_admin/index.css` `.counsel-filter-*` 블록. 이전 review-design.md 없음(최초 감사).

---

### 항목 1. 디자인 토큰 drift — **PASS**

신규 CSS(`index.css` 1427–1464) 전 속성이 토큰만 사용. 하드코딩 hex·새 폰트 0.

- `.counsel-filter-bar` (1433–1436): `background: var(--color-bg)`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-sm)`. ✓
- 아이콘 (1443): `color: var(--color-caption)`. ✓
- 인풋/셀렉트/데이트 (1451–1454): `border: var(--color-border)`, `border-radius: var(--radius-md)`, `background: var(--color-bg)`, `color: var(--color-text)`. ✓
- focus (1462): `border-color: var(--color-primary)`. ✓
- 색 리터럴 hex 0건. `padding 16/18px`, `gap 12px`, `height 44px`, `left 14px`, `font-size 13/14px`는 위치·크기 px(허용 범위).
- `:root`(1–40) 무변경 — 토큰 값 자체 손대지 않음. ✓

### 항목 2. JSON 동적·하드코딩 — **PASS**

- `query`(201)·`typeFilter`(202)는 사용자 입력 상태. 데이터 리터럴 아님. ✓
- select 옵션 3개 `전체`/`진로취업`/`심리`(301–303) = enum 라벨. `CounselRequestType = '진로취업' | '심리'`(schema/counselRequest.ts:7)와 정확히 일치 — 기존 `TABS`와 동급의 열거 라벨(허용). ✓
- `list` useMemo(227–237)가 로더 파생 배열 `all`(= `getRequestsByAssignee(counselor.id)`, 188)에서 필터. 신규 필터 2개(유형 230, 검색 231–236)가 원본 데이터를 건드리지 않고 파생만. deps에 `typeFilter`,`query` 정상 포함(237). ✓
- 검색은 `studentName`/`studentId` 대소문자 무시 부분일치, 공백이면 전체 통과 — 스펙과 동일. CSV·헤더 `{list.length}건`·푸터가 `list` 파생이라 자동 반영(추가 배선 없음). ✓

### 항목 3. 단일 소스·범위 준수 — **PASS**

- 버튼은 기존 `.counsel-primary-btn`/`.counsel-outline-btn` 재사용(TSX 312–313). 신규 버튼 클래스 정의 없음. CSS 1463–1464는 `.counsel-filter-bar` 스코프 하위 `min-height: 44px` 정렬 modifier일 뿐 — 원본 정의(1645–1666)를 재정의하지 않음. ✓
- `counsel-filter` 클래스는 grep 결과 `index.css`·`CounselRequests.tsx` 2파일에만 존재 — 다른 페이지 오염 0. ✓
- ui-spec "하지 말 것" 전부 준수: 상세 패널 신규 없음(기존 `SlotForm`/`ReassignForm` 그대로 86–184), `:root` 미변경, `design.md` 미수정, 아바타 빈 플레이스홀더 유지(398 `counsel-person-photo` 빈 span), 등록/생성 버튼 없음, 테이블 컬럼·`src_v2/`·navConfig 무변경. ✓

### 항목 4. 코드 품질 — **PASS**

- `selectedDate` 기존 상태 재사용(203). date 인풋 `value={selectedDate}`(308) — 중복 날짜 상태 신설 없음. ✓
- `updateSelectedDate`(239–243)는 date 인풋(309)·`resetFilters`(249) 양쪽에서 호출 — 죽은 코드 아님. 캘린더 월 동기화(setMonth) 정상. ✓
- `resetFilters`(245–250): query=''·typeFilter='전체'·tab='전체'·`updateSelectedDate(initialKey)`(→ selectedDate·month 동시 리셋). 스펙 완전 일치. ✓
- 검색 버튼 `type="submit"` + form `onSubmit={preventDefault}`(285, 312) → Enter 검색 성립, 제출 no-op(죽은 버튼 아님). ✓
- 미사용 import·죽은 코드 0. `npx tsc --noEmit` **EXIT 0**(클린 통과). ✓

---

**결론:** 재작업 불필요. 4개 항목 전부 PASS. 팀장은 5단계(content-reviewer)로 진행 가능.
