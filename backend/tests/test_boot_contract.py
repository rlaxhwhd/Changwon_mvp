"""부팅 계약 테스트 — 「pytest 도 tsc 도 통과하는데 화면만 죽는다」를 잡는 자리.

세 가지는 서버 DTO 만 보면 전부 정상이라 도메인 테스트로는 걸리지 않았다.
  · 프로필에서 필드를 **빼면** 화면이 죽는다 — 프론트 타입이 필수라 tsc 는 잡지 못한다.
  · 계획이 DRAFT 인 동안에도 학생 포털이 부팅돼야 사유 문구가 화면에 도달한다.
  · 부팅 로더가 권한 없는 목록을 부르면 그 역할의 포털 전체가 403 으로 멈춘다.

그래서 여기서는 **부팅이 실제로 부르는 것**과 **화면이 필수로 읽는 것**을 건다.
"""
import io
import re
from pathlib import Path

import pytest

from app.db import pool
from test_api import headers

ROOT = Path(__file__).resolve().parents[2]

# 화면이 옵셔널 체이닝 없이 읽는 프로필 필드. 하나라도 빠지면 그 화면이 죽는다.
#   targetCompany — src_v2/data/students.ts(targetCompanySummary) ·
#                   src_v2/pages/growth/RoadmapStatus.tsx · src_admin/components/RoadmapEditorPanel.tsx ·
#                   src_admin/data/studentDetail.ts · src_admin/data/counselChatbot.ts
#   targetRole    — src_admin/components/RoadmapEditorPanel.tsx · src_v2/pages/growth/GrowthHome.tsx
REQUIRED_PROFILE_FIELDS = {'id', 'studentNo', 'name', 'major', 'grade', 'targetRole', 'targetCompany'}

# shared/bootstrap.ts 가 **가드 없이** 부르는 것들. 어떤 역할로 로그인해도 4xx 가 나오면
# 그 역할은 포털을 아예 열지 못한다.
ADMIN_BOOT_ROUTES = (
    '/api/v1/development/identities',
    '/api/v1/bootstrap/profiles',
    '/api/v1/counsel-requests?page=1&pageSize=100',
    '/api/v1/counsel-records?page=1&pageSize=100',
    '/api/v1/metadata',
    '/api/v1/programs?page=1&pageSize=100',
    '/api/v1/jobs?page=1&pageSize=100',
    '/api/v1/jobs/capabilities',
    '/api/v1/roadmap/capabilities',
)

# 역할마다 한 명씩. 「진로상담사만 된다」가 아니라 **전 역할이 부팅된다**를 검증한다.
STAFF_BY_ROLE = {'career': 'career_choi', 'psych': 'psych_han', 'professor': 'acc-1',
                 'assistant': 'asst_kim', 'admin': 'system-admin'}


def plan_of(client, identity, viewer):
    return client.get(f'/api/v1/students/{identity}/roadmap', headers=headers(viewer)).json()


def test_profile_keeps_every_field_the_screens_read(client):
    """계획이 없는 학생도 화면이 읽는 필드를 전부 갖는다.

    확정 계획이 없다고 targetRole/targetCompany 를 빼면 `student.targetCompany.name` 이
    undefined 를 읽어 두 SPA 가 부팅 중에 죽는다. jiwoo 는 모든 상담사 범위에 들어 있어
    /admin 이 통째로 멈춘다.
    """
    payload = client.get('/api/v1/bootstrap/profiles', headers=headers('career_choi')).json()
    students = {row['id']: row for row in payload['students']}
    assert 'jiwoo' in students, '계획 없는 학생이 목록에 있어야 이 검증이 성립한다'
    assert students['jiwoo']['hasRoadmap'] is False
    for identity, row in students.items():
        missing = REQUIRED_PROFILE_FIELDS - set(row)
        assert not missing, f'{identity} 프로필에서 화면 필수 필드가 빠졌다: {sorted(missing)}'
        assert isinstance(row['targetCompany'], dict), f'{identity}: targetCompany 는 객체여야 한다'
        assert isinstance(row['targetRole'], str)
    # 학생 본인 부팅도 같은 계약이다.
    mine = client.get('/api/v1/bootstrap/profiles', headers=headers('jiwoo')).json()['students']
    assert mine and isinstance(mine[0]['targetCompany'], dict)
    # 초안·AI 근거는 여전히 새지 않는다.
    assert 'roadmapAxes' not in students['jiwoo'] and 'roadmapOutcome' not in students['jiwoo']


