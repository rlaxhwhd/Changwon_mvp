"""Pure form validation; database workflow coverage lives with counseling API tests."""
import pytest
from pydantic import ValidationError

from app.counsel_template import CounselTemplate, template_storage


def test_selected_sections_and_private_ai_placeholder():
    value = CounselTemplate.model_validate({
        'channel': '전화', 'conductedAt': '2026-09-17T14:00',
        'qualitative': {'motivation': '상', 'selfUnderstanding': '중'},
        'program': {'selected': True, 'content': '  Program feedback  '},
        'application': {'selected': False, 'content': 'Hidden editor text'},
    })
    assert value.content() == '프로그램 현황 체크\nProgram feedback'
    assert value.storage()['application']['content'] == ''
    assert value.storage()['qualitative'] == {'motivation': '상', 'selfUnderstanding': '중'}
    value.application.selected = True
    assert '입사지원 현황 체크\nHidden editor text' in value.content()


@pytest.mark.parametrize('fields', [
    {'conductedAt': '2026-02-30T14:00'}, {'conductedAt': '2026-09-17'},
    {'conductedAt': '20260917T1400'}, {'channel': '비대면'},
    {'finalType': 'T7'}, {'qualitative': {'motivation': '최상'}},
    {'qualitative': {'invented': '상'}}, {'aiJournal': 'Pretend AI generated text'},
    {'program': {'content': 'x' * 9001}},
])
def test_invalid_template(fields):
    with pytest.raises(ValidationError):
        CounselTemplate.model_validate(fields)


def test_legacy_text_is_preserved_by_server_not_client():
    value=CounselTemplate(legacySummary='forged old text')
    assert template_storage(value)['legacySummary']==''
    assert template_storage(value,{'summary':'original journal','template':None})['legacySummary']=='original journal'
    assert template_storage(value,{'summary':'new structured summary','template':{'legacySummary':'original journal'}})['legacySummary']=='original journal'
