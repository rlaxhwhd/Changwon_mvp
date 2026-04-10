import { useEffect, useRef } from 'react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Drawer({ open, onClose, title, children, footer }: DrawerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open && ref.current) {
      const focusable = ref.current.querySelector<HTMLElement>('button, [tabindex]');
      focusable?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="drawer-overlay" onClick={onClose} role="presentation">
      <div
        className="drawer-panel"
        onClick={e => e.stopPropagation()}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="drawer-header">
          <h3>{title}</h3>
          <button className="drawer-close" onClick={onClose} aria-label="닫기">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-footer">{footer}</div>}
      </div>
    </div>
  );
}
