from threading import Lock

from fastapi import APIRouter, Depends

from .auth import principal
from .db import connection

router=APIRouter()
_lock=Lock()
_revision=None
_items=[]


@router.get('/metadata')
def metadata(user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    global _revision,_items
    # A cheap revision read keeps multiple API workers coherent. Catalog rows are cached.
    revision=conn.execute('SELECT revision FROM dc.metadata_revision').fetchone()['revision']
    menus=conn.execute('''SELECT m.* FROM dc.menu m WHERE EXISTS (
      SELECT 1 FROM dc.menu_auth a WHERE a.menu_code=m.menu_code AND (
      a.role_code=(SELECT role_code FROM dc.staff WHERE intg_uid=%s) OR
      a.role_code IN (SELECT u.role_code FROM dc.auth_user u JOIN dc.auth_role r USING(role_code)
       WHERE u.person_uid=%s AND r.is_active AND u.valid_from<=now() AND (u.valid_to IS NULL OR u.valid_to>now()))))
      ORDER BY m.sort_order,m.menu_code''',(user['intg_uid'],user['intg_uid'])).fetchall()
    with _lock:
        if revision!=_revision:
            _items=conn.execute('SELECT group_code,code,label,sort_order,is_active,payload FROM dc.code_item ORDER BY sort_order,code').fetchall()
            _revision=revision
        factors=conn.execute('''SELECT d.test_code,d.factor_code,c.label,d.secondary_label,c.sort_order
          FROM dc.diagnosis_factor_definition d JOIN dc.code_item c ON (c.group_code,c.code)=(d.label_group,d.label_code)
          ORDER BY d.test_code,c.sort_order''').fetchall()
        return dict(revision=_revision,items=_items,menus=menus,factors=factors)
