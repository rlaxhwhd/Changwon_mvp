import type { CSSProperties, ReactNode } from 'react'
import './StudentStatCards.css'

// ─────────────────────────────────────────────────────────────────────────
// 학생 요약 지표 5장 — 학생 포털(/v2/lounge) · 교직원 포털(/admin/students/:id) 공용.
//
// 디자인은 stu_lounge 시안의 .stats 5장 그대로다(진단완료 · 상담현황 · IAP이행률 ·
// 비교과이수 · 성장레벨). 수정은 여기 한 곳에서만 — 화면마다 다시 그리지 않는다.
//
// 문구·수치는 전부 주입받는다. 이 컴포넌트에 한글 리터럴을 박지 않는다
// (라벨 하나까지 host 의 데이터 층이 만든다 → DB 전환 시 이 파일은 그대로 남는다).
// 아이콘은 스프라이트에 기대지 않고 직접 그린다 — 교직원 포털에는 학생 포털의
// 아이콘 스프라이트가 없다.
// ─────────────────────────────────────────────────────────────────────────

// course = 필수교과 이수. 전용 카드가 따로 있는 게 아니라 진단완료와 **같은 값+막대 형**이고
// 색과 아이콘만 다르다 — STAR 트랙(/v2/star)이 쓴다.
type StatKind = 'diagnosis' | 'counsel' | 'roadmap' | 'program' | 'course' | 'level'

const ICON: Record<StatKind, ReactNode> = {
  diagnosis: <path d="m5 12 4 4L19 6" />,
  counsel: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /><path d="M8 10h8M8 14h5" /></>,
  roadmap: <><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h3a3 3 0 0 0 3-3V8a3 3 0 0 1 3-3h-1" /></>,
  program: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  course: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M9 7.5h6" /></>,
  level: <><circle cx="12" cy="8" r="5" /><path d="m8.5 12-1 9 4.5-2.5 4.5 2.5-1-9M10 8l1.3 1.3L14 6.5" /></>,
}

/** 값 + 막대 형 (진단 완료 · 로드맵 이행률 · 비교과 이수 · 필수교과) */
export interface MetricStat {
  kind: 'diagnosis' | 'roadmap' | 'program' | 'course'
  /** 라벨 위 작은 머리글 (예: 'CARE 7+') — 그 지표가 어느 체계의 것인지 밝힌다. */
  kicker?: string
  label: string
  value: string
  unit?: string
  /** 0~100. 막대 진행률 */
  pct: number
  foot: string
  badge?: string
}

/** 상담 현황 — 총계 + 유형별 내역 */
export interface CounselStat {
  kind: 'counsel'
  kicker?: string
  label: string
  total: string
  unit: string
  foot: string
  /** 유형별 건수. 색은 순서로 정해진다 — 시안 순서(진로취업 · 심리 · 지도교수)를 지킬 것. */
  channels: { label: string; count: string }[]
}

/** 성장 레벨 — 메달 + XP 막대 */
export interface LevelStat {
  kind: 'level'
  kicker?: string
  label: string
  /** 메달 위 작은 글자 (예: LV) */
  levelUnit: string
  level: string
  tierLabel: string
  tier: string
  xp: string
  xpFoot: string
  /** 0~100. XP 막대 진행률 */
  pct: number
}

export type StudentStat = MetricStat | CounselStat | LevelStat

function meterVars(pct: number): CSSProperties {
  return { '--value': `${pct}%`, '--accent': 'var(--stat-color)' } as CSSProperties
}

export default function StudentStatCards({ stats }: { stats: StudentStat[] }) {
  // 래퍼는 컨테이너 쿼리 기준점이다 — 이 컴포넌트는 좁은 모달(학생정보 '보기') 안에도 들어간다.
  return (
    <div className="ssc-wrap">
    <section className="ssc" aria-label="학생 요약 지표">
      {stats.map(stat => (
        <article key={stat.label} className={`ssc-card is-${stat.kind}`}>
          <div className="ssc-body">
            <div className="ssc-head">
              {/* 머리글은 주입받는다 — 어느 체계의 지표인지는 host 의 데이터 층이 정한다. */}
              <span className="ssc-heading">
                {stat.kicker && <small className="ssc-kicker">{stat.kicker}</small>}
                <span className="ssc-label">{stat.label}</span>
              </span>
              <span className="ssc-icon" aria-hidden="true"><svg viewBox="0 0 24 24">{ICON[stat.kind]}</svg></span>
            </div>
            {stat.kind === 'counsel' ? <CounselBody stat={stat} />
              : stat.kind === 'level' ? <LevelBody stat={stat} />
              : <MetricBody stat={stat} />}
          </div>
        </article>
      ))}
    </section>
    </div>
  )
}

function MetricBody({ stat }: { stat: MetricStat }) {
  return (
    <>
      <div className="ssc-value">{stat.value}{stat.unit && <small>{stat.unit}</small>}</div>
      <div className="ssc-foot">
        <span>{stat.foot}</span>
        {stat.badge && <span className="ssc-badge">{stat.badge}</span>}
      </div>
      <div className="ssc-meter" style={meterVars(stat.pct)} aria-label={`${stat.label} ${stat.pct}%`}>
        <span className="ssc-meter-track"><i /></span><b>{stat.pct}%</b>
      </div>
    </>
  )
}

function CounselBody({ stat }: { stat: CounselStat }) {
  return (
    <div className="ssc-counsel">
      <div className="ssc-counsel-total">
        <strong>{stat.total}<small>{stat.unit}</small></strong>
        <span>{stat.foot}</span>
      </div>
      <div className="ssc-channels">
        {stat.channels.map(c => (
          <span key={c.label}><i />{c.label}<em>{c.count}</em></span>
        ))}
      </div>
    </div>
  )
}

function LevelBody({ stat }: { stat: LevelStat }) {
  return (
    <>
      <div className="ssc-level">
        <span className="ssc-medallion"><small>{stat.levelUnit}</small><b>{stat.level}</b></span>
        <span className="ssc-level-copy"><small>{stat.tierLabel}</small><b>{stat.tier}</b></span>
      </div>
      <div className="ssc-xp">
        <div className="ssc-xp-copy"><b>{stat.xp}</b><span>{stat.xpFoot}</span></div>
        <div
          className="ssc-xp-track"
          style={{ '--value': `${stat.pct}%` } as CSSProperties}
          role="progressbar"
          aria-label={stat.label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={stat.pct}
        >
          <i />
        </div>
      </div>
    </>
  )
}
