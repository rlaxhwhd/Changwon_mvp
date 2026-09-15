#!/bin/sh
set -eu
# Runtime only: never bake the development credential into the static bundle.
DC_PROXY_TOKEN=$(tr -d '\r\n' < /run/secrets/api_token)
case "$DC_PROXY_TOKEN" in
  ''|*[!A-Za-z0-9_-]*) echo 'Invalid development proxy token format' >&2; exit 1 ;;
esac
export DC_PROXY_TOKEN
export NGINX_ENVSUBST_FILTER='^DC_PROXY_TOKEN$'
exec /docker-entrypoint.sh "$@"
