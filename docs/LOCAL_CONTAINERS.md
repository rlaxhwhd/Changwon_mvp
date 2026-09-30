# 로컬 전체 컨테이너 실행

저장소 루트의 `compose.yaml`은 로컬 PostgreSQL 데이터 볼륨을 재사용하면서
React 정적 빌드 + Nginx(`web`), FastAPI(`api`), PostgreSQL(`db`)을 실행한다.
기존 VPS용 `deploy/compose.*.yaml`과는 별도 구성이다.

## 새 컴퓨터에서 처음 켤 때 — 한 번만

`git clone`(또는 `git pull`) 직후에는 저장소에 없는 것이 세 가지다. 로컬 전용 비밀
3개(`deploy/secrets/`, git 제외), DB 데이터 볼륨, 그리고 빈 DB 의 스키마·시드다.
**컨테이너는 기동할 때 마이그레이션을 돌리지 않는다.** 이 셋을 한 번에 세운다.

```powershell
npm run docker:bootstrap
```

Docker Desktop 만 켜져 있으면 된다(Node 는 이 저장소를 받았으면 이미 있다).
여러 번 돌려도 안전하다 — 이미 있는 것은 건너뛰고, 기존 볼륨의 데이터는 지우지 않는다.
끝나면 전체 스택까지 떠 있고, 그다음부터는 `npm run docker:up` 하나면 된다.

> ⚠️ 이 스크립트는 **아직 빈 컴퓨터에서 실행해 보지 않았다**(2026-09-23). 막히면 그 단계의
> 명령을 [LOCAL_DEV.md](LOCAL_DEV.md) 「처음 한 번만 하는 것」에서 손으로 실행할 수 있다.

하는 일은 [`scripts/bootstrap-local.mjs`](../scripts/bootstrap-local.mjs) 에 순서대로 있다 —
비밀 생성 → 볼륨 생성 → `db` 기동 → `deploy/bootstrap.db.sql`(역할·스키마) →
`dc_app` 비밀번호 맞추기 → `app.migrate` + `app.seed`(compose 의 `bootstrap` 프로필) →
전체 기동.

## 실행과 접속

Docker Desktop이 실행된 상태에서 저장소 루트에서:

```powershell
npm run docker:up
npm run docker:ps
```

| 대상 | 주소 |
| --- | --- |
| 메인 | http://127.0.0.1:8080/ |
| 학생 | http://127.0.0.1:8080/v2/main |
| 관리자 | http://127.0.0.1:8080/admin/login |
| API 상태(DB 연결 포함) | http://127.0.0.1:8080/api/v1/health |
| API 직접 접속 | http://127.0.0.1:18101/api/v1/health |
| PostgreSQL | 127.0.0.1:15432 |

`npm run dev`와 `npm run dev:api` 없이 동작한다. 기존 개발 서버의
5173/18100 포트와 구분하기 위해 8080/18101을 사용한다.
소스 변경 후에는 `npm run docker:up`으로 이미지를 다시 빌드한다.

```powershell
npm run docker:logs
npm run docker:down
```

`docker:down`은 컨테이너와 Compose 네트워크를 제거한다. 외부 DB 볼륨과
호스트의 첨부파일은 유지된다. Docker Desktop에서 데이터 볼륨을 삭제하지 않는다.

## 기존 데이터와 비밀정보

- `.env.docker.local`의 `DC_LOCAL_PG_VOLUME`에 기존 DB 볼륨 이름을 저장한다.
  이 파일은 Git에서 제외되며, 없으면 Compose는 실행을 거부한다.
- 이 구성은 **이미 초기화된 로컬 DB**를 사용한다. 새 서버에서 빈 볼륨만 만들면
  앱 계정·스키마·데이터가 생기지 않는다. 별도 초기화 또는 백업 복원이 필요하다.
- 비밀번호는 `deploy/secrets/postgres_password_local`,
  `deploy/secrets/api_db_password_local`, 개발 토큰은 `deploy/secrets/api_token`을
  실행 시 마운트한다. 이미지에는 포함하지 않는다.
