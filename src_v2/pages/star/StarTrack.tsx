import { Link } from 'react-router-dom'
import { getActiveStudent } from '../../data/students'
import {
  getStarTrack, getStarSummary, getStarLinkedData,
  STAR_TRACK_LABEL, STAR_TRACK_META, CPASS_STAGES,
} from '../../data/starTrack'
import type { StarLanguage } from '../../data/starTrack'
import StudentStatCards from '../../components/StudentStatCards'
import type { StudentStat } from '../../components/StudentStatCards'
// 로드맵 카드는 상담사 학생 상세와 공유한다 — 한 벌만 둔다(CLAUDE.md 12조).
import StarRoadmapCard from '../../components/StarRoadmapCard'
import './StarTrack.css'

// ─────────────────────────────────────────────────────────────────────────
// STAR 트랙 대시보드 — 시안 public_t/star.png 이식.
//
// 전교생 화면이 아니다. 선발된 학생만 들어오는 **별도 트랙**이라 좌측에 전용 레일을 두고
// 상단 GNB 는 그대로 쓴다(시안의 상단 알림·프로필은 우리 GNB 가 이미 그린다 — 다시 그리지 않는다).
//
// 값은 전부 data/starTrack.ts 가 만든다. 이 파일에 숫자·판정식이 없다.
// 진단 유형·상담 횟수는 기존 단일소스와 연동한 값이고, 마일리지·교과·인증은 STAR 전용이다.
// ─────────────────────────────────────────────────────────────────────────

/** 좌측 레일 — 아직 없는 화면은 링크로 만들지 않는다(누르면 아무데도 안 가는 메뉴 금지). */
const RAIL: { icon: string; label: string; to?: string }[] = [
  { icon: 'fa-gauge-high', label: '대시보드', to: '/star' },
  { icon: 'fa-diagram-project', label: '로드맵', to: '/roadmap/skill-tree' },
  { icon: 'fa-coins', label: '마일리지' },
  { icon: 'fa-comments', label: '상담 내역', to: '/counsel/record' },
  { icon: 'fa-book', label: '교과 관리' },
  { icon: 'fa-people-group', label: '비교과 활동', to: '/growth/program' },
  { icon: 'fa-award', label: 'C-PASS 인증' },
  { icon: 'fa-chart-column', label: '성과 리포트' },
  { icon: 'fa-bullhorn', label: '공지사항', to: '/jobs/notices' },
]

const TRAITS = ['선발형 트랙', '기업연계', 'C-PASS 마일리지', '우수인재 집중관리']

/** 축 아래 「더 보기」 — 갈 곳이 실제로 있는 축만 준다(교과 관리 화면은 아직 없다). */
const AXIS_MORE: Record<string, { label: string; to: string } | undefined> = {
  AX1: { label: '상담 내역 보기', to: '/counsel/record' },
  AX3: { label: '비교과 활동 보기', to: '/growth/program' },
}

