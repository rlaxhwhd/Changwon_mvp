import { useMemo, useState } from 'react'
import { usePageHead } from '../../components/PageCrumb'
import {
  NOTICE_CATEGORIES,
  NOTICE_CATEGORY_LABEL,
  countNoticesByCategory,
  getNotices,
} from '../../data/notices'
import type { NoticeCategory } from '../../data/notices'
import './Notices.css'

const ALL = 'ALL' as const
type Filter = typeof ALL | NoticeCategory

/** 2026-08-19 → 2026.08.19 */
const formatDate = (value: string) => value.replaceAll('-', '.')

export default function Notices() {
  usePageHead('공지사항', '프로그램과 진로·취업 관련 새 소식을 확인합니다.')

  const [filter, setFilter] = useState<Filter>(ALL)
  const [openId, setOpenId] = useState<string | null>(null)

  const counts = useMemo(() => countNoticesByCategory(), [])
  const list = useMemo(() => getNotices(filter === ALL ? undefined : filter), [filter])

  return (
    <div className="v2-page nt-page">
      <div className="nt-tabs" role="tablist" aria-label="공지사항 분류">
        {([ALL, ...NOTICE_CATEGORIES] as Filter[]).map(item => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={filter === item}
            className={`nt-tab${filter === item ? ' is-active' : ''}`}
            onClick={() => { setFilter(item); setOpenId(null) }}
          >
            {item === ALL ? '전체' : NOTICE_CATEGORY_LABEL[item]}
            <em>{counts[item]}</em>
          </button>
        ))}
      </div>

      <div data-slot="card" className="nt-list">
        {list.length === 0 ? (
          <p className="nt-empty">해당 분류의 공지사항이 없습니다.</p>
        ) : list.map(notice => {
          const open = openId === notice.id
          return (
            <article key={notice.id} className={`nt-item${open ? ' is-open' : ''}`}>
              {/* 본문은 같은 자리에서 펼친다 — 목록 위치를 잃지 않게 별도 화면으로 나가지 않는다. */}
              <button
                type="button"
                className="nt-row"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : notice.id)}
              >
                <span className={`nt-category is-${notice.category.toLowerCase()}`}>
                  {NOTICE_CATEGORY_LABEL[notice.category]}
                </span>
                <span className="nt-copy">
                  <b>
                    {notice.pinned && <span className="nt-pin">고정</span>}
                    {notice.title}
                  </b>
                  <small>{notice.summary}</small>
                </span>
                <time dateTime={notice.postedAt}>{formatDate(notice.postedAt)}</time>
                <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} aria-hidden="true" />
              </button>
              {open && (
                <div className="nt-body">
                  {notice.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
