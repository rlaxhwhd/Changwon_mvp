# 로컬 전체 컨테이너 실행

저장소 루트의 `compose.yaml`은 로컬 PostgreSQL 데이터 볼륨을 재사용하면서
React 정적 빌드 + Nginx(`web`), FastAPI(`api`), PostgreSQL(`db`)을 실행한다.
기존 VPS용 `deploy/compose.*.yaml`과는 별도 구성이다.

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
- 기존 독립 DB 컨테이너는 `dreamcatch-dev-db-before-compose`라는 이름으로
  정지 보관한다. 새 DB와 같은 볼륨을 사용하므로 **동시에 실행하지 않는다**.
  원복할 때는 먼저 `npm run docker:down`으로 새 DB를 종료한 뒤 기존 컨테이너를
  원래 이름으로 바꾸고 실행한다.
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

## 향후 RAG

RAG가 FastAPI 내부의 검색·생성 함수이면 API 컨테이너에 포함할 수 있다.
별도 검색 API, 문서 수집/임베딩 작업자, GPU 모델 서버로 구현하면 각각
독립 서비스로 분리한다. 벡터 저장소도 PostgreSQL 확장을 사용할지 별도 DB를
사용할지에 따라 달라진다. 현재 구성에는 아직 RAG 서비스를 추가하지 않았다.
