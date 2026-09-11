"""시연용 데이터를 채운다 — migration 이 아니라 여기서.

왜 분리했나(SCHEMA_REVIEW §4 F1):
    028_followup_diagnosis_scores.sql 은 학생 UID 와 검사 종류만 보고 UPDATE 한다.
    같은 UID 의 **실제 결과가 들어 있는 DB** 에 적용하면 진짜 점수를 시연값으로
    덮어쓴다. 주석의 "시연용" 은 실행 조건이 아니다. migration 은 어느 DB 에서나
    자동으로 도는 경로이므로, 시연 데이터가 거기 있으면 언젠가 운영에서 돈다.

    그래서 시연 데이터는 **명시적으로 손으로 실행하는 이 모듈**에만 둔다.
    migrate.py 도 seed.py 도 이 파일을 부르지 않는다.

세 겹의 가드:
    1. DC_ENVIRONMENT 가 development 가 아니면 거부한다.
    2. 진단 응시에 fixture 가 아닌 source 가 하나라도 있으면 거부한다 — 실데이터가
       섞인 DB 라는 뜻이다.
    3. 모든 쓰기가 멱등이고, 새로 만드는 행에는 지울 수 있게 source 를 남긴다.

판정식을 만들지 않는다(CLAUDE.md 14조):
    유형을 점수에서 계산하지 않는다. 명단(roster)·상세(detail)가 **이미 선언한**
    유형을 확정 이벤트로 옮겨 적을 뿐이다.
"""
import argparse
import json

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from .settings import settings

DEMO_SOURCE = 'demo:roster'


def guard(conn) -> None:
    if settings.environment != 'development':
        raise RuntimeError(f'Refusing demo data outside development (DC_ENVIRONMENT={settings.environment})')
    foreign = conn.execute("""SELECT count(*) AS n FROM dc.diagnosis_attempt
                              WHERE source NOT LIKE 'fixture%' AND source NOT LIKE 'development:%'""").fetchone()['n']
    if foreign:
        raise RuntimeError(f'Refusing demo data: {foreign} diagnosis attempts are not fixture data')


def record_type_conflicts(conn) -> int:
    """선언된 유형과 실제 응시한 후속검사가 어긋나는 학생을 남긴다.

    dc.student_type_rule 은 T1↔C1 … T6↔C6 으로 1:1 이라, 선언 유형이 T1 인데 c5 를
    본 학생은 fixture 가 스스로 모순된 것이다. **어느 쪽이 맞는지 우리는 모른다.**
    그래서 고르지 않고 기록만 남긴다 — 임의로 하나를 고르면 그게 판정 로직이 된다.
    """
    return conn.execute("""
        INSERT INTO dc.import_issue(source_path,source_key,code,detail)
        SELECT 'src_v2/data/studentsRoster.json', s.intg_uid, 'TYPE_FOLLOWUP_MISMATCH',
               jsonb_build_object('declared', declared.code, 'followUpTaken', a.test_id,
                                  'impliedByTest', r.code)
          FROM dc.student s
          CROSS JOIN LATERAL (SELECT coalesce(s.detail->>'studentType', s.roster->>'studentType') AS code) declared
          JOIN dc.diagnosis_attempt a ON a.student_uid = s.intg_uid AND a.test_id <> 'ccore'
          JOIN dc.student_type_rule r ON r.follow_up_test = upper(a.test_id)
          JOIN dc.student_type_rule d ON d.code = declared.code
         WHERE declared.code IS NOT NULL AND r.code <> declared.code
           AND NOT EXISTS (SELECT 1 FROM dc.import_issue i
                            WHERE i.code = 'TYPE_FOLLOWUP_MISMATCH' AND i.source_key = s.intg_uid)
    """).rowcount


