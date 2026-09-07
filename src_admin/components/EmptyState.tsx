import type { IconType } from 'react-icons'
import { LuInbox } from 'react-icons/lu'

interface EmptyStateProps {
  icon?: IconType
  title?: string
  message: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({
  icon: Icon = LuInbox,
  title,
  message,
  action,
}: EmptyStateProps) {
  return (
    <div className="admin-empty">
      <Icon />
      {title && <strong>{title}</strong>}
      <p>{message}</p>
      {action && (
        <button className="admin-btn admin-btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}
