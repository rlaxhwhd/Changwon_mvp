import { LuChevronLeft, LuChevronRight, LuChevronsRight } from 'react-icons/lu'
import type { ReactNode } from 'react'

interface Props {
  page: number
  pages: number
  onChange: (page: number) => void
  children?: ReactNode
  numbered?: boolean
  label?: string
}

/** 목록의 조회 방식은 유지하고 페이지 이동 UI만 공유한다. */
export default function AdminPagination({ page, pages, onChange, children, numbered = false, label = '목록 페이지' }: Props) {
  const last = Math.max(1, pages)
  const start = Math.max(1, Math.min(page - 4, last - 9))
  const numbers = Array.from({ length: Math.min(10, last) }, (_, index) => start + index)
  return (
    <nav className="admin-pagination" aria-label={label}>
      <button type="button" className="admin-page-btn" disabled={page <= 1} onClick={() => onChange(Math.max(1, page - 1))} aria-label="이전 페이지"><LuChevronLeft /></button>
      {numbered ? <div className="admin-pagination-pages">{numbers.map(number => (
        <button type="button" className="admin-page-btn" key={number} aria-label={`${number} 페이지`} aria-current={number === page ? 'page' : undefined} onClick={() => onChange(number)}>{number}</button>
      ))}</div> : <span className="admin-page-info" aria-live="polite">{children ?? `${page} / ${last} 페이지`}</span>}
      <button type="button" className="admin-page-btn" disabled={page >= last} onClick={() => onChange(Math.min(last, page + 1))} aria-label="다음 페이지"><LuChevronRight /></button>
      {numbered && <button type="button" className="admin-page-btn" disabled={page >= last} onClick={() => onChange(last)} aria-label="마지막 페이지"><LuChevronsRight /></button>}
    </nav>
  )
}