def confirm_types(conn) -> int:
    """명단이 이미 선언한 유형을 확정 이벤트로 승격한다.

    화면과 서버가 갈라져 있다. dc.student_list 는 roster JSON 의 studentType 까지
    COALESCE 로 폴백하므로 **화면에는 119 명이 유형 보유**로 뜬다. 그런데
    gates.py·roadmap.py·jobs.py 는 뷰가 아니라 dc.student_type_event 를 직접 읽고,
    거기에는 8 명뿐이다. 그래서 명단에 T3 로 보이는 학생이 상담·로드맵·취업지원
    에서는 「유형 미확정」으로 막힌다 — 화면과 서버가 다른 답을 하는 상태다.

    새로 판정하지 않고 선언값을 그대로 옮긴다. 이미 이벤트가 있는 학생은 건너뛴다:
    상담에서 확정한 유형(source='counsel')을 시연값이 덮으면 안 된다.

    decided_at 은 그 학생의 마지막 진단 완료 시각으로 둔다. 유형이 진단 뒤에
    정해졌다는 순서가 이력에 남아야 한다.
    """
    return conn.execute("""
        INSERT INTO dc.student_type_event(student_uid,student_type,source,decided_at)
        SELECT s.intg_uid, declared.code, %s,
               coalesce((SELECT max(coalesce(a.completed_at,a.started_at)) FROM dc.diagnosis_attempt a
                          WHERE a.student_uid = s.intg_uid), now())
          FROM dc.student s
          CROSS JOIN LATERAL (SELECT coalesce(s.detail->>'studentType', s.roster->>'studentType') AS code) declared
         WHERE declared.code IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM dc.student_type_event e WHERE e.student_uid = s.intg_uid)
    """, (DEMO_SOURCE,)).rowcount


# 상담 갈래별 시연 구성. 학번 끝자리로 갈라서 **매 실행이 같은 결과**가 되게 한다.
# 난수를 쓰면 재실행마다 다른 학생이 상담을 갖게 되어 화면 확인이 재현되지 않는다.
COUNSEL_PLAN = (
    # (갈래, 학번끝자리, type_code, care_track, 주제코드, 주제, 상태)
    ('care7',   {0, 1, 2, 3, 4, 5, 6}, 'CAREER', 'care7',   'A08', 'CARE 7+ 연계 진로설계', 'DONE'),
    ('general', {3, 4, 5},             'CAREER', 'general', 'A04', '진로분야 직업군 탐색',   'DONE'),
    ('psych',   {7, 8},                'PSY',    None,      None,  '심리·정서 상담',        'DONE'),
    # 교수상담만 끝자리를 가리지 않는다 — 담당 교수가 붙어 있는 학생이 18 명뿐이라
    # 여기서 또 걸러내면 교수 화면이 비어 버린다. 대상 자체가 이미 좁다.
    ('prof',    set(range(10)),        'PROF',   None,      None,  '전공·학업 지도',        'DONE'),
    ('waiting', {9},                   'CAREER', 'care7',   'A08', 'CARE 7+ 연계 진로설계', 'REQ'),
)

LEGACY_TYPE = {'CAREER': '진로취업', 'PSY': '심리', 'PROF': '교수'}

RECORD_TEXT = {
    'care7': ('진단 결과를 함께 확인하고 3축 로드맵 방향을 잡았다.',
              '목표 직무가 아직 넓다. 다음 회차까지 후보를 2개로 좁혀 오기로 했다.',
              '로드맵 확정 후 비교과 2건 신청'),
    'general': ('희망 직무군과 현재 준비 상태를 점검했다.',
                '전공 연계 직무를 과소평가하고 있다. 선배 사례를 함께 봤다.',
                '직무 정보 탐색 과제'),
    'psych': ('학업 스트레스와 수면 문제를 다뤘다.',
              '호소 수준은 경도. 정기 상담으로 경과를 본다.',
              '2주 뒤 재방문'),
    'prof': ('전공 이수 계획과 졸업 요건을 점검했다.',
             '재수강 과목 배치가 4학년에 몰려 있다. 학기 분산을 권했다.',
             '다음 학기 수강 계획 재작성'),
}