export default function StarTrack() {
  const student = getActiveStudent()
  const record = getStarTrack(student.id)

  if (!record) return <NotSelected name={student.name} grade={student.grade} />

  const summary = getStarSummary(record)
  const linked = getStarLinkedData(student, record)
  const meta = STAR_TRACK_META[record.track]
  const trackName = STAR_TRACK_LABEL[record.track]

  // 문구는 여기서 만든다 — 공용 카드에는 한글 리터럴이 없다(그 컴포넌트 규약).
  const pct = (done: number, total: number) => (total > 0 ? Math.round((done / total) * 100) : 0)
  const statCards: StudentStat[] = [
    {
      kind: 'diagnosis', label: '진단 결과',
      value: linked.type.label, badge: linked.type.code,
      foot: `필수 진단 ${linked.diagnosisDone}/${linked.diagnosisTotal}`,
      pct: pct(linked.diagnosisDone, linked.diagnosisTotal),
    },
    {
      kind: 'counsel', label: '상담 횟수',
      total: String(linked.counselDone), unit: '회',
      foot: `목표 ${linked.counselGoal}회`,
      channels: linked.counselByType.map(c => ({ label: c.label, count: `${c.count}건` })),
    },
    {
      kind: 'course', label: '필수 교과',
      value: String(linked.courseDone), unit: `/ ${linked.courseTotal}과목`,
      foot: '트랙 지정 교과 이수',
      pct: pct(linked.courseDone, linked.courseTotal),
    },
    {
      kind: 'program', label: '비교과 프로그램',
      value: String(linked.programDone), unit: `/ ${linked.programTotal}단계`,
      foot: `누적 마일리지 ${summary.mileage}점`,
      badge: summary.nextTier ? `다음 ${summary.nextTier.gap}점` : '최고 구간',
      pct: pct(linked.programDone, linked.programTotal),
    },
  ]

  return (
    <div className="st">
      <nav className="st-rail" aria-label="STAR 트랙 메뉴">
        <p className="st-rail-brand"><i className="fa-solid fa-star" /> STAR TRACK</p>
        {RAIL.map(item => (
          item.to
            ? <Link key={item.label} to={item.to} className={`st-rail-item${item.to === '/star' ? ' active' : ''}`}>
                <i className={`fa-solid ${item.icon}`} />{item.label}
              </Link>
            : <span key={item.label} className="st-rail-item is-soon" aria-disabled="true">
                <i className={`fa-solid ${item.icon}`} />{item.label}<em>준비중</em>
              </span>
        ))}
        <div className="st-rail-foot">
          <strong>문의</strong>
          <span>취업전략센터</span>
        </div>
      </nav>

      <header className="st-head">
        <h1>STAR 트랙 대시보드</h1>
        <p>선발된 우수학생에게 기업 연계 활동과 마일리지를 제공하고, 우수 인재 채용 기회를 연결합니다.</p>
        <ul className="st-traits">
          {TRAITS.map(t => <li key={t}>{t}</li>)}
        </ul>
      </header>

      <div className="st-track-badge">
        <small>현재 트랙</small>
        <strong>{meta.grade}학년 {trackName}</strong>
        <span>{record.cohort}기 · {record.selectedAt} 선발</span>
      </div>

      {/* 로드맵이 이 화면의 본문이다 — 요약 4장보다 먼저 온다. */}
      <StarRoadmapCard
        record={record}
        title={`${trackName} 성장 로드맵`}
        note={`${meta.kind} · ${meta.goal}`}
        axisLinks={AXIS_MORE}
      />

      <main className="st-main">
        {/* 요약 4장은 라운지(/v2/lounge)와 같은 카드다 — StudentStatCards 를 그대로 쓴다.
            라운지에 없는 「필수 교과」만 kind='course' 로 더했다(같은 값+막대 형, 색·아이콘만 다름). */}
        <div className="st-cards">
          <StudentStatCards stats={statCards} />
        </div>

        <p className="st-tip">
          <i className="fa-solid fa-lightbulb" />
          각 단계를 완료하면 마일리지와 인증 단계가 함께 올라갑니다. 트랙 운영기간 안에 수료해야 인정됩니다.
        </p>
      </main>

      <aside className="st-side">
        <section className="st-panel st-cpass">
          <h2>C-PASS 현황</h2>
          <ol className="st-stages">
            {CPASS_STAGES.map((stage, i) => {
              const state = i < summary.stageIndex ? 'done' : i === summary.stageIndex ? 'current' : 'locked'
              return (
                <li key={stage.id} className={`is-${state}`}>
                  <span className="st-stage-dot">
                    {state === 'done'
                      ? <i className="fa-solid fa-check" />
                      : state === 'locked' ? <i className="fa-solid fa-lock" /> : null}
                  </span>
                  <b>{i + 1}단계 {stage.label}</b>
                  <small>{stage.desc}</small>
                </li>
              )
            })}
          </ol>
          <p className="st-stage-note">
            {summary.nextTier
              ? <>다음 구간 <b>{summary.nextTier.min}점</b> 도달 시 장학금 {summary.nextTier.award}만원</>
              : <>최고 구간에 도달했습니다</>}
          </p>
        </section>

        <section className="st-panel">
          <h2>자격증</h2>
          <ul className="st-list">
            {record.certs.map(c => (
              <li key={c.label}>
                <span>{c.label}</span>
                <span className={`st-state ${c.status === '취득' ? 'is-done' : 'is-ongoing'}`}>{c.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="st-panel">
          <h2>어학</h2>
          {record.languages.map(lang => <LanguageRow key={lang.label} lang={lang} />)}
        </section>

        <section className="st-panel is-ai">
          <h2><i className="fa-solid fa-wand-magic-sparkles" />AI 코멘트</h2>
          <p className="st-ai-text">{record.aiComment.text}</p>
          <small className="st-ai-date">분석 기준일 {record.aiComment.basedOn}</small>
        </section>
      </aside>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────

function LanguageRow({ lang }: { lang: StarLanguage }) {
  // 점수형(토익)은 막대로, 등급형(OPIc)은 배지로 — 등급은 선형이 아니라 막대로 그리면 거짓말이 된다.
  if (lang.score != null) {
    const target = lang.target ?? lang.pass ?? lang.score
    const pct = Math.min(100, Math.round((lang.score / target) * 100))
    const short = lang.pass != null && lang.score < lang.pass
    return (
      <div className="st-lang">
        <div className="st-lang-top">
          <span>{lang.label}</span>
          <strong className={short ? 'is-short' : ''}>{lang.score}점</strong>
        </div>
        <div className="st-bar">
          <span className={`st-bar-fill ${short ? 'hue-warn' : 'hue-2'}`} style={{ width: `${pct}%` }} />
        </div>
        <small className={short ? 'is-short' : ''}>
          {short ? `이수 기준 ${lang.pass}점 미달` : `목표 ${target}점`}
        </small>
      </div>
    )
  }
  const short = lang.passGrade != null && lang.grade !== lang.passGrade && lang.grade !== lang.targetGrade
  return (
    <div className="st-lang">
      <div className="st-lang-top">
        <span>{lang.label}</span>
        <strong>{lang.grade}</strong>
      </div>
      <small>{short ? `이수 기준 ${lang.passGrade} 이상` : `목표 ${lang.targetGrade}`}</small>
    </div>
  )
}

/** 미선발 학생 — 빈 대시보드를 그리지 않는다(PROCESS.md §2: 잠긴 화면엔 안내와 다음 행동). */
function NotSelected({ name, grade }: { name: string; grade: number }) {
  const eligible = grade === 2 || grade === 3
  return (
    <div className="st st-empty-page">
      <div className="st-empty">
        <i className="fa-solid fa-star" />
        <h1>STAR 트랙 참여 학생이 아닙니다</h1>
        <p>
          {eligible
            ? `${name} 학생은 아직 STAR 트랙에 선발되지 않았습니다. 학부 2·3학년 40명을 서류심사로 선발합니다.`
            : `STAR 트랙은 학부 2·3학년만 신청할 수 있습니다. (${name} 학생 ${grade}학년)`}
        </p>
        <div className="st-empty-actions">
          <Link to="/growth/program" className="st-empty-cta">진로·취업 프로그램에서 신청</Link>
          <Link to="/jobs/notices" className="st-empty-sub">모집 공고 보기</Link>
        </div>
      </div>
    </div>
  )
}
