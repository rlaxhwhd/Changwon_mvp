# 0025 — Astra architecture review

- 판정: **APPROVED (조건부) = ASTRA_APPROVED** — `work-order.md` **revision 3**(rev 2 = 이 리뷰의 교정 〔Astra rev2〕, rev 3 = 필수 조건 9 측정 결과 반영 〔rev3〕 — §8). §2 필수 조건 전부가 전제다. rev 1 은 방향(가산 뷰·서버 프록시·파일명 비노출·0023/0024 경계)이 맞지만, 사진 라우트가 상류 HTTP 동안 DB 풀 커넥션을 쥐는 구조라 chains 지연이 사이트 전체 장애로 번질 수 있어 그대로는 승인하지 않는다. 업무 의미를 바꾸는 선택은 없다(USER_DECISION_REQUIRED 아님).
- 일자: 2026-11-27. 검토자: codex-astra-db-reviewer 역할(위임 실행).
- 방식: **원본 정적 검토만.** DB 에 아무것도 적용·실행하지 않았고(BEGIN/ROLLBACK 측정도 하지 않음), 학생 값·사진을 조회하지 않았으며, chains 에 요청하지 않았다. 사실은 원본 코드·마이그레이션과 rev 1 의 팀장 집계를 인용했다. 이 세션에 Graft MCP 가 노출되지 않아 grep 으로 `academic_student_details` 소비처·`principal`/`connection` 의존성·`deep_principal` 호출처·라우트 경로 충돌을 추적했다.
- 이 리뷰가 고친 파일: `work-order.md`(rev 1→2), `DB_SCHEMA.md`(181 문단 앞에 182 요약 1문단, 「미적용」).

## 1. 교정한 설계와 근거

### 1-1. 〔치명〕 상류 대기 중 DB 풀 점유 → `pooled_principal` + `pool.connection()` 블록

- 사실: `db.pool` 은 `max_size=5`, uvicorn `--workers 1`. `auth.principal` 자체가 `Depends(connection, scope='function')` 이라, 라우트가 `conn` 을 선언하지 않아도 **엔드포인트 함수가 끝날 때까지** 커넥션 1개를 쥔다(FastAPI 의존성 캐시로 같은 인스턴스).
- rev 1 대로면 사진 라우트는 권한 확인 → 상류 GET(최대 수 초) 동안 커넥션을 쥔다. 교직원 몇 명이 상세를 연달아 열 때 chains 가 느리면 사진 5건이 풀을 비우고, 나머지 모든 API 가 풀 타임아웃(10s)으로 실패한다. `jobs.deep_principal` docstring 이 Deep 연동에서 이미 같은 위험을 적고 해결한 방식이 있다.
- 교정: `deep_principal` 본문을 `auth.pooled_principal` 로 옮겨 재사용(jobs 는 별칭 import, 동작 불변 — 같은 함수 두 벌 금지). 사진 라우트는 `with pool.connection()` 블록 안에서 권한+파일명만 읽고 나와서 상류를 부른다. 테스트 9 가 의존성 트리에 `connection` 이 없음을 구조로 고정한다.

### 1-2. 스레드풀 점유 — 전체 마감 8초 + 동시 상한 8

- `def` 라우트는 anyio 공용 스레드풀(기본 40)에서 돈다. httpx `read` 타임아웃은 **읽기 1회** 단위라 바이트를 조금씩 흘리는 상류는 타임아웃 없이 스레드를 계속 쥔다 → `iter_bytes()` 루프에 wall-clock 마감 8초.
- `Timeout(5, connect=3)`: 학내망 정적 파일 서버에 충분하고, 장애 시 연결 블랙홀이면 3초에 끊긴다. rev 1 의 「≤5s」보다 연결 단계를 짧게 고정.
- 상한: `BoundedSemaphore(8)` 비대기 획득, 실패 시 503(상류 0회). chains 장애 중에도 사진이 스레드 40개 중 8개 이상을 쓰지 못한다. 정상 시(ms 단위 응답) 상한에 닿지 않는다. 프론트는 503 도 폴백으로 그린다.

