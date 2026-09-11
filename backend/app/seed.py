"""Import repository fixtures once without overwriting subsequent user edits.

The immutable source archive is an audit record, not a runtime API data source.
"""
import argparse
import hashlib
import json
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.types.json import Jsonb

from .settings import settings


class Array(list):
    """A list bound for a PostgreSQL array column rather than jsonb."""


def insert(conn, table: str, values: dict, conflict: tuple[str, ...] = ()) -> None:
    # 중재자를 지정하지 않는 ON CONFLICT 는 DEFERRABLE 유니크가 걸린 표에서 계획 단계에서 죽는다
    # (dc.roadmap_item 의 정렬 유니크). 그런 표에는 PK 를 명시적으로 넘긴다.
    target = sql.SQL('({})').format(sql.SQL(',').join(map(sql.Identifier, conflict))) if conflict else sql.SQL('')
    query = sql.SQL('INSERT INTO dc.{} ({}) VALUES ({}) ON CONFLICT {} DO NOTHING').format(
        sql.Identifier(table), sql.SQL(',').join(map(sql.Identifier, values)),
        sql.SQL(',').join(sql.Placeholder() for _ in values), target)
    conn.execute(query, tuple(Jsonb(v) if isinstance(v, (dict, list)) and not isinstance(v, Array) else v
                              for v in values.values()))


