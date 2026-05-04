import GenericPage from './GenericPage';
import PageHeader from '../components/PageHeader';

/* ============================================================
   소개 (Intro)
   ============================================================ */
export const IntroSupport = () => (
  <GenericPage
    kicker="ABOUT · STUDENT SUPPORT"
    title="학생 진로취업지원체계"
    sub="국립창원대학교는 학년별·단계별 맞춤형 진로취업지원 체계를 운영하고 있습니다."
    layout="grid-3"
    items={[
      { icon: 'fa-solid fa-seedling', title: '1단계 · 진로 탐색', meta: 'STAGE 01', desc: '자기이해와 진로 탐색을 통해 방향을 설정합니다' },
      { icon: 'fa-solid fa-compass', title: '2단계 · 역량 개발', meta: 'STAGE 02', desc: '진로에 필요한 역량을 체계적으로 강화합니다' },
      { icon: 'fa-solid fa-briefcase', title: '3단계 · 취업 실행', meta: 'STAGE 03', desc: '실전 취업 준비와 기업 매칭을 지원합니다' },
    ]}
  />
);

export const IntroCenter = () => (
  <GenericPage
    kicker="ABOUT · CAREER CENTER"
    title="취업전략센터 소개"
    sub="국립창원대학교 취업전략센터는 학생의 진로개발과 취업성공을 위한 통합 지원 조직입니다."
    layout="grid-2"
    items={[
      { icon: 'fa-solid fa-bullseye', title: '비전', desc: '학생 한 명 한 명의 커리어 여정을 설계하는 우주 관제센터' },
      { icon: 'fa-solid fa-users', title: '조직', desc: '전문 컨설턴트 12명, 멘토 네트워크 300+' },
      { icon: 'fa-solid fa-map-location', title: '위치', desc: '창원대학교 학생회관 3층' },
      { icon: 'fa-solid fa-phone', title: '연락처', desc: '055-213-XXXX · career@changwon.ac.kr' },
    ]}
  />
);

export const IntroPlus = () => (
  <GenericPage
    kicker="ABOUT · UNIV JOB+"
    title="대학일자리플러스센터 소개"
    sub="고용노동부 지정 대학일자리플러스센터로 지역 청년 고용을 견인합니다."
    layout="grid-3"
    items={[
      { icon: 'fa-solid fa-handshake', title: '지역 기업 네트워크', desc: '경남권 300+ 기업과 파트너십' },
      { icon: 'fa-solid fa-graduation-cap', title: '재학생 · 졸업생 통합지원', desc: '졸업 후 3년까지 취업 지원' },
      { icon: 'fa-solid fa-chart-line', title: '고용 성과', desc: '취업률 82%, 대기업 진출 40%' },
    ]}
  />
);

export const IntroLocation = () => (
  <div className="page-wrap">
    <PageHeader kicker="ABOUT · LOCATION" title="찾아오시는 길" sub="국립창원대학교 취업전략센터 위치 및 이용 정보입니다." />
    <div className="grid-2">
      <div className="panel">
        <div className="panel-head"><div className="panel-title">ADDRESS</div></div>
        <div style={{ fontSize: 14, lineHeight: 2 }}>
          <div>경상남도 창원시 의창구 창원대학로 20</div>
          <div>국립창원대학교 학생회관 3층</div>
          <div style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 12 }}>
            📞 055-213-XXXX<br />
            ✉ career@changwon.ac.kr<br />
            🕐 평일 09:00 - 18:00
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><div className="panel-title">TRANSPORT</div></div>
        <div style={{ fontSize: 13, lineHeight: 2, color: 'var(--text-secondary)' }}>
          <div>🚇 지하철 : 창원중앙역 하차 후 도보 10분</div>
          <div>🚌 버스 : 100, 101, 102, 103번 창원대 하차</div>
          <div>🚗 자가용 : 교내 주차장 이용 가능</div>
        </div>
      </div>
    </div>
  </div>
);

