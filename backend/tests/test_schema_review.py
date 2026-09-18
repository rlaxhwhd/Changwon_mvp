"""DB-side ownership/shape protection, independent of HTTP validation."""
from uuid import uuid4

import psycopg
import pytest

from app.db import pool


@pytest.fixture
def psych_row(client):
    with pool.connection() as conn, conn.transaction(force_rollback=True):
        request_id='schema_review_'+uuid4().hex
        parent=conn.execute('''INSERT INTO dc.counsel_request
          (id,student_uid,counselor_uid,type_code,legacy_type,care_track,status_code,
           method_code,topic,requested_at,snapshot,source_payload)
          SELECT %s,s.intg_uid,t.intg_uid,'PSY','심리',NULL,'CONFIRMED',
                 'OFFLINE','Schema constraint test',now(),'{}','{}'
          FROM dc.student s CROSS JOIN dc.staff t WHERE t.role_code='psych'
          LIMIT 1 RETURNING student_uid,counselor_uid''',(request_id,)).fetchone()
        assert parent
        row=conn.execute('''INSERT INTO dc.psych_test_result
          (id,request_id,student_uid,counselor_uid,test_code,tested_at,status_code,snapshot)
          VALUES (%s,%s,%s,%s,'MMPI2',CURRENT_DATE,'DRAFT','{}') RETURNING id,student_uid''',
          (request_id,request_id,parent['student_uid'],parent['counselor_uid'])).fetchone()
        yield conn,row


@pytest.mark.parametrize('column,value,constraint', [
    ('scales', '{}', 'ck_psych_test_result_scales_array'),
    ('scales', 'null', 'ck_psych_test_result_scales_array'),
    ('snapshot', '[]', 'ck_psych_test_result_snapshot_object'),
    ('snapshot', 'null', 'ck_psych_test_result_snapshot_object'),
])
def test_psych_json_containers(psych_row, column, value, constraint):
    conn,row=psych_row
    with pytest.raises(psycopg.errors.CheckViolation) as exc, conn.transaction():
        conn.execute(psycopg.sql.SQL('UPDATE dc.psych_test_result SET {}=%s::jsonb WHERE id=%s')
                     .format(psycopg.sql.Identifier(column)), (value,row['id']))
    assert exc.value.diag.constraint_name==constraint


def test_psych_request_student_ownership(psych_row):
    conn,row=psych_row
    other=conn.execute('SELECT intg_uid FROM dc.student WHERE intg_uid<>%s LIMIT 1',(row['student_uid'],)).fetchone()
    with pytest.raises(psycopg.errors.ForeignKeyViolation) as exc, conn.transaction():
        conn.execute('UPDATE dc.psych_test_result SET student_uid=%s WHERE id=%s',(other['intg_uid'],row['id']))
    assert exc.value.diag.constraint_name=='fk_psych_test_result_request_student'


@pytest.mark.parametrize('day,start,end', [
    ('2026-10-01','10:00',None),
    ('2026-10-01',None,'11:00'),
    (None,'10:00','11:00'),
])
def test_partial_counsel_slot_rejected(psych_row,day,start,end):
    conn,row=psych_row
    with pytest.raises(psycopg.errors.CheckViolation) as exc, conn.transaction():
        conn.execute('UPDATE dc.counsel_request SET slot_date=%s,slot_start=%s,slot_end=%s WHERE id=%s',
                     (day,start,end,row['id']))
    assert exc.value.diag.constraint_name=='ck_counsel_request_slot_shape'


def test_date_only_and_complete_counsel_slots_preserved(psych_row):
    conn,row=psych_row
    for day,start,end in [(None,None,None),('2026-10-01',None,None),('2026-10-01','10:00','11:00')]:
        conn.execute('UPDATE dc.counsel_request SET slot_date=%s,slot_start=%s,slot_end=%s WHERE id=%s',
                     (day,start,end,row['id']))
