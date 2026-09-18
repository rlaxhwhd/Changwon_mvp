"""Build a fresh isolated local test database and run the backend suite.

Run from backend: .venv/Scripts/python.exe scripts/run_regression.py
Additional arguments are passed to pytest. The database and UTF-8 log remain
available for diagnosis; no existing database is modified or removed.
"""
from datetime import datetime, timezone
import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / 'backend'


def main():
    name = 'dc_regression_' + datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S') + '_' + uuid4().hex[:6] + '_test'
    env = {**os.environ, 'PYTHONUTF8': '1', 'DC_DB_NAME': name,
           'DC_DB_HOST': '127.0.0.1', 'DC_DB_PORT': '15432', 'DC_DB_USER': 'postgres',
           'DC_DB_PASSWORD_FILE': str(ROOT / 'deploy/secrets/postgres_password_local'),
           'DC_DEVELOPMENT_TOKEN_FILE': str(ROOT / 'deploy/secrets/api_token'),
           'DC_ENVIRONMENT': 'development', 'DC_DEVELOPMENT_IDENTITY': 'true',
           'DC_ROADMAP_PROVIDER': 'disabled'}
    def sql(db, statement):
        subprocess.run(['docker', 'exec', 'dreamcatch-dev-db', 'psql', '-X', '-U', 'postgres',
                        '-d', db, '-v', 'ON_ERROR_STOP=1', '-c', statement], check=True,
                       stdout=subprocess.DEVNULL)
    sql('postgres', f'CREATE DATABASE {name} OWNER dc_owner')
    sql(name, 'CREATE SCHEMA dc AUTHORIZATION dc_owner; GRANT USAGE ON SCHEMA dc TO dc_app')
    log = BACKEND / 'var' / (name + '.log')
    log.parent.mkdir(exist_ok=True)
    print(f'Test database: {name}\nLog: {log}', flush=True)
    with log.open('w', encoding='utf-8') as output:
        for module in ('app.migrate', 'app.seed'):
            subprocess.run([sys.executable, '-m', module], cwd=BACKEND, env=env,
                           stdout=output, stderr=subprocess.STDOUT, check=True)
        result = subprocess.run([sys.executable, '-m', 'pytest', 'tests', '-q', '-ra', *sys.argv[1:]],
                                cwd=BACKEND, env=env, stdout=output, stderr=subprocess.STDOUT)
    print(log.read_text(encoding='utf-8').splitlines()[-1], flush=True)
    return result.returncode


if __name__ == '__main__':
    raise SystemExit(main())
