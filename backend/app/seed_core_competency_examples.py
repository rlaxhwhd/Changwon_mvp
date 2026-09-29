"""User-requested graph examples; owner-only, development-only, no academic writes."""
import psycopg
from psycopg.rows import dict_row

from .settings import settings

EXAMPLES = {'LOCAL_LEADER': 70, 'CREATIVE': 84, 'CONVERGENCE': 63,
            'COMMUNICATION': 77, 'GLOBAL': 56}
TARGETS = [('chaewon', '20211304', '20990001', '김채원'),
           ('changwon', '20196208', '20990002', '김창원')]


def seed(conn):
    if settings.environment != 'development':
        raise RuntimeError('Development examples cannot be installed in production')
    for alias, uid, number, name in TARGETS:
        row = conn.execute('''SELECT p.alias,p.name,p.source,p.kind,s.student_no
          FROM dc.person p JOIN dc.student s USING(intg_uid) WHERE p.intg_uid=%s
          FOR UPDATE OF p,s''', (uid,)).fetchone()
        if not row or dict(row) != dict(alias=alias, name=name, source='fixture', kind='STUDENT', student_no=number):
            raise RuntimeError(f'Refusing to alter an unrelated student: {alias}')
        for code, score in EXAMPLES.items():
            conn.execute('''INSERT INTO dc.development_core_competency_score(student_uid,competency_code,score)
              VALUES(%s,%s,%s) ON CONFLICT(student_uid,competency_code) DO NOTHING''', (uid, code, score))


if __name__ == '__main__':
    with psycopg.connect(**settings.connection_kwargs(), row_factory=dict_row) as conn:
        seed(conn)
    print('Prepared competency examples for chaewon and changwon')
