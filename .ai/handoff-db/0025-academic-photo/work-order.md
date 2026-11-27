# 0025 학사 증명사진 연결 — 작업지시서 (팀장, 2026-11-27)

> **revision 3** — rev 2 + 필수 조건 9 측정 결과 반영(〔rev3〕 표시): local 원천 사진을 뷰에서 내지 않는다.
>
> **revision 2** — Astra 리뷰가 교정한 판(〔Astra rev2〕 표시). rev 1 의 방향(가산 뷰·서버 프록시·파일명 비노출·0023/0024 경계)은 유지한다. 교정 이유는 같은 폴더 `architecture-review.md`.
> rev 1 → rev 2 핵심: ① 상류 HTTP 동안 **DB 풀 커넥션을 쥐지 않는다**(`principal`·`connection` 의존성 금지, `jobs.deep_principal` 방식) ② 전체 마감시간·동시 상한 ③ 상류 상태 매핑(404 만 404) ④ `photoUrl` 은 `ACADEMIC_PROFILE_KEYS` 가 아니라 별도 조립 ⑤ 공유 함수는 조회 콜백을 받아 `detail()` 의 ROSTER 쿼리를 그대로 둔다 ⑥ 테스트 보강.

## 0. 사용자 지시

- 2026-11-27: 「뷰테이블에 있는 학사정보 다 연동… 프로필 사진, 예상졸업년월 등등 연결해줘」 — 0024 에서 사진만 이미지 위치 미상으로 보류.
- 같은 날 사용자가 현행 드림캐치 소스 분석 결과를 줬다(요지):
  - 현행 17개 JSP(19곳)가 `http://chains.changwon.ac.kr/onestop/haksa/photo/{PHOTO}` 를 `<img src>` 에 그대로 넣는다. `{PHOTO}` = 학사 뷰 `V_USR_INF.PHOTO`(「학번_번호.jpg」). 서버는 사진을 받거나 보관하지 않는다.
  - 신규 구축 주의: **http**(https 사이트에서 혼합 콘텐츠 차단), **인증 없는 공개 URL**(파일명 추측 가능) → 「서버 프록시로 감싸고 권한을 검사」 권고.
  - 주석 처리된 대안 `CARDDB.IHSM_MT.IHSM_SAJIN`(BLOB) 은 쓰지 않는다.
- 표시 범위는 0023·0024 와 같다: **학생 본인 마이페이지 + 범위 검사를 통과한 교직원 학사 상세**. 목록·엑셀·PATCH 응답·멱등 저장 제외.

## 1. 확인한 사실 (2026-11-27, 값 미출력)

| 사실 | 근거 |
|---|---|
| `academic.usr_inf.photo` 존재(`varchar(60)`, source·local 두 원천 UNION). `user_ty_cd='0001'` 106,108행 중 66,159행 값 있음, **전부** `^[0-9A-Za-z_-]+\.(jpg\|jpeg\|png)$` 형태, 66,151행이 `intg_uid_` 로 시작 | 로컬 DB 집계, 176 정의 |
| 검증 학생 20243003·20262324 둘 다 값 있음(학번으로 시작) | 같은 집계 |
| 〔rev3〕 origin 별(학생 행, 건수만): **local** 사진 있음 7, 7건 모두 `intg_uid_` 접두 불일치 — 다른 학번의 파일명(실학생 값 복사본). **source** 사진 있음 66,152, 불일치 1. 검증 학생 2명은 source·접두 일치 | 팀장 로컬 집계 2026-11-27(값 미출력) |
| 로컬 호스트·`dreamcatch-local-api-1` 컨테이너 모두 chains 에 닿음(디렉터리 HEAD = 403, 서버 생존) | HEAD 1회씩, 사진 파일 미요청 |
| `dc.academic_student_details`(181) 에 photo 없음. `dc_app` 은 `academic` 스키마 권한 없음 → 뷰 확장 필요. 이 뷰에 의존하는 뷰 0개 | 181 정의, 마이그레이션 grep |
| 인증 헤더가 필요한 이미지 표시 컴포넌트 `shared/ProtectedImage.tsx` 이미 있음(blob → objectURL). 호출자 `PortfolioSheet`·`PortfolioEditor` | 원본 |
| 파일 응답 관례 `files.stream`: `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store` | `backend/app/files.py` |
| `httpx` 를 이미 쓴다(`deep.py` 등). 설정은 `backend/app/settings.py` `Settings`(env 접두 `DC_`) | 원본 |
| 〔Astra rev2〕 **DB 풀 `max_size=5`**, uvicorn `--workers 1`. `principal` 은 `Depends(connection, scope='function')` 이라 **엔드포인트 함수가 끝날 때까지 풀 커넥션 1개를 쥔다.** 외부 HTTP 를 부르는 라우트는 `jobs.deep_principal`(짧게 빌린 커넥션으로 같은 판정)을 쓰고 DB 작업을 `pool.connection()` 블록 안에서만 한다 — 「Deep 장애가 사이트 전체 장애가 되지 않게」 | `backend/app/db.py`, `auth.principal`, `jobs.deep_principal` docstring, `backend/Dockerfile` |
| 〔Astra rev2〕 `detail()` 의 존재 판정은 `ROSTER`(= `student_login_source ⋈ academic_student_details`) 한 행. 범위 밖 교수·조교는 같은 404 「학사 학생정보가 없습니다.」 | `academic_students.detail` |
| 〔Astra rev2〕 `resolve_student` 는 다른 학생 → 404, 메뉴 없는 교직원 → 403, 메뉴·범위 통과 교직원 → `owner=False`(→ `require_owner` 403) | `growth.resolve_student` |
| 학생 마이페이지 마스트헤드에 `pf-monogram`(이름 두 글자) 자리, 교직원 상세 `AcademicStudentHeader` 의 인적사항 표(`sdv-info-person`) | 원본 |
| 회사 제출용 포트폴리오 사진(`PORTFOLIO_PHOTO`, 학생 업로드)은 **별개 기능** — 건드리지 않는다 | `PortfolioEditor.tsx` |

