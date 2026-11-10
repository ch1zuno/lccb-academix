import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';

export function ConfirmDialog({
  open,
  title = 'Confirm action',
  description,
  warning,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => cancelRef.current?.focus(), 20);
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !busy) {
        e.stopPropagation();
        onCancel?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, busy, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/45 p-4"
          onClick={() => { if (!busy) onCancel?.(); }}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-desc"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[440px] border-2 border-ink bg-paper text-ink shadow-[6px_6px_0_var(--color-ink)]"
          >
            <div
              className={cn(
                'flex items-center gap-2.5 border-b-2 border-ink px-5 py-3',
                variant === 'destructive' ? 'bg-surface-alert text-destructive' : 'bg-gold text-ink'
              )}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={2.2} />
              <h2 id="confirm-dialog-title" className="font-display text-[16px] font-extrabold tracking-[-0.02em]">
                {title}
              </h2>
            </div>

            <div className="p-5">
              <p id="confirm-dialog-desc" className="text-[14px] leading-relaxed text-ink">
                {description}
              </p>
              {warning && (
                <p className="mt-3 border-2 border-ink bg-surface-quiet px-3 py-2 text-[12px] font-semibold leading-snug text-muted-foreground">
                  {warning}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
                <Button
                  ref={cancelRef}
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={onCancel}
                >
                  {cancelLabel}
                </Button>
                <Button
                  type="button"
                  variant={variant === 'destructive' ? 'destructive' : 'default'}
                  disabled={busy}
                  onClick={onConfirm}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : null}
                  {confirmLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ConfirmDialog;
