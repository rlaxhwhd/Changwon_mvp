# 0021 팀장 검증 — PASS (2026-11-26)

판정: **PASS** (로컬 Docker 반영 완료, 서버 미배포). 팀장 검증 중 결함 2건을 찾아 고쳤다(아래 §2).

## 1. 게이트

| 항목 | 결과 |
|---|---|
| `npx tsc -b` | exit 0 |
| 격리 전체 회귀 `scripts/run_regression.py` | 10 failed / 779 passed / 2 skipped — 실패 10건은 변경 전 기준선(`dc_regression_20261125073503_feac8e`)과 **같은 집합**(diff 0). 회귀 0 |
| 178 적용 후 관련 선택(`app_role or student_login or academic_sync`) | 18 passed |
| 새 테스트 `test_app_role_can_run_the_student_login_lookup` | 178 없이 1 failed → 178 있으면 통과 (red→green 확인) |
| 시드 경로(`seed.py` assert→RuntimeError, Astra 권고) | 빈 DB 재구축·시드 통과 + 21 passed |
| `npm run docker:up` | 전체 healthy. 178 은 `docker:migrate` 로 적용(백업 `local-before-migrate-20261125085145897.dump`) |
| Astra 사후 리뷰 | 177·major_label·seed 046 치환·LF 고정·퇴역 스텁 5건 APPROVED. 178 APPROVED(열 단위 → 표 단위 GRANT 로 교정) |

## 2. 팀장 검증에서 찾은 결함과 수정

1. **모든 학생 로그인 500** — `InsufficientPrivilege: fixture_student_login`. 176 이 `fixture_student_login_source` 뷰(dc_app SELECT)를 없애고 `student_login.login()` 이 표를 직접 읽게 했는데 `dc_app` 권한이 없었다. 테스트는 소유자 계정이라 통과했다.
   → `178_fixture_login_app_grant.sql`(`GRANT SELECT ON dc.fixture_student_login TO dc_app`) + `dc_app` 역할 회귀 테스트. Astra 가 앱 코드의 `dc.*` 참조 173개 전수 대조 — 다른 누락 없음.
2. **시드 fixture 2명의 학과 자기모순이 드러남** — 김채원(20990001→20211304)이 교수 화면에 「경영대학 · 컴퓨터공학과」. 원인: 시드의 옛 자체 코드가 처음부터 라벨과 달랐다(C05-05 세무학과 ↔ 라벨 컴퓨터공학과, C03-01 법학과 ↔ 라벨 경영학과). 176 의 C-코드 변환은 이름 기준으로 정확했다(→ 214 세무학과, 201 법학과) — 회귀가 아니라 기존 데이터 결함.
   → 팀장 확정: 테스트 내용(major_label·로드맵·advisor 스냅샷)에 맞춰 20211304 → 5/414 컴퓨터공학과, 20196208 → 8/205 경영학과. `seed_local_academic_test_students.sql` 앞단에 교정 단계 추가(`dc.org_code_remap` reason `fixture_correction` 2행, 로컬 학사 행 재생성). 리허설 → 적용(UPDATE 2·재생성 2) → 재실행 쓰기 0.
   ⚠️ 시드 `studentAcademic.json` 은 214·201 그대로(바꾸면 176 이 고정한 시드 원장 checksum 이 어긋난다). 신규 DB 는 이 스크립트를 돌려야 맞춰진다.

## 3. 화면·API 재측정 (EgoLite, 로컬 Docker, `baseline.md` 대비)

| 동작 | 기준선 | 전환 후 |
|---|---|---|
| 학생 로그인 | 17ms | 7명 모두 200, 14~33ms. `/me` 키 `grade,id,major,name,studentNo` 불변 |
| 검증 학번 학과 | — | 20243003 산업시스템공학과 · 20262324 첨단소재융합공학과 · 20990001 컴퓨터공학과 · 20990002 경영학과 · 20441231 컴퓨터공학과 · 20180001 전자공학과 · 20261231 경영학과 |
| `/v2/main` 20243003 | API 9건 ≤447ms | API 9건 ≤89ms, 실패 0·콘솔 오류 0, 1단계 진단 안내(게이트 잠김 정상) |
| `/v2/main` 20262324 | — | API 10건 ≤113ms, 실패 0·콘솔 오류 0, 로드맵 57%(게이트 열림 정상) |
| 로스터 `academic-students?page=1&pageSize=20` | 1.71~2.16s, 8.0KB (92,521명) | 1.37~1.40s, 7.8KB (106,108명 = 원본 106,101 + 로컬 7) |
| 로스터 검색 `q=컴퓨터` | 0.39~0.62s | 0.31~0.41s |
| `/departments` | 13~20ms, 10.3KB (80행) | 24~27ms, 94KB (595행, 드롭다운은 active 389만 노출) |
| `/academic-students/metadata` | 미측정 | 1.13~1.36s (느림 — 후속 후보) |
| 교직원 5역할 8화면(admin 조교·교수 배정 / career 전체학생·전체통계 / psych 개인통계 / professor 학생검색 / assistant 학생현황·전담교수) | — | 실패 요청 0 · 콘솔 오류 0. 교수 화면 김채원 「공과대학 · 컴퓨터공학과」, 조교 화면(컴퓨터공학과·경영학과) 6명 |

## 4. 남은 제약·확인 대상

- 원본: `DC_V_COL_INF` 단대 `0` 이름 공백 → 4학과(136·1001 문화테크노학과, 1712·2708 문화융합기술협동과정, 학생 93명)가 단대명 없이 목록 맨 위에 보인다. 이름을 지어 넣지 않았다 — 전산원 확인.
- Sol 보고 유지: 원본에 없는 활성 조교 배정 1건(`HD0001/1802`, 전공 `Z101`), 활성 조교 74명 중 퇴직·비재직 10명·후보에 없는 4명 — 삭제·비활성하지 않았다.
- `/academic-students/metadata` 1.1~1.4s, 로스터 1쪽 1.4s — 이번 범위 밖 성능 후보.
- 테스트 학생 스크립트를 돌리지 않은 DB(서버·신규 DB)에서는 fixture 로그인이 되지 않는다.
- 로컬 `app.seed` 는 이 작업과 무관한 기존 원장 불일치 3건 때문에 여전히 멈춘다(변경 전과 동일).
- Atlas 공유 기억: 도구 없음 — 미수행.
