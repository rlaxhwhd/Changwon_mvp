"""Run explicit SQL migrations as the owner; never run DDL at API startup."""
import hashlib
from pathlib import Path

import psycopg

from .settings import settings


def preflight(conn, filename: str) -> None:
    """Refuse historically unsafe inputs before executing immutable legacy DDL."""
    if filename == '018_program_operations.sql':
        count = conn.execute("""SELECT count(*) FROM dc.program_apply
          WHERE snapshot->>'selectionStatus'='선발'
          AND NULLIF(snapshot->>'selectedAt','') IS NULL""").fetchone()[0]
        if count:
            raise RuntimeError(f'018 preflight: {count} selected applications lack selectedAt. Restore the known source timestamp before retrying; do not invent a selection time.')
    if filename == '028_followup_diagnosis_scores.sql':
        count = conn.execute("""SELECT count(*) FROM dc.diagnosis_result
          WHERE student_uid IN ('20211304','20196208') AND test_id IN ('c3','c4')
          AND source NOT LIKE 'fixture%' AND source NOT LIKE 'development:%'""").fetchone()[0]
        if count:
            raise RuntimeError('028 preflight: real diagnosis results overlap demo identities; use an isolated schema and complete migrations before importing real data.')


def migrate() -> None:
    directory = Path(__file__).resolve().parents[1] / 'migrations'
    with psycopg.connect(**settings.connection_kwargs()) as conn:
        conn.execute("SELECT pg_advisory_xact_lock(480091)")
        exists = conn.execute("SELECT to_regclass('dc.schema_migration')").fetchone()[0]
        applied = dict(conn.execute('SELECT version,checksum FROM dc.schema_migration').fetchall()) if exists else {}
        for path in sorted(directory.glob('*.sql')):
            body = path.read_text(encoding='utf-8')
            checksum = hashlib.sha256(body.encode()).hexdigest()
            if path.name in applied:
                if applied[path.name] != checksum:
                    raise RuntimeError(f'Applied migration changed: {path.name}')
                continue
            preflight(conn, path.name)
            conn.execute(body)
            conn.execute('INSERT INTO dc.schema_migration(version,checksum) VALUES (%s,%s)', (path.name, checksum))
            print(f'Applied {path.name}')


if __name__ == '__main__':
    migrate()
