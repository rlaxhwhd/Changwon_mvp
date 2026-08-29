import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './TodayGrowthMission.css'
import { usePageHead } from '../../components/PageCrumb'

type MissionTab = 'word' | 'major' | 'ncs'
type MissionPhase = 'study' | 'quiz' | 'result'

interface Word {
  en: string
  ko: string
  example: string
  tip: string
}

interface Quiz {
  category: string
  question: string
  choices: string[]
  answer: number
  explanation: string
}

const WORD_PASS = 6

const dailyWords: Word[] = [
  { en: 'accomplish', ko: '성취하다', example: 'She accomplished her goals ahead of schedule.', tip: '목표를 끝까지 해냈다는 의미로 achieve보다 완료감이 강합니다.' },
  { en: 'collaborate', ko: '협력하다', example: 'Teams from both departments collaborated on the project.', tip: 'co와 labor가 결합된 단어로, 함께 일한다는 뜻입니다.' },
  { en: 'implement', ko: '실행하다', example: 'The company will implement the new policy next month.', tip: '계획이나 기능을 실제로 적용할 때 자주 씁니다.' },
  { en: 'negotiate', ko: '협상하다', example: 'They negotiated a better contract with the supplier.', tip: '조건을 조율하거나 합의점을 찾는 상황에 어울립니다.' },
  { en: 'initiative', ko: '주도권', example: 'She took the initiative to improve the workflow.', tip: 'take the initiative는 먼저 나서서 주도한다는 표현입니다.' },
  { en: 'competency', ko: '역량', example: 'He demonstrated core competencies in data analysis.', tip: '채용과 평가 문맥에서 자주 쓰이는 핵심 단어입니다.' },
  { en: 'proficiency', ko: '숙련도', example: 'Her proficiency in English is at an advanced level.', tip: '언어나 기술을 능숙하게 다루는 수준을 말합니다.' },
  { en: 'feasibility', ko: '실현 가능성', example: 'We conducted a feasibility study before launching.', tip: '계획이 실제 가능한지 검토할 때 사용합니다.' },
  { en: 'assessment', ko: '평가', example: 'The annual performance assessment will be held next week.', tip: '진단과 평가를 포함하는 넓은 의미의 단어입니다.' },
  { en: 'innovative', ko: '혁신적인', example: 'The team developed an innovative solution to the problem.', tip: '새롭고 개선된 아이디어나 기술을 설명할 때 씁니다.' },
]

const majorQuizzes: Quiz[] = [
  {
    category: '객체지향 프로그래밍',
    question: '객체지향의 4대 특성이 아닌 것은?',
    choices: ['캡슐화', '상속', '다형성', '직렬화'],
    answer: 3,
    explanation: '객체지향의 대표 특성은 캡슐화, 상속, 다형성, 추상화입니다. 직렬화는 객체를 저장 또는 전송 가능한 형태로 변환하는 기법입니다.',
  },
  {
    category: '네트워크',
    question: '라우터가 주로 동작하는 OSI 계층은?',
    choices: ['데이터 링크 계층', '네트워크 계층', '전송 계층', '세션 계층'],
    answer: 1,
    explanation: '라우터는 IP 주소를 기반으로 경로를 결정하므로 네트워크 계층에서 동작합니다.',
  },
  {
    category: '자료구조',
    question: '스택의 대표적인 특성은?',
    choices: ['FIFO', 'LIFO', '임의 접근', '양쪽 끝 삽입과 삭제'],
    answer: 1,
    explanation: '스택은 마지막에 들어온 데이터가 먼저 나가는 LIFO 구조입니다.',
  },
]

const ncsQuizzes: Quiz[] = [
  {
    category: '수리능력',
    question: '원가 8,000원 상품을 정가에서 20% 할인해 8,800원에 팔았다. 정가는?',
    choices: ['9,600원', '10,000원', '11,000원', '12,000원'],
    answer: 2,
    explanation: '판매가 8,800원은 정가의 80%이므로 정가는 8,800 / 0.8 = 11,000원입니다.',
  },
  {
    category: '추리능력',
    question: 'A는 B보다 앞, E는 마지막, B가 3번째라면 가능한 판단으로 가장 적절한 것은?',
    choices: ['C는 항상 1번째', 'C는 항상 2번째', '조건을 더 확인해야 한다', 'D는 항상 마지막'],
    answer: 2,
    explanation: '주어진 조건만으로 C와 D의 정확한 위치를 하나로 확정하기 어렵습니다.',
  },
  {
    category: '자원관리',
    question: '예산 5,000만원 중 75%를 사용했다. 시간당 10만원 인력을 추가 투입하면 몇 시간 가능한가?',
    choices: ['100시간', '115시간', '125시간', '150시간'],
    answer: 2,
    explanation: '남은 예산은 25%인 1,250만원입니다. 시간당 10만원이면 125시간 사용 가능합니다.',
  },
]

