# review-content — 내용 정합성 리뷰

## 5단계: 내용 정합성 (content-reviewer)

기준: `ui-spec.md`(진실의 원천) 대비 Codex 구현의 **내용** 일치 여부. 디자인/코드 품질은 design-reviewer 담당. 정적 코드 대조로 감사. 소스 미수정.

---

### 1. 심리상담 필터 교정 (핵심) — **PASS**

- **seed `req_011`(김지연) 교정 확인.** `counselRequests.seed.json:104-115` — `"type": "심리"`(L109), `"assignedCounselorId": "psych_lee"`(L114)로 교정됨. ui-spec 구현범위 1·교정표 #3과 일치. 학과 "미디어커뮤니케이션학과 3학년", 주제 "스트레스 관리 및 심리적 안정" — 심리 유형과 정합.
- **진로취업상담사(김진로) 화면에 심리 행 미노출 — 로직으로 확증.** 접수함은 `getRequestsByAssignee(counselor.id)`로 필터(`CounselRequests.tsx:187`). 활성 상담사 기본값은 `COUNSELORS[0]` = `career_kim`(`counselors.ts:45`, `career_kim.json`). `req_011`의 `assignedCounselorId`가 `psych_lee`이므로 `career_kim` 접수함 배열에서 **제외**된다. 김진로 화면 심리 행 0건 성립.
- **데모 전환 시 이마음(psych_lee) 접수함에 노출 — 확증.** `req_011.assignedCounselorId === "psych_lee"` && `psych_lee.json`의 id가 `psych_lee`. 심리상담사 전환 시 접수함에 김지연 행 노출, `is-psych` 뱃지 적용(`CounselRequests.tsx:347` — `req.type === '심리'` 분기). 이미지의 부적합 데이터(진로취업 접수함에 심리 요청 노출)가 제거됨.
- 라이브 확인 권장: 실제 렌더에서 김진로→이마음 전환 시 행 이동 시각 확인(로직상 PASS, 렌더 미검증).

### 2. 추가 시드 req_012 / req_013 — **REJECT**

- **`req_013`(정유진) — PASS.** `seed.json:134-150`. 이름·학과 "컴퓨터공학과 4학년"·`studentId "201965432"`·`type "진로취업"`·`status "확정"`·`method "대면"`·주제 "면접 준비 및 자기소개서 피드백"·`requestedAt "2026-07-10T16:00:00+09:00"`·slot `{date "2026-07-10", start "16:00", end "16:40", place "진로취업지원센터 상담실 2"}`·담당 `career_kim`. ui-spec 구현범위 1과 **완전 일치**.
- **`req_012`(최우진) — REJECT (학과 불일치).** `seed.json:117-133`. 대부분 일치하나 **학과가 어긋남**:
  - ui-spec `구현 범위 1`(ui-spec.md:60): 최우진 · **"전기공학과 2학년"**.
  - 실제 시드(seed.json:121): `"studentMajor": "항공기계공학과 2학년"`.
  - 나머지(`studentId "202312345"`·진로취업·확정·대면·주제 "직무 탐색 및 포트폴리오 준비"·`requestedAt "2026-07-10T14:30:00+09:00"`·slot `{2026-07-10, 14:30, 15:10, 진로취업지원센터 상담실 1}`·담당 `career_kim`)는 스펙대로.
  - **수정 지시:** `seed.json:121`의 `"studentMajor"`를 `"항공기계공학과 2학년"` → **`"전기공학과 2학년"`**으로 교정(ui-spec 진실 기준). 화면 표현·파생값에는 영향 없으나(학과는 표시 스냅샷 문자열) 기획 확정값과 어긋나므로 내용 정합성 REJECT. 만약 팀장이 "항공기계공학과"로 값을 바꾸기로 재확정했다면 ui-spec을 갱신해 원천을 일치시켜야 함.

### 3. 용어·이름 교정 — **PASS**

- **상담사명 JSON 파생.** 담당 태그 `getCounselorById(req.assignedCounselorId)?.name`(`CounselRequests.tsx:351`), 프로필 `counselor.name`(`GNB.tsx:90,100,130`). `career_kim.json.name`="김진로", `roleLabel`="진로취업상담사". "김상담" 하드코딩 **없음**(전 파일 grep 대상 부재 확인). 교정표 #2 준수.
- **부적합 용어 유입 없음.** 대상 6개 파일에서 "회원/유저/user/admin user"류 용어 미검출. 학생 셀은 `studentName`/`studentMajor`/`studentId`로 "학생" 도메인 일관. 교정표 #9 준수.
- **"상담 진행" 정적 사이드바 메뉴 미추가 — PASS.** `navConfig.ts:42-46` counsel.children = 신청 접수함·일정·예약·완료 상담 내역 **3항목 유지**. "상담 진행" 항목 부재. 사이드바는 `section.children` 순회 렌더(`SectionSidebar.tsx:46`)라 정적 추가 없음. 교정표 #4·네비게이션 절 준수.

### 4. 페이지 내용 — **PASS**

