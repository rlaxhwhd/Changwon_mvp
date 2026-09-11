"""C6 독립 검증 — 파일 다운로드 권한과 범위 격리를 검증자가 직접 확인한다.

구현자 테스트를 믿지 않고 다시 묻는 것 다섯 가지:
  ① 학생이 남의 자소서 첨부를 받을 수 있는가 (귀속 후 · 귀속 전 예약 파일 둘 다)
  ② 채용 메뉴 권한만으로 받을 수 있는가 (범위 술어가 실제로 잠그는가)
  ③ 업로드 원본 파일명이 저장 경로에 쓰이는가 (경로 조작)
  ④ 저장 위치가 웹루트 밖인가 (정적 서빙 라우트가 있는가)
  ⑤ 지원 상세·이력·전이·CSV 가 같은 범위 술어를 쓰는가
"""
from pathlib import Path
from uuid import uuid4

from fastapi.staticfiles import StaticFiles
from starlette.routing import Mount

from app.db import pool
from app.main import app
from app.settings import settings
from test_api import headers
from test_jobs import apply_as, key, new_posting, upload_resume


def test_no_static_mount_exists_anywhere_in_the_app():
    """④ 파일이 정적 서빙되면 아래 권한 검사는 전부 우회된다."""
    mounts = [r for r in app.routes if isinstance(r, Mount)]
    assert not mounts, f'정적 마운트가 있다: {mounts}'
    assert not any(isinstance(getattr(r, "app", None), StaticFiles) for r in app.routes)


def test_file_root_is_outside_the_served_tree_and_names_are_server_made(client):
    """③④ 저장 이름은 서버가 만든 id 뿐이고, 원본 이름은 경로에 쓰이지 않는다."""
    hostile = '../../../evil<script>.pdf'
    response = client.post('/api/v1/job-files?slot=RESUME&name=' + hostile,
                           headers=headers('chaewon'), content=b'%PDF-1.4 hostile')
    assert response.status_code == 201, response.text
    file_id = response.json()['id']
    assert file_id.isalnum() and len(file_id) == 32, file_id
    root = Path(settings.file_root).resolve()
    stored = (root / file_id[:2] / file_id)
    assert stored.is_file(), '서버가 만든 id 경로에 저장되지 않았다'
    # 볼륨 어디에도 원본 이름 조각이 파일명으로 남지 않는다.
    for path in root.rglob('*'):
        assert 'evil' not in path.name, path
        assert path.resolve().is_relative_to(root), path
    # 표시 이름은 경로 구분자가 제거된 상태로만 남는다.
    assert '/' not in response.json()['name'] and '\\' not in response.json()['name']


def test_traversal_in_the_download_path_finds_nothing(client):
    for probe in ('..%2F..%2F..%2Fetc%2Fpasswd', '..', 'aa/../../../../etc/passwd', 'x' * 64):
        got = client.get('/api/v1/job-files/' + probe, headers=headers('chaewon'))
        assert got.status_code in (404, 405, 307), (probe, got.status_code)
        if got.status_code == 200:
            raise AssertionError('경로 조작으로 파일이 열렸다: ' + probe)


def test_a_student_cannot_download_another_students_reserved_file(client):
    """① 아직 지원에 붙지 않은 예약 파일(owner_id IS NULL)."""
    reserved = upload_resume(client, 'chaewon', '예약이력서.pdf')
    url = '/api/v1/job-files/' + reserved['id']
    assert client.get(url, headers=headers('chaewon')).status_code == 200
    assert client.get(url, headers=headers('changwon')).status_code == 404, '남의 예약 파일이 열렸다'
    assert client.get(url, headers=headers('jiwoo')).status_code == 404, '남의 예약 파일이 열렸다'


def test_scope_is_what_gates_a_managing_staff_not_the_menu_alone(client):
    """② 채용 메뉴 권한만으로는 부족하고 staff_student_scope 가 실제로 문을 잠그는지.

    career 4명 모두 fixture:center-wide 로 전 학생 범위를 갖고 있어 「권한은 있고
    범위는 없는」 교직원 픽스처가 없다. 범위를 실제로 걷어낸 상태의 검증은
    06-verification.md 에 기록한 수동 프로브로 대신했다(전 경로 404/0건).
    여기서는 범위가 있을 때 열리고 감사되는 것, 메뉴 권한이 없으면 403 인 것만 고정한다.
    """
    posting = new_posting(client)
    uploaded = upload_resume(client, 'chaewon', '범위밖.pdf')
    application = apply_as(client, 'chaewon', posting, file_id=uploaded['id']).json()
    url = '/api/v1/job-files/' + uploaded['id']
    # 범위가 있을 때는 열린다(그리고 감사된다).
    assert client.get(url, headers=headers('career_park')).status_code == 200
    assert client.get(url, headers=headers('psych_yoon')).status_code == 403, '메뉴 권한 없는 교직원'
    with pool.connection() as conn:
        seen = conn.execute("""SELECT count(*) AS n FROM dc.job_access_event
          WHERE action='VIEW_DOCUMENT' AND target_id=%s""", (uploaded['id'],)).fetchone()['n']
    assert seen >= 1, '교직원 열람이 감사되지 않았다'


