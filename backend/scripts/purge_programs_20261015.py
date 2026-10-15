"""One-off, explicitly authorized program data purge; NOT an automatic migration.

Default rolls back. Back up the target DB and attachments before --apply.
Use schema owner credentials. Rehearse on an isolated local DB first.
Recovery: restore backup to a separate DB, then selectively restore affected rows.
Never restore the whole production DB over subsequent business activity.
"""
import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.types.json import Jsonb

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.settings import settings

TARGETS = ['prog_001', 'prog_002', 'prog_26449262c949', 'prog_3cf812405b0f',
           'prog_501a9ab23636', 'prog_59b06c5de6cc', 'prog_73e7f57fc2a8', 'prog_d370983e6741']


def matches(value):
    return any(p in json.dumps(value, default=str) for p in TARGETS)


def clean_plan(conn, value):
    """Remove only target cells, retaining other snapshot/event fields and history."""
    if not isinstance(value, dict):
        return value
    result = dict(value)
    if 'cells' in result:
        result['cells'] = [c for c in result['cells'] if c.get('programId') not in TARGETS]
    if 'axes' in result:
        result['axes'] = [clean_plan(conn, a) for a in result['axes']]
    if 'progress' in result and 'byAxis' in result:
        cells = result.get('cells', [c for a in result.get('axes', []) for c in a.get('cells', [])])
        moment = datetime.fromisoformat(result['asOf'].replace('Z', '+00:00'))
        by_axis = {a: {'done': 0, 'total': 0, 'pct': 0} for a in ('IAP', 'CORE', 'GROWTH')}
        for cell in cells:
            alive = conn.execute('SELECT dc.roadmap_item_alive(%s,%s,%s,%s)',
                (cell['status'], cell['entry'], cell.get('expiresAt'), moment)).fetchone()[0]
            if alive:
                bucket = by_axis[cell['axis']]
                bucket['total'] += 1
                bucket['done'] += int(cell['status'] == 'DONE')
        total = {'done': sum(a['done'] for a in by_axis.values()),
                 'total': sum(a['total'] for a in by_axis.values())}
        for bucket in [*by_axis.values(), total]:
            bucket['pct'] = (200 * bucket['done'] + bucket['total']) // (2 * bucket['total']) if bucket['total'] else 0
        result['progress'], result['byAxis'] = total, by_axis
    return result


