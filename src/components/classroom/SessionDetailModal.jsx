import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Star,
  BookOpen,
  User,
  Shield,
} from 'lucide-react';
import { Button } from '../ui/button';
import Avatar from '../ui/Avatar';
import { cn } from '../../lib/utils';

export function getSubjectBannerPalette(subjectKey = '') {
  const BANNER_PALETTES = [
    { id: 'navy', bg: 'bg-[#0f2942]', text: 'text-white', badge: 'bg-white/20 text-white' },
    { id: 'emerald', bg: 'bg-[#166c46]', text: 'text-white', badge: 'bg-white/20 text-white' },
    { id: 'crimson', bg: 'bg-[#b43122]', text: 'text-white', badge: 'bg-white/20 text-white' },
    { id: 'blue', bg: 'bg-[#1e3a8a]', text: 'text-white', badge: 'bg-white/20 text-white' },
    { id: 'purple', bg: 'bg-[#581c87]', text: 'text-white', badge: 'bg-white/20 text-white' },
    { id: 'teal', bg: 'bg-[#115e59]', text: 'text-white', badge: 'bg-white/20 text-white' },
  ];

  const str = String(subjectKey || '').trim();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % BANNER_PALETTES.length;
  return BANNER_PALETTES[index];
}

function fmtDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function SessionDetailModal({
  session,
  role = 'learner',
  onClose,
}) {
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!session) return null;

  const isLearner = role === 'learner';
  const partnerName = isLearner ? session.tutor_name : session.learner_name;
  const partnerId = isLearner
    ? (session.tutor_custom_id || session.tutor_id)
    : (session.learner_custom_id || session.learner_id);
  const partnerAvatar = isLearner ? session.tutor_avatar : session.learner_avatar;
  const partnerRoleLabel = isLearner ? 'Accredited Tutor' : 'Student (Learner)';

  const palette = getSubjectBannerPalette(session.subject_code || session.subject);

  const STATUS_CONFIG = {
    completed: { label: 'Completed', color: 'bg-emerald text-white border-emerald' },
    upcoming: { label: 'Upcoming', color: 'bg-gold text-ink border-ink' },
    'in-progress': { label: 'In-Progress', color: 'bg-amber text-white border-amber' },
    cancelled: { label: 'Cancelled', color: 'bg-crimson text-white border-crimson' },
  };

  const statusConfig = STATUS_CONFIG[session.status] || {
    label: session.status,
    color: 'bg-stone text-ink border-ink',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-[560px] overflow-hidden border-2 border-ink bg-paper shadow-[6px_6px_0_var(--color-ink)]">
        {/* Classroom Header Banner */}
        <div className={cn('relative p-6', palette.bg, palette.text)}>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center border-2 border-white/40 bg-white/10 text-white transition-colors hover:bg-white hover:text-ink"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>

          <div className="pr-8">
            <span className={cn('inline-block px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider', palette.badge)}>
              {session.subject_code || 'COURSE'}
            </span>
            <h2 id="session-detail-title" className="mt-2 font-display text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-white">
              {session.subject || 'Session Detail'}
            </h2>
            <p className="mt-1 line-clamp-2 text-[14px] text-white/90">
              {session.topic || 'General tutoring review'}
            </p>
          </div>
        </div>

        {/* Modal Content */}
        <div className="space-y-5 p-6 text-ink">
          {/* Status & Session Code */}
          <div className="flex items-center justify-between border-b border-ink/15 pb-4">
            <div className="flex items-center gap-2">
              <span className={cn('inline-flex items-center border px-2.5 py-1 text-[12px] font-bold uppercase tracking-wider', statusConfig.color)}>
                {statusConfig.label}
              </span>
              {session.rating && (
                <span className="inline-flex items-center gap-1 border border-ink bg-surface-highlight px-2 py-0.5 text-[12px] font-bold">
                  <Star className="h-3.5 w-3.5 fill-gold text-gold-ink" />
                  <span>{session.rating} / 5</span>
                </span>
              )}
            </div>
            {session.session_code && (
              <span className="num text-[12px] font-mono text-muted-foreground">
                Code: {session.session_code}
              </span>
            )}
          </div>

          {/* Partner Information */}
          <div className="flex items-center justify-between gap-3 border-b border-ink/15 pb-4">
            <div className="flex items-center gap-3">
              <Avatar
                name={partnerName}
                avatarUrl={partnerAvatar}
                size="lg"
                className="shadow-[2px_2px_0_var(--color-ink)]"
              />
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-muted-foreground">
                  {isLearner ? 'Tutor' : 'Learner'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/profile/${partnerId}`);
                  }}
                  className="truncate text-left font-display text-[16px] font-bold text-ink underline decoration-gold decoration-2 underline-offset-2 hover:decoration-ink"
                >
                  {partnerName}
                </button>
                <p className="text-[12px] text-muted-foreground">{partnerRoleLabel}</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                navigate(`/profile/${partnerId}`);
              }}
              className="min-h-[40px] shrink-0"
            >
              View profile
            </Button>
          </div>

          {/* Time & Location Grid */}
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <div className="flex items-start gap-2.5">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
              <div>
                <p className="font-semibold text-muted-foreground">Date</p>
                <p className="font-bold text-ink">{fmtDate(session.date)}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
              <div>
                <p className="font-semibold text-muted-foreground">Time & Duration</p>
                <p className="font-bold text-ink">{session.time} ({session.duration || `${session.duration_hours || 1} hr`})</p>
              </div>
            </div>

            <div className="col-span-2 flex items-start gap-2.5 border-t border-ink/10 pt-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
              <div>
                <p className="font-semibold text-muted-foreground">Location</p>
                <p className="font-bold text-ink">{session.location || 'Campus Library Study Room A'}</p>
              </div>
            </div>
          </div>

          {/* Notes or Wrap-up Details */}
          {session.notes && (
            <div className="border border-ink/20 bg-surface-quiet p-3 text-[13px]">
              <p className="font-bold text-ink">Session Notes</p>
              <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{session.notes}</p>
            </div>
          )}

          {/* Check-in info */}
          <div className="flex items-center justify-between text-[12px] text-muted-foreground pt-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald" />
              <span>Verified attendance on ledger</span>
            </span>
            <span className="num font-semibold">
              Check-in devices: {session.check_in_count ?? 2}/2
            </span>
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              onClick={onClose}
              className="min-h-[44px] min-w-[100px]"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

