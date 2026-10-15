from datetime import datetime
from uuid import uuid4

from app import care7_cycle
from test_api import headers
from test_psych_referrals import db  # noqa: F401


def test_roadmap_roster_filters_before_pagination_and_metadata(client, db, monkeypatch):
    monkeypatch.setattr(care7_cycle, 'year_start', lambda: datetime.fromisoformat('2026-01-01T00:00:00+09:00'))
    department = 'roadmap-ready-' + uuid4().hex
    cases = ['ready', 'no-type', 'no-core', 'no-followup', 'general', 'psych', 'reserved']
    ids = {}
    for case in cases:
        uid = uuid4().hex
        ids[case] = uid
        db.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,%s,'STUDENT','fixture')", (uid, uid, case))
        db.execute("INSERT INTO dc.student(intg_uid,student_no,major_label,grade,roster) VALUES(%s,%s,%s,3,'{}')", (uid, uid, department))
        if case != 'no-type':
            db.execute("INSERT INTO dc.student_type_event(student_uid,student_type,source) VALUES(%s,'T3','counsel')", (uid,))
        for test in ('ccore', 'c3'):
            if (test == 'ccore' and case == 'no-core') or (test == 'c3' and case == 'no-followup'):
                continue
            db.execute('''INSERT INTO dc.diagnosis_attempt(id,student_uid,test_id,attempt_no,status_code,started_at,completed_at,payload)
              VALUES(%s,%s,%s,1,'DONE','2026-01-02','2026-01-03','{}')''', (uuid4().hex, uid, test))
        db.execute('''INSERT INTO dc.counsel_request(id,student_uid,type_code,legacy_type,care_track,status_code,
          method_code,topic,requested_at,completed_at,snapshot,source_payload)
          VALUES(%s,%s,%s,'test',%s,%s,'OFFLINE','test','2026-01-04','2026-01-05','{}','{}')''',
          (uuid4().hex, uid, 'PSY' if case == 'psych' else 'CAREER',
           None if case == 'psych' else 'general' if case == 'general' else 'care7',
           'CONFIRMED' if case == 'reserved' else 'DONE'))
    params = {'departments': department, 'filters.roadmapReady': 'Y', 'pageSize': 1}
    def listing(**extra):
        response = client.get('/api/v1/students', headers=headers('career_kim'), params={**params, **extra})
        assert response.status_code == 200, response.text
        return response.json()
    result = listing()
    assert result['totalCount'] == 1
    assert result['items'][0]['id'] == ids['ready']
    assert listing(page=2)['items'] == []
    assert listing(q='no-type')['totalCount'] == 0
    meta = client.get('/api/v1/students/metadata', headers=headers('career_kim'), params=params).json()
    assert meta['summary']['total'] == 1 and meta['options']['types'] == ['T3']
    assert listing(**{'filters.roadmapReady': ''})['totalCount'] == len(cases)
    assert client.get('/api/v1/students', headers=headers('chaewon'), params=params).status_code == 403
    # The calendar rollover must not admit last year's completed records.
    monkeypatch.setattr(care7_cycle, 'year_start', lambda: datetime.fromisoformat('2027-01-01T00:00:00+09:00'))
    assert listing()['totalCount'] == 0