export const IntroWork = () => (
  <GenericPage
    kicker="ABOUT · OPERATIONS"
    title="업무안내"
    sub="취업전략센터의 주요 업무 영역과 제공 서비스 목록입니다."
    layout="grid-2"
    items={[
      { icon: 'fa-solid fa-clipboard-user', title: '진로상담 및 진단', desc: '1:1 맞춤 진로상담과 과학적 진단검사' },
      { icon: 'fa-solid fa-book', title: '역량개발 프로그램', desc: '면접, 자소서, 포트폴리오 등 실무 프로그램' },
      { icon: 'fa-solid fa-magnifying-glass-chart', title: '채용정보 제공', desc: '기업 채용공고와 맞춤 일자리 매칭' },
      { icon: 'fa-solid fa-handshake', title: '기업 협력', desc: '지역 기업과의 채용 연계 및 MOU' },
    ]}
  />
);

/* ============================================================
   상담 (Counsel)
   ============================================================ */
const CounselForm = ({ title, kicker, sub, typeLabel }: { title: string; kicker: string; sub: string; typeLabel: string }) => (
  <div className="page-wrap">
    <PageHeader kicker={kicker} title={title} sub={sub} />
    <div className="panel" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="panel-head">
        <div className="panel-title">APPLICATION · {typeLabel}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="login-field">
          <label>상담 유형</label>
          <input type="text" defaultValue={typeLabel} readOnly />
        </div>
        <div className="login-field">
          <label>희망 일시</label>
          <input type="date" />
        </div>
        <div className="login-field">
          <label>학번</label>
          <input type="text" placeholder="20250000" />
        </div>
        <div className="login-field">
          <label>연락처</label>
          <input type="text" placeholder="010-0000-0000" />
        </div>
      </div>
      <div className="login-field" style={{ marginTop: 8 }}>
        <label>상담 내용</label>
        <textarea
          rows={5}
          style={{
            width: '100%', padding: 14,
            background: 'rgba(5, 8, 22, 0.6)',
            border: '1px solid var(--border-nebula)',
            borderRadius: 10, color: 'var(--text-primary)',
            fontSize: 14, resize: 'vertical',
          }}
          placeholder="상담받고 싶은 내용을 자유롭게 작성해주세요"
        />
      </div>
      <button className="btn-aurora" style={{ width: '100%', marginTop: 16 }}>
        <i className="fa-solid fa-paper-plane" /> 상담 신청
      </button>
    </div>
  </div>
);

export const CounselCareer = () => (
  <CounselForm
    kicker="PROFESSIONAL CONSULTATION"
    title="진로취업상담신청"
    sub="취업전략센터의 전문 컨설턴트와 1:1로 진로 고민을 나누세요."
    typeLabel="진로취업상담"
  />
);

export const CounselPsych = () => (
  <CounselForm
    kicker="PROFESSIONAL CONSULTATION"
    title="심리상담"
    sub="학생상담센터와 연계된 전문 심리상담사와의 안전한 대화 공간입니다."
    typeLabel="심리상담"
  />
);

export const CounselProf = () => (
  <CounselForm
    kicker="PROFESSIONAL CONSULTATION"
    title="교수상담"
    sub="전공 교수님과 직접 만나 학업과 진로에 대한 심도 있는 조언을 받으세요."
    typeLabel="교수상담"
  />
);

/* ============================================================
   역량개발센터 (Programs)
   ============================================================ */
export const CareerManage = () => (
  <GenericPage
    kicker="CAPACITY · MANAGEMENT"
    title="경력개발 관리"
    sub="당신이 참여한 모든 프로그램과 획득한 역량을 한눈에 확인하세요."
    items={[
      { icon: 'fa-solid fa-check', title: '2026 실전 모의면접 부트캠프', meta: '2026-03-20 · 수료', tags: ['면접'] },
      { icon: 'fa-solid fa-check', title: 'Python 데이터분석 워크샵', meta: '2026-03-05 · 수료', tags: ['IT역량'] },
      { icon: 'fa-solid fa-rotate', title: 'AI 자소서 마스터클래스', meta: '진행중 · 2/4회차', tags: ['자소서'] },
    ]}
  />
);

