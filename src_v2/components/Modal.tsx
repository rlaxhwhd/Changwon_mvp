import { useEffect, useRef, type ReactNode } from 'react'

type Size = 'sm' | 'md' | 'lg'

const WIDTH: Record<Size, string> = {
  sm: '480px',
  md: '640px',
  lg: '900px',
}

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  size?: Size
  children: ReactNode
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

export default function Modal({ open, onClose, title, size = 'md', children }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  /**
   * onClose는 부모에서 매 렌더마다 새 함수 reference로 들어올 수 있어
   * deps에 넣으면 textarea/input 입력 도중에도 effect가 재실행되어
   * 첫 번째 focusable(닫기 버튼)로 포커스가 튄다. ref로 안정화.
   */
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const items = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
        if (items.length === 0) {
          e.preventDefault()
          return
        }
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKey)
    // Move focus into the dialog on open (open이 true가 되는 순간 1회만).
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    ;(firstFocusable ?? dialogRef.current)?.focus()

    return () => {
      document.removeEventListener('keydown', handleKey)
      previouslyFocused?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,36,66,.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: WIDTH[size], maxWidth: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--color-text)' }}>{title}</span>
            {/* 폴백은 admin 대응 — 이 모달을 교직원 포털에서도 쓴다(--color-text-muted 가 admin 에 없다) */}
            <button onClick={onClose} aria-label="닫기" style={{ color: 'var(--color-text-muted, #8a92a2)', fontSize: 19, cursor: 'pointer', background: 'none', border: 'none' }}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        )}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
