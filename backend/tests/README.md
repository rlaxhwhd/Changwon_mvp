# Backend regression checks

From `backend`, with the local `dreamcatch-dev-db` container running:

```powershell
.venv/Scripts/python.exe scripts/run_regression.py
```

The runner creates a uniquely named `*_test` database, applies all migrations,
loads the repository seed, and runs `pytest tests -q -ra`. It requires the existing
local PostgreSQL owner secret and development API token in `deploy/secrets`.
The test database and UTF-8 log in `backend/var` remain available for inspection.
It never overwrites or deletes an existing database.

Fixture preparation uses the owner account. Permission-denial checks explicitly
use `SET LOCAL ROLE dc_app`. Roadmap fixture tests select their provider explicitly,
and the shared HTTP client's cookies are cleared between tests. Run the full suite
against a fresh database: some workflow tests deliberately share committed state.
Additional pytest options, such as `-k roadmap`, can be passed to the runner.

Two academic directory tests are intentionally separate because they inspect the
existing local academic mirror with the application account and read-only
transactions. Run them explicitly; a skip in pytest does not mean they passed:

```powershell
.venv/Scripts/python.exe tests/test_academic_directory.py
```

This standalone check additionally requires `deploy/secrets/api_db_password_local`.
