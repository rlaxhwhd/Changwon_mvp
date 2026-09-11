# VPS PostgreSQL 설치 기록

설치·검증일: 2026-09-08. 실제 서버에 설치 완료. 기획 정본은 [spec_v1.md](../spec_v1.md), 이 문서는 실행 결과와 접속 방법이다.

## 설치 결과

| 항목 | 실제 값 |
|---|---|
| 서버 | `115.68.178.124`, Rocky Linux 9.8, x86_64 |
| Docker Engine / Compose | 29.8.0 / 5.5.1, Docker 부팅 시 자동 시작 |
| PostgreSQL | 17.11, UTF8, DB timezone UTC |
| DB / 스키마 | `dreamcatch` / `dc` |
| 앱 계정 | `dc_app`, 로그인 가능, superuser·DB 생성·역할 생성 권한 없음 |
| 객체 소유자 | `dc_owner`, NOLOGIN |
| 컨테이너 | `dreamcatch-db-1`, restart `unless-stopped`, healthy |
| 접속 | **서버의 `127.0.0.1:5432`에만 바인딩**, 외부 5432 접속 거부 확인 |
| 영속 볼륨 | `dreamcatch_pgdata` → `/var/lib/postgresql/data` |
| 설정 | `/opt/dreamcatch/compose.db.yaml` |
| 초기 계정·권한 SQL | `/opt/dreamcatch/bootstrap.sql` |
| DB 관리자 암호 파일 | `/opt/dreamcatch/secrets/postgres_password` |
| 앱 암호 파일 | `/opt/dreamcatch/secrets/dc_app_password` |
| 초기 백업 | `/opt/dreamcatch/backups/initial-20260908.dump` |

이미지는 다음 digest로 고정했다. 설치 당시 확보한 PostgreSQL 17 bookworm 이미지이며 자동으로 다음 버전으로 바뀌지 않는다.

```text
postgres@sha256:051f7b7b3abdd564d5d1bd1e8c4b9c1b6e77087d1dd22020ede611c096a272e0
```

저장소의 재현용 설정: [compose.db.yaml](../deploy/compose.db.yaml), [bootstrap.db.sql](../deploy/bootstrap.db.sql). bootstrap SQL은 **빈 신규 DB에 한 번만** 실행한다. 암호는 SQL에 포함하지 않았으며 별도로 안전하게 설정해야 한다. 서버에 이미 적용된 SQL을 다시 실행하지 않는다.

2GB 계획에 따라 DB 메모리 제한 640MB, shared_buffers 128MB, 연결 상한 30개를 적용했다. 검증 종료 시 DB 컨테이너 메모리는 약 21.3MiB였다. 이는 빈 DB의 단일 측정치이며 실제 서비스 부하 성능을 의미하지 않는다.

## 접속 방법

### DBeaver의 SSH 기능 사용

PostgreSQL 연결을 만들고 다음과 같이 설정한다.

| 구분 | 값 |
|---|---|
| DB Host | `127.0.0.1` |
| DB Port | `5432` |
| Database | `dreamcatch` |
| Username | `dc_app` |
| Password | 서버의 `dc_app_password` 파일에 보관된 값 |
| SSH Host | `115.68.178.124` |
| SSH Port / User | `22` / `root` |
| SSH 인증 | 현재 서버 로그인 인증 사용. DB 암호와 서로 다름 |

앱 암호 확인이 필요한 경우 사용자가 직접 SSH 로그인 후 다음 명령으로 확인한다. 이 값을 Git·기획 문서·프론트엔드 환경변수에 복사하지 않는다.

```bash
cat /opt/dreamcatch/secrets/dc_app_password
```

두 암호 파일은 root 소유, 권한 `600`이며 상위 디렉터리는 `700`이다. 설치 과정에서 암호값을 로컬 저장소에 복사하거나 작업 출력에 표시하지 않았다.

### 로컬 FastAPI 또는 수동 터널

로컬 PowerShell에서 아래 명령을 실행한 채 유지한다.

```powershell
ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:15432:127.0.0.1:5432 root@115.68.178.124
```

이 경우 DB 클라이언트는 `127.0.0.1:15432`, DB `dreamcatch`, 사용자 `dc_app`으로 접속한다. DBeaver의 자체 SSH 기능과 수동 터널 중 한 방식을 선택한다. 설치 검증에 사용한 터널은 검증 후 종료했다.

2026-09-08 후속 구현으로 학생·학사·상담·진단·로드맵 기반 테이블과 관리자 코드·메뉴·조직 배정 테이블이 생성됐다. `dc_app`에는 테이블별 SELECT 및 필요한 업무 DML만 부여하고 DDL은 허용하지 않는다. DBeaver에서 `dreamcatch → Schemas → dc`를 새로고침하면 볼 수 있다. 실제 적용 목록은 `dc.schema_migration`에서 확인한다.

## 관리 명령

아래는 서버 Bash에서 실행한다.

```bash
cd /opt/dreamcatch
docker compose -f compose.db.yaml ps
docker compose -f compose.db.yaml logs --tail 100 db
docker compose -f compose.db.yaml restart db
docker compose -f compose.db.yaml exec db psql -U postgres -d dreamcatch
```

앱 비밀번호 변경은 관리자 psql의 `\password dc_app` 등을 통해 수행하고 서버의 암호 파일도 일치시킨다. `postgres_password` 파일 변경 및 컨테이너 재시작만으로 기존 DB 암호가 바뀌지 않는다. 데이터 초기화가 목적이 아니라면 `docker compose down -v`를 실행하지 않는다.

