import React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import type { Toast as ToastType } from '@/hooks/useToast';

interface ToastProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info
};

const colorMap = {
  success: 'border-green-500 bg-green-500/10',
  error: 'border-red-500 bg-red-500/10',
  info: 'border-blue-500 bg-blue-500/10'
};

export const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const Icon = iconMap[toast.type];
  
  return (
    <div className={`toast-item ${colorMap[toast.type]}`}>
      <Icon className={`toast-icon toast-${toast.type}`} size={20} />
      <span className="toast-message">{toast.message}</span>
      <button 
        className="toast-close"
        onClick={() => onRemove(toast.id)}
        aria-label="Close toast"
      >
        <X size={16} />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;
  
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};
