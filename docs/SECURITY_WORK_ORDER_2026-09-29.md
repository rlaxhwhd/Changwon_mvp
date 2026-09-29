# 웹사이트 보안 강화 작업지시서

> **후속 구현 반영(2026-09-29):** SEC-01의 개발 파일 서빙 차단·Vite 패치·로컬 자격증명 교체, SEC-02의 HTML 저장/표시/편집 정제 및 학생·교직원 업로드 검증을 구현했다. `학번 / !` 로그인은 유지한다. Oracle 비밀번호 교체는 사용자 지시에 따라 담당자 인계로 남긴다. 아래 본문은 최초 감사 시점의 근거를 보존한 것이며, 현재 적용·검증 결과는 [구현 기록](SECURITY_IMPLEMENTATION_2026-09-29.md)을 따른다.

- 작성일: 2026-09-29
- 대상: Changwon MVP — React/TypeScript/Vite, FastAPI, PostgreSQL, Nginx
- 기준: HEAD `48077db`와 검토 시점의 미커밋 변경을 포함한 작업 트리. 구현 시작 전 파일·라인을 다시 확인한다.
- 범위: **사용자 확정 — 운영 공개 전 보안 강화까지 포함**.
- 이번 산출물: 조사·검증·작업 지시. 애플리케이션 코드, DB, 비밀값, 의존성은 변경하지 않았다.
- 상태: 보안 개선 구현 필요. 아래 권한 정책 결정 사항은 확정 전 구현하지 않는다.

## 1. 핵심 판단

가장 먼저 **개발 서버의 비밀 파일 노출**을 차단한다. 현재 로컬 Vite의 HTTP 응답에 API 토큰과 로컬 DB 비밀번호가 포함되는 것을 실제 확인했다. 다음으로 저장형 XSS 경로를 막고, 운영 인증을 도입하여 클라이언트가 보낸 사용자 식별 헤더로 신원을 선택하지 못하게 해야 한다.

현재 서비스는 의도적으로 개발용 인증을 사용하며 운영 모드에서는 시작을 거부한다. 이 차단을 제거하는 것만으로 운영 전환해서는 안 된다. CORS 임의 출처 허용 문제는 이번 검사에서 발견되지 않았다. CORS는 신원 인증·권한 검사·CSRF 방어를 대신하지 않는다.

우선순위는 P0=즉시 격리·출시 차단, P1=운영 공개 전 필수, P2=운영 준비 강화다. 심각도와 재현 여부는 별도 표기한다. 이 문서는 전체 API·운영 인프라에 대한 침투시험 합격증이 아니다.

## 2. 찾아서 검토한 스킬과 적용 기준

| 스킬/지침 | 확인 및 적용 내용 |
|---|---|
| `find-skills` | 로컬 SKILL.md를 읽고 skills.sh 및 `npx --yes skills find security-review`로 검색했다. |
| OpenAI `security-best-practices` | 공식 저장소 SKILL.md와 React, 일반 JavaScript 프론트엔드, FastAPI 참고 문서를 조회했다. 입력→저장→출력, 신뢰 경계, 근거·심각도·미검증 사항 구분에 적용했다. 전역 설치는 하지 않았다. |
| 프로젝트 `graft` | `.claude/skills/graft/SKILL.md`를 읽고 CLI `ask "authentication authorization CORS JWT middleware"`로 인증 함수와 호출 관련 위치를 탐색했다. 조회 과정에서 구조 그래프가 자동 갱신됐다. |
| 프로젝트 `postgres-patterns` | `.claude/skills/postgres-patterns/SKILL.md`를 읽고 SQL 파라미터화·학생 범위·최소 권한 검토에 적용했다. |
| DB 리뷰 역할 지침 | `.claude/agents/codex-astra-db-reviewer.md`를 읽고 개인정보 최소 노출·동시성·범위 검사 관점만 참고했다. 별도 에이전트는 실행하지 않았다. |
| `graphify` | 지침을 확인했다. 전체 그래프 재생성은 하지 않았고, 프로젝트 지정 Graft 및 원본 코드로 이번 검토를 수행했다. |

