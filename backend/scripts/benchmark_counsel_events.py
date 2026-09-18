"""Isolated, synthetic lookup benchmark; no service table writes.

Uses temporary table with the real event column layout, 8,000 request keys and
30 events per key. Measures only the event lookup, not API/authorization joins.
Requires DC_DB_NAME ending in _test. All temporary objects disappear on exit.
"""
import argparse
import json
from pathlib import Path
import statistics
import sys

import psycopg

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app.settings import settings


def benchmark(conn):
    conn.execute("SET LOCAL statement_timeout='60s'")
    conn.execute('SET LOCAL jit=off')
    conn.execute('CREATE TEMP TABLE event_bench (LIKE dc.counsel_event INCLUDING DEFAULTS INCLUDING CONSTRAINTS) ON COMMIT DROP')
    conn.execute('ALTER TABLE event_bench ADD PRIMARY KEY(id)')
    conn.execute("""INSERT INTO event_bench(request_id,actor_uid,kind,payload,created_at)
      SELECT 'request-'||(i%8000),'synthetic-actor','COMPLETE','{}',
        timestamptz '2026-01-01 00:00:00+00'+i*interval '1 second'
      FROM generate_series(1,240000) i""")
    conn.execute('ANALYZE event_bench')
    query="""EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT * FROM event_bench
      WHERE request_id='request-4000'
      AND kind IN ('CONFIRM','RESCHEDULE','REASSIGN','CANCEL','COMPLETE')
      ORDER BY created_at,id LIMIT 100 OFFSET 0"""
    result={'rows':240000,'requestKeys':8000,'eventsPerKey':30,
            'scope':'Synthetic event lookup only; no API/network/authorization timing.'}
    for phase in ('before','after'):
        if phase=='after':
            conn.execute('CREATE INDEX event_bench_request_timeline ON event_bench(request_id,created_at,id)')
            conn.execute('ANALYZE event_bench')
        conn.execute(query).fetchone()  # Warm-up, excluded from reported median.
        plans=[conn.execute(query).fetchone()[0][0] for _ in range(7)]
        result[phase]={'medianExecutionMs':statistics.median(p['Execution Time'] for p in plans),
                       'runsMs':[p['Execution Time'] for p in plans], 'plan':plans[-1]}
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    if not settings.db_name.endswith('_test'):
        raise SystemExit('Use an isolated *_test database')
    with psycopg.connect(**settings.connection_kwargs()) as conn:
        result=benchmark(conn)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps({p:result[p]['medianExecutionMs'] for p in ('before','after')}))
