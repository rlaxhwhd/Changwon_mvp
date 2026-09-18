"""Versioned counseling form contract, shared by draft and completion routes."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from fastapi import HTTPException

from .gates import is_care7_request


class TemplateSection(BaseModel):
    model_config = ConfigDict(extra='forbid')
    selected: bool = False
    content: str = Field('', max_length=9000)


class QualitativeDiagnosis(BaseModel):
    model_config = ConfigDict(extra='forbid')
    motivation: Literal['상', '중', '하'] | None = None
    employmentWill: Literal['상', '중', '하'] | None = None
    feasibility: Literal['상', '중', '하'] | None = None
    communication: Literal['상', '중', '하'] | None = None
    selfUnderstanding: Literal['상', '중', '하'] | None = None


class CounselTemplate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    schemaVersion: Literal[1] = 1
    channel: Literal['대면', '전화', '화상', '이메일'] | None = None
    conductedAt: str = Field('', max_length=16)
    finalType: Literal['T1', 'T2', 'T3', 'T4', 'T5', 'T6'] | None = None
    qualitative: QualitativeDiagnosis = Field(default_factory=QualitativeDiagnosis)
    program: TemplateSection = Field(default_factory=TemplateSection)
    application: TemplateSection = Field(default_factory=TemplateSection)
    # AI is intentionally unavailable. Do not accept fabricated AI output.
    aiJournal: Literal[''] = ''
    # Server-owned preserved text when an older journal first adopts this form.
    legacySummary: str = Field('',max_length=20000)

    @field_validator('conductedAt')
    @classmethod
    def valid_local_time(cls, value):
        if value:
            parsed = datetime.fromisoformat(value)
            if parsed.tzinfo or parsed.isoformat(timespec='minutes') != value:
                raise ValueError('상담 일시는 한국 시간 YYYY-MM-DDTHH:mm 형식으로 입력해 주세요.')
        return value

    def content(self):
        return '\n\n'.join(
            label + '\n' + section.content.strip()
            for label, section in [('프로그램 현황 체크', self.program), ('입사지원 현황 체크', self.application)]
            if section.selected
        )

    def storage(self):
        data = self.model_dump(exclude_none=True)
        # Unchecked sections can retain text in the editor, never in a submitted record.
        for key in ('program', 'application'):
            if not data[key]['selected']:
                data[key]['content'] = ''
        return data


def template_storage(template, existing=None):
    if template is None:
        return None
    data=template.storage()
    old=(existing or {}).get('template')
    data['legacySummary']=(old.get('legacySummary','') if old else (existing or {}).get('summary',''))
    return data


def validate_template_scope(request, template):
    if template is None:
        return
    if request['legacy_type'] != '진로취업':
        raise HTTPException(422, '이 템플릿은 진로취업상담에서 사용합니다.')
    if not is_care7_request(request) and (template.finalType or template.qualitative.model_dump(exclude_none=True)):
        raise HTTPException(422, '상담유형과 정성진단은 CARE 7+ 상담에서만 입력할 수 있습니다.')


def validate_completed_template(request, template, *, comment, type_locked=False):
    if request['legacy_type'] == '진로취업' and not comment.strip():
        raise HTTPException(422, '학생 공개 코멘트를 입력해 주세요.')
    if template is None:
        if is_care7_request(request):
            raise HTTPException(422, '정성진단을 포함한 상담 템플릿을 작성해 주세요.')
        return
    if is_care7_request(request) and any(value is None for value in template.qualitative.model_dump().values()):
        raise HTTPException(422, '정성진단 5개 항목을 모두 선택해 주세요.')
    if is_care7_request(request) and not type_locked and not template.finalType:
        raise HTTPException(422, '상담 후 최종 유형을 선택해 주세요.')
    sections=[section for section in (template.program,template.application) if section.selected]
    if not sections or any(not section.content.strip() for section in sections):
        raise HTTPException(422, '상담내용을 한 가지 이상 선택하고 선택한 항목의 내용을 모두 입력해 주세요.')
