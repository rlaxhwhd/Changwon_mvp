from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Header

from .academic import router as academic_router
from .student_login import router as student_login_router
from .academic_directory import router as academic_directory_router
from .students import router as students_router
from .counsel import router as counsel_router
from .counsel_records import router as record_router
from .psych_tests import router as psych_tests_router
from .administration import router as administration_router
from .metadata import router as metadata_router
from .diagnosis import router as diagnosis_router
from .programs import router as programs_router
from .jobs import router as jobs_router
from .roadmap import router as roadmap_router
from .growth import router as growth_router
from .counsel_operations import router as counsel_operations_router
from .communications import router as communications_router
from .staff import router as staff_router
from .advisor_assignments import router as advisor_assignments_router
from .db import pool
from .settings import settings
from .auth import validate_development_token
from .db import connection


@asynccontextmanager
async def lifespan(app):
    if settings.environment != 'development' or not settings.development_identity:
        raise RuntimeError('Production authentication is not configured; deployment is restricted to SSH development access.')
    if not settings.development_token_file or not Path(settings.development_token_file).is_file():
        raise RuntimeError('DC_DEVELOPMENT_TOKEN_FILE is required.')
    pool.open(wait=True)
    try:
        yield
    finally:
        pool.close()


app = FastAPI(title='DREAMCATCH API', version='1.0.0', lifespan=lifespan)
app.include_router(academic_router, prefix='/api/v1')
app.include_router(student_login_router, prefix='/api/v1')
app.include_router(academic_directory_router, prefix='/api/v1')
app.include_router(students_router, prefix='/api/v1')
app.include_router(counsel_router, prefix='/api/v1')
app.include_router(record_router, prefix='/api/v1')
app.include_router(psych_tests_router, prefix='/api/v1')
app.include_router(administration_router, prefix='/api/v1')
app.include_router(metadata_router, prefix='/api/v1')
app.include_router(diagnosis_router, prefix='/api/v1')
app.include_router(programs_router, prefix='/api/v1')
app.include_router(jobs_router, prefix='/api/v1')
app.include_router(roadmap_router, prefix='/api/v1')
app.include_router(growth_router, prefix='/api/v1')
app.include_router(counsel_operations_router, prefix='/api/v1')
app.include_router(communications_router, prefix='/api/v1')
app.include_router(staff_router, prefix='/api/v1')
app.include_router(advisor_assignments_router, prefix='/api/v1')


@app.get('/api/v1/health')
def health():
    with pool.connection() as conn:
        conn.execute('SELECT 1')
    return {'status':'ok','storage':'postgresql'}


@app.get('/api/v1/development/identities')
def development_identities(x_dc_token:str=Header(default=''),conn=Depends(connection,scope='function')):
    validate_development_token(x_dc_token)
    students=conn.execute("SELECT p.alias AS id,p.name,s.major_label AS major,s.grade FROM dc.person p JOIN dc.student s USING(intg_uid) WHERE p.source='fixture' AND s.detail ? 'phases' ORDER BY p.alias").fetchall()
    staff=conn.execute("SELECT p.alias AS id,p.name,s.role_code AS role,s.profile FROM dc.staff s JOIN dc.person p USING(intg_uid) WHERE s.profile ? 'roleLabel' ORDER BY s.profile->>'empNo' NULLS LAST,p.alias").fetchall()
    return {'students':students,'staff':[{**x['profile'],'id':x['id'],'name':x['name'],'role':x['role']} for x in staff]}
