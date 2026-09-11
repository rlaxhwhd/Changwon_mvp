"""Administrator-only, paged directory of verified local source mirrors."""
from typing import Literal

from fastapi import APIRouter, Depends, Query

from .administration import administrator
from .db import connection

router = APIRouter()
Dataset = Literal['people', 'organizations', 'counselors', 'assistant-assignments', 'joint-appointments']
# Identifiers are code constants, never supplied by the requester.
DATASETS = {
    'people': ('dc.academic_people', "concat_ws(' ',intg_uid,name,orgid,orgz_nm,daehak_cd,hakbu_cd,major_cd)", 'intg_uid'),
    'organizations': ('dc.academic_organizations', "concat_ws(' ',dept_cd,dept_nm,dept_up_cd,univ_code)", 'dept_cd'),
    'counselors': ('dc.academic_counselors', "concat_ws(' ',conid,name,con_comp_nm)", 'conid'),
    'assistant-assignments': ('dc.academic_assistant_assignments', "concat_ws(' ',usr_id,usr_nm,dept_cd,major_cd)", 'usr_id,dept_cd,major_cd'),
    'joint-appointments': ('dc.academic_joint_appointments', 'row_to_json(v)::text', 'row_to_json(v)::text'),
}


@router.get('/system/academic/status')
def status(user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    return conn.execute('SELECT * FROM dc.academic_sync_status ORDER BY finished_at DESC LIMIT 10').fetchall()


@router.get('/system/academic/{dataset}')
def directory(dataset: Dataset, page: int = Query(1, ge=1), pageSize: int = Query(30, ge=1, le=100),
              q: str = Query('', max_length=100),
              category: Literal['all', 'professor', 'assistant', 'employee', 'student', 'graduate', 'other'] = 'all',
              state: str = Query('', max_length=10),
              user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    table, search, order = DATASETS[dataset]
    # Treat %, _ and backslash as literal search text.
    pattern = '%' + q.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_') + '%'
    where, values = [f"{search} ILIKE %s"], [pattern]
    if dataset == 'people' and category != 'all':
        where.append('category=%s'); values.append(category)
    state_column = {'people': 'hofc_sta_cd', 'organizations': 'use_yn', 'counselors': 'status'}.get(dataset)
    if state and state_column:
        where.append(f'{state_column}=%s'); values.append(state)
    predicate = ' AND '.join(where)
    # One statement keeps count and page on the same MVCC snapshot during refresh.
    result = conn.execute(f'''WITH filtered AS MATERIALIZED (
      SELECT * FROM {table} v WHERE {predicate}
    ), paged AS (SELECT * FROM filtered v ORDER BY {order} LIMIT %s OFFSET %s)
    SELECT (SELECT count(*) FROM filtered) AS total,
           COALESCE((SELECT jsonb_agg(to_jsonb(paged)) FROM paged),'[]'::jsonb) AS items''',
      [*values, pageSize, (page-1)*pageSize]).fetchone()
    return dict(items=result['items'], totalCount=result['total'], page=page, pageSize=pageSize)
