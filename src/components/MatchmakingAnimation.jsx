import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, Star, ArrowLeft, RefreshCw, AlertCircle, ExternalLink, UserX } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar } from './ui/Avatar';
import { cn } from '../lib/utils';
import api from '../api';

const STATUS_MESSAGES = [
  'Checking accredited tutor rosters…',
  'Matching course requirements and schedule…',
  'Verifying peer availability…',
  'Finalizing best tutor matches…',
];

const SEARCH_TIMEOUT_MS = 10000;
const MIN_SEARCH_MS = 800;

export default function MatchmakingAnimation({
  course = '',
  availability = '',
  goal = '',
  onCancel,
  onRequestSession,
  requestingId = null,
  navigate,
  initialMock = null,
}) {
  const [state, setState] = useState('searching'); // 'searching' | 'matched' | 'no-match' | 'timeout' | 'cancelled'
  const [statusIndex, setStatusIndex] = useState(0);
  const [matches, setMatches] = useState([]);
  const [mockMode, setMockMode] = useState(initialMock); // null | 'instant' | '3s' | 'timeout' | 'no-match'

  const abortRef = useRef(null);
  const timersRef = useRef([]);

  const clearAllTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const addTimer = (fn, delay) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  };

  const runSearch = (selectedMock = mockMode) => {
    clearAllTimers();
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setState('searching');
    setStatusIndex(0);

    // Status rotation timers
    addTimer(() => setStatusIndex(1), 1400);
    addTimer(() => setStatusIndex(2), 2800);
    addTimer(() => setStatusIndex(3), 4200);

    const startTime = Date.now();

    // Mock mode paths
    if (selectedMock === 'instant') {
      api.get('/tutors', { available: '1' })
        .then(({ tutors }) => {
          if (controller.signal.aborted) return;
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, MIN_SEARCH_MS - elapsed);
          addTimer(() => {
            if (controller.signal.aborted) return;
            const valid = (tutors || []).slice(0, 3);
            setMatches(valid);
            setState(valid.length > 0 ? 'matched' : 'no-match');
          }, remaining);
        })
        .catch((e) => {
          if (controller.signal.aborted) return;
          setState('no-match');
        });
      return;
    }

    if (selectedMock === '3s') {
      api.get('/tutors', { available: '1' })
        .then(({ tutors }) => {
          if (controller.signal.aborted) return;
          addTimer(() => {
            if (controller.signal.aborted) return;
            const valid = (tutors || []).slice(0, 3);
            setMatches(valid);
            setState(valid.length > 0 ? 'matched' : 'no-match');
          }, 3000);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setState('no-match');
        });
      return;
    }

    if (selectedMock === 'timeout') {
      addTimer(() => {
        if (controller.signal.aborted) return;
        setState('timeout');
      }, 2500);
      return;
    }

    if (selectedMock === 'no-match') {
      addTimer(() => {
        if (controller.signal.aborted) return;
        setMatches([]);
        setState('no-match');
      }, 900);
      return;
    }

    // Real API Search with Timeout & Min duration guard
    const timeoutTimer = addTimer(() => {
      controller.abort();
      setState('timeout');
    }, SEARCH_TIMEOUT_MS);

    const queryParams = { available: '1' };
    if (course && course !== 'Any') {
      queryParams.subject = course;
    }

    api.get('/tutors', queryParams)
      .then(({ tutors }) => {
        if (controller.signal.aborted) return;
        clearTimeout(timeoutTimer);

        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, MIN_SEARCH_MS - elapsed);

        addTimer(() => {
          if (controller.signal.aborted) return;
          const list = tutors || [];
          setMatches(list);
          setState(list.length > 0 ? 'matched' : 'no-match');
        }, remaining);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        clearTimeout(timeoutTimer);
        setState('timeout');
      });
  };

  useEffect(() => {
    runSearch(mockMode);
    return () => {
      clearAllTimers();
      if (abortRef.current) abortRef.current.abort();
    };
  }, [course, availability, mockMode]);

  const handleCancel = () => {
    clearAllTimers();
    if (abortRef.current) abortRef.current.abort();
    setState('cancelled');
    if (onCancel) onCancel();
  };

  const currentStatusText = STATUS_MESSAGES[statusIndex] || STATUS_MESSAGES[0];

  return (
    <div className="mx-auto w-full max-w-[760px] min-h-[440px] flex flex-col justify-between">
      {/* Screen reader live region for accessibility */}
      <div role="status" aria-live="polite" className="sr-only">
        {state === 'searching' && currentStatusText}
        {state === 'matched' && `Found ${matches.length} matching tutor(s). Best match: ${matches[0]?.name}`}
        {state === 'no-match' && 'No accredited tutors matched your search criteria.'}
        {state === 'timeout' && 'Matching search timed out. Tutors may be unreachable.'}
        {state === 'cancelled' && 'Search was cancelled.'}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {/* ─── State 1: Searching ─────────────────────────────────── */}
        {state === 'searching' && (
          <div className="panel border-2 border-ink bg-paper p-8 text-center shadow-[4px_4px_0_var(--color-ink)]" aria-busy="true">
            {/* Calm Looping Orbit + Pulse Visual (Transform & Opacity Only) */}
            <div className="relative mx-auto my-6 flex h-44 w-44 items-center justify-center">
              {/* Outer soft expanding ripple */}
              <div className="absolute inset-0 rounded-full border-2 border-gold mm-ripple pointer-events-none" />

              {/* Orbiting dashed track */}
              <div className="absolute inset-3 rounded-full border-2 border-dashed border-ink/40 mm-orbit">
                {/* Orbiting satellite dot */}
                <span className="absolute -top-2 left-1/2 -ml-2 h-4 w-4 rounded-full border-2 border-ink bg-gold shadow-[1px_1px_0_var(--color-ink)]" />
              </div>

              {/* Central pulsing core badge */}
              <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-2 border-ink bg-surface-highlight shadow-[3px_3px_0_var(--color-ink)] mm-pulse">
                <Sparkles className="h-8 w-8 text-ink" strokeWidth={2.2} />
              </div>
            </div>

            <h2 className="font-display text-[22px] font-extrabold tracking-[-0.03em] text-ink">
              Searching for your tutor match…
            </h2>

            <p className="mt-2 text-[14px] font-medium text-muted-foreground min-h-[22px]">
              {currentStatusText}
            </p>

            {course && course !== 'Any' && (
              <p className="mt-1 text-[12px] text-muted-foreground">
                Subject filter: <strong className="text-ink">{course}</strong>
              </p>
            )}

            <div className="mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="min-h-[44px] px-6 text-[13px] font-bold"
              >
                Cancel search
              </Button>
            </div>
          </div>
        )}

        {/* ─── State 2: Matched ───────────────────────────────────── */}
        {state === 'matched' && matches.length > 0 && (() => {
          const topTutor = matches[0];
          return (
            <div className="space-y-4 mm-ease-in">
              <div className="border-b-2 border-ink bg-surface-quiet px-5 py-3 flex items-center justify-between border-2 shadow-[3px_3px_0_var(--color-ink)]">
                <div>
                  <span className="inline-block border border-ink bg-gold px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-ink">
                    Match Found
                  </span>
                  <h2 className="mt-0.5 font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                    We found {matches.length === 1 ? 'your ideal tutor' : `${matches.length} matching tutors`}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => runSearch()}
                  className="flex items-center gap-1 text-[12px]"
                  title="Search again"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Re-check
                </Button>
              </div>

              {/* Primary Top Match Card */}
              <div className="panel border-2 border-gold bg-card p-5 shadow-[4px_4px_0_var(--color-ink)] transition-transform hover:-translate-y-0.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <button
                      type="button"
                      onClick={() => navigate(`/tutors/${topTutor.custom_id || topTutor.id}`)}
                      className="shrink-0 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
                      title={`View ${topTutor.name}'s public profile`}
                    >
                      <Avatar name={topTutor.name} src={topTutor.avatar} size="lg" />
                    </button>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/tutors/${topTutor.custom_id || topTutor.id}`)}
                          className="font-display text-left text-[17px] font-extrabold text-ink underline decoration-gold decoration-2 underline-offset-2 hover:decoration-ink"
                        >
                          {topTutor.name}
                        </button>
                        <span className="border border-ink bg-surface-highlight px-1.5 py-0.2 text-[11px] font-bold text-ink">
                          Verified
                        </span>
                      </div>

                      <p className="text-[13px] text-muted-foreground mt-0.5">
                        {topTutor.program || topTutor.department || 'Accredited Tutor'}
                      </p>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 text-ink font-semibold">
                          <Star className="h-3.5 w-3.5 fill-gold text-gold" strokeWidth={1.6} />
                          <span className="num">{topTutor.stats?.rating ?? '5.0'}</span>
                        </span>
                        <span>
                          <strong className="num text-ink">{topTutor.stats?.sessions ?? 0}</strong> sessions
                        </span>
                        {Array.isArray(topTutor.subjects) && topTutor.subjects.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {topTutor.subjects.map((s) => (
                              <span key={s.code || s} className="border border-ink/40 bg-surface-quiet px-1 text-[11px] font-bold text-ink">
                                {s.code || s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                    <Button
                      size="sm"
                      disabled={requestingId === topTutor.id}
                      onClick={() => onRequestSession(topTutor)}
                      className="min-h-[44px] px-4 font-bold shadow-[2px_2px_0_var(--color-ink)]"
                    >
                      {requestingId === topTutor.id ? 'Requesting…' : 'Request session'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/tutors/${topTutor.custom_id || topTutor.id}`)}
                      className="text-[12px] text-muted-foreground hover:text-ink"
                    >
                      View profile →
                    </Button>
                  </div>
                </div>
              </div>

              {/* Secondary matches list (if multiple tutors) */}
              {matches.length > 1 && (
                <div className="border-t-2 border-line/60 pt-3">
                  <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Also available ({matches.length - 1} other peer{matches.length > 2 ? 's' : ''})
                  </p>
                  <div className="space-y-2">
                    {matches.slice(1).map((tutor) => (
                      <div
                        key={tutor.id}
                        className="flex items-center justify-between gap-3 border-2 border-ink bg-paper p-3 shadow-[2px_2px_0_var(--color-ink)]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={tutor.name} src={tutor.avatar} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-bold text-ink">
                              {tutor.name}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {tutor.program} · <span className="num">{tutor.stats?.rating ?? '5.0'}</span> ★
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={requestingId === tutor.id}
                          onClick={() => onRequestSession(tutor)}
                          className="min-h-[36px] text-[12px] font-bold"
                        >
                          {requestingId === tutor.id ? 'Requesting…' : 'Request'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ─── State 3: No Match ──────────────────────────────────── */}
        {state === 'no-match' && (
          <div className="panel border-2 border-ink bg-paper p-8 text-center shadow-[4px_4px_0_var(--color-ink)] mm-ease-in">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-surface-quiet shadow-[2px_2px_0_var(--color-ink)]">
              <UserX className="h-7 w-7 text-ink" />
            </div>

            <h2 className="mt-4 font-display text-[20px] font-extrabold tracking-[-0.03em] text-ink">
              No tutor matched this criteria
            </h2>

            <p className="mt-1 text-[14px] text-muted-foreground max-w-[46ch] mx-auto">
              No accredited tutors are currently available for{' '}
              {course && course !== 'Any' ? <strong>{course}</strong> : 'the selected subject'} during your preferred window.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                className="min-h-[44px] font-bold"
                onClick={onCancel}
              >
                <ArrowLeft className="h-4 w-4" /> Adjust search criteria
              </Button>
              <Button
                className="min-h-[44px] font-bold"
                onClick={() => {
                  setMockMode(null);
                  runSearch(null);
                }}
              >
                <RefreshCw className="h-4 w-4" /> Search all available
              </Button>
            </div>
          </div>
        )}

        {/* ─── State 4: Timeout ───────────────────────────────────── */}
        {state === 'timeout' && (
          <div className="panel border-2 border-ink bg-surface-quiet p-8 text-center shadow-[4px_4px_0_var(--color-ink)] mm-ease-in">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-surface-alert shadow-[2px_2px_0_var(--color-ink)]">
              <AlertCircle className="h-7 w-7 text-crimson" />
            </div>

            <h2 className="mt-4 font-display text-[20px] font-extrabold tracking-[-0.03em] text-ink">
              Matching timed out
            </h2>

            <p className="mt-1 text-[14px] text-muted-foreground max-w-[46ch] mx-auto">
              The tutor network took longer than expected to respond. Please try again or adjust your criteria.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                className="min-h-[44px] font-bold"
                onClick={() => {
                  setMockMode(null);
                  runSearch(null);
                }}
              >
                <RefreshCw className="h-4 w-4" /> Try again
              </Button>
              <Button
                variant="outline"
                className="min-h-[44px] font-bold"
                onClick={onCancel}
              >
                <ArrowLeft className="h-4 w-4" /> Go back
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Discrete Test Switcher for Verification & Demo ───────── */}
      <div className="mt-8 pt-3 border-t border-line/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider text-ink/70">
          Matcher Test Modes:
        </span>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Mock matching delays and outcomes">
          {[
            { id: null, label: 'Live' },
            { id: 'instant', label: 'Instant (800ms)' },
            { id: '3s', label: '3s Delay' },
            { id: 'timeout', label: 'Timeout' },
            { id: 'no-match', label: 'No Match' },
          ].map(({ id, label }) => {
            const isActive = mockMode === id;
            return (
              <button
                key={String(id)}
                type="button"
                onClick={() => {
                  setMockMode(id);
                  runSearch(id);
                }}
                className={cn(
                  'border border-ink px-2 py-0.5 font-bold transition-colors',
                  isActive
                    ? 'bg-gold text-ink shadow-[1px_1px_0_var(--color-ink)]'
                    : 'bg-paper text-muted-foreground hover:bg-surface-highlight hover:text-ink'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
