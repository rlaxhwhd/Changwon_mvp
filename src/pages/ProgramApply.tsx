import { useState } from 'react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

interface ProgramApplyProps {
  onToast: (msg: string, type?: 'info' | 'success') => void;
}

const programs = [
  {
    title: '이력서 클리닉',
    desc: 'AI 기반 이력서 첨삭 및 맞춤 피드백을 받아보세요. 전문 컨설턴트가 1:1로 직무별 맞춤 피드백을 제공합니다.',
    date: '04.15 ~ 04.20',
    seats: 12,
    icon: 'fa-solid fa-file-lines',
    color: '#6366F1',
    bg: '#EEF2FF',
    detail: '전문 컨설턴트가 1:1로 이력서를 첨삭해드립니다. AI 분석을 통해 직무별 맞춤 피드백을 제공합니다.',
    location: '취업전략센터 세미나실',
    instructor: '김영희 컨설턴트',
    target: '3~4학년 재학생',
    applied: false,
    category: '취업역량',
    thumb: 'fa-solid fa-file-circle-check',
    aiRecommend: true,
  },
  {
    title: '모의면접 캠프',
    desc: '실제 기업 면접과 동일한 환경에서 모의면접을 진행하고, 전문 면접관의 피드백을 받을 수 있습니다.',
    date: '04.22 ~ 04.25',
    seats: 8,
    icon: 'fa-solid fa-microphone',
    color: '#3B82F6',
    bg: '#EFF6FF',
    detail: '실제 기업 면접과 동일한 환경에서 모의면접을 진행합니다. 전문 면접관의 피드백을 받을 수 있습니다.',
    location: '본관 301호',
    instructor: '이철수 면접관',
    target: '취업 준비 중인 3~4학년',
    applied: false,
    category: '면접준비',
    thumb: 'fa-solid fa-comments',
    aiRecommend: true,
  },
  {
    title: 'IT PM 직무 특강',
    desc: '넥슨코리아 현직 PM이 직접 강의합니다. 게임 프로젝트 관리의 실무를 배울 수 있습니다.',
    date: '05.01',
    seats: 30,
    icon: 'fa-solid fa-chalkboard-user',
    color: '#22C55E',
    bg: '#F0FDF4',
    detail: '넥슨코리아 현직 PM이 직접 강의합니다. 게임 프로젝트 관리의 실무를 배울 수 있습니다.',
    location: '공학관 대강당',
    instructor: '박민수 PM (넥슨코리아)',
    target: '전체 학년',
    applied: false,
    category: '직무탐색',
    thumb: 'fa-solid fa-laptop-code',
    aiRecommend: false,
  },
  {
    title: '포트폴리오 워크숍',
    desc: '취업용 프로젝트 포트폴리오를 직접 제작하는 실습형 프로그램입니다. 디자이너와 함께 합니다.',
    date: '05.08 ~ 05.10',
    seats: 15,
    icon: 'fa-solid fa-palette',
    color: '#F59E0B',
    bg: '#FFFBEB',
    detail: '취업용 프로젝트 포트폴리오를 직접 제작하는 실습형 프로그램입니다.',
    location: '취업전략센터 실습실',
    instructor: '정수연 디자이너',
    target: '2~4학년',
    applied: false,
    category: '취업역량',
    thumb: 'fa-solid fa-object-group',
    aiRecommend: true,
  },
  {
    title: '기업탐방 프로그램',
    desc: '판교 IT 기업을 직접 방문하여 현직자와 만남, 사무실 투어, 직무 체험을 합니다.',
    date: '05.15',
    seats: 20,
    icon: 'fa-solid fa-building',
    color: '#EF4444',
    bg: '#FEF2F2',
    detail: '판교 IT 기업을 직접 방문하여 현직자와 만남, 사무실 투어, 직무 체험을 합니다.',
    location: '판교 테크노밸리 (버스 이동)',
    instructor: '취업전략센터',
    target: '전체 학년 (교통비 지원)',
    applied: false,
    category: '직무탐색',
    thumb: 'fa-solid fa-city',
    aiRecommend: false,
  },
  {
    title: '취업캠프 (2박3일)',
    desc: '2박 3일간 자기소개서, 면접, 직무 분석을 집중적으로 준비하는 부트캠프입니다.',
    date: '05.20 ~ 05.22',
    seats: 0,
    icon: 'fa-solid fa-campground',
    color: '#8B5CF6',
    bg: '#F5F3FF',
    detail: '2박 3일간 자기소개서, 면접, 직무 분석을 집중적으로 준비하는 부트캠프입니다.',
    location: '교내 연수원',
    instructor: '외부 전문 강사진',
    target: '4학년 우선',
    applied: false,
    category: '취업캠프',
    thumb: 'fa-solid fa-tent',
    aiRecommend: false,
  },
];

