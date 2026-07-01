import { X, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const config = {
  info:    { icon: Info,          classes: 'bg-info-light    text-info    border-info/20'    },
  success: { icon: CheckCircle,   classes: 'bg-success-light text-success border-success/20' },
  warning: { icon: AlertTriangle, classes: 'bg-warning-light text-warning border-warning/20' },
  error:   { icon: XCircle,       classes: 'bg-danger-light  text-danger  border-danger/20'  },
};

export default function Alert({ variant = 'info', title, children, onDismiss, className = '' }) {
  const { icon: Icon, classes } = config[variant];

  return (
    <div
      role="alert"
      className={[
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
        classes,
        className,
      ].join(' ')}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <p className={title ? 'mt-0.5 opacity-80' : ''}>{children}</p>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss alert"
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
