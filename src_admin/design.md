# design.md
# CWNU 학생포털 관리자 디자인 시스템

---

# Project

**CWNU Student Portal Admin**

목표는 "대학 관리자 시스템"이지만 일반적인 ERP 느낌이 아니라

- Modern SaaS
- University Admin
- AI Dashboard
- Glass UI
- Clean Enterprise

를 합친 디자인이다.

---

Design Specifications (design.md)
1. Design System & Theme
Color Palette
Primary (Main): #1A56DB (신뢰감을 주는 딥 블루, 활성화 탭 및 메인 버튼에 사용)

Secondary (Sub): #EBF5FF / #F3F4F6 (연한 블루 및 그레이 계열 백그라운드)

Background: #F9FAFB (화면 전체 메인 배경색)

Card/Container Background: #FFFFFF (화이트 박스 저명도 그림자 포함)

Text Colors:

Primary Text: #111827 (대체로 타이틀 및 중요 텍스트)

Secondary Text: #6B7280 (설명글, 비활성화 요소, 데이터 라벨)

Status Colors:

Success/Increase (녹색): #10B981 (전월 대비 상승률, 재학 상태 태그)

Warning (주황/노랑): #FBBF24 (휴학 상태 태그)

Info (블루): #3B82F6 (졸업 상태 태그)

Typography
Font Family: Sandoll Gothic, Pretendard 또는 본고딕 계열의 깔끔한 Sans-serif 스킨

Font Weights: Regular (400), Medium (500), Bold (700)

Font Sizes:

Page Title: 24px (Bold)

Card Title / Section Title: 16px ~ 18px (Bold)

Data / Number Value: 20px ~ 28px (Bold)

Body / Table Text: 13px ~ 14px (Regular/Medium)

2. Layout Structure
Common Layout (Top Navigation Bar)
Left: CWNU 학생포털 관리자 로고 및 서비스명

Center: GNB 메인 메뉴 탭 (대시보드, 학생관리, 진단관리, 상담관리 등)

Hover/Active State: 하단에 두꺼운 블루 선 (#1A56DB) 표시 및 텍스트 굵게 처리

Right: 통합 검색창 (input[type="text"]), 알림 아이콘(배지 탑재), 관리자 프로필 정보 (아바타 이미지 + 이름/이메일)

3. Page Detail Specifications
Page 1: 대시보드 (Dashboard)
상단 타이틀 영역: "대시보드" 페이지명과 서브 가이드라인 문구 배치. 우측에 기간 필터(Date Picker)와 + 빠른 등록 액션 버튼 위치.

상단 요약 데이터 카드 (Metrics Cards): 6분할 레이아웃

포함 데이터: 전체 회원, 진단 참여자, 상담 신청 건수, 비교과 프로그램, 채용공고, 공지사항

구조: 상단 라벨, 중앙 메인 수치(Bold), 하단 전월 대비 증감율(화살표 아이콘 + 컬러링), 우측 원형 아이콘 백그라운드.

메인 콘텐츠 영역 (Grid):

좌측 (회원 가입 및 이용 현황): 선형 차트(Line Chart). 일간/주간/월간 세그먼트 버튼 제공. 이중 선 그래프(회원 가입자 vs 로그인 사용자).

중앙 (진단 참여 현황): 도넛 차트(Donut Chart). 중앙에 전체 수치 표시, 우측에 항목별 라벨 및 수치/퍼센티지 리스트 배치.

우측 (공지사항 퀵뷰): 카테고리 태그별 공지 제목 및 날짜 리스트. 상단에 더보기 > 링크 배치.

Page 2: 학생관리 (Student Management)
상단 타이틀 영역: "학생관리" 페이지명과 서브 문구. 우측에 + 학생 등록 버튼(Primary) 및 엑셀 다운로드 버튼(Outline Style).

검색 및 필터 바: 4열 구조 + 버튼 영역

검색창(이름, 학번 등 입력) / 전체 학년 드롭다운 / 전체 소속 드롭다운 / 전체 상태 드롭다운

검색(Blue) 버튼과 초기화 버튼 배치.

학생 상태 요약 바: 전체 학생, 재학, 휴학, 졸업, 탈퇴/제적 수치를 가로 한 줄로 심플하게 나열.

데이터 테이블 (Data Table):

Column 구성: 번호, 학번, 이름, 아이디, 이메일, 소속, 학년, 상태, 가입일, 최근 로그인, 관리

디자인 특징:

상태 열은 상태값(재학, 휴학, 졸업)에 따라 배경색이 들어간 둥근 라운드 태그 스타일 적용.

관리 열은 톱니바퀴 아이콘(설정) 배치.

네비게이션/페이지네이션 (Pagination):

좌측: 전체 건수 표시 및 페이지당 보기 개수 선택 드롭다운 (10개씩 보기).

중앙: 이전/다음 화살표 및 페이지 번호 버튼 (선택된 페이지 블루 배경 처리).

4. Components & UI Elements Style
Buttons: 모두 border-radius: 6px ~ 8px 정도의 부드러운 라운드 적용. Primary 버튼은 텍스트 화이트 화 처리.

Cards / Paper: background-color: #ffffff, border-radius: 12px, 아주 은은한 그림자(box-shadow: 0px 4px 6px -1px rgba(0, 0, 0, 0.05)) 처리로 배경과 분리.

Tables: 테이블 헤더는 아주 연한 그레이 배경에 텍스트 중앙/좌측 정렬. 각 로우(Row)는 하단 보더(border-bottom: 1px solid #F3F4F6)로 구분하며 호버 시 미세한 배경색 변화 권장.