import { useMemo, useState } from 'react'
import Modal from '../../components/Modal'
import './GrowthMissionLog.css'

type RecordTab = 'all' | 'word' | 'major' | 'ncs'
type ResultFilter = 'all' | 'correct' | 'wrong'

interface MissionRecord {
  id: string
  date: string
  tab: Exclude<RecordTab, 'all'>
  category: string
  question: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
  explanation: string
}

const records: MissionRecord[] = [
  { id: 'w1', date: '2026-05-21', tab: 'word', category: 'TOEIC 영단어', question: 'accomplish', userAnswer: '성취하다', correctAnswer: '성취하다', isCorrect: true, explanation: '목표를 끝까지 해냈다는 의미로 업무 성과 문맥에서 자주 쓰입니다.' },
  { id: 'w2', date: '2026-05-21', tab: 'word', category: 'TOEIC 영단어', question: 'feasibility', userAnswer: '가능성', correctAnswer: '실현 가능성', isCorrect: true, explanation: '사업이나 프로젝트가 실제 가능한지 검토할 때 쓰입니다.' },
  { id: 'w3', date: '2026-05-21', tab: 'word', category: 'TOEIC 영단어', question: 'proficiency', userAnswer: '전문성', correctAnswer: '숙련도', isCorrect: false, explanation: '특정 언어나 기술을 능숙하게 다루는 수준을 뜻합니다.' },
  { id: 'm1', date: '2026-05-20', tab: 'major', category: '네트워크', question: '라우터가 주로 동작하는 OSI 계층은?', userAnswer: '네트워크 계층', correctAnswer: '네트워크 계층', isCorrect: true, explanation: '라우터는 IP 주소를 기반으로 경로를 선택합니다.' },
  { id: 'm2', date: '2026-05-20', tab: 'major', category: '자료구조', question: '스택의 대표 특성은?', userAnswer: 'FIFO', correctAnswer: 'LIFO', isCorrect: false, explanation: '스택은 마지막에 들어온 데이터가 먼저 나가는 LIFO 구조입니다.' },
  { id: 'n1', date: '2026-05-19', tab: 'ncs', category: '수리능력', question: '정가의 20% 할인 판매가 계산', userAnswer: '11,000원', correctAnswer: '11,000원', isCorrect: true, explanation: '판매가는 정가의 80%이므로 8,800 / 0.8로 계산합니다.' },
  { id: 'n2', date: '2026-05-19', tab: 'ncs', category: '자원관리', question: '남은 예산으로 투입 가능한 시간', userAnswer: '100시간', correctAnswer: '125시간', isCorrect: false, explanation: '남은 예산 1,250만원을 시간당 10만원으로 나누면 125시간입니다.' },
  { id: 'w4', date: '2026-05-18', tab: 'word', category: 'TOEIC 영단어', question: 'collaborate', userAnswer: '협력하다', correctAnswer: '협력하다', isCorrect: true, explanation: '둘 이상의 사람이 함께 일한다는 뜻입니다.' },
  { id: 'm3', date: '2026-05-18', tab: 'major', category: '객체지향', question: '객체지향의 4대 특성이 아닌 것은?', userAnswer: '직렬화', correctAnswer: '직렬화', isCorrect: true, explanation: '직렬화는 객체 저장과 전송을 위한 기법입니다.' },
]

const tabLabels: Record<RecordTab, string> = {
  all: '전체',
  word: 'TOEIC 영단어',
  major: '전공 퀴즈',
  ncs: 'NCS/GSAT',
}

const PAGE_SIZE = 10

