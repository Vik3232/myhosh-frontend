import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isInfo = toast.type === 'info';
  const Icon = isSuccess ? CheckCircle2 : isInfo ? Info : AlertCircle;

  return (
    <div
      className={`toast-banner toast-${toast.type || 'error'}`}
      role={isSuccess || isInfo ? 'status' : 'alert'}
      aria-live={isSuccess || isInfo ? 'polite' : 'assertive'}
    >
      <Icon size={18} className="toast-icon" aria-hidden="true" />
      <span className="toast-message">{toast.message}</span>
      <button
        type="button"
        className="toast-close"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}