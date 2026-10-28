"""The early diagnosis population filter preserves metadata and list semantics."""
from app.academic_students import ROSTER
from test_academic_students import academic_rows  # noqa: F401
from test_psych_referrals import db  # noqa: F401
from test_api import headers
from io import BytesIO
from zipfile import ZipFile
from xml.etree import ElementTree


def test_diagnosed_metadata_matches_original_population_and_all_options(client, db, academic_rows):
    # Mirror seeded service identities in the academic source, alongside six
    # unrelated academic-only students supplied by academic_rows.
    db.execute("""INSERT INTO academic.v_usr_inf
      (intg_uid,login_id,usr_nm,user_ty_cd,hofc_sta_cd,stu_schgr,orgz_nm)
      SELECT s.intg_uid,s.student_no,p.name,'1101','0001','3','Diagnosed Major'
      FROM dc.student s JOIN dc.person p USING(intg_uid)
      WHERE NOT EXISTS(SELECT 1 FROM academic.v_usr_inf a WHERE a.intg_uid=s.intg_uid)""")
    expected = db.execute(ROSTER + """ SELECT * FROM roster
      WHERE EXISTS(SELECT 1 FROM dc.diagnosis_attempt d WHERE d.student_uid=roster.intg_uid
        AND d.status_code IN ('DONE','REVIEW','INCOMPLETE'))""").fetchall()
    assert expected
    response = client.get('/api/v1/academic-students/metadata', headers=headers('career_kim'),
                          params={'diagnosed': 'true'})
    assert response.status_code == 200, response.text
    metadata = response.json()
    assert metadata['summary']['total'] == len(expected)
    for option, column in [('majors', 'major_label'), ('colleges', 'college_name'),
                           ('grades', 'grade'), ('types', 'student_type'),
                           ('tiers', 'tier'), ('statuses', 'status')]:
        assert metadata['options'][option] == sorted({r[column] for r in expected if r[column] is not None})
    pairs = {}
    for r in expected:
        if r['college_name'] is not None: pairs.setdefault(r['college_name'], set()).add(r['major_label'])
    assert metadata['options']['collegeMajors'] == {college: sorted(majors) for college, majors in pairs.items()}
    listing = client.get('/api/v1/academic-students', headers=headers('career_kim'),
                         params={'filters.diagnosed': 'Y'})
    assert listing.status_code == 200
    assert listing.json()['totalCount'] == len(expected)
    assert not any(r['id'].startswith(academic_rows) for r in listing.json()['items'])
    by_id = {r['intg_uid']: r for r in expected}
    for item in listing.json()['items']:
        original = by_id[item['id']]
        for key, column in [('progress','progress'),('hasRoadmap','has_roadmap'),
                            ('programCount','program_count'),('counselCount','counsel_count')]:
            assert item[key] == original[column]
    # Two pending tests still count as one student; never-diagnosed rows stay out.
    uid = expected[0]['intg_uid']
    db.execute('DELETE FROM dc.diagnosis_retake WHERE student_uid=%s', (uid,))
    for test in ('c1', 'c2'):
        db.execute("""INSERT INTO dc.diagnosis_retake(student_uid,test_id,source,status)
          VALUES(%s,%s,'STUDENT','PENDING')""", (uid, test))
    pending_ids = {r['intg_uid'] for r in db.execute(ROSTER + """ SELECT intg_uid FROM roster
      WHERE EXISTS(SELECT 1 FROM dc.diagnosis_attempt d WHERE d.student_uid=roster.intg_uid
        AND d.status_code IN ('DONE','REVIEW','INCOMPLETE'))
      AND EXISTS(SELECT 1 FROM dc.diagnosis_retake q WHERE q.student_uid=roster.intg_uid AND q.status='PENDING')""")}
    meta = client.get('/api/v1/academic-students/metadata', headers=headers('career_kim'), params={'diagnosed': 'true'}).json()
    assert meta['summary']['retakePendingCount'] == len(pending_ids)
    params = {'filters.diagnosed':'Y', 'filters.retakePending':'Y'}
    pending = client.get('/api/v1/academic-students', headers=headers('career_kim'), params=params).json()
    assert {r['id'] for r in pending['items']} == pending_ids
    first = client.get('/api/v1/academic-students', headers=headers('career_kim'),
                       params={'filters.diagnosed':'Y', 'pageSize':1}).json()
    assert first['totalCount'] == len(expected) and len(first['items']) == 1
    assert client.get('/api/v1/academic-students', headers=headers('career_kim'),
                      params={'filters.diagnosed':'Y', 'page':1000}).json()['items'] == []
    exported = client.post('/api/v1/academic-students/export', headers=headers('career_kim'),
                           params=params, json={'ids':[uid, academic_rows+'1']})
    assert exported.status_code == 200
    with ZipFile(BytesIO(exported.content)) as archive:
        sheet = ElementTree.fromstring(archive.read('xl/worksheets/sheet1.xml'))
    ns = {'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    rows = sheet.findall('.//s:row', ns)
    assert len(rows) == 2  # header and the one selected, diagnosed, pending student
    assert len(rows[1].findall('s:c', ns)) == 13
