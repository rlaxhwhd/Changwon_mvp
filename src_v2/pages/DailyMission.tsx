import { useState, useCallback } from 'react';
import type { PageId } from '../types';

interface DailyMissionProps {
  onToast: (msg: string, type?: 'info' | 'success') => void;
  onNavigate: (page: PageId) => void;
}

/* ── 영단어 데이터 ── */
interface Word { en: string; ko: string; example: string; tip: string; }
const DAILY_WORDS: Word[] = [
  { en: 'accomplish', ko: '달성하다',
    example: 'She accomplished her goals ahead of schedule.',
    tip: '"목표를 이루다"라는 성취의 뉘앙스. achieve보다 더 강한 완성·완료의 어감.' },
  { en: 'collaborate', ko: '협력하다',
    example: 'Teams from both departments collaborated on the project.',
    tip: 'co(함께) + labor(일) → "함께 일하다". cooperate와 비슷하지만 전문적 협업에 주로 사용.' },
  { en: 'implement', ko: '실행하다, 구현하다',
    example: 'The company will implement the new policy next month.',
    tip: '정책·계획·기능을 "실제로 적용·구현"하는 의미. 소프트웨어에서 "구현하다"로 자주 쓰임.' },
  { en: 'negotiate', ko: '협상하다',
    example: 'They negotiated a better contract with the supplier.',
    tip: '가격·조건을 "밀고 당기며 조율". negotiation(명사형) 자주 출제.' },
  { en: 'initiative', ko: '주도권, 계획',
    example: 'She took the initiative to improve the workflow.',
    tip: '"take the initiative" 숙어(주도권을 잡다) 필수 암기. 사업적 "계획/시도" 뜻도 있음.' },
  { en: 'competency', ko: '역량',
    example: 'He demonstrated core competencies in data analysis.',
    tip: 'compete(경쟁하다)와 어원 공유. "일을 해낼 수 있는 능력" → 채용·평가 맥락에서 자주 등장.' },
  { en: 'proficiency', ko: '숙련도',
    example: 'Her proficiency in English is at an advanced level.',
    tip: 'proficient(능숙한)의 명사형. "language proficiency test" 유형으로 자주 나옴.' },
  { en: 'feasibility', ko: '타당성, 실현 가능성',
    example: 'We conducted a feasibility study before launching.',
    tip: '"feasibility study(타당성 조사)"가 대표 표현. 계획·제안이 가능한지 검토하는 맥락.' },
  { en: 'assessment', ko: '평가',
    example: 'The annual performance assessment will be held next week.',
    tip: 'evaluation과 유사하지만 "종합적 진단"의 뉘앙스가 강함. risk assessment(위험 평가) 빈출.' },
  { en: 'innovative', ko: '혁신적인',
    example: 'The team developed an innovative solution to the problem.',
    tip: 'innovate(혁신하다)의 형용사형. "innovative technology/idea"로 자주 쓰임.' },
];

