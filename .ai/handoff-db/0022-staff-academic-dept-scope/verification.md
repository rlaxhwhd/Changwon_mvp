# 0022 팀장 검증 — PASS (2026-11-26)

판정: **PASS** (로컬 Docker 반영 완료, 서버 미배포). 팀장 검증에서 1건 보완(§2).

## 1. 게이트

| 항목 | 결과 |
|---|---|
| `npx tsc -b` | exit 0 |
| 대상 테스트(`staff_academic_scope or academic_students or department_assignments or diagnosed_metadata or student_login`) | 32 passed |
| 격리 전체 회귀 `backend/scripts/run_regression.py` | **10 failed / 788 passed / 2 skipped** (`dc_regression_20261126011832_f242df_test`) — 실패 10건은 변경 전 기준선(`dc_regression_20261126005224_d27aa3_test`)과 **같은 집합(diff 0)**. 통과 +8 = 새 테스트 |
| Sol 변이 확인 | GRANT 회수·override 제외 삭제 → 5 failed, 메타 범위 제거 → 3 failed, 원복 → 통과 |
| `npm run docker:migrate` | 179 적용(백업 `_workspace/db-backups/local-before-migrate-20261126010946843.dump`). `staff_student_scope` 70201 = 2,142 · 80301 = 5,531 (예상치와 일치) |
| `npm run docker:up` | 전체 healthy |

## 2. 팀장 보완

- **서비스 미이용 학생 상세의 404 왕복** — 학사 상세가 200 이어도 `AcademicServiceDetail` 이 `/students/{id}` 를 불러 404 를 받고 나서야 학사 요약을 그렸다(화면은 정상, 실패 요청 1건). 교수·조교 상세의 대부분이 이 경로가 되므로 학사 상세 응답에 `hasServiceProfile`(이미 읽던 `dc.student` 행 유무, 추가 쿼리 없음)을 싣고 false 면 프로필 조회를 건너뛴다. 테스트에 true/false 단언 추가.
- 브라우저 HTML 캐시: nginx 가 SPA HTML 에 `Cache-Control` 을 주지 않아(Last-Modified·ETag 만) 전날 방문한 딥링크(`/admin/professor/students`)가 옛 번들로 열렸다. 측정은 CDP 캐시 끔으로 했다. **기존 배포 설정 문제 — 이번 범위 밖, 후속 후보**(배포 직후 사용자가 옛 화면을 볼 수 있다).

## 3. 화면·API 재측정 (ego-browser `round-02.mjs` + curl, DB 유휴, `baseline.md` 대비)

| 동작 | 기준선 | 변경 후 |
|---|---|---|
| 교수 70201 「학생 검색」 총원 | 5명(`/students`) | **2,142명**(학사, 재학 기본 394명) |
| 조교 80301 「학생 현황」 총원 | 6명 | **5,531명**(재학 기본 459명) |
| 목록 1쪽(재학) | 19~21ms | 교수 116~134ms · 조교 207~212ms (「전체」 199~226 / 316~342ms) |
| 메타 | 13~22ms | 교수 271~296ms · 조교 315~360ms |
| 「보기」 상세 | **403**(모달 오류) | 200, 20~24ms. 미이용 학생은 학사 요약, 서비스 학생(김채원·김창원)은 진단·상담·로드맵 전탭 |
| 화면 진입 호출 | — | 목록·메타 각 1회, 실패 요청 0 · 콘솔 오류 0 |
| 교수 기존 `/students`(지도학생 경로) | 19~21ms | 28~41ms(범위 뷰 세미조인 +수 ms, Astra 실측 3.6~4.5ms 범위) |
| 상담사 전체 학생 목록 / 메타 | 1.37~1.40s / 1.13~1.36s (0021) | 1.23~1.34s / 1.07~1.21s — 회귀 없음 |
| 교수 내보내기 `POST /academic-students/export` | — | 403 |

## 4. 남은 제약

- 교수 「지도학생」·조교 「전담교수 배정」은 여전히 서비스 학생(`dc.student`, 첫 로그인)만 — `advisor_assignment.student_uid` FK. 미로그인 학생에게 전담교수를 배정하려면 학생 행 생성 정책이 필요하다(별도 작업).
- 실제 교원·조교는 로그인 계정(`dc.staff`)이 없어 SSO 전에는 배정이 저장돼도 열람이 적용되지 않는다(테스트 교직원만 확인 가능).
- SPA HTML 캐시 헤더(§2).
- Atlas 공유 기억: 도구 없음 — 미수행.