- 첨부파일은 기존 `backend/var/files`를 마운트한다. DB 백업과 별도로 백업한다.
- 기존 독립 DB 컨테이너 `dreamcatch-dev-db-before-compose`는 2026-09-30에
  사용자 요청으로 삭제했다. 공유 데이터 볼륨은 보존했으며 현재 `dreamcatch-dev-db`가 사용한다.
- 같은 날 이름이 `_test`로 끝나는 테스트 DB 70개를 활성 연결이 없는 상태에서 삭제했다.
  기본 `dreamcatch`와 PostgreSQL 기본 DB는 보존했다. 회귀 테스트를 다시 실행하면
  새 테스트 DB가 생성될 수 있다.
- 전환 전 DB 백업은 `backend/var/rehearsal/before-compose-*.dump`에 보관한다.

## 인증과 서버 배포 범위

Nginx가 기존 Vite 개발 프록시처럼 `X-DC-Token`을 서버 측에서 설정한다.
브라우저가 보낸 동일 헤더는 덮어쓰고, 토큰은 정적 JS에 넣지 않는다.
현재 API는 개발용 사용자 선택 방식이므로 모든 공개 포트는 로컬 루프백에만
바인딩한다. 회사 서버 검증 시에는 SSH 터널로 접속할 수 있다.
이 구성 자체가 운영 인증을 구현하지는 않는다.

이번 구성은 Docker Desktop에서의 로컬 실행용이다. CentOS 7 호환성은 실제
대상 서버의 커널·Docker 버전에서 별도로 검증해야 한다. 서버 이전 시에는
이미지뿐 아니라 Compose 설정, 서버용 비밀정보, DB 백업, 첨부파일이 필요하다.
Linux 호스트에서는 첨부파일 디렉터리에 API UID 10001의 쓰기 권한과 필요한
SELinux 레이블도 설정해야 한다.

### 회사 CentOS 7 시연 서버 (2026-09-30)

- 서버: `192.168.0.250`, SSH 3499. CentOS 7.9 / 커널 `3.10.0-1160.71.1.el7.x86_64`.
- Docker 26.1.4 / Compose 2.27.1. 시스템 XFS가 `ftype=0`이므로 사용자 승인하에
  `/var/lib/dreamcatch-docker-storage.ext4` 30GB 파일을 `/var/lib/docker`에 연결해
  `overlay2`를 사용한다. `/etc/fstab`과 Docker systemd 의존성으로 마운트를 보장한다.
- 배포 위치: `/opt/dreamcatch`. [회사 Compose](../deploy/compose.company.yaml)를
  `compose.yaml`로, [회사 Nginx 설정](../deploy/frontend/company.conf.template)을
  `nginx.conf.template`로 배치했다. DB/웹 이미지 태그는 `company-20260930`,
  API는 `company-session-20260930`이다.
- 세 서비스는 `dreamcatch-company-db-1`, `dreamcatch-company-api-1`,
  `dreamcatch-company-web-1`이며 DB/API는 호스트 포트를 공개하지 않는다.
- 사내 주소: `https://192.168.0.250:18443/`. 외부 예정 주소:
  `https://106.240.247.130:18443/`. 공유기에서 TCP 18443을 서버의 동일 포트로
  전달해야 한다. 서버 firewalld에는 해당 포트만 추가했다.
- 웹 전체와 API에 쿠키 기반 시연 접근 인증을 적용한다. 아이디는 `demo`이며
  암호는 로컬 `backend/var/deployment-20260930-112855/demo-access.txt`에만 기록한다.
  `/__demo/login`에서 한 번 입력하면 같은 주소·브라우저에서 8시간 유지된다.
  이 접근 암호와 앱의 학생/교직원 로그인은 별개다. 앱의 운영 인증을 구현한 것은 아니다.
  `__Host-dc_demo` 쿠키는 Secure/HttpOnly/SameSite=Lax이며 서버 비밀키로 서명한다.
  `secrets/demo_password`와 `secrets/demo_session_key`는 UID 10001 소유, 모드 400으로
  보관한다. 서명키를 보존하면 컨테이너 재생성 후에도 미만료 세션을 사용할 수 있다.
  로그인 POST는 같은 Origin만 허용하고 Nginx에서 요청 빈도를 제한한다.
