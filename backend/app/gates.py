"""순차 게이팅 판정 — 진단→상담→로드맵→역량강화→취업지원을 한 곳에서만 판정한다.

PROCESS.md §2 구현규칙 2·3: 판정은 데이터층 단일 정책이고 함수는 하나다.
상담(counsel.py)·비교과(programs.py)·취업(jobs.py)·로드맵(roadmap.py)이 같은 술어를
나눠 쓴다 — 두 벌로 두면 같은 학생이 상담은 열리고 취업은 잠기는 어긋남이 생긴다.

유형→후속 검사 매핑을 파이썬으로 복제하지 않는다. 그 매핑은 이미 DB 에 있다
(dc.student_type_rule.follow_up_test → dc.student_type_code 뷰).

잠긴 UI 는 빈 화면이 아니다(PROCESS.md §2 구현규칙 1) — 사유마다 다음 단계
경로를 함께 돌려주어 화면이 문구를 다시 만들지 않게 한다.
"""

ROUTES = {
    'TYPE_REQUIRED': '/diagnosis/employment',
    'CORE_REQUIRED': '/diagnosis/employment',
    'FOLLOWUP_REQUIRED': '/diagnosis/employment',
    'CARE7_REQUIRED': '/counsel/career',
    'ROADMAP_CONFIRMATION_REQUIRED': '/growth/roadmap-status',
}
MESSAGES = {
    'TYPE_REQUIRED': '상담에서 학생 유형을 먼저 확정해야 합니다.',
    'CORE_REQUIRED': '핵심 진단(CCORE)을 완료해야 합니다.',
    'FOLLOWUP_REQUIRED': '유형별 후속 진단을 완료해야 합니다.',
    'CARE7_REQUIRED': '완료된 CARE 7+ 진로·취업 상담이 필요합니다.',
    'ROADMAP_CONFIRMATION_REQUIRED': '상담사가 로드맵을 확정해야 합니다. 재생성 중에는 확정 전까지 잠깁니다.',
}

# 상담 종류 → 코드. 시드와 API 가 같은 표를 본다.
# 진로·취업을 CAREER 하나로 둔다 — 현행 운영이 둘을 나누지 않고, 나눈다면 기존 행마다
# 진로였는지 취업이었는지를 지어내야 한다(2026-09-09 결정). JOB 은 제약에 남아 있지만
# 쓰지 않는다. 나중에 나눌 때 이 표만 고치면 된다.
COUNSEL_TYPE_CODE = {'진로취업': 'CAREER', '심리': 'PSY', '교수': 'PROF'}

# 진로·취업 상담을 가르는 하나의 술어.
# 예전에는 여기에 `type_code IS NULL AND legacy_type='진로취업'` 폴백이 붙어 있었다.
# 진로취업 행의 type_code 가 비어 있어서였는데, 마이그레이션 027 이 전부 CAREER 로
# 채우고 NOT NULL 로 막았으므로 폴백의 근거가 사라졌다. 한글 리터럴로 판정하지 않는다.
CAREER_REQUEST = "type_code IN ('CAREER','JOB')"
# care_track 도 마찬가지다. 027 이 진로·취업 행에 트랙을 필수로 만들었고 신청 API 도
# 필수로 받으므로(counsel.py) NULL 을 care7 로 읽던 COALESCE 를 걷었다.
CARE7_TRACK = "care_track='care7'"


def reason(code):
    return {'code': code, 'message': MESSAGES[code], 'nextRoute': ROUTES[code]}


def is_care7_request(row) -> bool:
    """상담 1행의 트랙 판정. SQL 의 CAREER_REQUEST·CARE7_TRACK 과 같은 답을 낸다 —
    complete 와 게이트가 서로 다른 술어를 쓰면 트랙이 NULL 인 상담이 로드맵 없이
    완료된 뒤 게이트에서는 CARE7 충족으로 계산된다."""
    return row['type_code'] in ('CAREER', 'JOB') and row['care_track'] == 'care7'


