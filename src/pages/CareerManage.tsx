import { useState } from 'react';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

interface CareerManageProps {
  onToast: (msg: string) => void;
}

interface Cert { name: string; issuer: string; date: string; }
interface Lang { test: string; score: string; date: string; }
interface Project { name: string; type: string; period: string; role: string; desc: string; stack: string; }

export default function CareerManage({ onToast }: CareerManageProps) {
  const [certs, setCerts] = useState<Cert[]>([{ name: 'SQLD', issuer: '한국데이터산업진흥원', date: '2025-08-15' }]);
  const [langs, setLangs] = useState<Lang[]>([]);
  const [projects, setProjects] = useState<Project[]>([{ name: '학과 홈페이지 리뉴얼', type: '팀 프로젝트', period: '2025-09 ~ 2025-12', role: '프론트엔드 개발', desc: 'React 기반 학과 홈페이지 리뉴얼 프로젝트', stack: 'React, TypeScript, CSS' }]);

  // modal states
  const [certModal, setCertModal] = useState(false);
  const [langModal, setLangModal] = useState(false);
  const [projDrawer, setProjDrawer] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; idx: number } | null>(null);

  // form states
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

  return (
    <div>
      <div className="page-header">
        <h1>경력개발 관리</h1>
        <p>자격증, 어학, 프로젝트, 비교과 이력을 관리하세요</p>
      </div>

      {/* 자격증 */}
      <div className="card mb-24">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span><i className="fa-solid fa-certificate" style={{ color: '#F59E0B' }} /> 자격증</span>
          <button className="btn btn-sm btn-outline" onClick={() => { setCertForm({ name: '', issuer: '', date: '' }); setCertModal(true); }}>
            <i className="fa-solid fa-plus" /> 자격증 추가
          </button>
        </div>
        {certs.length === 0 ? (
          <EmptyState icon="fa-solid fa-certificate" message="등록된 자격증이 없습니다" action={{ label: '자격증 추가', onClick: () => setCertModal(true) }} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>자격증명</th><th>발급기관</th><th>취득일</th><th>상태</th><th></th></tr></thead>
              <tbody>
                {certs.map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.issuer}</td>
                    <td>{c.date}</td>
                    <td><span className="badge badge-green">취득완료</span></td>
                    <td>
                      <button className="btn btn-sm btn-outline" style={{ color: '#EF4444', borderColor: '#FCA5A5', padding: '2px 8px' }}
                        onClick={() => setDeleteConfirm({ type: 'cert', idx: i })}>
                        <i className="fa-solid fa-trash" style={{ fontSize: 11 }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 어학 */}
      <div className="card mb-24">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span><i className="fa-solid fa-language" style={{ color: '#3B82F6' }} /> 어학 성적</span>
          <button className="btn btn-sm btn-outline" onClick={() => { setLangForm({ test: '', score: '', date: '' }); setLangModal(true); }}>
            <i className="fa-solid fa-plus" /> 성적 추가
          </button>
        </div>
        {langs.length === 0 ? (
          <EmptyState icon="fa-solid fa-language" message="등록된 어학 성적이 없습니다" action={{ label: '성적 추가', onClick: () => setLangModal(true) }} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>시험</th><th>점수</th><th>취득일</th><th></th></tr></thead>
              <tbody>
                {langs.map((l, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{l.test}</td>
                    <td>{l.score}</td>
                    <td>{l.date}</td>
                    <td>
                      <button className="btn btn-sm btn-outline" style={{ color: '#EF4444', borderColor: '#FCA5A5', padding: '2px 8px' }}
                        onClick={() => setDeleteConfirm({ type: 'lang', idx: i })}>
                        <i className="fa-solid fa-trash" style={{ fontSize: 11 }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 프로젝트 */}
      <div className="card mb-24">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span><i className="fa-solid fa-diagram-project" style={{ color: '#6366F1' }} /> 프로젝트 경험</span>
          <button className="btn btn-sm btn-outline" onClick={() => { setProjForm({ name: '', type: '', period: '', role: '', desc: '', stack: '' }); setProjDrawer(true); }}>
            <i className="fa-solid fa-plus" /> 프로젝트 추가
          </button>
        </div>
        {projects.length === 0 ? (
          <EmptyState icon="fa-solid fa-diagram-project" message="등록된 프로젝트가 없습니다" action={{ label: '프로젝트 추가', onClick: () => setProjDrawer(true) }} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>프로젝트명</th><th>유형</th><th>기간</th><th>역할</th><th></th></tr></thead>
              <tbody>
                {projects.map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.type}</td>
                    <td>{p.period}</td>
                    <td>{p.role}</td>
                    <td>
                      <button className="btn btn-sm btn-outline" style={{ color: '#EF4444', borderColor: '#FCA5A5', padding: '2px 8px' }}
                        onClick={() => setDeleteConfirm({ type: 'proj', idx: i })}>
                        <i className="fa-solid fa-trash" style={{ fontSize: 11 }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 비교과 */}
      <div className="card">
        <div className="card-title"><i className="fa-solid fa-puzzle-piece" style={{ color: '#22C55E' }} /> 비교과 활동</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>활동명</th><th>유형</th><th>기간</th><th>상태</th></tr></thead>
            <tbody>
              <tr><td style={{ fontWeight: 600 }}>SW 봉사단</td><td>봉사활동</td><td>2025-03 ~ 2025-06</td><td><span className="badge badge-green">완료</span></td></tr>
              <tr><td style={{ fontWeight: 600 }}>코딩 동아리 'BYTE'</td><td>동아리</td><td>2025-03 ~ 현재</td><td><span className="badge badge-indigo">진행중</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 자격증 등록 모달 */}
      <Modal open={certModal} onClose={() => setCertModal(false)} title="자격증 등록" size="sm" footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-outline" onClick={() => setCertModal(false)}>취소</button>
          <button className="btn btn-sm" style={{ background: '#4F46E5', color: '#fff' }}
            onClick={() => { if (certForm.name) { setCerts(prev => [...prev, certForm]); setCertModal(false); onToast('자격증이 등록되었습니다'); } }}>
            등록
          </button>
        </div>
      }>
        <FormField label="자격증명" value={certForm.name} onChange={v => setCertForm({ ...certForm, name: v })} placeholder="예: 정보처리기사" />
        <FormField label="발급기관" value={certForm.issuer} onChange={v => setCertForm({ ...certForm, issuer: v })} placeholder="예: 한국산업인력공단" />
        <FormField label="취득일" type="date" value={certForm.date} onChange={v => setCertForm({ ...certForm, date: v })} />
      </Modal>

      {/* 어학 등록 모달 */}
      <Modal open={langModal} onClose={() => setLangModal(false)} title="어학 성적 등록" size="sm" footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-outline" onClick={() => setLangModal(false)}>취소</button>
          <button className="btn btn-sm" style={{ background: '#4F46E5', color: '#fff' }}
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

      {/* 프로젝트 등록 Drawer */}
      <Modal size="lg"open={projDrawer} onClose={() => setProjDrawer(false)} title="프로젝트 등록" footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-outline" onClick={() => setProjDrawer(false)}>취소</button>
          <button className="btn btn-sm" style={{ background: '#4F46E5', color: '#fff' }}
            onClick={() => { if (projForm.name) { setProjects(prev => [...prev, projForm]); setProjDrawer(false); onToast('프로젝트가 등록되었습니다'); } }}>
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
        <FormField label="역할" value={projForm.role} onChange={v => setProjForm({ ...projForm, role: v })} placeholder="예: PM / 프론트엔드 개발" />
        <FormField label="설명" type="textarea" value={projForm.desc} onChange={v => setProjForm({ ...projForm, desc: v })} />
        <FormField label="기술스택" value={projForm.stack} onChange={v => setProjForm({ ...projForm, stack: v })} placeholder="예: React, Spring Boot" />
      </Modal>

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="삭제 확인"
        message="정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        danger
      />
    </div>
  );
}
