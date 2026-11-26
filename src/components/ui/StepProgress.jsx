import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Shared segmented step progress bar.
 * - compact (default): label line ("Step X of N · Title") + crisp segments.
 * - interactive: 44px tappable step pills for going back to completed steps.
 */
export function StepProgress({
  steps = [],
  currentIndex = 0,
  onStepClick,
  interactive = false,
  labelPrefix = 'Step',
  className,
}) {
  if (!steps.length) return null;
  const clamped = Math.max(0, Math.min(steps.length - 1, currentIndex));
  const current = steps[clamped];
  const title = current?.title || current?.short || '';

  if (interactive) {
    return (
      <nav aria-label="Progress" className={className}>
        <ol
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        >
          {steps.map((s, idx) => {
            const done = idx < clamped;
            const active = idx === clamped;
            const canClick = Boolean(onStepClick && done);
            return (
              <li key={s.id || idx}>
                <button
                  type="button"
                  disabled={!canClick}
                  onClick={() => canClick && onStepClick(idx)}
                  aria-current={active ? 'step' : undefined}
                  aria-label={`${labelPrefix} ${idx + 1}: ${s.title || s.short || ''}${done ? ' (completed)' : active ? ' (current)' : ''}`}
                  className={cn(
                    'flex min-h-[44px] w-full flex-col items-center justify-center border-2 px-1 py-1.5 text-center transition-colors',
                    active
                      ? 'border-ink bg-gold text-ink shadow-[2px_2px_0_var(--color-ink)]'
                      : done
                        ? 'cursor-pointer border-ink bg-ink text-paper hover:opacity-90'
                        : 'cursor-default border-ink/25 bg-paper text-muted-foreground',
                  )}
                >
                  <span className="num text-[11px] font-extrabold leading-none">
                    {done ? '✓' : (s.num ?? idx + 1)}
                  </span>
                  {s.short && (
                    <span className="mt-1 hidden text-[11px] font-bold leading-none sm:block">
                      {s.short}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  return (
    <div
      role="progressbar"
      aria-label={`${labelPrefix} progress`}
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-valuenow={clamped + 1}
      aria-valuetext={`${labelPrefix} ${clamped + 1} of ${steps.length}${title ? `: ${title}` : ''}`}
      className={className}
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
        <span className="font-bold text-ink">
          <span className="num">{labelPrefix} {clamped + 1} of {steps.length}</span>
          {title ? <span className="font-semibold text-muted-foreground"> · {title}</span> : null}
        </span>
      </div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((s, idx) => {
          const done = idx < clamped;
          const active = idx === clamped;
          const canClick = Boolean(onStepClick && done);
          return canClick ? (
            <button
              key={s.id || idx}
              type="button"
              onClick={() => onStepClick(idx)}
              aria-label={`Back to ${s.title || `step ${idx + 1}`}`}
              className="h-2.5 border-2 border-ink bg-ink transition-opacity hover:opacity-80"
            />
          ) : (
            <span
              key={s.id || idx}
              className={cn(
                'block h-2.5 border-2',
                done ? 'border-ink bg-ink' : active ? 'border-ink bg-gold' : 'border-ink/30 bg-paper',
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

export default StepProgress;
