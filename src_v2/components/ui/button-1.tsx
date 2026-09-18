import type { ComponentProps, CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import './button-1.css'

type SharedProps = { width?: string; height?: string; disabled?: boolean }
type Props = SharedProps & (
  | (ComponentProps<'button'> & { to?: never })
  | (ComponentProps<typeof Link> & { to: string })
)

/** 프롬프트의 회전 그라데이션 테두리. 이동은 링크, 동작은 실제 button을 사용한다. */
export default function GradientButton({ width = 'auto', height = '46px', disabled = false, className = '', children, style, ...props }: Props) {
  const appearance: CSSProperties = { minWidth: width, minHeight: height, ...style }
  const classes = `gradient-button ${className}`
  const content = <span className="gradient-button-label">{children}</span>
  if ('to' in props && props.to !== undefined) {
    const { onClick, ...linkProps } = props
    return <Link {...linkProps} className={classes} style={appearance} data-slot="gradient-button"
      aria-disabled={disabled || undefined} tabIndex={disabled ? -1 : linkProps.tabIndex}
      onClick={event => { if (disabled) event.preventDefault(); else onClick?.(event) }}>{content}</Link>
  }
  return <button {...props} type={props.type ?? 'button'} disabled={disabled} className={classes} style={appearance} data-slot="gradient-button">{content}</button>
}