def test_student_portal_boots_while_the_plan_is_a_draft(client):
    """04-decisions Q1 의 ⚠ 수용 조건 — 잠긴 동안 사유와 다음 단계가 화면에 **도달**해야 한다.

    서버가 사유를 옳게 내려도 부팅이 죽으면 학생은 그 문구를 못 본다.
    """
    plan = plan_of(client, 'chaewon', 'career_kim')['roadmap']
    reopened = client.post('/api/v1/students/chaewon/roadmap/reopen',
                           headers={**headers('career_kim'), 'Idempotency-Key': 'boot-draft-1'},
                           json={'expectedRoadmapVersion': plan['roadmapVersion'],
                                 'expectedVersion': plan['version']})
    assert reopened.status_code == 200, reopened.text
    try:
        # ① 부팅이 성립한다 — 프로필이 온전하다.
        boot = client.get('/api/v1/bootstrap/profiles', headers=headers('chaewon'))
        assert boot.status_code == 200, boot.text
        me = boot.json()['students'][0]
        assert REQUIRED_PROFILE_FIELDS <= set(me) and isinstance(me['targetCompany'], dict)
        # ② 사유와 다음 경로가 실제로 실려 온다.
        view = plan_of(client, 'chaewon', 'chaewon')
        assert view['roadmap'] is None and view['pending'] is True
        reason = view['gate']['reasons'][0]
        assert reason['code'] == 'ROADMAP_CONFIRMATION_REQUIRED'
        assert reason['message'].strip() and reason['nextRoute'].strip()
        # ③ 학생 부팅이 부르는 나머지도 DRAFT 상태에서 살아 있어야 한다.
        for route in ('/api/v1/students/chaewon/growth/profile',
                      '/api/v1/students/chaewon/star-track',
                      '/api/v1/program-wishlist',
                      '/api/v1/roadmap-requests?page=1&pageSize=100'):
            assert client.get(route, headers=headers('chaewon')).status_code == 200, route
    finally:
        current = plan_of(client, 'chaewon', 'career_kim')['roadmap']
        client.post('/api/v1/students/chaewon/roadmap/confirm',
                    headers={**headers('career_kim'), 'Idempotency-Key': 'boot-draft-2'},
                    json={'expectedRoadmapVersion': current['roadmapVersion'],
                          'expectedVersion': current['version']})
    assert plan_of(client, 'chaewon', 'chaewon')['roadmap'] is not None


@pytest.mark.parametrize('role,identity', sorted(STAFF_BY_ROLE.items()))
def test_every_staff_role_can_boot_the_admin_portal(client, role, identity):
    """부팅 로더가 무조건 부르는 것은 **모든 역할**에서 열려야 한다.

    권한이 갈리는 목록은 부르기 전에 capability 로 걸러야 한다 — 부르고 403 을 받으면
    화면에는 오류 문구만 남고 포털 전체가 사용 불가가 된다.
    """
    for route in ADMIN_BOOT_ROUTES:
        response = client.get(route, headers=headers(identity))
        assert response.status_code < 400, f'{role}({identity}) 부팅이 {route} 에서 막혔다: {response.text[:200]}'


