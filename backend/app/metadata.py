from threading import Lock

from fastapi import APIRouter, Depends

from .auth import principal
from .db import connection

router=APIRouter()
_lock=Lock()
_revision=None
_items=[]
_survey_forms=[]


def published_forms(conn):
    """게시된 설문지 **전부**의 구성 — 개설·수정 화면의 영역 선택이 동기 셀렉터를 유지하게 함께 싣는다.
    현재 게시본만 실었을 때는 수정 화면이 늘 최신 기준으로 영역을 보여 줘, 프로그램이 붙잡은 옛 버전의
    영역이 화면에서 사라지거나 새 버전의 영역을 골랐다가 저장에서 422 를 맞았다. 프로그램은 개설 시점
    게시본을 평생 붙잡으므로 옛 버전도 함께 나가야 한다(버전은 관리자가 손으로 만든다 — 몇 벌뿐이다).
    문항 문장은 이미 items 로 나가므로 새로 노출되는 것은 (설문지, 영역, 문항, 순서) 뿐이다."""
    current={row['kind']:row['id'] for row in conn.execute(
      '''SELECT DISTINCT ON (kind) kind,id FROM dc.survey_form WHERE status='PUBLISHED'
         ORDER BY kind,version DESC''').fetchall()}
    rows=conn.execute('''SELECT f.id,f.kind,f.version,fa.area_code,fi.item_code
      FROM dc.survey_form f
      JOIN dc.survey_form_area fa ON fa.form_id=f.id
      LEFT JOIN dc.survey_form_item fi ON fi.form_id=fa.form_id AND fi.area_code=fa.area_code
      WHERE f.status='PUBLISHED'
      ORDER BY f.kind,f.version,fa.area_order,fi.item_order,fi.item_code''').fetchall()
    forms={}
    for row in rows:
        form=forms.setdefault(row['id'],{'id':row['id'],'kind':row['kind'],'version':row['version'],
                                        'isCurrent':current.get(row['kind'])==row['id'],'areas':[]})
        if not form['areas'] or form['areas'][-1]['key']!=row['area_code']:
            form['areas'].append({'key':row['area_code'],'items':[]})
        if row['item_code']:
            form['areas'][-1]['items'].append(row['item_code'])
    return list(forms.values())


@router.get('/metadata')
def metadata(user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    global _revision,_items,_survey_forms
    # A cheap revision read keeps multiple API workers coherent. Catalog rows are cached.
    revision=conn.execute('SELECT revision FROM dc.metadata_revision').fetchone()['revision']
    # 학생은 신분으로 자동 부여되는 역할 'student'(auth_role.base_group) 하나다. 교직원은 신분 역할 + 명시 부여 역할.
    if user['kind']=='STUDENT':
        menus=conn.execute('''SELECT m.* FROM dc.menu m JOIN dc.menu_auth a USING(menu_code)
          WHERE a.role_code='student' ORDER BY m.sort_order,m.menu_code''').fetchall()
    else:
        menus=conn.execute('''SELECT m.* FROM dc.menu m WHERE EXISTS (
          SELECT 1 FROM dc.menu_auth a WHERE a.menu_code=m.menu_code AND (
          a.role_code=(SELECT role_code FROM dc.staff WHERE intg_uid=%s) OR
          a.role_code IN (SELECT u.role_code FROM dc.auth_user u JOIN dc.auth_role r USING(role_code)
           WHERE u.person_uid=%s AND r.is_active AND u.valid_from<=now() AND (u.valid_to IS NULL OR u.valid_to>now()))))
          ORDER BY m.sort_order,m.menu_code''',(user['intg_uid'],user['intg_uid'])).fetchall()
    with _lock:
        if revision!=_revision:
            _items=conn.execute('SELECT group_code,code,label,sort_order,is_active,payload FROM dc.code_item ORDER BY sort_order,code').fetchall()
            _survey_forms=published_forms(conn)
            _revision=revision
        factors=conn.execute('''SELECT d.test_code,d.factor_code,c.label,d.secondary_label,c.sort_order
          FROM dc.diagnosis_factor_definition d JOIN dc.code_item c ON (c.group_code,c.code)=(d.label_group,d.label_code)
          ORDER BY d.test_code,c.sort_order''').fetchall()
        return dict(revision=_revision,items=_items,menus=menus,factors=factors,surveyForms=_survey_forms)