def purge(conn, allow_subset=False):
    conn.execute("SET LOCAL lock_timeout='10s'")
    conn.execute("SET LOCAL statement_timeout='60s'")
    conn.execute('SELECT pg_advisory_xact_lock(480093)')
    conn.execute('LOCK TABLE dc.program IN EXCLUSIVE MODE')
    actual = [r[0] for r in conn.execute('SELECT id FROM dc.program ORDER BY id')]
    if set(actual) != set(TARGETS) and not (allow_subset and set(actual) <= set(TARGETS)):
        raise RuntimeError('Program IDs changed; inspect before continuing')
    if not actual:
        raise RuntimeError('No target programs remain')
    counts = {}
    # Keep constraints and all other triggers active. DDL rolls back on any failure.
    tables = ('roadmap_event', 'roadmap_item_event', 'roadmap_snapshot',
              'program_apply_event', 'program_wishlist_event', 'penalty_entry',
              'notification', 'notification_read')
    for table in tables:
        conn.execute(sql.SQL('ALTER TABLE dc.{} DISABLE TRIGGER {}').format(
            sql.Identifier(table), sql.Identifier(table + '_immutable')))

    def delete(table, where, params=()):
        cursor = conn.execute(sql.SQL('DELETE FROM dc.{} WHERE ' + where).format(sql.Identifier(table)), params)
        counts[table] = cursor.rowcount

    target = 'program_id=ANY(%s)'
    delete('notification_read', 'notification_id IN (SELECT id FROM dc.notification WHERE '
           'split_part(source_id,\':\',1)=ANY(%s))', (TARGETS,))
    delete('notification', "split_part(source_id,':',1)=ANY(%s)", (TARGETS,))
    delete('survey_answer', 'response_id IN (SELECT id FROM dc.survey_response WHERE ' + target + ')', (TARGETS,))
    for table in ('survey_response', 'program_wishlist_event', 'program_wishlist',
                  'program_apply_event', 'program_apply', 'penalty_entry', 'student_program_history'):
        delete(table, target, (TARGETS,))
    delete('core_competency_allocation_axis',
           'allocation_id IN (SELECT id FROM dc.core_competency_allocation WHERE ' + target + ')', (TARGETS,))
    delete('core_competency_allocation', target, (TARGETS,))
    affected = [r[0] for r in conn.execute('SELECT DISTINCT student_uid FROM dc.roadmap_item WHERE ' + target, (TARGETS,))]
    delete('roadmap_item_event', "cause_id=ANY(%s) OR item_id=ANY(%s)",
           (TARGETS, ['auto-' + p for p in TARGETS]))
    delete('roadmap_item', target, (TARGETS,))
    delete('roadmap_event', "(cause_kind IN ('PROGRAM','PROGRAM_CUTOVER') AND cause_id=ANY(%s)) "
           "OR after_value->>'programId'=ANY(%s)", (TARGETS, TARGETS))
    for table, columns in [('roadmap_snapshot', ['payload']), ('roadmap_event', ['before_value', 'after_value'])]:
        for column in columns:
            query = sql.SQL('SELECT id,{} FROM dc.{}').format(sql.Identifier(column), sql.Identifier(table))
            changed = 0
            for row_id, value in conn.execute(query).fetchall():
                if matches(value):
                    cleaned = clean_plan(conn, value)
                    if matches(cleaned):
                        raise RuntimeError(f'Unrecognized reference in {table}.{column}')
                    conn.execute(sql.SQL('UPDATE dc.{} SET {}=%s WHERE id=%s').format(
                        sql.Identifier(table), sql.Identifier(column)), (Jsonb(cleaned), row_id))
                    changed += 1
            counts[f'{table}.{column}.cleaned'] = changed
    conn.execute('UPDATE dc.roadmap SET lock_version=lock_version+1,updated_at=now() WHERE student_uid=ANY(%s)', (affected,))
    # Application responses do not contain program IDs; all eight current programs
    # are in scope, so invalidate all cached application responses, plus matching plans.
    for actor, route, key, response in conn.execute('SELECT actor_uid,route,key,response FROM dc.idempotency').fetchall():
        if route == 'POST /programs/applications' or matches(key) or matches(response):
            conn.execute('DELETE FROM dc.idempotency WHERE actor_uid=%s AND route=%s AND key=%s', (actor, route, key))
            counts['idempotency'] = counts.get('idempotency', 0) + 1
    # Imported program seed provenance is not served, but contains the removed data.
    seed_path = 'src_admin/data/programs.seed.json'
    delete('import_issue', 'source_path=%s', (seed_path,))
    # Retain the original import checksum/marker, preventing seed replay on startup.
    counts['seed_source.payload.cleared'] = conn.execute(
        "UPDATE dc.seed_source SET payload='[]'::jsonb WHERE path=%s", (seed_path,)).rowcount
    delete('file_object', "owner_kind IN ('PROGRAM','PROGRAM_APPLICATION') AND split_part(owner_id,':',1)=ANY(%s)", (TARGETS,))
    delete('program_manager', target, (TARGETS,))
    delete('program', 'id=ANY(%s)', (TARGETS,))
    conn.execute('SET CONSTRAINTS ALL IMMEDIATE')
    for table in tables:
        conn.execute(sql.SQL('ALTER TABLE dc.{} ENABLE TRIGGER {}').format(
            sql.Identifier(table), sql.Identifier(table + '_immutable')))
    # Detect unexpected references, including JSON and columns without foreign keys.
    columns = conn.execute("""SELECT c.table_name,c.column_name FROM information_schema.columns c
        JOIN information_schema.tables t USING(table_schema,table_name)
        WHERE c.table_schema='dc' AND t.table_type='BASE TABLE'
        AND c.data_type IN ('text','jsonb','json','character varying','ARRAY')""").fetchall()
    for table, column in columns:
        remaining = conn.execute(sql.SQL('SELECT count(*) FROM dc.{} WHERE EXISTS '
            '(SELECT 1 FROM unnest(%s::text[]) p WHERE strpos({}::text,p)>0)').format(
                sql.Identifier(table), sql.Identifier(column)), (TARGETS,)).fetchone()[0]
        if remaining:
            raise RuntimeError(f'Remaining reference: {table}.{column}: {remaining}')
    return counts


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--rehearsal-subset', action='store_true')
    args = parser.parse_args()
    if args.rehearsal_subset and not settings.db_name.endswith('_test'):
        raise RuntimeError('Subset rehearsal requires an isolated *_test database')
    with psycopg.connect(**settings.connection_kwargs()) as conn:
        counts = purge(conn, args.rehearsal_subset)
        if not args.apply:
            conn.rollback()
        print(json.dumps({'committed': args.apply, 'counts': counts}))