def test_roadmap_request_queue_is_capability_gated(client):
    """진로상담사만 열리는 목록이라는 사실 + 부팅이 그것을 가드한다는 사실을 함께 건다."""
    allowed = client.get('/api/v1/roadmap/capabilities', headers=headers('career_choi')).json()
    denied = client.get('/api/v1/roadmap/capabilities', headers=headers('acc-1')).json()
    assert allowed['canManageRequests'] is True and denied['canManageRequests'] is False
    # 권한 없는 역할이 실제로 부르면 403 이다 — 그래서 부르기 전에 걸러야 한다.
    assert client.get('/api/v1/roadmap-requests', headers=headers('acc-1')).status_code == 403
    # 부팅 로더가 가드하고 있는지 소스로 확인한다. 서버만 보면 이 결함을 다시 놓친다.
    source = io.open(ROOT / 'shared/bootstrap.ts', encoding='utf-8').read()
    calls = [line.strip() for line in source.splitlines() if 'loadRoadmapRequests()' in line]
    assert calls, 'bootstrap 이 변경 요청을 더 이상 읽지 않는다면 이 테스트를 함께 고쳐라'
    admin_calls = [line for line in calls if not line.startswith('loadRoadmapRequests')]
    assert admin_calls, '가드 없는 호출만 남았다'
    assert any(re.search(r'roadmapCapability\(\)\.canManageRequests', line) for line in admin_calls), \
        '교직원 부팅의 loadRoadmapRequests 호출에 capability 가드가 없다 — 전 역할이 403 으로 멈춘다'


def test_student_gate_reads_confirmed_not_merely_present(client):
    """화면 게이트가 「확정」을 보는지 건다 — 「있다」로 보면 초안에도 화면이 열린다.

    이 결함은 서버만 봐서는 절대 안 잡힌다. `gates.py` 는 초안을 정확히 거절하므로
    데이터가 새지 않고, 필드 이름도 `roadmapConfirmed` 라 타입 검사도 통과한다.
    깨지는 것은 「학생이 잠긴 줄 모르고 신청까지 갔다가 마지막에 막힌다」는 경험이고,
    술어가 서버와 프론트 두 벌이 되어 `CLAUDE.md` 13조(게이팅 단일 정책)를 어긴다.
    """
    source = io.open(ROOT / 'src_v2/data/pipeline.ts', encoding='utf-8').read()
    gate = [line for line in source.splitlines() if 'roadmapConfirmed:' in line]
    assert gate, 'pipeline 이 roadmapConfirmed 를 더 이상 만들지 않는다면 이 테스트를 함께 고쳐라'
    assert all('hasConfirmedRoadmap(' in line for line in gate), \
        '게이트가 확정 여부가 아니라 존재 여부로 판정한다 — 초안 상태에서 비교과·취업지원이 열린다'

    # 그 함수가 실제로 confirmed 를 읽는지도 확인한다. 이름만 맞고 속이 다르면 소용없다.
    store = io.open(ROOT / 'src_admin/data/roadmapGenerated.ts', encoding='utf-8').read()
    body = store.split('export function hasConfirmedRoadmap', 1)
    assert len(body) == 2, 'hasConfirmedRoadmap 이 사라졌다'
    assert 'confirmed' in body[1].split('}', 1)[0], 'hasConfirmedRoadmap 이 confirmed 를 보지 않는다'


