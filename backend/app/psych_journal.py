"""심리상담 상담일지 양식([붙임 14]) — 임시저장·완료·일지 수정이 같은 계약을 쓴다."""
from datetime import datetime
from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator


class PsychJournal(BaseModel):
    model_config = ConfigDict(extra='forbid')
    schemaVersion: Literal[1] = 1
    session: int | None = Field(None, ge=1, le=99)
    conductedAt: str = Field('', max_length=16)
    method: Literal['대면', '전화', 'ZOOM', '기타'] | None = None
    methodOther: str = Field('', max_length=100)
    remoteReason: str = Field('', max_length=2000)
    content: str = Field('', max_length=20000)
    crisis: str = Field('', max_length=5000)
    remarks: str = Field('', max_length=5000)
    nextAt: str = Field('', max_length=16)

    @field_validator('conductedAt', 'nextAt')
    @classmethod
    def valid_local_time(cls, value):
        if value:
            parsed = datetime.fromisoformat(value)
            if parsed.tzinfo or parsed.isoformat(timespec='minutes') != value:
                raise ValueError('일시는 한국 시간 YYYY-MM-DDTHH:mm 형식으로 입력해 주세요.')
        return value

    def storage(self):
        data = self.model_dump(exclude_none=True)
        # 고르지 않은 방법의 입력은 제출 기록에 남기지 않는다.
        if self.method != '기타':
            data['methodOther'] = ''
        if self.method in (None, '대면'):
            data['remoteReason'] = ''
        return data


def validate_psych_scope(request, journal):
    if journal is not None and request['legacy_type'] != '심리':
        raise HTTPException(422, '이 상담일지 양식은 심리상담에서 사용합니다.')


def validate_completed_psych(request, journal):
    if request['legacy_type'] != '심리':
        return
    if journal is None:
        raise HTTPException(422, '상담일지 양식을 작성해 주세요.')
    missing = [label for label, ok in (
        ('회기', journal.session), ('상담일시', journal.conductedAt), ('상담방법', journal.method),
        ('상담내용', journal.content.strip()),
    ) if not ok]
    if journal.method == '기타' and not journal.methodOther.strip():
        missing.append('기타 상담방법')
    if journal.method not in (None, '대면') and not journal.remoteReason.strip():
        missing.append('비대면 진행사유')
    if missing:
        raise HTTPException(422, f"{'·'.join(missing)}을(를) 입력해 주세요.")


def psych_storage(journal):
    return journal.storage() if journal else None
