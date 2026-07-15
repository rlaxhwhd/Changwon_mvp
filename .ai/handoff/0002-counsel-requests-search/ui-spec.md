# counsel-requests (검색/필터 바) — UI 스펙 (역할: counsel)

> **진실의 원천.** 참조 이미지 = `public/design.png`(상담사 포털 디자인 시스템 시트). 이미지는 레퍼런스일 뿐 — 이 문서가 우선(`.ai/interop.md` 하드룰 3).
>
> **재작성 금지.** 이 화면(`src_admin/pages/CounselRequests.tsx`)은 이미 이미지 구조(탭·캘린더·테이블·푸터·CSV)와 일치한다. 이번 handoff는 **단 하나의 갭 — design.png ⑤ "입력 필드"(검색/필터 바) 추가**만 수술적으로 구현한다. 나머지는 현행 유지.

## 배경 (Phase 0 진단 요약)

- 디자인 토큰(색·radius·shadow·spacing·타이포)은 `src_admin/index.css :root`가 이미 design.png와 일치(#0653B6 등). **토큰 변경 없음.**
- 사용자 결정: **검색/필터 바만** 추가. 상세 뷰(우측 "상담 신청 상세" 패널)는 이번 범위 아님 — 기존 인라인 `SlotForm`/`ReassignForm` 유지.
- 프로필 사진: 실사진 에셋 없음 → 기존 **빈 원 플레이스홀더 유지**(이전 세션 "빈칸" 결정 존중, 이니셜·아이콘 재도입 금지).

## 구현 범위 (갭 1건) — design.png ⑤ 검색/필터 바

`src_admin/pages/CounselRequests.tsx`에, **페이지 헤더(`admin-page-head`)와 상태 탭(`counsel-status-tabs`) 사이**에 검색/필터 바 1개를 추가한다.

### 마크업 (권장 구조)

```
<form className="counsel-filter-bar" onSubmit={e => e.preventDefault()}>
  <label className="counsel-filter-search">
    <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
    <input value={query} onChange={…} placeholder="이름, 학번 검색" aria-label="이름 또는 학번 검색" />
  </label>
  <select className="counsel-filter-select" value={typeFilter} onChange={…} aria-label="상담 유형">
    <option value="전체">전체 유형</option>
    <option value="진로취업">진로취업 상담</option>
    <option value="심리">심리상담</option>
  </select>
  <input type="date" className="counsel-filter-date" value={selectedDate} onChange={…} aria-label="상담 신청 날짜" />
  <button type="submit" className="counsel-primary-btn"><i className="fa-solid fa-magnifying-glass" /> 검색</button>
  <button type="button" className="counsel-outline-btn" onClick={resetFilters}><i className="fa-solid fa-rotate-left" /> 초기화</button>
</form>
```

### 상태·동작 (JSON 동적 — 하드코딩 금지)

| 컨트롤 | 상태 | 동작 |
|---|---|---|
| 이름·학번 검색 | `const [query, setQuery] = useState('')` | **라이브 필터.** `studentName` 또는 `studentId`에 대소문자 무시 부분일치. 값이 공백이면 전체 통과. |
| 상담 유형 선택 | `const [typeFilter, setTypeFilter] = useState<'전체' \| CounselRequestType>('전체')` | **라이브 필터.** `'전체'`면 통과, 아니면 `req.type === typeFilter`. (design ⑤ 컴포넌트 충실 재현. 접수함은 이미 담당자별 필터라 특정 상담사엔 단일 유형일 수 있으나 무해·정상 동작.) |
| 날짜 | **기존 `selectedDate` 재사용**(새 상태 만들지 말 것) | 캘린더와 양방향 공유. 입력 변경 시 `setSelectedDate(value)`, 그리고 값이 현재 표시 월 밖이면 캘린더가 하듯 `setMonth`도 동기화. |
| 검색 버튼 | — | `type="submit"`. 필터가 라이브라 제출은 no-op이지만 **Enter 키 검색**을 성립시키는 폼 제출 어포던스(죽은 버튼 아님). |
| 초기화 버튼 | — | `resetFilters()`: `query=''`, `typeFilter='전체'`, `selectedDate=initialKey`(데이터 파생 기본값)로 되돌리고 `month`도 `initialKey`의 월로, `tab='전체'`로 리셋. |

### `list` useMemo 확장 (기존 필터 체인에 2개 추가)

기존(현행 224–227행)에 유형·검색 필터를 더한다. deps에 `typeFilter`, `query` 추가:

```
const list = useMemo(() => all
  .filter(req => requestDate(req) === selectedDate)
  .filter(req => tab === '전체' || req.status === tab)
  .filter(req => typeFilter === '전체' || req.type === typeFilter)          // 신규
  .filter(req => {                                                          // 신규
    const q = query.trim().toLowerCase()
    if (!q) return true
    return req.studentName.toLowerCase().includes(q) || req.studentId.toLowerCase().includes(q)
  })
  .sort((a, b) => requestTime(a).localeCompare(requestTime(b))),
  [all, selectedDate, tab, typeFilter, query])
```

- **부수효과 자동 반영:** `downloadCsv`가 `list`를 쓰므로 필터 결과가 CSV·"총 N건"·테이블·푸터에 자동 반영된다(추가 배선 불필요).
- 헤더 `<em>{list.length}건</em>`·푸터 `총 {list.length}건`도 자동 갱신.

## 스타일 (index.css — counsel 블록 근처에 `.counsel-filter-*` 신규 추가)

**기존 토큰만 사용. 새 색·폰트 금지.** design.png "④ 버튼 / ⑤ 입력 필드 / 4. 모서리 반경(Buttons·Inputs 12px)" 준수.

- `.counsel-filter-bar`: `background: var(--color-bg)`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-sm)`, `padding: 16px 18px`, `display: flex`, `align-items: center`, `gap: 12px`, `flex-wrap: wrap`.
- `.counsel-filter-search`: `flex: 1 1 280px`, 내부 아이콘+인풋. 아이콘 `color: var(--color-caption)`. input `height: 44px`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-md)`, 좌측 패딩으로 아이콘 자리. focus 시 `border-color: var(--color-primary)`.
- `.counsel-filter-select`, `.counsel-filter-date`: `height: 44px`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-md)`, `padding: 0 12px`, `color: var(--color-text)`, `background: #fff`, `font-size: 14px`.
- 버튼은 **기존 `.counsel-primary-btn` / `.counsel-outline-btn` 재사용**(신규 클래스 금지). 필요 시 바 안에서 `height: 44px` 정렬만 맞춘다.
- 반응형: 좁은 폭에서 `flex-wrap`으로 줄바꿈(별도 미디어쿼리 불필요).

## 하지 말 것 (범위 밖 — 손대면 결함)

- 상세 패널(우측 "상담 신청 상세") 신규 구현 ✗ (사용자가 이번 범위에서 제외)
- 디자인 토큰(:root) 값 변경 ✗ (이미 일치)
- `src_admin/design.md` 텍스트 수정 ✗ (별개 이슈; 이번 작업 대상 아님)
- 프로필 아바타에 이니셜/아이콘 추가 ✗ (빈 플레이스홀더 유지)
- "+ 등록/생성" 버튼 추가 ✗ (상담사 접수함은 학생이 생성 — 부적합)
- 테이블 컬럼 축소·다른 페이지·`src_v2/`·navConfig 변경 ✗

## 완료 기준 (verify)

1. `npx tsc --noEmit` 통과.
2. 검색어 입력 → 이름/학번 부분일치로 행 필터.
3. 유형 선택 → `req.type` 필터. 날짜 입력 → 캘린더 선택과 동기화.
4. 초기화 → query/typeFilter/selectedDate/tab 기본값 복귀.
5. 하드코딩 데이터 리터럴 0, 신규 색 hex 0(토큰만).
