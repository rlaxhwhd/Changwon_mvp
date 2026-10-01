"""Server-only adapter for the documented HRTest results API (2026-10-01).

The provider exposes completed results, not a test-launch or scoring API.
Never log credentials or response bodies; never synthesize missing scores.
"""
from datetime import datetime
from math import isfinite
from pathlib import Path
import re
from time import monotonic
from zoneinfo import ZoneInfo

import httpx

from .settings import settings

TESTS = {'ccore': 'core', 'c2': 'cares', 'c3': 'deft', 'c4': 'ready'}
CORE_TYPES = {
    '진로미탐색형': 'T1', '진로설정형': 'T2', '역량성장형': 'T3',
    '취업준비형': 'T4', '취약관리형': 'T5', '우수인재형': 'T6',
}
# User-confirmed launch routes. Do not guess routes for other tests or append
# undocumented identity fields; results are matched exclusively by student.id.
LAUNCH_URLS = {
    'ccore': 'https://cwnu.hrtest.net/poll_before.asp?jst=base',
    'c2': 'https://cwnu.hrtest.net/poll_before.asp?jst=jinro',
    'c3': 'https://cwnu.hrtest.net/poll_before.asp?jst=deft',
    'c4': 'https://cwnu.hrtest.net/poll_before.asp?jst=ready',
}
BASE_URL = 'https://cwnu.hrtest.net/api/v1/'


class HRTestError(Exception):
    """Safe message suitable for the application boundary."""


def client():
    if not settings.hrtest_key_file:
        raise HRTestError('진단 결과 연동 설정이 준비되지 않았습니다.')
    try:
        key = Path(settings.hrtest_key_file).read_text().strip()
    except OSError:
        raise HRTestError('진단 결과 연동 설정을 확인해 주세요.') from None
    if not key:
        raise HRTestError('진단 결과 연동 설정을 확인해 주세요.')
    return httpx.Client(base_url=BASE_URL, headers={'X-API-Key': key},
                        timeout=httpx.Timeout(15, connect=5), follow_redirects=False,
                        trust_env=False)


def request_json(session, path, params=None, deadline=None):
    try:
        with session.stream('GET', path, params=params) as response:
            if response.status_code != 200:
                raise HRTestError('진단 제공기관 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.')
            content = bytearray()
            for chunk in response.iter_bytes():
                if deadline is not None and monotonic() > deadline:
                    raise HRTestError('진단 결과 조회 시간이 초과되었습니다. 잠시 후 다시 가져와 주세요.')
                content.extend(chunk)
                if len(content) > 2_000_000:
                    raise HRTestError('진단 응답 크기가 허용 범위를 초과했습니다.')
            import json
            body = json.loads(content)
        if not isinstance(body, dict):
            raise ValueError()
        return body
    except (httpx.HTTPError, ValueError):
        raise HRTestError('진단 제공기관 응답을 확인할 수 없습니다. 다시 시도해 주세요.') from None


def timestamp(value):
    if not isinstance(value, str):
        raise ValueError('Missing timestamp')
    result = datetime.fromisoformat(value)
    if result.tzinfo is None:
        result = result.replace(tzinfo=ZoneInfo('Asia/Seoul'))
    return result


def validate_item(item, student_no):
    if not isinstance(item, dict) or item.get('student', {}).get('id') != student_no:
        raise ValueError('Student mismatch')
    if type(item.get('attempt_id')) is not int or item['attempt_id'] <= 0:
        raise ValueError('Invalid attempt ID')
    if type(item.get('incomplete')) is not bool:
        raise ValueError('Missing completion quality')
    if timestamp(item['completed_at']) < timestamp(item['started_at']):
        raise ValueError('Invalid completion time')
    missing = item.get('missing_items')
    if not isinstance(missing, list) or any(type(n) is not int or n < 1 for n in missing):
        raise ValueError('Invalid missing items')
    if missing and not item['incomplete']:
        raise ValueError('Inconsistent completion quality')
    if not isinstance(item.get('types'), dict):
        raise ValueError('Invalid types')
    if any(value is not None and not isinstance(value, str) for value in item['types'].values()):
        raise ValueError('Invalid type label')
    for group in ('scales', 'areas'):
        rows = item.get(group, [] if group == 'areas' else None)
        if not isinstance(rows, list) or len(rows) > 100:
            raise ValueError('Invalid scales')
        seen = set()
        for row in rows:
            if not isinstance(row, dict) or not isinstance(row.get('code'), str) or not row['code']:
                raise ValueError('Invalid scale code')
            if row['code'] in seen or not isinstance(row.get('name'), str):
                raise ValueError('Duplicate scale or missing name')
            seen.add(row['code'])
            value = row.get('t_score')
            if value is not None and (type(value) not in (int, float) or not isfinite(value)):
                raise ValueError('Invalid score')
            if row.get('level') is not None and not isinstance(row['level'], str):
                raise ValueError('Invalid level')
    return item


def fetch_results(test_id, student_no):
    if test_id not in TESTS:
        raise HRTestError('이 검사는 아직 결과 API가 제공되지 않습니다.')
    if not re.fullmatch(r'[A-Za-z0-9]{1,20}', student_no):
        raise HRTestError('진단기관과 연동할 학번을 확인해 주세요.')
    collected = {}
    deadline = monotonic() + 40
    try:
        with client() as session:
            for page in range(1, 21):
                if monotonic() > deadline:
                    raise HRTestError('진단 결과 조회 시간이 초과되었습니다. 잠시 후 다시 가져와 주세요.')
                body = request_json(session, 'results.asp',
                    {'test': TESTS[test_id], 'student_id': student_no, 'page': page, 'size': 100}, deadline)
                if body.get('test') != TESTS[test_id] or body.get('page') != page:
                    raise ValueError('Response mismatch')
                if type(body.get('total')) is not int or body['total'] < 0:
                    raise ValueError('Invalid total')
                items = body.get('items')
                if not isinstance(items, list) or len(items) > 100:
                    raise ValueError('Invalid items')
                if not items:
                    return sorted(collected.values(), key=lambda r: (timestamp(r['completed_at']), r['attempt_id']))
                before = len(collected)
                for item in items:
                    validate_item(item, student_no)
                    collected[item['attempt_id']] = item
                if len(collected) == before:
                    raise ValueError('Repeated page')
        raise HRTestError('진단 이력이 많아 담당자의 확인이 필요합니다.')
    except (ValueError, KeyError, TypeError, AttributeError):
        raise HRTestError('진단 응답 형식이 계약과 달라 저장하지 않았습니다. 담당자에게 확인해 주세요.') from None


def factors(item):
    """Keep provider codes in a separate namespace; areas are not subscales."""
    return [dict(factorCode='HRTEST_' + group.upper() + '_' + row['code'],
                 providerCode=row['code'], category=group,
                 name=row['name'], tScore=row.get('t_score'), level=row.get('level'),
                 **({'group': row['group']} if row.get('group') else {}),
                 **({'area': row['area']} if row.get('area') else {}))
            for group in ('areas', 'scales') for row in item.get(group, [])]