## 수행한 검증

- Compose 설정 검증 및 DB healthcheck 통과.
- 호스트 TCP 경유 앱 암호 인증 성공, 잘못된 암호 인증 거부.
- 앱 계정의 `CREATE TABLE` 권한 거부.
- 임시 테이블 쓰기 → 컨테이너 강제 재생성 → 저장값 조회 성공. 검증 테이블 삭제 완료.
- 로컬 PC에서 공인 IP의 5432 직접 연결 거부.
- 로컬 PC의 SSH 터널을 통해 PostgreSQL SCRAM 인증 요청 응답 확인.
- UTF8, UTC, 서버 버전 확인. 서버 재부팅 자체는 수행하지 않음.
- 초기 `pg_dump -Fc` 생성. 현재는 빈 스키마 백업이며 정기 백업·외부 복제·전체 복구 훈련은 아직 미구성.

## 서버 상태와 남은 운영 작업

설치 전부터 SELinux는 Disabled, firewalld는 inactive였다. 서버 로그인 시 다수의 SSH 인증 실패 기록도 관측했다. 기존 SSH 계정·암호·로그인 정책과 호스트 방화벽 정책은 이번 DB 설치에서 변경하지 않았다. 공개 운영 전에는 키 기반 운영 계정, root 로그인 제한, 접속 IP 정책을 적용해야 한다. `spec_v1.md`의 `deploy` 계정 예시는 아직 생성되지 않았다.

Docker 의존성 `container-selinux` 설치 중 SELinux 모듈 컴파일 경고가 있었다. 현재 정책 패키지는 저장소 최신 버전이었고 업데이트할 항목은 없었다. SELinux가 이미 비활성인 이 서버에서 Docker/DB 동작 검증은 통과했으나, SELinux 활성화 전 모듈 호환 문제를 별도로 해결해야 한다. 관련 확인 로그는 `/opt/dreamcatch/selinux-policy-update.log`에 있다.

이후 작업: 남은 업무 로더의 API 전환, 운영 인증, 정기·외부 백업 및 복원 시험. 전체 운영 서비스 구축 완료를 의미하지 않는다.

## 관리자 화면과 API 개발 연결

API 컨테이너는 VPS에서 `127.0.0.1:8000`으로 실행한다. 로컬 컴퓨터가 꺼져도 VPS의 PostgreSQL·API는 계속 실행되며, 끊기는 것은 로컬 SSH 터널이다.

```powershell
ssh -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -L 127.0.0.1:18000:127.0.0.1:8000 root@115.68.178.124
```

터널을 유지한 상태에서 `npm run dev`를 실행하고 `/admin/login`의 **시스템관리자**를 선택한다. 관리 화면은 `/admin/system`이다. 이번 검증 서버는 `http://127.0.0.1:5180/admin/system`에서 실행했다. 기존 개발 서버가 예전 프록시 설정으로 실행 중이면 재시작해야 한다.

Vite 프록시가 로컬의 git 제외 파일 `deploy/secrets/api_token`을 읽어 서버 인증 헤더를 추가한다. 이 토큰은 브라우저 번들에 포함하지 않는다. 실제 학교 로그인은 아직 연결하지 않았으므로 역할 선택은 SSH 개발 환경 전용이다.

- **코드 관리:** 학생 유형·진단 명칭 변경, 상담 주제 추가·수정·비활성화, 변경 사유·이력 조회.
- **학과 담당 배정:** 교직원/학과 검색 → 정확한 단대·학과 코드 선택 → 기간·사유 입력 → 저장. 조직 원본 수정은 지원하지 않는다.
- **메뉴 관리:** 이미 구현된 메뉴의 명칭·순서·노출 변경. 메뉴로 데이터 접근 권한을 우회할 수 없다.
- **변경 이력 / 이관 확인 사항:** 변경 전후 값 및 원본 자료에서 확인이 필요한 항목 조회.

주요 확인 테이블은 `dc.code_group`, `dc.code_item`, `dc.code_item_event`, `dc.org_assignment`, `dc.menu`, `dc.menu_auth`, `dc.auth_role`, `dc.auth_user`, `dc.admin_event`다. 코드 그룹과 구조 코드 신설은 배포 과정에서 처리한다.

진단 후속 연결: `dc.diagnosis_attempt`, `dc.diagnosis_result`, `dc.diagnosis_comment`, `dc.diagnosis_nudge`, `dc.diagnosis_factor_definition`을 사용한다. `dc.diagnosis_status`는 응시 여부를 파생하는 뷰다. 관리자 코드 그룹 `DIAGNOSIS_FACTOR`에서 결과 항목 명칭을 수정할 수 있다. [진단 결과표 계약](DIAGNOSIS_RESULT_CONTRACT.md)에 항목·점수 취급 기준을 정리했다.

관리자 반영 후 `/opt/dreamcatch/backups/after-administration-20260908.dump`를 별도 DB로 복원하여 주요 테이블 건수가 일치함을 확인했다. 이는 수동 복원 검증이며 정기 백업 구성 완료를 뜻하지 않는다.

설치 절차 참고: [Rocky Linux Docker 공식 안내](https://docs.rockylinux.org/gemstones/containers/docker/), [PostgreSQL 공식 Docker 이미지](https://hub.docker.com/_/postgres).