- **제목/부제 — PASS.** "신청 접수함" / "학생들이 신청한 상담 요청을 확인하고 관리할 수 있습니다."(`CounselRequests.tsx:257-258`). ui-spec 페이지 내용과 일치.
- **필터탭 라벨 — PASS.** `TABS = ['전체','대기','확정','완료','취소']`(`CounselRequests.tsx:24`), 기본 활성 '전체'(L199). ui-spec과 1:1.
- **캘린더 범례 — PASS.** "해당 날짜의 상담 신청 건수"(`CounselRequests.tsx:316`). 캘린더 제목 "상담 신청 캘린더"(L280), 월 표기 "{YYYY}년 {M}월"(L286), 오늘 버튼(L287) — 스펙대로.
- **빈 상태 문구 — PASS.** "선택한 날짜의 상담 신청이 없습니다." + "다른 날짜 또는 상태를 선택해 주세요."(`CounselRequests.tsx:336-337`). 스펙대로.
- **"오늘의 상담 현황" 카드 4라벨 — PASS.** `SectionSidebar.tsx:56-59`: "신청 접수"·"오늘 상담"·"상담 완료"·"취소". ui-spec 신규 카피와 일치. counsel 섹션 한정 노출(L32 `section.id === 'counsel'`).
- **상대시간 "N분 전 신청" 형식 — PASS(합성 방식 주의).** 렌더 결과는 `{formatRelativeTime(req.requestedAt)} 신청`(`CounselRequests.tsx:342`) → "N분 전 신청"/"N시간 전 신청"/"N일 전 신청" 텍스트 생성. 단, ui-spec 파생값 표(L122)는 `formatRelativeTime`이 `"+신청 접미"`까지 반환한다고 기술했으나 실제 함수는 접미 없이 "N분 전"만 반환(`counselRequests.ts:49-54`)하고 TSX가 " 신청"을 덧붙임. **최종 표시 문자열은 스펙과 동일**하므로 내용 정합성 PASS(구현 위치 차이는 design-reviewer 코드 관점 참고 사항).
- **푸터 문구 — PASS.** "© {연도} Changwon National University"(`Layout.tsx:16`), 연도 `new Date().getFullYear()` 파생(L6). 교정표 #5·페이지 내용 신규 푸터와 일치. 하드코딩 연도 없음.

### 5. JSON 값 매핑 (파생값) — **PASS**

전 수치가 `getRequestsByAssignee(counselor.id)` 단일 배열에서 파생 — 하드코딩 리터럴 없음.

- **현황 카드 4수치 — PASS.** `getTodaySummary`(`counselRequests.ts:65-75`): `total`=배정 건수, `todaySessions`=오늘(`currentDateKey`) slot이면서 확정+완료, `completed`=완료, `cancelled`=취소. ui-spec 파생값 정의(L123)와 계산 일치. 자리만 있고 빈 값 없음(`dd`에 실수치 바인딩, `SectionSidebar.tsx:56-59`).
  - 데이터 대조(김진로 배정 = req_001,002,003,004,005,009,010,012,013 총 9건): `total`=9, `completed`=1(req_005), `cancelled`=0. `todaySessions`는 `currentDateKey`(=오늘, 시스템 날짜)에 의존 — 시드 slot이 2026-07-10에 몰려 있어 시스템일이 2026-07-10일 때 확정+완료(req_003·004·012·013 = 4건) 카운트. 값은 데이터·오늘 날짜에서 정상 파생(자리표시 0/오매핑 아님).
- **벨 뱃지 — PASS.** `countPendingByAssignee(counselor.id)`=대기 건수(`counselRequests.ts:78-80`, `GNB.tsx:18`), `pendingCount > 0`일 때만 렌더(L77) → 0이면 숨김. ui-spec 교정표 #8·파생값 정의 일치. 김진로 대기(req_001,002,009,010)=4 → 뱃지 "4". 이미지의 임의값 "8" 미유입.
- **상대시간 — PASS.** `req.requestedAt`(ISO)에서 파생(`counselRequests.ts:44-54`), NaN 방어(L46). 정적 "신청" 라벨이 아닌 실데이터 파생.
- **상태 필터탭 카운트 / 캘린더 날짜별 뱃지 / "N건"·"총 N건" — PASS.** 각각 `counts`(L208-212)·`dateCounts`(L214-221)·`list.length`(L321,373)로 all 배열 파생. 리터럴 없음.
- **담당 태그 매핑 — PASS.** `getCounselorById(req.assignedCounselorId)?.name ?? '미배정'`(`CounselRequests.tsx:351`) — 미배정 폴백까지 방어. 빈 값 노출 없음.

---

## 종합 판정

**REJECT (1건) — `req_012` 최우진 학과가 ui-spec "전기공학과 2학년"과 불일치(시드는 "항공기계공학과 2학년"). `seed.json:121` 교정 필요.** 핵심 항목인 심리상담 필터 교정(항목 1)은 완전 통과 — `req_011`이 `type:"심리"`+`assignedCounselorId:"psych_lee"`로 교정되어 진로취업상담사(김진로) 접수함에서 로직상 제외되고 심리상담사(이마음) 접수함으로 이동함. 나머지 항목(용어·이름·페이지 카피·JSON 파생값) 전부 PASS. 학과 문자열 1건만 교정하면 내용 정합성 완전 통과.
