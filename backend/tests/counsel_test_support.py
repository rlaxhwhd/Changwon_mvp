def counsel_form(final_type='T2'):
    return dict(schemaVersion=1, channel='전화', conductedAt='2026-09-17T14:00', finalType=final_type,
                qualitative=dict(motivation='상', employmentWill='중', feasibility='하', communication='중', selfUnderstanding='상'),
                program=dict(selected=True, content='PRIVATE PROGRAM NOTES'),
                application=dict(selected=True, content='PRIVATE APPLICATION NOTES'), aiJournal='')
