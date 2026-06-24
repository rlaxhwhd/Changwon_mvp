import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../../components/Modal'
import './MyPrograms.css'

type Status = '신청완료' | '진행중' | '수료' | '취소'

interface AppliedProgram {
  id: string
  title: string
  category: '취업' | 'AI' | '창업' | '전공' | '멘토링' | '어학' | '글로벌'
  hostDept: string
  appliedAt: string
  startDate: string
  endDate: string
  status: Status
  hours: number
  rewardXp: number
  certUrl?: string
  description: string
  reflection?: string
}

const PROGRAMS: AppliedProgram[] = [
  {
    id: 'p-2026-001',
    title: '취업역량강화 캠프 (4기)',
    category: '취업',
    hostDept: '대학일자리플러스센터',
    appliedAt: '2026.03.04',
    startDate: '2026.03.18',
    endDate: '2026.03.20',
    status: '수료',
    hours: 24,
    rewardXp: 120,
    certUrl: '#cert-001',
    description: '3박 4일 합숙 캠프에서 모의면접·기업 분석·자소서 첨삭을 진행했습니다.',
    reflection: '면접 시 답변 구조화(STAR)를 실전에서 연습할 수 있어서 가장 도움됐어요.',
  },
  {
    id: 'p-2026-002',
    title: 'AI 활용 자소서 특강',
    category: 'AI',
    hostDept: '취업전략센터',
    appliedAt: '2026.04.01',
    startDate: '2026.04.08',
    endDate: '2026.04.08',
    status: '수료',
    hours: 3,
    rewardXp: 30,
    certUrl: '#cert-002',
    description: 'ChatGPT·Claude를 활용한 자소서 작성 워크플로우 학습.',
    reflection: '템플릿 의존 없이 강점 중심 단락을 빠르게 뽑아내는 방법을 익혔습니다.',
  },
  {
    id: 'p-2026-003',
    title: '데이터 분석 기초 (Python + Pandas)',
    category: '전공',
    hostDept: '컴퓨터공학과',
    appliedAt: '2026.04.18',
    startDate: '2026.04.22',
    endDate: '2026.05.27',
    status: '진행중',
    hours: 12,
    rewardXp: 72,
    description: '주 1회 3시간씩 5주간 진행되는 실습 강의. 현재 3주차 진행 중.',
  },
  {
    id: 'p-2026-004',
    title: '창업아이디어 경진대회 사전 워크숍',
    category: '창업',
    hostDept: '창업지원센터',
    appliedAt: '2026.05.02',
    startDate: '2026.05.20',
    endDate: '2026.05.21',
    status: '신청완료',
    hours: 16,
    rewardXp: 96,
    description: 'BMC(비즈니스 모델 캔버스) 작성과 발표 자료 코칭을 받습니다.',
  },
  {
    id: 'p-2026-005',
    title: '글로벌 PBL — 베트남 IT 기업 탐방',
    category: '글로벌',
    hostDept: '국제교류처',
    appliedAt: '2026.05.10',
    startDate: '2026.06.24',
    endDate: '2026.07.01',
    status: '신청완료',
    hours: 56,
    rewardXp: 240,
    description: '베트남 호치민/하노이 IT 스타트업 탐방 및 합동 프로젝트.',
  },
  {
    id: 'p-2026-006',
    title: '현직자 멘토링 프로그램 (1:1, 8회)',
    category: '멘토링',
    hostDept: '취업전략센터',
    appliedAt: '2026.03.25',
    startDate: '2026.04.05',
    endDate: '2026.05.31',
    status: '진행중',
    hours: 8,
    rewardXp: 48,
    description: '네이버 백엔드 개발자 멘토와 격주 1:1 멘토링 (현재 5회차).',
  },
  {
    id: 'p-2025-018',
    title: 'TOEIC 집중 캠프 (겨울학기)',
    category: '어학',
    hostDept: '어학교육원',
    appliedAt: '2025.12.18',
    startDate: '2026.01.06',
    endDate: '2026.02.07',
    status: '수료',
    hours: 60,
    rewardXp: 180,
    certUrl: '#cert-003',
    description: '주 5회 / 5주간 LC·RC 집중 학습. 사후 모의고사 765점 기록.',
    reflection: 'PART 7 시간 관리법을 체득. 다음 정기시험 800점 목표.',
  },
  {
    id: 'p-2025-014',
    title: 'AI 챗봇 해커톤 (24시간)',
    category: 'AI',
    hostDept: '소프트웨어융합대학',
    appliedAt: '2025.11.02',
    startDate: '2025.11.15',
    endDate: '2025.11.16',
    status: '취소',
    hours: 0,
    rewardXp: 0,
    description: '개인 사정으로 시작 전 취소.',
  },
]

const STATUS_COLORS: Record<Status, string> = {
  신청완료: '#2E5BFF',
  진행중: '#F59E0B',
  수료: '#22C55E',
  취소: '#99A1A9',
}

const FILTERS = ['전체', '진행중', '신청완료', '수료', '취소'] as const
type Filter = (typeof FILTERS)[number]

