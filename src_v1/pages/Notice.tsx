import { useState } from 'react';
import Modal from '../components/Modal';

interface NoticeProps {
  onToast: (msg: string) => void;
}

interface NoticeItem {
  id: number;
  date: string;
  title: string;
  category: string;
  content: string;
  attachments?: string[];
}

const notices: NoticeItem[] = [
  {
    id: 1, date: '2026-03-28', title: '2026-1학기 진로취업 프로그램 신청 안내', category: '프로그램',
    content: '안녕하세요, 취업전략센터입니다.\n\n2026학년도 1학기 진로취업 프로그램 신청을 아래와 같이 안내드립니다.\n\n■ 프로그램 목록\n1. 이력서 클리닉 (4/15~4/20)\n2. 모의면접 캠프 (4/22~4/25)\n3. IT PM 직무 특강 (5/1)\n4. 포트폴리오 워크숍 (5/8~5/10)\n\n■ 신청 방법\n- 드림캐치 시스템 > 프로그램 신청 메뉴에서 신청\n- 선착순 마감\n\n■ 문의\n- 취업전략센터 055-xxx-xxxx',
    attachments: ['2026-1학기_프로그램_일정표.pdf'],
  },
  {
    id: 2, date: '2026-03-25', title: 'AI 역량 분석 서비스 오픈', category: '시스템',
    content: '드림캐치 시스템의 AI 역량 분석 서비스가 오픈되었습니다.\n\n■ 주요 기능\n- AI 종합평가: 7개 역량 분석 및 종합 점수 산출\n- AI 맞춤채용추천: 적합도 기반 채용공고 추천\n- AI 합격예측: 관심기업 합격 확률 예측\n- AI 로드맵: 맞춤형 역량 개발 로드맵 생성\n\n■ 이용 방법\n- 로그인 후 좌측 메뉴의 "AI 서비스" 섹션에서 이용 가능\n\n많은 이용 바랍니다.',
  },
  {
    id: 3, date: '2026-03-20', title: '상반기 채용 박람회 안내', category: '채용',
    content: '2026년 상반기 교내 채용 박람회를 개최합니다.\n\n■ 일시: 2026년 4월 25일(금) 10:00~17:00\n■ 장소: 대학본부 1층 로비 및 대강당\n■ 참여 기업: 넥슨코리아, 카카오게임즈, NHN 등 30개사\n■ 프로그램: 기업 부스, 현장 면접, 직무 상담\n\n사전 등록 시 취업 준비 키트를 제공합니다.',
    attachments: ['채용박람회_참여기업_목록.pdf', '채용박람회_배치도.pdf'],
  },
  {
    id: 4, date: '2026-03-18', title: '드림캐치 시스템 업데이트 안내', category: '시스템',
    content: '드림캐치 시스템이 아래와 같이 업데이트되었습니다.\n\n■ 업데이트 내용\n- 마이페이지 UI 개선\n- 프로그램 후기 작성 기능 추가\n- 상담 예약 시스템 개선\n- 기업정보 플랫폼 데이터 업데이트\n\n■ 점검 일시: 2026-03-18 02:00~06:00 (완료)\n\n이용에 불편을 드려 죄송합니다.',
  },
  {
    id: 5, date: '2026-03-10', title: '2026년 상반기 인턴십 매칭 프로그램 안내', category: '프로그램',
    content: '상반기 인턴십 매칭 프로그램 참가자를 모집합니다.\n\n■ 대상: 3~4학년 재학생\n■ 참여 기업: IT/게임/금융 분야 15개사\n■ 인턴 기간: 2026년 7월~8월 (8주)\n■ 신청 기간: 2026-03-10 ~ 2026-04-10\n\n■ 지원 혜택\n- 학점 인정 (3학점)\n- 교통비 지원\n- 우수 인턴 정규직 전환 기회',
  },
];

export default function Notice({ onToast }: NoticeProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const notice = selectedId !== null ? notices.find(n => n.id === selectedId) : null;

  return (
    <div>
      <div className="page-header">
        <h1>공지사항</h1>
        <p>드림캐치 시스템 공지사항</p>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 60 }}>번호</th>
                <th>제목</th>
                <th style={{ width: 80 }}>분류</th>
                <th style={{ width: 100 }}>등록일</th>
              </tr>
            </thead>
            <tbody>
              {notices.map(n => (
                <tr key={n.id} className="clickable-row" onClick={() => setSelectedId(n.id)}>
                  <td>{n.id}</td>
                  <td style={{ fontWeight: 500 }}>{n.title}</td>
                  <td><span className="badge badge-gray">{n.category}</span></td>
                  <td>{n.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 공지 상세 Drawer */}
      <Modal size="lg"open={selectedId !== null} onClose={() => setSelectedId(null)} title={notice?.title || ''}>
        {notice && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span className="badge badge-gray">{notice.category}</span>
              <span style={{ fontSize: 13, color: '#6B7280' }}>{notice.date}</span>
            </div>
            <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
              {notice.content}
            </div>
            {notice.attachments && notice.attachments.length > 0 && (
              <div className="detail-section" style={{ marginTop: 20 }}>
                <div className="detail-section-title">첨부파일</div>
                {notice.attachments.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', fontSize: 13, cursor: 'pointer', color: '#4F46E5' }}
                    onClick={() => onToast('파일 다운로드는 준비 중입니다')}>
                    <i className="fa-solid fa-file-pdf" style={{ color: '#EF4444' }} />
                    {a}
                    <i className="fa-solid fa-download" style={{ marginLeft: 'auto', fontSize: 11 }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
