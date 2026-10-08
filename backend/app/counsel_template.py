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
    aiJournal: str = Field('', max_length=20000)
    aiJournalRunId: str | None = Field(None, max_length=100)
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
    if not is_care7_request(request) and template.finalType:
        raise HTTPException(422, '상담유형은 CARE 7+ 상담에서만 변경할 수 있습니다.')


def validate_completed_template(request, template, *, comment, type_locked=False):
    if request['legacy_type'] == '진로취업' and not comment.strip():
        raise HTTPException(422, '학생 공개 코멘트를 입력해 주세요.')
    if template is None:
        if is_care7_request(request):
            raise HTTPException(422, '정성진단을 포함한 상담 템플릿을 작성해 주세요.')
        return
    if any(value is None for value in template.qualitative.model_dump().values()):
        raise HTTPException(422, '정성진단 5개 항목을 모두 선택해 주세요.')
    if is_care7_request(request) and not type_locked and not template.finalType:
        raise HTTPException(422, '상담 후 최종 유형을 선택해 주세요.')
    sections=[section for section in (template.program,template.application) if section.selected]
    if not sections or any(not section.content.strip() for section in sections):
        raise HTTPException(422, '상담내용을 한 가지 이상 선택하고 선택한 항목의 내용을 모두 입력해 주세요.')


def journal_input(template):
    data = template.storage()
    return {key: data.get(key) for key in ('channel', 'conductedAt', 'finalType', 'qualitative', 'program', 'application')}


def journal_type(conn, request, template):
    if template.finalType:
        return template.finalType
    row = conn.execute('SELECT student_type FROM dc.current_student_type WHERE student_uid=%s ORDER BY decided_at DESC,id DESC LIMIT 1',
                       (request['student_uid'],)).fetchone()
    return row['student_type'] if row else None


def validate_ai_journal(conn, request, template):
    if request['legacy_type'] != '진로취업':
        return
    if not template or not template.aiJournal.strip() or not template.aiJournalRunId:
        raise HTTPException(422, '현재 입력으로 AI 상담일지를 생성한 뒤 저장해 주세요.')
    from .ai_comments import context_hash
    row = conn.execute('''SELECT input_snapshot FROM dc.ai_run WHERE id=%s
      AND student_uid=%s AND subject_kind='COUNSEL_JOURNAL' AND subject_id=%s''',
      (template.aiJournalRunId, request['student_uid'], request['id'])).fetchone()
    if not row or context_hash(row['input_snapshot']['template']) != context_hash(journal_input(template)):
        raise HTTPException(422, '상담 입력이 변경되었습니다. AI 상담일지를 다시 생성해 주세요.')
    if row['input_snapshot'].get('diagnosisType') != journal_type(conn, request, template):
        raise HTTPException(422, '진단유형이 변경되었습니다. AI 상담일지를 다시 생성해 주세요.')
