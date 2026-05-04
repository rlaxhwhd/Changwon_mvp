import { useState } from 'react';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import ConfirmDialog from '../components/ConfirmDialog';
import type { PageId } from '../types';

interface CareerManageProps {
  onToast: (msg: string) => void;
  onNavigate: (page: PageId) => void;
}

interface Cert { name: string; issuer: string; date: string; }
interface Lang { test: string; score: string; date: string; }
interface Project { name: string; type: string; period: string; role: string; desc: string; stack: string; }

const categories = [
  { key: 'cert', label: '자격증', icon: 'fa-solid fa-certificate', color: '#F59E0B', emoji: '📜' },
  { key: 'lang', label: '어학', icon: 'fa-solid fa-language', color: '#60A5FA', emoji: '🌍' },
  { key: 'project', label: '프로젝트', icon: 'fa-solid fa-code-branch', color: '#3B82F6', emoji: '💻' },
  { key: 'extra', label: '비교과', icon: 'fa-solid fa-puzzle-piece', color: '#10B981', emoji: '🧩' },
];

export default function CareerManage({ onToast, onNavigate }: CareerManageProps) {
  const [activeTab, setActiveTab] = useState('cert');
  const [certs, setCerts] = useState<Cert[]>([{ name: 'SQLD', issuer: '한국데이터산업진흥원', date: '2025-08-15' }]);
  const [langs, setLangs] = useState<Lang[]>([]);
  const [projects, setProjects] = useState<Project[]>([{ name: '학과 홈페이지 리뉴얼', type: '팀 프로젝트', period: '2025-09 ~ 2025-12', role: '프론트엔드 개발', desc: 'React 기반 학과 홈페이지 리뉴얼', stack: 'React, TypeScript' }]);

  const [certModal, setCertModal] = useState(false);
  const [langModal, setLangModal] = useState(false);
  const [projModal, setProjModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; idx: number } | null>(null);

  const [certForm, setCertForm] = useState<Cert>({ name: '', issuer: '', date: '' });
  const [langForm, setLangForm] = useState<Lang>({ test: '', score: '', date: '' });
  const [projForm, setProjForm] = useState<Project>({ name: '', type: '', period: '', role: '', desc: '', stack: '' });

  const handleDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'cert') setCerts(prev => prev.filter((_, i) => i !== deleteConfirm.idx));
    if (deleteConfirm.type === 'lang') setLangs(prev => prev.filter((_, i) => i !== deleteConfirm.idx));
    if (deleteConfirm.type === 'proj') setProjects(prev => prev.filter((_, i) => i !== deleteConfirm.idx));
    onToast('삭제되었습니다');
  };

  const stats = [
    { label: '자격증', count: certs.length, target: 2, emoji: '📜' },
    { label: '어학', count: langs.length, target: 1, emoji: '🌍' },
    { label: '프로젝트', count: projects.length, target: 3, emoji: '💻' },
    { label: '비교과', count: 2, target: 3, emoji: '🧩' },
  ];

  const totalProgress = Math.round(
    stats.reduce((sum, s) => sum + Math.min(s.count / s.target, 1), 0) / stats.length * 100
  );

  return (
    <div className="cm5-root">
      {/* ── Hero ── */}
      <div className="cm5-hero">
        <div className="cm5-hero-inner">
          <div>
            <p className="cm5-hero-label">CAREER MANAGEMENT</p>
            <h1 className="cm5-hero-title">경력개발 <span className="cm5-hero-bold">관리</span></h1>
            <p className="cm5-hero-sub">자격증, 어학, 프로젝트를 등록하고 AI가 분석합니다</p>
          </div>
          <div className="cm5-hero-progress-ring">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="url(#cm5grad)" strokeWidth="5"
                strokeDasharray={`${(totalProgress / 100) * 264} 264`}
                strokeLinecap="round" transform="rotate(-90 50 50)" />
              <defs>
                <linearGradient id="cm5grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#A78BFA" />
                </linearGradient>
              </defs>
            </svg>
            <div className="cm5-ring-text">
              <span className="cm5-ring-num">{totalProgress}%</span>
              <span className="cm5-ring-label">경력 완성도</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI 알림 배너 ── */}
      <div className="cm5-notices">
        <div className="cm5-notice cm5-notice-warn">
          <i className="fa-solid fa-triangle-exclamation" />
          <span>어학 성적이 미등록입니다. 넥슨 IT PM 지원 시 TOEIC 700+ 필수입니다.</span>
          <button className="cm5-notice-link" onClick={() => onNavigate('program-apply')}>프로그램 찾기 →</button>
        </div>
        <div className="cm5-notice cm5-notice-info">
          <i className="fa-solid fa-lightbulb" />
          <span>자격증 {certs.length}건 보유 중. PMP 기초를 추가하면 PM 역량 점수가 +15점 상승 예상됩니다.</span>
        </div>
        <div className="cm5-notice cm5-notice-success">
          <i className="fa-solid fa-circle-check" />
          <span>프로젝트 경험 등록 완료. 1건 더 추가하면 포트폴리오 완성도가 크게 높아집니다.</span>
          <button className="cm5-notice-link" onClick={() => onNavigate('my-portfolio')}>포트폴리오 →</button>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="cm5-tabs">
        {categories.map(cat => (
          <button
            key={cat.key}
            className={`cm5-tab ${activeTab === cat.key ? 'cm5-tab-active' : ''}`}
            onClick={() => setActiveTab(cat.key)}
          >
            <i className={cat.icon} style={{ color: cat.color }} />
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="cm5-tab-content">
        {activeTab === 'cert' && (
          <div className="cm5-section">
            <div className="cm5-section-header">
              <h3>자격증 관리</h3>
              <button className="cm5-btn-add" onClick={() => { setCertForm({ name: '', issuer: '', date: '' }); setCertModal(true); }}>
                <i className="fa-solid fa-plus" /> 추가
              </button>
            </div>
            {certs.length === 0 ? (
              <div className="cm5-empty">
                <span>📜</span>
                <p>등록된 자격증이 없습니다</p>
                <button onClick={() => setCertModal(true)}>자격증 등록하기</button>
              </div>
            ) : (
              <div className="cm5-items">
                {certs.map((c, i) => (
                  <div key={i} className="cm5-item">
                    <div className="cm5-item-dot" style={{ background: '#F59E0B' }} />
                    <div className="cm5-item-body">
                      <div className="cm5-item-name">{c.name}</div>
                      <div className="cm5-item-meta">{c.issuer} · {c.date}</div>
                    </div>
                    <span className="cm5-tag cm5-tag-done">취득완료</span>
                    <button className="cm5-btn-del" onClick={() => setDeleteConfirm({ type: 'cert', idx: i })}>
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="cm5-ai-tip">
              <i className="fa-solid fa-lightbulb" />
              <span>AI 추천: PMP 기초 자격증을 추가하면 PM 역량 점수가 +15점 상승합니다</span>
            </div>
          </div>
        )}

        {activeTab === 'lang' && (
          <div className="cm5-section">
            <div className="cm5-section-header">
              <h3>어학 성적</h3>
              <button className="cm5-btn-add" onClick={() => { setLangForm({ test: '', score: '', date: '' }); setLangModal(true); }}>
                <i className="fa-solid fa-plus" /> 추가
              </button>
            </div>
            {langs.length === 0 ? (
              <div className="cm5-empty cm5-empty-alert">
                <span>⚠️</span>
                <p>어학 성적 미등록</p>
                <p className="cm5-empty-sub">넥슨 IT PM 지원 시 TOEIC 700+ 필수</p>
                <button onClick={() => setLangModal(true)}>성적 등록하기</button>
              </div>
            ) : (
              <div className="cm5-items">
                {langs.map((l, i) => (
                  <div key={i} className="cm5-item">
                    <div className="cm5-item-dot" style={{ background: '#60A5FA' }} />
                    <div className="cm5-item-body">
                      <div className="cm5-item-name">{l.test} — {l.score}점</div>
                      <div className="cm5-item-meta">{l.date}</div>
                    </div>
                    <button className="cm5-btn-del" onClick={() => setDeleteConfirm({ type: 'lang', idx: i })}>
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="cm5-ai-tip cm5-tip-warn">
              <i className="fa-solid fa-robot" />
              <span>TOEIC 집중 과정을 추천합니다</span>
              <button onClick={() => onNavigate('program-apply')}>프로그램 찾기 →</button>
            </div>
          </div>
        )}

        {activeTab === 'project' && (
          <div className="cm5-section">
            <div className="cm5-section-header">
              <h3>프로젝트 경험</h3>
              <button className="cm5-btn-add" onClick={() => { setProjForm({ name: '', type: '', period: '', role: '', desc: '', stack: '' }); setProjModal(true); }}>
                <i className="fa-solid fa-plus" /> 추가
              </button>
            </div>
            {projects.length === 0 ? (
              <div className="cm5-empty">
                <span>💻</span>
                <p>등록된 프로젝트가 없습니다</p>
                <button onClick={() => setProjModal(true)}>프로젝트 등록</button>
              </div>
            ) : (
              <div className="cm5-project-grid">
                {projects.map((p, i) => (
                  <div key={i} className="cm5-project">
                    <div className="cm5-project-header">
                      <span className="cm5-project-type">{p.type}</span>
                      <button className="cm5-btn-del" onClick={() => setDeleteConfirm({ type: 'proj', idx: i })}>
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                    <h4 className="cm5-project-name">{p.name}</h4>
                    <p className="cm5-project-desc">{p.desc}</p>
                    <div className="cm5-project-meta">
                      <span><i className="fa-regular fa-calendar" /> {p.period}</span>
                      <span><i className="fa-solid fa-user" /> {p.role}</span>
                    </div>
                    <div className="cm5-project-tags">
                      {p.stack.split(',').map((t, ti) => (
                        <span key={ti} className="cm5-tech">{t.trim()}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'extra' && (
          <div className="cm5-section">
            <div className="cm5-section-header"><h3>비교과 활동</h3></div>
            <div className="cm5-items">
              <div className="cm5-item">
                <div className="cm5-item-dot" style={{ background: '#10B981' }} />
                <div className="cm5-item-body">
                  <div className="cm5-item-name">SW 봉사단</div>
                  <div className="cm5-item-meta">봉사활동 · 2025-03 ~ 2025-06</div>
                </div>
                <span className="cm5-tag cm5-tag-done">완료</span>
              </div>
              <div className="cm5-item">
                <div className="cm5-item-dot" style={{ background: '#3B82F6' }} />
                <div className="cm5-item-body">
                  <div className="cm5-item-name">코딩 동아리 'BYTE'</div>
                  <div className="cm5-item-meta">동아리 · 2025-03 ~ 현재</div>
                </div>
                <span className="cm5-tag cm5-tag-active">진행중</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 하단 CTA ── */}
      <div className="cm5-cta">
        <div className="cm5-cta-inner">
          <div className="cm5-cta-icon">📈</div>
          <div className="cm5-cta-text">
            <strong>경력 등록 후 다음 단계</strong>
            <p>AI 로드맵에서 진행률이 자동 반영됩니다</p>
          </div>
          <button className="cm5-btn-primary" onClick={() => onNavigate('ai-roadmap')}>
            로드맵 확인 <i className="fa-solid fa-arrow-right" />
          </button>
        </div>
      </div>

      {/* ── Modals ── */}
      <Modal open={certModal} onClose={() => setCertModal(false)} title="자격증 등록" size="sm" footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-outline" onClick={() => setCertModal(false)}>취소</button>
          <button className="btn btn-sm" style={{ background: '#3B82F6', color: '#fff' }}
            onClick={() => { if (certForm.name) { setCerts(prev => [...prev, certForm]); setCertModal(false); onToast('자격증이 등록되었습니다'); } }}>
            등록
          </button>
        </div>
      }>
        <FormField label="자격증명" value={certForm.name} onChange={v => setCertForm({ ...certForm, name: v })} placeholder="예: 정보처리기사" />
        <FormField label="발급기관" value={certForm.issuer} onChange={v => setCertForm({ ...certForm, issuer: v })} placeholder="예: 한국산업인력공단" />
        <FormField label="취득일" type="date" value={certForm.date} onChange={v => setCertForm({ ...certForm, date: v })} />
      </Modal>

      <Modal open={langModal} onClose={() => setLangModal(false)} title="어학 성적 등록" size="sm" footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-outline" onClick={() => setLangModal(false)}>취소</button>
          <button className="btn btn-sm" style={{ background: '#3B82F6', color: '#fff' }}
            onClick={() => { if (langForm.test) { setLangs(prev => [...prev, langForm]); setLangModal(false); onToast('어학 성적이 등록되었습니다'); } }}>
            등록
          </button>
        </div>
      }>
        <FormField label="시험 종류" type="select" value={langForm.test} onChange={v => setLangForm({ ...langForm, test: v })} options={[
          { value: 'TOEIC', label: 'TOEIC' }, { value: 'TOEFL', label: 'TOEFL' },
          { value: 'OPIC', label: 'OPIC' }, { value: 'TOEIC Speaking', label: 'TOEIC Speaking' },
        ]} />
        <FormField label="점수" value={langForm.score} onChange={v => setLangForm({ ...langForm, score: v })} placeholder="예: 750" />
        <FormField label="취득일" type="date" value={langForm.date} onChange={v => setLangForm({ ...langForm, date: v })} />
      </Modal>

      <Modal open={projModal} onClose={() => setProjModal(false)} title="프로젝트 등록" size="lg" footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-outline" onClick={() => setProjModal(false)}>취소</button>
          <button className="btn btn-sm" style={{ background: '#3B82F6', color: '#fff' }}
            onClick={() => { if (projForm.name) { setProjects(prev => [...prev, projForm]); setProjModal(false); onToast('프로젝트가 등록되었습니다'); } }}>
            등록
          </button>
        </div>
      }>
        <FormField label="프로젝트명" value={projForm.name} onChange={v => setProjForm({ ...projForm, name: v })} />
        <FormField label="유형" type="select" value={projForm.type} onChange={v => setProjForm({ ...projForm, type: v })} options={[
          { value: '팀 프로젝트', label: '팀 프로젝트' }, { value: '개인 프로젝트', label: '개인 프로젝트' },
          { value: '캡스톤', label: '캡스톤 디자인' }, { value: '공모전', label: '공모전' },
        ]} />
        <FormField label="기간" value={projForm.period} onChange={v => setProjForm({ ...projForm, period: v })} placeholder="예: 2025-03 ~ 2025-06" />
        <FormField label="역할" value={projForm.role} onChange={v => setProjForm({ ...projForm, role: v })} placeholder="예: PM" />
        <FormField label="설명" type="textarea" value={projForm.desc} onChange={v => setProjForm({ ...projForm, desc: v })} />
        <FormField label="기술스택" value={projForm.stack} onChange={v => setProjForm({ ...projForm, stack: v })} placeholder="예: React, Spring Boot" />
      </Modal>

      <ConfirmDialog
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="삭제 확인"
        message="정말 삭제하시겠습니까?"
        confirmText="삭제"
        danger
      />
    </div>
  );
}