def seed(root: Path) -> dict:
    sources = {}
    checksums = {}
    source_roots = (
        ('backend/seeds/v2', 'src_v2/data'),
        ('backend/seeds/admin', 'src_admin/data'),
        ('src_v2/data', 'src_v2/data'),
        ('src_admin/data', 'src_admin/data'),
    )
    for directory, legacy_prefix in source_roots:
        physical_root = root / directory
        for path in sorted(physical_root.rglob('*.json')):
            relative = f'{legacy_prefix}/{path.relative_to(physical_root).as_posix()}'
            raw = path.read_bytes()
            sources[relative] = json.loads(raw.decode('utf-8-sig'))
            checksums[relative] = hashlib.sha256(raw).hexdigest()
    def read(path):
        return sources[path]
    def academic(name):
        return read(f'src_v2/data/academic/{name}.json')
    with psycopg.connect(**settings.connection_kwargs()) as conn:
        conn.execute('SELECT pg_advisory_xact_lock(480092)')
        existing = dict(conn.execute('SELECT path,checksum FROM dc.seed_source').fetchall())
        changed = [p for p in existing if p in checksums and existing[p] != checksums[p]]
        if changed:
            raise RuntimeError('Seed changed after import; explicit data migration required: ' + ', '.join(changed))
        if existing:
            missing = set(sources) - set(existing)
            if missing:
                raise RuntimeError('New seed files require an explicit incremental migration: ' + ', '.join(sorted(missing)))
            return {'status': 'already_imported', 'sourceFiles': len(existing)}
        for path, payload in sources.items():
            insert(conn, 'seed_source', dict(path=path, checksum=checksums[path], payload=payload))
        departments = read('src_admin/data/departments.seed.json')
        for d in departments:
            insert(conn, 'department', dict(college_code=d['collegeCode'], dept_code=d['deptCode'],
                   college_name=d['collegeName'], dept_name=d['deptName'], course=d['course']))
        roster = {str(s['studentNo']): s for s in read('src_v2/data/studentsRoster.json')}
        details = [read(f'src_v2/data/students/{name}.json') for name in ('chaewon', 'changwon', 'jiwoo')]
        counsel = read('src_v2/data/students/counselSeedStudents.json')
        detail_by_no = {str(s.get('studentNo', s['id'])): s for s in details + counsel}
        aliases = {}
        for number in sorted(set(roster) | set(detail_by_no)):
            base = roster.get(number, {})
            detail = detail_by_no.get(number)
            merged = {**base, **(detail or {})}
            alias = str(merged['id'])
            aliases[alias] = number
            aliases[number] = number
            if base:
                aliases[str(base['id'])] = number
            insert(conn, 'person', dict(intg_uid=number, alias=alias, name=merged['name'], kind='STUDENT', source='fixture', profile={}))
            insert(conn, 'student', dict(intg_uid=number, student_no=number, major_label=merged['major'],
                   grade=merged.get('grade'), roster=base or merged, detail=detail))
        for name, table, mapping in (
            ('skills', 'skill', {'skillId':'skill_id','label':'label','category':'category','icon':'icon'}),
            ('subjects', 'subject', {'curiNum':'curi_num','curiNm':'curi_nm','cdtNum':'cdt_num','openDeptCd':'open_dept_cd','gradDiv':'grad_div','active':'active'}),
            ('curriculum', 'curriculum', {'id':'id','deptCode':'dept_code','curriYear':'curri_year','curiNum':'curi_num','courseCls':'course_cls','recGrade':'rec_grade','recSmt':'rec_smt','required':'required'}),
            ('courseSkills', 'course_skill', {'curiNum':'curi_num','skillId':'skill_id','weight':'weight','source':'source'}),
            ('certs', 'cert', {'certId':'cert_id','label':'label','issuer':'issuer','kind':'kind','icon':'icon','active':'active'}),
            ('jobRoles', 'job_role', {'jobId':'job_id','label':'label','category':'category','icon':'icon','summary':'summary','whatToDo':'what_to_do','targetOrgs':'target_orgs'}),
        ):
            for row in academic(name):
                insert(conn, table, {db: row[key] for key, db in mapping.items()})
        for row in academic('certs'):
            for skill in row['skillIds']:
                insert(conn, 'cert_skill', dict(cert_id=row['certId'], skill_id=skill))
        for row in academic('jobRoles'):
            for skill in row['skills']:
                insert(conn, 'job_skill', dict(job_id=row['jobId'], skill_id=skill['skillId'], weight=skill['weight'], required=skill['required']))
        for row in academic('enrollments'):
            insert(conn, 'student_course', dict(intg_uid=aliases[row['studentId']], year=row['year'], smt=row['smt'],
                   curi_num=row['curiNum'], course_cls=row['courseCls'], grade=row['grade'], gpa=row['gpa'],
                   finish_yn=row['finishYn'], chk_recuri=row['chkRecuri']))
        for row in academic('studentAcademic'):
            uid = aliases[row['studentId']]
            matches = [d for d in departments if d['deptCode'] == row['deptCode']]
            if len(matches) != 1:
                raise ValueError(f'Ambiguous explicit academic department: {row["deptCode"]}')
            conn.execute('UPDATE dc.student SET dept_code=%s,college_code=%s,entry_year=%s WHERE intg_uid=%s',
                         (row['deptCode'], matches[0]['collegeCode'], row['entryYear'], uid))
            for cert in row['certs']:
                insert(conn, 'student_cert', dict(intg_uid=uid, cert_id=cert['certId'], acquired_dt=cert['acquiredDt'],
                       cert_no=cert['certNo'], verified=cert['verified'], added=False))
            for job in row['jobInterests']:
                insert(conn, 'student_job_interest', dict(intg_uid=uid, job_id=job['jobId'], pinned=job['pinned'], added=False))
            for program in row['programRecords']:
                insert(conn, 'student_program_history', dict(intg_uid=uid, program_id=program['programId'], title=program['title'],
                       applied_at=program['appliedAt'], completed=program['completed']))
        from .seed_domains import import_domains
        import_domains(conn, sources, aliases, details)
        codes=json.loads((root/'backend/seeds/process-codes.json').read_text(encoding='utf8'))
        for row in codes['studentTypes']:
            insert(conn,'student_type_rule',dict(code=row['code'],label=row['label'],tier=row['tier'],tier_label=row['tierLabel'],
                   follow_up_test=row['followUpTest'],program_scope=row['programScope'],payload=row))
        for row in read('src_v2/data/starTrack.seed.json')['tracks']:
            insert(conn,'star_track',dict(student_uid=aliases[row['studentId']],payload=row))
        conn.execute((Path(__file__).resolve().parents[1] / 'migrations/013_organization_seed.sql').read_text(encoding='utf-8'))
        # 시드 뒤에야 성립하는 파생분. 마이그레이션은 시드보다 먼저 돌아 학생이 없으므로
        # 신규 DB 에서는 0건으로 지나간다 — 여기서 같은 파일을 다시 돌려 채운다.
        # 모두 멱등(존재 검사 + ON CONFLICT DO NOTHING)이라 기존 DB 에서 다시 돌아도 안전하다.
        for derived in ('020_ai_artifact_backfill.sql', '021_ai_resume_review.sql', '023_job_seed.sql',
                        '026_roadmap_growth_backfill.sql', '028_followup_diagnosis_scores.sql'):
            conn.execute((Path(__file__).resolve().parents[1] / 'migrations' / derived).read_text(encoding='utf-8'))
        for derived in ('034_diagnosis_factor_backfill.sql','038_counsel_fixture_backfill.sql',
                        '043_student_department_backfill.sql','046_advisor_assignment_backfill.sql','048_main_popup_seed.sql','050_prof_counsel_record_backfill.sql'):
            conn.execute((Path(__file__).resolve().parents[1] / 'migrations' / derived).read_text(encoding='utf-8'))
        from .seed_operations import seed_notices
        seed_notices(conn)
        return {'status': 'imported', 'sourceFiles': len(sources), 'students': len(set(aliases.values()))}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2])
    args = parser.parse_args()
    print(json.dumps(seed(args.root), ensure_ascii=False))
