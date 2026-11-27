"""0026 — 핵심역량 교과(학사 CORE) + 비교과(이뤄드림 지급) 합산 계약.

architecture-review §6 1~11 · 조건 C2~C4. 모든 행은 롤백 전용 트랜잭션(db) 안의 합성값이다(실학생·업체 접속 없음).
API 호출은 픽스처를 만든 뒤 `SET LOCAL ROLE dc_app` 으로 앱 계정 권한에서 돈다.
"""

import random
from decimal import Decimal
from uuid import uuid4

import psycopg
import pytest

from academic_test_support import add_academic_dept, add_academic_user
from test_academic_profile_display import caps, service_student
from test_api import headers
from test_psych_referrals import db  # noqa: F401

VIEW_COLUMNS = ['student_uid', 'competency_code', 'academic_score', 'program_score', 'score']
SOURCES = (None, 'DEVELOPMENT_CARE7_TEST', 'ACADEMIC_PROGRAM')
CODES = ('LOCAL_LEADER', 'CREATIVE', 'CONVERGENCE', 'COMMUNICATION', 'GLOBAL')
FULL_CAPS = [('ACE1', 1), ('ACE2', 2), ('ACE3', 3), ('ACE4', 4), ('ACE5', 5)]


def application(db, run_id, uid, elements):
    """업체 신청서 1건 — elements: [(essential, point)]. 빈 목록은 빈 배열 [] 신청서다."""
    app_id = random.randrange(1, 2 ** 62)
    raw = '[' + ','.join(f'{{"essential":{e},"title":"T{e}","child":0,"point":{p}}}' for e, p in elements) + ']'
    db.execute('''INSERT INTO eco.roadmap_application(application_id,student_id,application_status_code,is_completed,
        skill_scores,sync_run_id) VALUES(%s,%s,'CONFIRMED',true,%s,%s)''', (app_id, uid, raw, run_id))
    for seq, (essential, point) in enumerate(elements, 1):
        db.execute('''INSERT INTO eco.roadmap_application_skill_point(application_id,seq,student_id,essential,child,point)
          VALUES(%s,%s,%s,%s,0,%s)''', (app_id, seq, uid, essential, Decimal(str(point))))


@pytest.fixture
def w(db):
    x = uuid4().hex[:6]
    k = dict(x=x, college='E' + x[0], dept='E' + x + '1')
    for name in ('sa', 'sp', 'sb', 'sn', 's4', 'sdup', 'snull', 'local', 'over', 'fix'):
        k[name] = f'cc{name}-{x}'
    k['ghost'] = 'ccghost-' + x
    c, d = k['college'], k['dept']
    db.execute("INSERT INTO dc.department VALUES(%s,%s,%s,%s,'test')", (c, d, 'Merge College ' + x, 'Merge Dept ' + x))
    add_academic_dept(db, c, 'Merge College ' + x, d, 'Merge Dept ' + x)
    base = dict(usr_nm='Merge Test', hofc_sta_cd='0001', univ_cd='00', stu_schgr='3', daehak_cd=c, hakbu_cd=d)
    for name in ('sa', 'sp', 'sb', 'sn', 's4', 'sdup', 'snull', 'over', 'fix'):
        add_academic_user(db, k[name], **base)
    add_academic_user(db, k['local'], local=True, **base)          # 테스트 계정 ① origin='local'
    for name in ('sa', 'sp', 'sb', 'sn', 's4', 'sdup', 'snull', 'local', 'over', 'fix'):
        service_student(db, k[name], c, d)
    # 테스트 계정 ② 실학생 학사 행 위에 이름·소속만 바꾼 로그인 ③ fixture 로그인 번호
    db.execute('''INSERT INTO dc.student_login_override(intg_uid,name,college_code,dept_code,college_name,dept_name)
      VALUES(%s,'Override Test',%s,%s,'Merge College','Merge Dept')''', (k['over'], c, d))
    db.execute('INSERT INTO dc.fixture_student_login(student_no,student_uid) VALUES(%s,%s)', ('ccfxno-' + x, k['fix']))
    caps(db, k['sa'], [('ACE1', 12), ('ACE2', 5), ('ACE3', Decimal('7.5')), ('ACE4', 0), ('ACE5', 147)])
    caps(db, k['sb'], FULL_CAPS)
    caps(db, k['s4'], FULL_CAPS[:4])
    caps(db, k['sdup'], [('ACE1', 1), ('ACE1', 9), ('ACE2', 2), ('ACE3', 3), ('ACE4', 4)])   # 5행·4코드
    caps(db, k['snull'], [*FULL_CAPS[:4], ('ACE5', None)])                                  # NULL 점수
    for name in ('local', 'over', 'fix'):
        caps(db, k[name], FULL_CAPS)
    run = db.execute('''INSERT INTO eco.sync_run(id,started_at,status,report)
      VALUES(%s,now(),'PUBLISHED','{}') RETURNING id''', (uuid4(),)).fetchone()['id']
    # 0.1+0.2 는 numeric 합이라 정확히 0.3 이다. 빈 배열 신청서는 지급 행이 없다.
    application(db, run, k['sp'], [(1, '0.1'), (1, '0.2'), (3, 16)])
    application(db, run, k['sp'], [])
    application(db, run, k['sb'], [(2, '1.5'), (5, 10)])
    for name in ('s4', 'sdup', 'snull', 'local', 'over', 'fix', 'ghost'):
        application(db, run, k[name], [(1, 2), (4, '0.25')])
    return k


