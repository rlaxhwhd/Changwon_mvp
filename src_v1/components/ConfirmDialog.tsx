import Modal from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export default function ConfirmDialog({
  open, onClose, onConfirm, title, message,
  confirmText = '확인', cancelText = '취소', danger,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" footer={
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-sm btn-outline" onClick={onClose}>{cancelText}</button>
        <button
          className="btn btn-sm"
          style={{ background: danger ? '#EF4444' : '#4F46E5', color: '#fff' }}
          onClick={() => { onConfirm(); onClose(); }}
        >
          {confirmText}
        </button>
      </div>
    }>
      <p style={{ color: '#374151', lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}