### 1-3. 상류 상태 매핑

rev 1 「200 이 아니면 404」는 chains 장애(5xx)·인증 리다이렉트(3xx)·접근 거부(403)를 「사진 없음」으로 숨긴다(지시서 자신의 「실패를 성공으로 숨기지 않는다」와 충돌). 404·410 만 404, 나머지는 502. 미확인 사실 — chains 가 없는 파일에 404 를 주는지 — 은 팀장 검증 §3 에서 검증 학생 2명분 상태만 기록해 확인한다.

### 1-4. `photoUrl` 조립 위치 — `ACADEMIC_PROFILE_KEYS` 에 넣지 않는다

`profile_dto` 는 `{key: contact[key] for key in ACADEMIC_PROFILE_KEYS}` 이다. 튜플에 `photoUrl` 을 넣으면 `academic_contact` 가 `photoUrl` 을 가져야 하는데, URL 은 경로(학생/교직원)마다 달라 공통 함수가 만들 값이 아니다. → 공통 함수는 내부 불리언 `hasPhoto` 만, URL 은 각 DTO 가 조립. 두 응답 모두 `hasPhoto`·파일명을 내지 않음을 테스트 2·11 이 문자열로 확인한다.

### 1-5. 공유 함수 — 조회 콜백으로 `detail()` 쿼리 불변

`detail()` 의 존재 판정은 무거운 `ROSTER`(service CTE 가 `dc.student_list` 전체를 MATERIALIZED)다. 공유 함수가 존재 판정 쿼리를 하나로 정하면 (a) detail 쿼리가 바뀌거나 (b) 사진 경로가 ROSTER 를 돌게 된다. `lookup` 콜백을 받아 detail 은 ROSTER 그대로, 사진은 같은 존재 조건(`student_login_source ⋈ academic_student_details`)의 점조회를 쓴다. alias 해석·범위·identity 반환 의미(해석 성공 시 intg_uid, 실패 시 원래 값 — `optional` 분기의 `student_access` 가 그 값을 쓴다)는 현 코드와 같다.

### 1-6. 존재 비노출 순서

권한(403) → 존재·범위(404 「학사 학생정보가 없습니다.」) → 파일명 형식(404 「사진이 없습니다.」) → 상한(503) → 상류. 범위 밖 교수·조교는 사진 유무와 무관하게 「학사 행 없음」과 **바이트 단위로 같은 본문**을 받는다(테스트 3). 「사진 없음」 404 는 범위를 통과한 사람에게만 보인다. 학생 경로는 기존 `resolve_student` 응답(다른 학생 404)을 그대로 쓴다.

### 1-7. 그 밖

- SSRF: base 는 설정 상수, 파일명은 `[0-9A-Za-z_-]{1,100}\.(jpe?g|png)` fullmatch(`/`·`..`·`%`·공백 불가) + `quote(safe='')` + `startswith(base)` 단언 + `follow_redirects=False` + `trust_env=False`(프록시 환경변수 무시). base 형식은 기동 시 검증.
- 크기: `Content-Length` 선검사 + 디코딩 후 누적 검사(gzip 폭탄도 2 MiB 에서 끊김).
- 182: OR REPLACE 끝 1열 추가 — 180·181 과 같은 패턴, 의존 뷰 0, ACL 유지. rev 1 의 COMMENT 신설·GRANT 재실행은 빼서 롤백 복원 대상을 늘리지 않았다.
- 로그·오류 본문에 파일명(학번 포함)·URL 금지.

## 2. 필수 조건 (승인 전제)

