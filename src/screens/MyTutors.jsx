import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  BookOpen,
  Calendar,
  ChevronRight,
  Search,
  Loader2,
  AlertCircle,
  ExternalLink,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import Avatar from '../components/ui/Avatar';
import { cn } from '../lib/utils';
import api from '../api';

function fmtDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function MyTutors({ showToast }) {
  const navigate = useNavigate();
  const [tutors, setTutors] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTutors = () => {
    setLoading(true);
    setError(null);
    api.get('/learners/my-tutors')
      .then((data) => {
        setTutors(data.tutors || []);
      })
      .catch((err) => {
        setError(err.message || 'Could not load your tutors list');
        showToast?.(err.message || 'Could not load your tutors list', 'error');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTutors();
  }, []);

  const handleBookAgain = (tutor) => {
    if (!tutor.is_accredited || tutor.tutor_role !== 'tutor') {
      showToast?.('This tutor is no longer accredited for new bookings.', 'error');
      return;
    }
    if (!tutor.is_available) {
      showToast?.('This tutor is currently not accepting new session bookings.', 'error');
      return;
    }

    const prefilledTutor = {
      id: tutor.tutor_id,
      name: tutor.tutor_name,
      avatar: tutor.avatar,
      program: tutor.tutor_program,
      subjects: tutor.subjects?.length
        ? tutor.subjects
        : [{ code: tutor.last_subject_code, name: tutor.last_subject_name }],
    };

    navigate('/wizard', { state: { prefilledTutor } });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="section-head">
        <div>
          <h1 className="section-title">My Tutors</h1>
          <p className="section-subtitle">
            Tutors you have completed peer tutoring sessions with. Book them again anytime.
          </p>
        </div>
        <div className="shrink-0">
          <Button
            onClick={() => navigate('/wizard')}
            className="min-h-[44px]"
          >
            <Search className="mr-2 h-4 w-4" strokeWidth={2.2} />
            Find more tutors
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="panel flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-ink" strokeWidth={2.2} />
          <p className="mt-3 font-display text-[15px] font-bold">Loading your tutors...</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="border-2 border-crimson bg-crimson/10 p-6 text-ink shadow-[3px_3px_0_var(--color-ink)]">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-crimson" />
            <div>
              <p className="font-bold text-crimson">Failed to load tutors</p>
              <p className="mt-1 text-[13px]">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTutors}
                className="mt-3 min-h-[44px]"
              >
                Try again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && tutors && tutors.length === 0 && (
        <div className="panel flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="grid h-16 w-16 place-items-center border-2 border-ink bg-gold text-ink shadow-[3px_3px_0_var(--color-ink)]">
            <Users className="h-8 w-8" strokeWidth={2.2} />
          </span>
          <h2 className="mt-5 font-display text-[20px] font-bold tracking-[-0.02em] text-ink">
            No completed tutoring sessions yet
          </h2>
          <p className="mt-2 max-w-[46ch] text-[14px] text-muted-foreground">
            Once you complete peer tutoring sessions with accredited tutors, they will be saved here so you can easily book them again.
          </p>
          <div className="mt-6">
            <Button
              onClick={() => navigate('/wizard')}
              className="min-h-[44px]"
            >
              <Search className="mr-2 h-4 w-4" strokeWidth={2.2} />
              Find a tutor now
            </Button>
          </div>
        </div>
      )}

      {/* Tutors Grid */}
      {!loading && !error && tutors && tutors.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {tutors.map((tutor) => {
            const isAccredited = tutor.is_accredited && tutor.tutor_role === 'tutor';
            const isAvailable = Boolean(tutor.is_available);
            const canBook = isAccredited && isAvailable;

            let disableReason = null;
            if (!isAccredited) {
              disableReason = 'Tutor is no longer accredited';
            } else if (!isAvailable) {
              disableReason = 'Tutor is currently unavailable';
            }

            return (
              <div
                key={tutor.tutor_id}
                className="panel flex flex-col justify-between overflow-hidden p-5 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--color-ink)]"
              >
                <div>
                  {/* Tutor header */}
                  <div className="flex items-start gap-3.5">
                    <button
                      type="button"
                      onClick={() => navigate(`/profile/${tutor.tutor_custom_id || tutor.tutor_id}`)}
                      className="shrink-0 transition-transform hover:scale-105"
                      title={`View ${tutor.tutor_name}'s public profile`}
                    >
                      <Avatar
                        name={tutor.tutor_name}
                        avatarUrl={tutor.avatar}
                        size="xl"
                        className="shadow-[2px_2px_0_var(--color-ink)]"
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/profile/${tutor.tutor_custom_id || tutor.tutor_id}`)}
                        className="truncate text-left font-display text-[16px] font-bold leading-tight text-ink underline decoration-gold decoration-2 underline-offset-4 hover:decoration-ink"
                      >
                        {tutor.tutor_name}
                      </button>
                      <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                        {tutor.tutor_program || 'Accredited Peer Tutor'}
                      </p>
                      <div className="mt-2 inline-flex items-center gap-1.5 border border-ink bg-surface-highlight px-2 py-0.5 text-[11px] font-bold text-ink">
                        <Sparkles className="h-3 w-3 text-gold" strokeWidth={2.4} />
                        <span>
                          {tutor.total_sessions} completed session{tutor.total_sessions === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tutor session details */}
                  <div className="mt-4 space-y-2 border-t border-ink/15 pt-3 text-[13px]">
                    <div className="flex items-center gap-2 text-ink">
                      <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                      <span className="truncate">
                        <strong className="font-semibold">Last subject:</strong>{' '}
                        {tutor.last_subject_code
                          ? `${tutor.last_subject_code} · ${tutor.last_subject_name}`
                          : tutor.last_subject_name || 'General tutoring'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-ink">
                      <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                      <span>
                        <strong className="font-semibold">Last session:</strong>{' '}
                        {fmtDate(tutor.last_session_date)}
                      </span>
                    </div>
                  </div>

                  {/* Disable Notice if unavailable or unaccredited */}
                  {disableReason && (
                    <div className="mt-3.5 border border-ink/30 bg-stone px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground">
                      ⚠️ {disableReason}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-5 grid grid-cols-2 gap-2.5 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/profile/${tutor.tutor_custom_id || tutor.tutor_id}`)}
                    className="min-h-[44px] w-full text-[13px]"
                  >
                    View profile
                  </Button>
                  <Button
                    onClick={() => handleBookAgain(tutor)}
                    disabled={!canBook}
                    className="min-h-[44px] w-full text-[13px]"
                    title={disableReason || 'Book another session with this tutor'}
                  >
                    Book again
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