def test_students_cannot_read_each_others_applications_resumes_or_wishlists(client):
    """⑤ 파일 밖의 개인정보도 같은 술어로 막히는지."""
    posting = new_posting(client)
    application = apply_as(client, 'chaewon', posting).json()
    assert client.get('/api/v1/job-applications/' + application['id'],
                      headers=headers('changwon')).status_code == 404
    assert client.get(f"/api/v1/job-applications/{application['id']}/events",
                      headers=headers('changwon')).status_code == 404
    mine = client.get('/api/v1/job-applications/mine', headers=headers('changwon'))
    assert mine.status_code == 200
    assert all(item['id'] != application['id'] for item in mine.json()['items'])

    created = client.post('/api/v1/job-resumes', headers={**headers('chaewon'), **key()},
                          json={'title': '검증 자소서 ' + uuid4().hex[:6], 'categoryCode': 'MOTIVE',
                                'content': '본문'})
    assert created.status_code in (200, 201), created.text
    resume_id = created.json()['id']
    assert client.get('/api/v1/job-resumes/' + resume_id, headers=headers('changwon')).status_code == 404
    assert client.patch('/api/v1/job-resumes/' + resume_id, headers=headers('changwon'),
                        json={'title': '탈취', 'categoryCode': 'MOTIVE', 'content': '탈취',
                              'expectedVersion': created.json()['version']}).status_code == 404
    assert client.delete('/api/v1/job-resumes/' + resume_id, headers=headers('changwon')).status_code == 404
    assert client.get('/api/v1/job-resumes/' + resume_id, headers=headers('career_kim')).status_code in (403, 404)


def test_anonymous_and_bad_token_are_refused_on_every_job_route(client):
    token = headers('chaewon')['X-DC-Token']
    for path in ('/api/v1/jobs', '/api/v1/jobs/capabilities', '/api/v1/job-applications',
                 '/api/v1/job-applications/mine', '/api/v1/job-wishlist', '/api/v1/job-resumes'):
        assert client.get(path).status_code == 401, path
        assert client.get(path, headers={'X-DC-Identity': 'chaewon',
                                         'X-DC-Token': token[:-1] + 'x'}).status_code == 401, path


def test_two_session_round_trip_student_then_staff_then_student(client):
    """완료 게이트 — 학생 세션과 교직원 세션을 번갈아 쓰며 왕복이 닫히는지.

    브라우저 QA 를 생략했으므로 이 왕복이 그 대체 증거다(06-verification.md).
    """
    posting = new_posting(client, role='왕복 검증 직무')
    # ① 학생 세션 — 지원
    created = apply_as(client, 'chaewon', posting)
    assert created.status_code == 201, created.text
    application = created.json()
    mine = client.get('/api/v1/job-applications/mine', headers=headers('chaewon')).json()
    row = next(i for i in mine['items'] if i['id'] == application['id'])
    assert row['status'] == 'APPLIED'

    # ② 교직원 세션 — 접수함에 보이고 전형을 한 칸 진행한다
    listed = client.get('/api/v1/job-applications?postingId=' + posting['id'],
                        headers=headers('career_kim')).json()
    assert any(i['id'] == application['id'] for i in listed['items']), '교직원 접수함에 뜨지 않았다'
    advanced = client.post(f"/api/v1/job-applications/{application['id']}/advance",
                           headers=headers('career_kim'),
                           json={'expectedVersion': application['version'], 'reason': '서류 확인'})
    assert advanced.status_code == 200, advanced.text
    assert advanced.json()['status'] == 'IN_PROGRESS'
    summary = client.get('/api/v1/job-applications/summary?postingId=' + posting['id'],
                         headers=headers('career_kim')).json()
    assert summary['inProgress'] >= 1 and summary['total'] >= 1

    # ③ 다시 학생 세션 — 교직원이 만든 변화가 학생 화면 데이터에 그대로 보인다
    after = client.get('/api/v1/job-applications/mine', headers=headers('chaewon')).json()
    row = next(i for i in after['items'] if i['id'] == application['id'])
    assert row['status'] == 'IN_PROGRESS', '교직원 전이가 학생 세션에 반영되지 않았다'
    events = client.get(f"/api/v1/job-applications/{application['id']}/events",
                        headers=headers('chaewon')).json()
    assert [e['action'] for e in events['items']] == ['APPLY', 'ADVANCE']
    assert events['items'][1]['toStageName'] and events['items'][1]['byName']

    # ④ 학생만 취소할 수 있다 — 교직원의 취소 시도는 거절된다
    refused = client.post(f"/api/v1/job-applications/{application['id']}/cancel",
                          headers=headers('career_kim'), json={'expectedVersion': row['version']})
    assert refused.status_code == 403
    canceled = client.post(f"/api/v1/job-applications/{application['id']}/cancel",
                           headers=headers('chaewon'), json={'expectedVersion': row['version']})
    assert canceled.status_code == 200 and canceled.json()['status'] == 'CANCELED'
