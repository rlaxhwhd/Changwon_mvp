import { useState } from 'react';
import type { PageId } from '../types';
import Modal from '../components/Modal';
import FormField from '../components/FormField';

interface MyPortfolioProps {
  onToast: (msg: string, type?: 'info' | 'success') => void;
  onNavigate: (page: PageId) => void;
}

type TabId = 'profile' | 'experience' | 'credentials' | 'essay' | 'files';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'profile', label: '기본 정보', icon: 'fa-solid fa-user' },
  { id: 'experience', label: '경력 · 활동', icon: 'fa-solid fa-briefcase' },
  { id: 'credentials', label: '자격증 · 수상', icon: 'fa-solid fa-award' },
  { id: 'essay', label: '자소서 작성', icon: 'fa-solid fa-pen-to-square' },
  { id: 'files', label: '파일 · 링크', icon: 'fa-solid fa-paperclip' },
];

interface ExperienceItem {
  id: string;
  title: string;
  org: string;
  period: string;
  role: string;
  desc: string;
  tags: string[];
}

interface CredentialItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  type: '자격증' | '수상' | '수료';
}

interface EssayItem {
  id: string;
  company: string;
  question: string;
  content: string;
  updatedAt: string;
  aiGenerated: boolean;
}

interface FileItem {
  id: string;
  name: string;
  type: 'pdf' | 'link' | 'image';
  size?: string;
  url?: string;
}

const INITIAL_EXPERIENCES: ExperienceItem[] = [
  {
    id: 'e1',
    title: '캡스톤 디자인 프로젝트',
    org: '창원대학교 컴퓨터공학과',
    period: '2026.03 ~ 진행중',
    role: 'PM / 프론트엔드',
    desc: 'AI 기반 학생 역량 분석 시스템 개발. 4인 팀에서 PM 역할과 React 프론트엔드 구현을 담당.',
    tags: ['React', 'Python', 'AI', 'PM'],
  },
  {
    id: 'e2',
    title: '취업캠프 수료',
    org: '창원대 취업전략센터',
    period: '2026.01',
    role: '참가자',
    desc: '2주간 집중 취업캠프 수료. 이력서·자소서 클리닉, 모의면접 과정 이수.',
    tags: ['취업준비', '면접'],
  },
];

const INITIAL_CREDENTIALS: CredentialItem[] = [
  { id: 'c1', name: 'SQLD (SQL 개발자)', issuer: '한국데이터산업진흥원', date: '2025.11', type: '자격증' },
  { id: 'c2', name: '삼성 SW 역량테스트 A형', issuer: '삼성전자', date: '2026.02', type: '자격증' },
  { id: 'c3', name: '창원대 IT 해커톤 우수상', issuer: '창원대학교', date: '2025.10', type: '수상' },
  { id: 'c4', name: '9CORE 역량 진단 수료', issuer: '창원대 취업전략센터', date: '2025.12', type: '수료' },
];

const INITIAL_ESSAYS: EssayItem[] = [
  {
    id: 'es1',
    company: '넥슨코리아',
    question: '[성장과정] 본인의 성장 배경과 가치관 형성에 영향을 준 경험을 서술해 주세요. (1000자)',
    content: '저는 어려서부터 게임을 단순한 오락이 아닌, 사람의 마음을 움직이는 경험의 집합이라고 생각해왔습니다...',
    updatedAt: '2026-04-05',
    aiGenerated: true,
  },
  {
    id: 'es2',
    company: '넥슨코리아',
    question: '[지원동기] 넥슨에 지원하게 된 동기와 입사 후 포부를 작성해 주세요. (800자)',
    content: '',
    updatedAt: '2026-04-01',
    aiGenerated: false,
  },
];

const INITIAL_FILES: FileItem[] = [
  { id: 'f1', name: '이력서_김민준_2026.pdf', type: 'pdf', size: '318KB' },
  { id: 'f2', name: '캡스톤 프로젝트 깃허브', type: 'link', url: 'github.com/minjun/capstone' },
  { id: 'f3', name: '포트폴리오_2026.pdf', type: 'pdf', size: '2.4MB' },
];

