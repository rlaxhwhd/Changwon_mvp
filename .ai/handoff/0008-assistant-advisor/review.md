# 0008-assistant-advisor — 리뷰 종합

> 팀장(team-lead) 통합. 상세 판정은 분리 문서에 있다 — 4단계 `review-design.md` · 5단계 `review-content.md`.

## 최종 판정: **PASS** (재작업 1회 후)

| 단계 | 담당 | 1차 | 재검증 |
|---|---|---|---|
| 4 · 디자인·유지보수 | design-reviewer (Opus) | REJECT (화면 4건, 데이터층 전건 PASS) | **PASS** |
| 5 · 내용 정합성 | content-reviewer (Opus) | REJECT (seed 요건 1건) | **PASS** |

## 리젝 → 해소 이력

| ID | 결함 | 조치 | 확인 |
|---|---|---|---|
| D-1 | 카드 제목 16px/w400 · 카드 내부 5블록 간격 0px | `admin-card-head` 적용 + 탭·필터·툴바를 페이지 직속 형제로 | 17px/w800 · 22px 리듬 (실측) |
| D-2 | 모달 날짜 입력이 `.admin-select`라 무스타일(border/padding/radius 0) | `.admin-field`로 교체 | select와 동일 1px/10px 12px/12px/14px |
| D-3 | 툴바 버튼 좌측 몰림 · 간격 0px | `admin-page-head > admin-head-actions` (기존 6개 페이지 관행) | 우측 정렬 · gap 8px |
| D-4 | `enrollStatusClass` 고아 import (lint error) | 제거 | eslint 0 problems |
| C-1 | 경영학과 미상담 2명 → 독려 버튼 1개만 노출 (ui-spec §4-5 "학과당 3명" 미달) | seed 기록 1행 삭제 | 미상담 3(재학 2) · 버튼 2개 |

## 팀장 추가 지시 (리뷰 밖, 저장소 규약)

| 항목 | 근거 | 조치 |
|---|---|---|
| 데이터 4파일 헤더 주석 + `[DB-ready]` | `src_admin/data/` 20개 중 17개가 갖는 규약 (단일소스 역할 → 현행 DB 대응 → 전환 지점 → 금지사항) | 4파일 추가 |
| 필드별 JSDoc | `schema/counselRecord.ts`·`counselRequest.ts` 규약, ui-spec §4-1/§4-4 명시 | 스키마 2파일 보강 (팀장 직접) |
| 한 줄 길이 | 3,230자 → 저장소 지배 스타일(AssistantStudents·StudentList)은 정상 줄바꿈 | 최대 **108자** |
| `getProfessorStats` 스코프 누수 | 담당 학과 밖 학생 기록까지 집계 (SPEC §2 위반 소지) | 학생 id 집합 교차 필터. **부수 효과: 섹션1 건수 = 섹션2 횟수 합 구조적 보장** |
| 배정년도 옵션 stale | `useMemo([deptKey])`라 배정 후 신규 년도 미반영 | 매 렌더 파생 |

## 팀장 직접 수정 (nit, Codex 라운드 없이 마크업 이동)

| ID | 결함 | 조치 | 확인 |
|---|---|---|---|
| N-1 | 모달 두 필드 간격 0px | `admin-form-grid` 래핑 + 교수 필드 `admin-field-full` | gap 16px · 교수 select 478px 전폭 (반폭이었으면 최장 옵션 193px > 내부폭 190px로 잘림) |
| N-2 | "학생별 현황" 제목이 자기 탭보다 아래 | 제목을 탭 위 페이지 직속 형제로 이동 | 17px/w800 유지 (`.admin-card-head`는 카드 스코프 아님) |
| N-2a·b | 두 섹션 제목 정렬 23px 어긋남 · 근접성 역전 | "교수별 실적" 제목도 동일하게 카드 밖으로 | 두 제목 대칭 (left·간격 동일) |

## 검증 근거

- **렌더 실측**: gstack `/browse`는 이 Windows 환경에서 사용 불가(chrome-cdp가 macOS 경로 하드코딩)라 리뷰어가 headless Chrome + CDP(Node 24 내장 WebSocket)로 직접 구동해 computed style 단위 측정. 조교 **2계정 전부**(`asst_kim` 컴공 11/4/7 · `asst_park` 경영 5/3/3) 교차 오염 없음. 콘솔 error/warning 0.
- **정적**: `tsc --noEmit` exit 0 · 신규 6파일 eslint 0 problems · impeccable `detect.mjs` 신규분 0건 · `index.css` diff +7줄(신규 색상값 0) · seed 16건 스냅샷 드리프트 0건.
- **회귀**: 변경 파일이 ui-spec §4-7 허용 4건뿐. navConfig·counselRecord 계열·ProgramBlacklist·AssistantStudents·src_v2 화면 무수정.

## 오탐 정정 (기록)

1차 리뷰 중 관측된 `/assistant/advisor` → `/assistant/students` 리다이렉트는 **제품 결함이 아니라 검증 스크립트의 연속 `Page.navigate` 레이스**(`RoleHome`의 `<Navigate replace>`가 후속 내비게이션을 덮음). 단일 내비게이션으로 격리 재현해 라우팅 정상 확인.

## 별건 티켓 (이번 범위 밖)

- **P-1** `.admin-enroll-active` 배지 대비 **2.05:1**(WCAG AA 미달). pre-existing이며 `index.css` 토큰 블록에 `--tint-success-ink:#0B6B3A /* 6.07:1 */`가 "배지에 raw hex 금지" 주석과 함께 준비돼 있으나 미사용.
- **N-3** CSV 배정일자가 ISO → `YYYY.MM.DD`(화면 표시와 일치 방향). 스프레드시트 날짜 자동 인식이 필요하면 되돌릴 것.
- **연계 기회** `ProfessorAdvisees.tsx:5` 주석 *"지도학생을 소속 학과 학생으로 대체(현행 advisee 매핑 데이터 도입 전)"* — 이번에 만든 `dc_advisor_assign`이 그 매핑이다. 교수 화면을 연결하면 "조교 배정 → 교수 지도학생 등장" 흐름이 완성된다.
