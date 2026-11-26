from app.db import pool
from test_api import headers
from test_student_login import owner
from academic_test_support import add_academic_dept, add_academic_user
from uuid import uuid4
import pytest

BASE='/api/v1/system/department-assignments'


def test_role_search_assignment_release_and_scope(client):
    head=headers('system-admin')
    for role in ('assistant','professor'):
        response=client.get(BASE+'/candidates',params={'role':role},headers=head)
        assert response.status_code==200,response.text
        people=response.json()['items']
        assert people and all(p['role_code']==role for p in people)
        person=people[0]
        assert person['staff_uid'] in {p['staff_uid'] for p in client.get(BASE+'/candidates',params={'role':role,'q':person['employee_no']},headers=head).json()['items']}
        assert client.get(BASE+'/candidates',params={'role':role,'q':'%_'},headers=head).json()['items']==[]
        with pool.connection() as conn:
            target=conn.execute('''SELECT d.* FROM dc.department d WHERE NOT EXISTS (
              SELECT 1 FROM dc.department_staff_assignment a WHERE a.college_code=d.college_code AND a.dept_code=d.dept_code
              AND a.staff_uid=%s AND a.role_code=%s AND a.is_active) LIMIT 1''',(person['staff_uid'],role)).fetchone()
        response=client.get(BASE,params={'role':role,'q':target['dept_code']},headers=head)
        assert response.status_code==200,response.text
        assert any(r['dept_code']==target['dept_code'] for r in response.json()['items'])
        body=dict(role=role,collegeCode=target['college_code'],deptCode=target['dept_code'],majorCode='',staffUid=person['staff_uid'])
        result=client.post(BASE,json=body,headers=head)
        assert result.status_code==201,result.text
        assigned=result.json()
        with pool.connection() as conn:
            students=conn.execute('SELECT intg_uid FROM dc.student WHERE college_code=%s AND dept_code=%s',(target['college_code'],target['dept_code'])).fetchall()
            for student in students:
                assert conn.execute('SELECT 1 FROM dc.department_assignment_student_scope WHERE staff_uid=%s AND student_uid=%s',(person['staff_uid'],student['intg_uid'])).fetchone()
        assert client.post(BASE,json=body,headers=head).status_code==409
        assert client.post(BASE,json={**body,'role':'professor' if role=='assistant' else 'assistant'},headers=head).status_code==422
        assert client.post(BASE,json={**body,'majorCode':'NO_SUCH_MAJOR'},headers=head).status_code==422
        listing=client.get(BASE,params={'role':role,'q':target['dept_code']},headers=head).json()
        assert any(a['id']==assigned['id'] for row in listing['items'] for a in row['assignments'])
        release=BASE+'/'+assigned['id']+'/release'
        assert client.post(release,json={'expectedVersion':2},headers=head).status_code==409
        assert client.post(release,json={'expectedVersion':1},headers=head).status_code==200
        with pool.connection() as conn:
            for student in students:
                assert not conn.execute('SELECT 1 FROM dc.department_assignment_student_scope WHERE staff_uid=%s AND student_uid=%s',(person['staff_uid'],student['intg_uid'])).fetchone()
        assert client.post(release,json={'expectedVersion':1},headers=head).status_code==409
        with pool.connection() as conn:
            assert conn.execute("SELECT count(*) n FROM dc.admin_event WHERE entity='department_staff_assignment' AND entity_id=%s",(assigned['id'],)).fetchone()['n']==2


def test_assignment_access_and_pagination(client):
    for identity in ('chaewon','career_kim','cse-1'):
        assert client.get(BASE,params={'role':'assistant'},headers=headers(identity)).status_code==403
        assert client.get(BASE+'/candidates',params={'role':'professor'},headers=headers(identity)).status_code==403
    head=headers('system-admin')
    first=client.get(BASE,params={'role':'assistant','pageSize':2},headers=head).json()
    second=client.get(BASE,params={'role':'assistant','pageSize':2,'page':2},headers=head).json()
    key=lambda r:(r['college_code'],r['dept_code'],r['major_code'])
    assert len(first['items'])==2 and not set(map(key,first['items'])) & set(map(key,second['items']))
    assert client.get(BASE,params={'role':'career'},headers=head).status_code==422


