import { useState } from 'react';

interface AiResumeProps {
  onToast: (msg: string, type?: 'info' | 'success') => void;
}

type ViewMode = 'list' | 'create' | 'consult';

interface SavedResume {
  id: string;
  title: string;
  company: string;
  jobType: string;
  position: string;
  category: string;
  categoryLabel: string;
  content: string;
  createdAt: string;
}

interface Evaluation {
  score: number;
  grades: { label: string; score: number; comment: string }[];
  suggestions: string[];
}

const categories = [
  { id: 'free', label: '자유형식', icon: 'fa-solid fa-pen-fancy', desc: '자유롭게 자기소개' },
  { id: 'strength', label: '강점', icon: 'fa-solid fa-star', desc: '나의 핵심 역량' },
  { id: 'values', label: '가치관', icon: 'fa-solid fa-heart', desc: '직업관 및 인생관' },
  { id: 'experience', label: '직무관련경험', icon: 'fa-solid fa-briefcase', desc: '관련 경험 및 성과' },
  { id: 'hardship', label: '힘들었던 경험', icon: 'fa-solid fa-mountain', desc: '극복 과정과 배움' },
  { id: 'motivation', label: '지원동기', icon: 'fa-solid fa-rocket', desc: '왜 이 회사/직무인가' },
  { id: 'growth', label: '성장과정', icon: 'fa-solid fa-seedling', desc: '나를 만든 경험들' },
  { id: 'teamwork', label: '협업경험', icon: 'fa-solid fa-people-group', desc: '팀워크와 소통 능력' },
];

const createSteps = [
  { num: 1, label: '기본정보 입력' },
  { num: 2, label: '카테고리 선택' },
  { num: 3, label: 'AI 자소서 생성' },
];

const mockGenerated = `저는 컴퓨터공학을 전공하며 소프트웨어 개발에 대한 열정을 키워왔습니다. 대학 시절 다양한 프로젝트 경험을 통해 문제 해결 능력과 팀워크를 체득했으며, 특히 웹 애플리케이션 개발 분야에서 깊은 역량을 쌓아왔습니다.

3학년 때 참여한 '캠퍼스 커뮤니티 플랫폼' 프로젝트에서 백엔드 개발을 담당하며, React와 Node.js 기반의 풀스택 개발 경험을 쌓았습니다. 이 프로젝트는 교내 해커톤에서 최우수상을 수상하였고, 실제 학생 500명 이상이 사용하는 서비스로 발전시켰습니다.

또한 인턴십을 통해 애자일 방법론에 기반한 협업 프로세스를 경험했습니다. 2주 단위 스프린트를 통해 지속적으로 제품을 개선하는 과정에서, 기술적 역량뿐 아니라 커뮤니케이션과 일정 관리의 중요성을 깨달았습니다.

귀사의 혁신적인 기술 문화와 성장 지향적인 조직 문화에 깊이 공감하며, 저의 개발 역량과 문제 해결 능력으로 팀에 기여하고 싶습니다. 끊임없이 학습하고 성장하는 개발자가 되어, 사용자에게 가치 있는 서비스를 만들어 나가겠습니다.`;

const mockEvaluation: Evaluation = {
  score: 82,
  grades: [
    { label: '논리적 구성', score: 85, comment: '서론-본론-결론 구조가 명확합니다.' },
    { label: '직무 연관성', score: 78, comment: '직무 관련 경험을 더 구체적으로 기술하면 좋겠습니다.' },
    { label: '차별화 포인트', score: 80, comment: '해커톤 수상 경험이 좋은 차별화 요소입니다.' },
    { label: '구체성', score: 75, comment: '성과를 수치화하여 표현한 점이 좋으나, 더 많은 구체적 사례가 필요합니다.' },
    { label: '진정성', score: 88, comment: '지원 동기와 개인의 경험이 자연스럽게 연결됩니다.' },
  ],
  suggestions: [
    '직무 관련 기술 스택을 더 구체적으로 언급해보세요.',
    '인턴십 경험에서 본인만의 기여도를 수치로 표현하면 더 좋습니다.',
    '마지막 문단에서 입사 후 구체적인 목표를 추가하면 설득력이 높아집니다.',
  ],
};

