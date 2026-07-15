# counsel-requests — 리뷰 (통합)

> Phase 4·5 병렬 감사 통합본. 세부 근거는 `review-design.md`(§4)·`review-content.md`(§5) 참조.
> 범위: Codex가 구현한 갭 5건(seed 교정·상대시간·현황 카드·벨 뱃지·푸터).

## 4단계: 디자인·유지보수 (design-reviewer · opus) — **PASS**

- [PASS] 디자인 토큰 drift — 신규 4요소(벨 뱃지·푸터·현황 카드·상대시간) 전부 `index.css :root` 토큰만, hex·px 팔레트·새 폰트 유입 0
- [PASS] JSON 동적·하드코딩 — 셀렉터 3종을 기존 `counselRequests.ts`에 추가, 전부 `getRequestsByAssignee` 한 배열 파생, 리터럴 0
- [PASS] 단일 소스 — 이름은 counselors JSON, 산발 localStorage 0, navConfig counsel children 정확히 3개("상담 진행" 미추가)
- [PASS] 컴포넌트 재사용·범위 — `CounselRequests.tsx` 수술적 변경, 중복 컴포넌트 0, `src_v2/`·학생 파일 무변경
- [PASS] 코드 품질 — `npx tsc --noEmit` 통과, 미사용 import 없음
- **종합: PASS**

## 5단계: 내용 정합성 (content-reviewer · opus) — **REJECT 1건 → 재작업**

- [PASS] **심리상담 필터 교정(핵심)** — seed `req_011` `type:"심리"`+`assignedCounselorId:"psych_lee"` 교정 확인. 접수함 `getRequestsByAssignee(career_kim)` 로직상 김진로 화면에 심리 행 0건. 데모 전환 시 이마음 접수함에 노출(`is-psych` 뱃지). 이미지 부적합 데이터 제거됨.
- [REJECT→FIXED] **추가 시드 `req_012`(최우진) 학과** — seed "항공기계공학과 2학년" ≠ ui-spec "전기공학과 2학년". 나머지 값(학번·유형·상태·slot·담당) 전부 스펙대로. → Codex 1줄 재작업으로 "전기공학과 2학년" 교정.
- [PASS] `req_013`(정유진) — 완전 일치
- [PASS] 용어·이름 교정 — 상담사명 JSON 파생(김진로), "김상담" 하드코딩 없음, 회원/유저류 유입 없음, "상담 진행" 정적 메뉴 미추가
- [PASS] 페이지 내용 — 제목·부제·필터탭 5·범례·빈상태·현황 카드 4라벨·상대시간·푸터 전부 스펙대로
- [PASS] JSON 값 매핑 — 현황 4수치·벨 뱃지·상대시간 전부 데이터 파생, 빈 값·오매핑 없음
- **종합: REJECT(1) → 재작업 후 재검증 대기**

## 경미 참고 (리젝 아님)

- `formatRelativeTime`은 "N분 전"만 반환하고 TSX가 " 신청"을 합성 → 최종 표시 문자열은 스펙과 동일(무해).
- 항목 1 상담사 전환 시 행 이동은 로직상 PASS, 라이브 렌더 확인은 권장(gstack /browse는 `_workspace` 크롬 덤프 함정으로 이번 감사에선 미사용).

## 운영 권고

- `src_admin/` 전체가 git 미추적(`??`)이라 이후 감사의 diff 격리가 안 된다. **`src_admin/`을 1회 커밋해 baseline 확보** 권장.
