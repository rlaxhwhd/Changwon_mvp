"""Student weekly agenda: source dates, independent of notification read/expiry."""
from datetime import datetime, time, timedelta
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException

from .auth import principal
from .db import connection
from .programs import SEOUL, today
from .survey import survey_window

router = APIRouter()
SURVEY_LABELS = {'PRE': '사전 역량향상도 조사', 'POST': '사후 역량향상도 조사', 'SATISFACTION': '만족도 조사'}


def week_bounds(day):
    start = day - timedelta(days=day.weekday())
    return start, start + timedelta(days=6)


def weekly_items(conn, uid, day):
    start, end = week_bounds(day)
    items = []

    def add(id, title, sub, scheduled, to, completed=False, closed=False):
        if not scheduled or not start <= scheduled <= end:
            return
        elapsed = scheduled < day
        items.append(dict(id=id, title=title, sub=sub, date=scheduled.isoformat(),
                          dday=(scheduled-day).days, to=to, done=completed or elapsed,
                          state='completed' if completed else 'elapsed' if elapsed else 'scheduled', closed=closed))

    counsel = conn.execute('''SELECT id,topic,legacy_type,slot_date,slot_start,slot_end,status_code
      FROM dc.counsel_request WHERE student_uid=%s AND status_code IN ('CONFIRMED','DONE')
      AND slot_date BETWEEN %s AND %s ORDER BY slot_date,slot_start,id''', (uid, start, end)).fetchall()
    for row in counsel:
        hours = f"{str(row['slot_start'])[:5]}~{str(row['slot_end'])[:5]}" if row['slot_start'] and row['slot_end'] else ''
        add('counsel:'+row['id'], '상담 · '+row['topic'], ' · '.join(filter(None, [row['legacy_type'], hours])),
            row['slot_date'], '/counsel/record', row['status_code']=='DONE')

    programs = conn.execute('''SELECT p.id,p.title,p.run_start,p.sessions
      FROM dc.program_apply a JOIN dc.program p ON p.id=a.program_id
      WHERE a.student_uid=%s AND a.selection_code='SELECTED' AND a.cancelled_at IS NULL
      AND p.run_start BETWEEN %s AND %s ORDER BY p.run_start,p.id''', (uid, start, end)).fetchall()
    for row in programs:
        add('program:'+row['id'], '비교과 시작 · '+row['title'], f"{row['sessions']}회차 · 선발된 프로그램",
            row['run_start'], '/growth/program/'+quote(row['id'], safe=''))

    # Selection is the PRE opening event. POST/SATISFACTION use the recorded
    # completion notification event, without any read_at / 23-hour condition.
    # Only pinned forms with actual questions are linked, matching items_for().
    surveys = conn.execute('''WITH scheduled AS (
      SELECT p.id,p.title,p.run_start,p.satisfaction_survey,p.competency_survey,p.competency_areas,
        a.cancelled_at,a.selection_code,a.outcome_code,phase.code AS phase,
        CASE WHEN phase.code='PRE' THEN a.selected_at ELSE n.occurred_at END AS opens_at,
        r.submitted_at
      FROM dc.program_apply a JOIN dc.program p ON p.id=a.program_id
      CROSS JOIN (VALUES ('PRE'),('POST'),('SATISFACTION')) AS phase(code)
      LEFT JOIN dc.notification n ON n.recipient_uid=a.student_uid AND n.source_kind='PROGRAM_SURVEY'
        AND n.source_id=p.id||':'||phase.code
      LEFT JOIN dc.survey_response r ON r.program_id=p.id AND r.student_uid=a.student_uid AND r.phase=phase.code
      WHERE a.student_uid=%s AND a.selection_code='SELECTED' AND a.cancelled_at IS NULL
        AND (phase.code='PRE' OR a.outcome_code='COMPLETED')
        AND CASE WHEN phase.code='SATISFACTION' THEN p.satisfaction_survey
                 ELSE p.competency_survey AND cardinality(p.competency_areas)>0 END
        AND EXISTS(SELECT 1 FROM dc.survey_form_item fi
          WHERE fi.form_id=CASE WHEN phase.code='SATISFACTION' THEN p.satisfaction_form_id ELSE p.competency_form_id END
          AND (phase.code='SATISFACTION' OR fi.area_code=ANY(p.competency_areas)))
    ) SELECT * FROM scheduled WHERE opens_at >= %s AND opens_at < %s ORDER BY opens_at,id,phase''',
        (uid, datetime.combine(start, time.min, SEOUL), datetime.combine(end+timedelta(days=1), time.min, SEOUL))).fetchall()
    for row in surveys:
        phase = row['phase']
        opened = row['opens_at'].astimezone(SEOUL).date()
        is_open, reason = survey_window(row, row, phase)
        sub = '선발 후 조사 안내' if phase=='PRE' else '수료 후 조사 안내'
        if not is_open and not row['submitted_at']:
            sub += ' · '+reason
        add(f"survey:{row['id']}:{phase}", SURVEY_LABELS[phase]+' · '+row['title'], sub,
            opened, f"/mypage/programs/{quote(row['id'], safe='')}/survey/{phase}", bool(row['submitted_at']), not is_open)
    items.sort(key=lambda item: (item['date'], item['id']))
    return dict(items=items, weekStart=start.isoformat(), weekEnd=end.isoformat(), today=day.isoformat())


@router.get('/lounge/weekly-todos')
def weekly_todos(user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    if user['kind'] != 'STUDENT':
        raise HTTPException(403, '학생 본인의 일정만 조회할 수 있습니다.')
    return weekly_items(conn, user['intg_uid'], today())
