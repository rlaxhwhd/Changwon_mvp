# 0022 기준선 (2026-11-26, 로컬 Docker, ego-browser `C:/Users/njob/ego/staff-dept-scope/round-01.mjs`)

| 화면 | 총원 표시 | 목록 API | 「보기」 |
|---|---|---|---|
| 교수 70201 `/admin/professor/students` | 5명 | `/students/metadata` 200 · `/students?page=1&pageSize=10` 200 (warm 13~21ms, cold 111~115ms) | `GET /academic-students/chaewon?optional=true` **403** → 모달 「전체 학생 목록 조회 권한이 없습니다.」 |
| 조교 80301 `/admin/assistant/students` | 6명 | metadata 13ms · 목록 21ms, 3KB | `/academic-students/changwon?optional=true` **403** 같은 문구 |

- 콘솔 오류 0. 실패 요청은 위 403 각 1건.
- 상세 호출 식별자는 **서비스 alias**(chaewon) 로 온다 — 범위 검사는 alias→intg_uid 해석 뒤에 걸어야 한다.
- curl(같은 조건): 교수 `/students?pageSize=20` 19~21ms 2.3KB, metadata 13~15ms; 조교 20ms 2.8KB, metadata 15~22ms.
- 변경 후 기대 모집단(학적 무관): 교수 5/414 1,821 + 5/714 321 · 조교 5/414 1,821 + 8/205 3,710 (재학·휴학: 332·255·328).