def care7_completed(conn, uid) -> bool:
    return bool(conn.execute(f'''SELECT 1 FROM dc.counsel_request
      WHERE student_uid=%s AND {CAREER_REQUEST} AND {CARE7_TRACK} AND status_code='DONE' LIMIT 1''',
      (uid,)).fetchone())


def confirmed_roadmap(conn, uid):
    """확정된 계획 1행. 초안·검토중은 학생에게 열리지 않는다(Q1) — confirmed 는
    status_code='CONFIRMED' 의 생성열이라 상태가 곧 잠금이다."""
    return conn.execute('SELECT * FROM dc.roadmap WHERE student_uid=%s AND confirmed', (uid,)).fetchone()


def roadmap_basis_ok(conn, request_id, student_uid) -> bool:
    """CARE 7+ 상담을 완료할 수 있는 확정 계획이 있는가.

    신규 계획은 그 상담을 근거로 만들어져야 한다. 근거가 아예 없는 이관분(LEGACY_IMPORT)은
    조회·게이트를 그대로 유지하되(D03) 새 상담의 근거로 자동 승격하지 않는다 —
    다만 이관분만 갖고 있는 학생의 기존 상담 완료 경로를 막지 않기 위해 인정한다.
    """
    row = confirmed_roadmap(conn, student_uid)
    if not row:
        return False
    return row['counsel_request_id'] in (None, request_id) or row['basis_kind'] == 'LEGACY_IMPORT'


def diagnosis_gate(conn, uid):
    """확정 유형과 진단 완료 여부. (유형 행|None, 미충족 사유) 를 돌려준다.

    완료 판정은 completed_at IS NOT NULL 하나로 통일한다. status_code='DONE' 과
    두 벌로 두면 상담 게이트와 취업 게이트가 어긋난다.
    """
    row = conn.execute('''SELECT c.* FROM dc.student_type_event t
      JOIN dc.student_type_code c ON c.code=t.student_type
      WHERE t.student_uid=%s ORDER BY t.decided_at DESC,t.id DESC LIMIT 1''', (uid,)).fetchone()
    if not row:
        return None, [reason('TYPE_REQUIRED')]
    done = {r['test_id'].upper() for r in conn.execute(
        'SELECT test_id FROM dc.diagnosis_attempt WHERE student_uid=%s AND completed_at IS NOT NULL',
        (uid,)).fetchall()}
    reasons = []
    if 'CCORE' not in done:
        reasons.append(reason('CORE_REQUIRED'))
    if row['follow_up_test'].upper() not in done:
        reasons.append(reason('FOLLOWUP_REQUIRED'))
    return row, reasons


def employment_gate(conn, uid):
    """취업지원 게이트 — 진단 + CARE 7+ 상담 완료 + 확정된 로드맵."""
    type_row, reasons = diagnosis_gate(conn, uid)
    if not care7_completed(conn, uid):
        reasons.append(reason('CARE7_REQUIRED'))
    if not confirmed_roadmap(conn, uid):
        reasons.append(reason('ROADMAP_CONFIRMATION_REQUIRED'))
    return {'eligible': not reasons, 'reasons': reasons,
            'studentType': type_row['code'] if type_row else None}


def program_gate(conn, uid):
    """비교과(역량강화) 게이트 — 확정된 로드맵이 있어야 신청할 수 있다.

    재생성 중에는 구계획이 스냅샷으로 넘어가고 현재 계획이 DRAFT 이므로 여기서 잠긴다
    (04-decisions Q1). 잠긴 화면은 빈 화면이 아니라 사유와 다음 경로를 받는다.

    ⚠ 진단·CARE7 까지 서버에서 요구하지는 않는다. 그 두 조건은 지금까지 비교과 신청에
      서버 게이트가 없어 한 번도 강제된 적이 없고, 이번 승인 범위는 「확정 전까지 잠근다」다.
      확대는 별건이다(05-implementation.md 의 잔여 위험).
    """
    reasons = [] if confirmed_roadmap(conn, uid) else [reason('ROADMAP_CONFIRMATION_REQUIRED')]
    return {'eligible': not reasons, 'reasons': reasons}
