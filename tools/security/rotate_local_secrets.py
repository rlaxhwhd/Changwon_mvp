"""Rotate only this checkout's localhost PostgreSQL and development API credentials.

Run with backend/.venv/Scripts/python.exe. Never prints old or new secret values.
Restart the local API and Docker API/web after completion. External Oracle is excluded.
"""
from pathlib import Path
import re
import secrets
import sys

import psycopg
from psycopg import sql

ROOT = Path(__file__).resolve().parents[2]
SECRET_DIR = ROOT / 'deploy' / 'secrets'


def main():
    paths = {name: SECRET_DIR / name for name in
             ('postgres_password_local', 'api_db_password_local', 'api_token')}
    env_path = ROOT / 'backend' / '.env'
    before = {path: path.read_bytes() for path in [*paths.values(), env_path]}
    config = before[env_path].decode('utf-8-sig')
    def setting(name):
        match = re.search(rf'^{name}=(.*)$', config, re.M)
        return match[1].strip().strip('\"\'') if match else ''
    if setting('DC_DB_HOST') not in ('127.0.0.1', 'localhost') or setting('DC_DB_PORT') != '15432':
        raise RuntimeError('Refusing to rotate a non-local database configuration')
    if setting('DC_DB_NAME') != 'dreamcatch' or setting('DC_DB_USER') != 'dc_app':
        raise RuntimeError('Unexpected local database or application role')
    values = {name: secrets.token_urlsafe(32) for name in paths}
    conn = psycopg.connect(host='127.0.0.1', port=15432, dbname='dreamcatch', user='postgres',
                          password=before[paths['postgres_password_local']].decode().strip(), connect_timeout=5)
    try:
        with conn:
            # Suppress statement/error logging for password-bearing SQL in this owner session.
            conn.execute("SET LOCAL log_statement = 'none'")
            conn.execute("SET LOCAL log_min_error_statement = 'panic'")
            for role, name in [('dc_app', 'api_db_password_local'), ('postgres', 'postgres_password_local')]:
                conn.execute(sql.SQL('ALTER ROLE {} PASSWORD {}').format(sql.Identifier(role), sql.Literal(values[name])))
            for name, path in paths.items():
                path.write_text(values[name], encoding='utf-8')
            config = re.sub(r'^DC_DB_PASSWORD=.*(?:\n|$)', '', config, flags=re.M)
            config = re.sub(r'^DC_DB_PASSWORD_FILE=.*(?:\n|$)', '', config, flags=re.M)
            config += '\nDC_DB_PASSWORD_FILE=' + paths['api_db_password_local'].as_posix() + '\n'
            env_path.write_text(config, encoding='utf-8')
    except Exception:
        for path, content in before.items():
            path.write_bytes(content)
        raise RuntimeError('Local rotation failed; credential files restored') from None
    for role, name in [('dc_app', 'api_db_password_local'), ('postgres', 'postgres_password_local')]:
        with psycopg.connect(host='127.0.0.1', port=15432, dbname='dreamcatch', user=role,
                              password=values[name], connect_timeout=5) as check:
            assert check.execute('SELECT 1').fetchone()[0] == 1
        try:
            old = psycopg.connect(host='127.0.0.1', port=15432, dbname='dreamcatch', user=role,
                                 password=before[paths[name]].decode().strip(), connect_timeout=5)
        except psycopg.OperationalError:
            print(role + ': new credential works; previous credential rejected')
        else:
            old.close()
            raise RuntimeError('Previous credential still works: check localhost authentication rules')
    print('Local API token rotated; Oracle untouched. Restart local API and Docker API/web.')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Database exceptions can include SQL: do not print their text/tracebacks.
        print('Rotation failed: ' + type(error).__name__, file=sys.stderr)
        sys.exit(1)