export const ProgramReview = () => (
  <GenericPage
    kicker="PROGRAM REVIEWS"
    title="프로그램 후기"
    sub="실제 참여한 학우들의 생생한 후기를 통해 프로그램을 선택하세요."
    layout="grid-2"
    items={[
      { icon: 'fa-solid fa-star', title: '"면접 공포증이 사라졌어요"', meta: '★★★★★ · 경영학과 김OO', desc: '실전 모의면접 부트캠프에서 배운 답변 기법으로 실제 면접에서 합격했습니다' },
      { icon: 'fa-solid fa-star', title: '"포트폴리오가 달라졌어요"', meta: '★★★★★ · 디자인과 이OO', desc: '포트폴리오 워크샵 이후 자신감이 생겼고 대기업 합격까지 이어졌습니다' },
      { icon: 'fa-solid fa-star', title: '"AI 도구 활용이 신세계"', meta: '★★★★☆ · 국문과 박OO', desc: 'AI 자소서 클래스는 반드시 들어야 할 필수 프로그램입니다' },
      { icon: 'fa-solid fa-star', title: '"현직자 멘토링 강추"', meta: '★★★★★ · 전기공학과 최OO', desc: '실제 현장의 이야기를 들으면서 진로 고민이 정리되었습니다' },
    ]}
  />
);

/* ============================================================
   경력개발로드맵 하위 (Roadmap sub)
   ============================================================ */
export const RoadmapPrediction = () => (
  <GenericPage
    kicker="AI CAREER ANALYTICS"
    title="취업예측분석"
    sub="AI가 당신의 역량, 학습 이력, 진단 결과를 종합 분석하여 취업 성공 가능성을 예측합니다."
    layout="grid-3"
    items={[
      { icon: 'fa-solid fa-chart-line', title: '취업 가능성', meta: '78%', desc: '상위 22% 수준의 취업 준비도를 보이고 있습니다' },
      { icon: 'fa-solid fa-building', title: '적합 산업군', meta: 'IT · 금융 · 컨설팅', desc: '당신의 역량과 성향에 맞는 TOP 3 산업군입니다' },
      { icon: 'fa-solid fa-clock', title: '예상 취업 시점', meta: '2026 하반기', desc: '현재 페이스 유지 시 예상되는 취업 시점입니다' },
    ]}
  />
);

export const RoadmapJobs = () => (
  <GenericPage
    kicker="AI JOB MATCHING"
    title="AI맞춤채용추천"
    sub="AI가 당신의 진단 결과와 희망 진로를 바탕으로 가장 적합한 채용공고를 추천합니다."
    items={[
      { icon: 'fa-solid fa-star', title: 'NAVER · 주니어 프론트엔드 개발자', meta: '매칭도 94% · 분당 · 정규직', tags: ['AI추천', 'IT'] },
      { icon: 'fa-solid fa-star', title: '삼성전자 · DS부문 신입 엔지니어', meta: '매칭도 89% · 수원 · 정규직', tags: ['AI추천', '대기업'] },
      { icon: 'fa-solid fa-star', title: '카카오 · 서비스 기획 인턴', meta: '매칭도 86% · 판교 · 인턴', tags: ['AI추천', 'IT'] },
      { icon: 'fa-solid fa-briefcase', title: '현대차 · 생산기술 신입', meta: '매칭도 82% · 울산 · 정규직', tags: ['대기업'] },
    ]}
  />
);

export const RoadmapResume = () => (
  <GenericPage
    kicker="AI WRITING ASSISTANT"
    title="AI자소서 / 인터뷰"
    sub="AI가 당신의 경험과 역량을 바탕으로 매력적인 자소서를 작성하고, 모의 면접까지 함께합니다."
    layout="grid-2"
    items={[
      { icon: 'fa-solid fa-file-lines', title: 'AI 자기소개서 작성', meta: 'GPT-4o 기반', desc: '당신의 경험을 바탕으로 기업 맞춤 자소서를 생성합니다' },
      { icon: 'fa-solid fa-video', title: 'AI 모의면접', meta: '실시간 피드백', desc: '실제 기업 질문으로 음성·영상 기반 면접 시뮬레이션' },
      { icon: 'fa-solid fa-magnifying-glass', title: '자소서 첨삭', meta: 'AI 분석', desc: '작성한 자소서를 AI가 문장 단위로 피드백합니다' },
      { icon: 'fa-solid fa-comments', title: '예상 질문 생성', meta: '직무별 맞춤', desc: '지원 직무와 회사별 예상 질문을 자동 생성합니다' },
    ]}
  />
);

/* ============================================================
   AI 커리어 라운지
   ============================================================ */
