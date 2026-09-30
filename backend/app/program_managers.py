"""Program manager identities and application notifications in the program transaction."""
from fastapi import HTTPException


def managers_of(conn, program_ids):
    """One batch lookup for a catalog page; no per-program queries."""
    grouped = {program_id: [] for program_id in program_ids}
    if grouped:
        for row in conn.execute('''SELECT m.program_id,m.staff_uid,p.alias,p.name
          FROM dc.program_manager m JOIN dc.person p ON p.intg_uid=m.staff_uid
          WHERE m.program_id=ANY(%s) ORDER BY m.program_id,m.position''', (list(grouped),)).fetchall():
            grouped[row['program_id']].append(row)
    return grouped


def resolve_managers(conn, body, before=None):
    if body.managerIds is None:
        if before and body.manager == before['manager']:
            return managers_of(conn, [before['id']])[before['id']]
        # Compatibility for old clients: never guess when names collide.
        rows = conn.execute('''SELECT s.intg_uid AS staff_uid,p.alias,p.name
          FROM dc.staff s JOIN dc.person p USING(intg_uid) WHERE p.name=%s''', (body.manager,)).fetchall()
        if len(rows) > 1:
            raise HTTPException(422, '동명이인 담당자가 있습니다. 담당자를 목록에서 다시 선택해 주세요.')
        return rows
    if not body.managerIds:
        if before and body.manager == before['manager'] and not managers_of(conn, [before['id']])[before['id']]:
            return []  # Preserve an unmapped legacy name on unrelated updates.
        raise HTTPException(422, '프로그램 담당자를 한 명 이상 선택해 주세요.')
    rows = conn.execute('''SELECT s.intg_uid AS staff_uid,p.alias,p.name
      FROM dc.staff s JOIN dc.person p USING(intg_uid) WHERE p.alias=ANY(%s)''', (body.managerIds,)).fetchall()
    by_id = {row['alias']: row for row in rows}
    if len(set(body.managerIds)) != len(body.managerIds) or set(body.managerIds) != set(by_id):
        raise HTTPException(422, '중복 없이 등록된 교직원을 담당자로 선택해 주세요.')
    return [by_id[identity] for identity in body.managerIds]


def sync_managers(conn, program_id, managers):
    # create/update/apply all hold the same program row lock.
    conn.execute('DELETE FROM dc.program_manager WHERE program_id=%s', (program_id,))
    if managers:
        conn.cursor().executemany('INSERT INTO dc.program_manager(program_id,staff_uid,position) VALUES(%s,%s,%s)',
                                 [(program_id, row['staff_uid'], index) for index, row in enumerate(managers)])


def notify_application(conn, program, student):
    """All assigned managers, once per student/program. No creator or global staff fallback."""
    conn.execute('''INSERT INTO dc.notification(recipient_uid,source_kind,source_id,tone,title,body,route)
      SELECT m.staff_uid,'PROGRAM_APPLICATION',%s,'program',%s,%s,%s
      FROM dc.program_manager m WHERE m.program_id=%s
      ON CONFLICT(recipient_uid,source_kind,source_id) DO NOTHING''',
      (f"{program['id']}:{student['intg_uid']}", f"[{program['title']}] 새 비교과 신청",
       f"{student['name']} 학생이 비교과 프로그램을 신청했습니다.",
       f"/programs/{program['id']}/applicants", program['id']))