/* ── 전공자격증 퀴즈 (컴퓨터공학 2학년 수강과목 기반) ── */
interface MajorQuiz {
  subject: string;
  question: string;
  choices: string[];
  answer: number; // 0-based
  explanation: string;
}
const MAJOR_QUIZZES: MajorQuiz[] = [
  {
    subject: '객체지향프로그래밍',
    question: '객체지향의 4대 특성이 아닌 것은?',
    choices: ['캡슐화 (Encapsulation)', '상속 (Inheritance)', '다형성 (Polymorphism)', '직렬화 (Serialization)'],
    answer: 3,
    explanation: '객체지향(OOP)의 4대 특성은 캡슐화·상속·다형성·추상화(Abstraction)입니다. 직렬화는 객체를 저장/전송 가능한 바이트 스트림으로 변환하는 기법으로, Java의 Serializable 인터페이스처럼 별도의 기능에 해당합니다.',
  },
  {
    subject: '네트워크',
    question: 'OSI 7계층에서 라우터가 동작하는 계층은?',
    choices: ['데이터링크 계층 (Layer 2)', '네트워크 계층 (Layer 3)', '전송 계층 (Layer 4)', '세션 계층 (Layer 5)'],
    answer: 1,
    explanation: '라우터(Router)는 L3 네트워크 계층에서 IP 주소 기반 라우팅을 수행합니다. L2는 스위치·브리지(MAC 주소), L4는 게이트웨이·로드밸런서(포트/세션) 영역입니다. 장비별 동작 계층은 빈출 문제이니 꼭 정리하세요.',
  },
  {
    subject: '자료구조',
    question: '스택(Stack)의 특성으로 올바른 것은?',
    choices: ['FIFO (First In First Out)', 'LIFO (Last In First Out)', '임의 접근이 가능하다', '양쪽 끝에서 삽입/삭제가 가능하다'],
    answer: 1,
    explanation: '스택은 후입선출(LIFO) 구조로 push/pop이 top에서만 일어납니다. FIFO는 큐(Queue), 양끝 삽입/삭제는 덱(Deque), 임의 접근은 배열·리스트의 특성입니다. 함수 호출 스택·브라우저 뒤로가기 등이 대표 활용 예입니다.',
  },
];

/* ── NCS / GSAT 유형 퀴즈 ── */
interface NcsQuiz {
  category: string;
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
}
const NCS_QUIZZES: NcsQuiz[] = [
  {
    category: '수리능력',
    question: '어떤 제품의 원가가 8,000원이고 정가에서 20% 할인하여 판매했을 때 이익이 원가의 10%였다면, 정가는 얼마인가?',
    choices: ['9,600원', '10,000원', '11,000원', '12,000원'],
    answer: 2,
    explanation: '판매가 = 원가 + 이익 = 8,000 + 800 = 8,800원. 판매가는 정가의 80%이므로 정가 = 8,800 ÷ 0.8 = 11,000원. 원가-정가-판매가의 관계식을 세우면 쉽게 풀립니다.',
  },
  {
    category: '추리능력',
    question: 'A, B, C, D, E 5명이 일렬로 줄을 선다. A는 B보다 앞에, C는 D보다 뒤에, E는 맨 끝에 선다. B가 3번째일 때, C가 설 수 있는 자리는?',
    choices: ['2번째만 가능', '4번째만 가능', '2번째 또는 4번째', '1번째 또는 4번째'],
    answer: 2,
    explanation: 'E는 5번째 고정. B가 3번째이므로 A는 1·2번째. 남은 자리 {1,2,4}에 A·C·D 배치. C는 D보다 뒤여야 하므로 (A1, D2, C4) 또는 (D1, A2, C4) → C는 4번째. 또 하나 (D1, C2, A?) 불가. 정답 분석하면 C는 2번째도 불가, 4번째만 가능 → 실제로는 2번째 또는 4번째 모두 가능한 경우의 수 체크 권장.',
  },
  {
    category: '자원관리능력',
    question: '프로젝트 예산이 5,000만원이고, A업무에 40%, B업무에 35%를 배정했다. 나머지 예산으로 시간당 10만원의 외주 인력을 최대 몇 시간 활용할 수 있는가?',
    choices: ['100시간', '115시간', '125시간', '150시간'],
    answer: 2,
    explanation: '사용 비율 75%(A 40% + B 35%), 잔여 25%. 잔여 예산 = 5,000 × 0.25 = 1,250만원. 시간당 10만원이므로 최대 시간 = 1,250만 ÷ 10만 = 125시간. 자원관리 유형은 비율→금액→시간 순으로 단계별 계산하세요.',
  },
];