def fill_counsel(conn) -> int:
    """상담 신청·이력·기록을 채운다.

    완료된 상담이 7 건뿐이라 명단의 「상담 N회」가 사실상 전부 0 이고, 그 값을 쓰는
    CORE 분류가 0 명이 된다. 상담이 없으면 로드맵도 생길 수 없다.

    담당범위(dc.staff_student_scope)는 만들지 않는다 — 진로·심리 상담사는
    org_assignment 로 이미 120 명 전원을 본다. 교수는 **학과가 맞는 교수만** 배정하고,
    맞는 교수가 없으면 그 학생의 교수상담을 건너뛴다. 배정을 지어내지 않는다.
    """
    students = conn.execute("""
        SELECT s.intg_uid, s.student_no, s.dept_code, s.college_code, p.name, s.major_label, s.grade,
               coalesce(s.detail->>'enrollmentStatus', s.roster->>'status', '재학') AS enrollment,
               t.student_type
          FROM dc.student s JOIN dc.person p ON p.intg_uid = s.intg_uid
          JOIN LATERAL (SELECT student_type FROM dc.student_type_event e
                         WHERE e.student_uid = s.intg_uid
                         ORDER BY decided_at DESC, id DESC LIMIT 1) t ON true
         ORDER BY s.student_no
    """).fetchall()
    careers = [r['intg_uid'] for r in conn.execute(
        "SELECT intg_uid FROM dc.staff WHERE role_code='career' ORDER BY intg_uid").fetchall()]
    psychs = [r['intg_uid'] for r in conn.execute(
        "SELECT intg_uid FROM dc.staff WHERE role_code='psych' ORDER BY intg_uid").fetchall()]
    written = 0
    for index, row in enumerate(students):
        number = str(row['student_no'])
        if not number[-1:].isdigit():
            continue
        digit = int(number[-1])
        for kind, digits, type_code, track, topic_code, topic, status in COUNSEL_PLAN:
            if digit not in digits:
                continue
            if kind == 'psych':
                counselor = psychs[index % len(psychs)]
            elif kind == 'prof':
                # 학과(org_assignment)로 붙이지 않는다 — 학생 120 명 중 117 명이
                # dept_code 가 비어 있어 어느 교수도 매칭되지 않는다. 앱이 실제로
                # 교수↔학생을 잇는 담당범위를 그대로 쓴다. 담당 교수가 없으면
                # 그 학생의 교수상담은 **만들지 않는다** — 배정을 지어내지 않는다.
                found = conn.execute("""SELECT c.staff_uid FROM dc.staff_student_scope c
                          JOIN dc.staff f ON f.intg_uid = c.staff_uid AND f.role_code = 'professor'
                         WHERE c.student_uid = %s ORDER BY c.staff_uid LIMIT 1""",
                                     (row['intg_uid'],)).fetchone()
                if not found:
                    continue
                counselor = found['staff_uid']
            else:
                counselor = careers[index % len(careers)]
            request_id = 'demo_cns_%s_%s' % (number, kind)
            snapshot = {'name': row['name'], 'studentNo': number, 'major': row['major_label'],
                        'grade': row['grade'], 'studentType': row['student_type'],
                        'enrollmentStatus': row['enrollment']}
            offset = 30 + (index % 60)
            done = status == 'DONE'
            inserted = conn.execute("""
                INSERT INTO dc.counsel_request(id,student_uid,counselor_uid,type_code,legacy_type,care_track,
                       status_code,method_code,topic,topic_code,requested_at,slot_date,slot_start,slot_end,
                       place,completed_at,snapshot,source_payload)
                VALUES(%s,%s,%s,%s,%s,%s,%s,'OFFLINE',%s,%s,
                       now()-make_interval(days=>%s), (now()-make_interval(days=>%s))::date,
                       '14:00','15:00','학생회관 상담실',
                       CASE WHEN %s THEN now()-make_interval(days=>%s) END,%s,%s)
                ON CONFLICT (id) DO NOTHING
            """, (request_id, row['intg_uid'], counselor, type_code, LEGACY_TYPE[type_code], track,
                  status, topic, topic_code, offset, offset - 7, done, offset - 7,
                  Jsonb(snapshot), Jsonb({'source': 'seed_demo'}))).rowcount
            if not inserted:
                continue
            written += inserted
            conn.execute("INSERT INTO dc.counsel_event(request_id,actor_uid,kind,payload) VALUES(%s,%s,'REQUESTED',%s)",
                         (request_id, row['intg_uid'], Jsonb({})))
            if status != 'REQ':
                conn.execute("INSERT INTO dc.counsel_event(request_id,actor_uid,kind,payload) VALUES(%s,%s,'CONFIRMED',%s)",
                             (request_id, counselor, Jsonb({})))
            if done:
                conn.execute("INSERT INTO dc.counsel_event(request_id,actor_uid,kind,payload) VALUES(%s,%s,'COMPLETED',%s)",
                             (request_id, counselor, Jsonb({})))
                summary, comment, follow_up = RECORD_TEXT[kind]
                conn.execute("""INSERT INTO dc.counsel_record(id,request_id,counselor_uid,summary,comment,
                                       follow_up,status_code,created_at,updated_at,snapshot)
                                VALUES(%s,%s,%s,%s,%s,%s,'DONE',now()-make_interval(days=>%s),
                                       now()-make_interval(days=>%s),%s)
                                ON CONFLICT (id) DO NOTHING""",
                             ('demo_rec_%s_%s' % (number, kind), request_id, counselor,
                              summary, comment, follow_up, offset - 7, offset - 7,
                              Jsonb({'source': 'seed_demo'})))
    return written


