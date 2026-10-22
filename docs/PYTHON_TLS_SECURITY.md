# emSign CA security update (2026-10-22)

The compromised `emSign ECC Root CA - G3` must be absent from both application
and package-manager CA bundles, and from the default OS/OpenSSL trust store.
Standalone certifi updates do not update pip's vendored bundle.

Minimum versions: pip 26.2.2, certifi 2026.10.19, uv 0.13.4 when installed.
Docker does not need uv; uvicorn is a separate application server package.

Sources:
- [Python security announcement and hash-verified pip bootstrap](https://discuss.python.org/t/information-for-python-users-regarding-emudhra-emsign-ca-certificate-security-incident/109576)
- [certifi advisory](https://github.com/certifi/python-certifi/security/advisories/GHSA-6q48-6c7w-9gw2)
- [uv advisory](https://github.com/astral-sh/uv/security/advisories/GHSA-hq85-5cpj-mr62)

## Building and checking

The API, RAG, and company Dockerfiles bootstrap pip from the announcement's
SHA256-verified wheel before installing dependencies. They refresh Debian CAs
and explicitly distrust G3 even if the distribution has not removed it yet.
Build assertions inspect the decoded CA subjects in the OS store and reject
the compromised root in standalone and pip-vendored certifi.

Local SearXNG derives from the existing pinned upstream release, replaces
certifi with 2026.10.19, and disables G3 in the Void Linux trust store.
`npm run docker:up` builds this derived image whenever local AI is enabled.
The company's existing SearXNG deployment is separate and is not updated by
changing the local Compose configuration.

Force a fresh base image and OS certificate refresh when applying CA updates:

```powershell
docker compose --env-file .env.docker.local -f compose.yaml -f compose.ai.yaml build --pull --no-cache api rag searxng
npm run docker:up
python scripts/check-python-tls.py
backend/.venv/Scripts/python.exe scripts/check-python-tls.py
uv --version
Get-Content scripts/check-python-tls.py -Raw | docker exec -i dreamcatch-local-api-1 python -
Get-Content scripts/check-python-tls.py -Raw | docker exec -i dreamcatch-local-rag-1 python -
Get-Content scripts/check-python-tls.py -Raw | docker exec -i dreamcatch-local-searxng-1 /usr/local/searxng/.venv/bin/python -
```

The checker does not contact remote services or read credentials. It validates
versions and decoded CA subjects. Use it for every newly created environment:
older Python installations can recreate an outdated pip through ensurepip.
Bootstrap that pip with the hash-verified command in the Python announcement,
then install `certifi>=2026.10.19`. Update standalone uv to at least 0.13.4.

On this PC, Conda's default OpenSSL bundle was separate from both certifi and the
Windows trust store. The G3 certificate was removed from that bundle after
backing it up under the ignored `_workspace/security-backups/` directory.
Conda CA package reinstalls can restore an older bundle; rerun the checker
after environment/package maintenance.

Old Docker tags and remote deployments retain their own contents. Build and
verify a new company image before any separately authorized server rollout;
local success does not establish that the server is patched.

## Verified on 2026-10-22

- Host Python and project venv: pip 26.2.2, certifi 2026.10.19; default SSL,
  standalone certifi, and pip-vendored bundles pass the checker. uv is 0.13.4.
- Running local API and RAG: pip 26.2.2, certifi 2026.10.19; all CA checks pass.
  SearXNG has no pip and passes with certifi 2026.10.19 and the patched OS store.
- The unmodified pinned SearXNG image fails the checker, confirming detection
  of its outdated certifi and compromised default SSL store.
- API/RAG dependency checks pass. Authenticated RAG retrieval returns three
  sources; API-to-SearXNG health and external HTTPS checks succeed. SearXNG's
  actual curl_cffi client and default urllib SSL client both complete HTTPS.
- Local Docker update completes with DB backup, migration verification, and
  healthy services. Chrome shows the login form with no console warnings/errors
  or horizontal overflow. A single health request returns HTTP 200, 338 bytes,
  39.4 ms after the update (25.6 ms before); no speed improvement is claimed.
- TypeScript and production web build pass. npm reports 10 dependency
  vulnerability warnings (1 low, 2 moderate, 7 high); those are separate from
  this CA incident and were not remediated by this change.
- All three inherited company Dockerfiles build locally and pass the TLS and
  dependency checks. BuildKit stalled while resolving the imported historical
  base image; process-local `DOCKER_BUILDKIT=0` allowed verification using the
  existing local base. No Docker setting was persisted and no server was changed.
