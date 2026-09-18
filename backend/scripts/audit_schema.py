"""Export schema metadata without business rows or credentials (read-only).

Run from backend with the usual DC_DB_* settings:
  python scripts/audit_schema.py --output var/schema-audit.json
Only dc/academic are inspected. Row counts are planner estimates, not COUNT(*).
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys

import psycopg
from psycopg.rows import dict_row

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.settings import settings


QUERIES = {
    'tables': """SELECT n.nspname AS schema, c.relname AS name, c.relkind,
      c.reltuples::bigint AS estimated_rows, pg_total_relation_size(c.oid) AS bytes,
      c.relrowsecurity AS rls
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('dc','academic') AND c.relkind IN ('r','p','v','m')
      ORDER BY 1,2""",
    'columns': """SELECT n.nspname AS schema,c.relname AS table_name,a.attname AS name,
      a.attnum AS position,format_type(a.atttypid,a.atttypmod) AS type,
      a.attnotnull AS not_null,pg_get_expr(d.adbin,d.adrelid) AS default_expression,
      a.attidentity AS identity,a.attgenerated AS generated
      FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE n.nspname IN ('dc','academic') AND c.relkind IN ('r','p')
      AND a.attnum>0 AND NOT a.attisdropped ORDER BY 1,2,a.attnum""",
    'constraints': """SELECT n.nspname AS schema,t.relname AS table_name,c.conname AS name,
      c.contype AS type,c.convalidated AS validated,pg_get_constraintdef(c.oid) AS definition
      FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
      JOIN pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname IN ('dc','academic') ORDER BY 1,2,3""",
    'indexes': """SELECT n.nspname AS schema,t.relname AS table_name,c.relname AS name,
      i.indisvalid AS valid,i.indisready AS ready,pg_get_indexdef(i.indexrelid) AS definition,
      pg_relation_size(i.indexrelid) AS bytes,s.idx_scan
      FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid
      JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_namespace n ON n.oid=t.relnamespace
      LEFT JOIN pg_stat_user_indexes s ON s.indexrelid=i.indexrelid
      WHERE n.nspname IN ('dc','academic') ORDER BY 1,2,3""",
    'fk_without_full_prefix_index': """SELECT n.nspname AS schema,t.relname AS table_name,
      c.conname AS name,pg_get_constraintdef(c.oid) AS definition
      FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
      JOIN pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname IN ('dc','academic') AND c.contype='f' AND NOT EXISTS (
        SELECT 1 FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid
        JOIN pg_am am ON am.oid=ic.relam
        WHERE i.indrelid=c.conrelid AND i.indisvalid AND i.indisready
        AND i.indpred IS NULL AND am.amname='btree'
        AND i.indnkeyatts>=cardinality(c.conkey)
        AND ARRAY(SELECT k FROM unnest(i.indkey::smallint[]) WITH ORDINALITY AS x(k,pos)
                  WHERE pos<=cardinality(c.conkey) ORDER BY k)
          = ARRAY(SELECT k FROM unnest(c.conkey) k ORDER BY k)) ORDER BY 1,2,3""",
    'triggers': """SELECT n.nspname AS schema,c.relname AS table_name,t.tgname AS name,
      t.tgenabled AS enabled,pg_get_triggerdef(t.oid) AS definition
      FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('dc','academic') AND NOT t.tgisinternal ORDER BY 1,2,3""",
    'grants': """SELECT table_schema AS schema,table_name,grantee,privilege_type
      FROM information_schema.role_table_grants
      WHERE table_schema IN ('dc','academic') AND grantee IN ('dc_app','PUBLIC')
      ORDER BY 1,2,3,4""",
    'views': """SELECT schemaname AS schema,viewname AS name,definition
      FROM pg_views WHERE schemaname IN ('dc','academic') ORDER BY 1,2""",
    'duplicate_indexes': """SELECT n.nspname AS schema,t.relname AS table_name,
      a.indexrelid::regclass::text AS first_index,b.indexrelid::regclass::text AS second_index
      FROM pg_index a JOIN pg_index b ON a.indrelid=b.indrelid AND a.indexrelid<b.indexrelid
      JOIN pg_class t ON t.oid=a.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace
      JOIN pg_class ac ON ac.oid=a.indexrelid JOIN pg_class bc ON bc.oid=b.indexrelid
      WHERE n.nspname IN ('dc','academic') AND ac.relam=bc.relam
      AND a.indkey=b.indkey AND a.indclass=b.indclass AND a.indcollation=b.indcollation
      AND a.indoption=b.indoption AND a.indnkeyatts=b.indnkeyatts
      AND a.indisunique=b.indisunique AND a.indnullsnotdistinct=b.indnullsnotdistinct
      AND pg_get_expr(a.indpred,a.indrelid) IS NOT DISTINCT FROM pg_get_expr(b.indpred,b.indrelid)
      AND pg_get_expr(a.indexprs,a.indrelid) IS NOT DISTINCT FROM pg_get_expr(b.indexprs,b.indrelid)
      ORDER BY 1,2,3""",
    'migrations': 'SELECT version,checksum FROM dc.schema_migration ORDER BY version',
}


def audit(conn):
    with conn.transaction():
        conn.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
        conn.execute("SET LOCAL statement_timeout='15s'")
        result = {key: conn.execute(sql).fetchall() for key, sql in QUERIES.items()}
        result['server_version'] = conn.execute('SHOW server_version').fetchone()['server_version']
    directory = Path(__file__).resolve().parents[1] / 'migrations'
    result['checksum_mismatches'] = [row['version'] for row in result['migrations']
        if not (directory / row['version']).is_file()
        or hashlib.sha256((directory / row['version']).read_text(encoding='utf-8').encode()).hexdigest()
        != row['checksum']]
    return result


def markdown_inventory(result):
    lines=['# DB 전체 구조 명세 — 카탈로그 추출', '',
           '업무 행·개인정보 없이 카탈로그만 추출. estimated_rows는 통계 추정값이며 -1은 미수집이다.',
           '정규화·변경 판단은 [DB 리뷰](../DB_REVIEW_2026-09-16.md)를 함께 본다.',
           'FK 인덱스 후보는 전체 키의 비부분 B-tree 선두 포함 여부만 검사한다. 부분 인덱스와 더 짧은 UNIQUE 인덱스가 충분할 수 있으므로 결함 목록이 아니다.', '']
    for table in result['tables']:
        if table['relkind'] not in ('r','p'):
            continue
        schema,name=table['schema'],table['name']
        def rows(key):
            return [r for r in result[key] if r.get('schema')==schema and r.get('table_name')==name]
        lines += [f'## {schema}.{name}', '',
                  f"추정 행수 {table['estimated_rows']}, 테이블·인덱스 총 {table['bytes']} bytes.", '',
                  '| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |', '|---|---|---|---|']
        for col in rows('columns'):
            default=col['default_expression'] or ('IDENTITY '+col['identity'] if col['identity'] else '—')
            lines.append(f"| {col['name']} | {col['type']} | {'O' if col['not_null'] else '—'} | {default.replace('|', '&#124;')} |")
        for key,label in [('constraints','제약'),('indexes','인덱스'),('triggers','트리거')]:
            lines += ['',f'**{label}**', '']
            entries=rows(key)
            if not entries:
                lines.append('없음.')
            for row in entries:
                lines.append(f"- `{row['name']}`: `{row['definition']}`")
        lines += ['', '**앱 계정 권한**', '', ', '.join(sorted({r['privilege_type'] for r in rows('grants') if r['grantee']=='dc_app'})) or '없음.', '']
    lines += ['## 뷰 정의', '']
    for view in result['views']:
        lines += [f"### {view['schema']}.{view['name']}", '', '```sql', view['definition'], '```', '']
    return '\n'.join(lines)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--markdown', type=Path)
    args = parser.parse_args()
    with psycopg.connect(**settings.connection_kwargs(), row_factory=dict_row) as conn:
        result = audit(conn)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    if args.markdown:
        args.markdown.parent.mkdir(parents=True, exist_ok=True)
        args.markdown.write_text(markdown_inventory(result),encoding='utf-8')
    print(json.dumps({key: len(value) for key,value in result.items() if isinstance(value,list)}))
