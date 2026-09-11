# dev 반응형 선별 이식

## 기준과 범위

- 기준: `dev`의 `76e5ebf`.
- 참고: `design`의 `15b803a → 2d1ec37` 변경분.
- 작업 브랜치: `feat/dev-responsive-port`.
- 전체 merge나 design 파일 덮어쓰기를 하지 않고, 미디어 쿼리를 비교해 변경 구간을 이식했다. dev에서 추가된 스타일은 유지했다.

## 적용

- 상단 메뉴: 761~1360px에서 두 줄 배치, 760px 이하 햄버거 메뉴와 터치 가능한 하위 링크.
- 메인·라운지: 좁은 화면의 열 수, 카드·배너·차트 배치, 내부 스크롤.
- 채용 목록·상세, 비교과 상세: 툴바, 카드, 배너와 지표의 줄바꿈.
- 상담: 기존 날짜·시간·예약 가능 판정·선택 함수를 모바일 요일/시간 선택기와 연결. 640px 이하에서 전환하며 선택 상태는 페이지가 계속 소유한다.
- 교수 상담: 모바일 요약 바의 데스크톱 최소폭을 해제했다.
- AI 맞춤채용·비교과 현황: dev의 기존 구조에 맞춘 작은 화면 CSS만 적용했다.
- 퀘스트·성장일지·미션 기록: 검증 중 확인한 최소폭과 필터 넘침을 CSS로 보정했다.

## 보존·제외

- `shared/`, `backend/`, `src_admin/`, `src_v2/data/` 변경 없음.
- API 클라이언트, 부팅·인증, 라우트, 권한·단계 제한, 데이터 타입, 의존성과 배포 설정 변경 없음.
- 상담 3개 TSX는 모바일 선택기 import, 폭 판정 hook, 기존 달력을 감싼 렌더링 분기만 추가했다. 기존 본문은 코드 구조 비교로 확인했다.
- design의 AI 맞춤채용 필터 개편, 비교과 현황의 새 마크업·계산, 아이콘 교체, 전역 머리글 여백 통일 등은 제외했다.
- JSON 시드와 localStorage 저장 구현을 복원하지 않았다.

## 검증

- 변경 전·후 `npm run build` 통과.
- 변경·추가 TS/TSX 5개 파일 ESLint 통과. `git diff --check` 통과.
- TypeScript AST를 이용해 모바일 추가 부분을 제거한 상담 화면의 코드가 dev 원본과 동일함을 확인했다(주석·공백 제외).
- 로컬 API에 테스트 계정으로 로그인해 화면을 확인했다. 업무 데이터의 조회는 기존 백엔드 경로를 사용했다.
- Chromium에서 아래 20개 경로를 360, 390, 640, 641, 760, 761, 768, 1024, 1360, 1361, 1440px로 확인했다. 실행 오류 없음. 검사 중 발견한 넘침을 수정했고 미션 기록은 360/390/480/481/768px에서 재확인했다.
  - `/main`, `/lounge`, `/counsel/career`, `/counsel/psych`, `/counsel/professor`
  - `/jobs/joblist`, `/mypage/programs`, `/jobs`, `/growth/program`, `/growth`
  - `/growth/quest`, `/growth/journal`, `/growth/mission`, `/growth/mission-log`, `/jobs/home`
  - `/jobs/home/consulting`, `/counsel/record`, `/diagnosis/employment`, `/mypage/attendance`, `/roadmap/request`
  - 위 경로는 모두 `/v2` 접두사를 붙인다. 현재 계정의 단계 제한 화면도 포함한다.
- 모바일 메뉴, 채용 정렬·필터, 비교과 상태 필터·상세 모달, 채용·비교과 상세 배너를 조작·확인했다.
- 상담 3종에서 모바일 선택 → 1024px 달력 → 640px 선택기 전환 후 날짜·시간 유지와 예약 불가 버튼 비활성화를 확인했다.
- 상담 3종의 기존 POST 요청에 선택한 시간과 담당자가 담기고, 실패 응답이 폼에 표시되는 것을 확인했다.

## 검증의 한계

- 실제 테스트 계정의 이번 주 예약 가능 시간이 없어, 선택·제출 검증에는 브라우저에서만 `/counsel-slots` 응답을 대체했다. 다른 업무 조회는 실제 API를 사용했다.
- 상담 POST는 브라우저에서 가로채 409 테스트 응답을 반환했다. DB에 상담 기록을 만들지 않았으며 저장 성공·재조회까지의 검증은 하지 않았다.
- 실기기 Safari/iOS·Android와 모든 계정·데이터 조합에 대한 검증은 포함하지 않는다.
- 원본 worktree와 dev/design 브랜치, 원격 배포는 그대로다. 검토·후속 적용 대상은 이 작업 브랜치다.

## 검토

`git diff dev...feat/dev-responsive-port -- src_v2`로 이식한 코드만 비교할 수 있다.
작업 worktree는 `C:/Users/njob/Desktop/Changwon_mvp-responsive`이며, 이번 세션의 미리보기는 `http://127.0.0.1:5175/v2/main`이다.