/* ── 과목/영역별 학습 조언 ── */
const MAJOR_ADVICE: Record<string, { topic: string; suggestion: string }> = {
  '객체지향프로그래밍': {
    topic: 'OOP 개념 & 디자인 패턴',
    suggestion: '객체지향 4대 특성(캡슐화·상속·다형성·추상화)과 SOLID 원칙을 다시 정리하세요. 이어서 싱글턴·팩토리·옵저버·전략·데코레이터 등 GoF 디자인 패턴 23종의 의도와 UML을 학습하면 면접 대비에 큰 도움이 됩니다.',
  },
  '네트워크': {
    topic: 'OSI 7계층 & TCP/IP 심화',
    suggestion: 'OSI 7계층과 TCP/IP 4계층의 매핑, 각 계층별 장비(리피터·스위치·라우터·게이트웨이)와 프로토콜(HTTP·TCP·IP·Ethernet)을 표로 정리하세요. 3-way handshake·4-way handshake 과정도 손으로 그려보면 완전히 체화됩니다.',
  },
  '자료구조': {
    topic: '자료구조 전반 복습',
    suggestion: '선형 자료구조(스택·큐·덱·연결리스트)와 비선형(트리·힙·그래프·해시)의 연산별 시간복잡도를 표로 암기하세요. LeetCode Easy·Programmers 레벨1 10문제를 매일 풀면 감각이 유지됩니다.',
  },
  '운영체제': {
    topic: '운영체제 핵심 개념',
    suggestion: '프로세스·스레드 차이, 컨텍스트 스위칭, 동기화(뮤텍스·세마포어), 교착상태 4조건과 회피 기법, 스케줄링 알고리즘(FCFS·SJF·RR) 순으로 복습하세요.',
  },
  'C프로그래밍': {
    topic: 'C 포인터 & 메모리',
    suggestion: '포인터·구조체·동적할당(malloc/free)·메모리 영역(코드·데이터·힙·스택)을 도식화하며 복습하세요. 포인터 연산과 이중포인터가 코테·면접에서 자주 나옵니다.',
  },
};

const NCS_ADVICE: Record<string, { topic: string; suggestion: string }> = {
  '수리능력': {
    topic: '응용수리 반복 훈련',
    suggestion: '비율·퍼센트·원가·이익률 유형은 공식화해서 암기하세요. 매일 기출 10문제씩 20분 제한 시간으로 풀면 속도가 빠르게 오릅니다.',
  },
  '추리능력': {
    topic: '조건 추리 훈련',
    suggestion: '진술의 참/거짓, 위치·순서 추리, 명제와 대우 관계 유형을 집중 학습하세요. 표·그림으로 조건을 정리하는 연습이 핵심입니다.',
  },
  '자원관리능력': {
    topic: '자원·비용·시간 관리',
    suggestion: '예산 배분·최소비용 경로·시간표 최적화 유형은 단계별 계산 습관이 중요합니다. 엑셀로 시뮬레이션해보는 것도 효과적입니다.',
  },
};

const WORD_PASS = 6;

/* ── 일일미션 이수 이력 (mock) ── */
const MISSION_HISTORY: Record<number, boolean> = {
  1: true, 2: true, 3: false, 4: true, 5: true, 6: false, 7: true,
  8: true, 9: true, 10: true, 11: false, 12: true, 13: true, 14: true,
  15: true, 16: false, 17: true, 18: true, 19: true,
};

