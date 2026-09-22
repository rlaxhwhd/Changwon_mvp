"""Academic roster includes never-enrolled identities without granting activity access."""
import pytest
from io import BytesIO
from zipfile import ZipFile
from xml.etree import ElementTree

from test_api import headers
from test_psych_referrals import db  # noqa: F401


def test_care7_filter_matches_confirmed_roadmaps_and_home(client, db):
    expected = db.execute("SELECT count(*) AS n FROM dc.roadmap WHERE status_code='CONFIRMED'").fetchone()['n']
    home = client.get('/api/v1/counsel-dashboard', headers=headers('career_kim'))
    assert home.status_code == 200
    assert home.json()['distribution']['total'] == expected
    response = client.get('/api/v1/academic-students', headers=headers('career_kim'),
                          params={'filters.focus': 'care7'})
    assert response.status_code == 200
    academic_expected = db.execute("""SELECT count(*) AS n FROM dc.roadmap r
      JOIN dc.student_login_source a ON a.intg_uid=r.student_uid
      WHERE r.status_code='CONFIRMED'""").fetchone()['n']
    assert response.json()['totalCount'] == academic_expected
    metadata = client.get('/api/v1/academic-students/metadata', headers=headers('career_kim'))
    assert metadata.json()['summary']['care7Count'] == academic_expected


@pytest.fixture
def academic_rows(db):
    for index, (kind, status) in enumerate([
        ('1101', '0001'), ('1101', '0002'), ('1102', '0005'),
        ('1201', '0001'), ('1202', '0004'), ('1202', '0003'),
    ], start=1):
        uid = f'roster-test-{index}'
        db.execute('''INSERT INTO academic.v_usr_inf
          (intg_uid,login_id,usr_nm,user_ty_cd,hofc_sta_cd,stu_schgr,orgz_nm,sex,grade,out_dt)
          VALUES(%s,%s,'Roster Test',%s,%s,%s,'Roster Major','0002',3.75,'20260220')''',
          (uid, uid, kind, status, None if index == 6 else '1'))
    return 'roster-test-'


def test_unenrolled_students_count_filters_and_pagination(client, db, academic_rows):
    db.execute('SET LOCAL ROLE dc_app')
    before = db.execute('SELECT count(*) AS n FROM dc.student').fetchone()['n']
    def get(**extra):
        response = client.get('/api/v1/academic-students', headers=headers('career_kim'),
                              params={'q': academic_rows, 'pageSize': 2, **extra})
        assert response.status_code == 200, response.text
        return response.json()
    first, second = get(), get(page=2)
    assert first['totalCount'] == 6
    assert len(first['items']) == 2
    assert not {r['id'] for r in first['items']} & {r['id'] for r in second['items']}
    assert get(**{'filters.academicLevel': '대학원'})['totalCount'] == 3
    assert get(**{'filters.academicLevel': '학부', 'filters.status': '휴학'})['totalCount'] == 1
    for status in ('재학', '휴학', '졸업', '수료', '제적'):
        rows = get(**{'filters.status': status})['items']
        assert rows and all(r['status'] == status for r in rows)
    expelled = get(**{'filters.status': '제적'})['items'][0]
    assert expelled['grade'] is None and expelled['canReadDetail'] is True
    assert db.execute('SELECT count(*) AS n FROM dc.student').fetchone()['n'] == before
    assert client.get('/api/v1/students/'+expelled['id'], headers=headers('career_kim')).status_code == 404
    meta = client.get('/api/v1/academic-students/metadata', headers=headers('career_kim'))
    assert meta.status_code == 200, meta.text
    assert meta.json()['summary']['total'] == 6
    assert set(meta.json()['options']['statuses']) == {'재학','휴학','졸업','수료','제적'}


def test_student_cannot_read_academic_roster(client, db, academic_rows):
    for path in ('/academic-students', '/academic-students/metadata'):
        assert client.get('/api/v1'+path, headers=headers('chaewon')).status_code == 403


def test_pagination_bounds_and_literal_search(client, db, academic_rows):
    for params in ({'page':0}, {'pageSize':301}):
        assert client.get('/api/v1/academic-students', headers=headers('career_kim'), params=params).status_code == 422
    for query in ('%', '_', "' OR true --"):
        response = client.get('/api/v1/academic-students', headers=headers('career_kim'), params={'q':query})
        assert response.status_code == 200, response.text
        assert response.json()['totalCount'] == 0