## 2. 설계

### 2-1. DB — 마이그레이션 182

`182_academic_photo.sql`:

```sql
-- 0025: 학사 증명사진 파일명(사용자 확정 2026-11-27). Astra 조건부 승인(0025 architecture-review).
-- 롤백(forward-only 관례, 필요 시 수동, 순서 중요):
--   ① API 가 photo_file 을 읽지 않게 되돌린다(growth.academic_contact·academic_photo_name).
--   ② dc.academic_student_details 에 의존하는 뷰가 없음을 확인한다(182 시점 0개).
--   ③ DROP VIEW dc.academic_student_details; → 181 정의(16열)로 CREATE VIEW(열 삭제는 OR REPLACE 불가)
--      → GRANT SELECT ON dc.academic_student_details TO dc_app;
--      181 정의: (181 파일의 CREATE OR REPLACE VIEW 본문 16열을 그대로 옮겨 적는다)
-- 이 뷰를 읽는 명단 엑셀·설문·학사 목록이 AccessExclusive 를 잠깐 기다린다.
SET LOCAL lock_timeout = '5s';

-- 기존 16열 이름·타입·순서 유지, 끝에만 1열 추가(CREATE OR REPLACE 규칙). 형식 검사는 API 한 곳.
-- photo_file 은 학사 사진 서버의 파일명이다. 어떤 API 응답에도 내지 않는다(프록시 URL 만 낸다).
-- 〔rev3〕 local 원천(테스트 계정)의 photo 는 실학생 값 복사본이라 다른 사람 얼굴이 붙는다(2026-11-27 집계: local 7/7 접두 불일치).
--        source 원천만 낸다. 학번 접두 강제는 source 의 정상 예외까지 숨길 수 있어 쓰지 않는다.
CREATE OR REPLACE VIEW dc.academic_student_details AS
SELECT a.intg_uid, a.sex AS sex_code, a.grade AS academic_gpa, a.out_dt, a.for_yn AS foreigner_code,
       a.hp AS mobile, a.email, a.grad_exp_ym, a.isu_grade, a.curri_year,
       a.post AS post_code, a.addr1 AS address,
       a.enter_dt AS admission_date, a.isu_smt_cnt AS completed_semesters, a.age AS birth_date, a.tel AS home_phone,
       CASE WHEN a.origin = 'source' THEN a.photo END AS photo_file
FROM academic.usr_inf a
WHERE a.user_ty_cd = '0001';
```

