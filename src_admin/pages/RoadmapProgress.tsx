import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LuBuilding2, LuChartColumn, LuCircleAlert, LuGauge, LuGraduationCap,
  LuRoute, LuTarget, LuTrendingUp, LuTriangleAlert, LuUsers,
} from 'react-icons/lu'
import { getActiveCounselor } from '../data/counselors'
import { PROGRESS_RULE, getRoadmapProgressStats } from '../data/roadmapProgressStats'
import type { GroupStat, RoadmapProgressStats } from '../data/roadmapProgressStats'
import { studentTypeClass } from '../data/studentRoster'
import './RoadmapProgress.css'

// ─────────────────────────────────────────────────────────────────────────
// 로드맵 이행률 현황 (로드맵 관리 하위) — 통계 대시보드.
//
// 담당 학생 / 전체 학생 두 모수의 이행률을 같은 지표로 본다.
// 집계는 전부 data/roadmapProgressStats.ts 에서 온다 — 이 화면은 그리기만 한다
// (CLAUDE.md 규칙 10). 구간 경계·색도 그쪽 PROGRESS_BANDS 가 단일 소스다.
//
// 색은 DESIGN.md 의미색 7종을 .b-*/.s-* 유틸로만 쓴다. 새 색을 만들지 않는다.
// 이행률은 '정도'가 아니라 '단계'라 단색 농담이 아니라 red→green 의미색으로 나눈다.
// ─────────────────────────────────────────────────────────────────────────

type Scope = 'mine' | 'all'

