import type { ButtonHTMLAttributes } from 'react'

/**
 * 공용 버튼 — 규격은 DESIGN.md §4, 모양은 shared/ui/ui.css 의 .dc-btn.
 * 색은 포털 토큰을 따른다(학생 파랑 · 교직원 초록). 새 화면은 화면 전용 버튼 클래스를 만들지 말고 이것을 쓴다.
 * 링크로 써야 하면 className 만 가져다 쓴다: <Link className={buttonClass('primary')} …>
 */
export type ButtonVariant = 'primary' | 'outline' | 'text' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export function buttonClass(variant: ButtonVariant = 'outline', size: ButtonSize = 'md', block = false, extra = '') {
  return ['dc-btn', `dc-btn--${variant}`, size !== 'md' && `dc-btn--${size}`, block && 'dc-btn--block', extra].filter(Boolean).join(' ')
}

export default function Button({ variant = 'outline', size = 'md', block = false, className = '', type = 'button', ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; block?: boolean }) {
  return <button type={type} className={buttonClass(variant, size, block, className)} {...rest} />
}
