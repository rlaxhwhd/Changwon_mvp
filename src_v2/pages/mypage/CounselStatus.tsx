import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveStudentId, getStudentCounselRequests } from '../../data/students'
import { getCounselorLabel } from '../../data/counselorsRead'
import { PROFESSOR_GROUPS } from '../../data/professors'
import { counselRecords } from '../../../shared/counselStore'
import { COUNSEL_TYPE_LABEL, counselTypeDistribution } from '../../data/counsel'
import type { CounselTypeKey } from '../../data/counsel'
import './CounselStatus.css'
import { usePageHead } from '../../components/PageCrumb'

// 상담 내역 행 — 로그인한 학생의 상담 신청(dc.counsel_request)만 그린다. 데모 기록은 없다.
interface CsRow {
  id: string
  /** 유형별 분포 카드와 같은 축의 키 — 카드 클릭 필터가 이걸로 걸린다. */
  typeKey: CounselTypeKey
  status: string
  statusTone: 'scheduled' | 'done' | 'cancel'
  counselor: string
  description: string
  /** 완료 건에 상담사가 남긴 공개 코멘트(counsel_record.comment). 서버가 학생에게는 소견·후속을 주지 않는다. */
  comment?: string
  tags: string[]
  date: string
  time: string
}

const STATUS_TONE: Record<string, CsRow['statusTone']> = { 대기: 'scheduled', 확정: 'scheduled', 완료: 'done', 취소: 'cancel' }

/** 교수상담은 상담사 id 공간이 아니라 교수 풀(professorId)이다. */
function professorLabel(id: string | undefined): string {
  if (!id) return '교수 배정 중'
  for (const group of PROFESSOR_GROUPS) {
    for (const professors of Object.values(group.divisions)) {
      const found = professors.find(p => p.id === id)
      if (found) return `${found.name} 교수`
    }
  }
  return '교수 배정 중'
}