- 인증서는 공인·사설 IP를 SAN으로 포함하는 자체 서명 인증서(180일)라 브라우저 경고가
  발생한다. API는 내부 프록시의 HTTPS 헤더를 신뢰하도록 구성했다.
- 원본 백업: 로컬 `backend/var/deployment-20260930-112855/`의 `dreamcatch.dump`와
  `files.tar.gz`. 서버에도 같은 백업을 보관한다. 비밀정보와 배포 묶음은 Git에 넣지 않는다.
- 서버 DB는 `dreamcatch-company_pgdata` 볼륨, 업로드는 `/opt/dreamcatch/files`에
  저장한다. 업로드 디렉터리와 API용 비밀 파일은 UID 10001이 접근할 수 있게 설정했다.
- 복원 후 `dc`/`academic`의 141개 테이블별 행 수를 비교했고 원본과 일치했다.
  사용자 레코드 48건, migration 109개도 일치했다. 앱은 비슈퍼유저 `dc_app`으로 연결한다.
- Chrome MCP에 표준 stdio 클라이언트로 직접 연결해 랜딩, 통합 로그인, 관리자 역할
  선택 → 메뉴관리를 검증했다. 관리자 화면 API 24건 모두 200, 동일 URL 중복 호출과
  콘솔 오류/경고 없음. 학생의 실제 로그인·업무 저장 전체는 이번 배포 검증에 포함하지 않았다.
- 로그인 없이 `/v2/main`에 진입하면 학생 세션 API의 401 이후 `/login`으로 이동한다.
  시연 세션과 별개이므로 시연 암호를 다시 입력하지 않는다. 2026-09-30에 반복 팝업을
  유발하던 HTTP Basic을 제거했다. 최초 시연 로그인은 `/__demo/login` 화면에서 수행한다.
  Nginx는 상대 경로 리다이렉트를 사용해 외부 18443 포트를 보존한다.
- 세션 변경 검증: DB를 사용하지 않는 `tests/test_demo_access.py` 5개 통과.
  Chrome에서 시연 로그인 1회 → 관리자 역할 선택/메뉴관리 → 학생 미로그인 상태의
  `/v2/main` → 통합 로그인 이동/새로고침을 확인했다. 시연 재로그인이나 브라우저 인증창은
  발생하지 않았다. 관리자 API 24건 모두 200, 중복 URL 없음, 최대 관측 시간 220ms.
  학생 미로그인 확인 API의 401은 정상적인 앱 인증 응답이며 시연 세션을 해제하지 않는다.
- Nginx gzip 적용 전후 같은 관리자 진입에서 비교과 응답 전송량은 1,043,233 → 726,973 bytes,
  채용은 732,925 → 482,568 bytes였다. 응답 본문 자체 크기와 앱 초기 조회 구조는 동일하다.
  사내망 측정이며 외부망 속도 개선이나 전체 기능 검증을 뜻하지 않는다.

서버 실행·상태 확인:

```bash
cd /opt/dreamcatch
docker compose up -d --wait
docker compose ps
docker compose logs --tail 50 api web
```

시연 중단은 `docker compose down`으로 수행한다. **`--volumes`를 붙이면 서버 DB가 삭제되므로
붙이지 않는다.** 재배포 전 서버 DB와 업로드를 함께 백업한다. 전체 서버 재부팅 검증과
외부망 접속 검증은 별도로 수행해야 한다.

## 향후 RAG

RAG가 FastAPI 내부의 검색·생성 함수이면 API 컨테이너에 포함할 수 있다.
별도 검색 API, 문서 수집/임베딩 작업자, GPU 모델 서버로 구현하면 각각
독립 서비스로 분리한다. 벡터 저장소도 PostgreSQL 확장을 사용할지 별도 DB를
사용할지에 따라 달라진다. 현재 구성에는 아직 RAG 서비스를 추가하지 않았다.