const missionTabs: Record<MissionTab, { label: string; title: string; description: string; icon: string }> = {
  word: {
    label: 'TOEIC 영단어',
    title: 'TOEIC 영단어 일일퀘스트',
    description: `매일 10개의 핵심 단어를 학습하고 퀴즈를 통과해보세요. ${WORD_PASS}개 이상 맞히면 성공입니다.`,
    icon: 'fa-language',
  },
  major: {
    label: '전공 퀴즈',
    title: '전공과목 퀴즈 퀘스트',
    description: '컴퓨터공학 핵심 개념 3문제를 풀어보세요. 2개 이상 맞히면 성공입니다.',
    icon: 'fa-graduation-cap',
  },
  ncs: {
    label: 'NCS/GSAT',
    title: 'NCS/GSAT 일일퀘스트',
    description: '기업 직무적성 유형 3문제를 실전처럼 풀어보세요. 2개 이상 맞히면 성공입니다.',
    icon: 'fa-building-columns',
  },
}

const historyDays = [
  true, true, false, true, true, false, true,
  true, true, true, false, true, true, true,
  true, false, true, true, true, false, true,
]

function MissionCalendar() {
  const success = historyDays.filter(Boolean).length
  const rate = Math.round((success / historyDays.length) * 100)

  return (
    <aside className="tgm-calendar">
      <div className="tgm-calendar-head">
        <h2>퀘스트 현황</h2>
        <span>2026년 5월</span>
      </div>
      <div className="tgm-calendar-stats">
        <strong>{success}일</strong>
        <span>달성률 {rate}%</span>
      </div>
      <div className="tgm-calendar-grid">
        {historyDays.map((done, index) => (
          <span className={done ? 'done' : ''} key={`${index + 1}`}>
            {index + 1}
          </span>
        ))}
      </div>
    </aside>
  )
}