# 확정 로드맵의 3축 × 5칸. 축 코드와 라벨은 dc.code_item(ROADMAP_AXIS)을 따른다.
# 칸 내용은 시연용 계획 문안이다 — 판정식이 아니라 상담사가 쓸 자리를 채운 것이다.
ROADMAP_AXES = (
    ('IAP', 'IAP 실행 — 목표 직무로 가는 최短 경로', '진단 결과와 상담에서 확인한 결손을 실행 단위로 쪼갠다.', (
        ('목표 직무 요구역량 표 만들기', 'P0', 'REQUIRED'),
        ('부족 역량 2개 선정', 'P0', 'REQUIRED'),
        ('직무 관련 비교과 2건 수료', 'P1', 'IMPORTANT'),
        ('현직자 인터뷰 1회', 'P1', 'RECOMMENDED'),
        ('상반기 목표 재점검 상담', 'P1', 'IMPORTANT'))),
    ('CORE', '핵심역량 수행 — 전공을 직무 언어로 옮긴다', '전공 이수 내용을 직무에서 통하는 결과물로 바꾼다.', (
        ('전공 심화 과목 이수 계획 확정', 'P0', 'REQUIRED'),
        ('전공 프로젝트 결과물 1건', 'P0', 'REQUIRED'),
        ('직무 관련 자격 1개 취득', 'P1', 'IMPORTANT'),
        ('어학 목표 점수 달성', 'P1', 'IMPORTANT'),
        ('포트폴리오 초안 작성', 'P1', 'RECOMMENDED'))),
    ('GROWTH', '내 성장 활동 — 밖에서 증명한다', '학교 밖에서 통하는 경험을 쌓고 기록으로 남긴다.', (
        ('대외활동·공모전 1건 참여', 'P1', 'RECOMMENDED'),
        ('인턴 또는 현장실습 지원', 'P0', 'IMPORTANT'),
        ('성장일지 월 1회 작성', 'P1', 'RECOMMENDED'),
        ('직무 커뮤니티·스터디 참여', 'P1', 'RECOMMENDED'),
        ('자기소개서 초안 완성', 'P0', 'IMPORTANT'))),
)


