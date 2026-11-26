import React from 'react';
import { Users, Video } from 'lucide-react';
import { cn } from '../lib/utils';

export function formatModeLabel(mode) {
  return mode === 'face_to_face' ? 'Face to Face' : 'Online';
}

/**
 * Inline neo-brutalist Navy + Gold SVG: two people seated across a study table.
 * Uses CSS theme tokens so outlines, fills, and hard shadows retain AA contrast
 * in both light and dark modes with zero external image assets.
 */
export function FaceToFaceIllustration({ className }) {
  return (
    <svg
      viewBox="0 0 180 112"
      fill="none"
      role="img"
      aria-label="Two people sitting across a study table for a Face to Face session"
      className={cn('h-24 w-full max-w-[180px]', className)}
    >
      {/* Background plate with hard offset shadow */}
      <rect x="10" y="10" width="164" height="96" fill="var(--color-ink)" />
      <rect x="6" y="6" width="164" height="96" fill="var(--color-surface-highlight)" stroke="var(--color-ink)" strokeWidth="3" />

      {/* Decorative gold accent bar */}
      <rect x="16" y="16" width="38" height="8" fill="var(--color-gold)" stroke="var(--color-ink)" strokeWidth="2.4" />
      <circle cx="154" cy="20" r="5" fill="var(--color-gold)" stroke="var(--color-ink)" strokeWidth="2.4" />

      {/* Left person (student) */}
      <circle cx="48" cy="42" r="11" fill="var(--color-gold)" stroke="var(--color-ink)" strokeWidth="3" />
      <path d="M28 74 C28 59, 68 59, 68 74" fill="var(--color-ink)" stroke="var(--color-ink)" strokeWidth="3" strokeLinejoin="round" />

      {/* Right person (tutor) */}
      <circle cx="128" cy="42" r="11" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="3" />
      <path d="M108 74 C108 59, 148 59, 148 74" fill="var(--color-gold)" stroke="var(--color-ink)" strokeWidth="3" strokeLinejoin="round" />

      {/* Open book / notebook on table */}
      <rect x="75" y="61" width="26" height="11" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2.6" />
      <line x1="88" y1="61" x2="88" y2="72" stroke="var(--color-ink)" strokeWidth="2.4" />

      {/* Study table with hard neo-brutalist slab */}
      <rect x="26" y="75" width="128" height="10" fill="var(--color-ink)" />
      <rect x="22" y="72" width="128" height="10" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="3" />
      <rect x="34" y="82" width="8" height="16" fill="var(--color-ink)" />
      <rect x="130" y="82" width="8" height="16" fill="var(--color-ink)" />
    </svg>
  );
}

/**
 * Inline neo-brutalist Navy + Gold SVG: laptop displaying a live video call window.
 */
export function OnlineIllustration({ className }) {
  return (
    <svg
      viewBox="0 0 180 112"
      fill="none"
      role="img"
      aria-label="Laptop showing a live Online video tutoring call window"
      className={cn('h-24 w-full max-w-[180px]', className)}
    >
      {/* Background plate with hard offset shadow */}
      <rect x="10" y="10" width="164" height="96" fill="var(--color-ink)" />
      <rect x="6" y="6" width="164" height="96" fill="var(--color-surface-highlight)" stroke="var(--color-ink)" strokeWidth="3" />

      {/* Laptop screen shadow + frame */}
      <rect x="34" y="20" width="116" height="62" fill="var(--color-ink)" />
      <rect x="30" y="16" width="116" height="62" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="3" />

      {/* Video call top bar */}
      <rect x="30" y="16" width="116" height="14" fill="var(--color-ink)" />
      <circle cx="39" cy="23" r="2.6" fill="var(--color-gold)" />
      <circle cx="48" cy="23" r="2.6" fill="var(--color-paper)" />
      <rect x="114" y="19.5" width="24" height="7" fill="var(--color-gold)" />

      {/* Left video tile (tutor) */}
      <rect x="38" y="36" width="46" height="34" fill="var(--color-gold)" stroke="var(--color-ink)" strokeWidth="2.6" />
      <circle cx="61" cy="48" r="6.5" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2.4" />
      <path d="M49 69 C49 60, 73 60, 73 69" fill="var(--color-ink)" />

      {/* Right video tile (student) */}
      <rect x="92" y="36" width="46" height="34" fill="var(--color-surface-quiet)" stroke="var(--color-ink)" strokeWidth="2.6" />
      <circle cx="115" cy="48" r="6.5" fill="var(--color-gold)" stroke="var(--color-ink)" strokeWidth="2.4" />
      <path d="M103 69 C103 60, 127 60, 127 69" fill="var(--color-ink)" />

      {/* Laptop base */}
      <polygon
        points="20,78 156,78 164,90 12,90"
        fill="var(--color-gold)"
        stroke="var(--color-ink)"
        strokeWidth="3"
        strokeLinejoin="miter"
      />
      <rect x="74" y="82" width="28" height="4" fill="var(--color-ink)" />
    </svg>
  );
}

/** Consistent session mode pill across inbox, cards, modals, check-in, and summary. */
export function SessionModeBadge({ mode = 'online', compact = false, className }) {
  const isF2F = mode === 'face_to_face';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border-2 border-ink font-extrabold uppercase tracking-[0.06em]',
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]',
        isF2F
          ? 'bg-gold text-ink shadow-[2px_2px_0_var(--color-ink)]'
          : 'bg-paper text-ink shadow-[2px_2px_0_var(--color-ink)]',
        className,
      )}
    >
      {isF2F ? (
        <Users className={compact ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0'} strokeWidth={2.4} aria-hidden="true" />
      ) : (
        <Video className={compact ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0'} strokeWidth={2.4} aria-hidden="true" />
      )}
      <span>{isF2F ? 'Face to Face' : 'Online'}</span>
    </span>
  );
}
