import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
} from 'lucide-react';

export interface AlertNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

interface NotificationToastProps {
  notifications: AlertNotification[];
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notifications,
  onDismiss,
}) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.map((n) => {
        const isSuccess = n.type === 'success';
        const isWarning = n.type === 'warning';
        const isError = n.type === 'error';

        return (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-2 ${
              isSuccess
                ? 'bg-slate-900/95 border-emerald-500/60 text-slate-100'
                : isWarning
                ? 'bg-slate-900/95 border-amber-500/60 text-slate-100'
                : isError
                ? 'bg-slate-900/95 border-rose-500/60 text-slate-100'
                : 'bg-slate-900/95 border-sky-500/60 text-slate-100'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {isError && <AlertCircle className="w-4 h-4 text-rose-400" />}
              {n.type === 'info' && <Info className="w-4 h-4 text-sky-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white">{n.title}</h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug break-words">
                {n.message}
              </p>
            </div>

            <button
              onClick={() => onDismiss(n.id)}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
