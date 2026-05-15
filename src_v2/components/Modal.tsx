import { useEffect, type ReactNode } from 'react'

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

export default function Modal({ open, onClose, title, size = 'md', children }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,36,66,.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: WIDTH[size], maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text)' }}>{title}</span>
            <button onClick={onClose} style={{ color: 'var(--color-text-muted)', fontSize: 18, cursor: 'pointer', background: 'none', border: 'none' }}>
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