1. 182 는 rev 2 §2-1 SQL 그대로: `SET LOCAL lock_timeout='5s'`, 181 의 16열 뒤에 `a.photo AS photo_file` 1열만(OR REPLACE). 새 테이블·인덱스·COMMENT·GRANT 재실행 없음, `security_invoker` 끔, 다른 뷰·academic 스키마·`sync_academic.py` 무수정. 롤백 주석에 181 정의 16열 SQL 을 실제로 적는다.
2. 두 사진 라우트는 `Depends(principal)`·`Depends(connection)` 을 쓰지 않는다. `jobs.deep_principal` 을 `auth.pooled_principal` 로 옮겨 재사용하고(jobs 는 별칭 import), DB 작업은 `pool.connection()` 블록 안에서만, 상류 호출은 블록 밖에서만 한다.
3. 상류 호출은 `academic_photo.fetch_academic_photo` 한 곳: `Timeout(5, connect=3)`·전체 마감 8초·`BoundedSemaphore(8)` 비대기(초과 503)·`follow_redirects=False`·`trust_env=False`·2 MiB(길이 헤더 선검사+누적)·매직 바이트 판정·§2-3 상태 매핑표(404·410 만 404)·새 `Response` 에 nosniff+`private, no-store`. 로그·오류 본문에 파일명·URL·상류 본문 없음.
4. 파일명 형식 판정은 `photo_name()` 하나 — `photoUrl` 유무와 엔드포인트 진입을 같은 함수가 정한다. base 빈 값이면 None. base 는 기동 시 형식 검증.
5. `detail()` 리팩터는 §2-4 `academic_subject(conn, user, identity, lookup)` 형태로 alias·범위 판정만 옮긴다. detail 의 ROSTER 쿼리·쿼리 수·`optional` 분기·응답 키(`photoUrl` 추가 외)는 불변. 사진 경로는 ROSTER 를 돌지 않는다.
6. 판정 순서 §2-4(403 → 범위·존재 404 → 형식 404 → 503 → 상류). 범위 밖 404 본문은 학사 행 없는 학번의 404 본문과 동일. 범위 밖·형식 불일치·base 빈 값·상한 초과에서 상류 호출 0회.
7. `photoUrl` 은 `ACADEMIC_PROFILE_KEYS` 에 넣지 않고 따로 붙인다(owner `academic` 정확히 11키). 공통 함수의 내부 키 `hasPhoto`·파일명은 어떤 응답·`dc.idempotency` 에도 없다. PATCH 응답 `academic=None` 불변. 목록·export·ROSTER 불변.
8. 테스트 rev 3 §2-7 의 1~12 전부. 특히 **3(범위 밖 본문 동일·alias)·5(상태 매핑·리다이렉트 2차 요청 0회·스트림 초과·마감)·8(상한)·9(의존성 트리에 `connection` 없음)·10(detail 회귀)·12(local 원천 → photoUrl null·상류 0회, source 대조군)**. 상류는 MockTransport/monkeypatch 로 호출 수를 세고 실제 네트워크에 나가지 않는다. 0024 의 키 동등 단언은 11키 동등 단언으로 갱신(부분집합으로 완화 금지). 하나라도 빠지면 미승인.
9. ~~origin 별 접두 불일치 집계 후 local 불일치 시 재리뷰~~ → **해소(rev 3, §8)**: 182 뷰가 `CASE WHEN a.origin = 'source' THEN a.photo END` 로 local 원천 사진을 내지 않는다. 원천 판정은 이 CASE 한 곳뿐(API·프론트에서 origin 재판정 금지). 적용 후 local 학생의 `photo_file IS NOT NULL` = 0 을 건수로 재확인한다. 사진 API 는 상태·타입·바이트 수만 기록, 스크린샷 금지.

## 3. 예상 주요 query 와 인덱스