const PROFILE = {
  name: '김민준',
  studentId: '202012345',
  dept: '컴퓨터공학과',
  grade: '2학년',
  email: 'minjun@changwon.ac.kr',
  phone: '010-1234-5678',
  gpa: '4.31 / 4.5',
  targetCompany: '넥슨코리아',
  targetRole: 'IT Project Manager',
  intro: '사용자 경험을 중심에 두고, 데이터로 의사결정하는 PM이 되고 싶습니다.',
};

export default function MyPortfolio({ onToast, onNavigate }: MyPortfolioProps) {
  const [tab, setTab] = useState<TabId>('profile');
  const [experiences, setExperiences] = useState(INITIAL_EXPERIENCES);
  const [credentials, setCredentials] = useState(INITIAL_CREDENTIALS);
  const [essays, setEssays] = useState(INITIAL_ESSAYS);
  const [files] = useState(INITIAL_FILES);

  // Experience modal
  const [expModal, setExpModal] = useState(false);
  const [expDraft, setExpDraft] = useState<Omit<ExperienceItem, 'id' | 'tags'> & { tags: string }>({
    title: '', org: '', period: '', role: '', desc: '', tags: '',
  });

  // Credential modal
  const [credModal, setCredModal] = useState(false);
  const [credDraft, setCredDraft] = useState<Omit<CredentialItem, 'id'>>({
    name: '', issuer: '', date: '', type: '자격증',
  });

  // Essay editor
  const [editingEssay, setEditingEssay] = useState<EssayItem | null>(null);

  // Completion score
  const completion = (() => {
    let score = 0;
    if (PROFILE.intro) score += 20;
    if (experiences.length >= 2) score += 25;
    if (credentials.length >= 3) score += 25;
    if (essays.some(e => e.content.length > 100)) score += 20;
    if (files.length >= 2) score += 10;
    return score;
  })();

  const handleAddExperience = () => {
    if (!expDraft.title || !expDraft.org) {
      onToast('제목과 소속은 필수입니다', 'info');
      return;
    }
    setExperiences(prev => [
      { id: `e${Date.now()}`, ...expDraft, tags: expDraft.tags.split(',').map(t => t.trim()).filter(Boolean) },
      ...prev,
    ]);
    setExpDraft({ title: '', org: '', period: '', role: '', desc: '', tags: '' });
    setExpModal(false);
    onToast('경력 항목이 추가되었습니다', 'success');
  };

  const handleDeleteExperience = (id: string) => {
    setExperiences(prev => prev.filter(e => e.id !== id));
    onToast('삭제되었습니다');
  };

  const handleAddCredential = () => {
    if (!credDraft.name) {
      onToast('자격증명은 필수입니다', 'info');
      return;
    }
    setCredentials(prev => [
      { id: `c${Date.now()}`, ...credDraft },
      ...prev,
    ]);
    setCredDraft({ name: '', issuer: '', date: '', type: '자격증' });
    setCredModal(false);
    onToast('자격증이 추가되었습니다', 'success');
  };

  const handleDeleteCredential = (id: string) => {
    setCredentials(prev => prev.filter(c => c.id !== id));
    onToast('삭제되었습니다');
  };

  const handleSaveEssay = () => {
    if (!editingEssay) return;
    setEssays(prev => prev.map(e => e.id === editingEssay.id
      ? { ...editingEssay, updatedAt: new Date().toISOString().slice(0, 10) }
      : e));
    setEditingEssay(null);
    onToast('자소서가 저장되었습니다', 'success');
  };

  return (
    <div>
      <div className="page-header">
        <h1>포트폴리오 관리</h1>
        <p>나의 활동과 성과를 직접 관리하고, 이력서·자소서를 준비하세요</p>
      </div>

      {/* ── 상단 요약 카드 ── */}
      <div className="card portfolio-summary">
        <div className="summary-left">
          <div className="summary-avatar">
            <i className="fa-solid fa-user" />
          </div>
          <div>
            <div className="summary-name">{PROFILE.name} <span>{PROFILE.dept} · {PROFILE.grade}</span></div>
            <div className="summary-target">
              <i className="fa-solid fa-bullseye" /> {PROFILE.targetCompany} · {PROFILE.targetRole}
            </div>
          </div>
        </div>
        <div className="summary-right">
          <div className="summary-stats">
            <div><b>{experiences.length}</b><span>경력</span></div>
            <div><b>{credentials.length}</b><span>자격증·수상</span></div>
            <div><b>{essays.length}</b><span>자소서</span></div>
            <div><b>{files.length}</b><span>파일</span></div>
          </div>
          <div className="summary-completion">
            <div className="summary-completion-row">
              <span>포트폴리오 완성도</span>
              <b>{completion}%</b>
            </div>
            <div className="summary-bar"><div style={{ width: `${completion}%` }} /></div>
          </div>
          <button className="btn btn-sm summary-export"
            onClick={() => onToast('PDF 내보내기 (준비 중)')}>
            <i className="fa-solid fa-file-pdf" /> PDF 내보내기
          </button>
        </div>
      </div>

      {/* ── 탭 ── */}
      <div className="portfolio-tabs">
        {TABS.map(t => (
          <button key={t.id}
            className={`portfolio-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}>
            <i className={t.icon} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── 탭 본문 ── */}
      {tab === 'profile' && (
        <div className="card">
          <div className="card-title">
            <i className="fa-solid fa-id-card" style={{ color: '#4F46E5' }} /> 기본 정보
          </div>
          <div className="profile-grid">
            <div><label>이름</label><div>{PROFILE.name}</div></div>
            <div><label>학번</label><div>{PROFILE.studentId}</div></div>
            <div><label>학과 / 학년</label><div>{PROFILE.dept} · {PROFILE.grade}</div></div>
            <div><label>학점</label><div>{PROFILE.gpa}</div></div>
            <div><label>이메일</label><div>{PROFILE.email}</div></div>
            <div><label>연락처</label><div>{PROFILE.phone}</div></div>
            <div className="profile-grid-full"><label>목표 기업 · 직무</label><div>{PROFILE.targetCompany} · {PROFILE.targetRole}</div></div>
            <div className="profile-grid-full"><label>한 줄 소개</label><div>{PROFILE.intro}</div></div>
          </div>
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <button className="btn btn-sm btn-outline" onClick={() => onToast('프로필 편집 (준비 중)')}>
              <i className="fa-solid fa-pen" /> 편집
            </button>
          </div>
        </div>
      )}

      {tab === 'experience' && (
        <div className="card">
          <div className="card-title" style={{ justifyContent: 'space-between' }}>
            <span><i className="fa-solid fa-briefcase" style={{ color: '#4F46E5' }} /> 경력 · 활동</span>
            <button className="btn btn-sm" style={{ background: '#4F46E5', color: '#fff' }}
              onClick={() => setExpModal(true)}>
              <i className="fa-solid fa-plus" /> 항목 추가
            </button>
          </div>
          <div className="portfolio-list">
            {experiences.map(e => (
              <div key={e.id} className="portfolio-item">
                <div className="portfolio-item-head">
                  <div>
                    <div className="portfolio-item-title">{e.title}</div>
                    <div className="portfolio-item-meta">{e.org} · {e.role} · {e.period}</div>
                  </div>
                  <button className="portfolio-delete" onClick={() => handleDeleteExperience(e.id)}>
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
                <div className="portfolio-item-desc">{e.desc}</div>
                <div className="portfolio-item-tags">
                  {e.tags.map(t => <span key={t} className="portfolio-tag">{t}</span>)}
                </div>
              </div>
            ))}
            {experiences.length === 0 && (
              <div className="portfolio-empty">아직 등록된 경력이 없어요. 항목 추가 버튼을 눌러주세요.</div>
            )}
          </div>
        </div>
      )}

      {tab === 'credentials' && (
        <div className="card">
          <div className="card-title" style={{ justifyContent: 'space-between' }}>
            <span><i className="fa-solid fa-award" style={{ color: '#4F46E5' }} /> 자격증 · 수상</span>
            <button className="btn btn-sm" style={{ background: '#4F46E5', color: '#fff' }}
              onClick={() => setCredModal(true)}>
              <i className="fa-solid fa-plus" /> 항목 추가
            </button>
          </div>
          <div className="cred-grid">
            {credentials.map(c => (
              <div key={c.id} className="cred-item">
                <div className="cred-icon">
                  <i className={
                    c.type === '자격증' ? 'fa-solid fa-certificate' :
                    c.type === '수상' ? 'fa-solid fa-trophy' : 'fa-solid fa-graduation-cap'
                  } />
                </div>
                <div className="cred-body">
                  <div className="cred-name">{c.name}</div>
                  <div className="cred-meta">{c.issuer} · {c.date}</div>
                </div>
                <span className={`cred-type-badge ${c.type === '자격증' ? 'cert' : c.type === '수상' ? 'prize' : 'done'}`}>
                  {c.type}
                </span>
                <button className="portfolio-delete" onClick={() => handleDeleteCredential(c.id)}>
                  <i className="fa-solid fa-trash" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'essay' && (
        <div className="card">
          <div className="card-title" style={{ justifyContent: 'space-between' }}>
            <span><i className="fa-solid fa-pen-to-square" style={{ color: '#4F46E5' }} /> 자소서 작성</span>
            <button
              className="btn btn-sm ai-gen-btn"
              onClick={() => onNavigate('ai-resume')}>
              <i className="fa-solid fa-wand-magic-sparkles" /> AI로 생성하기
            </button>
          </div>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
            작성 중인 자소서를 관리하고, 필요하면 AI 자소서 도우미로 초안을 받아보세요.
          </p>
          <div className="essay-list">
            {essays.map(e => (
              <div key={e.id} className="essay-item" onClick={() => setEditingEssay(e)}>
                <div className="essay-head">
                  <div>
                    <div className="essay-company">{e.company}</div>
                    <div className="essay-question">{e.question}</div>
                  </div>
                  <div className="essay-meta">
                    {e.aiGenerated && <span className="essay-ai-tag"><i className="fa-solid fa-wand-magic-sparkles" /> AI 초안</span>}
                    <span className="essay-date">{e.updatedAt}</span>
                  </div>
                </div>
                <div className="essay-preview">
                  {e.content ? e.content.slice(0, 120) + (e.content.length > 120 ? '...' : '') : <span className="essay-empty-text">작성 전 — 클릭해 작성하세요</span>}
                </div>
                <div className="essay-progress">
                  <div className="essay-progress-bar" style={{ width: `${Math.min(100, Math.round((e.content.length / 1000) * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'files' && (
        <div className="card">
          <div className="card-title" style={{ justifyContent: 'space-between' }}>
            <span><i className="fa-solid fa-paperclip" style={{ color: '#4F46E5' }} /> 파일 · 링크</span>
            <button className="btn btn-sm" style={{ background: '#4F46E5', color: '#fff' }}
              onClick={() => onToast('파일 업로드 (준비 중)')}>
              <i className="fa-solid fa-upload" /> 업로드
            </button>
          </div>
          <div className="file-list">
            {files.map(f => (
              <div key={f.id} className="file-item" onClick={() => onToast(`${f.name} 열기`)}>
                <div className={`file-icon ${f.type}`}>
                  <i className={
                    f.type === 'pdf' ? 'fa-solid fa-file-pdf' :
                    f.type === 'link' ? 'fa-solid fa-link' : 'fa-solid fa-image'
                  } />
                </div>
                <div className="file-body">
                  <div className="file-name">{f.name}</div>
                  <div className="file-meta">{f.size || f.url}</div>
                </div>
                <i className="fa-solid fa-chevron-right" style={{ color: '#CBD5E1', fontSize: 12 }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 경력 추가 모달 */}
      <Modal open={expModal} onClose={() => setExpModal(false)} title="경력 · 활동 추가" size="md" footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-outline" onClick={() => setExpModal(false)}>취소</button>
          <button className="btn btn-sm" style={{ background: '#4F46E5', color: '#fff' }} onClick={handleAddExperience}>저장</button>
        </div>
      }>
        <FormField label="제목" value={expDraft.title} onChange={v => setExpDraft({ ...expDraft, title: v })} placeholder="예: 캡스톤 디자인 프로젝트" />
        <FormField label="소속 / 기관" value={expDraft.org} onChange={v => setExpDraft({ ...expDraft, org: v })} placeholder="예: 창원대학교 컴퓨터공학과" />
        <FormField label="기간" value={expDraft.period} onChange={v => setExpDraft({ ...expDraft, period: v })} placeholder="예: 2026.03 ~ 진행중" />
        <FormField label="역할" value={expDraft.role} onChange={v => setExpDraft({ ...expDraft, role: v })} placeholder="예: PM / 프론트엔드" />
        <FormField label="설명" value={expDraft.desc} onChange={v => setExpDraft({ ...expDraft, desc: v })} placeholder="활동 내용을 간단히 적어주세요" />
        <FormField label="태그 (쉼표로 구분)" value={expDraft.tags} onChange={v => setExpDraft({ ...expDraft, tags: v })} placeholder="예: React, Python, AI" />
      </Modal>

      {/* 자격증 추가 모달 */}
      <Modal open={credModal} onClose={() => setCredModal(false)} title="자격증 · 수상 추가" size="md" footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-outline" onClick={() => setCredModal(false)}>취소</button>
          <button className="btn btn-sm" style={{ background: '#4F46E5', color: '#fff' }} onClick={handleAddCredential}>저장</button>
        </div>
      }>
        <FormField label="구분" type="select" value={credDraft.type} onChange={v => setCredDraft({ ...credDraft, type: v as CredentialItem['type'] })} options={[
          { value: '자격증', label: '자격증' },
          { value: '수상', label: '수상' },
          { value: '수료', label: '수료' },
        ]} />
        <FormField label="명칭" value={credDraft.name} onChange={v => setCredDraft({ ...credDraft, name: v })} placeholder="예: SQLD" />
        <FormField label="발급기관" value={credDraft.issuer} onChange={v => setCredDraft({ ...credDraft, issuer: v })} placeholder="예: 한국데이터산업진흥원" />
        <FormField label="취득일" value={credDraft.date} onChange={v => setCredDraft({ ...credDraft, date: v })} placeholder="예: 2025.11" />
      </Modal>

      {/* 자소서 편집 모달 */}
      <Modal open={editingEssay !== null} onClose={() => setEditingEssay(null)}
        title={editingEssay ? `${editingEssay.company} — 자소서 편집` : ''} size="lg" footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-outline" onClick={() => setEditingEssay(null)}>취소</button>
          <button className="btn btn-sm" style={{ background: '#4F46E5', color: '#fff' }} onClick={handleSaveEssay}>저장</button>
        </div>
      }>
        {editingEssay && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
              {editingEssay.question}
            </div>
            <textarea
              value={editingEssay.content}
              onChange={e => setEditingEssay({ ...editingEssay, content: e.target.value })}
              placeholder="내용을 작성해주세요..."
              className="essay-textarea"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: '#64748B' }}>
              <span>{editingEssay.content.length} 자</span>
              <button className="btn btn-sm ai-gen-btn" onClick={() => { setEditingEssay(null); onNavigate('ai-resume'); }}>
                <i className="fa-solid fa-wand-magic-sparkles" /> AI 자소서 도우미로 이동
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
