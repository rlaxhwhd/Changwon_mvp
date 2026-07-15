interface EmptyStateProps {
  icon?: string
  title?: string
  message: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({
  icon = 'fa-solid fa-inbox',
  title,
  message,
  action,
}: EmptyStateProps) {
  return (
    <div className="admin-empty">
      <i className={icon} />
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
