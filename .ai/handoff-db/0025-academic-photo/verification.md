# 0025 팀장 검증 — PASS (2026-11-27)

판정: **PASS** (로컬 Docker 반영 완료, 서버 미배포). Astra 필수 조건 1~8 충족, 조건 9 는 rev3(`origin='source'` 만 노출)로 해소.

## 1. 게이트

| 항목 | 결과 |
|---|---|
| `npx tsc -b` | exit 0 (팀장 재실행) |
| 대상 회귀(`academic_photo or academic_profile_display or academic_students`) | 63 passed (팀장 재실행 `dc_regression_20261127053817_1991e2_test`) |
| 격리 전체 회귀 | **10 failed / 843 passed / 2 skipped** (`dc_regression_20261127053353_38f602_test`) — 기준선 `…010942_aba24e_test` 와 FAILED 집합 diff 0(팀장 로그 비교) |
| `npm run docker:migrate` | 182 적용, 백업 `local-before-migrate-20261127053842328.dump` |
| 적용 후 재집계 | `photo_file IS NOT NULL` — local 0 · source 66,152 (local 테스트 계정에 남의 사진 없음) |
| `npm run docker:up` | 전체 healthy |

## 2. 코드 경계(팀장 diff 리뷰)

- 상류 호출은 `academic_photo.fetch_academic_photo` 한 곳: 연결 3s·읽기 5s·전체 8s, 비대기 세마포어 8(초과 503), redirect 미추적, `trust_env=False`, 길이 헤더+누적 2 MiB, 매직 바이트 판정, 404·410 만 404 나머지 502, 새 Response(nosniff·`private, no-store`), 로그에 파일명·URL 없음.
- 두 사진 라우트는 `pooled_principal` + `pool.connection()` 블록 안에서 권한·파일명만 읽고 블록 밖에서 상류 호출 — 사진 서버가 느려도 DB 풀(5)을 쥐지 않는다. `jobs.deep_principal` 은 같은 함수의 별칭 import.
- `academic_subject()` 로 alias·범위 판정만 추출, `detail()` 의 ROSTER·optional 분기 불변. 사진 경로는 점조회.
- DTO 는 `photoUrl` 만(본인 academic 11키, 내부 `hasPhoto`·파일명 비노출). 설정 base 는 기동 시 형식 검증, 빈 값이면 기능 꺼짐.
- 프론트: `ProtectedImage` 선택 prop `fallback`(기존 호출자 불변), 학생 마스트헤드 모노그램 자리, 교직원 인적사항 왼쪽 96×128 칸. admin 토큰 `--border`·`--muted`·`--text-sub` 정의 확인.

## 3. 화면·API 측정 (ego-browser `C:/Users/njob/ego/academic-profile/round-05.mjs`, 스크린샷 없음·학생 값 미출력)

| 동작 | 결과 |
|---|---|
| 20262324·20243003 마이페이지 | 마스트헤드에 사진 렌더(원본 236×314, 60×60 박스 cover), alt 「이름 증명사진」 |
| 본인 사진 API 5회 | 둘 다 200 `image/jpeg`, 42.7KB·45.4KB, 52~87ms(첫 콜드 요청 1회 482ms), `private, no-store`·`nosniff` |
| 다른 학생 사진 경로(학생 세션) | 404 |
| 본인 응답 academic 키 수 / 파일명(.jpg) 노출 | 11 / 없음 |
| 마이페이지 진입 추가 호출 | 사진 1회만(그 외 0024 와 동일) |
| 상담사 `GET /academic-students/{id}` | `photoUrl` 있음, 파일명 노출 없음, 상세 30ms·1.3KB |
| 상담사 사진 API 5회 | 200 `image/jpeg`, 59~156ms |
| 없는 학번 사진 | 404 |
| 교직원 모달(1280px) | 사진 칸 96×128 렌더, 문서 폭 1280 = 창 폭, 표 scrollWidth = clientWidth |
| 콘솔 오류 · 실패 요청 | 0 · 0 |

현행처럼 chains 가 http 로 살아 있고, 검증 학생 두 명의 사진 파일이 실제로 존재함을 프록시 응답(상태·형식·크기)으로 확인했다. 이미지 내용은 보거나 저장하지 않았다.

## 4. 남은 제약

- 운영(CentOS) 서버에서 chains 로 http 아웃바운드가 열려 있어야 한다. 막혀 있으면 `ACADEMIC_PHOTO_BASE_URL=` 빈 값으로 기능을 끈다.
- no-store 라서 상세를 열 때마다 사진 서버를 1회 부른다(측정상 50~160ms). 파일이 없는 학생의 반복 404 는 측정 후 판단(Astra 비차단).
- 학생 마스트헤드는 정사각 박스라 3:4 사진의 위아래가 조금 잘린다.
- source 원천 접두 불일치 1건은 현행처럼 표시. 사진 열람 감사 기록 없음.
- Atlas 공유 기억: 도구 없음 — 미수행.

## 5. 후속 화면 조정 (2026-11-27 사용자 지시, DB 변경 없음)

- 인적사항: 사진 칸+표를 한 테두리로 붙임(사진 124×164 = 표 높이 164, 사이 간격 0), 행 세로 여백 13→9px, 집전화 행 제거(API `homePhone` 유지).
- 학생상세 탭: 활성 탭 `rgb(21,122,82)` 바탕·흰 글자, 탭↔본문 간격 16px(기본사항 0→16, 진단·유형 16).
- 다전공 취소·포기·이수 실패: 사용자 확정 — 지금처럼 그대로 표시(0024 Astra 비차단 1 종결).
- ego-browser `round-06.mjs`(1280px, 20262324·20243003): 문서 폭 1280 = 창 폭, 콘솔 오류 0, 스크린샷 없음. `tsc -b` exit 0, `docker:up` healthy.