export default function RoadmapProgress() {
  const counselor = getActiveCounselor()
  const [scope, setScope] = useState<Scope>('mine')

  const mine = useMemo(() => getRoadmapProgressStats(counselor.departments), [counselor.departments])
  const all = useMemo(() => getRoadmapProgressStats([]), [])
  const stats = scope === 'mine' ? mine : all

  // 담당이 전체보다 몇 %p 높은가 — 같은 모수면 0 이다.
  const delta = mine.avg - all.avg
  const sameScope = mine.count === all.count

  return (
    <div className="admin-page rmp-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">로드맵 이행률 현황</h1>
          <p className="admin-page-desc">
            담당 학생과 전체 학생의 로드맵 이행률을 구간·유형·학년·학과별로 비교합니다.
          </p>
          {sameScope && (
            <p className="admin-field-hint">
              현재 모든 상담사의 담당 범위가 전 학과라 담당·전체 모수가 같습니다
              (학과 배정이 들어오면 자동으로 갈립니다).
            </p>
          )}
        </div>
        <div className="rmp-scope" role="tablist" aria-label="조회 범위">
          <button
            type="button" role="tab" aria-selected={scope === 'mine'}
            className={scope === 'mine' ? 'is-active' : ''}
            onClick={() => setScope('mine')}
          >
            <LuUsers /> 담당 학생 <em>{mine.count}</em>
          </button>
          <button
            type="button" role="tab" aria-selected={scope === 'all'}
            className={scope === 'all' ? 'is-active' : ''}
            onClick={() => setScope('all')}
          >
            <LuBuilding2 /> 전체 학생 <em>{all.count}</em>
          </button>
        </div>
      </header>

      {/* ── 요약 5칸 ── */}
      <div className="admin-statsum rmp-sum">
        <SumCard
          hue="blue" icon={<LuGauge />} label="평균 이행률"
          value={`${stats.avg}%`}
          note={sameScope ? '담당·전체 동일' : `전체 대비 ${delta >= 0 ? '+' : ''}${delta}%p`}
        />
        <SumCard
          hue="purple" icon={<LuChartColumn />} label="중앙값"
          value={`${stats.median}%`} note="절반이 이 아래에 있습니다"
        />
        <SumCard
          hue="green" icon={<LuTrendingUp />} label={`순항 (${PROGRESS_RULE.onTrack}%+)`}
          value={`${stats.onTrack}명`} note={`${pct(stats.onTrack, stats.count)}% of ${stats.count}명`}
        />
        <SumCard
          hue="red" icon={<LuTriangleAlert />} label={`정체 (${PROGRESS_RULE.stalled}% 미만)`}
          value={`${stats.stalled}명`} note={`${pct(stats.stalled, stats.count)}% of ${stats.count}명`}
        />
        <SumCard
          hue="teal" icon={<LuRoute />} label="로드맵 보유"
          value={`${stats.count}명`} note={scope === 'mine' ? '담당 학생 기준' : '재학생 전량'}
        />
      </div>

      {/* ── 이행률 구간 분포 ── */}
      <section className="admin-card">
        <div className="admin-card-head">
          <h2><LuChartColumn /> 이행률 구간 분포</h2>
          <span className="rmp-head-note">{stats.count}명 기준</span>
        </div>

        <div className="rmp-stack" role="img" aria-label={stats.bands.map(b => `${b.label} ${b.count}명`).join(', ')}>
          {/* 막대 안에 글씨를 넣지 않는다 — solid 위 흰 글씨는 yellow·orange 에서 대비가 무너지고
              (index.css: "solid는 막대·점 전용, 텍스트는 반드시 on-*"), 수치는 바로 아래 범례가 준다. */}
          {stats.bands.map(band => band.count > 0 && (
            <span key={band.key} className={band.solid} style={{ flexGrow: band.count }} title={`${band.label} · ${band.count}명 (${band.ratio}%)`} />
          ))}
        </div>

        <div className="rmp-bands">
          {stats.bands.map(band => (
            <div key={band.key} className="rmp-band">
              <span className={`rmp-band-dot ${band.solid}`} aria-hidden="true" />
              <div className="rmp-band-copy">
                <strong>{band.label}</strong>
                <small>{band.desc}</small>
              </div>
              <div className="rmp-band-num">
                <b>{band.count}</b><em>명 · {band.ratio}%</em>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 유형별 · 학년별 ── */}
      <div className="admin-statsec-grid">
        <BarCard
          title="6유형별 평균 이행률"
          icon={<LuTarget />}
          rows={stats.byType}
          emptyText="해당 유형의 학생이 없습니다."
        />
        <BarCard
          title="학년별 평균 이행률"
          icon={<LuGraduationCap />}
          rows={stats.byGrade}
          emptyText="학년 정보가 없습니다."
        />
      </div>

      {/* ── 학과별 (하위) ── */}
      <section className="admin-card">
        <div className="admin-card-head">
          <h2><LuBuilding2 /> 학과별 평균 이행률</h2>
          <span className="rmp-head-note">낮은 순 · 3명 이상 학과만</span>
        </div>
        <div className="rmp-dept-grid">
          {stats.byDept.map(dept => (
            <div key={dept.key} className="rmp-dept">
              <div className="rmp-dept-top">
                <strong>{dept.label}</strong>
                <span>{dept.avg}%</span>
              </div>
              <div className="rmp-track">
                <i className={dept.solid} style={{ width: `${dept.avg}%` }} />
              </div>
              <small>{dept.count}명</small>
            </div>
          ))}
          {stats.byDept.length === 0 && <p className="rmp-empty">집계할 학과가 없습니다.</p>}
        </div>
      </section>

      {/* ── 조치가 필요한 학생 ── */}
      <section className="admin-card">
        <div className="admin-card-head">
          <h2><LuCircleAlert /> 이행률이 낮은 학생</h2>
          <span className="rmp-head-note">하위 {PROGRESS_RULE.laggardLimit}명 · 로드맵 점검이 필요합니다</span>
        </div>
        <div className="rmp-lag-table" role="table">
          <div className="rmp-lag-row is-head" role="row">
            <span role="columnheader">학생</span>
            <span role="columnheader">학과 · 학년</span>
            <span role="columnheader">유형</span>
            <span role="columnheader">이행률</span>
            <span role="columnheader">로드맵</span>
          </div>
          {stats.laggards.map(row => (
            <div key={row.id} className="rmp-lag-row" role="row">
              <span role="cell"><strong>{row.name}</strong></span>
              <span role="cell">{row.major} · {row.grade}학년</span>
              <span role="cell"><span className={studentTypeClass(row.studentType)}><b>{row.studentType}</b>{row.typeLabel}</span></span>
              <span role="cell" className="rmp-lag-rate">
                <div className="rmp-track">
                  <i className={bandSolid(row.progress)} style={{ width: `${Math.max(row.progress, 2)}%` }} />
                </div>
                <em>{row.progress}%</em>
              </span>
              <span role="cell">
                <Link className="admin-btn admin-btn-ghost sm" to={`/roadmap/${row.id}`}>편집</Link>
              </span>
            </div>
          ))}
          {stats.laggards.length === 0 && <p className="rmp-empty">조회 범위에 학생이 없습니다.</p>}
        </div>
      </section>
    </div>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────

function pct(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100)
}

/** 개별 학생 막대도 구간과 같은 색 규칙을 따른다 — 표와 분포가 어긋나면 안 된다. */
function bandSolid(progress: number): string {
  if (progress < 20) return 'b-red'
  if (progress < 40) return 'b-orange'
  if (progress < 60) return 'b-yellow'
  if (progress < 80) return 'b-teal'
  return 'b-green'
}

function SumCard({ hue, icon, label, value, note }: {
  hue: string; icon: React.ReactNode; label: string; value: string; note: string
}) {
  return (
    <div className={`admin-statsum-card rmp-sum-card is-${hue}`}>
      <span className="rmp-sum-label"><i className={`rmp-sum-ico s-${hue}`}>{icon}</i>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  )
}

function BarCard({ title, icon, rows, emptyText }: {
  title: string; icon: React.ReactNode; rows: GroupStat[]; emptyText: string
}) {
  return (
    <section className="admin-card">
      <div className="admin-card-head"><h2>{icon} {title}</h2></div>
      <div className="rmp-bar-list">
        {rows.filter(row => row.count > 0).map(row => (
          <div key={row.key} className="rmp-bar">
            <span className="rmp-bar-label">{row.label}</span>
            <div className="rmp-track">
              <i className={row.solid} style={{ width: `${row.avg}%` }} />
            </div>
            <span className="rmp-bar-num"><b>{row.avg}%</b><em>{row.count}명</em></span>
          </div>
        ))}
        {rows.every(row => row.count === 0) && <p className="rmp-empty">{emptyText}</p>}
      </div>
    </section>
  )
}

export type { RoadmapProgressStats }
