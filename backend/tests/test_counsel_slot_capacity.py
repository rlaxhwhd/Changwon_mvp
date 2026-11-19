"""가능 시간대의 1시간당 상담 인원(0015 · 마이그레이션 167).

「월 13:00~15:00 2명」 = 13시 2명, 14시 2명. 학생 신청·상담사 학생 추가·일정 변경이 같은 check_slot 을 지난다.
모든 쓰기는 db 픽스처의 트랜잭션 안에서 하고 끝에 롤백한다.
"""
from datetime import date, time, timedelta
from uuid import uuid4

import pytest
from fastapi import HTTPException
from psycopg.types.json import Jsonb

from app.counsel import Slot, check_slot
from test_api import headers
from test_psych_referrals import db  # noqa: F401

FULL = '이 시간대의 상담 인원이 모두 찼습니다.'
OVERLAP = '학생 또는 담당자의 예약 시간과 겹칩니다.'


def uid(db, alias):
    return db.execute('SELECT intg_uid FROM dc.person WHERE alias=%s', (alias,)).fetchone()['intg_uid']


def next_monday():
    today = date.today() + timedelta(days=14)
    return today + timedelta(days=(7 - today.weekday()) % 7)


def open_hours(db, staff, capacity, start='13:00', end='16:00'):
    """그 담당자의 월요일 가능 시간대를 하나로 바꾼다(제한 시간대는 비운다)."""
    db.execute("DELETE FROM dc.counsel_schedule_slot WHERE staff_uid=%s AND (kind='EXCLUDED' OR weekday=1)", (staff,))
    db.execute('''INSERT INTO dc.counsel_schedule_slot(id,staff_uid,kind,weekday,start_time,end_time,capacity)
      VALUES(%s,%s,'AVAILABLE',1,%s,%s,%s)''', (str(uuid4()), staff, start, end, capacity))


def others(db, staff, count):
    rows = db.execute('SELECT intg_uid FROM dc.student WHERE intg_uid<>%s ORDER BY intg_uid LIMIT %s', (staff, count)).fetchall()
    assert len(rows) == count
    return [r['intg_uid'] for r in rows]


def book(db, staff, student, day, start, end, status='CONFIRMED'):
    request_id = str(uuid4())
    db.execute('''INSERT INTO dc.counsel_request
      (id,student_uid,counselor_uid,type_code,legacy_type,care_track,status_code,method_code,topic,
       requested_at,slot_date,slot_start,slot_end,intake,snapshot,source_payload)
      VALUES(%s,%s,%s,'CAREER','진로취업','general',%s,'OFFLINE','capacity test',now(),%s,%s,%s,'[]',%s,'{}')''',
      (request_id, student, staff, status, day, start, end, Jsonb({'name': 'capacity test'})))
    return request_id


def slot(day, start, end):
    return Slot(date=day, start=time.fromisoformat(start), end=time.fromisoformat(end))


def refused(db, staff, student, value, exclude=''):
    with pytest.raises(HTTPException) as error:
        check_slot(db, staff, student, value, exclude)
    assert error.value.status_code == 409
    return error.value.detail


def test_capacity_two_accepts_two_then_full(client, db):
    staff, day = uid(db, 'career_kim'), next_monday()
    open_hours(db, staff, 2)
    first, second, third = others(db, staff, 3)
    book(db, staff, first, day, '13:00', '14:00')
    check_slot(db, staff, second, slot(day, '13:00', '14:00'))  # 1/2 → 자리 있음
    book(db, staff, second, day, '13:00', '14:00')
    assert refused(db, staff, third, slot(day, '13:00', '14:00')) == FULL
    # 같은 학생이 겹치는 시각에 또 잡으면 인원과 무관하게 거절, 종전 문구.
    assert refused(db, staff, first, slot(day, '13:30', '14:30')) == OVERLAP
    check_slot(db, staff, third, slot(day, '14:00', '15:00'))  # 다음 시간은 비어 있다


def test_long_reschedule_counts_each_hour(client, db):
    staff, day = uid(db, 'career_kim'), next_monday()
    open_hours(db, staff, 2)
    a, b, c = others(db, staff, 3)
    moving = book(db, staff, a, day, '13:00', '14:00')
    book(db, staff, b, day, '14:00', '15:00')
    # 13~15시로 늘려도 13시·14시 각각 2명 이하라 허용(총수 기준이었다면 거절됐다).
    check_slot(db, staff, a, slot(day, '13:00', '15:00'), moving)
    db.execute("UPDATE dc.counsel_request SET slot_end='15:00' WHERE id=%s", (moving,))
    check_slot(db, staff, c, slot(day, '15:00', '16:00'))
    assert refused(db, staff, c, slot(day, '14:00', '15:00')) == FULL


def test_capacity_one_keeps_old_overlap_message(client, db):
    staff, day = uid(db, 'career_kim'), next_monday()
    open_hours(db, staff, 1)
    a, b = others(db, staff, 2)
    book(db, staff, a, day, '13:00', '14:00')
    assert refused(db, staff, b, slot(day, '13:00', '14:00')) == OVERLAP
    check_slot(db, staff, b, slot(day, '14:00', '15:00'))


def test_public_slots_follow_capacity(client, db):
    staff, day = uid(db, 'career_kim'), next_monday()
    open_hours(db, staff, 2)
    a, b = others(db, staff, 2)

    def thirteen():
        items = client.get(f'/api/v1/counsel-slots?startDate={day}&days=1', headers=headers('chaewon')).json()['items']
        return next(i['available'] for i in items if i['staffId'] == 'career_kim' and i['start'] == '13:00')

    book(db, staff, a, day, '13:00', '14:00')
    assert thirteen() is True
    book(db, staff, b, day, '13:00', '14:00')
    assert thirteen() is False


def test_schedule_capacity_validation_and_dto(client, db):
    path = '/api/v1/counsel-schedules/career_park'
    head = headers('career_park')
    before = client.get(path, headers=head).json()
    assert all(s['capacity'] >= 1 for s in before['available'] + before['excluded'])
    slots = [{'id': 'x', 'weekday': 2, 'start': '09:00', 'end': '12:00'}]
    for bad in (0, 21):
        body = {'expectedVersion': before['version'], 'slots': [{**slots[0], 'capacity': bad}]}
        assert client.put(path + '/available', headers=head, json=body).status_code == 422
    saved = client.put(path + '/available', headers=head, json={'expectedVersion': before['version'], 'slots': [{**slots[0], 'capacity': 3}]})
    assert saved.status_code == 200, saved.text
    assert saved.json()['available'][0]['capacity'] == 3
    # 제한 시간대는 인원을 보내도 1로 저장한다. capacity 를 빼면(옛 본문) 기본 1.
    excluded = client.put(path + '/excluded', headers=head, json={'expectedVersion': saved.json()['version'],
                          'slots': [{'id': 'y', 'weekday': 3, 'start': '10:00', 'end': '11:00', 'capacity': 5}]})
    assert excluded.status_code == 200, excluded.text
    assert excluded.json()['excluded'][0]['capacity'] == 1
    legacy = client.put(path + '/available', headers=head, json={'expectedVersion': excluded.json()['version'], 'slots': slots})
    assert legacy.status_code == 200 and legacy.json()['available'][0]['capacity'] == 1
