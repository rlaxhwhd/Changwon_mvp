# 로컬 개발 스택 — `npm run dev` 하나로 화면 보기

가상서버(VPS)에 배포하지 않고도 내 컴퓨터에서 전체를 띄우는 방법이다.
**프론트엔드가 API 없이는 렌더되지 않기 때문에**(로더가 JSON에서 API로 바뀌었다) DB와 API가 함께 떠 있어야 한다.

> 여기 나오는 암호는 **내 컴퓨터 전용**이다. 가상서버 암호와 무관하며 `deploy/secrets/`·`backend/.env` 는 git에 올라가지 않는다.

---

## 매번 하는 것 — 창 3개

컴퓨터를 껐다 켰다면 이 순서대로 한 번씩 실행한다.

| 순서 | 명령 | 무엇이 뜨나 |
|---|---|---|
| 1 | Docker Desktop 실행 | 고래 아이콘이 «Running» 이 될 때까지 기다린다 |
| 2 | `npm run dev:db` | PostgreSQL (127.0.0.1:15432) |
| 3 | `npm run dev:api` | 백엔드 API (127.0.0.1:18100) — **창을 닫지 말 것** |
| 4 | `npm run dev` | 화면 (127.0.0.1:5173) — **창을 닫지 말 것** |

브라우저에서 학생 화면은 <http://127.0.0.1:5173/v2/main>, 교직원 화면은 <http://127.0.0.1:5173/admin> 이다.

**3번과 4번은 각각 다른 터미널 창**에서 실행하고 그대로 켜 둔다. 닫으면 화면이 끊긴다.

---

## `npm run dev` 가 어디를 보는가

`.env.local` (git 무시) 한 줄이 정한다.

```
DC_API_TARGET=http://127.0.0.1:18100
```

| 이 파일이 | `npm run dev` 가 붙는 곳 |
|---|---|
| 있으면 | 위 주소 = **내 컴퓨터의 API** |
| 없으면 | `127.0.0.1:18000` = **가상서버로 가는 SSH 터널** |

가상서버 쪽 화면을 보고 싶으면 `.env.local` 을 지우거나 주석 처리하고 `npm run dev` 를 다시 시작한다.
셸에서 `DC_API_TARGET=... npm run dev` 로 그때만 바꿀 수도 있다(셸 변수가 파일보다 우선).

---

## 처음 한 번만 하는 것 <span>(이미 되어 있다)</span>

다른 컴퓨터에서 새로 세우거나 DB를 날렸을 때만 필요하다.

```bash
# 1. 로컬 전용 암호 2개 만들기
python -c "import secrets,pathlib; d=pathlib.Path('deploy/secrets'); d.mkdir(parents=True,exist_ok=True); [ (d/n).write_text(secrets.token_urlsafe(24)) for n in ('postgres_password_local','api_db_password_local') ]"

# 2. PostgreSQL 컨테이너 (가상서버와 같은 고정 이미지)
docker run -d --name dreamcatch-dev-db \
  -e POSTGRES_DB=dreamcatch -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD="$(cat deploy/secrets/postgres_password_local)" \
  -e TZ=Asia/Seoul -p 127.0.0.1:15432:5432 \
  postgres@sha256:051f7b7b3abdd564d5d1bd1e8c4b9c1b6e77087d1dd22020ede611c096a272e0 \
  postgres -c timezone=UTC

# 3. 역할·스키마 만들기 + 앱 계정 암호
docker exec -i dreamcatch-dev-db psql -U postgres -d dreamcatch -v ON_ERROR_STOP=1 < deploy/bootstrap.db.sql
docker exec -i dreamcatch-dev-db psql -U postgres -d dreamcatch -c \
  "ALTER ROLE dc_app PASSWORD '$(cat deploy/secrets/api_db_password_local)'"

# 4. 테이블 만들고 데이터 넣기 (소유자 권한이 필요해 postgres 로 실행한다)
cd backend
DC_DB_PORT=15432 DC_DB_USER=postgres DC_DB_PASSWORD="$(cat ../deploy/secrets/postgres_password_local)" \
  .venv/Scripts/python.exe -m app.migrate
DC_DB_PORT=15432 DC_DB_USER=postgres DC_DB_PASSWORD="$(cat ../deploy/secrets/postgres_password_local)" \
  .venv/Scripts/python.exe -m app.seed --root ..
```

`backend/.env` 가 API의 접속 설정을 담는다(git 무시). 없으면 `backend/.env.example` 을 보고 만든다.

---

## 백엔드 테스트

**별도의 `_test` DB에서만 돈다.** `conftest.py` 가 DB 이름이 `_test` 로 끝나지 않으면 실행을 거부한다 — 개발용 데이터를 테스트가 망가뜨리지 않게 하는 안전장치다.

```bash
cd backend
DC_DB_PORT=15432 DC_DB_NAME=dreamcatch_test DC_DB_USER=dc_app \
  DC_DB_PASSWORD="$(cat ../deploy/secrets/api_db_password_local)" \
  DC_DEVELOPMENT_TOKEN_FILE="$(pwd)/../deploy/secrets/api_token" \
  .venv/Scripts/python.exe -m pytest -q
```

⚠️ **테스트는 서로 격리돼 있지 않다.** 같은 DB에 데이터를 쌓기 때문에 두 번 연속 돌리면 건수를 세는 테스트가 실패한다.
다시 돌리기 전에 `_test` DB를 새로 만든다 — `DROP DATABASE dreamcatch_test WITH (FORCE)` 후 위 4번 절차를 `dreamcatch_test` 로 반복한다.

---

## 문제가 생기면

| 증상 | 원인 · 조치 |
|---|---|
| 화면에 **「다시 연결」** 버튼만 뜬다 | API가 꺼져 있다. `npm run dev:api` 창을 확인한다 |
| API가 `bind on address ... 18100` 오류 | 이전 API가 아직 살아 있다. 그 창을 닫거나 프로세스를 끝낸다 |
| DB 연결 실패 | Docker Desktop이 꺼져 있다. 켠 뒤 `npm run dev:db` |
| 화면은 뜨는데 비교과·벌점이 비어 있다 | 시드를 안 넣었다. 위 4번 `app.seed` 실행 |

⚠️ **`docker compose down -v` 를 재시작 목적으로 쓰지 않는다** — 데이터 전체 삭제다.
로컬 DB를 완전히 지우려면 `docker rm -f dreamcatch-dev-db` 후 처음 설치 절차를 다시 밟는다.