def fill_roadmaps(conn) -> int:
    """상담을 근거로 확정 로드맵을 만든다.

    지금 로드맵이 2 건뿐이라 로드맵 이행률·변경요청·생성 대기열 화면이 사실상 비어 있다.

    ★ 목표 직무를 지어내지 않는다. dc.roadmap.target_role·target_company 는 NOT NULL 인데
      우리가 아는 것은 roster 가 이미 선언한 targetRole·targetCompanySummary 뿐이다.
      그것이 있는 학생에게만 만든다 — 없는 학생에게 목표를 붙이면 그건 데이터가 아니라
      창작이다. 그래서 대상이 120 명이 아니라 33 명이고, 그게 맞는 수다.

    basis_kind 는 LEGACY_IMPORT 가 아니라 COUNSEL 로 둔다. 실제로 완료된 CARE 7+ 상담을
    근거로 걸므로 「상담과 동시에 로드맵을 만든다」는 프로세스가 행으로 남는다.
    """
    candidates = conn.execute("""
        SELECT s.intg_uid, s.roster->>'targetRole' AS role,
               s.roster->>'targetCompanySummary' AS company, q.id AS request_id, q.completed_at
          FROM dc.student s
          JOIN LATERAL (SELECT id, completed_at FROM dc.counsel_request c
                         WHERE c.student_uid = s.intg_uid AND c.status_code = 'DONE'
                           AND c.care_track = 'care7'
                         ORDER BY c.completed_at DESC NULLS LAST LIMIT 1) q ON true
         WHERE s.roster ? 'targetRole' AND s.roster ? 'targetCompanySummary'
           AND NOT EXISTS (SELECT 1 FROM dc.roadmap r WHERE r.student_uid = s.intg_uid)
         ORDER BY s.student_no
    """).fetchall()
    written = 0
    for index, row in enumerate(candidates):
        name, _, role = (row['company'] or '').partition(' · ')
        company = {'name': name or row['company'], 'role': role or row['role'],
                   'summary': row['company']}
        # confirmed 는 status_code 에서 파생되는 생성 컬럼이라 넣지 않는다.
        conn.execute("""INSERT INTO dc.roadmap(student_uid,target_role,target_company,status_code,
                               basis_kind,counsel_request_id,confirmed_at,created_at,updated_at)
                        VALUES(%s,%s,%s,'CONFIRMED','COUNSEL',%s,%s,%s,%s)""",
                     (row['intg_uid'], row['role'], Jsonb(company), row['request_id'],
                      row['completed_at'], row['completed_at'], row['completed_at']))
        for axis, headline, rationale, cells in ROADMAP_AXES:
            conn.execute("""INSERT INTO dc.roadmap_axis(student_uid,axis,headline,rationale,editor_note)
                            VALUES(%s,%s,%s,%s,'')""", (row['intg_uid'], axis, headline, rationale))
            for position, (title, priority, importance) in enumerate(cells, start=1):
                # 앞쪽 칸부터 학생마다 다른 개수를 완료로 둔다 — 이행률이 전부 0% 나
                # 100% 면 이행률 화면에서 아무것도 구분되지 않는다.
                done = position <= (index % 4)
                conn.execute("""INSERT INTO dc.roadmap_item(student_uid,axis,id,position,title,priority,
                                       importance,why,status,origin_code,entry,
                                       completion_source_code,completed_at)
                                VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,'BASE','NONE',%s,%s)""",
                             (row['intg_uid'], axis, 'base-%s-%d' % (axis.lower(), position), position,
                              title, priority, importance, '상담에서 합의한 실행 항목',
                              'DONE' if done else 'TODO',
                              # 완료 근거는 상담사 확인이다. 비교과 수료로 닫힌 칸이 아니므로
                              # PROGRAM_OUTCOME 을 쓰지 않는다.
                              'MANUAL' if done else None,
                              row['completed_at'] if done else None))
        written += 1
    return written


# 종료된 비교과 프로그램. 지금 열려 있는 2 건은 모집중이라 수료가 나올 수 없다 —
# 「수료 N개」와 CORE 분류를 보려면 **이미 끝난** 회차가 있어야 한다.
DEMO_PROGRAMS = (
    ('demo_prog_101', '직무 포트폴리오 集中 캠프', 'EMPLOY', 30, ['T3', 'T4', 'T6'], 'REQUIRED'),
    ('demo_prog_102', '진로탐색 워크북 과정',      'CAREER', 40, ['T1', 'T2'],        'RECOMMEND'),
    ('demo_prog_103', 'TOEIC 집중반',              'LANGUAGE', 25, ['T1', 'T2', 'T3', 'T4'], 'RECOMMEND'),
    ('demo_prog_104', '정보처리기사 대비반',        'CERT',   25, ['T3', 'T4'],        'RECOMMEND'),
    ('demo_prog_105', '학습역량 회복 프로그램',      'ETC',    20, ['T5'],              'REQUIRED'),
    ('demo_prog_106', '우수인재 리더십 세미나',      'CAREER', 20, ['T6'],              'RECOMMEND'),
)


