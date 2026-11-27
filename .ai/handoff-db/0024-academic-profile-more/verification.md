# 0024 팀장 검증 — PASS (2026-11-27)

판정: **PASS** (로컬 Docker 반영 완료, 서버 미배포). Astra 필수 조건 7개 충족. 동시 세션 `changwon-mvp-main-53` 과 소유 분담(work-order rev3·rev4) — 그 세션 커밋 `6779c96`(교직원 학생상세 재배치·주전공 `majorName`·`graduationExpectedMonth` 키) 위에서 2단계를 진행했고, `majorName` 은 0024 범위·커밋에 넣지 않았다(필수 조건 5).

## 1. 게이트

| 항목 | 결과 |
|---|---|
| `npx tsc -b` | exit 0 (팀장 재실행) |
| 대상 회귀(`academic_profile_display or academic_students or staff_academic_scope or growth or portfolio`) | 144 passed (Sol 2단계) |
| 격리 전체 회귀 | **10 failed / 807 passed / 2 skipped** (`dc_regression_20261127031348_374b5d_test`) — 0023 기준선 `…010942_aba24e_test` 와 실패 집합 diff 0. 통과 +8 = 0024 새 테스트 |
| `npm run docker:migrate` | 181 적용(`dc.schema_migration` 최신 181, 백업 `local-before-migrate-20261127031734011.dump`) |
| `npm run docker:up` | 전체 healthy. API DB 접속 `dc_app`(pg_stat_activity) |

## 2. 코드 경계(팀장 diff 리뷰)

- `growth.academic_contact` 한 함수·한 SQL(다전공 `jsonb_agg` 상관 서브쿼리, `major_seq, type_code` 정렬). 호출처 = 본인 GET 2곳 + 범위 검사·`optional` 분기 뒤 `academic_students.detail` 1곳. 가공 규칙(날짜 검증·집전화 strip·라벨 폴백·코드 키 비노출)은 이 함수 안.
- `profile_dto.academic` 은 `ACADEMIC_PROFILE_KEYS` 10키만(`foreigner` 없음). PATCH·멱등은 `academic=None` 불변.
- `detail()` 의 별도 `grad_exp_ym` 파싱 제거, 키·형식 유지. ROSTER·목록·export 불변.
- 181 SQL = rev2 §3-1(LATERAL LIMIT 1 세 개, COMMENT, REVOKE PUBLIC, GRANT dc_app, 롤백 주석에 180 정의).
- 다전공 표시 문자열은 `shared/growthStore.academicMajorText` 하나를 두 SPA 가 같이 쓴다(Sol 판단, 승인).

## 3. 화면·API 재측정 (ego-browser `C:/Users/njob/ego/academic-profile/round-04.mjs`, 학생 값 미출력)

기준(「전」)은 0023 검증 §3 의 「후」 값 — 그 뒤 해당 경로 변경은 동시 세션 `6779c96`(교직원 화면 배치)뿐.

| 동작 | 전 | 후 |
|---|---|---|
| 20262324 마이페이지 「학사 정보」 | GPA·이수학점까지 | +생년월일·입학일·이수학기 값, 다전공·졸업예정 「미입력」(정상 — local 행, 다전공 원천 없음·졸업사정 미등록) |
| 20262324 「연락처」 | 휴대폰·이메일·주소 | +집전화(빈 값) |
| 다전공·졸업예정 보유 재학생 마이페이지 | — | 다전공 3줄·생년월일·입학일(YYYY-MM-DD)·이수학기(n학기)·졸업예정(YYYY-MM)·집전화 모두 값 |
| 마이페이지 진입 호출 수(students·growth·portfolio) | 9 | 9(20262324) / 8(로드맵 없는 학생 — roadmap/events 없음) — 추가 API 없음 |
| 포트폴리오 응답(20262324) | 8.3KB | 8.4KB |
| 상담사 `GET /academic-students/{id}` (5회) | 53~79ms | 20262324 38~135ms(1회 변동), 다전공 학생 18~67ms. 0.6~0.9KB. 새 6키 형태 확인(날짜 9999-99-99, 졸업예정 9999-99, majors 키 typeLabel·majorName·statusLabel) |
| 교직원 모달 인적사항 표(1280px) | 성명·학번/주소/생년월일·성별/핸드폰·이메일 | +집전화 행, 8칸 모두 값 |
| 「기본사항」 탭 | 단과대학…평균평점·외국인 | +입학일·이수학기·다전공(3줄, colSpan 3, 왼쪽 정렬) — 11칸 모두 값 |
| 1280px 가로 넘침 | — | 문서 폭 1280 = 창 폭, 표 scrollWidth = clientWidth |
| 콘솔 오류 · 실패 요청 | 0 · 0 | 0 · 0 (`/ai/comments` 409 는 로드맵 미확정 게이트 — 기존 동작) |

상세 API 시간 변동(135ms 한 번)은 같은 학생 5회 중 1회 — 기준 범위와 겹치고 다전공 학생은 기준보다 빠르다. 한 SQL 로 합쳐 쿼리 수 증가 없음.

## 4. 남은 제약

- **증명사진 보류**: `PHOTO` 는 파일명뿐, 이미지 위치는 전산원 확인 요청 #5 미회신. 사용자가 경로를 찾아 알려 주기로 함.
- 졸업예정은 4학년 졸업사정 등록자만 원천에 있다(재학 753명) — 비면 「없음/미입력」이 정상.
- 다전공은 취소·포기·이수 실패도 상태 라벨과 함께 원천 순서대로 보인다(Astra 비차단 1 미반영 — 업무 의미 선택이면 사용자 확인).
- 교직원의 생년월일·연락처 열람 기록 없음(0023 비차단 2와 같음, `DB.md` §9 후보).
- 화면 확인용 스크린샷에 실제 학생 값이 찍혀 즉시 삭제했다. 기록에는 형태·빈 값 여부만 남겼다.
- Atlas 공유 기억: 도구 없음 — 미수행.
