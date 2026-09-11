#!/usr/bin/env bash
# 테스트 DB 재구축. 이 저장소의 pytest 는 격리되지 않아 같은 DB 에 두 번 돌리면
# 무관한 실패가 난다("다른 관리자가 수정했습니다" 등). 매 실행 전에 새로 만든다.
set -e
cd "$(dirname "$0")/.."
PW="$(docker exec dreamcatch-dev-db printenv POSTGRES_PASSWORD)"
docker exec dreamcatch-dev-db psql -U postgres -d postgres -q \
  -c "DROP DATABASE IF EXISTS dreamcatch_test;" \
  -c "CREATE DATABASE dreamcatch_test OWNER dc_owner;"
docker exec dreamcatch-dev-db psql -U postgres -d dreamcatch_test -q \
  -c "REVOKE ALL ON DATABASE dreamcatch_test FROM PUBLIC;" \
  -c "GRANT CONNECT ON DATABASE dreamcatch_test TO dc_app;" \
  -c "CREATE SCHEMA dc AUTHORIZATION dc_owner;" \
  -c "GRANT USAGE ON SCHEMA dc TO dc_app;" \
  -c "ALTER ROLE dc_app IN DATABASE dreamcatch_test SET search_path = dc, pg_catalog;"
DC_DB_NAME=dreamcatch_test DC_DB_USER=postgres DC_DB_PASSWORD="$PW" .venv/Scripts/python.exe -m app.migrate >/dev/null
DC_DB_NAME=dreamcatch_test DC_DB_USER=postgres DC_DB_PASSWORD="$PW" .venv/Scripts/python.exe -m app.seed
