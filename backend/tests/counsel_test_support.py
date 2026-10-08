def counsel_form(final_type='T2'):
    return dict(schemaVersion=1, channel='전화', conductedAt='2026-09-17T14:00', finalType=final_type,
                qualitative=dict(motivation='상', employmentWill='중', feasibility='하', communication='중', selfUnderstanding='상'),
                program=dict(selected=True, content='PRIVATE PROGRAM NOTES'),
                application=dict(selected=True, content='PRIVATE APPLICATION NOTES'), aiJournal='')


def generated_journal(request_id, value=None):
    """Persist a synthetic generation receipt for tests of other counseling rules."""
    from contextlib import contextmanager
    from uuid import uuid4
    from psycopg.types.json import Jsonb
    from app.main import app
    from app.db import connection
    from app.counsel_template import CounselTemplate, journal_input, journal_type
    form = dict(value or counsel_form())
    dependency = app.dependency_overrides.get(connection, connection)
    with contextmanager(dependency)() as conn:
        request = conn.execute('SELECT * FROM dc.counsel_request WHERE id=%s', (request_id,)).fetchone()
        if request is None:
            return form
        template = CounselTemplate.model_validate(form)
        run_id = 'test_journal_' + uuid4().hex
        conn.execute('''INSERT INTO dc.ai_run(id,kind_code,student_uid,subject_kind,subject_id,model,input_snapshot)
          VALUES(%s,'COUNSEL_COMMENT',%s,'COUNSEL_JOURNAL',%s,'test',%s)''',
          (run_id, request['student_uid'], request_id, Jsonb({'template': journal_input(template),
                                                          'diagnosisType': journal_type(conn, request, template)})))
    return {**form, 'aiJournal': 'Synthetic reviewed counseling journal', 'aiJournalRunId': run_id}