export default function TodayGrowthMission() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<MissionTab>('word')
  const [phase, setPhase] = useState<MissionPhase>('study')
  const [wordAnswers, setWordAnswers] = useState<Record<number, string>>({})
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)

  const quizzes = tab === 'major' ? majorQuizzes : ncsQuizzes
  const tabInfo = missionTabs[tab]
  usePageHead(tabInfo.title, tabInfo.description)

  const correctCount = useMemo(() => {
    if (!submitted) return 0
    if (tab === 'word') {
      return dailyWords.reduce((count, word, index) => {
        const answer = (wordAnswers[index] ?? '').trim()
        return count + (answer && word.ko.includes(answer) ? 1 : 0)
      }, 0)
    }
    return quizzes.reduce((count, quiz, index) => count + (quizAnswers[index] === quiz.answer ? 1 : 0), 0)
  }, [quizzes, quizAnswers, submitted, tab, wordAnswers])

  const totalCount = tab === 'word' ? dailyWords.length : quizzes.length
  const passThreshold = tab === 'word' ? WORD_PASS : 2
  const passed = correctCount >= passThreshold

  const resetMission = (nextTab = tab) => {
    setTab(nextTab)
    setPhase('study')
    setWordAnswers({})
    setQuizAnswers({})
    setSubmitted(false)
  }

  const submitMission = () => {
    setSubmitted(true)
    setPhase('result')
  }

  return (
    <main className="tgm-page">
      <header className="tgm-header">
        <button className="tgm-log-btn" type="button" onClick={() => navigate('/growth/mission-log')}>
          기록노트 보기
          <i className="fa-solid fa-arrow-right" />
        </button>
      </header>

      <section className="tgm-tabs" aria-label="퀘스트 유형">
        {(Object.keys(missionTabs) as MissionTab[]).map((item) => (
          <button
            className={tab === item ? 'active' : ''}
            key={item}
            type="button"
            onClick={() => resetMission(item)}
          >
            <i className={`fa-solid ${missionTabs[item].icon}`} />
            {missionTabs[item].label}
          </button>
        ))}
      </section>

      <section className="tgm-layout">
        <div className="tgm-main-card">
          <div className="tgm-phase-row">
            <button className={phase === 'study' ? 'active' : ''} type="button" onClick={() => !submitted && setPhase('study')}>
              {tab === 'word' ? '학습' : '문제'}
            </button>
            {tab === 'word' && (
              <button className={phase === 'quiz' ? 'active' : ''} type="button" onClick={() => !submitted && setPhase('quiz')}>
                퀴즈
              </button>
            )}
            <button className={phase === 'result' ? 'active' : ''} type="button" disabled>
              결과
            </button>
          </div>

          {tab === 'word' && phase === 'study' && (
            <>
              <div className="tgm-word-grid">
                {dailyWords.map((word, index) => (
                  <article className="tgm-word-card" key={word.en}>
                    <span>{index + 1}</span>
                    <strong>{word.en}</strong>
                    <p>{word.ko}</p>
                  </article>
                ))}
              </div>
              <div className="tgm-action-row">
                <button className="tgm-primary-btn" type="button" onClick={() => setPhase('quiz')}>
                  퀴즈 시작하기
                </button>
              </div>
            </>
          )}

          {tab === 'word' && phase === 'quiz' && !submitted && (
            <>
              <div className="tgm-quiz-grid">
                {dailyWords.map((word, index) => (
                  <label className="tgm-word-answer" key={word.en}>
                    <span>{index + 1}. {word.en}</span>
                    <input
                      value={wordAnswers[index] ?? ''}
                      onChange={(event) => setWordAnswers((prev) => ({ ...prev, [index]: event.target.value }))}
                      placeholder="뜻을 입력하세요"
                    />
                  </label>
                ))}
              </div>
              <div className="tgm-action-row">
                <button className="tgm-ghost-btn" type="button" onClick={() => setPhase('study')}>다시 학습하기</button>
                <button className="tgm-primary-btn" type="button" onClick={submitMission}>퀘스트 완료하기</button>
              </div>
            </>
          )}

          {tab !== 'word' && phase === 'study' && !submitted && (
            <>
              <div className="tgm-question-list">
                {quizzes.map((quiz, index) => (
                  <article className="tgm-question-card" key={quiz.question}>
                    <div className="tgm-question-top">
                      <span>Q{index + 1}</span>
                      <strong>{quiz.category}</strong>
                    </div>
                    <p>{quiz.question}</p>
                    <div className="tgm-choice-list">
                      {quiz.choices.map((choice, choiceIndex) => (
                        <button
                          className={quizAnswers[index] === choiceIndex ? 'selected' : ''}
                          key={choice}
                          type="button"
                          onClick={() => setQuizAnswers((prev) => ({ ...prev, [index]: choiceIndex }))}
                        >
                          <span>{choiceIndex + 1}</span>
                          {choice}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
              <div className="tgm-action-row">
                <button className="tgm-primary-btn" type="button" onClick={submitMission}>퀘스트 완료하기</button>
              </div>
            </>
          )}

          {phase === 'result' && submitted && (
            <div className="tgm-result">
              <div className={`tgm-result-banner ${passed ? 'pass' : 'fail'}`}>
                <strong>{passed ? '퀘스트 성공' : '퀘스트 재도전'}</strong>
                <p>{totalCount}문제 중 {correctCount}개 정답</p>
                <span>{passed ? '오늘의 성장퀘스트을 완료했습니다.' : `${passThreshold}개 이상 맞히면 퀘스트 성공입니다.`}</span>
              </div>

              <div className="tgm-review-list">
                {tab === 'word'
                  ? dailyWords.map((word, index) => {
                      const mine = wordAnswers[index] ?? ''
                      const correct = Boolean(mine.trim() && word.ko.includes(mine.trim()))
                      return (
                        <article className="tgm-review-card" key={word.en}>
                          <div>
                            <strong>{word.en}</strong>
                            <span className={correct ? 'ok' : 'wrong'}>{correct ? '정답' : '오답'}</span>
                          </div>
                          <p>내 답: {mine || '미입력'} / 정답: {word.ko}</p>
                          <small>{word.example}</small>
                          <small>{word.tip}</small>
                        </article>
                      )
                    })
                  : quizzes.map((quiz, index) => {
                      const selected = quizAnswers[index]
                      const correct = selected === quiz.answer
                      return (
                        <article className="tgm-review-card" key={quiz.question}>
                          <div>
                            <strong>{quiz.category}</strong>
                            <span className={correct ? 'ok' : 'wrong'}>{correct ? '정답' : '오답'}</span>
                          </div>
                          <p>{quiz.question}</p>
                          <small>정답: {quiz.choices[quiz.answer]}</small>
                          <small>{quiz.explanation}</small>
                        </article>
                      )
                    })}
              </div>

              <div className="tgm-action-row">
                <button className="tgm-ghost-btn" type="button" onClick={() => resetMission()}>다시 도전하기</button>
                <button className="tgm-primary-btn" type="button" onClick={() => navigate('/growth')}>내 성장 홈으로</button>
              </div>
            </div>
          )}
        </div>

        <MissionCalendar />
      </section>
    </main>
  )
}
