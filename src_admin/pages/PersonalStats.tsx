import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getActiveCounselor } from '../data/counselors'
import {
  getHelloSummary, getTypeDistribution, getPerformance, useCounselDashboard,
} from '../data/counselorDashboard'

// ─────────────────────────────────────────────────────────────────────────
// 통계 현황 › 개인통계 — 홈에서 옮겨 온 통계 카드 4장(2026-10-29, 148).
// 자료는 홈과 같은 counsel-dashboard 조회다. 디자인은 후속 작업이라 기능만 둔다.
// ─────────────────────────────────────────────────────────────────────────

const CONTACT_LABELS = {
  diagnosis: '진단을 완료하지 않은 학생',
  counsel: '진단 완료 후 상담을 완료하지 않은 학생',
  roadmap: '진단·상담 완료 후 로드맵이 생성되지 않은 학생',
}

export default function PersonalStats() {
  const me = getActiveCounselor()
  const { data, error, refresh } = useCounselDashboard(me.id)
  const [contactTab, setContactTab] = useState<keyof typeof CONTACT_LABELS>('diagnosis')

  if (!data) return (
    <div className="admin-page">
      {error ? <div role="alert"><p>개인통계를 조회하지 못했습니다. {error}</p>
        <button type="button" className="btn" onClick={refresh}>다시 조회</button></div>
        : <p role="status">개인통계를 불러오는 중입니다.</p>}
    </div>
  )

  const hello = getHelloSummary(data)
  const dist = getTypeDistribution(data)
  const perf = getPerformance(data)

  return (
    <div className="admin-page">
      <header className="admin-page-head"><h1 className="admin-page-title">개인통계</h1></header>
      {error && <p role="alert">최신 조회에 실패해 이전 결과를 표시합니다. {error}</p>}

      {/* 1. CARE 7+ 참여학생 | 상담기록 */}
      <section className="admin-card">
        <h2>CARE 7+ 참여학생 · 상담기록</h2>
        <p><Link to="/students/all?focus=care7">CARE 7+ 참여학생 {hello.studentCount}명</Link></p>
        <p><Link to="/counsel/records">상담기록 {hello.recordCount}건</Link></p>
      </section>

      {/* 2. 미접촉자 현황 */}
      <section className="admin-card">
        <h2>미접촉자 현황</h2>
        <p>재학생 {data.uncontacted.total.toLocaleString()}명 기준</p>
        <div className="admin-tabs" role="tablist" aria-label="미접촉 단계">
          {(['diagnosis', 'counsel', 'roadmap'] as const).map((key, index) => <button key={key} type="button" role="tab"
            aria-selected={contactTab === key} className={`admin-tab${contactTab === key ? ' active' : ''}`} onClick={() => setContactTab(key)}>
            {['진단', '상담', '로드맵'][index]}</button>)}
        </div>
        <div role="tabpanel" aria-label={CONTACT_LABELS[contactTab]}>
          <p>{CONTACT_LABELS[contactTab]}</p>
          <Link to={`/students/all?contact=${contactTab}`}>{data.uncontacted[contactTab].toLocaleString()}명 · 학생 목록 보기 →</Link>
        </div>
      </section>

      {/* 3. CARE 7+ 참여학생 유형 분포 */}
      <section className="admin-card">
        <h2>CARE 7+ 참여학생 유형 분포</h2>
        <p>전체 {dist.total}명</p>
        <ul>
          {dist.slices.map(s => (
            <li key={s.code ?? 'unassigned'}>{s.code} {s.label} — {s.count}명 ({s.ratio}%)</li>
          ))}
        </ul>
        <p>유형은 진단 완료 학생에게만 부여되며, 로드맵 생성과 비교과 프로그램 노출의 기준이 됩니다.</p>
      </section>

      {/* 4. 나의 성과 지표 */}
      <section className="admin-card">
        <h2>나의 성과 지표</h2>
        <ul>
          {perf.map(row => <li key={row.key}>{row.name} — {row.value}%</li>)}
        </ul>
        <Link to="/counsel/stats">성과 리포트 보기 →</Link>
      </section>
    </div>
  )
}
