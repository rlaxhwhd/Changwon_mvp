"""User-authorized sample plans by catalog job. No fake student achievements."""
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from .roadmap_generator import Outcome
from .settings import settings

REVISION = 'sample-2026-09-14-v1'


def build(job, skills):
    name = job['label']
    skill = skills[0] if skills else f'{name} 기초 지식'
    secondary = skills[1] if len(skills) > 1 else f'{name} 실무 도구'
    tasks = {
      'IAP': [f'{name} 채용공고 3건의 업무·자격 요건 비교', f'{name} 직무사전과 실제 업무 흐름 정리',
              f'{name} 목표 기업·기관 후보와 선택 이유 작성', f'{name} 준비 일정과 주간 실행 계획 수립',
              f'{name} 진로 계획을 상담사와 검토하고 보완'],
      'CORE': [f'{skill} 기초 학습과 개념 노트 작성', f'{secondary} 실습 과제 1건 수행',
               f'{name} 관련 교과·비교과 학습 기회 조사', f'{name} 사례를 분석해 문제와 해결안 정리',
               f'{name} 소규모 실무 과제 결과물 제작'],
      'GROWTH': [f'{name} 준비 활동을 성장일지로 기록', f'{name} 과제의 목표·과정·결과를 포트폴리오로 정리',
                 f'{name} 협업 또는 발표 경험 계획 수립', f'{name} 지원 동기와 경험 소개 초안 작성',
                 f'{name} 결과물 피드백을 받아 다음 실행 계획 수정'],
    }
    headings = {'IAP': '진로 실행', 'CORE': '직무 역량 학습', 'GROWTH': '경험과 결과물 정리'}
    return Outcome.model_validate({'targetRole': name, 'targetCompany': '미정 — 상담에서 확인',
      'axes': [{'axis': axis, 'headline': f'{name} · {headings[axis]}',
        'rationale': f'개발용 임시 예시입니다. 직무사전의 {name} 정보를 참고했으며 RAG·LLM 분석 결과가 아닙니다. 학생별 적합성은 상담에서 검토해야 합니다.',
        'cells': [{'title': title, 'priority': 'P1', 'importance': 'RECOMMENDED',
          'why': '선택한 목표직무의 준비 흐름을 확인하기 위한 임시 제안입니다. 이수·보유 능력·진단 결과를 의미하지 않습니다.'} for title in titles]}
        for axis, titles in tasks.items()]}).model_dump()


def seed(conn):
    if settings.environment == 'production':
        raise RuntimeError('Development templates cannot be populated in production')
    jobs = conn.execute('SELECT job_id,label FROM dc.job_role ORDER BY job_id').fetchall()
    for job in jobs:
        skills = [r['label'] for r in conn.execute('''SELECT s.label FROM dc.job_skill j
          JOIN dc.skill s USING(skill_id) WHERE j.job_id=%s ORDER BY j.weight DESC,j.skill_id''', (job['job_id'],)).fetchall()]
        conn.execute('''INSERT INTO dc.development_roadmap_template(job_id,revision,outcome)
          VALUES(%s,%s,%s) ON CONFLICT(job_id) DO UPDATE
          SET revision=excluded.revision,outcome=excluded.outcome,updated_at=now()''',
          (job['job_id'], REVISION, Jsonb(build(job, skills))))
    return len(jobs)


if __name__ == '__main__':
    with psycopg.connect(**settings.connection_kwargs(), row_factory=dict_row) as conn:
        print(f'Prepared {seed(conn)} development roadmap templates')