| 경로 | query | 인덱스·비용 |
|---|---|---|
| 본인 `GET /growth/profile`·`/portfolio` | 기존 `academic_contact` 한 문장에 `d.photo_file` 1열 추가 | 추가 쿼리 0. `usr_inf` UNION 뷰 점조회 — `ix_dc_v_usr_inf_intg_uid`(176)·`local_usr_inf` 키 |
| `GET /academic-students/{id}` | 동일(공통 함수) + 기존 ROSTER 불변 | 추가 쿼리 0 |
| `GET /students/{id}/academic-photo` | `pooled_principal` 1 + `resolve_student` 1(+교직원 메뉴·범위) + `SELECT photo_file … WHERE intg_uid=%s` 1 | 점조회. 커넥션 보유 ms 단위 후 반납 |
| `GET /academic-students/{id}/photo` | `pooled_principal` 1 + `authorize`(메뉴 술어·staff 역할) + lookup 1(alias 시 +2) + `staff_may_read` 1(범위 모드) | 전부 점조회. ROSTER·service CTE 미실행 |
| 목록·메타·export | 변경 없음 | — |

새 인덱스 불필요(쓰기 없음, 점조회만, 원천 인덱스 176 보유).

## 4. 위험·migration·rollback

| 위험 | 대응 |
|---|---|
| chains 지연·장애가 사이트 전체로 번짐 | 조건 2·3(풀 미점유·마감·상한). 최악에도 스레드 8개·DB 커넥션 0개 |
| 학번이 든 파일명 유출 | 조건 4·7(응답·로그·오류 본문 금지, 문자열 단언) |
| 남의 사진 노출(범위 우회) | 조건 5·6(detail 과 같은 함수·순서), 학생 경로는 기존 `resolve_student`+`require_owner` |
| 테스트 학생(local 원천)의 사진 값이 실학생 것 | 측정됨(local 7/7 불일치) → 뷰 CASE 로 차단(조건 9 해소) |
| 공용 PC 브라우저 캐시 | `private, no-store`, blob URL 은 언마운트 시 revoke(기존 컴포넌트) |
| 182 잠금 | `lock_timeout 5s`, OR REPLACE 는 짧은 AccessExclusive. 실패 시 재실행(멱등) |
| 롤백 | ① API 가 `photo_file` 안 읽게 → ② 의존 뷰 0 확인 → ③ DROP VIEW + 181 정의 CREATE + `GRANT SELECT … TO dc_app`. 데이터 손실 없음(읽기 뷰) |

## 5. JSON 호환성 테스트 항목