const INITIAL_RESUMES: SavedResume[] = [
  {
    id: 'r1',
    title: '삼성전자 SW직군 자기소개서',
    company: '삼성전자',
    jobType: 'IT/SW',
    position: '백엔드 개발',
    category: 'motivation',
    categoryLabel: '지원동기',
    content: mockGenerated,
    createdAt: '2026-03-21',
  },
  {
    id: 'r2',
    title: '네이버 신입 공채',
    company: '네이버',
    jobType: 'IT/SW',
    position: '프론트엔드 개발',
    category: 'strength',
    categoryLabel: '강점',
    content: mockGenerated,
    createdAt: '2026-03-15',
  },
  {
    id: 'r3',
    title: '카카오 인턴십 지원서',
    company: '카카오',
    jobType: 'IT/SW',
    position: '풀스택 개발',
    category: 'experience',
    categoryLabel: '직무관련경험',
    content: mockGenerated,
    createdAt: '2026-02-28',
  },
];

export default function AiResume({ onToast }: AiResumeProps) {
  const [view, setView] = useState<ViewMode>('list');
  const [resumes, setResumes] = useState<SavedResume[]>(INITIAL_RESUMES);

  // Create flow state
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [jobType, setJobType] = useState('');
  const [position, setPosition] = useState('');
  const [company, setCompany] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [keywords, setKeywords] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState('');
  const [editedText, setEditedText] = useState('');

  // Consult flow state
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  const canProceedStep1 = title.trim() && jobType.trim() && position.trim() && company.trim();
  const canProceedStep2 = selectedCat && keywords.trim();

  const resetCreateState = () => {
    setStep(1);
    setTitle('');
    setJobType('');
    setPosition('');
    setCompany('');
    setSelectedCat(null);
    setKeywords('');
    setGenerated('');
    setEditedText('');
    setIsGenerating(false);
  };

  const resetConsultState = () => {
    setSelectedResumeId(null);
    setEvaluation(null);
    setIsEvaluating(false);
  };

  const goToList = () => {
    resetCreateState();
    resetConsultState();
    setView('list');
  };

  const handleStartCreate = () => {
    resetCreateState();
    setView('create');
  };

  const handleStartConsult = () => {
    if (resumes.length === 0) {
      onToast('컨설팅을 받을 자소서가 없습니다. 먼저 자소서를 생성해주세요.');
      return;
    }
    resetConsultState();
    setView('consult');
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setGenerated(mockGenerated);
      setEditedText(mockGenerated);
      setIsGenerating(false);
    }, 1500);
  };

  const handleSaveAndComplete = () => {
    const cat = categories.find(c => c.id === selectedCat);
    const newResume: SavedResume = {
      id: `r${Date.now()}`,
      title: title.trim(),
      company: company.trim(),
      jobType,
      position: position.trim(),
      category: selectedCat || 'free',
      categoryLabel: cat?.label || '자유형식',
      content: editedText,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setResumes([newResume, ...resumes]);
    onToast('자소서가 저장되었습니다!', 'success');
    goToList();
  };

  const handleDeleteResume = (id: string) => {
    setResumes(resumes.filter(r => r.id !== id));
    onToast('자소서가 삭제되었습니다');
  };

  const handleEvaluate = () => {
    if (!selectedResumeId) return;
    setIsEvaluating(true);
    setTimeout(() => {
      setEvaluation(mockEvaluation);
      setIsEvaluating(false);
    }, 1800);
  };

  const selectedResume = resumes.find(r => r.id === selectedResumeId);

  return (
    <div>
      <div className="page-header">
        <h1>AI 자소서 / 인터뷰</h1>
        <p>AI가 작성을 도와주고, 완성된 자소서를 평가해드립니다</p>
      </div>

      {/* ─────────── LIST VIEW ─────────── */}
      {view === 'list' && (
        <>
          <div className="ar-list-header">
            <div>
              <h2 className="ar-list-title">
                <i className="fa-solid fa-folder-open" /> 작성된 자소서
              </h2>
              <p className="ar-list-sub">총 {resumes.length}개의 자소서가 저장되어 있습니다.</p>
            </div>
          </div>

          {resumes.length === 0 ? (
            <div className="ar-empty">
              <i className="fa-solid fa-file-circle-plus" />
              <p>아직 작성된 자소서가 없습니다.</p>
              <p className="ar-empty-sub">아래 [AI 자소서 생성] 버튼을 눌러 첫 자소서를 만들어보세요.</p>
            </div>
          ) : (
            <div className="ar-resume-list">
              {resumes.map(r => (
                <div key={r.id} className="ar-resume-card">
                  <div className="ar-resume-card-head">
                    <div className="ar-resume-cat-badge">{r.categoryLabel}</div>
                    <button
                      className="ar-resume-del"
                      onClick={() => handleDeleteResume(r.id)}
                      aria-label="삭제"
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                  <h3 className="ar-resume-card-title">{r.title}</h3>
                  <div className="ar-resume-meta">
                    <span><i className="fa-solid fa-building" /> {r.company}</span>
                    <span><i className="fa-solid fa-briefcase" /> {r.jobType} · {r.position}</span>
                  </div>
                  <p className="ar-resume-preview">{r.content.slice(0, 100)}...</p>
                  <div className="ar-resume-card-foot">
                    <span className="ar-resume-date">
                      <i className="fa-solid fa-calendar" /> {r.createdAt}
                    </span>
                    <span className="ar-resume-chars">{r.content.length}자</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="ar-action-panel">
            <button className="ar-action-btn ar-action-create" onClick={handleStartCreate}>
              <div className="ar-action-icon">
                <i className="fa-solid fa-wand-magic-sparkles" />
              </div>
              <div className="ar-action-text">
                <div className="ar-action-title">AI 자소서 생성</div>
                <div className="ar-action-desc">기본정보 입력부터 AI 생성까지 한 번에</div>
              </div>
              <i className="fa-solid fa-arrow-right ar-action-arrow" />
            </button>
            <button className="ar-action-btn ar-action-consult" onClick={handleStartConsult}>
              <div className="ar-action-icon">
                <i className="fa-solid fa-magnifying-glass-chart" />
              </div>
              <div className="ar-action-text">
                <div className="ar-action-title">AI 컨설팅</div>
                <div className="ar-action-desc">작성된 자소서를 AI가 평가합니다</div>
              </div>
              <i className="fa-solid fa-arrow-right ar-action-arrow" />
            </button>
          </div>
        </>
      )}

      {/* ─────────── CREATE VIEW ─────────── */}
      {view === 'create' && (
        <>
          <div className="ar-back-bar">
            <button className="ar-back-btn" onClick={goToList}>
              <i className="fa-solid fa-arrow-left" /> 목록으로
            </button>
          </div>

          <div className="ar-steps">
            {createSteps.map((s, idx) => (
              <div key={s.num} className={`ar-step ${step === s.num ? 'ar-step-active' : ''} ${step > s.num ? 'ar-step-done' : ''}`}>
                <div className="ar-step-num">
                  {step > s.num ? <i className="fa-solid fa-check" /> : s.num}
                </div>
                <span className="ar-step-label">{s.label}</span>
                {idx < createSteps.length - 1 && <div className="ar-step-line" />}
              </div>
            ))}
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <div className="ar-card">
              <h2 className="ar-card-title">
                <i className="fa-solid fa-pen-to-square" /> 기본정보 입력
              </h2>
              <p className="ar-card-desc">자소서 작성을 위한 필수 정보를 입력해주세요.</p>
              <div className="ar-form">
                <div className="ar-field">
                  <label>자소서 제목 <span className="ar-required">*</span></label>
                  <input type="text" placeholder="예: 삼성전자 SW직군 자기소개서" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div className="ar-field-row">
                  <div className="ar-field">
                    <label>직종 <span className="ar-required">*</span></label>
                    <select value={jobType} onChange={e => setJobType(e.target.value)}>
                      <option value="">선택하세요</option>
                      <option value="IT/SW">IT / SW 개발</option>
                      <option value="경영/기획">경영 / 기획</option>
                      <option value="마케팅">마케팅</option>
                      <option value="디자인">디자인</option>
                      <option value="연구/R&D">연구 / R&D</option>
                      <option value="영업">영업</option>
                      <option value="생산/제조">생산 / 제조</option>
                      <option value="기타">기타</option>
                    </select>
                  </div>
                  <div className="ar-field">
                    <label>직무 <span className="ar-required">*</span></label>
                    <input type="text" placeholder="예: 백엔드 개발" value={position} onChange={e => setPosition(e.target.value)} />
                  </div>
                </div>
                <div className="ar-field">
                  <label>기업이름 <span className="ar-required">*</span></label>
                  <input type="text" placeholder="예: 삼성전자" value={company} onChange={e => setCompany(e.target.value)} />
                </div>
              </div>
              <div className="ar-actions">
                <button className="ar-btn-primary" disabled={!canProceedStep1} onClick={() => setStep(2)}>
                  다음 <i className="fa-solid fa-arrow-right" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="ar-card">
              <h2 className="ar-card-title">
                <i className="fa-solid fa-layer-group" /> 카테고리 선택
              </h2>
              <p className="ar-card-desc">자소서 항목을 선택하고, AI에게 전달할 키워드를 입력하세요.</p>

              <div className="ar-field" style={{ marginBottom: 24 }}>
                <label>
                  <i className="fa-solid fa-list" style={{ marginRight: 6 }} />
                  자소서 항목 카테고리 <span className="ar-required">*</span>
                </label>
                <select
                  value={selectedCat || ''}
                  onChange={e => setSelectedCat(e.target.value || null)}
                >
                  <option value="">카테고리를 선택하세요</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label} — {cat.desc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ar-field">
                <label>
                  <i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: 6 }} />
                  AI에게 전달할 키워드 / 문장 <span className="ar-required">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="예: 팀 프로젝트 리더 경험, 해커톤 수상, 인턴십 6개월, 문제해결 능력, React/Node.js 기술스택"
                  value={keywords}
                  onChange={e => setKeywords(e.target.value)}
                />
              </div>

              <div className="ar-actions">
                <button className="ar-btn-outline" onClick={() => setStep(1)}>
                  <i className="fa-solid fa-arrow-left" /> 이전
                </button>
                <button className="ar-btn-primary" disabled={!canProceedStep2} onClick={() => { setStep(3); handleGenerate(); }}>
                  생성하기 <i className="fa-solid fa-wand-magic-sparkles" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="ar-card">
              <h2 className="ar-card-title">
                <i className="fa-solid fa-robot" /> AI 자소서 생성 결과
              </h2>

              <div className="ar-summary">
                <div className="ar-summary-item">
                  <span className="ar-summary-label">제목</span>
                  <span className="ar-summary-value">{title}</span>
                </div>
                <div className="ar-summary-item">
                  <span className="ar-summary-label">기업</span>
                  <span className="ar-summary-value">{company}</span>
                </div>
                <div className="ar-summary-item">
                  <span className="ar-summary-label">직무</span>
                  <span className="ar-summary-value">{jobType} · {position}</span>
                </div>
                <div className="ar-summary-item">
                  <span className="ar-summary-label">카테고리</span>
                  <span className="ar-summary-value">{categories.find(c => c.id === selectedCat)?.label}</span>
                </div>
              </div>

              {isGenerating ? (
                <div className="ar-generating">
                  <div className="ar-spinner" />
                  <p>AI가 자소서를 작성하고 있습니다...</p>
                  <p className="ar-generating-sub">입력하신 정보를 분석하여 최적의 자소서를 생성합니다</p>
                </div>
              ) : (
                <>
                  <div className="ar-field">
                    <label>
                      생성된 자소서
                      <span className="ar-char-count">{editedText.length}자</span>
                    </label>
                    <textarea
                      className="ar-generated-text"
                      rows={14}
                      value={editedText}
                      onChange={e => setEditedText(e.target.value)}
                    />
                  </div>
                  <div className="ar-text-tools">
                    <button className="ar-tool-btn" onClick={() => { setEditedText(generated); onToast('원본으로 복원되었습니다'); }}>
                      <i className="fa-solid fa-rotate-left" /> 원본 복원
                    </button>
                    <button className="ar-tool-btn" onClick={() => { navigator.clipboard.writeText(editedText); onToast('클립보드에 복사되었습니다', 'success'); }}>
                      <i className="fa-solid fa-copy" /> 복사
                    </button>
                    <button className="ar-tool-btn" onClick={() => { handleGenerate(); onToast('다시 생성합니다...'); }}>
                      <i className="fa-solid fa-arrows-rotate" /> 재생성
                    </button>
                  </div>
                </>
              )}

              <div className="ar-actions">
                <button className="ar-btn-outline" onClick={() => setStep(2)}>
                  <i className="fa-solid fa-arrow-left" /> 이전
                </button>
                {!isGenerating && generated && (
                  <button className="ar-btn-primary" onClick={handleSaveAndComplete}>
                    <i className="fa-solid fa-floppy-disk" /> 저장 후 완료
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─────────── CONSULT VIEW ─────────── */}
      {view === 'consult' && (
        <>
          <div className="ar-back-bar">
            <button className="ar-back-btn" onClick={goToList}>
              <i className="fa-solid fa-arrow-left" /> 목록으로
            </button>
          </div>

          {/* Step A: pick a resume */}
          {!evaluation && !isEvaluating && (
            <div className="ar-card">
              <h2 className="ar-card-title">
                <i className="fa-solid fa-magnifying-glass-chart" /> AI 컨설팅 - 자소서 선택
              </h2>
              <p className="ar-card-desc">컨설팅을 받을 자소서를 선택해주세요.</p>

              <div className="ar-consult-pick">
                {resumes.map(r => (
                  <div
                    key={r.id}
                    className={`ar-consult-pick-item ${selectedResumeId === r.id ? 'ar-consult-pick-selected' : ''}`}
                    onClick={() => setSelectedResumeId(r.id)}
                  >
                    <div className="ar-consult-pick-radio">
                      {selectedResumeId === r.id && <i className="fa-solid fa-check" />}
                    </div>
                    <div className="ar-consult-pick-body">
                      <div className="ar-consult-pick-head">
                        <span className="ar-resume-cat-badge">{r.categoryLabel}</span>
                        <span className="ar-resume-date">
                          <i className="fa-solid fa-calendar" /> {r.createdAt}
                        </span>
                      </div>
                      <h3 className="ar-consult-pick-title">{r.title}</h3>
                      <div className="ar-resume-meta">
                        <span><i className="fa-solid fa-building" /> {r.company}</span>
                        <span><i className="fa-solid fa-briefcase" /> {r.jobType} · {r.position}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="ar-actions">
                <button className="ar-btn-outline" onClick={goToList}>
                  취소
                </button>
                <button className="ar-btn-primary" disabled={!selectedResumeId} onClick={handleEvaluate}>
                  <i className="fa-solid fa-play" /> AI 평가 시작
                </button>
              </div>
            </div>
          )}

          {isEvaluating && (
            <div className="ar-card">
              <div className="ar-generating">
                <div className="ar-spinner" />
                <p>AI가 자소서를 분석하고 있습니다...</p>
                <p className="ar-generating-sub">논리적 구성, 직무 연관성, 차별화 포인트 등을 종합 분석합니다</p>
              </div>
            </div>
          )}

          {evaluation && selectedResume && (
            <div className="ar-card">
              <h2 className="ar-card-title">
                <i className="fa-solid fa-clipboard-check" /> AI 컨설팅 평가 결과
              </h2>

              <div className="ar-summary">
                <div className="ar-summary-item">
                  <span className="ar-summary-label">자소서</span>
                  <span className="ar-summary-value">{selectedResume.title}</span>
                </div>
                <div className="ar-summary-item">
                  <span className="ar-summary-label">기업</span>
                  <span className="ar-summary-value">{selectedResume.company}</span>
                </div>
                <div className="ar-summary-item">
                  <span className="ar-summary-label">카테고리</span>
                  <span className="ar-summary-value">{selectedResume.categoryLabel}</span>
                </div>
              </div>

              <div className="ar-eval-result">
                <div className="ar-eval-score-box">
                  <div className="ar-eval-total">
                    <div className="ar-eval-total-num">{evaluation.score}</div>
                    <div className="ar-eval-total-label">종합점수</div>
                  </div>
                  <div className="ar-eval-grades">
                    {evaluation.grades.map((g, i) => (
                      <div key={i} className="ar-eval-grade-row">
                        <div className="ar-eval-grade-header">
                          <span className="ar-eval-grade-label">{g.label}</span>
                          <span className="ar-eval-grade-score">{g.score}점</span>
                        </div>
                        <div className="ar-eval-bar-bg">
                          <div className="ar-eval-bar-fill" style={{ width: `${g.score}%` }} />
                        </div>
                        <p className="ar-eval-grade-comment">{g.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="ar-eval-suggest">
                  <h3><i className="fa-solid fa-lightbulb" /> 개선 제안</h3>
                  <ul>
                    {evaluation.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="ar-actions">
                  <button className="ar-btn-outline" onClick={() => { setEvaluation(null); setSelectedResumeId(null); }}>
                    <i className="fa-solid fa-arrow-left" /> 다른 자소서 평가
                  </button>
                  <button className="ar-btn-primary" onClick={goToList}>
                    <i className="fa-solid fa-house" /> 목록으로
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
