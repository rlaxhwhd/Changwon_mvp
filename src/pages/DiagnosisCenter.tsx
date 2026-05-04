import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

interface Test {
  id: string;
  code: string;
  name: string;
  desc: string;
  duration: string;
  questions: number;
  icon: string;
  status: 'done' | 'ready' | 'new';
}

interface GroupDef {
  kicker: string;
  title: string;
  sub: string;
  tests: Test[];
}

const GROUPS: Record<string, GroupDef> = {
  career: {
    kicker: 'CAREER & EMPLOYMENT DIAGNOSTICS',
    title: '진로취업진단',
    sub: '자신의 진로 적합도와 취업 준비도를 과학적으로 진단합니다. 9CORE와 CARES 두 가지 검사로 다층 분석이 가능해요.',
    tests: [
      { id: '9core', code: '9CORE', name: '9코어 진로취업진단', desc: '9가지 핵심 역량 영역을 진단하여 진로 적합도를 분석합니다', duration: '약 30분', questions: 120, icon: 'fa-solid fa-chart-pie', status: 'done' },
      { id: 'cares', code: 'CARES', name: 'CARES 취업준비도 진단', desc: '취업 준비 단계별 성숙도와 실행 역량을 측정합니다', duration: '약 25분', questions: 90, icon: 'fa-solid fa-clipboard-list', status: 'new' },
    ],
  },
  personality: {
    kicker: 'PERSONALITY & APTITUDE',
    title: '성격심리진단',
    sub: '성격과 인적성, 심리 기반의 다각도 자기이해 진단입니다. 인적성검사와 MBTI를 모두 제공해요.',
    tests: [
      { id: 'aptitude', code: 'APTITUDE', name: '인적성검사', desc: '언어·수리·공간·문제해결 역량을 종합 측정합니다', duration: '약 40분', questions: 150, icon: 'fa-solid fa-brain', status: 'ready' },
      { id: 'mbti', code: 'MBTI', name: 'MBTI 성격유형검사', desc: '16가지 성격유형으로 자기이해와 진로 방향을 탐색합니다', duration: '약 15분', questions: 60, icon: 'fa-solid fa-user-astronaut', status: 'ready' },
    ],
  },
};

export default function DiagnosisCenter({ type }: { type: 'career' | 'personality' }) {
  const navigate = useNavigate();
  const group = GROUPS[type];

  return (
    <div className="page-wrap">
      <PageHeader kicker={group.kicker} title={group.title} sub={group.sub} />

      <div className="grid-2 mb-lg">
        {group.tests.map((t) => (
          <div key={t.id} className="panel">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: 'var(--grad-aurora)',
                display: 'grid', placeItems: 'center',
                boxShadow: 'var(--glow-violet)',
                flexShrink: 0,
              }}>
                <i className={t.icon} style={{ fontSize: 26, color: '#fff' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 3, color: 'var(--accent-cyan)' }}>
                  {t.code}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{t.name}</div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 8 }}>
                  {t.desc}
                </p>
                <div style={{ display: 'flex', gap: 20, marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                  <span><i className="fa-solid fa-clock" /> {t.duration}</span>
                  <span><i className="fa-solid fa-list-check" /> {t.questions}문항</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              {t.status === 'done' ? (
                <>
                  <button className="btn-outline" style={{ flex: 1 }}>결과 보기</button>
                  <button className="btn-aurora" style={{ flex: 1 }}>재응시</button>
                </>
              ) : (
                <button className="btn-aurora" style={{ flex: 1 }}>
                  <i className="fa-solid fa-rocket" /> 미션 시작
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="panel" style={{ background: 'linear-gradient(135deg, rgba(85, 230, 255, 0.08), rgba(155, 107, 255, 0.08))' }}>
        <div className="flex-between">
          <div>
            <span className="tag tag--ai"><i className="fa-solid fa-wand-magic-sparkles" /> AI FINAL ANALYSIS</span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginTop: 12 }}>
              모든 검사 결과 AI 종합평가
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
              4가지 검사 결과를 AI가 통합 분석하여 당신만의 진로 인사이트를 생성합니다
            </p>
          </div>
          <button className="btn-aurora" onClick={() => navigate('/my/evaluation')}>
            AI 종합평가 보기 <i className="fa-solid fa-arrow-right" />
          </button>
        </div>
      </div>
    </div>
  );
}
