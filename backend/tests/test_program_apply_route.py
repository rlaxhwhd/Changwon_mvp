"""지원경로 — 신청서의 「어떻게 알게 되었습니까?」는 PROGRAM_APPLY_ROUTE 코드로 고르고 코드·라벨을 함께 남긴다."""
from app.db import pool
from test_programs import apply_as, new_program


def test_apply_route_code_is_validated_and_stored_with_label(client):
    p = new_program(client)
    assert apply_as(client, 'chaewon', p['id'], routeCode='NOT_A_ROUTE').status_code == 422
    applied = apply_as(client, 'chaewon', p['id'], routeCode='SNS')
    assert applied.status_code == 201, applied.text
    with pool.connection() as conn:
        row = conn.execute('''SELECT a.apply_route_code, a.apply_path, a.snapshot->>'path' AS snap
          FROM dc.program_apply a WHERE a.program_id=%s''', (p['id'],)).fetchone()
    assert (row['apply_route_code'], row['apply_path'], row['snap']) == (
        'SNS', 'SNS(인스타그램, 페이스북 등)', 'SNS(인스타그램, 페이스북 등)')
