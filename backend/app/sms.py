"""Shared dispatch boundary for the future school SMS adapter.

No provider is configured. Every future send/retry must pass through this
boundary at dispatch time, even if recipients were selected before blocking.
The callback performs one synchronous handoff to the school's provider.
"""
from .blacklists import sms_lock


def dispatch_student_sms(conn, student_uid, deliver):
    """Return BLOCKED without invoking deliver; otherwise return its result.

Registration and dispatch serialize on the same student lock. A handoff already
in progress cannot be recalled; once blocking commits, later dispatches stop.
Provider failures propagate (never report a failed handoff as sent).
"""
    with conn.transaction():
        sms_lock(conn, student_uid)
        if not conn.execute('SELECT 1 FROM dc.student WHERE intg_uid=%s',(student_uid,)).fetchone():
            raise ValueError('Unknown SMS student')
        row = conn.execute('SELECT blocked FROM dc.sms_blacklist WHERE student_uid=%s',(student_uid,)).fetchone()
        if row and row['blocked']:
            return {'status':'BLOCKED'}
        return deliver(student_uid)