def fill_programs(conn) -> int:
    """종료된 비교과 회차와 신청·수료 결과를 채운다.

    수료한 비교과가 0 건이라 명단의 「비교과 N개」가 전원 0 이고, program_count>=3 을
    요구하는 CORE 분류가 **0 명**이 된다. 로드맵 칸을 닫는 것도 수료뿐이다.

    유형이 대상(care_types)에 들어 있는 학생만 신청한다 — 아무나 신청시키면
    편입 규칙과 어긋나 로드맵 자동 칸과 앞뒤가 안 맞는다.
    """
    written = 0
    for program_id, title, category, capacity, care_types, entry in DEMO_PROGRAMS:
        written += conn.execute("""
            INSERT INTO dc.program(id,title,summary,category_code,status_code,capacity,sessions,manager,
                   fiscal_year,location,pinned,roadmap_entry,care_types,satisfaction_survey,
                   competency_survey,competency_areas,include_in_stats,
                   apply_start,apply_end,run_start,run_end)
            VALUES(%s,%s,%s,%s,'ENDED',%s,3,'김진로',2026,'학생회관 세미나실',false,%s,%s,
                   true,true,'{}',true,
                   (now()-make_interval(days=>120))::date,(now()-make_interval(days=>100))::date,
                   (now()-make_interval(days=>90))::date,(now()-make_interval(days=>60))::date)
            ON CONFLICT (id) DO NOTHING
        """, (program_id, title, title + ' — 종료된 회차입니다.', category, capacity,
              entry, care_types)).rowcount
        # 대상 유형 학생을 학번 순으로 정원만큼 신청시킨다. 결정적이라 재실행해도 같다.
        conn.execute("""
            INSERT INTO dc.program_apply(program_id,student_uid,applied_at,snapshot,round_no,
                   selection_code,selected_at,attendance_code,outcome_code,absence_points)
            SELECT %s, x.intg_uid, now()-make_interval(days=>110),
                   jsonb_build_object('studentNo',x.student_no,'appliedAt',
                                      to_char(now()-make_interval(days=>110),'YYYY-MM-DD')),
                   1, 'SELECTED', now()-make_interval(days=>95),
                   CASE WHEN x.seat %% 7 = 0 THEN 'NO_SHOW' ELSE 'PRESENT' END,
                   CASE WHEN x.seat %% 7 = 0 THEN 'ABSENT'
                        WHEN x.seat %% 5 = 0 THEN 'NOT_COMPLETED' ELSE 'COMPLETED' END,
                   CASE WHEN x.seat %% 7 = 0 THEN 1 ELSE 0 END
              FROM (SELECT s.intg_uid, s.student_no,
                           row_number() OVER (ORDER BY s.student_no) AS seat
                      FROM dc.student s
                      JOIN LATERAL (SELECT student_type FROM dc.student_type_event e
                                     WHERE e.student_uid = s.intg_uid
                                     ORDER BY decided_at DESC, id DESC LIMIT 1) t ON true
                     WHERE t.student_type = ANY(%s)) x
             WHERE x.seat <= %s
             ON CONFLICT (program_id,student_uid) DO NOTHING
        """, (program_id, care_types, capacity))
    return written


STAGES = (('유형↔후속검사 모순 기록', record_type_conflicts),
          ('유형 확정 승격', confirm_types),
          ('상담 신청·이력·기록', fill_counsel),
          ('확정 로드맵 3축 15칸', fill_roadmaps),
          ('종료 비교과 회차·신청·수료', fill_programs))


def run() -> dict:
    # 컬럼을 이름으로 읽는다 — 위치로 읽으면 SELECT 순서를 바꿀 때 조용히 어긋난다.
    with psycopg.connect(**settings.connection_kwargs(), row_factory=dict_row) as conn:
        conn.execute('SELECT pg_advisory_xact_lock(480093)')
        guard(conn)
        return {label: stage(conn) for label, stage in STAGES}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Load demonstration data into a development database.')
    parser.add_argument('--yes', action='store_true', required=True, help='confirm this is a development database')
    parser.parse_args()
    print(json.dumps(run(), ensure_ascii=False))
