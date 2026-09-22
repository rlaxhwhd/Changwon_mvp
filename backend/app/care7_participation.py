"""Participation milestone: the student's current roadmap is confirmed."""

PARTICIPANT_UIDS = "SELECT student_uid FROM dc.roadmap WHERE status_code='CONFIRMED'"
PARTICIPANT = 'intg_uid IN (' + PARTICIPANT_UIDS + ')'