- owner `academic`: 키 집합 = 0024 의 10키 ∪ {`photoUrl`}, `photoUrl` 은 `^/api/v1/students/[^/]+/academic-photo$` 또는 null.
- 학사 상세: 0024 키 ∪ {`photoUrl`}, `photoUrl` 은 `^/api/v1/academic-students/[^/]+/photo$` 또는 null, 경로의 id 는 응답 `id` 와 같다.
- 교직원이 읽는 `/growth/profile`·`/portfolio`, PATCH 응답·재생, `dc.idempotency`, 목록 items, export 시트: `photoUrl`·`hasPhoto`·파일명 문자열 없음.
- 사진 성공 응답: `Content-Type` ∈ {`image/jpeg`,`image/png`}, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`, `Set-Cookie` 없음.

## 6. Sol 실행 순서

1. `backend/migrations/182_academic_photo.sql`(§2-1, 롤백 주석에 181 16열 SQL).
2. `settings.py` 에 `academic_photo_base_url` + 형식 validator.
3. `auth.pooled_principal`(jobs.deep_principal 본문 이동) → `jobs.py` 별칭 import. jobs 의 Deep 관련 테스트 통과 확인.
4. `backend/app/academic_photo.py`: `photo_name`·`academic_photo_name`·`fetch_academic_photo`(마감·상한·스트림·매직 바이트·매핑).
5. `growth.academic_contact` 에 `photo_file`→`hasPhoto`, `profile_dto` 에 `photoUrl` 별도 조립, growth 라우터에 `GET /students/{identity}/academic-photo`.
6. `academic_students.academic_subject` 추출 → `detail()` 치환(동작 불변) → `photoUrl` 추가 → `GET /academic-students/{identity}/photo`.
7. 테스트 §2-7 1~12(새 파일 `backend/tests/test_academic_photo.py` + 0024 키 단언 갱신). 격리 전체 회귀.
8. 프론트: 타입 `photoUrl`, `ProtectedImage` `fallback`, `Portfolio.tsx` 마스트헤드, `AcademicStudentHeader` 사진 칸. `npx tsc -b`.
9. 팀장 검증 §3(집계 → 마이그레이션 → docker:up → ego-browser, 스크린샷 금지).

## 7. 비차단 항목

1. chains 가 https 를 제공하는지 확인되면 base 를 https 로 바꾼다(코드 변경 없음). 현재 서버↔chains 평문은 현행(브라우저↔chains 평문)보다 노출면이 좁다.
2. 상류 부재 404 가 많으면(파일 없는 학생이 매번 상류 1회) 짧은 부정 캐시(프로세스 메모리, uid 기준, 수 분)를 측정 후 검토 — 지금은 넣지 않는다.
3. 브라우저 캐시를 막아 같은 화면 재방문마다 상류 1회. 측정상 문제면 `private, max-age` 짧게 + 로그아웃 시 정리 방안을 별도 리뷰.
4. 사진 열람 감사 기록 없음(0023 비차단 2와 같은 판단).
5. 정규식 길이 상한 100 은 원천 `varchar(60)` 보다 넉넉하다 — 무해, 그대로 둔다.
6. source 원천의 접두 불일치(측정 1건)는 현행과 같이 표시한다. 정책을 바꾸려면 사용자 결정.
7. 목록 썸네일·엑셀 사진은 범위 밖(지시서 0절). 넣게 되면 상한·N회 상류 호출을 다시 리뷰한다.

## 8. rev 3 재리뷰 — 필수 조건 9 해소 (2026-11-27)

팀장 측정(로컬, `user_ty_cd='0001'`, 건수만): local 사진 있음 7 → 7건 모두 다른 학번 접두(실학생 값 복사본), source 사진 있음 66,152 → 불일치 1. 검증 학생 2명은 source·접두 일치.

팀장 제안 `CASE WHEN a.origin = 'source' THEN a.photo END AS photo_file` 에 **동의**한다. 근거:

- 차단 위치가 맞다. 뷰에서 걸러야 파일명이 앱 메모리·로그·dict 에 애초에 오지 않는다. API 의 `photo_name()` 에 origin 을 더하면 판정이 두 곳이 된다.
- 기준이 맞다. 문제는 「값이 누구 것인가」가 아니라 「local 행은 실학생 값을 복사해 만든 테스트 계정」이라는 출처다. 측정상 local 사진은 전부 다른 사람 것이고, 정상 local 사진은 0건이다. 출처로 막으면 오탐이 없다.
- 접두 강제(`LIKE intg_uid||'\_%'`)를 안 쓰는 것도 맞다. source 불일치 1건은 학번 변경 같은 정상 예외일 수 있고, 현행도 표시한다. 숨기려면 업무 결정이 필요하다(비차단 6).
- 호환성: `origin` 은 176 `academic.usr_inf` 의 기존 열(`'source'`/`'local'` 리터럴)이다. 새 열은 끝에 붙고 타입은 `photo` 와 같은 문자열이라, OR REPLACE 규칙·ACL 유지·롤백(181 정의 복원)이 rev 2 그대로다. `usr_inf` 는 같은 intg_uid 가 source 에 있으면 local 행을 내지 않으므로(176 NOT EXISTS), 테스트 계정이 source 에 생기면 그때부터 source 사진이 나간다(의도한 동작).
- 비용: CASE 한 개는 점조회 비용에 영향이 없다. 인덱스 변화 없음.
- 테스트 가능성: `academic_test_support.add_academic_user(..., local=True)` 가 `academic.local_usr_inf` 에 넣으므로 테스트 12(local → null·상류 0회, source 대조군)를 픽스처 변경 없이 만들 수 있다.

반영: `work-order.md` rev 3 — §1 측정 사실, §2-1 SQL·주석, §2-7 테스트 12, §3 검증(사전 집계 완료·적용 후 재확인). 판정은 그대로 조건부 APPROVED이고, 남은 필수 조건은 1~8 이다(9 해소).
