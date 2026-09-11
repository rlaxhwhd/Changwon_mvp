"""Explicit development-only seed for notices. Never runs on API startup."""
import json
from pathlib import Path

from .settings import settings


def seed_notices(conn):
    if settings.environment != 'development':
        raise RuntimeError('Notice fixtures are development-only')
    # Only seed when this DB contains repository fixtures, not academic identities.
    if not conn.execute("SELECT 1 FROM dc.person WHERE source='fixture' LIMIT 1").fetchone():
        return
    path=Path(__file__).resolve().parents[1]/'seeds/notices.json'
    for item in json.loads(path.read_text(encoding='utf-8')):
        conn.execute('''INSERT INTO dc.notice(id,category,title,summary,body,posted_at,pinned)
          VALUES(%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING''',
          (item['id'],item['category'],item['title'],item['summary'],item['body'],item['postedAt'],item.get('pinned',False)))


if __name__=='__main__':
    import psycopg
    with psycopg.connect(**settings.connection_kwargs()) as conn:
        seed_notices(conn)
