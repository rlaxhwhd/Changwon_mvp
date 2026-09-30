from datetime import date, datetime
from uuid import uuid4

import pytest

from app import lounge, survey
from app.lounge import week_bounds, weekly_items
from test_api import headers
from test_programs import new_program
from test_psych_referrals import db  # noqa: F401

DAY = date(2026, 9, 30)
UID = '20211304'


@pytest.fixture(autouse=True)
def freeze_day(monkeypatch):
    monkeypatch.setattr(lounge, 'today', lambda: DAY)
    class Clock(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2026, 9, 30, 12, tzinfo=survey.SEOUL).astimezone(tz or survey.SEOUL)
    monkeypatch.setattr(survey, 'datetime', Clock)


def program(client, db, *, selected='2026-09-28T01:00:00Z', start='2026-10-02', outcome=None, selection='SELECTED'):
    p = new_program(client, title='주간 일정 검증', endDate='2026-09-27', runStartDate=start,
                    runEndDate='2026-10-04', competencySurvey=True, competencyAreas=['JOB_1'], satisfactionSurvey=True)
    db.execute('''INSERT INTO dc.program_apply(program_id,student_uid,snapshot,selection_code,selected_at,outcome_code,applied_at)
      VALUES(%s,%s,'{}',%s,%s,%s,now())''', (p['id'], UID, selection, selected, outcome))
    return p['id']


def notice(db, program_id, phase, at):
    return db.execute('''INSERT INTO dc.notification(recipient_uid,source_kind,source_id,tone,title,body,route,occurred_at)
      VALUES(%s,'PROGRAM_SURVEY',%s,'program','조사','안내',%s,%s) RETURNING id''',
      (UID, program_id+':'+phase, f'/mypage/programs/{program_id}/survey/{phase}', at)).fetchone()['id']


def own_items(db, program_id):
    return [item for item in weekly_items(db, UID, DAY)['items'] if program_id in item['id']]


def test_week_boundaries_across_month_and_year():
    assert week_bounds(date(2026, 9, 28)) == (date(2026, 9, 28), date(2026, 10, 4))
    assert week_bounds(date(2026, 10, 4)) == (date(2026, 9, 28), date(2026, 10, 4))
    assert week_bounds(date(2027, 1, 1)) == (date(2026, 12, 28), date(2027, 1, 3))


def test_selection_pre_survey_persists_beyond_23_hours_and_read(client, db):
    pid = program(client, db)
    nid = notice(db, pid, 'PRE', '2026-09-28T01:00:00Z')
    db.execute('INSERT INTO dc.notification_read(notification_id) VALUES(%s)', (nid,))
    items = own_items(db, pid)
    assert len(items) == 2
    pre = next(i for i in items if i['id'].endswith(':PRE'))
    assert (pre['date'], pre['done'], pre['state']) == ('2026-09-28', True, 'elapsed')
    start = next(i for i in items if i['id'].startswith('program:'))
    assert (start['date'], start['done'], start['dday']) == ('2026-10-02', False, 2)
    # Rendering a checked row must never submit a survey or complete a program.
    assert not db.execute('SELECT 1 FROM dc.survey_response WHERE program_id=%s', (pid,)).fetchone()
    assert db.execute('SELECT outcome_code FROM dc.program_apply WHERE program_id=%s', (pid,)).fetchone()['outcome_code'] is None
    response = client.get('/api/v1/lounge/weekly-todos', headers=headers('chaewon'))
    assert response.status_code == 200
    assert response.json()['weekStart'] == '2026-09-28'


def test_completion_surveys_use_korean_event_day_and_keep_submitted(client, db):
    pid = program(client, db, outcome='COMPLETED')
    # UTC Tuesday evening is Wednesday in Korea, so this is today, not elapsed.
    notice(db, pid, 'POST', '2026-09-29T16:00:00Z')
    notice(db, pid, 'SATISFACTION', '2026-09-29T16:00:00Z')
    db.execute("INSERT INTO dc.survey_response(program_id,student_uid,phase) VALUES(%s,%s,'POST')", (pid, UID))
    items = own_items(db, pid)
    post = next(i for i in items if i['id'].endswith(':POST'))
    sat = next(i for i in items if i['id'].endswith(':SATISFACTION'))
    assert (post['date'], post['state'], post['done']) == ('2026-09-30', 'completed', True)
    assert (sat['date'], sat['state'], sat['done']) == ('2026-09-30', 'scheduled', False)
    assert not [i for i in weekly_items(db, UID, date(2026, 10, 5))['items'] if pid in i['id']]


def test_cancelled_unselected_other_student_and_disabled_surveys(client, db):
    pid = program(client, db)
    db.execute('UPDATE dc.program_apply SET cancelled_at=now() WHERE program_id=%s', (pid,))
    assert own_items(db, pid) == []
    db.execute("UPDATE dc.program_apply SET cancelled_at=NULL,selection_code='PENDING',selected_at=NULL WHERE program_id=%s", (pid,))
    assert own_items(db, pid) == []
    db.execute("UPDATE dc.program_apply SET selection_code='SELECTED',selected_at='2026-09-28T01:00Z' WHERE program_id=%s", (pid,))
    db.execute('UPDATE dc.program SET competency_survey=false,satisfaction_survey=false WHERE id=%s', (pid,))
    assert len(own_items(db, pid)) == 1
    other = client.get('/api/v1/lounge/weekly-todos?studentId=chaewon', headers=headers('changwon'))
    assert other.status_code == 200
    assert not [i for i in other.json()['items'] if pid in i['id']]
    assert client.get('/api/v1/lounge/weekly-todos', headers=headers('career_kim')).status_code == 403


def test_counsel_today_past_done_and_week_scope(client, db):
    ids = []
    for day, status in [('2026-09-28','CONFIRMED'),('2026-09-30','CONFIRMED'),('2026-10-04','DONE'),('2026-10-05','CONFIRMED'),('2026-09-29','CANCEL_STU')]:
        id = str(uuid4()); ids.append(id)
        db.execute('''INSERT INTO dc.counsel_request(id,student_uid,type_code,legacy_type,care_track,status_code,
          method_code,topic,slot_date,slot_start,slot_end,snapshot,requested_at,source_payload)
          VALUES(%s,%s,'CAREER','진로취업','general',%s,'OFFLINE','일정 검증',%s,'14:00','15:00','{}',now(),'{}')''',
          (id, UID, status, day))
    items = {i['id']: i for i in weekly_items(db, UID, DAY)['items']}
    assert items['counsel:'+ids[0]]['state'] == 'elapsed'
    assert items['counsel:'+ids[1]]['done'] is False
    assert items['counsel:'+ids[2]]['state'] == 'completed'
    assert 'counsel:'+ids[3] not in items and 'counsel:'+ids[4] not in items


def test_missing_dates_and_forms_never_invent_an_agenda_day(client, db):
    pid = program(client, db, selected='2026-09-20T01:00Z', start=None)
    assert own_items(db, pid) == []
    db.execute("UPDATE dc.program_apply SET selected_at='2026-09-28T01:00Z' WHERE program_id=%s", (pid,))
    db.execute('UPDATE dc.program SET competency_form_id=NULL WHERE id=%s', (pid,))
    assert own_items(db, pid) == []
