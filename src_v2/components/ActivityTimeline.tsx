import { useState } from 'react'
import type { ActivityItem } from '../data/activityLog'

// ─────────────────────────────────────────────────────────────────────────
// 성장 활동 기록 타임라인 — 「내 성장」과 라운지가 같은 모양·같은 접기 규칙을 쓴다.
// 처음에는 최근 3건만 보여 주고, 펼치면 받아 온 기록 전체를 보여 준다.
// 클래스(gh-*)는 growth/GrowthHome.css 가 그린다 — 두 화면 모두 그 시트를 불러온다.
// ─────────────────────────────────────────────────────────────────────────

const COLLAPSED = 3

export default function ActivityTimeline({ items, error }: { items: ActivityItem[] | null; error: string }) {
  const [open, setOpen] = useState(false)
  const shown = items && !open ? items.slice(0, COLLAPSED) : items
  const hidden = items ? items.length - COLLAPSED : 0
  return <>
    <div className="gh-timeline">
      {error && <p className="gh-empty" role="alert">{error}</p>}
      {!items && !error && <p className="gh-empty" role="status">불러오는 중입니다.</p>}
      {shown?.map(item => <div className="gh-timeline-item" key={item.key}>
        <time>{item.date}</time><span className={`gh-timeline-dot is-${item.tone}`} />
        <div><span>{item.type}</span><strong>{item.title}</strong>{item.action && <p>{item.action}</p>}</div>
      </div>)}
      {items?.length === 0 && <p className="gh-empty">아직 기록된 활동이 없습니다.</p>}
    </div>
    {hidden > 0 && <button type="button" className="gh-timeline-more" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      {open ? <>접기 <i className="fa-solid fa-chevron-up" /></> : <>전체 보기 ({items!.length}건) <i className="fa-solid fa-chevron-down" /></>}
    </button>}
  </>
}
