import type { HTMLAttributes } from 'react'

/**
 * 공용 카드 — 규격은 DESIGN.md §4, 모양은 shared/ui/ui.css 의 .dc-card.
 * 면은 1px 테두리로 나눈다(그림자·그라데이션 없음).
 * compact = 목록 격자 · featured = 강조(테두리만 강조색) · dark = 진한 강조(화면당 하나) · link = 안내 링크 행.
 */
export type CardVariant = 'default' | 'compact' | 'featured' | 'dark' | 'link'

export default function Card({ variant = 'default', className = '', ...rest }: HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return <div className={['dc-card', variant !== 'default' && `dc-card--${variant}`, className].filter(Boolean).join(' ')} {...rest} />
}
