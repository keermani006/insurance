'use client';

import { cn } from '@/lib/utils';

// ── ErrorState ──────────────────────────────────────────────
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className
      )}
      role="alert"
    >
      {/* Instrument-panel error indicator */}
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--severity-severe-bg)', border: '1px solid var(--severity-severe)' }}>
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="var(--severity-severe)" strokeWidth="1.5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h3 className="text-heading-sm mb-2" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="text-body-sm max-w-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-primary"
          aria-label="Retry the failed operation"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Try again
        </button>
      )}
    </div>
  );
}

// ── EmptyState ──────────────────────────────────────────────
interface EmptyStateProps {
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
    href?: string;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  message,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className
      )}
    >
      {/* Annotation dot visual — quieter reuse of scan motif */}
      <div className="relative w-16 h-16 flex items-center justify-center mb-4">
        {icon ?? (
          <>
            <div
              className="absolute w-full h-full rounded-full border-2 border-dashed opacity-40"
              style={{ borderColor: 'var(--brand-primary)' }}
            />
            <div
              className="w-5 h-5 rounded-full"
              style={{ backgroundColor: 'var(--brand-primary-light)', border: '2px solid var(--brand-primary)' }}
            />
          </>
        )}
      </div>
      <h3 className="text-heading-sm mb-2" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="text-body-sm max-w-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        {message}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ── NotFound ────────────────────────────────────────────────
export function NotFoundState({ onGoBack }: { onGoBack?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6">
      <div className="font-display text-[80px] leading-none mb-2" style={{ color: 'var(--border-strong)' }}>
        404
      </div>
      <h1 className="text-display-md mb-3" style={{ color: 'var(--text-primary)' }}>
        Claim not on file
      </h1>
      <p className="text-body-md max-w-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
        The page or claim you&#39;re looking for doesn&#39;t exist in this system. 
        Double-check the claim number, or start a new assessment.
      </p>
      <div className="flex gap-3">
        {onGoBack && (
          <button onClick={onGoBack} className="btn-secondary">
            ← Go back
          </button>
        )}
        <a href="/dashboard" className="btn-primary">
          Back to dashboard
        </a>
      </div>
    </div>
  );
}
