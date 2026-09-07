import { LuX } from 'react-icons/lu'
import { useEffect } from 'react'
import type { ReactNode } from 'react'

type AdminModalProps = {
  children: ReactNode
  title: string
  onClose: () => void
  size?: 'md' | 'lg' | 'xl'
}

export default function AdminModal({ children, title, onClose, size = 'lg' }: AdminModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="admin-modal-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className={`admin-modal admin-modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="admin-modal-head">
          <h2>{title}</h2>
          <button type="button" className="admin-modal-close" aria-label="닫기" onClick={onClose}>
            <LuX aria-hidden="true" />
          </button>
        </header>
        <div className="admin-modal-body">{children}</div>
      </section>
    </div>
  )
}
