"""Calendar-year access is independent of optional within-year retests.

No history is reset or deleted. The server's Korean calendar controls eligibility.
2026 preserves existing completions; mandatory annual renewal starts 2027-01-01.
"""
from datetime import datetime
from zoneinfo import ZoneInfo


def year_start(now=None):
    now = (now or datetime.now(ZoneInfo('Asia/Seoul'))).astimezone(ZoneInfo('Asia/Seoul'))
    return now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)


def completed_tests(conn, uid, start=None):
    start = start or year_start()
    return {r['test_id']: r['completed_at'] for r in conn.execute('''
      SELECT test_id,max(completed_at) AS completed_at FROM dc.diagnosis_attempt
      WHERE student_uid=%s AND status_code='DONE' AND completed_at IS NOT NULL
        AND (%s OR (started_at >= %s AND completed_at >= %s)) GROUP BY test_id''',
      (uid, start.year < 2027, start, start)).fetchall()}


def annual_status(conn, uid):
    start = year_start()
    done = completed_tests(conn, uid, start)
    # Import lazily: diagnostic_type uses only year_start/completed_tests here.
    from .diagnosis_retake import diagnostic_type
    code = diagnostic_type(conn, uid)
    rule = conn.execute('SELECT lower(follow_up_test) AS test FROM dc.student_type_code WHERE code=%s', (code,)).fetchone()
    followup = rule['test'] if rule else None
    core_done = 'ccore' in done
    followup_done = core_done and followup in done and (start.year < 2027 or done[followup] >= done['ccore'])
    basis = max(done['ccore'], done[followup]) if followup_done else start
    counsel = conn.execute('''SELECT id,completed_at FROM dc.counsel_request
      WHERE student_uid=%s AND type_code IN ('CAREER','JOB') AND care_track='care7'
        AND status_code='DONE' AND (%s OR completed_at >= %s)
      ORDER BY completed_at DESC NULLS LAST LIMIT 1''', (uid, start.year < 2027, basis)).fetchone()
    counsel_done = bool(counsel and (start.year < 2027 or followup_done))
    plan = conn.execute('SELECT * FROM dc.roadmap WHERE student_uid=%s AND confirmed', (uid,)).fetchone()
    if not plan and start.year < 2027:
        snapshot = conn.execute('''SELECT version FROM dc.roadmap_snapshot WHERE student_uid=%s
          AND payload->>'status'='CONFIRMED' ORDER BY version DESC LIMIT 1''', (uid,)).fetchone()
        if snapshot:
            plan = {'version': snapshot['version']}
    plan_done = bool(plan and counsel_done and (start.year < 2027 or (
        plan['counsel_request_id'] == counsel['id'] and plan['confirmed_at']
        and plan['confirmed_at'] >= counsel['completed_at'])))
    # Once earned, access survives retest approvals, type changes and draft regeneration.
    if plan_done and (start.year < 2027 or followup_done):
        conn.execute('''INSERT INTO dc.care7_annual_access(student_uid,year,roadmap_version)
          VALUES(%s,%s,%s) ON CONFLICT DO NOTHING''', (uid, start.year, plan['version']))
    eligible = bool(conn.execute('SELECT 1 FROM dc.care7_annual_access WHERE student_uid=%s AND year=%s',
                                (uid, start.year)).fetchone())
    return {'year': start.year, 'startsAt': start.isoformat(), 'eligible': eligible,
            'coreDone': core_done, 'followUpDone': followup_done,
            'counselDone': counsel_done, 'roadmapConfirmed': plan_done,
            'completedTests': list(done), 'renewalRequired': start.year >= 2027 and not eligible}