@pytest.mark.parametrize('role', ['assistant', 'professor'])
def test_major_assignment_never_grants_other_major(client, role):
    suffix=uuid4().hex[:8]
    # 학사 원본 대역의 폭(COL_CODE 2·DEPT_CODE 8·MAJOR_CODE 8)에 맞춘 코드.
    college,dept,major,other=('Z'+suffix[0],'D'+suffix[1:],'M'+suffix[1:],'N'+suffix[1:])
    student1,student2='student-a-'+suffix,'student-b-'+suffix
    with owner() as conn:
        conn.execute("INSERT INTO dc.department VALUES(%s,%s,'Test College','Test Department','test')",(college,dept))
        add_academic_dept(conn, college, 'Test College', dept, 'Test Department')
        for code,name in [(major,'Major A'),(other,'Major B')]:
            conn.execute("INSERT INTO academic.dc_v_major_inf(major_code,major_name,dept_code,use_flag,gubun_code) VALUES(%s,%s,%s,'1','1')",(code,name,dept))
        for uid,major_code in [(student1,major),(student2,other)]:
            conn.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'Scope test','STUDENT','local')",(uid,uid))
            conn.execute("INSERT INTO dc.student(intg_uid,student_no,major_label,college_code,dept_code) VALUES(%s,%s,'Test',%s,%s)",(uid,uid,college,dept))
            add_academic_user(conn, uid, usr_nm='Scope test', hakbu_cd=dept, major_cd=major_code)
    head=headers('system-admin')
    person=client.get(BASE+'/candidates',params={'role':role},headers=head).json()['items'][0]
    body=dict(role=role,collegeCode=college,deptCode=dept,majorCode=major,staffUid=person['staff_uid'])
    result=client.post(BASE,json=body,headers=head)
    assert result.status_code==201,result.text
    assert result.json()['source']=='manual'
    with pool.connection() as conn:
        assert conn.execute('SELECT 1 FROM dc.department_assignment_student_scope WHERE staff_uid=%s AND student_uid=%s',(person['staff_uid'],student1)).fetchone()
        assert not conn.execute('SELECT 1 FROM dc.department_assignment_student_scope WHERE staff_uid=%s AND student_uid=%s',(person['staff_uid'],student2)).fetchone()
    second=client.post(BASE,json={**body,'majorCode':other},headers=head)
    assert second.status_code==201,second.text
    with pool.connection() as conn:
        for uid in (student1,student2):
            assert conn.execute('SELECT 1 FROM dc.department_assignment_student_scope WHERE staff_uid=%s AND student_uid=%s',(person['staff_uid'],uid)).fetchone()
    assert client.post(BASE+'/'+result.json()['id']+'/release',json={'expectedVersion':1},headers=head).status_code==200
    with pool.connection() as conn:
        assert not conn.execute('SELECT 1 FROM dc.department_assignment_student_scope WHERE staff_uid=%s AND student_uid=%s',(person['staff_uid'],student1)).fetchone()
        assert conn.execute('SELECT 1 FROM dc.department_assignment_student_scope WHERE staff_uid=%s AND student_uid=%s',(person['staff_uid'],student2)).fetchone()
    assert client.post(BASE+'/'+second.json()['id']+'/release',json={'expectedVersion':1},headers=head).status_code==200


def test_one_employee_number_keeps_both_roles(client):
    """한 사번이 퇴직 조교 행과 재직 교원 행을 모두 가져도 교원 배정의 스코프는 살아 있다(역할까지 맞춘 비활성 판정)."""
    suffix=uuid4().hex[:7]
    emp_no,college,dept='E'+suffix,'Y'+suffix[0],'R'+suffix
    student='student-e-'+suffix
    with owner() as conn:
        conn.execute("INSERT INTO dc.department VALUES(%s,%s,'Role College','Role Department','test')",(college,dept))
        add_academic_dept(conn, college, 'Role College', dept, 'Role Department')
        add_academic_user(conn, 'asst-'+suffix, user_ty_cd='0004', emp_no=emp_no, usr_nm='Two Roles', hofc_sta_cd='00007')
        add_academic_user(conn, 'prof-'+suffix, user_ty_cd='0002', emp_no=emp_no, usr_nm='Two Roles', hofc_sta_cd='0006')
        conn.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'Two Roles','STAFF','academic')",(emp_no,'two-roles-'+suffix))
        conn.execute("INSERT INTO dc.staff(intg_uid,role_code,profile) VALUES(%s,'professor','{}')",(emp_no,))
        conn.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'Scope test','STUDENT','local')",(student,student))
        conn.execute("INSERT INTO dc.student(intg_uid,student_no,major_label,college_code,dept_code) VALUES(%s,%s,'Test',%s,%s)",(student,student,college,dept))
        roles=conn.execute('SELECT role_code,is_active FROM dc.department_staff_candidates WHERE staff_uid=%s ORDER BY role_code',(emp_no,)).fetchall()
        assert roles==[('assistant',False),('professor',True)]
    head=headers('system-admin')
    result=client.post(BASE,json=dict(role='professor',collegeCode=college,deptCode=dept,majorCode='',staffUid=emp_no),headers=head)
    assert result.status_code==201,result.text
    with pool.connection() as conn:
        assert conn.execute('SELECT 1 FROM dc.staff_student_scope WHERE staff_uid=%s AND student_uid=%s',(emp_no,student)).fetchone()
    assert client.post(BASE+'/'+result.json()['id']+'/release',json={'expectedVersion':1},headers=head).status_code==200