def test_career_counsel_is_identified_by_code_not_korean_text(client):
    """진로·취업 상담을 한글이 아니라 코드로 가른다.

    예전에는 진로취업 행만 type_code 가 비어 있어 `legacy_type='진로취업'` 폴백이
    서버 곳곳에 깔려 있었다. 그 폴백이 서버와 화면에서 두 벌로 갈리면서 게이트가
    어긋났다. 코드가 채워져 있으면 폴백을 되살릴 이유가 없다.
    """
    with pool.connection() as conn:
        rows = conn.execute('''SELECT legacy_type, type_code, care_track IS NULL AS no_track,
                                      count(*) AS n
                                 FROM dc.counsel_request GROUP BY 1,2,3''').fetchall()
    assert rows, '상담 신청이 하나도 없다 — 시드를 확인하라'
    by_type = {r['legacy_type']: r for r in rows}
    assert by_type['진로취업']['type_code'] == 'CAREER', '진로취업 상담의 종류 코드가 비어 있다'
    assert by_type['진로취업']['no_track'] is False, '진로취업 상담에는 트랙이 있어야 한다'
    for kind, code in (('심리', 'PSY'), ('교수', 'PROF')):
        if kind in by_type:
            assert by_type[kind]['type_code'] == code
            assert by_type[kind]['no_track'] is True, f'{kind} 상담에 트랙이 붙었다 — 트랙은 진로·취업 전용이다'

    # 서버 술어에 한글 폴백이 되살아났는지 소스로 확인한다.
    source = io.open(ROOT / 'backend/app/gates.py', encoding='utf-8').read()
    predicates = [l for l in source.splitlines()
                  if l.startswith('CAREER_REQUEST') or l.startswith('CARE7_TRACK')]
    assert len(predicates) == 2, 'gates 의 상담 술어가 사라졌다면 이 테스트를 함께 고쳐라'
    for line in predicates:
        assert '진로취업' not in line, f'술어가 한글 리터럴로 판정한다: {line}'
        assert 'COALESCE' not in line, f'트랙 NULL 폴백이 되살아났다: {line}'


def test_demo_data_never_rides_the_automatic_paths():
    # 028 은 학생 UID 와 검사 종류만 보고 UPDATE 한다. migration 은 어느 DB 에서나
    # 자동으로 도는 경로이므로, 시연 DML 이 거기 있으면 언젠가 운영에서 돈다 —
    # 그리고 같은 UID 의 실제 점수를 덮어쓴다. 이미 적용된 028 은 고칠 수 없지만,
    # **다음 시연 데이터가 같은 길로 들어오는 것**은 여기서 막는다.
    # 근거: .ai/db/SCHEMA_REVIEW_2026-09-10.md §4 F1
    from pathlib import Path
    backend = Path(__file__).resolve().parents[1]
    for runner in ('migrate.py', 'seed.py'):
        body = (backend / 'app' / runner).read_text(encoding='utf-8')
        assert 'seed_demo' not in body, f'{runner} 가 시연 시드를 부른다 — 자동 경로에서 시연 데이터가 실행된다'
    demo = (backend / 'app' / 'seed_demo.py').read_text(encoding='utf-8')
    # 가드 세 겹이 남아 있는지 본다. 하나라도 빠지면 실데이터 DB 에서 돌 수 있다.
    assert "settings.environment != 'development'" in demo, '개발 환경 가드가 없다'
    assert 'diagnosis_attempt' in demo and 'NOT LIKE' in demo, '실데이터 혼입 가드가 없다'
    assert "required=True" in demo, '명시적 확인 플래그가 없다'


def test_demo_seed_refuses_outside_development(monkeypatch):
    from app import seed_demo
    from app.settings import settings
    monkeypatch.setattr(settings, 'environment', 'production')
    try:
        seed_demo.guard(None)
    except RuntimeError as error:
        assert 'development' in str(error)
    else:
        raise AssertionError('운영 환경에서도 시연 시드가 실행된다')


def test_student_type_is_one_answer_for_screen_and_server():
    # dc.student_list 는 roster JSON 까지 COALESCE 로 폴백하지만 gates·roadmap·jobs 는
    # dc.student_type_event 를 직접 읽는다. 두 술어가 갈리면 **명단에 T3 으로 보이는
    # 학생이 상담·로드맵에서는 유형 미확정으로 막힌다** — 화면과 서버가 다른 답을 한다.
    # 서버 쪽 조회가 여전히 이벤트를 본다는 사실을 고정해, 뷰만 고치고 끝내지 않게 한다.
    from pathlib import Path
    app_dir = Path(__file__).resolve().parents[1] / 'app'
    for module in ('gates.py', 'roadmap.py', 'jobs.py'):
        assert 'student_type_event' in (app_dir / module).read_text(encoding='utf-8'), \
            f'{module} 이 유형을 이벤트가 아닌 곳에서 읽는다'
