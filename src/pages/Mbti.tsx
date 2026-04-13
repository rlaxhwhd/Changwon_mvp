import { useState } from 'react';
import Modal from '../components/Modal';

interface Dimension {
  label: string;
  left: { code: string; name: string; score: number };
  right: { code: string; name: string; score: number };
  color: string;
  detail: string;
}

const dimensions: Dimension[] = [
  { label: '에너지 방향', left: { code: 'E', name: '외향', score: 62 }, right: { code: 'I', name: '내향', score: 38 }, color: '#6366F1', detail: '사교적이고 활동적이며, 외부 환경에서 에너지를 얻는 경향이 있습니다. 팀 활동이나 네트워킹에 강점을 보입니다.' },
  { label: '인식 기능', left: { code: 'N', name: '직관', score: 68 }, right: { code: 'S', name: '감각', score: 32 }, color: '#0EA5E9', detail: '큰 그림과 가능성에 주목하며, 창의적이고 미래지향적인 사고를 합니다. 혁신적인 아이디어를 잘 도출합니다.' },
  { label: '판단 기능', left: { code: 'F', name: '감정', score: 55 }, right: { code: 'T', name: '사고', score: 45 }, color: '#EC4899', detail: '사람과 가치를 중시하며, 공감 능력이 뛰어납니다. 조화로운 인간관계를 추구합니다.' },
  { label: '생활 양식', left: { code: 'P', name: '인식', score: 60 }, right: { code: 'J', name: '판단', score: 40 }, color: '#F59E0B', detail: '유연하고 적응력이 뛰어나며, 열린 자세로 새로운 가능성을 탐색합니다. 자유로운 작업 환경을 선호합니다.' },
];

const mbtiType = dimensions.map(d => d.left.score >= d.right.score ? d.left.code : d.right.code).join('');

const typeDesc: Record<string, { title: string; desc: string; careers: string[] }> = {
  ENFP: { title: '재기발랄한 활동가', desc: '열정적이고 창의적이며, 새로운 가능성을 탐색하는 것을 좋아합니다. 사람들과의 교류에서 에너지를 얻고, 영감을 주는 리더십을 발휘합니다.', careers: ['마케팅 기획자', '상담사', 'UX 디자이너', '콘텐츠 크리에이터', '교육 프로그램 개발자', '사회복지사'] },
  INFP: { title: '열정적인 중재자', desc: '이상주의적이고 공감 능력이 뛰어나며, 깊은 가치관을 가지고 있습니다.', careers: ['작가', '상담사', '심리학자', '사회복지사'] },
  ENTP: { title: '논쟁을 즐기는 변론가', desc: '지적 호기심이 강하고 도전을 즐깁니다.', careers: ['기업가', '변호사', '컨설턴트', '발명가'] },
  INTP: { title: '논리적인 사색가', desc: '분석적이고 논리적인 사고를 즐깁니다.', careers: ['연구원', '프로그래머', '과학자', '분석가'] },
};

const info = typeDesc[mbtiType] || typeDesc['ENFP'];

