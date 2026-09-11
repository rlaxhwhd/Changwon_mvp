"""Read-only source dump -> unique isolated DB -> upgrade -> replay -> restore.

Run from backend: .venv/Scripts/python.exe scripts/rehearse_migrations.py
Uses only the documented local Docker container. Never drops source/test databases.
Leaves uniquely named *_test databases for inspection. No credentials in output.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[2]
BACKEND=ROOT/'backend'
CONTAINER='dreamcatch-dev-db'
stamp=datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
target=f'dc_upgrade_{stamp}_test'
restored=f'dc_restore_{stamp}_test'
fresh=f'dc_fresh_{stamp}_test'
artifacts=BACKEND/'var'/'rehearsal'/stamp
artifacts.mkdir(parents=True,exist_ok=False)


def docker(*args, data=None):
    return subprocess.run(['docker','exec','-i',CONTAINER,*args],input=data,capture_output=True,check=True).stdout


def query(db, sql):
    return docker('psql','-X','-U','postgres','-d',db,'-v','ON_ERROR_STOP=1','-At','-c',sql).decode().strip()


def python(db, module):
    env={**os.environ,'DC_DB_NAME':db,'DC_DB_USER':'postgres',
         'DC_DB_HOST':'127.0.0.1','DC_DB_PORT':'15432',
         'DC_DB_PASSWORD_FILE':str(ROOT/'deploy/secrets/postgres_password_local'),
         'DC_DEVELOPMENT_TOKEN_FILE':str(ROOT/'deploy/secrets/api_token')}
    result=subprocess.run([sys.executable,'-m',module],cwd=BACKEND,env=env,capture_output=True,text=True)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout


def fingerprint(db):
    return query(db,"BEGIN READ ONLY; SELECT md5(COALESCE(string_agg(student_uid||test_id||attempt_no||payload::text,'' ORDER BY student_uid,test_id,attempt_no),'')) FROM dc.diagnosis_result; COMMIT;")


before=fingerprint('dreamcatch')
versions=query('dreamcatch','SELECT version FROM dc.schema_migration ORDER BY version')
dump=docker('pg_dump','-U','postgres','-d','dreamcatch','-Fc')
(artifacts/'before.dump').write_bytes(dump)
for name in (target,restored,fresh):
    assert name.startswith(('dc_upgrade_','dc_restore_','dc_fresh_')) and name.endswith('_test')
    query('postgres',f'CREATE DATABASE {name} OWNER dc_owner')
for name in (target,restored):
    docker('pg_restore','-U','postgres','-d',name,'--exit-on-error',data=dump)
python(target,'app.migrate')
python(target,'app.seed_operations')
python(target,'app.migrate')  # Checksums and no-op replay.
assert fingerprint(target)==before,'Upgrade altered existing raw diagnosis results'
assert fingerprint(restored)==before,'Backup restore did not reproduce source'
assert fingerprint('dreamcatch')==before,'Source changed during rehearsal'
query(fresh,'CREATE SCHEMA dc AUTHORIZATION dc_owner; GRANT USAGE ON SCHEMA dc TO dc_app')
python(fresh,'app.migrate')
python(fresh,'app.seed')
python(fresh,'app.migrate')
report=dict(source='dreamcatch',upgradeDatabase=target,restoreDatabase=restored,freshDatabase=fresh,
            sourceVersions=versions.splitlines(),appliedVersions=query(target,'SELECT version FROM dc.schema_migration ORDER BY version').splitlines(),
            dumpSha256=hashlib.sha256(dump).hexdigest(),rawDiagnosisPreserved=True,restoreVerified=True,
            freshSeedVerified=True,replayVerified=True,
            limitation='Local development fixture data; no production-sized load test.')
(artifacts/'result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