export default function GrowthMissionLog() {
  const [tab, setTab] = useState<RecordTab>('all')
  const [filter, setFilter] = useState<ResultFilter>('all')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<MissionRecord | null>(null)

  const filtered = records.filter((record) => {
    if (tab !== 'all' && record.tab !== tab) return false
    if (filter === 'correct' && !record.isCorrect) return false
    if (filter === 'wrong' && record.isCorrect) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pagedRecords = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  const total = records.length
  const correct = records.filter((record) => record.isCorrect).length
  const wrong = total - correct
  const accuracy = Math.round((correct / total) * 100)

  const wrongByCategory = useMemo(() => {
    return records
      .filter((record) => !record.isCorrect)
      .reduce<Record<string, number>>((acc, record) => {
        acc[record.category] = (acc[record.category] ?? 0) + 1
        return acc
      }, {})
  }, [])

  const dates = useMemo(() => {
    const grouped = pagedRecords.reduce<Record<string, MissionRecord[]>>((acc, record) => {
      ;(acc[record.date] ||= []).push(record)
      return acc
    }, {})
    return Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({ date, items: grouped[date] }))
  }, [pagedRecords])

  return (
    <main className="gml-page">
      <header className="gml-header">
        <span>일일미션 기록노트</span>
        <h1>학습 기록과 오답을 한눈에 확인하세요</h1>
        <p>매일 풀었던 미션 결과를 유형별로 모아보고, 자주 틀리는 영역을 복습할 수 있습니다.</p>
      </header>

      <section className="gml-stats" aria-label="미션 통계">
        <article>
          <span>총 문제</span>
          <strong>{total}개</strong>
        </article>
        <article className="correct">
          <span>정답</span>
          <strong>{correct}개</strong>
        </article>
        <article className="wrong">
          <span>오답</span>
          <strong>{wrong}개</strong>
        </article>
        <article>
          <span>정답률</span>
          <strong>{accuracy}%</strong>
        </article>
      </section>

      <section className="gml-card gml-wrong">
        <h2>자주 틀리는 카테고리</h2>
        <div>
          {Object.entries(wrongByCategory).map(([category, count]) => (
            <span key={category}>{category} · {count}회</span>
          ))}
        </div>
      </section>

      <section className="gml-card gml-filters">
        <div>
          {(Object.keys(tabLabels) as RecordTab[]).map((item) => (
            <button
              className={tab === item ? 'active' : ''}
              key={item}
              type="button"
              onClick={() => {
                setTab(item)
                setPage(1)
              }}
            >
              {tabLabels[item]}
            </button>
          ))}
        </div>
        <div>
          <button className={filter === 'all' ? 'active' : ''} type="button" onClick={() => { setFilter('all'); setPage(1) }}>모두</button>
          <button className={filter === 'correct' ? 'active correct' : ''} type="button" onClick={() => { setFilter('correct'); setPage(1) }}>정답만</button>
          <button className={filter === 'wrong' ? 'active wrong' : ''} type="button" onClick={() => { setFilter('wrong'); setPage(1) }}>오답만</button>
        </div>
        <span>{filtered.length}개 조회중</span>
      </section>

      <section className="gml-records">
        {filtered.length === 0 && (
          <div className="gml-empty">
            <i className="fa-solid fa-inbox" />
            <p>기록이 없습니다</p>
          </div>
        )}
        {dates.map(({ date, items }) => (
          <article className="gml-card gml-date-card" key={date}>
            <div className="gml-date-head">
              <strong>{date}</strong>
              <span>{items.filter((item) => item.isCorrect).length}정답 · {items.filter((item) => !item.isCorrect).length}오답</span>
            </div>
            <div className="gml-record-grid">
              {items.map((item) => (
                <button
                  className={`gml-record ${item.isCorrect ? 'correct' : 'wrong'}`}
                  key={item.id}
                  type="button"
                  onClick={() => setDetail(item)}
                >
                  <div>
                    <span>{tabLabels[item.tab]}</span>
                    <strong>{item.isCorrect ? '정답' : '오답'}</strong>
                  </div>
                  <p>{item.question}</p>
                  <small>{item.category}</small>
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>

      {filtered.length > 0 && (
        <nav className="gml-pagination" aria-label="기록 페이지 이동">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            이전
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <button
              className={currentPage === pageNumber ? 'active' : ''}
              key={pageNumber}
              type="button"
              onClick={() => setPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            다음
          </button>
          <span>
            {pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, filtered.length)} / {filtered.length}
          </span>
        </nav>
      )}

      <Modal open={detail !== null} onClose={() => setDetail(null)} size="sm">
        {detail && (
          <div className="gml-detail">
            <span className={`gml-detail-status ${detail.isCorrect ? 'correct' : 'wrong'}`}>
              {detail.isCorrect ? '정답' : '오답'}
            </span>
            <h2>{detail.question}</h2>
            <dl>
              <div>
                <dt>내 답</dt>
                <dd>{detail.userAnswer}</dd>
              </div>
              <div>
                <dt>정답</dt>
                <dd>{detail.correctAnswer}</dd>
              </div>
              <div>
                <dt>해설</dt>
                <dd>{detail.explanation}</dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>
    </main>
  )
}
