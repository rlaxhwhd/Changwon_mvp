import { Link } from 'react-router-dom'
import { getActiveStudent, getStudentIap } from '../../data/students'
import './RoadmapStatus.css'

const STATUS_LABEL: Record<'done' | 'active' | 'upcoming', string> = {
  done: '완료',
  active: '진행 중',
  upcoming: '예정',
}

/**
 * /v2/growth/roadmap-status
 * AI 진로로드맵 (/roadmap/ai)의 진행률·기록·현황 대시보드.
 *
 * 중요 — 이 화면은 학생용 "읽기 전용 (read-only)" 뷰입니다.
 * 로드맵 자체는 상담사가 학생과 협의 후 종합 데이터(상담기록·진단결과·학과·진로목표·
 * 목표회사)로 확정합니다. 학생은 진행 상황만 확인할 수 있고, 수정은
 * 상담사 관리자 화면에서만 가능합니다.
 */
export default function RoadmapStatus() {
  const student = getActiveStudent()
  const iap = getStudentIap(student)
  const phases = student.phases

  const total = phases.length
  const doneCount = phases.filter(p => p.status === 'done').length
  const activePhase = phases.find(p => p.status === 'active')
  const progressPct = Math.round((doneCount / total) * 100)

  return (
    <div className="rs-page">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <header className="rs-hero">
        <div className="rs-hero-left">
          <span className="rs-hero-icon"><i className="fa-solid fa-route" /></span>
          <div>
            <h1>AI 진로 로드맵 현황</h1>
            <p>상담사와 협의해 확정한 로드맵의 진행률과 단계별 기록을 확인하세요.</p>
          </div>
        </div>
        <div className="rs-hero-progress">
          <div className="rs-hero-progress-num">{doneCount}<span>/{total}</span></div>
          <div className="rs-hero-progress-label">완료 단계</div>
        </div>
      </header>

      {/* ── 읽기 전용 안내 ──────────────────────────────────────── */}
      <div className="rs-readonly">
        <i className="fa-solid fa-lock" />
        <div>
          <strong>이 로드맵은 상담사와의 협의 후 확정되었습니다.</strong>
          <p>
            상담기록 · 진단결과 · 학과 · 진로목표 · 목표회사를 종합해 상담사가 설계합니다.
            수정이 필요하면 다음 상담 일정에서 협의해 주세요. (학생 화면에서는 직접 수정할 수 없습니다.)
          </p>
        </div>
      </div>

      {/* ── 메타 카드 ───────────────────────────────────────────── */}
      <section className="rs-meta">
        <div className="rs-meta-item">
          <span className="rs-meta-key">학과 · 학년</span>
          <span className="rs-meta-val">{student.major} · {student.grade}학년</span>
        </div>
        <div className="rs-meta-item">
          <span className="rs-meta-key">진로 목표 (직무)</span>
          <span className="rs-meta-val">{student.targetRole}</span>
        </div>
        <div className="rs-meta-item">
          <span className="rs-meta-key">목표 회사</span>
          <span className="rs-meta-val">{student.targetCompany.name}</span>
        </div>
        <div className="rs-meta-item">
          <span className="rs-meta-key">학생 유형</span>
          <span className="rs-meta-val">{student.studentType}</span>
        </div>
        <div className="rs-meta-item">
          <span className="rs-meta-key">IAP 유형</span>
          <span className="rs-meta-val">{iap.iapType}</span>
        </div>
        <div className="rs-meta-item">
          <span className="rs-meta-key">목표 회사 매칭</span>
          <span className="rs-meta-val rs-meta-val--accent">{student.targetCompany.matchScore}%</span>
        </div>
      </section>

      {/* ── 진행률 게이지 ───────────────────────────────────────── */}
      <section className="rs-progress-card">
        <div className="rs-progress-head">
          <h2>로드맵 진행률</h2>
          <span className="rs-progress-pct">{progressPct}%</span>
        </div>
        <div className="rs-progress-track">
          <div className="rs-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="rs-progress-meta">
          <span>완료 <strong>{doneCount}</strong>단계</span>
          <span className="rs-divider">·</span>
          <span>진행 중 <strong>{activePhase ? 1 : 0}</strong>단계</span>
          <span className="rs-divider">·</span>
          <span>남은 단계 <strong>{total - doneCount - (activePhase ? 1 : 0)}</strong>단계</span>
        </div>
      </section>

      {/* ── 단계별 타임라인 ─────────────────────────────────────── */}
      <section className="rs-section">
        <div className="rs-section-head">
          <h2>단계별 진행 기록</h2>
          <p>각 단계의 활동·산출물은 상담사가 점검 후 완료 처리합니다.</p>
        </div>

        <ol className="rs-timeline">
          {phases.map(phase => (
            <li key={phase.num} className={`rs-phase rs-phase--${phase.status}`}>
              <div className="rs-phase-num">
                <span>{phase.num}</span>
              </div>
              <div className="rs-phase-card">
                <div className="rs-phase-head">
                  <div className="rs-phase-title-wrap">
                    <span className="rs-phase-icon"><i className={`fa-solid ${phase.icon}`} /></span>
                    <div>
                      <div className="rs-phase-title">{phase.title}</div>
                      <div className="rs-phase-period">{phase.period}</div>
                    </div>
                  </div>
                  <span className={`rs-phase-badge rs-phase-badge--${phase.status}`}>
                    {STATUS_LABEL[phase.status]}
                  </span>
                </div>

                <ul className="rs-phase-tasks">
                  {phase.tasks.map(t => (
                    <li key={t.text} className={t.done ? 'done' : 'pending'}>
                      <i className={`fa-solid ${t.done ? 'fa-circle-check' : 'fa-circle'}`} />
                      <span>{t.text}</span>
                    </li>
                  ))}
                </ul>

                {phase.recommendation && (
                  <div className="rs-phase-reco">
                    <i className="fa-solid fa-wand-magic-sparkles" />
                    <span>{phase.recommendation}</span>
                  </div>
                )}

                {phase.status === 'active' && phase.nextPath && (
                  <div className="rs-phase-foot">
                    <Link to={phase.nextPath} className="rs-phase-link">
                      이 단계 자세히 보기 <i className="fa-solid fa-arrow-right" />
                    </Link>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── 하단 안내 ───────────────────────────────────────────── */}
      <section className="rs-footer-note">
        <div className="rs-footer-note-block">
          <i className="fa-solid fa-circle-info" />
          <div>
            <strong>로드맵 변경이 필요한가요?</strong>
            <p>
              진로 목표·목표 회사·일정이 바뀌었다면 다음 상담 일정에서 상담사에게 알려주세요.
              상담사가 새로운 정보로 로드맵을 재설계해드립니다.
            </p>
          </div>
          <Link to="/counsel/career" className="rs-footer-link">
            상담 예약 <i className="fa-solid fa-arrow-right" />
          </Link>
        </div>
      </section>

    </div>
  )
}
