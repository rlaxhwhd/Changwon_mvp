import { useState } from 'react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

interface CounselFormProps {
  type: 'career' | 'employ' | 'prof';
  onToast: (msg: string, type?: 'info' | 'success') => void;
}

const titles: Record<string, { title: string; desc: string; icon: string }> = {
  career: { title: '진로상담 신청', desc: '진로 고민을 전문 상담사와 함께 해결하세요', icon: 'fa-solid fa-comments' },
  employ: { title: '취업·심리상담 신청', desc: '취업 스트레스, 심리 상담을 신청하세요', icon: 'fa-solid fa-heart-pulse' },
  prof: { title: '지도교수 상담 신청', desc: '지도교수님과의 상담을 신청하세요', icon: 'fa-solid fa-user-tie' },
};

interface Reservation {
  id: number;
  date: string;
  time: string;
  topic: string;
  status: '예약확정' | '대기중' | '완료';
  counselor: string;
  memo?: string;
}

const pastReservations: Record<string, Reservation[]> = {
  career: [
    { id: 1, date: '2026-03-20', time: '14:00', topic: '진로 방향 설정', status: '완료', counselor: '정수연 상담사', memo: '게임 PM 직무에 대한 상담을 진행했습니다. TOEIC 준비와 프로젝트 경험 쌓기를 추천받았습니다.' },
    { id: 2, date: '2026-04-07', time: '10:00', topic: '전공 적성 상담', status: '예약확정', counselor: '정수연 상담사' },
  ],
  employ: [
    { id: 3, date: '2026-03-15', time: '15:00', topic: '취업 준비 전략', status: '완료', counselor: '김영희 상담사', memo: '이력서 작성법과 자기소개서 구조에 대해 코칭받았습니다.' },
  ],
  prof: [
    { id: 4, date: '2026-03-10', time: '11:00', topic: '학업 상담', status: '완료', counselor: '박지훈 교수', memo: '3학년 수강신청 및 캡스톤 디자인 준비에 대해 상담했습니다.' },
    { id: 5, date: '2026-04-08', time: '10:00', topic: '진로 상담', status: '대기중', counselor: '박지훈 교수' },
  ],
};

