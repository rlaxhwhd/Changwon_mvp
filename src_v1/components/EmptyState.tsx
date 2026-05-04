interface EmptyStateProps {
  icon?: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon = 'fa-solid fa-inbox', message, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <i className={icon} />
      <p>{message}</p>
      {action && (
        <button className="btn btn-sm" style={{ background: '#4F46E5', color: '#fff' }} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
