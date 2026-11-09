"""C-5(PHQ-9·GAD-7) 응시·판정과 심리상담사 자동 연계 — rollback-only DB."""
import psycopg
import pytest

from test_api import headers
from test_diagnosis_retake import result, student
from test_psych_referrals import db  # noqa: F401


def as_type(db, code):
    who = student(db)
    # 진행 중 재진단 회차는 C-CORE 결과 유형을 따른다 — 결과와 확정 유형을 같게 둔다.
    result(db, who, kind={'T5': '취약관리형', 'T2': '진로설정형'}[code])
    db.execute("INSERT INTO dc.student_type_event(student_uid,student_type,source) VALUES(%s,%s,'test')", (who['intg_uid'], code))
    return who


def answers(phq, gad):
    return {**{f'PHQ9_{n}': phq for n in range(1, 10)}, **{f'GAD7_{n}': gad for n in range(1, 8)}}


def submit(client, body):
    return client.post('/api/v1/diagnosis/c5', headers=headers('chaewon'), json={'answers': body})


def test_form_and_validation(client, db):
    as_type(db, 'T5')
    form = client.get('/api/v1/diagnosis/c5', headers=headers('chaewon'))
    assert form.status_code == 200, form.text
    data = form.json()
    assert [s['code'] for s in data['scales']] == ['PHQ9', 'GAD7']
    assert [len(s['items']) for s in data['scales']] == [9, 7]
    assert [o['value'] for o in data['scales'][0]['options']] == [0, 1, 2, 3]
    assert data['open'] is True and data['result'] is None
    partial = answers(1, 1)
    partial.pop('GAD7_7')
    assert submit(client, partial).status_code == 422
    assert submit(client, {**answers(1, 1), 'GAD7_7': 4}).status_code == 422
    assert client.get('/api/v1/diagnosis/c5', headers=headers('psych_lee')).status_code == 403


def test_other_type_cannot_take(client, db):
    as_type(db, 'T2')
    assert client.get('/api/v1/diagnosis/c5', headers=headers('chaewon')).json()['open'] is False
    assert submit(client, answers(0, 0)).status_code == 403


def test_low_average_recommends_core_retake_without_referral(client, db):
    who = as_type(db, 'T5')
    # PHQ 9×1=9, GAD 7×1=7 → 평균 8
    response = submit(client, answers(1, 1))
    assert response.status_code == 201, response.text
    summary = response.json()['result']
    assert (summary['phq9'], summary['gad7'], summary['average'], summary['referred']) == (9, 7, 8, False)
    assert not db.execute('SELECT 1 FROM dc.psych_screening_referral WHERE student_uid=%s', (who['intg_uid'],)).fetchone()
    stored = db.execute("SELECT payload FROM dc.diagnosis_result WHERE student_uid=%s AND test_id='c5'", (who['intg_uid'],)).fetchone()
    assert stored['payload']['headline'] == 'C-CORE 재진단 권유'
    scores = db.execute("SELECT factor_code,raw_score FROM dc.diagnosis_factor_score WHERE student_uid=%s AND test_id='c5' ORDER BY position",
                        (who['intg_uid'],)).fetchall()
    assert [(s['factor_code'], s['raw_score']) for s in scores] == [('PHQ9', 9), ('GAD7', 7)]
    after = client.get('/api/v1/diagnosis/c5', headers=headers('chaewon')).json()
    assert after['open'] is False and after['result']['referred'] is False
    assert submit(client, answers(1, 1)).status_code == 403


def test_high_average_referral_shared_by_all_psych_counselors(client, db):
    who = as_type(db, 'T5')
    # PHQ 9×2=18, GAD 7×1=7 → 평균 12.5
    response = submit(client, answers(2, 1))
    assert response.status_code == 201, response.text
    assert response.json()['result']['referred'] is True
    row = db.execute('SELECT * FROM dc.psych_screening_referral WHERE student_uid=%s', (who['intg_uid'],)).fetchone()
    assert (row['phq9'], row['gad7'], row['status']) == (18, 7, 'PENDING')
    psych = db.execute("SELECT count(*) AS n FROM dc.staff WHERE role_code='psych'").fetchone()['n']
    sent = db.execute("SELECT count(*) AS n FROM dc.notification WHERE source_kind='PSYCH_SCREENING_REFERRAL' AND source_id=%s",
                      (f"{row['id']}:CREATE",)).fetchone()['n']
    assert sent == psych > 0

    assert client.get('/api/v1/psych-referrals/screening', headers=headers('career_kim')).status_code == 403
    listing = client.get('/api/v1/psych-referrals/screening', headers=headers('psych_lee')).json()
    item = next(i for i in listing['items'] if i['id'] == str(row['id']))
    assert (item['studentId'], float(item['average']), item['status']) == ('chaewon', 12.5, 'PENDING')
    assert listing['counts']['PENDING'] >= 1

    url = f"/api/v1/psych-referrals/screening/{row['id']}/transition"
    assert client.post(url, headers=headers('career_kim'), json={'action': 'ACCEPT', 'version': 1}).status_code == 403
    assert client.post(url, headers=headers('psych_lee'), json={'action': 'COMPLETE', 'version': 1}).status_code == 409
    accepted = client.post(url, headers=headers('psych_lee'), json={'action': 'ACCEPT', 'version': 1})
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()['status'] == 'IN_PROGRESS' and accepted.json()['acceptedByName']
    assert client.post(url, headers=headers('psych_lee'), json={'action': 'ACCEPT', 'version': 1}).status_code == 409
    done = client.post(url, headers=headers('psych_lee'), json={'action': 'COMPLETE', 'version': 2})
    assert done.status_code == 200 and done.json()['status'] == 'DONE' and done.json()['completedAt']
    events = db.execute('SELECT action FROM dc.psych_screening_referral_event WHERE referral_id=%s', (row['id'],)).fetchall()
    assert sorted(e['action'] for e in events) == ['ACCEPT', 'COMPLETE', 'CREATE']
    with pytest.raises(psycopg.Error), db.transaction():
        db.execute('DELETE FROM dc.psych_screening_referral_event WHERE referral_id=%s', (row['id'],))


def test_exact_threshold_is_referred(client, db):
    as_type(db, 'T5')
    body = answers(0, 0)
    # PHQ 12 + GAD 8 = 20 → 평균 10.0
    for n in range(1, 7):
        body[f'PHQ9_{n}'] = 2
    for n in range(1, 5):
        body[f'GAD7_{n}'] = 2
    summary = submit(client, body).json()['result']
    assert (summary['phq9'], summary['gad7'], summary['average'], summary['referred']) == (12, 8, 10, True)
