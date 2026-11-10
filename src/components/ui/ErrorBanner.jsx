import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';

export function ErrorBanner({ message, onRetry, retryLabel = 'Retry', className }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'panel flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-surface-alert px-4 py-3.5 text-[14px] text-destructive shadow-[3px_3px_0_var(--color-ink)]',
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
        <p className="font-medium leading-snug">{message}</p>
      </div>
      {onRetry && (
        <Button type="button" size="sm" variant="outline" onClick={onRetry} className="shrink-0 bg-paper text-ink">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" strokeWidth={2} />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export default ErrorBanner;
