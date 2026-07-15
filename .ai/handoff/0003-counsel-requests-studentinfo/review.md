# counsel-requests 학생정보 열 개편 — 리뷰 (라이브 렌더 검증)

gstack `/browse`로 `/admin/counsel/requests` 실제 렌더 검증(1440·1920 뷰포트).

## 결과: PASS

- [PASS] 프로필 사진 제거 — 학생 정보 셀 = 이름·학과만.
- [PASS] 학번 별도 열 — 학생 정보 바로 뒤, 붙어서 표시(1920에서 두 셀 경계 gap 0px, 이전의 큰 빈 공간 제거).
- [PASS] 가로 스크롤 제거 — 1440(카드 682px)·1920(카드 927px) 모두 `scrollWidth == clientWidth`, overflow=false.
- [PASS] 관리 열 무잘림 — 버튼 3개(상세 보기·재배정·⋮) 실제 필요폭 156px 확보(이전 84px는 70px 잘림이었음).
- [PASS] 토큰 잠금·tsc — 새 색·폰트 0.

## 반복(디자인-리뷰 루프)

1차 수정(학생정보 150px 고정 + 상담주제 1fr)은 1440에서 **관리 열 154px 필요 vs 84px 배정 → 70px 가로 넘침** 발견(브라우즈 측정). 
2차 수정: `grid-template-columns: 70px 120px 74px 88px minmax(48px, 1fr) 58px 156px` — 관리를 실제 필요폭으로 고정, 상담주제를 유일 신축(min 48)으로, 학생정보 120px(간격 최소). → 1280~1920 전 구간 무오버플로우 확인.

## 검증 명령(재현)
`browse js` 로 `scrollWidth>clientWidth`(overflow), 관리 셀 `scrollWidth`(need) vs `getBoundingClientRect().width`(got), 학생정보/학번 셀 경계 gap 측정.
