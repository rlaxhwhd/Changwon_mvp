# 0023 팀장 검증 — PASS (2026-11-27)

판정: **PASS** (로컬 Docker 반영 완료, 서버 미배포). Astra 필수 조건 6개 충족, Sol 의 지시서 밖 변경 1건(`jobs.apply` 학생 SELECT 에 평점·이수학점 두 열) 승인 — 지원 시 검사·저장되는 포트폴리오 GPA 를 마이페이지와 맞춘다. 연락처·주소는 싣지 않았다.

## 1. 게이트

| 항목 | 결과 |
|---|---|
| `npx tsc -b` | exit 0 |
| 대상 선택(`academic_profile_display or gpa_policy or staff_academic_scope or academic_students or care7_test_student or competency_examples or core_competency or growth or portfolio`) | **165 passed** (`dc_regression_20261127012158_e3c831_test`) |
| 격리 전체 회귀(Sol) | **10 failed / 799 passed / 2 skipped** (`dc_regression_20261127010942_aba24e_test`) — 0022 기준선(`…20261126011832_f242df_test`)과 실패 집합 diff 0(팀장 직접 비교). 통과 +11 = 새 테스트 |
| Sol 변이 확인 | 5코드 검사 제거 → 중복·부분·NULL 테스트 실패 / PATCH 응답에 학사 연락처 → idempotency 테스트 실패, 원복 후 통과 |
| `npm run docker:migrate` | 180 적용(백업 `local-before-migrate-20261127011359360.dump`) |
| `npm run docker:up` | 전체 healthy. API DB 접속 계정 `dc_app`(pg_stat_activity) |

## 2. 코드 경계 확인(팀장 diff 리뷰)

- 학사 연락처·주소: `growth.academic_contact()` 는 `owner` 일 때 `GET …/growth/profile`·`GET …/portfolio` 에서만, `academic_students.detail` 은 범위·`optional` 분기 뒤 기존 1행 조회 확장. resolve 함수(growth·jobs)·`jobs.apply` 는 `academic_gpa`·`academic_credits` 두 열뿐. ROSTER·목록·export 불변. PATCH 응답 `academic=None`.
- `saveIntro` 는 `dto.profile.email/phone` 자기입력 원값을 보낸다.
- 역량: `ACADEMIC` 은 5행·5코드에서만, 개발 fixture 분기 순서 불변. 그래프 `plot` = 본인 최고 축 비율, 목표 면·「목표 수준」 범례는 모든 축 target 이 있을 때만.

## 3. 화면·API 재측정 (ego-browser `round-01`(전) / `round-02`·`round-03`(후), 학생 값 미출력)

| 동작 | 전 | 후 |
|---|---|---|
| 20262324 마이페이지 「학사 정보」 | GPA 미입력 | GPA·**이수학점** 값 |
| 20262324 「연락처」 | 이메일·휴대폰 미입력, 주소 칸 없음 | 휴대폰·이메일·**주소** 값 |
| 20262324 「핵심역량」 패널 | 없음 | 빈 상태 안내(학사 역량 0행) |
| 20262324 메인·라운지 역량 그래프 | 잠김 | 잠김 유지(정상 — 역량 0행) |
| 역량 보유 재학생 마이페이지 | GPA·연락처 미입력 | GPA·이수학점·연락처·주소 값, 핵심역량 5칸 값 |
| 역량 보유 재학생 메인 | 잠김 | **열림** — 축 5·숫자 5, 범례 「나의 현재」+원점수 안내, 「목표 수준」 없음 |
| 역량 보유 재학생 라운지 | 잠김 | 열림 |
| 상담사 학사 상세 API 키 | gpa | gpa·mobile·email·postCode·address 값 (53~79ms, 전 51~56ms) |
| 상담사 상세 모달 헤더(화면) | 학점까지 | +휴대폰·이메일·주소 값(졸업년월은 재학생이라 빈 값) |
| 「역량 GAP」 탭(화면) | — | 범례 「나의 현재」만, 원점수 5, 목표 마커 0, 다각형 4(격자3+현재1) |
| `/students/{id}` | coreSource null | 역량 학생 `ACADEMIC`·5키 |
| 상담사 `/bootstrap/profiles`(20명, 6회) | 68~118ms · 47.9KB | 61~106ms(첫 회 159ms) · 48.4KB — 학사 역량 6명·학사 GPA 18명 |
| 포트폴리오 응답 | 8.1KB(20262324) · 0.6KB | 8.3KB · 0.8KB |
| 화면 진입 호출 수 | 마이페이지 9 · 메인 2~3 · 라운지 7~8 | 동일(추가 API 없음) |
| 콘솔 오류 · 실패 요청 | 0 · 0 | 0 · 0 (상담사 모달의 `/ai/comments` 409 는 로드맵 미확정 게이트 응답 — 기존 동작) |

## 4. 남은 제약

- 학사 역량 점수 보유 재학생은 880명뿐(졸업생 다수). 검증용 학생 2명은 역량 행이 없어 그래프 잠김이 정상.
- `dc.student_list`(교직원 목록 뷰) GPA 는 여전히 `dc.student_gpa()`(정책 미설정 시 fixture detail) — 이번 범위 밖. 학사 학생 목록(`/academic-students`)은 원래 학사 평점.
- 교직원의 학사 연락처·주소 열람 기록 없음(Astra 비차단 2) — 필요하면 `DB.md` §9 후보.
- `/students/:id/portfolio` 진입 2회(성장 스토어 revision 재조회)는 기존 동작, 이번에 손대지 않음.
- Atlas 공유 기억: 도구 없음 — 미수행.
