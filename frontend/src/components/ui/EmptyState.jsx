import Button from './Button';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,        // { label, onClick, variant? }
  className = '',
}) {
  return (
    <div className={['flex flex-col items-center justify-center text-center py-16 px-6', className].join(' ')}>
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-overlay text-text-subtle">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
      )}
      {title && (
        <h3 className="text-base font-semibold text-text mb-1">{title}</h3>
      )}
      {description && (
        <p className="text-sm text-text-muted max-w-xs">{description}</p>
      )}
      {action && (
        <div className="mt-5">
          <Button variant={action.variant ?? 'primary'} onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