export const Lounge = () => (
  <div className="page-wrap">
    <PageHeader
      kicker="AI CAREER LOUNGE"
      title="AI커리어라운지"
      sub="AI 기반 커리어 인사이트, 실시간 취업 시장 동향, 개인 맞춤 피드를 한곳에서 확인하세요."
    />
    <div className="grid-4 mb-lg">
      {[
        { label: 'CAREER INDEX', value: '87.2', icon: 'fa-solid fa-chart-line' },
        { label: 'MARKET TREND', value: '▲ 12%', icon: 'fa-solid fa-arrow-trend-up' },
        { label: 'YOUR RANK', value: 'TOP 18%', icon: 'fa-solid fa-trophy' },
        { label: 'WEEKLY READS', value: '32', icon: 'fa-solid fa-book-open' },
      ].map((s) => (
        <div key={s.label} className="stat-card">
          <div className="stat-card-icon"><i className={s.icon} /></div>
          <div className="stat-card-label">{s.label}</div>
          <div className="stat-card-value">{s.value}</div>
        </div>
      ))}
    </div>
    <div className="grid-2">
      <div className="panel">
        <div className="panel-head"><div className="panel-title">AI WEEKLY INSIGHTS</div></div>
        {[
          { title: '2026 채용 시장: AI 인재 수요 급증', meta: '3분 읽기' },
          { title: '대기업 vs 스타트업: 첫 직장 선택의 기준', meta: '5분 읽기' },
          { title: '신입이 놓치기 쉬운 자소서 3가지 함정', meta: '4분 읽기' },
        ].map((a, i) => (
          <div key={i} className="mission-item">
            <div className="mission-icon"><i className="fa-solid fa-newspaper" /></div>
            <div className="mission-body">
              <div className="mission-title">{a.title}</div>
              <div className="mission-meta">{a.meta}</div>
            </div>
            <span className="tag tag--ai">AI</span>
          </div>
        ))}
      </div>
      <div className="panel">
        <div className="panel-head"><div className="panel-title">COMMUNITY</div></div>
        {[
          { title: '삼성전자 상반기 코테 후기', meta: '경영학과 · 익명 · 2h' },
          { title: '카카오 인턴 면접 질문 공유', meta: '컴공과 · 익명 · 4h' },
          { title: '자소서 첨삭 품앗이 구합니다', meta: '국문과 · 익명 · 1d' },
        ].map((c, i) => (
          <div key={i} className="mission-item">
            <div className="mission-icon"><i className="fa-solid fa-comments" /></div>
            <div className="mission-body">
              <div className="mission-title">{c.title}</div>
              <div className="mission-meta">{c.meta}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ============================================================
   취업지원 (Jobs)
   ============================================================ */
export const JobPosting = () => (
  <GenericPage
    kicker="JOB OPPORTUNITIES"
    title="채용공고"
    sub="대학 협약 기업과 전략 파트너사의 최신 채용공고입니다."
    items={[
      { icon: 'fa-solid fa-building', title: 'NAVER · 프론트엔드 개발자 (신입)', meta: '분당 · 정규직 · D-5', tags: ['IT', '대기업'] },
      { icon: 'fa-solid fa-building', title: '삼성전자 · DS부문 신입사원 공채', meta: '수원 · 정규직 · D-12', tags: ['대기업'] },
      { icon: 'fa-solid fa-building', title: '현대모비스 · 품질관리 신입', meta: '창원 · 정규직 · D-7', tags: ['지역기업', '대기업'] },
      { icon: 'fa-solid fa-building', title: 'LG전자 · UX 디자인 인턴', meta: '서울 · 인턴 · D-3', tags: ['인턴', '대기업'] },
      { icon: 'fa-solid fa-building', title: '카카오 · 서비스 기획자', meta: '판교 · 정규직 · D-15', tags: ['IT', '대기업'] },
    ]}
  />
);

export const WorknetJobs = () => (
  <GenericPage
    kicker="WORKNET INTEGRATION"
    title="워크넷 채용공고"
    sub="정부 고용노동부 워크넷 API와 연동된 공공 일자리 정보입니다."
    items={[
      { icon: 'fa-solid fa-briefcase', title: '경남테크노파크 · 연구원 (학사)', meta: '창원 · 정규직', tags: ['공공'] },
      { icon: 'fa-solid fa-briefcase', title: '한국산업기술시험원 · 시험평가직', meta: '경남 · 정규직', tags: ['공공'] },
      { icon: 'fa-solid fa-briefcase', title: '창원시 청년일자리사업 · 인턴', meta: '창원 · 인턴', tags: ['지자체'] },
    ]}
  />
);

export const YouthPolicy = () => (
  <GenericPage
    kicker="YOUTH POLICY"
    title="청년고용정책"
    sub="청년을 위한 국가 및 지자체 고용정책과 지원사업 정보입니다."
    layout="grid-2"
    items={[
      { icon: 'fa-solid fa-hand-holding-dollar', title: '청년내일채움공제', desc: '2년간 근속 시 최대 1,200만원 지원' },
      { icon: 'fa-solid fa-graduation-cap', title: 'K-디지털 트레이닝', desc: '디지털 분야 취업 연계 무료 교육' },
      { icon: 'fa-solid fa-house', title: '청년 주거지원', desc: '청년 전용 공공임대 및 월세 지원' },
      { icon: 'fa-solid fa-plane', title: '해외취업 지원', desc: 'K-Move 스쿨 해외 취업 연계 프로그램' },
    ]}
  />
);

/* ============================================================
   마이페이지 (My Page)
   ============================================================ */
export const MyHome = () => (
  <div className="page-wrap">
    <PageHeader kicker="MY PAGE · HOME" title="마이홈" sub="김드림 · 경영학과 3학년 · STAGE 03" />
    <div className="grid-4 mb-lg">
      {[
        { label: 'MILEAGE', value: '2,840', icon: 'fa-solid fa-star' },
        { label: 'PROGRAMS', value: '14개', icon: 'fa-solid fa-calendar-check' },
        { label: 'COUNSELING', value: '6회', icon: 'fa-solid fa-comments' },
        { label: 'PORTFOLIOS', value: '3개', icon: 'fa-solid fa-folder' },
      ].map((s) => (
        <div key={s.label} className="stat-card">
          <div className="stat-card-icon"><i className={s.icon} /></div>
          <div className="stat-card-label">{s.label}</div>
          <div className="stat-card-value">{s.value}</div>
        </div>
      ))}
    </div>
    <div className="panel">
      <div className="panel-head"><div className="panel-title">RECENT ACTIVITY</div></div>
      {[
        { title: '9CORE 진로취업진단 완료', meta: '2026-03-18', icon: 'fa-solid fa-check' },
        { title: '실전 모의면접 부트캠프 수료', meta: '2026-03-20', icon: 'fa-solid fa-trophy' },
        { title: 'AI 자소서 마스터클래스 시작', meta: '2026-04-01', icon: 'fa-solid fa-rocket' },
      ].map((a, i) => (
        <div key={i} className="mission-item">
          <div className="mission-icon"><i className={a.icon} /></div>
          <div className="mission-body">
            <div className="mission-title">{a.title}</div>
            <div className="mission-meta">{a.meta}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const MyPortfolio = () => (
  <GenericPage
    kicker="MY PAGE · PORTFOLIO"
    title="포트폴리오 관리"
    sub="당신의 경험, 프로젝트, 성과를 체계적으로 정리하세요."
    layout="grid-3"
    items={[
      { icon: 'fa-solid fa-folder-open', title: '경영 프로젝트 포트폴리오', meta: '업데이트 04.12', desc: '학교 창업 경진대회 수상작 외 2건' },
      { icon: 'fa-solid fa-folder-open', title: '데이터 분석 포트폴리오', meta: '업데이트 04.05', desc: 'Python 기반 4개 프로젝트 포함' },
      { icon: 'fa-solid fa-folder-open', title: '대외활동 기록', meta: '업데이트 03.28', desc: '동아리 활동, 봉사활동 통합 정리' },
    ]}
  />
);

export const MyPrograms = () => (
  <GenericPage
    kicker="MY PAGE · PROGRAMS"
    title="역량프로그램 현황"
    sub="참여 중이거나 완료한 모든 역량개발 프로그램을 확인하세요."
    items={[
      { icon: 'fa-solid fa-check', title: '실전 모의면접 부트캠프', meta: '수료 · 2026-03-20', tags: ['완료'] },
      { icon: 'fa-solid fa-check', title: 'Python 데이터 분석', meta: '수료 · 2026-03-05', tags: ['완료'] },
      { icon: 'fa-solid fa-rotate', title: 'AI 자소서 마스터클래스', meta: '진행중 · 2/4회차', tags: ['진행중'] },
      { icon: 'fa-solid fa-clock', title: '현직자 멘토링 Day', meta: '신청완료 · 2026-05-05', tags: ['예정'] },
    ]}
  />
);

export const MyCounsel = () => (
  <GenericPage
    kicker="MY PAGE · COUNSELING"
    title="상담현황"
    sub="신청한 상담 내역과 일정을 관리하세요."
    items={[
      { icon: 'fa-solid fa-check', title: '진로상담 · 김컨설턴트', meta: '완료 · 2026-03-15', tags: ['완료'] },
      { icon: 'fa-solid fa-check', title: '교수상담 · 박교수', meta: '완료 · 2026-02-28', tags: ['완료'] },
      { icon: 'fa-solid fa-clock', title: '심리상담 · 이상담사', meta: '예정 · 2026-04-20', tags: ['예정'] },
    ]}
  />
);

export const MyMileage = () => (
  <div className="page-wrap">
    <PageHeader
      kicker="MY PAGE · MILEAGE"
      title="마일리지 현황"
      sub="프로그램 참여, 진단 완료, 커뮤니티 활동으로 마일리지를 적립하세요."
    />
    <div className="panel mb-lg" style={{ textAlign: 'center', padding: 48 }}>
      <div style={{ fontSize: 11, letterSpacing: 3, color: 'var(--text-muted)' }}>TOTAL MILEAGE</div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 72, fontWeight: 900,
        background: 'var(--grad-aurora)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginTop: 12,
      }}>
        2,840
      </div>
      <div style={{ fontSize: 13, color: 'var(--accent-green)', marginTop: 4 }}>▲ +420 this week</div>
    </div>
    <div className="panel">
      <div className="panel-head"><div className="panel-title">MILEAGE HISTORY</div></div>
      {[
        { t: '프로그램 수료 · 실전 모의면접 부트캠프', m: '2026-03-20', p: '+300' },
        { t: '진단 완료 · 9CORE 진로취업진단', m: '2026-03-18', p: '+200' },
        { t: '프로그램 수료 · Python 데이터 분석', m: '2026-03-05', p: '+250' },
        { t: '상담 참여 · 진로상담', m: '2026-03-15', p: '+100' },
      ].map((h, i) => (
        <div key={i} className="mission-item">
          <div className="mission-icon"><i className="fa-solid fa-star" /></div>
          <div className="mission-body">
            <div className="mission-title">{h.t}</div>
            <div className="mission-meta">{h.m}</div>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--accent-cyan)' }}>{h.p}</span>
        </div>
      ))}
    </div>
  </div>
);

export const MyEvaluation = () => (
  <div className="page-wrap">
    <PageHeader
      kicker="MY PAGE · AI FINAL ANALYSIS"
      title="AI 종합평가"
      sub="4가지 검사 결과와 활동 이력을 AI가 통합 분석한 당신만의 커리어 인사이트입니다."
    />
    <div className="panel mb-lg" style={{ background: 'linear-gradient(135deg, rgba(85, 230, 255, 0.1), rgba(155, 107, 255, 0.1))' }}>
      <span className="tag tag--ai"><i className="fa-solid fa-wand-magic-sparkles" /> AI INSIGHT</span>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, marginTop: 14 }}>
        "전략적 분석가 유형 · THE STRATEGIC EXPLORER"
      </div>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, marginTop: 14 }}>
        당신은 논리적 사고와 직관적 통찰의 균형이 뛰어난 전략가 유형입니다. 9CORE 분석 결과
        '분석력'과 '계획력'이 상위 5%에 속하며, MBTI INTJ 성향과 함께 구조적 문제 해결에
        강점을 보입니다. IT 서비스 기획, 경영 컨설팅, 데이터 기반 의사결정 분야에서
        높은 성과를 낼 수 있을 것으로 예측됩니다.
      </p>
    </div>

    <div className="grid-3">
      {[
        { label: 'TOP STRENGTH', value: '분석력', sub: '9CORE 상위 5%' },
        { label: 'GROWTH AREA', value: '커뮤니케이션', sub: '개발 필요 영역' },
        { label: 'MATCH INDUSTRY', value: 'IT · 컨설팅', sub: '적합도 92%' },
      ].map((x) => (
        <div key={x.label} className="stat-card">
          <div className="stat-card-label">{x.label}</div>
          <div className="stat-card-value" style={{ fontSize: 24 }}>{x.value}</div>
          <div className="stat-card-trend">{x.sub}</div>
        </div>
      ))}
    </div>
  </div>
);
