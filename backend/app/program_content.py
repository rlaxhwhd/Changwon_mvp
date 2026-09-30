"""Program application questions and files; reuse the shared upload validation/storage."""
from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator

from . import files


class ApplicationQuestion(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    id: str = Field(min_length=1, max_length=80, pattern=r'^[a-zA-Z0-9_-]+$')
    type: Literal['SINGLE', 'MULTIPLE', 'TEXT', 'CONSENT', 'FILE']
    question: str = Field(min_length=1, max_length=500)
    required: bool = False
    options: list[str] = Field(default_factory=list, max_length=30)
    content: str = Field(default='', max_length=10000)
    maxFiles: int = Field(default=1, ge=1, le=5)

    @model_validator(mode='after')
    def choices(self):
        self.options = [option.strip() for option in self.options]
        if self.type in ('SINGLE', 'MULTIPLE') and (
                not self.options or any(not x or len(x) > 300 for x in self.options)
                or len(set(self.options)) != len(self.options)):
            raise ValueError('객관식 질문에는 중복되지 않는 선택지를 입력해 주세요.')
        return self


def attachments_of(conn, ids):
    result = {key: [] for key in ids}
    if ids:
        for row in conn.execute("""SELECT * FROM dc.file_object
          WHERE owner_kind='PROGRAM' AND owner_id=ANY(%s) AND state='READY'
          ORDER BY uploaded_at,id""", (ids,)).fetchall():
            result[row['owner_id']].append(files.file_dto(row, '/api/v1/program-files/'))
    return result


def sync_attachments(conn, user, program_id, ids):
    if ids is None:
        return
    keep = set(ids)
    for file_id in sorted(keep):
        row = files.get_file(conn, file_id, lock=True)
        if (row['owner_kind'], row['owner_id'], row['slot']) != ('PROGRAM', program_id, 'PROGRAM_ATTACHMENT'):
            files.claim(conn, user, file_id, 'PROGRAM', program_id, 'PROGRAM_ATTACHMENT')
    for row in conn.execute("""SELECT id FROM dc.file_object
      WHERE owner_kind='PROGRAM' AND owner_id=%s AND state='READY'""", (program_id,)):
        if row['id'] not in keep:
            files.discard(conn, user, row['id'])


def validate_answers(conn, user, program, answers):
    questions = program['application_questions']
    if set(answers) - {q['id'] for q in questions}:
        raise HTTPException(422, '신청 질문이 변경되었습니다. 공고를 다시 열어 주세요.')
    result = []
    used_files = set()
    for question in questions:
        value = answers.get(question['id'])
        empty = value is None or value == '' or value == []
        if empty:
            if question['required']:
                raise HTTPException(422, question['question'] + ': 답변을 입력해 주세요.')
            continue
        kind = question['type']
        attached = []
        valid = False
        if kind == 'TEXT':
            valid = isinstance(value, str) and bool(value.strip()) and len(value) <= 500
        elif kind == 'SINGLE':
            valid = isinstance(value, str) and value in question['options']
        elif kind == 'MULTIPLE':
            valid = isinstance(value, list) and all(isinstance(v, str) and v in question['options'] for v in value)
            valid = valid and len(value) == len(set(value))
        elif kind == 'CONSENT':
            valid = isinstance(value, str) and value in ('yes', 'no')
        elif kind == 'FILE':
            valid = isinstance(value, list) and len(value) <= question['maxFiles'] and all(isinstance(v, str) for v in value)
            if valid:
                for file_id in value:
                    if file_id in used_files:
                        raise HTTPException(422, '같은 파일을 중복 제출할 수 없습니다.')
                    used_files.add(file_id)
                    row = files.get_file(conn, file_id, lock=True)
                    if row['owner_kind'] != 'PROGRAM_APPLICATION' or row['uploaded_by'] != user['intg_uid'] or row['owner_id'] is not None:
                        raise HTTPException(403, '본인이 새로 올린 신청 첨부파일만 제출할 수 있습니다.')
                    attached.append(files.file_dto(row, '/api/v1/program-files/'))
        if not valid:
            raise HTTPException(422, question['question'] + ': 답변 형식을 확인해 주세요.')
        result.append({'question': question, 'value': value, 'files': attached})
    return result, used_files