export default function CounselForm({ type, onToast }: CounselFormProps) {
  const info = titles[type];
  const [reservations, setReservations] = useState(pastReservations[type] || []);
  const [detailDrawer, setDetailDrawer] = useState<number | null>(null);
  const [historyDrawer, setHistoryDrawer] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelIdx, setCancelIdx] = useState<number | null>(null);
  const [formData, setFormData] = useState({ datetime: '', topic: '', content: '' });

  const detail = detailDrawer !== null ? reservations.find(r => r.id === detailDrawer) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.datetime || !formData.topic) return;
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    const newRes: Reservation = {
      id: Date.now(),
      date: formData.datetime.split(' ')[0] || '2026-04-07',
      time: formData.datetime.includes('10:00') ? '10:00' : '14:00',
      topic: formData.topic,
      status: '대기중',
      counselor: type === 'prof' ? '박지훈 교수' : type === 'career' ? '정수연 상담사' : '김영희 상담사',
    };
    setReservations(prev => [newRes, ...prev]);
    setFormData({ datetime: '', topic: '', content: '' });
    onToast('상담 신청이 완료되었습니다!', 'success');
  };

  const handleCancel = () => {
    if (cancelIdx === null) return;
    setReservations(prev => prev.filter(r => r.id !== cancelIdx));
    onToast('상담 예약이 취소되었습니다');
  };

  return (
    <div>
      <div className="page-header">
        <h1>{info.title}</h1>
        <p>{info.desc}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* 상담 신청서 */}
        <div className="card">
          <div className="card-title">
            <i className={info.icon} style={{ color: '#6366F1' }} /> 상담 신청서
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>이름</label>
              <input className="form-input" value="김민준" readOnly />
            </div>
            <div className="form-group">
              <label>학과 / 학번</label>
              <input className="form-input" value="컴퓨터공학과 / 20250001" readOnly />
            </div>
            {type === 'prof' && (
              <div className="form-group">
                <label>지도교수</label>
                <input className="form-input" value="박지훈 교수" readOnly />
              </div>
            )}
            <div className="form-group">
              <label>희망 일시</label>
              <select className="form-select" value={formData.datetime} onChange={e => setFormData({ ...formData, datetime: e.target.value })}>
                <option value="">선택하세요</option>
                <option value="2026-04-07 (월) 10:00">2026-04-07 (월) 10:00</option>
                <option value="2026-04-07 (월) 14:00">2026-04-07 (월) 14:00</option>
                <option value="2026-04-08 (화) 10:00">2026-04-08 (화) 10:00</option>
                <option value="2026-04-09 (수) 15:00">2026-04-09 (수) 15:00</option>
              </select>
            </div>
            <div className="form-group">
              <label>상담 주제</label>
              <select className="form-select" value={formData.topic} onChange={e => setFormData({ ...formData, topic: e.target.value })}>
                <option value="">선택하세요</option>
                {type === 'career' && <>
                  <option>진로 방향 설정</option>
                  <option>전공 적성 상담</option>
                  <option>대학원 진학 상담</option>
                </>}
                {type === 'employ' && <>
                  <option>취업 준비 전략</option>
                  <option>면접 불안 상담</option>
                  <option>심리 스트레스 상담</option>
                </>}
                {type === 'prof' && <>
                  <option>학업 상담</option>
                  <option>진로 상담</option>
                  <option>기타 상담</option>
                </>}
              </select>
            </div>
            <div className="form-group">
              <label>상담 내용 (선택)</label>
              <textarea className="form-textarea" value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} placeholder="상담받고 싶은 내용을 간략히 작성해주세요" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <i className="fa-solid fa-paper-plane" /> 신청하기
            </button>
          </form>
        </div>

        {/* 상담 이력 */}
        <div className="card">
          <div className="card-title" style={{ justifyContent: 'space-between' }}>
            <span><i className="fa-solid fa-clock-rotate-left" style={{ color: '#6366F1' }} /> 상담 이력</span>
            <button className="btn btn-sm btn-outline" onClick={() => setHistoryDrawer(true)}>
              <i className="fa-solid fa-expand" /> 전체보기
            </button>
          </div>
          {reservations.length === 0 ? (
            <div className="empty-state">
              <i className="fa-solid fa-calendar-xmark" />
              <p>상담 이력이 없습니다</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>날짜</th><th>주제</th><th>상태</th><th></th></tr></thead>
                <tbody>
                  {reservations.map(r => (
                    <tr key={r.id} className="clickable-row" onClick={() => setDetailDrawer(r.id)}>
                      <td>{r.date}</td>
                      <td style={{ fontWeight: 500 }}>{r.topic}</td>
                      <td>
                        <span className={`badge ${r.status === '완료' ? 'badge-gray' : r.status === '예약확정' ? 'badge-green' : 'badge-yellow'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        {r.status !== '완료' && (
                          <button className="btn btn-sm btn-outline" style={{ color: '#EF4444', borderColor: '#FCA5A5', padding: '2px 8px' }}
                            onClick={e => { e.stopPropagation(); setCancelIdx(r.id); }}>
                            취소
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 예약 상세 Drawer */}
      <Modal size="lg"open={detailDrawer !== null} onClose={() => setDetailDrawer(null)} title="상담 예약 상세">
        {detail && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span className={`badge ${detail.status === '완료' ? 'badge-gray' : detail.status === '예약확정' ? 'badge-green' : 'badge-yellow'}`}>
                {detail.status}
              </span>
              <span className="badge badge-indigo">{type === 'career' ? '진로상담' : type === 'employ' ? '취업·심리상담' : '지도교수 상담'}</span>
            </div>
            <div className="detail-row"><span className="detail-label">날짜</span><span className="detail-value">{detail.date}</span></div>
            <div className="detail-row"><span className="detail-label">시간</span><span className="detail-value">{detail.time}</span></div>
            <div className="detail-row"><span className="detail-label">주제</span><span className="detail-value">{detail.topic}</span></div>
            <div className="detail-row"><span className="detail-label">상담사</span><span className="detail-value">{detail.counselor}</span></div>
            {detail.memo && (
              <div className="detail-section" style={{ marginTop: 16 }}>
                <div className="detail-section-title">상담 메모</div>
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>{detail.memo}</p>
              </div>
            )}
            {detail.status === '완료' && (
              <div className="ai-comment" style={{ marginTop: 16 }}>
                <div className="ai-label"><i className="fa-solid fa-robot" /> AI 요약</div>
                <p style={{ fontSize: 13, lineHeight: 1.7 }}>
                  이번 상담에서는 {detail.topic}에 대해 논의했습니다.
                  상담사의 조언을 바탕으로 구체적인 실행 계획을 세워보세요.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 전체 이력 Drawer */}
      <Modal size="lg"open={historyDrawer} onClose={() => setHistoryDrawer(false)} title="전체 상담 이력">
        <div className="detail-section">
          <div className="detail-section-title">상담 통계</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ textAlign: 'center', padding: 12, background: '#F9FAFB', borderRadius: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#4F46E5' }}>{reservations.length}</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>총 상담</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, background: '#F9FAFB', borderRadius: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#22C55E' }}>{reservations.filter(r => r.status === '완료').length}</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>완료</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, background: '#F9FAFB', borderRadius: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B' }}>{reservations.filter(r => r.status !== '완료').length}</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>예정</div>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">상담 기록</div>
          {reservations.map(r => (
            <div key={r.id} style={{ marginBottom: 16, padding: 12, background: '#F9FAFB', borderRadius: 8, cursor: 'pointer' }}
              onClick={() => { setHistoryDrawer(false); setTimeout(() => setDetailDrawer(r.id), 300); }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{r.topic}</span>
                <span className={`badge ${r.status === '완료' ? 'badge-gray' : r.status === '예약확정' ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: 11 }}>
                  {r.status}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{r.date} {r.time} · {r.counselor}</div>
              {r.memo && <div style={{ fontSize: 13, color: '#374151', marginTop: 6, lineHeight: 1.5 }}>{r.memo}</div>}
            </div>
          ))}
        </div>
      </Modal>

      {/* 신청 확인 모달 */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="상담 신청 확인"
        message={`${formData.datetime}에 "${formData.topic}" 상담을 신청하시겠습니까?`}
        confirmText="신청"
      />

      {/* 취소 확인 모달 */}
      <ConfirmDialog
        open={cancelIdx !== null}
        onClose={() => setCancelIdx(null)}
        onConfirm={handleCancel}
        title="예약 취소"
        message="상담 예약을 취소하시겠습니까?"
        confirmText="취소하기"
        danger
      />
    </div>
  );
}
