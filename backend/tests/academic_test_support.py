"""테스트 DB 의 학사 원본 대역(0021).

앱은 academic.usr_inf(= 전산원 사본 academic.dc_v_usr_inf ∪ 로컬 인원 academic.local_usr_inf)만 읽는다.
옛 미러(academic.v_usr_inf)에 쓰면 오류 없이 아무 효과도 없으니 테스트는 이 함수들로만 학사 행을 넣는다.
코드는 전산원 원값이다: USER_TY_CD 0001 학생·0002 교원·0004 조교, HOFC_STA_CD 0001 재학 … 0006 재직,
SEX '0' 남·'1' 여, UNIV_CD 00 학부·01 석사….
"""
from psycopg import sql


def add_academic_user(db, intg_uid, *, local=False, **values):
    """Insert one academic identity unless it already exists. Returns nothing; values are column=value."""
    values.setdefault('user_ty_cd', '0001')
    table = sql.Identifier('academic', 'local_usr_inf' if local else 'dc_v_usr_inf')
    columns = ['intg_uid', *values]
    db.execute(sql.SQL('INSERT INTO {} ({}) SELECT {} WHERE NOT EXISTS (SELECT 1 FROM {} WHERE intg_uid=%s)').format(
        table, sql.SQL(',').join(map(sql.Identifier, columns)),
        sql.SQL(',').join(sql.Placeholder() * len(columns)), table), [intg_uid, *values.values(), intg_uid])


def update_academic_user(db, intg_uid, **values):
    """Change source stand-in columns of an existing academic identity."""
    db.execute(sql.SQL('UPDATE academic.dc_v_usr_inf SET {} WHERE intg_uid=%s').format(
        sql.SQL(',').join(sql.SQL('{}=%s').format(sql.Identifier(k)) for k in values)), [*values.values(), intg_uid])


def add_academic_dept(db, college_code, college_name, dept_code, dept_name, univ_code='00'):
    """Academic college + department rows (source stand-in) unless present."""
    db.execute('''INSERT INTO academic.dc_v_col_inf(col_code,col_name,col_short_name,use_flag)
      SELECT %s,%s,%s,'1' WHERE NOT EXISTS (SELECT 1 FROM academic.dc_v_col_inf WHERE col_code=%s)''',
      (college_code, college_name, college_name, college_code))
    db.execute('''INSERT INTO academic.dc_v_dept_inf(dept_code,col_code,dept_name,class3,day_flag,degree_code,gubun_code,use_flag,univ_code)
      SELECT %s,%s,%s,'1','1','1','0','1',%s WHERE NOT EXISTS (SELECT 1 FROM academic.dc_v_dept_inf WHERE dept_code=%s)''',
      (dept_code, college_code, dept_name, univ_code, dept_code))
