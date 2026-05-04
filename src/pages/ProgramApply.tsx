import { useState } from 'react';
import PageHeader from '../components/PageHeader';

interface Program {
  id: string;
  title: string;
  desc: string;
  tags: string[];
  aiRecommend?: boolean;
  period: string;
  status: '모집중' | '마감임박' | '진행중';
}

const PROGRAMS: Program[] = [
  { id: '1', title: '실전 모의면접 부트캠프', desc: '대기업 출신 인사담당자와 함께하는 3일 집중 면접 훈련', tags: ['면접준비', '취업역량'], aiRecommend: true, period: '04.20 ~ 04.22', status: '모집중' },
  { id: '2', title: 'AI 자기소개서 마스터클래스', desc: 'ChatGPT를 활용한 자소서 작성법과 피드백 세션', tags: ['자소서', 'AI활용'], aiRecommend: true, period: '04.25', status: '모집중' },
  { id: '3', title: '데이터 분석 실무 프로젝트', desc: 'Python과 SQL로 진행하는 실전 데이터 분석 프로젝트', tags: ['IT역량', '실무'], period: '05.01 ~ 05.30', status: '모집중' },
  { id: '4', title: '포트폴리오 제작 워크샵', desc: '자신만의 브랜딩이 담긴 포트폴리오 제작 가이드', tags: ['포트폴리오'], period: '04.18', status: '마감임박' },
  { id: '5', title: '현직자 멘토링 Day', desc: '다양한 산업군 현직자들과의 1:1 네트워킹', tags: ['네트워킹', '멘토링'], aiRecommend: true, period: '05.05', status: '모집중' },
  { id: '6', title: 'PPT 디자인 강의', desc: '실무에서 바로 쓰는 프레젠테이션 디자인 스킬', tags: ['취업역량', '디자인'], period: '04.28', status: '모집중' },
];

export default function ProgramApply() {
  const [filter, setFilter] = useState<'all' | 'ai'>('all');
  const filtered = filter === 'ai' ? PROGRAMS.filter((p) => p.aiRecommend) : PROGRAMS;

  return (
    <div className="page-wrap">
      <PageHeader
        kicker="CAPACITY DEVELOPMENT CENTER"
        title="프로그램 신청"
        sub="역량개발센터가 제공하는 다양한 프로그램으로 당신의 역량을 키우세요. AI가 당신의 진단 결과를 바탕으로 맞춤 프로그램을 추천합니다."
      />

      <div className="flex-between mb-lg">
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={filter === 'all' ? 'btn-aurora' : 'btn-outline'}
            onClick={() => setFilter('all')}
          >
            전체
          </button>
          <button
            className={filter === 'ai' ? 'btn-aurora' : 'btn-outline'}
            onClick={() => setFilter('ai')}
          >
            <i className="fa-solid fa-wand-magic-sparkles" /> AI 추천만
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: 1 }}>
          {filtered.length}개의 프로그램
        </div>
      </div>

      <div className="grid-3">
        {filtered.map((p) => (
          <div key={p.id} className="panel" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '60%' }}>
              {p.aiRecommend && <span className="tag tag--ai">AI 추천</span>}
              {p.tags.map((t) => <span key={t} className="tag">{t}</span>)}
            </div>

            <div style={{ marginTop: 32, fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: 2, color: 'var(--accent-cyan)' }}>
              {p.status === '모집중' && '● RECRUITING'}
              {p.status === '마감임박' && '● CLOSING SOON'}
              {p.status === '진행중' && '● IN PROGRESS'}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 8, marginBottom: 10 }}>{p.title}</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1 }}>{p.desc}</p>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-nebula)', fontSize: 12, color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-calendar" /> {p.period}
            </div>
            <button className="btn-aurora" style={{ marginTop: 14, width: '100%' }}>
              신청하기
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
