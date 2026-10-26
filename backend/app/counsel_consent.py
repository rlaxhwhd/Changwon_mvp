"""상담 신청 동의서 기록(146) — 학생 신청과 한 트랜잭션에 남긴다.

동의서 원문은 화면(src_v2/components/CounselConsentModal.tsx)이 버전별로 소유한다. 문구를 바꾸면
양쪽 FORMS 의 version 을 함께 올린다 — 서버는 아는 버전·항목에 모두 「예」인 동의만 받는다.
"""
from typing import Literal

from fastapi import HTTPException
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field

FORMS = {
    # 취업전략센터 상담 동의서 — 진로취업·교수 상담
    'CAREER': {'version': '2026-10-26', 'items': ('privacy', 'uid', 'notice')},
    # 학생상담센터 [붙임 9] 상담 및 개인정보 수집·이용 동의서 — 심리상담·심리검사
    'PSYCH': {'version': '2026-10-26', 'items': ('privacy', 'outsourcing', 'rules')},
}


class Consent(BaseModel):
    model_config = ConfigDict(extra='forbid')
    form: Literal['CAREER', 'PSYCH']
    version: str = Field(min_length=1, max_length=40)
    answers: dict[str, Literal['yes', 'no']]
    signature: str = Field(min_length=1, max_length=100)


def form_for(counsel_type):
    return 'PSYCH' if counsel_type == '심리' else 'CAREER'


def validate_consent(counsel_type, consent):
    if consent is None:
        raise HTTPException(422, '상담 신청 동의서에 동의해 주세요.')
    form = FORMS[consent.form]
    if consent.form != form_for(counsel_type):
        raise HTTPException(422, '상담 종류에 맞는 동의서가 아닙니다.')
    if consent.version != form['version']:
        raise HTTPException(409, '동의서가 바뀌었습니다. 새로고침한 뒤 다시 동의해 주세요.')
    if set(consent.answers) != set(form['items']) or any(v != 'yes' for v in consent.answers.values()):
        raise HTTPException(422, '모든 동의 항목에 「예」로 응답해 주세요.')
    if not consent.signature.strip():
        raise HTTPException(422, '서명을 입력해 주세요.')


def store_consent(conn, request_id, student_uid, consent):
    conn.execute('''INSERT INTO dc.counsel_consent(request_id,student_uid,form_code,form_version,answers,signature)
      VALUES (%s,%s,%s,%s,%s,%s)''',
      (request_id, student_uid, consent.form, consent.version, Jsonb(consent.answers), consent.signature.strip()))