def test_gender_graduation_ranges_and_page_sizes(client, db, academic_rows):
    for size in (100,200,300):
        r=client.get('/api/v1/academic-students',headers=headers('career_kim'),params={'pageSize':size})
        assert r.status_code == 200
        assert r.json()['pageSize'] == size
    params={'filters.sex':'0002','filters.graduationFrom':'2026-02','filters.graduationTo':'2026-02'}
    r=client.get('/api/v1/academic-students',headers=headers('career_kim'),params=params)
    assert r.status_code == 200, r.text
    assert r.json()['totalCount'] == 1  # OUT_DT on non-graduates is not a graduation date.
    assert r.json()['items'][0]['sex'] == '여자'
    assert r.json()['items'][0]['graduationMonth'] == '2026-02'
    assert r.json()['items'][0]['gpa'] == '3.75'
    for invalid in ({'filters.graduationFrom':'2026-13'},
                    {'filters.graduationFrom':'2026-03','filters.graduationTo':'2026-02'}):
        assert client.get('/api/v1/academic-students',headers=headers('career_kim'),params=invalid).status_code == 422


def test_unenrolled_detail_and_excel_share_filters(client, db, academic_rows):
    uid=academic_rows+'3'
    r=client.get('/api/v1/academic-students/'+uid,headers=headers('career_kim'))
    assert r.status_code == 200, r.text
    assert r.json()['gpa']=='3.75'
    assert r.json()['counsels']==[] and r.json()['programs']==[]
    assert r.json()['diagnosisCount']==0
    assert client.get('/api/v1/academic-students/'+uid,headers=headers('chaewon')).status_code==403
    # Excel strings preserve leading zeroes and cannot execute formula-like names.
    db.execute("UPDATE academic.v_usr_inf SET usr_nm='=1+1',login_id='00123' WHERE intg_uid=%s",(uid,))
    r=client.get('/api/v1/academic-students/export',headers=headers('career_kim'),
                 params={'filters.status':'졸업','pageSize':1,'page':9})
    assert r.status_code == 200, r.text if r.status_code!=200 else ''
    assert 'spreadsheetml' in r.headers['content-type']
    with ZipFile(BytesIO(r.content)) as book:
        ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        sheet=ElementTree.fromstring(book.read('xl/worksheets/sheet1.xml'))
        rows=sheet.findall('s:sheetData/s:row',ns)
        assert len(rows)==2
        assert rows[1].findall('s:c/s:is/s:t',ns)[0].text=='00123'
        assert rows[1].findall('s:c/s:is/s:t',ns)[1].text=='=1+1'
        assert not sheet.findall('.//s:f',ns)
    assert client.get('/api/v1/academic-students/export',headers=headers('chaewon')).status_code==403


def test_activity_without_care7_is_visible_and_private_notes_are_not(client, db, academic_rows):
    uid=academic_rows+'1'
    db.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'Test','STUDENT','academic')",(uid,uid))
    db.execute("INSERT INTO dc.student(intg_uid,student_no,major_label,grade) VALUES(%s,%s,'Roster Major',1)",(uid,uid))
    db.execute('''INSERT INTO dc.counsel_request(id,student_uid,counselor_uid,type_code,legacy_type,care_track,
      status_code,method_code,topic,requested_at,snapshot,source_payload,intake,completed_at)
      SELECT 'academic-test-counsel',%s,intg_uid,'CAREER','진로취업','general','DONE','OFFLINE',
      'Private topic',now(),'{}','{}','{"private":"do not expose"}',now()
      FROM dc.person WHERE alias='career_kim' ''',(uid,))
    db.execute("INSERT INTO dc.student_program_history(intg_uid,program_id,title,applied_at,completed) VALUES(%s,'academic-history','Existing activity',current_date,true)",(uid,))
    r=client.get('/api/v1/academic-students/'+uid,headers=headers('career_kim'))
    assert r.status_code==200, r.text
    data=r.json()
    assert data['diagnosisCount']==0 and data['studentType'] is None
    assert len(data['counsels'])==1 and len(data['programs'])==1
    assert data['programs'][0]['completed'] is True
    assert 'Private topic' not in r.text and 'do not expose' not in r.text
    listed=client.get('/api/v1/academic-students',headers=headers('career_kim'),params={'q':uid}).json()
    assert listed['items'][0]['programCount']==1
