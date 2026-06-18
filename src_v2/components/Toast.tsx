import type { Toast } from '../types'

const ICONS: Record<string, string> = {
  success: 'fa-circle-check',
  error:   'fa-circle-xmark',
  warning: 'fa-triangle-exclamation',
  info:    'fa-circle-info',
}

interface Props {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export default function ToastContainer({ toasts, onRemove }: Props) {
  if (!toasts.length) return null

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => onRemove(t.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#fff',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            boxShadow: 'var(--shadow-md)',
            fontSize: 16,
            cursor: 'pointer',
            minWidth: 260,
          }}
        >
          <i className={`fa-solid ${ICONS[t.type]}`} style={{ color: `var(--color-${t.type === 'error' ? 'danger' : t.type === 'warning' ? 'warning' : t.type === 'success' ? 'success' : 'primary'})` }} />
          {t.message}
        </div>
      ))}
    </div>
  )
}