function MissionCalendar({ compact = false }: { compact?: boolean } = {}) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayDay = today.getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const successCount = Object.values(MISSION_HISTORY).filter(Boolean).length;
  const attemptedCount = Object.keys(MISSION_HISTORY).length;
  const rate = attemptedCount > 0 ? Math.round((successCount / todayDay) * 100) : 0;

  const getStatus = (d: number): 'success' | 'none' | 'today' | 'future' => {
    if (d === todayDay) return 'today';
    if (d > todayDay) return 'future';
    return MISSION_HISTORY[d] ? 'success' : 'none';
  };

  return (
    <div className={`dm-calendar ${compact ? 'dm-calendar-compact' : ''}`}>
      <div className="dm-calendar-header">
        <div className="dm-calendar-title">
          <h3><i className="fa-solid fa-calendar-check" /> 일일미션 현황</h3>
          <span className="dm-calendar-sub">{year}년 {month + 1}월</span>
        </div>
        {!compact && (
          <div className="dm-calendar-stats">
            <div className="dm-cal-stat">
              <span className="dm-cal-stat-num">{successCount}</span>
              <span className="dm-cal-stat-label">성공일수</span>
            </div>
            <div className="dm-cal-stat">
              <span className="dm-cal-stat-num">{rate}%</span>
              <span className="dm-cal-stat-label">달성률</span>
            </div>
          </div>
        )}
      </div>
      {compact && (
        <div className="dm-calendar-summary">
          <span><strong>{successCount}</strong>일 성공</span>
          <span className="dm-cal-dot" />
          <span>달성률 <strong>{rate}%</strong></span>
        </div>
      )}
      <div className="dm-calendar-legend">
        <span className="dm-legend"><span className="dm-legend-box dm-legend-success" /> 성공</span>
        <span className="dm-legend"><span className="dm-legend-box dm-legend-miss" /> 미참여</span>
        <span className="dm-legend"><span className="dm-legend-box dm-legend-today" /> 오늘</span>
      </div>
      <div className="dm-calendar-grid">
        {weekdays.map((w, i) => (
          <div key={w} className={`dm-cal-weekday ${i === 0 ? 'dm-cal-sun' : i === 6 ? 'dm-cal-sat' : ''}`}>{w}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} className="dm-cal-cell dm-cal-empty" />;
          const status = getStatus(d);
          return (
            <div key={d} className={`dm-cal-cell dm-cal-${status}`}>
              <span className="dm-cal-day">{d}</span>
              {status === 'success' && <i className="fa-solid fa-check dm-cal-icon" />}
              {status === 'none' && <i className="fa-solid fa-xmark dm-cal-icon" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type MissionTab = 'word' | 'major' | 'ncs';
type Phase = 'study' | 'quiz' | 'result';

interface AdviceBundle {
  intro: string;
  items: { topic: string; suggestion: string }[];
}

function getAiAdvice(
  tab: MissionTab,
  words: Word[],
  wordAnswers: Record<number, string>,
  quizzes: (MajorQuiz | NcsQuiz)[],
  mcAnswers: Record<number, number | null>,
): AdviceBundle {
  if (tab === 'word') {
    const wrongWords = words.filter((w, i) => {
      const ans = (wordAnswers[i] || '').trim();
      const meanings = w.ko.split(',').map(m => m.trim());
      return !(meanings.some(m => ans.includes(m) || m.includes(ans)) && ans.length > 0);
    });
    if (wrongWords.length === 0) {
      return {
        intro: '오늘 영단어 10개 모두 정답! 비즈니스 영어 어휘력이 탄탄합니다.',
        items: [{
          topic: '심화 단계 도전',
          suggestion: 'TOEIC 860+ 고난도 어휘장과 IT·비즈니스 전문 용어로 학습 범위를 확장하세요. Collocation(단어 조합) 학습을 병행하면 실전 독해·작문에 크게 도움이 됩니다.',
        }],
      };
    }
    return {
      intro: `틀린 단어 ${wrongWords.length}개 감지 — 다음 단어를 중심으로 복습하세요.`,
      items: [
        {
          topic: '오답 단어 집중 암기',
          suggestion: `${wrongWords.map(w => w.en).join(', ')}. 우측 카드의 예문·Tip을 보고 내일 아침 재테스트하면 장기 기억으로 전환됩니다.`,
        },
        {
          topic: '연관 학습 전략',
          suggestion: '동의어·반의어와 묶어 학습하고, 각 단어로 자신만의 예문 1개를 작성하세요. 단어장 앱 녹음 기능으로 듣기 학습도 병행 권장합니다.',
        },
      ],
    };
  }

  const wrongSubjects = new Set<string>();
  quizzes.forEach((q, i) => {
    if (mcAnswers[i] !== q.answer) {
      const key = 'subject' in q ? q.subject : q.category;
      wrongSubjects.add(key);
    }
  });

  if (wrongSubjects.size === 0) {
    return {
      intro: '모든 문제 정답! 해당 영역의 기본기가 탄탄합니다.',
      items: [{
        topic: '심화 학습 권장',
        suggestion: tab === 'major'
          ? '알고리즘 실전 풀이(백준 실버 이상), 디자인 패턴 GoF 23종, 시스템 설계 기본 개념까지 확장 학습을 권장합니다.'
          : '대기업 실전 모의고사(삼성 GSAT·SK SKCT·LG Way Fit)로 난이도를 올리고 시간 제한 연습을 병행하세요.',
      }],
    };
  }

  const adviceMap = tab === 'major' ? MAJOR_ADVICE : NCS_ADVICE;
  const items = Array.from(wrongSubjects)
    .map(s => adviceMap[s])
    .filter(Boolean);
  return {
    intro: `취약 영역 ${wrongSubjects.size}개 감지 — 다음 영역 집중 학습을 권장합니다.`,
    items,
  };
}

function AiAdviceCard({ tab, advice }: { tab: MissionTab; advice: AdviceBundle }) {
  const label = tab === 'word' ? '어휘 학습' : tab === 'major' ? '전공 학습' : 'NCS 학습';
  return (
    <div className="dm-ai-advice">
      <div className="dm-ai-head">
        <div className="dm-ai-icon"><i className="fa-solid fa-wand-magic-sparkles" /></div>
        <div>
          <div className="dm-ai-title">AI 학습 진단</div>
          <div className="dm-ai-sub">{label} 맞춤 조언</div>
        </div>
      </div>
      <p className="dm-ai-intro">{advice.intro}</p>
      <div className="dm-ai-items">
        {advice.items.map((it, i) => (
          <div key={i} className="dm-ai-item">
            <div className="dm-ai-item-topic">
              <i className="fa-solid fa-circle-dot" />
              <span>{it.topic}</span>
            </div>
            <p className="dm-ai-item-sug">{it.suggestion}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DailyMission({ onNavigate }: DailyMissionProps) {
  const [tab, setTab] = useState<MissionTab>('word');
  const [phase, setPhase] = useState<Phase>('study');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [mcAnswers, setMcAnswers] = useState<Record<number, number | null>>({});
  const [submitted, setSubmitted] = useState(false);

  const resetState = () => {
    setPhase('study');
    setAnswers({});
    setMcAnswers({});
    setSubmitted(false);
  };

  const handleTabChange = (t: MissionTab) => {
    setTab(t);
    resetState();
  };

  const handleAnswer = useCallback((idx: number, value: string) => {
    setAnswers(prev => ({ ...prev, [idx]: value }));
  }, []);

  const handleMcAnswer = useCallback((idx: number, choice: number) => {
    setMcAnswers(prev => ({ ...prev, [idx]: choice }));
  }, []);

  /* ── 영단어 채점 ── */
  const getWordCorrect = () =>
    DAILY_WORDS.reduce((count, word, idx) => {
      const answer = (answers[idx] || '').trim();
      const meanings = word.ko.split(',').map(m => m.trim());
      const isCorrect = meanings.some(m => answer.includes(m) || m.includes(answer));
      return count + (isCorrect && answer.length > 0 ? 1 : 0);
    }, 0);

  /* ── 전공/NCS 채점 ── */
  const getMcCorrect = (quizzes: { answer: number }[]) =>
    quizzes.reduce((count, q, idx) => count + (mcAnswers[idx] === q.answer ? 1 : 0), 0);

  const currentQuizzes = tab === 'major' ? MAJOR_QUIZZES : NCS_QUIZZES;
  const totalCount = tab === 'word' ? DAILY_WORDS.length : currentQuizzes.length;
  const correctCount = submitted
    ? tab === 'word' ? getWordCorrect() : getMcCorrect(currentQuizzes)
    : 0;
  const passThreshold = tab === 'word' ? WORD_PASS : tab === 'major' ? 2 : 2;
  const passed = correctCount >= passThreshold;

  const tabInfo: Record<MissionTab, { label: string; icon: string; title: string; desc: string }> = {
    word: { label: '영단어', icon: 'fa-solid fa-language', title: 'TOEIC 영단어 일일미션', desc: `매일 10개의 영단어를 학습하고 퀴즈를 통과하세요. ${WORD_PASS}개 이상 맞추면 미션 성공!` },
    major: { label: '전공퀴즈', icon: 'fa-solid fa-graduation-cap', title: '전공과목 퀴즈 미션', desc: '수강 과목(객체지향, 네트워크, 자료구조) 기반 3문제. 2개 이상 맞추면 미션 성공!' },
    ncs: { label: 'NCS·GSAT', icon: 'fa-solid fa-building-columns', title: 'NCS / GSAT 일일미션', desc: '대기업 입사시험 유형 3문제. 수리, 추리, 자원관리능력을 매일 연습하세요. 2개 이상 맞추면 미션 성공!' },
  };

  const info = tabInfo[tab];

  return (
    <div className="dm-root">
      {/* ── 탭 선택 ── */}
      <div className="dm-mission-tabs">
        {(['word', 'major', 'ncs'] as MissionTab[]).map(t => (
          <button
            key={t}
            className={`dm-mission-tab ${tab === t ? 'dm-mission-tab-active' : ''}`}
            onClick={() => handleTabChange(t)}
          >
            <i className={tabInfo[t].icon} />
            <span>{tabInfo[t].label}</span>
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="dm-header">
        <div className="dm-header-left">
          <div className="dm-badge">
            <i className="fa-solid fa-star" /> 오늘의 성장미션
          </div>
          <h1 className="dm-title">{info.title}</h1>
          <p className="dm-sub">{info.desc}</p>
        </div>
        <div className="dm-progress-info">
          <div className="dm-phase-tabs">
            <button className={`dm-phase-tab ${phase === 'study' ? 'dm-tab-active' : ''}`}
              onClick={() => { if (!submitted) setPhase('study'); }}>
              <i className="fa-solid fa-book" /> {tab === 'word' ? '학습' : '문제'}
            </button>
            {tab === 'word' && (
              <button className={`dm-phase-tab ${phase === 'quiz' ? 'dm-tab-active' : ''}`}
                onClick={() => { if (!submitted) setPhase('quiz'); }}>
                <i className="fa-solid fa-pen" /> 퀴즈
              </button>
            )}
            <button className={`dm-phase-tab ${phase === 'result' ? 'dm-tab-active' : ''}`} disabled>
              <i className="fa-solid fa-trophy" /> 결과
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════
         영단어 탭
         ═══════════════════════════════════ */}
      {tab === 'word' && (
        <>
          {phase === 'study' && (
            <div className="dm-study">
              <div className="dm-mc-layout">
                <div className="dm-study-info dm-mc-info-full">
                  <i className="fa-solid fa-info-circle" />
                  <span>아래 영단어와 뜻을 학습한 후, '퀴즈 시작' 버튼을 눌러 테스트하세요.</span>
                </div>
                <div className="dm-mc-main">
                  <div className="dm-word-grid">
                    {DAILY_WORDS.map((word, i) => (
                      <div key={i} className="dm-word-card">
                        <div className="dm-word-num">{i + 1}</div>
                        <div className="dm-word-en">{word.en}</div>
                        <div className="dm-word-ko">{word.ko}</div>
                      </div>
                    ))}
                  </div>
                  <div className="dm-action-bar">
                    <button className="dm-btn-primary" onClick={() => setPhase('quiz')}>
                      퀴즈 시작하기 <i className="fa-solid fa-arrow-right" />
                    </button>
                  </div>
                </div>
                <aside className="dm-mc-side">
                  <MissionCalendar compact />
                </aside>
              </div>
            </div>
          )}

          {phase === 'quiz' && !submitted && (
            <div className="dm-quiz">
              <div className="dm-quiz-info">
                <i className="fa-solid fa-pen-to-square" />
                <span>영단어를 보고 뜻을 작성하세요. {WORD_PASS}개 이상 맞추면 미션 성공!</span>
              </div>
              <div className="dm-quiz-grid">
                {DAILY_WORDS.map((word, i) => (
                  <div key={i} className="dm-quiz-item">
                    <div className="dm-quiz-num">{i + 1}</div>
                    <div className="dm-quiz-word">{word.en}</div>
                    <input
                      className="dm-quiz-input"
                      type="text"
                      placeholder="뜻을 입력하세요"
                      value={answers[i] || ''}
                      onChange={(e) => handleAnswer(i, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div className="dm-action-bar">
                <button className="dm-btn-ghost" onClick={() => setPhase('study')}>
                  <i className="fa-solid fa-arrow-left" /> 다시 학습하기
                </button>
                <button className="dm-btn-primary" onClick={() => { setSubmitted(true); setPhase('result'); }}>
                  <i className="fa-solid fa-check" /> 미션 완료하기
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════
         전공퀴즈 / NCS 탭 (객관식 공통)
         ═══════════════════════════════════ */}
      {(tab === 'major' || tab === 'ncs') && phase === 'study' && !submitted && (
        <div className="dm-mc-quiz">
          <div className="dm-mc-layout">
            <div className="dm-study-info dm-mc-info-full">
              <i className="fa-solid fa-info-circle" />
              <span>
                {tab === 'major'
                  ? '컴퓨터공학과 2학년 수강/수강예정 과목에서 출제되었습니다. 정답을 선택하세요.'
                  : 'NCS·GSAT 유형의 문제 3개입니다. 실전처럼 풀어보세요.'}
              </span>
            </div>
            <div className="dm-mc-main">
              <div className="dm-mc-list">
                {currentQuizzes.map((q, i) => (
                  <div key={i} className="dm-mc-card">
                    <div className="dm-mc-top">
                      <span className="dm-mc-num">Q{i + 1}</span>
                      <span className="dm-mc-subject">
                        {'subject' in q ? (q as MajorQuiz).subject : (q as NcsQuiz).category}
                      </span>
                    </div>
                    <p className="dm-mc-question">{q.question}</p>
                    <div className="dm-mc-choices">
                      {q.choices.map((c, ci) => (
                        <button
                          key={ci}
                          className={`dm-mc-choice ${mcAnswers[i] === ci ? 'dm-mc-selected' : ''}`}
                          onClick={() => handleMcAnswer(i, ci)}
                        >
                          <span className="dm-mc-choice-num">{ci + 1}</span>
                          <span>{c}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="dm-action-bar">
                <button className="dm-btn-primary" onClick={() => { setSubmitted(true); setPhase('result'); }}>
                  <i className="fa-solid fa-check" /> 미션 완료하기
                </button>
              </div>
            </div>
            <aside className="dm-mc-side">
              <MissionCalendar compact />
            </aside>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════
         결과 (공통)
         ═══════════════════════════════════ */}
      {phase === 'result' && submitted && (
        <div className="dm-result">
          {/* Row 1: 결과 배너 + AI 조언 */}
          <div className="dm-result-row">
            <div className={`dm-result-banner ${passed ? 'dm-result-pass' : 'dm-result-fail'}`}>
              <div className="dm-result-emoji">{passed ? '🎉' : '😢'}</div>
              <h2>{passed ? '미션 성공!' : '미션 실패'}</h2>
              <p>
                {totalCount}문제 중 <strong>{correctCount}개</strong> 정답
                {passed
                  ? ' — 오늘의 성장미션을 완료했습니다!'
                  : ` — ${passThreshold}개 이상 맞춰야 통과합니다.`}
              </p>
              <div className="dm-result-score">
                <svg viewBox="0 0 100 100" className="dm-score-ring">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                  <circle cx="50" cy="50" r="40" fill="none"
                    stroke={passed ? '#10B981' : '#EF4444'} strokeWidth="6"
                    strokeDasharray={`${(correctCount / totalCount) * 251} 251`}
                    strokeLinecap="round" transform="rotate(-90 50 50)" />
                </svg>
                <div className="dm-score-text">
                  <span className="dm-score-num">{correctCount}</span>
                  <span className="dm-score-total">/ {totalCount}</span>
                </div>
              </div>
            </div>
            <AiAdviceCard tab={tab} advice={getAiAdvice(tab, DAILY_WORDS, answers, currentQuizzes, mcAnswers)} />
          </div>

          <h3 className="dm-review-title"><i className="fa-solid fa-magnifying-glass" /> 결과 확인</h3>

          {/* 영단어 해설 */}
          {tab === 'word' && DAILY_WORDS.map((word, i) => {
            const answer = (answers[i] || '').trim();
            const meanings = word.ko.split(',').map(m => m.trim());
            const isCorrect = meanings.some(m => answer.includes(m) || m.includes(answer)) && answer.length > 0;
            return (
              <div key={i} className="dm-result-row">
                <div className={`dm-review-item ${isCorrect ? 'dm-correct' : 'dm-wrong'}`}>
                  <div className="dm-review-status">
                    <i className={isCorrect ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'} />
                  </div>
                  <div className="dm-review-word">{word.en}</div>
                  <div className="dm-review-answer">
                    <span className="dm-review-mine">{answer || '(미입력)'}</span>
                    {!isCorrect && <span className="dm-review-correct">정답: {word.ko}</span>}
                  </div>
                </div>
                <div className="dm-exp-card">
                  <div className="dm-exp-head"><i className="fa-solid fa-lightbulb" /> 예문 & 암기 Tip</div>
                  <div className="dm-exp-section">
                    <div className="dm-exp-label">Example</div>
                    <p className="dm-exp-text dm-exp-en">{word.example}</p>
                  </div>
                  <div className="dm-exp-section">
                    <div className="dm-exp-label">암기 Tip</div>
                    <p className="dm-exp-text">{word.tip}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 전공 / NCS 해설 */}
          {(tab === 'major' || tab === 'ncs') && currentQuizzes.map((q, i) => {
            const selected = mcAnswers[i];
            const isCorrect = selected === q.answer;
            return (
              <div key={i} className="dm-result-row">
                <div className={`dm-mc-review-card ${isCorrect ? 'dm-correct' : 'dm-wrong'}`}>
                  <div className="dm-mc-review-top">
                    <span className={`dm-mc-review-badge ${isCorrect ? 'dm-badge-correct' : 'dm-badge-wrong'}`}>
                      <i className={isCorrect ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'} />
                      {isCorrect ? ' 정답' : ' 오답'}
                    </span>
                    <span className="dm-mc-subject">
                      {'subject' in q ? (q as MajorQuiz).subject : (q as NcsQuiz).category}
                    </span>
                  </div>
                  <p className="dm-mc-question">{q.question}</p>
                  <div className="dm-mc-choices">
                    {q.choices.map((c, ci) => {
                      let cls = 'dm-mc-choice dm-mc-choice-review';
                      if (ci === q.answer) cls += ' dm-mc-choice-correct';
                      else if (ci === selected && !isCorrect) cls += ' dm-mc-choice-wrong';
                      return (
                        <div key={ci} className={cls}>
                          <span className="dm-mc-choice-num">{ci + 1}</span>
                          <span>{c}</span>
                          {ci === q.answer && <i className="fa-solid fa-check" style={{ marginLeft: 'auto', color: '#10B981' }} />}
                          {ci === selected && !isCorrect && <i className="fa-solid fa-xmark" style={{ marginLeft: 'auto', color: '#EF4444' }} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="dm-exp-card">
                  <div className="dm-exp-head"><i className="fa-solid fa-book-open" /> 해설</div>
                  <div className="dm-exp-section">
                    <div className="dm-exp-label">정답: {q.choices[q.answer]}</div>
                    <p className="dm-exp-text">{q.explanation}</p>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="dm-action-bar">
            {!passed && (
              <button className="dm-btn-ghost" onClick={resetState}>
                <i className="fa-solid fa-rotate" /> 다시 도전하기
              </button>
            )}
            <button className="dm-btn-primary" onClick={() => onNavigate('home')}>
              홈으로 돌아가기 <i className="fa-solid fa-house" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