export default function CounselStatus() {
  usePageHead('상담 현황', '전문가 상담 내역을 확인합니다.')
  const navigate = useNavigate()

  // 상담사가 확정·완료하면 같은 스토어가 갱신되어 그대로 반영된다.
  const commentByRequest = new Map(counselRecords().map(r => [r.requestId, r.comment]))
  const counselItems: CsRow[] = getStudentCounselRequests(getActiveStudentId())
    .slice()
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
    .map(r => ({
      id: r.id,
      typeKey: r.type,
      status: r.status,
      statusTone: STATUS_TONE[r.status] ?? 'scheduled',
      counselor: r.type === '교수' ? professorLabel(r.professorId) : getCounselorLabel(r.assignedCounselorId),
      description: r.topic,
      comment: r.status === '완료' ? commentByRequest.get(r.id) || undefined : undefined,
      tags: r.slot?.place ? [r.slot.place] : [],
      date: r.slot?.date ?? r.requestedAt.slice(0, 10),
      time: r.slot?.start ?? r.requestedAt.slice(11, 16),
    }))

  // 유형별 분포는 목록과 같은 배열에서 센다 — 카드 합계가 아래 목록과 어긋나지 않게.
  const typeStats = counselTypeDistribution(counselItems.map(i => i.typeKey))
  // 카드를 다시 누르면 해제된다(전체 보기).
  const [typeFilter, setTypeFilter] = useState<CounselTypeKey | null>(null)
  const shownItems = typeFilter ? counselItems.filter(i => i.typeKey === typeFilter) : counselItems

  const total = counselItems.length
  const doneCount = counselItems.filter(i => i.statusTone === 'done').length
  const scheduledCount = counselItems.filter(i => i.statusTone === 'scheduled').length
  const recentDate = counselItems.find(i => i.statusTone === 'done')?.date ?? '-'
  const pctOf = (n: number) => (total ? Math.round((n / total) * 100) : 0)
  const stats = [
    { label: '총 상담 건수', value: `${total}건`, color: 'blue', bar: total ? 100 : 0 },
    { label: '완료', value: `${doneCount}건`, color: 'green', bar: pctOf(doneCount) },
    { label: '예정', value: `${scheduledCount}건`, color: 'purple', bar: pctOf(scheduledCount) },
    { label: '최근 상담', value: recentDate, color: 'blue', bar: 0 },
  ]

  return (
    <div className="v2-page cs-page">
      <section className="cs-hero">
        <button className="cs-back-btn" type="button" onClick={() => navigate('/main')}>
          홈으로
        </button>
      </section>

      <section className="cs-stats" aria-label="상담 요약">
        {stats.map((item) => (
          <article className="cs-stat-card" key={item.label}>
            <div>
              <p>{item.label}</p>
              <strong>{item.value}</strong>
              {item.bar > 0 && (
                <span className="cs-stat-bar" title={`전체 ${total}건 중 ${item.bar}%`}>
                  <span style={{ width: `${item.bar}%` }} />
                </span>
              )}
            </div>
          </article>
        ))}
      </section>
      {total > 0 && <p className="cs-stats-note">게이지바는 전체 상담 {total}건 대비 비율입니다.</p>}

      <section className="cs-panel">
        <h2>
          상담 유형별 분포
        </h2>
        <div className="cs-type-grid">
          {typeStats.map((item) => (
            <button
              type="button"
              className={`cs-type-card cs-type-card--${item.hue}${typeFilter === item.key ? ' is-on' : ''}`}
              key={item.key}
              aria-pressed={typeFilter === item.key}
              onClick={() => setTypeFilter(prev => (prev === item.key ? null : item.key))}
            >
              <div>
                <p>{item.label}</p>
                <strong>{item.count}건</strong>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="cs-panel cs-history">
        <div className="cs-panel-head">
          <h2>
            상담 내역
            {typeFilter && <em className="cs-filter-tag">{COUNSEL_TYPE_LABEL[typeFilter]} {shownItems.length}건</em>}
          </h2>
          {typeFilter
            ? (
              <button type="button" className="cs-filter-reset" onClick={() => setTypeFilter(null)}>
                전체 보기
              </button>
            )
            : <span>유형 카드를 클릭하면 해당 유형만 볼 수 있습니다</span>}
        </div>

        <div className="cs-list">
          {shownItems.map((item) => (
            <button className="cs-row" type="button" key={item.id}>
              <div className="cs-row-main">
                <div className="cs-row-title">
                  <strong>{COUNSEL_TYPE_LABEL[item.typeKey]}</strong>
                  <span className={`cs-status cs-status--${item.statusTone}`}>{item.status}</span>
                </div>
                <p className="cs-counselor">{item.counselor}</p>
                <p className="cs-description">{item.description}</p>
                {item.comment && <p className="cs-description">상담사 코멘트 · {item.comment}</p>}
                <div className="cs-tags">
                  {item.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              </div>
              <time className="cs-date">
                <strong>{item.date}</strong>
                <span>{item.time}</span>
              </time>
            </button>
          ))}
          {shownItems.length === 0 && (
            <p className="cs-list-empty">
              아직 {typeFilter ? COUNSEL_TYPE_LABEL[typeFilter] : '상담'} 내역이 없습니다.
              {' '}
              <button type="button" className="cs-filter-reset" onClick={() => navigate('/counsel')}>상담 신청하기</button>
            </p>
          )}
        </div>
      </section>

      {/* AI 종합 분석은 AI 계약이 확정되기 전이라 제공하지 않는다(DB.md #38). 가짜 분석 문구를 띄우지 않는다. */}
      <section className="cs-panel cs-ai">
        <div className="cs-panel-head">
          <h2>전문가 코멘트 종합 분석</h2>
        </div>
        <div className="cs-ai-collapsed">
          <div className="cs-ai-collapsed-icon"><i className="fa-solid fa-robot" /></div>
          <div className="cs-ai-collapsed-copy">
            <strong>준비 중입니다</strong>
            <p>상담 기록이 쌓이면 상담사 코멘트와 진단 결과를 함께 분석한 인사이트를 제공할 예정입니다.</p>
          </div>
          <button type="button" className="cs-ai-analyze-btn" disabled>
            <i className="fa-solid fa-wand-magic-sparkles" /> 분석하기
          </button>
        </div>
      </section>
    </div>
  )
}
