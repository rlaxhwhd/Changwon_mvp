"""Read-only release audit. Outputs hashes/counts, never row contents or secrets.

Run with the schema owner for a complete audit. --data compares a DB snapshot,
not permanently equal live environments. Local and server secrets stay separate.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys

import psycopg
from psycopg import sql

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.settings import settings


def files(directory):
    return {p.name: hashlib.sha256(p.read_text(encoding='utf-8').encode()).hexdigest()
            for p in sorted(directory.glob('*.py' if directory.name == 'app' else '*.sql'))}


def snapshot(include_data=False):
    result = {'app': files(ROOT / 'app'), 'migration_files': files(ROOT / 'migrations')}
    with psycopg.connect(**settings.connection_kwargs()) as conn:
        conn.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
        conn.execute("SET LOCAL timezone = 'UTC'")
        conn.execute("SET LOCAL statement_timeout = '60s'")
        result['applied'] = dict(conn.execute('SELECT version,checksum FROM dc.schema_migration ORDER BY version'))
        if result['applied'] != result['migration_files']:
            raise RuntimeError('Migration history does not match the release files')
        definitions = []
        for query in [
            """SELECT n.nspname,c.relname,c.relkind,c.relowner::regrole::text,c.relacl::text
               FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
               WHERE n.nspname IN ('dc','academic') ORDER BY 1,2""",
            """SELECT table_schema,table_name,column_name,ordinal_position,data_type,
               udt_schema,udt_name,character_maximum_length,numeric_precision,numeric_scale,
               is_nullable,column_default FROM information_schema.columns
               WHERE table_schema IN ('dc','academic') ORDER BY 1,2,4""",
            """SELECT n.nspname,c.relname,k.conname,pg_get_constraintdef(k.oid)
               FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
               JOIN pg_namespace n ON n.oid=c.relnamespace
               WHERE n.nspname IN ('dc','academic') ORDER BY 1,2,3""",
            """SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes
               WHERE schemaname IN ('dc','academic') ORDER BY 1,2,3""",
            """SELECT schemaname,viewname,definition FROM pg_views
               WHERE schemaname IN ('dc','academic') ORDER BY 1,2""",
            """SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),
               pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
               WHERE n.nspname IN ('dc','academic') AND p.prokind IN ('f','p') ORDER BY 1,2,3""",
            """SELECT n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid),t.tgenabled
               FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
               JOIN pg_namespace n ON n.oid=c.relnamespace
               WHERE n.nspname IN ('dc','academic') AND NOT t.tgisinternal ORDER BY 1,2,3""",
            """SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies
               WHERE schemaname IN ('dc','academic') ORDER BY 1,2,3""",
        ]:
            definitions.append(conn.execute(query).fetchall())
        result['schema_hash'] = hashlib.sha256(json.dumps(definitions, default=str,
            ensure_ascii=False).encode()).hexdigest()
        if include_data:
            result['data'] = {}
            tables = conn.execute("""SELECT n.nspname,c.relname FROM pg_class c
                JOIN pg_namespace n ON n.oid=c.relnamespace
                WHERE n.nspname IN ('dc','academic') AND c.relkind='r' ORDER BY 1,2""").fetchall()
            for schema, table in tables:
                count, digest = conn.execute(sql.SQL("""SELECT count(*),
                    md5(coalesce(string_agg(h,'' ORDER BY h),''))
                    FROM (SELECT md5(to_jsonb(t)::text) h FROM {} t) rows""").format(
                        sql.Identifier(schema, table))).fetchone()
                result['data'][f'{schema}.{table}'] = {'count': count, 'hash': digest}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--reference', type=Path)
    parser.add_argument('--data', action='store_true')
    args = parser.parse_args()
    result = snapshot(args.data)
    if args.output:
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if args.reference:
        reference = json.loads(args.reference.read_text(encoding='utf-8'))
        keys = ['app', 'migration_files', 'applied', 'schema_hash'] + (['data'] if args.data else [])
        different = [key for key in keys if result.get(key) != reference.get(key)]
        if different:
            raise SystemExit('Release drift: ' + ', '.join(different))
        print('MATCH: application, migrations, schema' + (', snapshot data' if args.data else ''))
    else:
        print(f"Audited {len(result['app'])} application files, {len(result['applied'])} migrations"
              + (f", {len(result['data'])} tables" if args.data else ''))


if __name__ == '__main__':
    main()