보안 스킬 선택 근거: 검색 시 OpenAI 스킬은 약 9.5K 설치, 공식 `openai/skills` 저장소는 GitHub API 기준 27,791 stars였다. 설치·별 수는 조회 시점 수치이며 보안 보증이 아니다. React와 FastAPI를 함께 다루므로 이 프로젝트에 적합하다. 검색에 나온 다른 스킬은 원문을 검토하지 않아 적용했다고 표시하지 않는다.

- [선택한 스킬 원문](https://github.com/openai/skills/blob/main/skills/.curated/security-best-practices/SKILL.md)
- [스킬 검색 페이지](https://skills.sh/openai/skills/security-best-practices)
- [참고 문서 디렉터리](https://github.com/openai/skills/tree/main/skills/.curated/security-best-practices/references)

후속 작업자가 설치를 원할 때 사용할 명령: `npx skills add openai/skills@security-best-practices`. 보안 판단은 스킬의 권고와 실제 코드·배포 구성을 함께 근거로 한다.

## 3. 발견 사항 및 구체적 작업

### SEC-01 — 개발 서버에서 비밀 파일 응답 노출

- **P0 / Critical / 실제 응답 검증 완료.** 서버 접근자가 API 토큰 및 로컬 DB 비밀번호를 얻을 수 있다. DB 실제 접근 성공이나 외부 유출은 검증·확인한 사실이 아니다.
- 근거: `vite.config.ts:6`은 프로젝트 내부 `deploy/secrets/api_token`을 사용한다. `server` 설정에 해당 디렉터리의 HTTP 접근 차단이 없다.
- `http://127.0.0.1:5173/deploy/secrets/api_token` 및 `/deploy/secrets/api_db_password_local` 요청이 200이었다. 응답 바이트에 로컬 파일 값이 포함되는지 메모리에서 비교하여 두 요청 모두 true를 확인했다. 응답 본문과 비밀값은 출력·저장하지 않았다.
- 범위 제한: 5173은 `127.0.0.1`에서 리슨한다. 인터넷 공개·과거 유출을 단정하지 않는다. Docker 프론트의 `.dockerignore`는 secrets를 빌드 컨텍스트에서 제외하고, 최종 이미지는 dist를 복사한다. Docker에도 같은 파일 노출이 있다고 단정하지 않는다.

**작업**

1. Vite 기본 차단 목록을 유지하면서 `deploy/secrets/**`, backend 환경·비밀 파일, 작업용 덤프·로그 등 서버 전용 경로를 차단한다. deny만 믿지 말고 실제 요청으로 확인한다.
2. 비밀 파일을 가능한 한 Vite 서빙 루트 밖으로 옮기고, 서버 환경변수 또는 전용 secret mount로 경로만 전달한다. 브라우저 번들에 값을 넣지 않는다.
3. Vite 관련 보안 패치를 함께 적용한다(SEC-07). `?raw`, `?import`, `/@fs/` 및 Windows 경로 변형을 **가짜 비밀값 fixture**로 회귀 검증한다.
4. 차단 확인 후 노출 가능했던 API 토큰·DB 자격증명을 교체하고 관련 프록시·서비스를 함께 갱신한다. 실제 교체는 운영 연결과 복구 절차를 확인한 배포 단계에서 수행한다. 문서에는 값이 아닌 교체 완료 여부만 남긴다.

**완료 기준:** 해당 경로와 변형에서 비밀값을 얻을 수 없다. 403/404 또는 값이 없는 안전한 응답을 검사하고, 단순 SPA fallback 200을 성공으로 오판하지 않는다. 정상 API 연결은 유지되며 이전 토큰은 거부된다.

### SEC-02 — 비교과·채용 HTML의 저장형 XSS 경로

- **P1 / High / 코드 경로 확인, 저장·실행 재현 미실시.** 본문 작성 권한을 가진 사용자 또는 해당 계정을 탈취한 공격자가 조회자의 origin에서 스크립트 실행을 유도할 수 있다.
- 입력·저장: `backend/app/programs.py:227`의 `ProgramBody.desc/detail` → `program_values():274` → 생성·수정 SQL(`343`, `363`). `backend/app/jobs.py:381`의 `PostingBody.content` → `posting_values():485` → 공고 저장. 읽은 경로에는 HTML sanitizer가 없다.
- 출력: `src_v2/pages/growth/ProgramNotice.tsx:178`, `:186`, `src_v2/components/JobDetailView.tsx:175`의 `dangerouslySetInnerHTML`.
- `src_admin/pages/Home.tsx:110`은 저장소의 고정 sprite HTML import이므로 동일한 저장형 XSS로 묶지 않는다.

**작업:** 일반 요약은 JSX 텍스트로 출력한다. 의도한 서식 HTML은 공통 렌더러와 검증된 allowlist sanitizer를 사용한다. 서버 저장 경계에서도 정제하고, 기존 저장 데이터는 읽기 경계에서 보호한다. 이벤트 속성, 위험 URL scheme, script·iframe·object·활성 SVG 등을 차단하고 정상 표·목록·링크·허용 이미지의 호환성을 확인한다. 정규식만으로 sanitizer를 만들지 않는다. 기존 데이터 일괄 정제는 백업·변경 차이·복구 계획을 준비한 별도 작업으로 진행한다.

**완료 기준:** 격리 테스트 DB의 생성→수정→학생 조회에서 이벤트 속성·위험 링크·붙여넣기 HTML이 실행되지 않는다. 무해한 실행 표식으로 확인하며 외부 통신·쿠키 전송 payload를 사용하지 않는다. 저장 문자열만 검사하지 말고 Chrome에서 실제 렌더링을 확인한다.

### SEC-03 — 운영 인증 부재와 식별 헤더 신뢰

- **P1 / 공개 시 Critical / 개발 동작 실제 확인.** 개발 프록시에 접근한 클라이언트가 교직원 신원을 선택할 수 있다.
- 근거: `backend/app/auth.py:17`은 `X-DC-Portal: admin`이면 학생 쿠키 경로를 건너뛰고 `X-DC-Identity`로 사용자를 찾는다. `shared/api.ts:13`은 localStorage 식별자를 보낸다. `vite.config.ts`와 `deploy/frontend/default.conf.template:14`의 프록시는 API 토큰을 주입한다.
- Chrome에서 쿠키 없이 교직원 fixture 식별 헤더를 보낸 `/api/v1/programs/statistics`가 200이었다. API 직접 요청은 개발 토큰 없이 401이었다. 즉 API 토큰은 프록시 경계 보호이며 개인 신원 인증이 아니다.
- 보호 장치: `backend/app/main.py:45`의 lifespan은 개발 환경·개발 신원 설정이 아니면 기동을 거부한다. `student_login.py`의 임시 공통 비밀번호 로그인도 개발 환경으로 제한된다.

**작업:** 운영 SSO 계약을 확정하고 서버가 검증한 세션/토큰으로 principal을 만든다. 개발 신원 선택 구현은 명시적 개발 모드에서만 허용하고 운영에는 포함되지 않도록 검증한다. 운영에서 identity/portal 헤더 변경과 localStorage 수정은 인증된 신원에 영향을 주면 안 된다. SSO claim→내부 사용자 연결, 만료·로그아웃·비활성화·권한 변경 반영을 구현한다. 검증 완료 전 현재 운영 기동 차단을 유지한다.

**완료 기준:** 운영 프로파일에서 헤더만으로 인증 불가. 학생 세션에 admin 헤더를 추가해도 권한 상승 불가. 유효 세션의 정상 접근과 만료·위조·폐기 세션의 401을 테스트한다. 세션 식별자를 localStorage에 저장하지 않는다.

### SEC-04 — API별 메뉴·대상 범위 인가 불일치

- **P1 / High 후보 / 코드 사실 확인, 업무 정책 결정 필요.**
- `programs.py:343`, `:363`의 생성·수정은 `require_staff()`로 STAFF 여부만 검사한다. `programs.py:185`의 통계는 모든 프로그램·신청을 집계하며 학생 범위 술어가 없다. 반면 `applicant_scope()`는 학생 본인/교직원 담당 범위를 사용한다.
- `auth.py:43`의 `student_access()`는 career/psych 상담사에게 별도 범위 검사를 하지 않고, 다른 교직원은 명시적 범위 또는 과거 상담 배정을 허용한다. `jobs.py:65` 이후는 메뉴 권한과 명시적 학생 범위를 별도로 검사한다.
- `administration.py:19` 이후는 활성 관리자 역할과 유효기간을 확인하며, 테스트 교직원의 관리자 API 요청은 403이었다. 모든 관리자 API가 무방비한 것은 아니다.

**작업:** 엔드포인트별 `주체 × 행위 × 대상 × 데이터 범위` 표를 만든다. 학생·교수·조교·진로·심리·시스템관리자·기업회원·미인증을 분리한다. 확정된 정책에 맞게 서버에서 목록·상세·쓰기·통계·다운로드·CSV에 동일 범위를 적용한다. 공통 모듈은 기존 메뉴 술어와 scope를 먼저 검토하되 채용/상담의 다른 업무 계약을 무조건 합치지 않는다.

**완료 기준:** 같은 역할의 A/B 사용자, 범위 없는 교직원, 만료 권한 사용자를 포함한 부정 테스트가 있다. URL·query·body의 studentId, applicantId, counselorId, fileId를 바꿔도 범위 밖 자료 접근/수정이 거부된다. 목록과 count/통계/내보내기에도 범위 밖 정보가 없다. 프론트 메뉴 숨김은 인가 완료 근거가 아니다.

### SEC-05 — CSRF·세션·CORS 운영 계약 및 보안 헤더

- **P1 / Medium~High 조건부 / 일부 보호 확인, 전체 공격 재현 미실시.**
- 학생 쿠키: `student_login.py:72`, HttpOnly·SameSite=Lax, Secure는 요청 scheme에 의존. 기업 쿠키: `company_members.py:127`, HttpOnly·SameSite=Strict, 운영 Secure 조건 존재.
- 기업 인증의 `same_site():36`은 `Sec-Fetch-Site: cross-site`만 거부한다. 이것만으로 모든 Origin·same-site 하위 도메인·헤더 누락 조건을 검증했다고 할 수 없다. 전체 앱의 공통 CSRF 검사는 검색 범위에서 확인되지 않았다.
- 임의 Origin의 GET/OPTIONS에서 Access-Control-Allow-Origin과 Allow-Credentials가 없었다. **CORS wildcard 취약점은 확인되지 않음.** 다른 사이트의 브라우저가 응답을 읽지 못하는 것과 서버에 요청이 도착하는 것은 구분한다.
- Vite HTML 응답에 CSP, X-Frame-Options, nosniff, Referrer-Policy가 없었다. Nginx 템플릿에도 설정이 없다. 운영 edge의 추가 설정은 미확인이다.

**작업:** 운영의 동일 origin 유지 여부를 정한다. 분리 origin이 필요한 경우에만 정확한 scheme/host/port allowlist, 필요한 method/header와 credentials를 설정한다. `*`, 무조건 Origin 반사, `null` 허용은 금지한다. 쿠키 기반 변경 요청은 검증된 CSRF 토큰 및 Origin 검증을 설계하고 Fetch Metadata·SameSite는 보조 방어로 사용한다. 프록시 신뢰 대상을 제한하고 운영 HTTPS 종료 지점과 Secure 쿠키 동작을 확인한다. CSP는 보고 모드로 호환성 확인 후 적용하고 script 정책을 무분별한 unsafe-inline/unsafe-eval로 풀지 않는다. 프레임 포함 필요를 확인해 frame-ancestors, nosniff, Referrer-Policy를 설정한다. 민감 API에는 no-store를 적용한다.

**완료 기준:** 실제 별도 origin 테스트 페이지에서 읽기 차단과 변경 거부를 각각 검증한다. 악성 Origin, null, 유사 도메인, 허용 origin, preflight, 헤더 누락, same-site 하위 도메인 시나리오를 포함한다. CORS 차단만으로 CSRF 테스트 통과를 선언하지 않는다. 로그인·로그아웃·업로드·운영 TLS 프록시를 통과한 쿠키와 헤더를 Chrome으로 확인한다.

### SEC-06 — 업로드의 실제 내용 검증 및 자원 제한

- **P1 / Medium / 코드 확인.** `backend/app/files.py:88`은 확장자 allowlist와 크기를 검사하지만 저장 전 실제 파일 signature/파싱 검증은 없다. content_type도 확장자로 결정한다.
- 기존 보호: 서버 생성 UUID 경로, 웹루트 밖 저장, 스트림 누적 크기 제한, 파일 귀속 검사, attachment 다운로드(`:148`). 이를 유지한다. 확장자만 검사한다는 이유로 서버 코드 실행이 재현됐다고 단정하지 않는다.

**작업:** 허용 형식별 실제 MIME/signature와 파싱 검증, 이미지 재인코딩, 압축 파일의 압축 해제 크기·중첩 제한 및 검사/격리 정책을 마련한다. 지원 문서의 업무상 허용 형식을 유지하며 악성코드 검사 필요를 배포 설계에 반영한다. 사용자별 업로드 용량·횟수·미귀속 파일 보관 한도를 둔다. JSON 본문·배열·문자열·페이지 크기에도 endpoint별 상한을 검토한다.

**완료 기준:** 가짜 확장자, 빈 파일, 한도 초과/분할 스트림, 남의 파일 ID, 다른 용도 재귀속을 거부한다. 다운로드·미리보기도 동일 인가를 적용한다. 정책 변경 후 정상 업무 파일을 검증한다.

### SEC-07 — 취약 의존성 및 개발 도구 노출

- **P1 / 패키지 경고 High / audit 확인, 실제 악용 미실시.** `npm audit --omit=dev --json`은 high 5, critical 0으로 exit 1을 반환했다. 이는 취약 패키지 집계이며 독립 취약점 5건 또는 사이트 RCE 5건이라는 뜻이 아니다.
- 확인된 설치 버전: Vite 8.0.3, React Router/DOM 7.14.1, PostCSS 8.5.15, nanoid 3.3.12. `--omit=dev` 결과에도 Tailwind Vite 통합 등의 의존 관계로 빌드 도구가 포함될 수 있다.
- Windows Vite 파일 접근 관련 [GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff)는 현재 버전을 영향 범위로 제시하고 8.0.16을 해당 advisory의 패치 버전으로 제시한다. 현재 localhost 바인딩과 공개 노출 조건을 함께 평가한다. SEC-01은 이 우회 공격을 사용하지 않고 확인했다.
- React Router [GHSA-49rj-9fvp-4h2h](https://github.com/advisories/GHSA-49rj-9fvp-4h2h) 등은 SSR/RSC/framework 기능의 사용 여부를 따져야 한다. 현재 확인된 진입점은 클라이언트 `createBrowserRouter`이며 해당 서버 RCE 도달성을 확인한 것은 아니다.

**작업:** 실행 시점 공식 advisory와 lockfile 기준으로 패치 버전을 선정하고 호환되는 의존성을 갱신한다. 특정 advisory 하나의 최소 패치 버전만으로 전체 안전을 선언하지 않는다. dev 포함 npm audit, Python `pip-audit`, 컨테이너 이미지 검사 및 SBOM/예외 목록을 CI에 추가한다. 공개 서비스에서 Vite dev server를 운영하지 않는다. `npm audit fix --force`로 무조건 major 변경하지 않는다.

**완료 기준:** 도달 가능한 high/critical 이슈가 해결되거나 책임자·근거·만료일이 있는 승인 예외로 남는다. TypeScript/build, 관련 API 회귀, Chrome 주요 동작이 통과한다. Python·이미지 취약점 검사는 이번 검토에서는 미실시다.

### SEC-08 — 응답 최소화·감사·추가 공격면 검증

- **P2 / Medium / 일부 실측, 나머지는 후속 검증.** 비교과 기본 목록은 두 프록시에서 1,045,664 bytes였고 단일 측정 3,156ms/3,551ms였다. HTML 본문까지 담는 `PROGRAM_COLUMNS`와 DTO 경로를 확인했다. 원인이 DB인지 네트워크인지 분리 측정하지 않았으므로 DB 성능 문제로 단정하지 않는다.
- 기업 로그인은 DB 기반 15분/30회 제한이 있으나 `request.client.host`를 기준으로 하므로 프록시 뒤 실제 구분 여부를 확인해야 한다. 임의 X-Forwarded-For를 신뢰하는 식으로 고치지 않는다.
- SQL은 검토 경로에서 값 파라미터화를 사용한다. f-string SQL 존재만으로 SQL injection이라고 판단하지 않는다. 전체 동적 테이블·정렬·필터에 대한 완전 검토는 남아 있다.
- 로드맵 외부 호출은 설정 URL을 사용하고 redirect 금지·timeout·입출력 크기 제한이 있다. 사용자 제공 URL에 대한 SSRF는 확인되지 않았다. 상담 자유서술에 개인정보가 섞일 수 있으므로 외부 제공 데이터·보관·계약은 별도로 확인한다.

**작업:** 목록에서 대형 HTML을 분리하고 페이지네이션·응답 DTO 최소화를 적용한다. JSON/HTML/API 오류 응답에서 비밀번호·토큰·내부 경로가 나오지 않도록 공통 처리한다(`main.py:61`의 비밀번호 오류 정제는 기업 인증 경로에 한정됨). 로그인·권한 변경·민감 열람·내보내기 감사 로그와 보관·접근 권한을 정의한다. 학생 로그인·고비용 생성·내보내기·업로드 rate limit을 보완한다. SQL/명령 주입, SSRF, CSV/Excel 수식 주입, 공개 docs·진단 endpoint, secret history 검사를 추가한다.

**완료 기준:** 동일 사용자 동작의 전후 응답 bytes·총 시간·서버 처리·DB 시간을 분리 기록한다. 부하 검증은 격리 환경에서 한다. 감사 로그에 인증 비밀 및 불필요한 개인정보를 남기지 않는다. DB 실사용 계정의 GRANT·뷰·함수·RLS 적용 여부는 실제 DB에서 확인한다. RLS가 없다는 이유만으로 곧바로 취약하다고 판정하지 않는다.

## 4. 실제 실행한 검증과 한계

### Chrome MCP — 세션 내장 도구 사용

`http://127.0.0.1:5173/v2`를 열었고 최종 경로는 `/login`이었다. 다음 요청은 `credentials: omit`으로 실행했다. 응답 본문은 노출하지 않았다.

| 요청 | 결과 | 단일 측정 |
|---|---|---:|
| GET `/api/v1/programs`, student portal, 신원 없음 | 401 | 49ms |
| GET `/api/v1/programs/statistics`, admin portal + `psych_yoon` fixture | 200 | 527ms |
| GET `/api/v1/system/code-groups`, 같은 fixture | 403 | 210ms |
| GET `/v2` HTML 헤더 | 200, CSP/XFO/nosniff/Referrer-Policy 없음 | 시간 별도 미기록 |

콘솔 error 2개는 위 부정 테스트의 401·403에 대응했다. 해당 관측 구간의 API resource 3건에서 중복과 1초 초과 요청은 없었고 encodedBodySize 합계는 1,143 bytes였다. 이는 테스트 요청 세 건의 결과이며 로그인 이후 전체 화면 성능 검증이 아니다.

### 별도 HTTP 클라이언트 — 임의 Origin 검사

Origin은 실제 외부 전송 없이 `https://security-review.invalid` 문자열을 사용했다. GET에는 개발 교직원 식별 헤더를, OPTIONS에는 GET 및 두 식별 헤더의 preflight 조건을 넣었다. 직접 API에는 비밀 토큰을 넣지 않았다.

| 대상 | OPTIONS | GET | GET 시간 / 크기 | ACAO / ACAC |
|---|---:|---:|---|---|
| `127.0.0.1:18100` | 405 | 401 | 14ms / 39 bytes | 둘 다 없음 |
| `127.0.0.1:5173` | 204 | 200 | 3,156ms / 1,045,664 bytes | 둘 다 없음 |
| `127.0.0.1:8080` | 405 | 200 | 3,551ms / 1,045,664 bytes | 둘 다 없음 |

HTTP 클라이언트는 브라우저 CORS를 집행하지 않는다. 따라서 GET 200은 cross-origin 브라우저 읽기 성공을 의미하지 않는다. 5173/8080의 빌드·API 대상이 완전히 동일한지는 검증하지 않았으며 성능 비교 실험으로 해석하지 않는다.

추가로 SEC-01의 두 경로에서 HEAD 및 GET 비교 검증을 수행했다. 비밀 파일 내용은 기록하지 않았다. 기존 DB에 공격 문자열을 저장하거나 사용자·권한을 변경하지 않았다. 관련 기존 보안 테스트 파일은 읽었지만 pytest를 실행하지 않았으며, 운영 SSO·실제 운영 TLS·다중 사용자 격리·CSRF 공격·XSS 저장 실행·부하·DB 실행 계획은 미검증이다.

## 5. 구현 순서와 검수 지시

1. **격리 및 비밀 보호:** SEC-01 → Vite 패치 → 비밀 교체 계획/실행. 개발 루프백 바인딩과 운영 기동 차단을 유지한다.
2. **즉시 코드 개선:** SEC-02 HTML 경계, SEC-06 파일 검증, SEC-07 의존성 패치. 기존 공통 구현·호출자를 Graft로 확인한다.
3. **정책 확정 후 인증·인가:** SEC-03 운영 SSO 및 세션, SEC-04 권한표, SEC-05 CSRF/CORS/TLS. 미정인 권한을 임의로 좁히거나 넓히지 않는다.
4. **운영 통제:** SEC-08 응답·로그·rate limit·DB 최소 권한·외부 연계 검증.
5. **통합 검수:** 고정 버전의 격리 테스트 DB 및 운영 유사 프록시에서 아래 회귀를 실행한 뒤 Chrome으로 재검증한다.

| 영역 | 필수 부정·정상 테스트 |
|---|---|
| XSS | 일반 문자열, 정상 서식, 위험 HTML의 생성·수정·기존 데이터·학생/관리자 출력 |
| 인증 | 미인증, 만료·폐기 세션, identity/portal 위조, 비활성 계정, 로그인·로그아웃 |
| 인가/IDOR | A→B 객체 ID 치환, 권한 없는 역할, 범위 없는 같은 역할, 목록·통계·다운로드 |
| API 위변조 | 허용되지 않은 추가 필드, 소유자·역할·서버 계산값 변조, 상태 전이 역행, 기간 우회 |
| 동시성 | expectedVersion 오래된 요청 409, 중복 Idempotency-Key, 같은 키 다른 본문 충돌, 중복 제출·수료 처리 |
| CORS/CSRF | 허용/불허 Origin, 실제 교차 사이트 form/fetch, 토큰 누락·오류, 프록시 경유 Secure 쿠키 |
| 파일/자원 | 위장 형식, chunked 초과, 다른 소유자, download 인가, 본문/배열/페이지 상한 |
| 개인정보 | 응답 DTO·오류·로그·CSV·브라우저 캐시·외부 AI 입력 최소화 |

기존 회귀 참고: `backend/tests/test_jobs_review_security.py`, `test_student_login.py`, `test_company_members.py`, `test_programs.py`, `test_administration.py`. 테스트 파일 존재를 실행 통과로 기록하지 않는다. `backend/tests/README.md`의 `backend/.venv/Scripts/python.exe scripts/run_regression.py`는 backend 디렉터리에서 `.venv/Scripts/python.exe scripts/run_regression.py`로 실행하며 새 `*_test` DB를 만든다. 테스트 전 준비 과정과 영향을 확인하고 기존 개발/운영 DB에 공격 데이터를 쓰지 않는다.

DB 변경이 필요하면 먼저 프로젝트 `postgres-patterns`, `database-migrations` 및 Supabase Postgres 스킬을 읽는다. 적용된 migration은 수정하지 않고 신규 migration, 테스트 DB 검증, 복구안을 작성한다. 권한/트랜잭션을 제거해 성능을 맞추지 않는다.

운영 공개 완료 조건: SEC-01 해결, 운영 인증·권한 계약 확정 및 부정 테스트 통과, XSS 방어·CSRF·파일 검증 완료, 도달 가능한 고위험 의존성 조치, 운영 유사 환경에서 Chrome 콘솔·HTTP 상태·실패/중복 요청·응답 크기·시간 확인, 남은 위험과 예외의 명시적 승인. CORS 설정이나 프론트 입력 검사만으로 API 위변조 방어 완료를 선언하지 않는다. 브라우저 내 공유 비밀/HMAC을 신원 인증 대체물로 도입하지 않는다.

## 6. 사용자/업무 담당자 결정 필요

다음은 보안 구현자가 추측으로 확정하지 않는다. 사용자의 운영 공개 범위 답변은 반영했고, 비교과 권한 질문에는 문서 작성 시점 답변이 없으므로 결정 필요로 남긴다.

1. 비교과 생성·수정·전체 통계는 모든 교직원에게 허용되는가, 지정 메뉴/담당 범위로 제한되는가?
2. career/psych 상담사의 학생 접근 범위와 과거 상담 배정에 의한 지속 접근은 어디까지 허용되는가? 심리 기록과 일반 학생 정보의 범위를 구분해야 한다.
3. 운영 SSO 제공자·프로토콜·claim·퇴사/휴학/탈퇴 및 권한 철회 시점·세션 만료/동시 로그인 정책은 무엇인가?
4. 운영 프론트/API origin, TLS 종료 지점, 임베딩 필요, 외부 AI 제공 데이터·보관 계약은 무엇인가?

이 결정과 무관한 비밀 파일 차단, XSS 정제, 의존성 검토, 가짜 비밀 fixture 회귀는 먼저 진행할 수 있다.

## 7. 외부 근거

- [OWASP REST Security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html): endpoint별 통제와 CORS 등 REST 보안 검토 기준.
- [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): 서버 인가와 요청별 권한 검토 기준.
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html): 쿠키 기반 요청의 CSRF 방어 검토 기준.
- OpenAI 스킬 및 의존성 advisory는 앞 절의 원문 링크 참조. 외부 자료는 검토 기준이며 이 프로젝트의 취약점 존재 여부는 위 코드·실측 근거로 판단했다.
