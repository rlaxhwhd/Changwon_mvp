import type { ToastMessage } from '../types';

interface ToastContainerProps {
  toasts: ToastMessage[];
}

export default function ToastContainer({ toasts }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type === 'success' ? 'success' : ''}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
