# counsel-requests (검색/필터 바) — 리뷰 (통합)

> Phase 4·5 병렬 감사 통합본. 세부는 `review-design.md`(§4)·`review-content.md`(§5).
> 범위: Codex가 추가한 갭 1건 = design.png ⑤ 검색/필터 바.

## 4단계: 디자인·유지보수 (design-reviewer · opus) — **PASS (4/4)**

- [PASS] 디자인 토큰 drift — 신규 CSS(`index.css` 1427–1464) 전부 `var(--color-*)`/`var(--radius-*)`/`var(--shadow-*)`. hex·새 폰트 0, `:root` 무변경. px는 위치·크기만.
- [PASS] JSON 동적·하드코딩 — `query`/`typeFilter`는 입력 상태, 옵션 3개는 `CounselRequestType` enum 라벨, `list`는 로더 파생 `all`에서만 필터. 데이터 리터럴 0.
- [PASS] 단일 소스·범위 — 버튼 기존 `.counsel-primary-btn`/`.counsel-outline-btn` 재사용, `counsel-filter`는 대상 2파일에만. "하지 말 것" 위반 0.
- [PASS] 코드 품질 — `selectedDate` 재사용(중복 상태 X), 미사용 import·죽은 코드 0, `tsc --noEmit` EXIT 0.

## 5단계: 내용 정합성 (content-reviewer · opus) — **PASS (4/4)**

- [PASS] 컨트롤·라벨 — placeholder "이름, 학번 검색", 유형 옵션 라벨·value 스펙 일치, value가 스키마 enum(`진로취업`|`심리`)과 매칭.
- [PASS] 동작 정합 — 부분일치(대소문자 무시)·유형 필터·`selectedDate` 재사용(캘린더 동기화)·초기화 4항목 리셋·submit Enter 어포던스.
- [PASS] 용어·범위 — 회원/유저류 유입 0(`admin`=CSS 클래스, `user`=아이콘명), "하지 말 것" 미침범.
- [PASS] JSON 값 매핑 — 필터 결과 단일 `list` 파생이 헤더/푸터 "N건"·테이블·CSV에 반영. 하드코딩 카운트 0.

## 종합: **PASS** — 재작업 없음. 통합 완료.

## 검증 로그
- `npx tsc --noEmit` → EXIT 0 (팀장 재확인).
- 변경 파일 정확히 2건: `src_admin/pages/CounselRequests.tsx`, `src_admin/index.css` (mtime 스코프 체크로 확인, 스코프 이탈 0).