export default function ProgramApply({ onToast }: ProgramApplyProps) {
  const [programList, setProgramList] = useState(programs);
  const [detailIdx, setDetailIdx] = useState<number | null>(null);
  const [confirmIdx, setConfirmIdx] = useState<number | null>(null);
  const [cancelIdx, setCancelIdx] = useState<number | null>(null);
  const [filter, setFilter] = useState('전체');

  const p = detailIdx !== null ? programList[detailIdx] : null;
  const allCategories = ['전체', ...Array.from(new Set(programs.map(p => p.category)))];
  const filtered = filter === '전체' ? programList : programList.filter(p => p.category === filter);

  const handleApply = (idx: number) => {
    setProgramList(prev => prev.map((item, i) => i === idx ? { ...item, applied: true, seats: item.seats - 1 } : item));
    onToast(`"${programList[idx].title}" 신청이 완료되었습니다!`, 'success');
  };

  const handleCancel = (idx: number) => {
    setProgramList(prev => prev.map((item, i) => i === idx ? { ...item, applied: false, seats: item.seats + 1 } : item));
    onToast(`"${programList[idx].title}" 신청이 취소되었습니다`);
  };

  return (
    <div>
      <div className="page-header">
        <h1>프로그램 신청</h1>
        <p>진로취업 프로그램에 신청하세요</p>
      </div>

      {/* Category filter */}
      <div className="cn-filters">
        {allCategories.map(cat => (
          <button
            key={cat}
            className={`cn-filter-btn ${filter === cat ? 'cn-filter-active' : ''}`}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Card News Grid */}
      <div className="cn-grid">
        {filtered.map((prog, i) => {
          const realIdx = programList.indexOf(prog);
          return (
            <div key={i} className="cn-card" onClick={() => setDetailIdx(realIdx)}>
              {/* Card thumbnail area */}
              <div className="cn-card-thumb" style={{ background: prog.bg }}>
                <i className={prog.thumb} style={{ color: prog.color }} />
                {prog.applied && (
                  <div className="cn-card-badge cn-badge-applied">신청완료</div>
                )}
                {prog.seats === 0 && !prog.applied && (
                  <div className="cn-card-badge cn-badge-closed">마감</div>
                )}
                <div className="cn-card-tags">
                  {prog.aiRecommend && (
                    <div className="cn-card-category cn-ai-tag">AI추천</div>
                  )}
                  <div className="cn-card-category" style={{ color: prog.color, background: `${prog.color}15`, borderColor: `${prog.color}30` }}>
                    {prog.category}
                  </div>
                </div>
              </div>

              {/* Card body */}
              <div className="cn-card-body">
                <h3 className="cn-card-title">{prog.title}</h3>
                <p className="cn-card-desc">{prog.desc}</p>
                <div className="cn-card-footer">
                  <div className="cn-card-meta">
                    <span><i className="fa-regular fa-calendar" /> {prog.date}</span>
                    <span className={prog.seats === 0 ? 'cn-seats-closed' : ''}>
                      <i className="fa-solid fa-users" /> {prog.seats === 0 ? '마감' : `잔여 ${prog.seats}석`}
                    </span>
                  </div>
                  {prog.applied ? (
                    <button
                      className="cn-cancel-btn"
                      onClick={e => { e.stopPropagation(); setCancelIdx(realIdx); }}
                    >
                      취소
                    </button>
                  ) : (
                    <button
                      className={`cn-apply-btn ${prog.seats === 0 ? 'cn-apply-disabled' : ''}`}
                      disabled={prog.seats === 0}
                      onClick={e => { e.stopPropagation(); setConfirmIdx(realIdx); }}
                    >
                      {prog.seats === 0 ? '마감' : '신청하기'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 프로그램 상세 모달 */}
      <Modal size="lg" open={detailIdx !== null} onClose={() => setDetailIdx(null)} title={p?.title || ''} footer={
        p && !p.applied && p.seats > 0 ? (
          <button className="btn btn-sm" style={{ background: '#6366F1', color: '#fff', width: '100%' }}
            onClick={() => { setDetailIdx(null); setConfirmIdx(detailIdx!); }}>
            <i className="fa-solid fa-check" /> 신청하기
          </button>
        ) : undefined
      }>
        {p && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {p.applied && <span className="badge badge-green">신청완료</span>}
              {p.seats === 0 && !p.applied && <span className="badge badge-red">마감</span>}
              <span className="badge" style={{ background: '#F3F4F6', color: '#374151' }}>{p.date}</span>
              <span className="badge" style={{ background: p.bg, color: p.color }}>{p.category}</span>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">프로그램 소개</div>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>{p.detail}</p>
            </div>
            <div className="detail-row"><span className="detail-label">장소</span><span className="detail-value">{p.location}</span></div>
            <div className="detail-row"><span className="detail-label">강사</span><span className="detail-value">{p.instructor}</span></div>
            <div className="detail-row"><span className="detail-label">대상</span><span className="detail-value">{p.target}</span></div>
            <div className="detail-row"><span className="detail-label">잔여석</span><span className="detail-value">{p.seats}석</span></div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmIdx !== null}
        onClose={() => setConfirmIdx(null)}
        onConfirm={() => confirmIdx !== null && handleApply(confirmIdx)}
        title="프로그램 신청"
        message={confirmIdx !== null ? `"${programList[confirmIdx].title}" 프로그램에 신청하시겠습니까?` : ''}
        confirmText="신청"
      />

      <ConfirmDialog
        open={cancelIdx !== null}
        onClose={() => setCancelIdx(null)}
        onConfirm={() => cancelIdx !== null && handleCancel(cancelIdx)}
        title="신청 취소"
        message={cancelIdx !== null ? `"${programList[cancelIdx].title}" 신청을 취소하시겠습니까?` : ''}
        confirmText="취소하기"
        danger
      />
    </div>
  );
}
