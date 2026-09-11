# E5 구현 세부 확정

revision 4 기술 보완. 기존 E5 업무 목적과 권한은 동일하다.

- 기간 기본값은 KST 오늘까지 최근 30일, 양 끝 날짜 포함. SQL 범위는 `[from 00:00 KST, to+1일 00:00 KST)`. 역전 또는 366일 초과 기간은 422.
- 카드 4개: 진단 참여 학생(DONE distinct student), 상담 신청 건수, 비교과 신청 건수, 채용 지원 건수. 시드의 개설 프로그램·채용 공고·가짜 로드맵 비율은 사용하지 않는다.
- deltaValue는 직전 동일 기간 대비 절대 건수 차이의 크기, deltaUnit=count, 감소는 down, 동률은 up. spark는 같은 기간의 8개 구간.
- 접속 통계 traffic=null. UI는 집계 준비 중으로 표시한다.
- dashboard.ts는 현재 소비처가 없다. 기존 관리자 진입 화면 SystemManagement의 menus 탭 상단에 기존 admin-card 스타일로 작은 운영 현황 영역을 연결한다. 새 라우트나 디자인 시스템을 만들지 않는다. 페이지는 loader/selector를 통해 읽고 loading/error를 표시한다.
- 팝업 정렬은 pinned DESC,posted_at DESC,id. 기존 시드 순서를 보존한다. 순서 변경 전용 UI는 이번 범위가 아니다.
- 기본 NOTICE 목록과 POPUP 목록을 분리하고 기존 notice 응답 계약을 보존한다.

검토: 위 선택은 승인된 API 계약의 미정 경계와 미연결 소비처를 구체화한다. 신규 table이나 권한 확대가 없다. Astra 승인 revision 4에 포함한다.
