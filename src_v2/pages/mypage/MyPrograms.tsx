import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../../components/Modal'
import './MyPrograms.css'
import { usePageHead } from '../../components/PageCrumb'
import { Icon } from '../../components/Icon'

/* ── 비교과프로그램 현황 (/mypage/programs) ─────────────────────────────────
   화면 언어는 비교과 목록·채용공고 보드와 같다 — 공용 카드 슬롯([data-slot="card"]) · .badge · .button.
   상태 색은 hex 대신 토큰(blue · amber · mint · muted)으로 클래스에 건다. */

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

/* 상태 → 토큰 색 클래스. 신청완료=파랑 · 진행중=앰버 · 수료=민트 · 취소=회색 */
const STATUS_TONE: Record<Status, string> = {
  신청완료: 'is-upcoming',
  진행중: 'is-active',
  수료: 'is-done',
  취소: 'is-cancel',
}

const FILTERS = ['전체', '진행중', '신청완료', '수료', '취소'] as const
type Filter = (typeof FILTERS)[number]

function StatusPill({ status }: { status: Status }) {
  return <span className={`mp-status ${STATUS_TONE[status]}`}>{status}</span>
}

export default function MyPrograms() {
  usePageHead('비교과프로그램 현황', '지금까지 신청·수료한 비교과 프로그램과 누적 활동 시간을 확인합니다.')
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

  const countOf = (f: Filter) => (f === '전체' ? PROGRAMS.length : PROGRAMS.filter(p => p.status === f).length)

  return (
    <div className="mp-page">
      {/* ── 요약 6장 ─────────────────────────────────────────── */}
      <section className="mp-stats" aria-label="신청 현황 요약">
        <article data-slot="card" className="mp-stat">
          <strong>{stats.total}</strong><span>전체 신청</span>
        </article>
        <article data-slot="card" className="mp-stat is-done">
          <strong>{stats.done}</strong><span>수료</span>
        </article>
        <article data-slot="card" className="mp-stat is-active">
          <strong>{stats.active}</strong><span>진행중</span>
        </article>
        <article data-slot="card" className="mp-stat is-upcoming">
          <strong>{stats.upcoming}</strong><span>신청완료</span>
        </article>
        <article data-slot="card" className="mp-stat is-hours">
          <strong>{stats.totalHours}<small>h</small></strong><span>누적 인정 시간</span>
        </article>
        <article data-slot="card" className="mp-stat is-xp">
          <strong>{stats.totalXp}<small>XP</small></strong><span>획득 XP</span>
        </article>
      </section>

      {/* ── 필터 + 새 신청 ───────────────────────────────────── */}
      <div className="mp-toolbar">
        <div className="mp-filters" role="tablist" aria-label="상태별 보기">
          {FILTERS.map(f => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              className={`mp-filter${filter === f ? ' is-on' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}<em>{countOf(f)}</em>
            </button>
          ))}
        </div>
        <Link to="/growth/program" className="button primary mp-new">
          <i className="fa-solid fa-plus" aria-hidden="true" /> 새 프로그램 신청
        </Link>
      </div>

      {/* ── 목록 ─────────────────────────────────────────────── */}
      <div className="mp-list">
        {visible.length === 0 ? (
          <div data-slot="card" className="mp-empty">
            <i className="fa-solid fa-box-open" aria-hidden="true" />
            <p>해당 조건의 신청 기록이 없습니다.</p>
          </div>
        ) : (
          visible.map(p => (
            <article key={p.id} data-slot="card" className={`mp-card${p.status === '취소' ? ' is-cancel' : ''}`}>
              <button type="button" className="mp-card-hit" onClick={() => setDetail(p)} aria-label={`${p.title} 상세 보기`} />
              <div className="mp-card-top">
                <span className="badge">{p.category}</span>
                <StatusPill status={p.status} />
              </div>
              <h2 className="mp-card-title">{p.title}</h2>
              <p className="mp-card-host"><i className="fa-regular fa-building" aria-hidden="true" />{p.hostDept}</p>
              <ul className="mp-card-meta">
                <li><i className="fa-regular fa-calendar" aria-hidden="true" />{p.startDate} ~ {p.endDate}</li>
                <li><i className="fa-regular fa-clock" aria-hidden="true" />{p.hours}시간</li>
                {p.status === '수료' && <li className="mp-card-xp">+{p.rewardXp} XP</li>}
              </ul>
              <div className="mp-card-foot">
                {p.certUrl ? (
                  <button type="button" className="button sm" onClick={() => setDetail(p)}>
                    <Icon name="award" /> 수료증 확인
                  </button>
                ) : <span />}
                <span className="mp-card-more">상세 보기 <i className="fa-solid fa-chevron-right" aria-hidden="true" /></span>
              </div>
            </article>
          ))
        )}
      </div>

      <Modal open={detail !== null} onClose={() => setDetail(null)} title={detail?.title ?? ''} size="md">
        {detail && (
          <div className="mp-detail">
            <div className="mp-detail-tags">
              <span className="badge">{detail.category}</span>
              <StatusPill status={detail.status} />
            </div>

            <dl className="mp-kv">
              <div><dt>주관 부서</dt><dd>{detail.hostDept}</dd></div>
              <div><dt>신청일</dt><dd>{detail.appliedAt}</dd></div>
              <div><dt>운영 기간</dt><dd>{detail.startDate} ~ {detail.endDate}</dd></div>
              <div><dt>인정 시간</dt><dd>{detail.hours}시간</dd></div>
              <div><dt>획득 XP</dt><dd className="mp-kv-xp">{detail.rewardXp} XP</dd></div>
            </dl>

            <section className="mp-detail-section">
              <h4>프로그램 소개</h4>
              <p>{detail.description}</p>
            </section>

            {detail.reflection && (
              <section className="mp-detail-section is-reflect">
                <h4><i className="fa-solid fa-quote-left" aria-hidden="true" /> 나의 회고</h4>
                <p>{detail.reflection}</p>
              </section>
            )}

            <div className="mp-detail-actions">
              {detail.certUrl && (
                <button type="button" className="button">
                  <Icon name="download" /> 수료증 다운로드
                </button>
              )}
              <button type="button" className="button primary" onClick={() => setDetail(null)}>확인</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
