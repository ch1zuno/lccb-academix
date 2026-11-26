import React from 'react';
import { Clock } from 'lucide-react';
import ErrorBanner from './ErrorBanner';
import { useSlowFlag } from '../../lib/ux';
import { cn } from '../../lib/utils';

/**
 * Shared loading / slow-cold-start / error / empty state handler.
 * Guarantees an error never renders alongside an empty state.
 */
export function LoadState({
  loading = false,
  error = null,
  empty = false,
  onRetry,
  skeleton,
  emptyText = 'Nothing to show yet.',
  emptyAction = null,
  errorText = "We couldn't load this right now. Try again.",
  retryLabel = 'Retry',
  slowMs = 4000,
  inline = false,
  className,
  children,
}) {
  const slow = useSlowFlag(loading, slowMs);

  if (loading) {
    return (
      <div role="status" aria-live="polite" aria-busy="true" className={cn('space-y-3', className)}>
        {skeleton || (
          <div className={cn(!inline && 'panel panel-pad', 'space-y-3')}>
            <div className="skeleton h-5 w-1/3" />
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-10 w-full" />
          </div>
        )}
        {slow && (
          <p className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Waking up the server — first load can take a moment.
          </p>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBanner
        variant={inline ? 'inline' : 'panel'}
        message={errorText}
        onRetry={onRetry}
        retryLabel={retryLabel}
        className={className}
      />
    );
  }

  if (empty) {
    return (
      <div className={cn(inline ? 'callout text-[14px] text-muted-foreground' : 'panel empty', className)}>
        <p className="text-[14px] text-muted-foreground">{emptyText}</p>
        {emptyAction ? <div className="mt-3">{emptyAction}</div> : null}
      </div>
    );
  }

  return children ?? null;
}

export default LoadState;
