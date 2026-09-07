import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getActiveStudent, getStudentTypeMeta } from '../../data/students'
import { typeLabel } from '../../data/careerProcess'
// 로드맵은 새로 그리지 않는다 — /roadmap/skill-tree · 상담사 편집기와 같은 공용 3축 보드다.
import RoadmapAxisBoard from '../../components/RoadmapAxisBoard'
import { ROADMAP_AXIS_MAP } from '../../data/schema/roadmap'
// 로드맵 1개의 정본은 교직원 포털의 읽기 모델이다(base ⊕ 상담사 override ⊕ 프로그램 편입분).
// 이행률도 거기서 계산해 온다 — 화면이 칸 배열을 세지 않는다(CLAUDE.md 규칙 10).
import { getStudentRoadmap } from '../../../src_admin/data/roadmap'
import './RoadmapStatus.css'
import { usePageHead } from '../../components/PageCrumb'

/**
 * /v2/growth/roadmap-status
 * 3축 로드맵(/roadmap/skill-tree)의 이행 현황 대시보드.
 *
 * 중요 — 이 화면은 학생용 "읽기 전용 (read-only)" 뷰입니다.
 * 로드맵 자체는 상담사가 학생과 협의 후 종합 데이터(상담기록·진단결과·학과·진로목표·
 * 목표회사)로 확정합니다. 학생은 이행 상황만 확인할 수 있고, 수정은
 * 상담사 관리자 화면에서만 가능합니다.
 *
 * ⚠️ 예전의 6단계 타임라인(student.phases)은 로드맵 모델이 3축으로 바뀌기 전 자료다.
 *    이 화면은 실제 로드맵(getStudentRoadmap)만 본다.
 */
export default function RoadmapStatus() {
  usePageHead('로드맵 진행 현황', '상담사와 협의해 확정한 3축 로드맵의 이행률과 칸별 수행 현황을 확인합니다.')
  const student = getActiveStudent()
  const type = getStudentTypeMeta(student)
  const roadmap = useMemo(() => getStudentRoadmap(student.id), [student.id])

  if (!roadmap) {
    return (
      <div className="rs-page">
        <section className="rs-empty">
          <i className="fa-solid fa-route" aria-hidden="true" />
          <strong>아직 로드맵이 생성되지 않았습니다.</strong>
          <p>진단을 마치고 상담을 완료하면 상담사가 3축 로드맵을 확정합니다.</p>
          <Link to="/counsel/career" className="rs-empty-link">
            상담 신청 <i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </Link>
        </section>
      </div>
    )
  }

  const { progress, axes, byAxis, origin } = roadmap
  const edited = Object.values(origin).filter(o => o === 'override').length

  return (
    <div className="rs-page">

      {/* ── 이행률 요약 ─────────────────────────────────────────── */}
      <section className="rs-progress-card">
        <div className="rs-progress-head">
          <h2>로드맵 이행률</h2>
          <span className="rs-progress-pct">{progress.pct}%</span>
        </div>
        <div className="rs-progress-track">
          <div className="rs-progress-fill" style={{ width: `${progress.pct}%` }} />
        </div>
        <div className="rs-progress-meta">
          <span>수행 완료 <strong>{progress.done}</strong>칸</span>
          <span className="rs-divider">·</span>
          <span>남은 칸 <strong>{progress.total - progress.done}</strong>칸</span>
          <span className="rs-divider">·</span>
          <span>전체 <strong>{progress.total}</strong>칸</span>
        </div>
      </section>

      {/* ── 축별 이행률 ─────────────────────────────────────────── */}
      <section className="rs-axis-stats">
        {axes.map(axis => {
          const meta = ROADMAP_AXIS_MAP[axis.axis]
          const prog = byAxis[axis.axis]
          return (
            <article key={axis.axis} className={`rs-axis-stat is-${axis.axis}`}>
              <div className="rs-axis-stat-head">
                <span className="rs-axis-stat-name">{meta.label}</span>
                <span className="rs-axis-stat-pct">{prog.pct}%</span>
              </div>
              <div className="rs-axis-stat-track">
                <div className="rs-axis-stat-fill" style={{ width: `${prog.pct}%` }} />
              </div>
              <p className="rs-axis-stat-meta">
                <strong>{prog.done}</strong>/{prog.total}칸 수행 · {meta.source}
              </p>
            </article>
          )
        })}
      </section>

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
          <span className="rs-meta-key">진단 유형</span>
          <span className="rs-meta-val">{typeLabel(student.studentType)}</span>
        </div>
        <div className="rs-meta-item">
          <span className="rs-meta-key">계층</span>
          <span className="rs-meta-val">{type?.tierLabel ?? "-"}</span>
        </div>
        <div className="rs-meta-item">
          <span className="rs-meta-key">목표 회사 매칭</span>
          <span className="rs-meta-val rs-meta-val--accent">{student.targetCompany.matchScore}%</span>
        </div>
      </section>

      {/* ── 3축 보드 ────────────────────────────────────────────── */}
      <section className="rs-section">
        <div className="rs-section-head">
          <h2>축별 수행 현황</h2>
          <p>
            칸의 완료는 상담사 점검 또는 비교과 수료로 처리됩니다.
            {edited > 0 && ' 「상담사 수정」 표시가 붙은 축은 상담 후 다시 짠 축입니다.'}
          </p>
        </div>
        <RoadmapAxisBoard axes={axes} origin={origin} />
      </section>

      {/* ── 하단 안내 ───────────────────────────────────────────── */}
      <section className="rs-footer-note">
        <div className="rs-footer-note-block">
          <i className="fa-solid fa-circle-info" aria-hidden="true" />
          <div>
            <strong>로드맵 변경이 필요한가요?</strong>
            <p>
              이 로드맵은 상담기록 · 진단결과 · 학과 · 진로목표 · 목표회사를 종합해 상담사가 설계합니다.
              목표 직무가 바뀌었거나 로드맵을 크게 다시 짜야 한다면 상담을 예약하고,
              칸 일부만 고치면 된다면 변경 요청을 보내세요.
            </p>
          </div>
          <div className="rs-footer-actions">
            <Link to="/counsel/career" className="rs-footer-link">
              상담 예약 <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
            <Link to="/roadmap/request" className="rs-footer-link is-request">
              변경 요청 <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