export default function Mbti() {
  const [sel, setSel] = useState<Dimension | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleAi = () => {
    setAiOpen(true);
    setAiLoading(true);
    setAiResult('');
    setTimeout(() => {
      setAiLoading(false);
      setAiResult(
        `[MBTI AI 평가분석 - ${mbtiType} 유형]\n\n` +
        `유형 해석: ${info.title}\n` +
        `${info.desc}\n\n` +
        `차원별 분석:\n` +
        dimensions.map(d => {
          const dominant = d.left.score >= d.right.score ? d.left : d.right;
          return `- ${d.label}: ${dominant.name}(${dominant.code}) ${dominant.score}% 우세\n  ${d.detail}`;
        }).join('\n') +
        `\n\n진로 적합도:\n` +
        `${mbtiType} 유형은 창의성과 공감 능력이 결합된 유형으로, 사람과 아이디어를 연결하는 분야에서 높은 성과를 보입니다.\n\n` +
        `추천 직무:\n` +
        info.careers.map(c => `- ${c}`).join('\n') +
        `\n\n성장 포인트:\n` +
        `1. 아이디어를 실행으로 전환하는 체계적인 계획 수립 연습\n` +
        `2. 감정적 판단과 논리적 판단의 균형 훈련\n` +
        `3. 장기 프로젝트에서의 집중력과 완결력 강화`
      );
    }, 1800);
  };

  return (
    <div>
      <div className="page-header">
        <h1>MBTI 검사 결과</h1>
        <p>나의 성격유형 분석 결과입니다</p>
      </div>

      <div className="card" style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 4 }}>나의 MBTI 유형</div>
        <div style={{ fontSize: 48, fontWeight: 800, color: '#6366F1', letterSpacing: 8 }}>{mbtiType}</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#374151', marginTop: 4 }}>{info.title}</div>
        <p style={{ fontSize: 14, color: '#6B7280', marginTop: 8, maxWidth: 500, margin: '8px auto 0', lineHeight: 1.7 }}>{info.desc}</p>
      </div>

      {/* 차원별 바 */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>유형 차원별 분석</h3>
        {dimensions.map((d, i) => (
          <div key={i} style={{ marginBottom: 20, cursor: 'pointer' }} onClick={() => setSel(d)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#6B7280' }}>
              <span>{d.label}</span>
              <span style={{ fontSize: 12 }}>클릭하여 상세보기</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 50, textAlign: 'right', fontWeight: 700, color: d.left.score >= d.right.score ? d.color : '#9CA3AF' }}>
                {d.left.code} {d.left.score}%
              </span>
              <div style={{ flex: 1, display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden', background: '#F3F4F6' }}>
                <div style={{ width: `${d.left.score}%`, background: d.color, transition: 'width .6s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{d.left.name}</span>
                </div>
                <div style={{ width: `${d.right.score}%`, background: '#D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>{d.right.name}</span>
                </div>
              </div>
              <span style={{ width: 50, fontWeight: 700, color: d.right.score > d.left.score ? d.color : '#9CA3AF' }}>
                {d.right.score}% {d.right.code}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* AI 평가분석 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
        <button className="btn" onClick={handleAi} style={{
          background: 'linear-gradient(135deg, #EC4899, #8B5CF6)', color: '#fff',
          padding: '14px 36px', fontSize: 16, fontWeight: 700, borderRadius: 10, border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 4px 16px rgba(236,72,153,.25)', transition: 'transform .2s, box-shadow .2s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; }}
        >
          <i className="fa-solid fa-brain" /> AI 평가분석 보기
        </button>
      </div>

      {/* 추천 직업 */}
      <div className="card">
        <h3 style={{ marginBottom: 12 }}><i className="fa-solid fa-briefcase" style={{ marginRight: 8, color: '#6366F1' }} />추천 직업</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {info.careers.map(c => (
            <span key={c} className="badge" style={{ background: '#EEF2FF', color: '#4F46E5', fontSize: 13, padding: '6px 14px' }}>{c}</span>
          ))}
        </div>
      </div>

      {sel && (
        <Modal title={`${sel.label} 상세`} size="md" onClose={() => setSel(null)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: sel.color }}>{sel.left.score >= sel.right.score ? sel.left.code : sel.right.code}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{sel.left.score >= sel.right.score ? sel.left.name : sel.right.name}</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>{sel.left.score}% vs {sel.right.score}%</div>
            </div>
          </div>
          <p style={{ lineHeight: 1.7 }}>{sel.detail}</p>
        </Modal>
      )}

      {aiOpen && (
        <Modal title="MBTI AI 평가분석" size="lg" onClose={() => setAiOpen(false)}>
          {aiLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: '#EC4899' }} />
              <p style={{ marginTop: 12, color: '#6B7280' }}>AI가 MBTI 결과를 분석하고 있습니다...</p>
            </div>
          ) : (
            <pre style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: 14 }}>{aiResult}</pre>
          )}
        </Modal>
      )}
    </div>
  );
}