export default function MyPrograms() {
  const [filter, setFilter] = useState<Filter>('전체')
  const [detail, setDetail] = useState<AppliedProgram | null>(null)

  const stats = useMemo(() => {
    const total = PROGRAMS.length
    const done = PROGRAMS.filter(p => p.status === '수료').length
    const active = PROGRAMS.filter(p => p.status === '진행중').length
    const upcoming = PROGRAMS.filter(p => p.status === '신청완료').length
    const totalHours = PROGRAMS.filter(p => p.status === '수료').reduce((s, p) => s + p.hours, 0)
    const totalXp = PROGRAMS.filter(p => p.status === '수료').reduce((s, p) => s + p.rewardXp, 0)
    return { total, done, active, upcoming, totalHours, totalXp }
  }, [])

  const visible = useMemo(() => {
    if (filter === '전체') return PROGRAMS
    return PROGRAMS.filter(p => p.status === filter)
  }, [filter])

  return (
    <div className="mp-wrap">
      <header className="mp-hero">
        <div className="mp-hero-copy">
          <span className="mp-breadcrumb">마이페이지 · 비교과프로그램 현황</span>
          <h1>비교과 프로그램 신청 기록</h1>
          <p>지금까지 신청·수료한 비교과 프로그램과 누적 활동 시간을 한눈에 확인할 수 있어요.</p>
        </div>
        <Link to="/growth/program" className="mp-hero-cta">
          <i className="fa-solid fa-plus" /> 새 프로그램 신청
        </Link>
      </header>

      <section className="mp-stats">
        <article className="mp-stat">
          <span className="mp-stat-num">{stats.total}</span>
          <span className="mp-stat-lbl">전체 신청</span>
        </article>
        <article className="mp-stat mp-stat--done">
          <span className="mp-stat-num">{stats.done}</span>
          <span className="mp-stat-lbl">수료</span>
        </article>
        <article className="mp-stat mp-stat--active">
          <span className="mp-stat-num">{stats.active}</span>
          <span className="mp-stat-lbl">진행중</span>
        </article>
        <article className="mp-stat mp-stat--upcoming">
          <span className="mp-stat-num">{stats.upcoming}</span>
          <span className="mp-stat-lbl">신청완료</span>
        </article>
        <article className="mp-stat mp-stat--hours">
          <span className="mp-stat-num">{stats.totalHours}<small>h</small></span>
          <span className="mp-stat-lbl">누적 인정 시간</span>
        </article>
        <article className="mp-stat mp-stat--xp">
          <span className="mp-stat-num">{stats.totalXp}<small>XP</small></span>
          <span className="mp-stat-lbl">획득 XP</span>
        </article>
      </section>

      <div className="mp-filter-bar">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`mp-filter-btn${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
            <span className="mp-filter-count">
              {f === '전체' ? PROGRAMS.length : PROGRAMS.filter(p => p.status === f).length}
            </span>
          </button>
        ))}
      </div>

      <div className="mp-list">
        {visible.length === 0 ? (
          <div className="mp-empty">
            <i className="fa-solid fa-box-open" />
            <p>해당 조건의 신청 기록이 없습니다.</p>
          </div>
        ) : (
          visible.map(p => (
            <article key={p.id} className="mp-card" onClick={() => setDetail(p)}>
              <div className="mp-card-top">
                <span className="mp-cat-badge">
                  {p.category}
                </span>
                <span className="mp-status" style={{ background: STATUS_COLORS[p.status] + '1a', color: STATUS_COLORS[p.status] }}>
                  <span className="mp-status-dot" style={{ background: STATUS_COLORS[p.status] }} />
                  {p.status}
                </span>
              </div>
              <h2 className="mp-card-title">{p.title}</h2>
              <p className="mp-card-host">
                <i className="fa-solid fa-building" /> {p.hostDept}
              </p>
              <div className="mp-card-meta">
                <span><i className="fa-regular fa-calendar" /> {p.startDate} ~ {p.endDate}</span>
                <span><i className="fa-regular fa-clock" /> {p.hours}시간</span>
                {p.status === '수료' && (
                  <span className="mp-card-xp">+{p.rewardXp} XP</span>
                )}
              </div>
              <div className="mp-card-actions">
                {p.certUrl && (
                  <button
                    type="button"
                    className="mp-cert-btn"
                    onClick={event => { event.stopPropagation(); setDetail(p) }}
                  >
                    <i className="fa-solid fa-award" /> 수료증
                  </button>
                )}
                <span className="mp-card-arrow">상세 보기 <i className="fa-solid fa-chevron-right" /></span>
              </div>
            </article>
          ))
        )}
      </div>

      <Modal open={detail !== null} onClose={() => setDetail(null)} title={detail?.title ?? ''} size="md">
        {detail && (
          <div className="mp-detail">
            <div className="mp-detail-tags">
              <span className="mp-cat-badge">
                {detail.category}
              </span>
              <span className="mp-status" style={{ background: STATUS_COLORS[detail.status] + '1a', color: STATUS_COLORS[detail.status] }}>
                <span className="mp-status-dot" style={{ background: STATUS_COLORS[detail.status] }} />
                {detail.status}
              </span>
            </div>

            <table className="mp-detail-table">
              <tbody>
                <tr><th>주관 부서</th><td>{detail.hostDept}</td></tr>
                <tr><th>신청일</th><td>{detail.appliedAt}</td></tr>
                <tr><th>운영 기간</th><td>{detail.startDate} ~ {detail.endDate}</td></tr>
                <tr><th>인정 시간</th><td>{detail.hours}시간</td></tr>
                <tr><th>획득 XP</th><td className="mp-xp-strong">{detail.rewardXp} XP</td></tr>
              </tbody>
            </table>

            <div className="mp-detail-section">
              <h4>프로그램 소개</h4>
              <p>{detail.description}</p>
            </div>

            {detail.reflection && (
              <div className="mp-detail-section mp-detail-section--reflect">
                <h4><i className="fa-solid fa-quote-left" /> 나의 회고</h4>
                <p>{detail.reflection}</p>
              </div>
            )}

            <div className="mp-detail-actions">
              {detail.certUrl && (
                <button type="button" className="mp-btn mp-btn--ghost">
                  <i className="fa-solid fa-download" /> 수료증 다운로드
                </button>
              )}
              <button type="button" className="mp-btn mp-btn--primary" onClick={() => setDetail(null)}>
                확인
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
