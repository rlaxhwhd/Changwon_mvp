"""Domain projections of the immutable fixture archive."""
from .seed import Array, insert


from .gates import COUNSEL_TYPE_CODE

def import_domains(conn, sources, aliases, details):
    def read(name):
        return sources[name]
    # 학생 fixture 는 상세 3명뿐이다(062 로스터 더미 퇴역). 다른 학생을 가리키는 시드 행은 조용히 건너뛰지 않고 센다.
    skipped = {}
    def uid_of(student_id, source):
        uid = aliases.get(str(student_id))
        if uid is None:
            skipped[source] = skipped.get(source, 0) + 1
        return uid
    staff = {}
    for college in read('src_v2/data/professors.seed.json'):
        for dept, professors in college['divisions'].items():
            for prof in professors:
                staff[prof['id']] = {**prof, 'role': 'professor', 'dept': dept, 'collegeName': college['name']}
    for path, row in sources.items():
        if any(path.startswith(f'src_admin/data/{folder}/') for folder in ('counselors','professors','assistants')):
            staff[row['id']] = {**staff.get(row['id'], {}), **row}
    staff_ids = {}
    for alias, row in staff.items():
        uid = str(row.get('empNo') or f'local:{alias}')
        staff_ids[alias] = uid
        insert(conn, 'person', dict(intg_uid=uid, alias=alias, name=row['name'], kind='STAFF',
               source='fixture' if row.get('empNo') else 'local', profile=row))
        insert(conn, 'staff', dict(intg_uid=uid, role_code=row['role'], profile=row))
    # The existing fixture explicitly models center-wide counselors with an empty
    # departments list. Keep that *test-only* grant explicit; never infer org codes
    # from Korean labels. Production grants must come from authoritative codes.
    for alias, row in staff.items():
        if row['role'] in ('career','psych') and row.get('departments') == []:
            for uid in set(aliases.values()):
                insert(conn,'fixture_student_scope',dict(staff_uid=staff_ids[alias],student_uid=uid,source='fixture:center-wide'))
    for assignment in read('src_admin/data/advisorAssigns.seed.json'):
        uid = uid_of(assignment['studentId'], 'advisorAssigns')
        if uid and assignment['status']=='active' and assignment['professorId'] in staff_ids:
            insert(conn,'fixture_student_scope',dict(staff_uid=staff_ids[assignment['professorId']],
                   student_uid=uid,source='fixture:advisor-assignment'))
    statuses = {'대기':'REQ','확정':'CONFIRMED','완료':'DONE','취소':'CANCEL_UNKNOWN'}
    request_ids = set()
    for student in details:
        uid = aliases[student['id']]
        for req in student.get('counselRequests', []):
            request_ids.add(req['id'])
            slot = req.get('slot') or {}
            assignee = req.get('assignedCounselorId') or req.get('assignedProfessorId') or req.get('professorId')
            if assignee:
                insert(conn,'fixture_student_scope',dict(staff_uid=staff_ids[assignee],student_uid=uid,source='fixture:counsel-assignment'))
            insert(conn, 'counsel_request', dict(id=req['id'], student_uid=uid,
                   counselor_uid=staff_ids[assignee] if assignee else None,
                   type_code=COUNSEL_TYPE_CODE[req['type']], legacy_type=req['type'],
                   care_track=req.get('careTrack', 'care7' if req['type']=='진로취업' else None),
                   status_code=statuses[req['status']], method_code='ONLINE' if req['method']=='비대면' else 'OFFLINE',
                   topic=req['topic'], requested_at=req['requestedAt'], slot_date=slot.get('date'),
                   slot_start=slot.get('start'), slot_end=slot.get('end'), place=slot.get('place'),
                   intake=req.get('intake'), completed_at=req.get('completedAt'), source_payload=req,
                   snapshot={k: student.get(k) for k in ('name','studentNo','major','grade','studentType','enrollmentStatus')}))
        if student.get('studentType'):
            insert(conn, 'student_type_event', dict(student_uid=uid, student_type=student['studentType'], source='fixture'))
    for row in read('src_admin/data/counselRecords.seed.json'):
        if row['requestId'] not in request_ids:
            skipped['counselRecords'] = skipped.get('counselRecords', 0) + 1
            continue
        insert(conn, 'counsel_record', dict(id=row['id'], request_id=row['requestId'], counselor_uid=staff_ids[row['counselorId']],
               summary=row['summary'], comment=row['comment'], follow_up=row['followUp'],
               status_code='DONE' if row['status']=='완료' else 'DRAFT', created_at=row['createdAt'], updated_at=row['updatedAt'], snapshot=row))
    for row in read('src_admin/data/diagnosisAttempts.seed.json'):
        if not uid_of(row['studentId'], 'diagnosisAttempts'):
            continue
        insert(conn, 'diagnosis_attempt', dict(id=row['id'], student_uid=aliases[row['studentId']],
               test_id=row['testId'], attempt_no=row['attemptNo'], status_code='DONE' if row['status']=='완료' else 'STARTED',
               started_at=row['startedAt'], completed_at=row.get('completedAt'), payload=row))
    for row in read('src_v2/data/diagnosisResults.seed.json'):
        if not uid_of(row['studentId'], 'diagnosisResults'):
            continue
        key=(aliases[row['studentId']],row['testId'],row['attemptNo'])
        if not conn.execute('SELECT 1 FROM dc.diagnosis_attempt WHERE student_uid=%s AND test_id=%s AND attempt_no=%s',key).fetchone():
            # diagnosisResults.ts explicitly describes precomputed outcomes.
            # Preserve them without claiming the student completed an attempt.
            insert(conn,'diagnosis_attempt',dict(id=f"import-result:{row['studentId']}:{row['testId']}:{row['attemptNo']}",
                   student_uid=key[0],test_id=key[1],attempt_no=key[2],status_code='PRECOMPUTED',
                   started_at=None,completed_at=None,source='fixture:outcome',
                   payload={'precomputed':True,'testedAt':row['testedAt']}))
            insert(conn,'import_issue',dict(source_path='src_v2/data/diagnosisResults.seed.json',
                   source_key=f"{row['studentId']}:{row['testId']}:{row['attemptNo']}",
                   code='PRECOMPUTED_RESULT',detail='Result template exists before an attempt; not exposed as a completed diagnosis.'))
        source=conn.execute('SELECT source FROM dc.diagnosis_attempt WHERE student_uid=%s AND test_id=%s AND attempt_no=%s',key).fetchone()[0]
        insert(conn, 'diagnosis_result', dict(student_uid=aliases[row['studentId']], test_id=row['testId'],
               attempt_no=row['attemptNo'], tested_at=row['testedAt'], payload=row,source=source))
    # Fixture labels are translated to codes here; the database stores codes only.
    category_code = {'진로':'CAREER','취업':'EMPLOY','어학':'LANGUAGE',
                     '창업':'STARTUP','자격증':'CERT','기타':'ETC'}
    status_code = {'모집중':'RECRUITING','모집마감':'CLOSED','종료':'ENDED'}
    selection_code = {'대기':'PENDING','선발':'SELECTED','탈락':'REJECTED','취소':'CANCELLED'}
    attendance_code = {'미확인':'UNKNOWN','출석':'PRESENT','노쇼':'NO_SHOW'}
    for row in read('src_admin/data/programs.seed.json'):
        insert(conn, 'program', dict(id=row['id'], title=row['title'], capacity=row['capacity'],
               summary=row.get('desc',''), detail=row.get('detail'),
               category_code=category_code[row['category']], status_code=status_code[row['status']],
               apply_start=row.get('startDate') or None, apply_end=row.get('endDate') or None,
               run_start=row.get('runStartDate') or None, run_end=row.get('runEndDate') or None,
               sessions=row.get('sessions', 1), manager=row.get('manager', ''),
               fiscal_year=row.get('fiscalYear', ''), location=row.get('location', ''),
               image=row.get('image'), pinned=row.get('pinned', False),
               roadmap_entry=row.get('roadmapEntry', 'NONE'), care_types=Array(row.get('careTypes') or []),
               satisfaction_survey=row.get('satisfactionSurvey', False),
               satisfaction_form_id=row.get('satisfactionFormId'),
               competency_survey=row.get('competencySurvey', False),
               competency_areas=Array(row.get('competencyAreas') or []),
               include_in_stats=row.get('includeInStats', True), created_at=row['createdAt']))
        for applicant in row.get('applicants', []):
            if not uid_of(applicant['studentId'], 'programs.applicants'):
                continue
            selection = selection_code[applicant.get('selectionStatus', '대기')]
            insert(conn, 'program_apply', dict(program_id=row['id'], student_uid=aliases[applicant['studentId']],
                   applied_at=applicant['appliedAt'], snapshot=applicant,
                   round_no=applicant.get('round', 1), selection_code=selection,
                   selected_at=applicant.get('selectedAt') or (applicant['appliedAt'] if selection == 'SELECTED' else None),
                   attendance_code=attendance_code[applicant.get('attendance', '미확인')],
                   cancelled_at=applicant.get('canceledAt') or None))
    # Penalties recorded on the fixture become history rows; the migration backfills
    # an already-imported database, this covers a fresh one.
    penalty_kind = {'noshow':'NOSHOW','waive':'WAIVE','manual':'MANUAL'}
    for student in details:
        for entry in student.get('penaltyEntries') or []:
            if not entry.get('points'):
                continue
            insert(conn, 'penalty_entry', dict(student_uid=aliases[student['id']],
                   kind=penalty_kind.get(entry.get('kind'), 'MANUAL'), points=entry['points'],
                   reason=entry.get('reason', ''), program_id=entry.get('programId'),
                   program_title=entry.get('programTitle'), source='import',
                   created_at=entry.get('at')))
    # 계획의 상태는 3값이다(024) — confirmed 는 status_code 의 생성열이라 직접 넣을 수 없다.
    # 시드 계획에는 상담 근거가 없다. 최근 상담을 임의로 붙이지 않고 LEGACY_IMPORT 로 둔다.
    importance_code = {'필수':'REQUIRED','중요':'IMPORTANT','권장':'RECOMMENDED'}
    for student in details:
        if not student.get('roadmapAxes'):
            continue
        uid = aliases[student['id']]
        insert(conn, 'roadmap', dict(student_uid=uid, target_role=student['targetRole'],
               target_company=student['targetCompany'], status_code='CONFIRMED', basis_kind='LEGACY_IMPORT'))
        for axis in student['roadmapAxes']:
            insert(conn, 'roadmap_axis', dict(student_uid=uid, axis=axis['axis'], headline=axis['headline'], rationale=axis['rationale']))
            # position 은 축마다 1~5 다. 자동 편입 칸이 6 이상을 쓰므로 0 부터 세면 겹친다.
            for position, item in enumerate(axis['cells'], start=1):
                insert(conn, 'roadmap_item', dict(student_uid=uid, axis=axis['axis'], id=item['id'], position=position,
                       title=item['title'], priority=item['priority'],
                       importance=importance_code[item['importance']], why=item.get('why',''),
                       status=item['status'], origin_code='BASE',
                       # 이관분의 완료 시각·근거는 모른다. 시각을 지어내지 않는다.
                       completion_source_code='LEGACY' if item['status']=='DONE' else None,
                       program_id=item.get('programId'), entry=item.get('entry','NONE'), expires_at=item.get('expiresAt')),
                       conflict=('student_uid','id'))
    # 화면의 '반영완료' 와 옛 '승인' 을 같은 코드로 모은다 — DB 는 코드만 저장한다.
    request_status = {'대기':'REQ','승인':'APPLIED','반영완료':'APPLIED','반려':'REJECTED'}
    for row in read('src_admin/data/roadmapRequests.seed.json'):
        if not uid_of(row['studentId'], 'roadmapRequests'):
            continue
        status = request_status.get(row['status'], row['status'])
        insert(conn, 'roadmap_request', dict(id=row['id'], student_uid=aliases[row['studentId']], axis=row['axis'],
               title=row['title'], reason=row['reason'], status_code=status,
               requested_at=row['requestedAt'], payload=row,
               handled_at=(row.get('handledAt') or row['requestedAt']) if status != 'REQ' else None))
    return skipped
