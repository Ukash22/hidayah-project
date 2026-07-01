const variants = {
  default: 'bg-surface-overlay text-text-muted',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  danger:  'bg-danger-light text-danger',
  info:    'bg-info-light text-info',
};

export default function Badge({ variant = 'default', className = '', children }) {
  return (
    <span className={[
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold',
      variants[variant],
      className,
    ].join(' ')}>
      {children}
    </span>
  );
}
