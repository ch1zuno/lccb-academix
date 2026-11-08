import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 3,
  onPageChange,
  itemName = 'items',
  className = '',
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems <= pageSize) return null;

  const start = Math.min(totalItems, (currentPage - 1) * pageSize + 1);
  const end = Math.min(totalItems, currentPage * pageSize);

  // Generate page numbers array (with ellipsis if totalPages is large)
  const getPages = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, '...', totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pages = getPages();

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-between gap-3 border-t border-line/60 pt-3 text-[13px] sm:flex-row',
        className
      )}
      aria-label="Pagination Navigation"
    >
      <span className="text-muted-foreground">
        Showing <strong className="font-semibold text-ink">{start}–{end}</strong> of{' '}
        <strong className="font-semibold text-ink">{totalItems}</strong> {itemName}
      </span>

      <div className="flex items-center gap-1.5" role="group" aria-label="Page selection">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex min-h-[38px] items-center gap-1 border-2 border-ink bg-paper px-2.5 py-1 text-[13px] font-bold text-ink shadow-[2px_2px_0_var(--color-ink)] transition-transform hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 disabled:pointer-events-none disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.4} />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Numbered Page Buttons */}
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground font-bold">
                …
              </span>
            );
          }

          const isCurrent = p === currentPage;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                'min-h-[38px] min-w-[38px] border-2 border-ink px-2.5 py-1 text-[13px] font-bold transition-[transform,box-shadow]',
                isCurrent
                  ? 'bg-gold text-ink shadow-[2px_2px_0_var(--color-ink)]'
                  : 'bg-paper text-ink shadow-[1px_1px_0_var(--color-ink)] hover:bg-surface-highlight'
              )}
              aria-current={isCurrent ? 'page' : undefined}
              aria-label={`Page ${p}`}
            >
              {p}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex min-h-[38px] items-center gap-1 border-2 border-ink bg-paper px-2.5 py-1 text-[13px] font-bold text-ink shadow-[2px_2px_0_var(--color-ink)] transition-transform hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 disabled:pointer-events-none disabled:opacity-40"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

