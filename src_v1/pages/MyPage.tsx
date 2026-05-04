import { useState } from 'react';
import Modal from '../components/Modal';
import FormField from '../components/FormField';

interface MyPageProps {
  onToast: (msg: string) => void;
}

export default function MyPage({ onToast }: MyPageProps) {
  const [editModal, setEditModal] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [notiDrawer, setNotiDrawer] = useState(false);

  const [editForm, setEditForm] = useState({ email: 'minjun.kim@univ.ac.kr', phone: '010-1234-5678' });
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [noti, setNoti] = useState({ program: true, counsel: true, job: false, system: true });

  return (
    <div>
      <div className="page-header">
        <h1>마이페이지</h1>
        <p>내 정보와 설정을 관리하세요</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* 기본 정보 */}
        <div className="card">
          <div className="card-title" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-user" style={{ color: '#6366F1' }} /> 기본 정보
            </span>
            <button className="btn btn-sm btn-outline" onClick={() => { setEditForm({ email: 'minjun.kim@univ.ac.kr', phone: '010-1234-5678' }); setEditModal(true); }}>
              수정
            </button>
          </div>
          <table className="info-table">
            <tbody>
              <tr><th>이름</th><td>김민준</td></tr>
              <tr><th>학번</th><td>20250001</td></tr>
              <tr><th>이메일</th><td>{editForm.email}</td></tr>
              <tr><th>연락처</th><td>{editForm.phone}</td></tr>
            </tbody>
          </table>
        </div>

        {/* 학사 정보 */}
        <div className="card">
          <div className="card-title">
            <i className="fa-solid fa-graduation-cap" style={{ color: '#22C55E' }} /> 학사 정보
            <span className="badge badge-green" style={{ marginLeft: 'auto' }}>학교 DB 연동</span>
          </div>
          <table className="info-table">
            <tbody>
              <tr><th>학과</th><td>컴퓨터공학과</td></tr>
              <tr><th>학년/학기</th><td>2학년 1학기</td></tr>
              <tr><th>학점</th><td>4.3 / 4.5</td></tr>
              <tr><th>이수학점</th><td>42 / 130</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* 검사 결과 요약 */}
        <div className="card">
          <div className="card-title">
            <i className="fa-solid fa-chart-simple" style={{ color: '#F59E0B' }} /> 검사 결과 요약
          </div>
          <table className="info-table">
            <tbody>
              <tr><th>인적성검사</th><td><strong>80</strong>점 <span className="badge badge-green">양호</span></td></tr>
              <tr><th>9CORE 검사</th><td><strong>68</strong>점 <span className="badge badge-yellow">보통</span></td></tr>
              <tr><th>최근 검사일</th><td>2026-03-15</td></tr>
            </tbody>
          </table>
        </div>

        {/* 진로 설정 + 보안/알림 */}
        <div className="card">
          <div className="card-title" style={{ justifyContent: 'space-between' }}>
            <span><i className="fa-solid fa-bullseye" style={{ color: '#EF4444' }} /> 진로 설정 정보</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm btn-outline" onClick={() => { setPwForm({ current: '', newPw: '', confirm: '' }); setPwModal(true); }}>
                <i className="fa-solid fa-lock" /> 비밀번호
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => setNotiDrawer(true)}>
                <i className="fa-solid fa-bell" /> 알림
              </button>
            </div>
          </div>
          <table className="info-table">
            <tbody>
              <tr><th>희망 직무</th><td>IT Project Manager</td></tr>
              <tr><th>희망 기업</th><td>넥슨코리아</td></tr>
              <tr><th>AI 합격 예측</th><td><strong style={{ color: '#4F46E5' }}>58%</strong></td></tr>
              <tr><th>설정일</th><td>2026-03-10</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 정보 수정 모달 */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="기본 정보 수정" size="sm" footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-outline" onClick={() => setEditModal(false)}>취소</button>
          <button className="btn btn-sm" style={{ background: '#4F46E5', color: '#fff' }}
            onClick={() => { setEditModal(false); onToast('정보가 수정되었습니다'); }}>
            저장
          </button>
        </div>
      }>
        <FormField label="이름" value="김민준" onChange={() => {}} placeholder="" />
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: -8, marginBottom: 12 }}>이름은 학교 DB 연동 정보로 수정할 수 없습니다.</div>
        <FormField label="이메일" value={editForm.email} onChange={v => setEditForm({ ...editForm, email: v })} />
        <FormField label="연락처" value={editForm.phone} onChange={v => setEditForm({ ...editForm, phone: v })} placeholder="010-0000-0000" />
      </Modal>

      {/* 비밀번호 변경 모달 */}
      <Modal open={pwModal} onClose={() => setPwModal(false)} title="비밀번호 변경" size="sm" footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-outline" onClick={() => setPwModal(false)}>취소</button>
          <button className="btn btn-sm" style={{ background: '#4F46E5', color: '#fff' }}
            onClick={() => {
              if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) return;
              if (pwForm.newPw !== pwForm.confirm) { onToast('새 비밀번호가 일치하지 않습니다'); return; }
              setPwModal(false);
              onToast('비밀번호가 변경되었습니다');
            }}>
            변경
          </button>
        </div>
      }>
        <FormField label="현재 비밀번호" value={pwForm.current} onChange={v => setPwForm({ ...pwForm, current: v })} placeholder="현재 비밀번호 입력" />
        <FormField label="새 비밀번호" value={pwForm.newPw} onChange={v => setPwForm({ ...pwForm, newPw: v })} placeholder="새 비밀번호 입력" />
        <FormField label="새 비밀번호 확인" value={pwForm.confirm} onChange={v => setPwForm({ ...pwForm, confirm: v })} placeholder="새 비밀번호 다시 입력" />
      </Modal>

      {/* 알림 설정 Drawer */}
      <Modal size="lg"open={notiDrawer} onClose={() => setNotiDrawer(false)} title="알림 설정" footer={
        <button className="btn btn-sm" style={{ background: '#4F46E5', color: '#fff', width: '100%' }}
          onClick={() => { setNotiDrawer(false); onToast('알림 설정이 저장되었습니다'); }}>
          저장
        </button>
      }>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>알림을 받을 항목을 설정하세요.</p>
        {[
          { key: 'program' as const, label: '프로그램 안내', desc: '새 프로그램 등록, 신청 마감 알림' },
          { key: 'counsel' as const, label: '상담 알림', desc: '상담 예약 확인, 리마인더' },
          { key: 'job' as const, label: '채용 공고 알림', desc: '관심기업 채용공고, AI 추천 공고' },
          { key: 'system' as const, label: '시스템 공지', desc: '시스템 업데이트, 점검 안내' },
        ].map(item => (
          <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #F3F4F6' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{item.desc}</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
              <input type="checkbox" checked={noti[item.key]} onChange={() => setNoti({ ...noti, [item.key]: !noti[item.key] })}
                style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: noti[item.key] ? '#4F46E5' : '#D1D5DB',
                borderRadius: 12, transition: 'background .2s',
              }}>
                <span style={{
                  position: 'absolute', left: noti[item.key] ? 22 : 2, top: 2,
                  width: 20, height: 20, borderRadius: '50%',
                  backgroundColor: '#fff', transition: 'left .2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                }} />
              </span>
            </label>
          </div>
        ))}

        <div className="detail-section" style={{ marginTop: 20 }}>
          <div className="detail-section-title">알림 수신 채널</div>
          <div className="detail-row"><span className="detail-label">이메일</span><span className="detail-value">minjun.kim@univ.ac.kr</span></div>
          <div className="detail-row"><span className="detail-label">SMS</span><span className="detail-value">010-1234-5678</span></div>
          <div className="detail-row"><span className="detail-label">앱 푸시</span><span className="detail-value" style={{ color: '#9CA3AF' }}>미설정</span></div>
        </div>
      </Modal>
    </div>
  );
}