- 〔Astra rev2〕 rev 1 의 「COMMENT·REVOKE PUBLIC·GRANT 재실행」은 하지 않는다 — 180·181 과 같이 OR REPLACE 는 ACL·소유자를 유지한다(0024 리뷰 실측). 새 COMMENT 도 만들지 않는다(176 이래 이 뷰에 COMMENT 없음 — 롤백 시 복원 대상을 늘리지 않는다). `security_invoker` 켜지 않음.
- 〔rev3〕 원천 판정은 이 뷰의 CASE 한 곳뿐이다. API·프론트에서 origin 을 다시 보지 않는다(파일명이 애초에 앱에 오지 않는다). `academic.usr_inf` 는 같은 intg_uid 가 source 에 있으면 local 행을 내지 않으므로(176 NOT EXISTS), 테스트 계정이 나중에 source 에 생기면 그때부터 source 사진이 나간다.
- 새 테이블·인덱스 없음. 점조회는 `ix_dc_v_usr_inf_intg_uid`(176)·`local_usr_inf` 키를 그대로 쓴다.
- academic 스키마·176~181 의 다른 뷰·`sync_academic.py` 는 수정하지 않는다.

### 2-2. 설정

`Settings.academic_photo_base_url: str = 'http://chains.changwon.ac.kr/onestop/haksa/photo/'`(env `DC_ACADEMIC_PHOTO_BASE_URL`). 빈 문자열이면 기능 꺼짐(`photoUrl` = null, 엔드포인트 404). 운영 서버가 chains 에 못 닿을 때 끌 수 있게.
- 〔Astra rev2〕 값이 비어 있지 않으면 `http://` 또는 `https://` 로 시작하고 `/` 로 끝나며 `?`·`#` 가 없어야 한다 — 어기면 기동 시 실패(pydantic `field_validator`). 운영자가 잘못된 값을 넣어 경로가 붙는 사고를 막는다.

### 2-3. 백엔드 공통 함수 (한 곳 — `backend/app/academic_photo.py` 새 모듈)

〔Astra rev2〕 모듈을 분리한다: `growth` 와 `academic_students` 가 같이 쓰고, httpx·잠금 상태를 두 라우터 모듈에 흩지 않는다. `growth` → `academic_photo` 단방향 import(순환 없음).

