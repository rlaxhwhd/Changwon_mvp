import type { PageId } from '../types';

interface StrategyCenterProps {
  subPage: 'support' | 'center' | 'plus' | 'location' | 'work';
  onToast: (msg: string) => void;
  onNavigate: (page: PageId) => void;
}

const TAB_MAP: { id: StrategyCenterProps['subPage']; pageId: PageId; label: string }[] = [
  { id: 'support', pageId: 'strategy-support', label: '학생 진로취업지원체계' },
  { id: 'center', pageId: 'strategy-center', label: '취업전략센터 소개' },
  { id: 'plus', pageId: 'strategy-plus', label: '대학일자리플러스센터 소개' },
  { id: 'location', pageId: 'strategy-location', label: '찾아오시는 길' },
  { id: 'work', pageId: 'strategy-work', label: '업무안내' },
];

export default function StrategyCenter({ subPage, onNavigate }: StrategyCenterProps) {
  return (
    <div>
      <div className="page-header">
        <h1>취업전략센터</h1>
        <p>국립창원대학교 취업전략센터를 소개합니다</p>
      </div>

      {/* 서브탭 */}
      <div className="sub-tabs mb-24">
        {TAB_MAP.map(t => (
          <button
            key={t.id}
            className={`sub-tab ${subPage === t.id ? 'active' : ''}`}
            onClick={() => onNavigate(t.pageId)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 서브 컨텐츠 */}
      {subPage === 'support' && (
        <div className="card">
          <div className="card-title">
            <i className="fa-solid fa-sitemap" style={{ color: '#4F46E5' }} />
            학생 진로취업지원체계
          </div>
          <div style={{ padding: '20px 0' }}>
            <div className="strategy-flow">
              <div className="strategy-step">
                <div className="strategy-step-num">1</div>
                <div className="strategy-step-body">
                  <strong>진단 단계</strong>
                  <p>9CORE 역량검사, 인적성검사를 통한 역량 진단</p>
                </div>
              </div>
              <div className="strategy-arrow"><i className="fa-solid fa-chevron-down" /></div>
              <div className="strategy-step">
                <div className="strategy-step-num">2</div>
                <div className="strategy-step-body">
                  <strong>분석 단계</strong>
                  <p>AI 기반 역량분석, 취업예측, 맞춤 로드맵 생성</p>
                </div>
              </div>
              <div className="strategy-arrow"><i className="fa-solid fa-chevron-down" /></div>
              <div className="strategy-step">
                <div className="strategy-step-num">3</div>
                <div className="strategy-step-body">
                  <strong>역량강화 단계</strong>
                  <p>진로취업 프로그램 참여, 자격증/어학/프로젝트 관리</p>
                </div>
              </div>
              <div className="strategy-arrow"><i className="fa-solid fa-chevron-down" /></div>
              <div className="strategy-step">
                <div className="strategy-step-num">4</div>
                <div className="strategy-step-body">
                  <strong>취업 연계</strong>
                  <p>AI 맞춤채용추천, 기업정보 제공, 상담 지원</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {subPage === 'center' && (
        <div className="card">
          <div className="card-title">
            <i className="fa-solid fa-building" style={{ color: '#4F46E5' }} />
            취업전략센터 소개
          </div>
          <div style={{ lineHeight: 1.8, fontSize: 14, color: '#374151' }}>
            <p style={{ marginBottom: 16 }}>
              <strong>국립창원대학교 취업전략센터</strong>는 학생들의 성공적인 진로설계와 취업을 지원하기 위해
              설립된 전문 기관입니다. AI 기반 역량분석 시스템 <strong>'드림캐치(DREAMCATCH)'</strong>를 통해
              학생 개개인에게 맞춤형 진로취업 서비스를 제공합니다.
            </p>
            <div className="grid-2" style={{ gap: 16 }}>
              <div style={{ padding: 20, background: '#F9FAFB', borderRadius: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: '#4F46E5' }}>
                  <i className="fa-solid fa-bullseye" /> 미션
                </div>
                <p>학생 역량 데이터 기반의 과학적 진로취업 지원으로 취업 경쟁력 강화</p>
              </div>
              <div style={{ padding: 20, background: '#F9FAFB', borderRadius: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: '#22C55E' }}>
                  <i className="fa-solid fa-eye" /> 비전
                </div>
                <p>AI 기술과 빅데이터를 활용한 대한민국 대표 스마트 취업지원 시스템 구축</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {subPage === 'plus' && (
        <div className="card">
          <div className="card-title">
            <i className="fa-solid fa-circle-plus" style={{ color: '#3B82F6' }} />
            대학일자리플러스센터 소개
          </div>
          <div style={{ lineHeight: 1.8, fontSize: 14, color: '#374151' }}>
            <p style={{ marginBottom: 16 }}>
              <strong>대학일자리플러스센터</strong>는 고용노동부와 교육부가 공동 지원하는 사업으로,
              대학과 지역사회가 연계하여 청년 일자리 창출 및 취업 지원 서비스를 제공합니다.
            </p>
            <div style={{ padding: 20, background: '#EFF6FF', borderRadius: 12 }}>
              <strong style={{ color: '#3B82F6' }}>주요 서비스</strong>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>재학생 맞춤형 진로상담 및 취업컨설팅</li>
                <li>지역 기업 연계 인턴십 프로그램</li>
                <li>취업 역량 강화 프로그램 운영</li>
                <li>졸업생 사후관리 및 경력개발 지원</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {subPage === 'location' && (
        <div className="card">
          <div className="card-title">
            <i className="fa-solid fa-location-dot" style={{ color: '#EF4444' }} />
            찾아오시는 길
          </div>
          <div style={{ fontSize: 14, color: '#374151' }}>
            <table className="info-table" style={{ marginBottom: 20 }}>
              <tbody>
                <tr><th>주소</th><td>경상남도 창원시 의창구 창원대학로 20 (사림동)</td></tr>
                <tr><th>위치</th><td>본관 1층 취업전략센터</td></tr>
                <tr><th>전화</th><td>055-213-2550</td></tr>
                <tr><th>이메일</th><td>career@changwon.ac.kr</td></tr>
                <tr><th>운영시간</th><td>월~금 09:00 ~ 18:00 (점심 12:00 ~ 13:00)</td></tr>
              </tbody>
            </table>
            <div style={{ background: '#F3F4F6', borderRadius: 12, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
              <div style={{ textAlign: 'center' }}>
                <i className="fa-solid fa-map" style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
                지도 영역 (추후 연동)
              </div>
            </div>
          </div>
        </div>
      )}

      {subPage === 'work' && (
        <div className="card">
          <div className="card-title">
            <i className="fa-solid fa-clipboard-list" style={{ color: '#F59E0B' }} />
            업무안내
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>담당 업무</th><th>담당자</th><th>연락처</th></tr>
              </thead>
              <tbody>
                <tr><td style={{ fontWeight: 600 }}>취업전략센터 총괄</td><td>김OO 팀장</td><td>055-213-2550</td></tr>
                <tr><td style={{ fontWeight: 600 }}>진로상담 / 검사 운영</td><td>박OO 주임</td><td>055-213-2551</td></tr>
                <tr><td style={{ fontWeight: 600 }}>취업 프로그램 기획·운영</td><td>이OO 주임</td><td>055-213-2552</td></tr>
                <tr><td style={{ fontWeight: 600 }}>기업정보 / 채용연계</td><td>최OO 담당</td><td>055-213-2553</td></tr>
                <tr><td style={{ fontWeight: 600 }}>AI 시스템 운영·관리</td><td>정OO 담당</td><td>055-213-2554</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
