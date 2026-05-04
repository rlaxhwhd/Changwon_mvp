import { useState } from 'react';
import Modal from '../components/Modal';

interface ProgramReviewProps {
  onToast: (msg: string) => void;
}

interface Review { program: string; rating: number; text: string; date: string; author: string; }

const INITIAL_REVIEWS: Review[] = [
  { program: 'IT PM 직무 특강', rating: 5, text: '현직 PM의 실무 이야기를 들을 수 있어서 정말 유익했습니다. 게임 프로젝트 관리에 대한 구체적인 사례를 많이 배웠어요.', date: '2025.04.02', author: '김OO' },
  { program: '이력서 클리닉', rating: 4, text: 'AI 첨삭과 전문가 피드백을 동시에 받을 수 있어서 좋았습니다. 이력서가 훨씬 좋아졌어요.', date: '2025.03.28', author: '이OO' },
];

export default function ProgramReview({ onToast }: ProgramReviewProps) {
  const [reviews, setReviews] = useState(INITIAL_REVIEWS);
  const [writeModal, setWriteModal] = useState(false);
  const [detailIdx, setDetailIdx] = useState<number | null>(null);
  const [form, setForm] = useState({ program: '', rating: 0, text: '' });

  const detail = detailIdx !== null ? reviews[detailIdx] : null;

  return (
    <div>
      <div className="page-header">
        <h1>프로그램 후기</h1>
        <p>참여한 프로그램의 후기를 작성하고 공유하세요</p>
      </div>

      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span><i className="fa-solid fa-comment-dots" style={{ color: '#6366F1' }} /> 후기 목록</span>
          <button className="btn btn-sm btn-primary" onClick={() => { setForm({ program: '', rating: 0, text: '' }); setWriteModal(true); }}>
            <i className="fa-solid fa-pen" /> 후기 작성
          </button>
        </div>
        {reviews.length === 0 ? (
          <div className="empty-state">
            <i className="fa-solid fa-comment-slash" />
            <p>아직 작성된 후기가 없습니다</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>프로그램</th><th>평점</th><th>작성자</th><th>날짜</th><th></th></tr></thead>
              <tbody>
                {reviews.map((r, i) => (
                  <tr key={i} className="clickable-row" onClick={() => setDetailIdx(i)}>
                    <td style={{ fontWeight: 600 }}>{r.program}</td>
                    <td>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</td>
                    <td>{r.author}</td>
                    <td>{r.date}</td>
                    <td><i className="fa-solid fa-chevron-right" style={{ color: '#9CA3AF', fontSize: 12 }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 후기 작성 모달 */}
      <Modal open={writeModal} onClose={() => setWriteModal(false)} title="후기 작성" size="md" footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-outline" onClick={() => setWriteModal(false)}>취소</button>
          <button className="btn btn-sm" style={{ background: '#4F46E5', color: '#fff' }}
            onClick={() => {
              if (form.program && form.rating && form.text) {
                setReviews(prev => [{ ...form, date: '2025.04.06', author: '김민준' }, ...prev]);
                setWriteModal(false);
                onToast('후기가 등록되었습니다');
              }
            }}>등록</button>
        </div>
      }>
        <div className="form-field">
          <label>프로그램 선택</label>
          <select value={form.program} onChange={e => setForm({ ...form, program: e.target.value })}>
            <option value="">선택하세요</option>
            <option value="이력서 클리닉">이력서 클리닉</option>
            <option value="모의면접 캠프">모의면접 캠프</option>
            <option value="IT PM 직무 특강">IT PM 직무 특강</option>
            <option value="포트폴리오 워크숍">포트폴리오 워크숍</option>
          </select>
        </div>
        <div className="form-field">
          <label>평점</label>
          <div className="star-rating">
            {[1, 2, 3, 4, 5].map(n => (
              <i key={n} className={`fa-solid fa-star ${n <= form.rating ? 'active' : ''}`}
                onClick={() => setForm({ ...form, rating: n })} />
            ))}
          </div>
        </div>
        <div className="form-field">
          <label>후기 내용</label>
          <textarea rows={4} value={form.text} onChange={e => setForm({ ...form, text: e.target.value })}
            placeholder="프로그램 참여 후기를 작성해주세요" />
        </div>
      </Modal>

      {/* 후기 상세 모달 */}
      <Modal open={detailIdx !== null} onClose={() => setDetailIdx(null)} title="후기 상세" size="md">
        {detail && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <span className="badge badge-indigo" style={{ marginRight: 8 }}>{detail.program}</span>
              <span style={{ color: '#F59E0B' }}>{'★'.repeat(detail.rating)}{'☆'.repeat(5 - detail.rating)}</span>
            </div>
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.8, marginBottom: 16 }}>{detail.text}</p>
            <div style={{ fontSize: 13, color: '#9CA3AF' }}>{detail.author} · {detail.date}</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
