# 0021 구현 전 기준선 (2026-11-25, 로컬 Docker, 구 9테이블 미러)

| 동작 | 측정 |
|---|---|
| 학생 로그인 `POST /auth/student/login` (20262324) | 200, 17ms |
| 학생 메인 `/v2/main` (20243003, ego-browser) | API 9건: student/me 84ms · bootstrap/profiles 296 · metadata 289ms/205.5KB · diagnosis 296 · counsel-requests 221 · roadmap 282 · notifications/summary 295 · popups 119 · quests/sync 447. 화면 정상(진단 1단계 안내) |
| 교직원 로스터 `GET /academic-students?page=1&pageSize=20` (career_kim) | 200, **1.71–2.16s**, 8.0KB — 이미 느림(구 미러 92,521명 대상) |
| 로스터 검색 `q=컴퓨터` | 200, 0.39–0.62s, 8.0KB |
| `GET /departments` | 200, 13–20ms, 10.3KB (80행) |

전환 후 같은 조건으로 재측정한다. `/departments` 는 595행이 되면 크기 증가가 예상된다(드롭다운은 active 만 노출).