- `PHOTO_NAME = re.compile(r'[0-9A-Za-z_-]{1,100}\.(?:jpe?g|png)', re.I)` + `photo_name(value) -> str | None`: `fullmatch` 불일치·`None`·설정 base 빈 값이면 None. **이 함수 하나**가 `photoUrl` 유무와 엔드포인트 진입을 함께 정한다.
- `growth.academic_contact` 의 한 SQL 문에 `d.photo_file` 을 더하고 dict 에 **내부 키** `'hasPhoto': photo_name(row['photo_file']) is not None` 만 싣는다(파일명은 dict 에도 넣지 않는다). 〔Astra rev2〕 rev 1 의 「`ACADEMIC_PROFILE_KEYS` 에 `photoUrl` 추가」는 `contact[key]` KeyError 가 나므로 쓰지 않는다 — 2-5 참조.
- `academic_photo_name(conn, uid) -> str | None`: `SELECT photo_file FROM dc.academic_student_details WHERE intg_uid=%s` → `photo_name()`. 학생 라우트가 쓴다.
- `fetch_academic_photo(name) -> (bytes, media_type)` — **DB 커넥션 없이** 호출된다(2-4):
  - URL = 설정 base + `quote(name, safe='')`. 다른 호스트·경로 조합 금지(SSRF). 조립 뒤 `url.startswith(base)` 단언.
  - 〔Astra rev2〕 동시 상한: 모듈 수준 `threading.BoundedSemaphore(8)` 을 `acquire(blocking=False)` — 못 잡으면 **503** 「사진을 잠시 후 다시 불러와 주세요.」(상류 호출 0회). chains 가 느려질 때 사진 요청이 공용 스레드풀(anyio 기본 40)을 점유해 다른 `def` 라우트까지 멈추지 않게. `finally` 에서 release.
  - `httpx.Client(timeout=httpx.Timeout(5, connect=3), follow_redirects=False, trust_env=False)`, `client.stream('GET', url)`.
  - 〔Astra rev2〕 **전체 마감 8초**(`time.monotonic()`): httpx 타임아웃은 읽기 한 번 단위라 조금씩 흘려 보내는 응답은 무한정 스레드를 쥘 수 있다. `iter_bytes()` 루프에서 마감을 넘으면 중단 → 502.
  - 크기: `Content-Length` 가 2 MiB 를 넘으면 본문을 읽지 않고 중단, 아니어도 `iter_bytes()`(디코딩 후 바이트) 누적이 2 MiB 를 넘는 순간 중단 → 502. 빈 본문 → 502.
  - 〔Astra rev2〕 상태 매핑(rev 1 「200 이 아니면 404」 교정 — 상류 장애·리다이렉트를 「사진 없음」으로 숨기지 않는다):

    | 상류 | 우리 응답 |
    |---|---|
    | 200 + 매직 바이트 일치 | 200 |
    | 404·410 | 404 「사진이 없습니다.」 |
    | 3xx(추적 안 함)·그 밖 4xx/5xx | 502 「학사 사진 서버에서 사진을 받지 못했습니다.」 |
    | 연결 실패·타임아웃·마감 초과·2 MiB 초과·비이미지·빈 본문 | 502 |

  - **매직 바이트로 판정**(JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`) — 상류 Content-Type·확장자를 믿지 않는다. media_type 은 매직 바이트 기준(`image/jpeg`·`image/png`).
  - 응답은 새 `Response(content, media_type, headers=…)` — 상류 헤더(`Set-Cookie`·`Server` 등)를 옮기지 않는다. 헤더: `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`(공용 PC 에서 다른 로그인 사용자가 브라우저 캐시로 남의 사진을 보지 않게 — `files.stream` 관례).
  - 〔Astra rev2〕 오류 응답 본문·로그에 **상류 URL·파일명·상류 본문을 싣지 않는다**(파일명에 학번이 들어 있다). 로그는 상류 상태 코드·예외 클래스명만.
  - 서버 저장·캐시 없음(현행처럼 보관하지 않는다).
- 라우트는 다른 학사 라우트처럼 `def`(스레드풀) — async 안에서 동기 DB·동기 HTTP 금지 규칙 준수.

### 2-4. 엔드포인트 2개 (권한 경로가 다르므로)

〔Astra rev2〕 **두 라우트 모두 `Depends(principal)`·`Depends(connection)` 을 쓰지 않는다.** `principal` 이 요청 단위 커넥션을 물고 있어, 상류가 느리면 사진 5건이 풀(5)을 다 쥐고 사이트 전체가 멈춘다. 대신:

1. `jobs.deep_principal` 의 본문을 `auth.py` 로 옮겨 `pooled_principal`(이름만 일반화, 동작·docstring 동일)로 두고, `jobs.py` 는 `from .auth import pooled_principal as deep_principal` 로 바꾼다(호출처 jobs.py 뿐 — 동작 불변). 같은 함수를 두 벌 만들지 않는다.
2. 라우트: `user=Depends(pooled_principal)` → `with pool.connection() as conn:` 블록 안에서 **권한 판정 + 파일명 조회만** → 블록을 나온 뒤 `fetch_academic_photo(name)`.

| 경로 | 권한 | 비고 |
|---|---|---|
| `GET /students/{identity}/academic-photo` | `resolve_student` + `require_owner` — **본인만**(다른 학생 404, 교직원 403 — 기존 함수 그대로) | 마이페이지. growth 라우터 |
| `GET /academic-students/{identity}/photo` | `detail()` 과 **같은** 공유 함수(아래). 범위 밖 = 학사 행 없음과 **같은 404 본문** 「학사 학생정보가 없습니다.」 | 교직원 상세. `optional` 없음 — 학사 행이 없으면 항상 404 |

〔Astra rev2〕 공유 함수 — `academic_students.py`:

```python
def academic_subject(conn, user, identity, lookup):
    """detail()·photo 공통: authorize → intg_uid 직접 → 서비스 alias 해석 → 범위. 범위 밖은 row=None(존재 비노출).
    lookup(uid) 는 학사 행 1개 또는 None — detail 은 ROSTER 를, photo 는 가벼운 점조회를 넘긴다."""
    scoped = authorize(conn, user)
    row = lookup(identity)
    if not row:
        person = conn.execute("SELECT intg_uid FROM dc.person WHERE alias=%s AND kind='STUDENT'", (identity,)).fetchone()
        if person:
            identity = person['intg_uid']
            row = lookup(identity)
    if row and scoped and not staff_may_read(conn, user, identity):
        row = None
    return identity, row
```

- `detail()` 은 `lookup=lambda uid: conn.execute(ROSTER+' SELECT * FROM roster WHERE intg_uid=%s', (uid,)).fetchone()` 로 부르고, 돌려받은 `identity` 로 기존 `optional` 분기(`student_access`)·이후 쿼리를 **그대로** 잇는다. 쿼리 수·순서·응답 불변(ROSTER 를 사진 경로의 존재 판정 때문에 다른 쿼리로 바꾸지 않는다).
- photo 라우트의 lookup: `SELECT d.photo_file FROM dc.student_login_source a JOIN dc.academic_student_details d USING(intg_uid) WHERE a.intg_uid=%s` — ROSTER 와 **같은 존재 조건**(`student_login_source ⋈ academic_student_details`)이면서 `service` CTE(전체 `student_list` MATERIALIZED)를 돌지 않는다.
- 판정 순서 고정: 권한(403) → 존재·범위(404 학사 정보 없음) → `photo_name` None(404 사진 없음) → 동시 상한(503) → 상류. 범위 밖이면 사진 유무와 상관없이 첫 404 본문이다.

### 2-5. DTO

- `profile_dto.academic` 에 `photoUrl` — 〔Astra rev2〕 `ACADEMIC_PROFILE_KEYS` 튜플은 그대로 두고(학사 dict 에서 고르는 키 목록), `owner and contact` 일 때 `data['academic']['photoUrl'] = f"/api/v1/students/{quote(student['intg_uid'], safe='')}/academic-photo" if contact['hasPhoto'] else None` 를 따로 붙인다. 결과 `academic` 키는 정확히 11개. PATCH·멱등은 `academic=None` 불변.
- `GET /academic-students/{id}` 에 `photoUrl`(`/api/v1/academic-students/{quote(identity, safe='')}/photo` 또는 null — `identity` 는 응답 `id` 와 같은 해석된 intg_uid). ROSTER·목록·export 불변.
- 파일명·상류 URL·`hasPhoto` 는 어떤 응답에도 없다. 값 유무는 2-3 `photo_name` 통과 여부로만 정한다(상류 파일 존재는 미리 확인하지 않는다 — 실패는 화면 폴백).
- 프론트 타입: `src_admin/data/academicStudents.ts` 상세 타입·학생 growth/portfolio profile 타입에 `photoUrl: string | null`.

### 2-6. 프론트

- `shared/ProtectedImage.tsx`: 선택 prop `fallback?: ReactNode` — 주면 **로딩 중·실패 때** 그것을 그린다. 안 주면 지금 동작 그대로(기존 호출자 `PortfolioSheet`·`PortfolioEditor` 불변).
- 학생 `Portfolio.tsx` 마스트헤드: `academic?.photoUrl` 있으면 `pf-monogram` 자리에 사진(같은 박스, `object-fit: cover`), fallback = 기존 모노그램. 없으면 지금 그대로.
- 교직원 `AcademicStudentHeader`: 인적사항 표 왼쪽에 증명사진 칸(현행 포트폴리오 화면 배치 — 사진 왼쪽, 표 오른쪽). 3:4 비율 약 96×128, fallback 「사진 없음」. 1280px 에서 가로 넘침 없음. 새 색·폰트 금지(DESIGN.md 토큰).
- alt: 「{이름} 증명사진」.
- 〔Astra rev2〕 `photoUrl` 이 null 이면 요청을 보내지 않는다(호출 수 +0). 값이 있을 때만 화면당 +1.

### 2-7. 테스트 (상류는 monkeypatch — 테스트가 실제 chains 에 나가지 않는다)

〔Astra rev2〕 상류 대역은 `httpx.MockTransport`(또는 `academic_photo` 의 client 생성 함수 monkeypatch)로 만들고 **호출 횟수를 센다.** 실제 네트워크 차단 확인용으로 기본 base 를 테스트에서 `http://photo.invalid/` 로 덮는다.

1. 뷰에 `photo_file` 열이 **17번째(마지막)** 이고 기존 16열 이름·순서 불변, `dc_app` 조회 가능.
2. 본인 GET `/growth/profile`·`/portfolio` → `academic.photoUrl` 형태, `academic` 키 정확히 11개, 응답 문자열에 파일명·`hasPhoto`·`photo_file` 없음. 다른 학생 → 404, 범위 안 교직원 → 403(학생 경로), 메뉴 없는 교직원 → 403. 모두 상류 0회.
3. 교직원 상세 `photoUrl`, 범위 밖 교수·조교 → 사진 404 이고 **본문이 「학사 행 없는 학번」 요청의 본문과 동일**(사진 값 있는 학생·없는 학생 모두), 상류 0회. 상담사 → 200. **alias 로 부른 photo 경로**도 같은 결과.
4. 정규식 불일치 파일명(`../x.jpg`, `a/b.jpg`, `a.gif`, 공백, 101자) → `photoUrl` null, 엔드포인트 404, **상류 호출 0회**.
5. 상류 404·410 → 404 / 403·500·302 → 502(리다이렉트 미추적: 302 의 Location 으로 두 번째 요청 0회) / 연결 오류·타임아웃 → 502 / 비이미지 바이트·빈 본문 → 502 / `Content-Length` 2 MiB 초과 → 502(본문 미독) / 길이 헤더 없이 2 MiB 초과 스트림 → 502 / 전체 마감 초과(가짜 시계) → 502.
6. 성공 응답 헤더 nosniff·`private, no-store`, 상류 `Set-Cookie` 미전달, media_type 은 매직 바이트 기준(확장자 `.jpg` 인데 PNG 바이트 → `image/png`). 오류 본문에 파일명·URL 없음.
7. 설정 base 빈 값 → `photoUrl` null, 두 엔드포인트 404, 상류 0회. 잘못된 base(`ftp://…`, 끝 `/` 없음) → 설정 검증 실패.
8. 〔Astra rev2〕 동시 상한: 세마포어가 가득 찬 상태 → 503, 상류 0회.
9. 〔Astra rev2〕 두 사진 라우트의 의존성 트리(`route.dependant` 재귀)에 `app.db.connection` 이 **없다** — 상류 대기 중 풀 커넥션을 쥐지 않는 구조 보장. `deep_principal` 을 쓰던 jobs 라우트 테스트 회귀 없음.
10. 〔Astra rev2〕 `detail()` 회귀: 0022~0024 학사 상세 테스트(범위 밖 404·`optional` 서비스 전용 학생 null·alias 진입) 그대로 통과. 새 `photoUrl` 외 응답 키 불변.
11. 0023·0024 기존 테스트 회귀 없음(owner `academic` 키 10→11 동등 단언 갱신만 — 부분집합 단언으로 느슨하게 바꾸지 않는다). 목록·export·PATCH 응답·`dc.idempotency` 에 `photoUrl`·파일명 없음.
12. 〔rev3〕 local 원천 학생(`add_academic_user(..., local=True, photo='<정규식 통과 값>')`) → 뷰 `photo_file` NULL, 본인 GET·교직원 상세 `photoUrl` null, 두 사진 엔드포인트 404 「사진이 없습니다.」(교직원 경로는 범위 통과자 기준), **상류 호출 0회**. 같은 값의 source 학생은 `photoUrl` 있음(대조군).

## 3. 검증 (팀장)

- `npx tsc -b`, 대상·격리 전체 회귀(기준선 실패 10건 diff 0).
- `npm run docker:migrate` → `docker:up`.
- 〔rev3 — 해소〕 적용 전 origin 별 접두 불일치 집계는 2026-11-27 완료(local 7/7, source 1/66,152). local 은 §2-1 CASE 로 차단, source 1건은 현행과 같이 표시. 적용 후 1회 재확인(건수만): `dc.academic_student_details` 에서 local 원천 학생의 `photo_file IS NOT NULL` = 0.
- ego-browser: 20262324·20243003 마이페이지, 상담사 학사 상세. **사진 API 는 상태·Content-Type·바이트 수만 기록**, 스크린샷 금지(학생 얼굴·개인정보). 콘솔 오류 0·실패 요청(의도된 404 제외) 0·호출 수 전후 비교(+1 이하)·1280px 넘침. 사진 요청 소요시간 P50 기록.
- 〔Astra rev2〕 상류에서 실제로 돌아온 상태(200/404/그 밖)를 검증 학생 2명분만 기록한다 — 없는 파일에 chains 가 404 가 아닌 403·200 HTML 을 준다면 매핑(2-3 표)을 근거와 함께 다시 리뷰받는다.

## 4. 남는 제약

- 운영(CentOS) 서버에서 chains 로 http 아웃바운드가 열려 있어야 한다 — 서버 배포 시 확인(이번 범위 아님).
- 상류에 파일이 없는 학생은 열 때마다 프록시 404 1회 — 측정 후 문제면 별도 판단.
- 사진 열람 기록 없음(0023 비차단 2와 같음).
- 〔Astra rev2〕 서버↔chains 구간은 http 평문이다(현행은 브라우저↔chains 가 평문). chains 가 https 를 제공하면 base 만 바꾼다.