def get(client, path, who):
    response = client.get('/api/v1' + path, headers=headers(who))
    assert response.status_code == 200, response.text
    return response.json()


def scores(values):
    return dict(zip(CODES, map(float, values)))


# §6-10 · §6-11
def test_view_columns_and_privileges(db, w):
    columns = [r['column_name'] for r in db.execute('''SELECT column_name FROM information_schema.columns
      WHERE table_schema='dc' AND table_name='student_core_competency_combined' ORDER BY ordinal_position''').fetchall()]
    assert columns == VIEW_COLUMNS
    db.execute('SET LOCAL ROLE dc_app')
    row = db.execute('''SELECT academic_score,program_score,score FROM dc.student_core_competency_combined
      WHERE student_uid=%s AND competency_code='CREATIVE' ''', (w['sb'],)).fetchone()
    assert (row['academic_score'], row['program_score'], row['score']) == (2, Decimal('1.5'), Decimal('3.5'))
    for table in ('eco.roadmap_application', 'eco.roadmap_application_skill_point', 'eco.sync_run'):
        with pytest.raises(psycopg.errors.InsufficientPrivilege, match='schema eco'):
            with db.transaction():
                db.execute(f'SELECT 1 FROM {table} LIMIT 1')


# §6-1~5 · C3 · C4
def test_academic_program_merge_values_and_partial_rules(client, db, w):
    db.execute('SET LOCAL ROLE dc_app')
    expected = {
        'sa': scores([12, 5, '7.5', 0, 147]),          # 교과만 → 교과값 그대로
        'sp': scores(['0.3', 0, 16, 0, 0]),             # 비교과만 → 없는 축 0
        'sb': scores([1, '3.5', 3, 4, 15]),             # 둘 다 → 축별 합
    }
    for name, values in expected.items():
        data = get(client, f'/students/{w[name]}', w[name])
        assert data['coreCompetencySource'] == 'ACADEMIC_PROGRAM', name
        assert data['coreCompetencyScores'] == values, name
        assert all(isinstance(v, float) for v in data['coreCompetencyScores'].values())
    # 둘 다 없음 · 교과 4행 · 5행4코드 · NULL 점수(비교과가 있어도 부분 합을 그리지 않는다)
    for name in ('sn', 's4', 'sdup', 'snull'):
        data = get(client, f'/students/{w[name]}', 'career_kim')
        assert (data['coreCompetencyScores'], data['coreCompetencySource']) == (None, None), name


# §6-6 · §6-7 · C2
def test_local_override_fixture_and_unknown_numbers_get_nothing(client, db, w):
    for name in ('local', 'over', 'fix', 'ghost', 's4', 'sdup', 'snull', 'sn'):
        n = db.execute('SELECT count(*) AS n FROM dc.student_core_competency_combined WHERE student_uid=%s',
                       (w[name],)).fetchone()['n']
        assert n == 0, name
    # 180 교과 뷰에는 그대로 있다 — 차단은 합산 뷰의 대상 규칙이다.
    assert db.execute('SELECT count(*) AS n FROM dc.academic_student_core_competency WHERE student_uid=%s',
                      (w['over'],)).fetchone()['n'] == 5
    db.execute('SET LOCAL ROLE dc_app')
    for name in ('local', 'over', 'fix'):
        data = get(client, f'/students/{w[name]}', 'career_kim')
        assert (data['coreCompetencyScores'], data['coreCompetencySource']) == (None, None), name


# §6-8 · C4
def test_response_keys_unchanged_and_bootstrap_matches_detail(client, db, w):
    db.execute('SET LOCAL ROLE dc_app')
    shapes = {name: set(get(client, f'/students/{w[name]}', 'career_kim')) for name in ('sa', 'sn', 'local', 'sb')}
    assert len({frozenset(s) for s in shapes.values()}) == 1
    boot = get(client, '/bootstrap/profiles', 'career_kim')
    rows = {r['id']: r for r in boot['students'] + boot['counselOwners']}
    for name in ('sa', 'sp', 'sb', 'sn', 'over'):
        detail = get(client, f'/students/{w[name]}', 'career_kim')
        assert (rows[w[name]]['coreCompetencyScores'], rows[w[name]]['coreCompetencySource']) == (
            detail['coreCompetencyScores'], detail['coreCompetencySource']), name
    assert all(r['coreCompetencySource'] in SOURCES for r in rows.values())
    assert 'ACADEMIC' not in {r['coreCompetencySource'] for r in rows.values()}
