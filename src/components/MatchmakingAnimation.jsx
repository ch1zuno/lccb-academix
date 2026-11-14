import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Star,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  UserX,
  Award,
  PhoneCall,
  Mail,
  MapPin,
  Building2,
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar } from './ui/Avatar';
import { cn } from '../lib/utils';
import {
  TUTORS as MOCK_TUTORS,
  FACULTY_SPECIALISTS as MOCK_FACULTY,
  getAvailableTutorsForSubject,
} from '../data';
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
  // 'searching' | 'matched' | 'no-match' | 'faculty-searching' | 'faculty-matched' | 'no-faculty-match' | 'timeout' | 'cancelled'
  const [state, setState] = useState('searching');
  const [statusIndex, setStatusIndex] = useState(0);
  const [matches, setMatches] = useState([]);
  const [selectedTutorId, setSelectedTutorId] = useState(null);
  const [facultyMatches, setFacultyMatches] = useState([]);
  const [mockMode, setMockMode] = useState(initialMock);

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

  const runFacultySearch = (selectedMock = mockMode) => {
    clearAllTimers();
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setState('faculty-searching');
    const startTime = Date.now();

    if (selectedMock === 'no-faculty') {
      addTimer(() => {
        if (controller.signal.aborted) return;
        setFacultyMatches([]);
        setState('no-faculty-match');
      }, 750);
      return;
    }

    const queryParams = { role: 'faculty', available: '1' };
    if (course && course !== 'Any' && selectedMock !== 'faculty-match') {
      queryParams.subject = course;
    }

    api.get('/tutors', queryParams)
      .then(({ tutors }) => {
        if (controller.signal.aborted) return;
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 650 - elapsed);
        addTimer(() => {
          if (controller.signal.aborted) return;
          const list = tutors || [];
          setFacultyMatches(list);
          setState(list.length > 0 ? 'faculty-matched' : 'no-faculty-match');
        }, remaining);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        const fallbackFaculty = getAvailableTutorsForSubject(MOCK_FACULTY, course);
        setFacultyMatches(fallbackFaculty);
        setState(fallbackFaculty.length > 0 ? 'faculty-matched' : 'no-faculty-match');
      });
  };

  const runSearch = (selectedMock = mockMode, overrideCourse = course) => {
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
      }, 750);
      return;
    }

    if (selectedMock === 'faculty-match') {
      runFacultySearch('faculty-match');
      return;
    }

    if (selectedMock === 'no-faculty') {
      runFacultySearch('no-faculty');
      return;
    }

    // Real API Search with Timeout & Min duration guard
    const timeoutTimer = addTimer(() => {
      controller.abort();
      setState('timeout');
    }, SEARCH_TIMEOUT_MS);

    const queryParams = { available: '1' };
    if (overrideCourse && overrideCourse !== 'Any') {
      queryParams.subject = overrideCourse;
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
          setSelectedTutorId(list[0]?.id || list[0]?.custom_id || null);
          setState(list.length > 0 ? 'matched' : 'no-match');
        }, remaining);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        clearTimeout(timeoutTimer);
        const fallback = overrideCourse && overrideCourse !== 'Any'
          ? getAvailableTutorsForSubject(MOCK_TUTORS, overrideCourse)
          : MOCK_TUTORS.filter((t) => t.is_available);
        setMatches(fallback);
        setSelectedTutorId(fallback[0]?.id || fallback[0]?.custom_id || null);
        setState(fallback.length > 0 ? 'matched' : 'no-match');
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
  const subjectLabel = course && course !== 'Any' ? course : 'your selected subject';

  return (
    <div className="mx-auto w-full max-w-[760px] min-h-[440px] flex flex-col justify-between">
      {/* Screen reader live region for accessibility */}
      <div role="status" aria-live="polite" className="sr-only">
        {state === 'searching' && currentStatusText}
        {state === 'matched' && `Found ${matches.length} matching tutor(s). Best match: ${matches[0]?.name}`}
        {state === 'no-match' && `No accredited peer tutors matched ${subjectLabel}. You can match with a Faculty Subject Specialist.`}
        {state === 'faculty-searching' && `Searching LCCB Faculty Specialists for ${subjectLabel}…`}
        {state === 'faculty-matched' && `Found ${facultyMatches.length} Faculty Specialist(s) for ${subjectLabel}.`}
        {state === 'no-faculty-match' && `No Faculty Specialist found for ${subjectLabel}. Contact La Consolacion College Bacolod at (034) 434-9661 to 64 for assistance.`}
        {state === 'timeout' && 'Matching search timed out. Tutors may be unreachable.'}
        {state === 'cancelled' && 'Search was cancelled.'}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {/* ─── State 1: Searching Peer Tutors ─────────────────────── */}
        {state === 'searching' && (
          <div className="panel border-2 border-ink bg-paper p-8 text-center shadow-[4px_4px_0_var(--color-ink)]" aria-busy="true">
            <div className="relative mx-auto my-6 flex h-44 w-44 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-gold mm-ripple pointer-events-none" />
              <div className="absolute inset-3 rounded-full border-2 border-dashed border-ink/40 mm-orbit">
                <span className="absolute -top-2 left-1/2 -ml-2 h-4 w-4 rounded-full border-2 border-ink bg-gold shadow-[1px_1px_0_var(--color-ink)]" />
              </div>
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

        {/* ─── State 2: Matched Peer Tutors ───────────────────────── */}
        {state === 'matched' && matches.length > 0 && (() => {
          const topTutor =
            matches.find((t) => (t.id || t.custom_id) === selectedTutorId) || matches[0];
          const otherTutors = matches.filter((t) => (t.id || t.custom_id) !== (topTutor.id || topTutor.custom_id));
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

              {/* Primary Selected Tutor Match Card */}
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
                          Selected Tutor
                        </span>
                      </div>

                      <p className="text-[13px] text-muted-foreground mt-0.5">
                        {topTutor.specialization || topTutor.program || topTutor.department || 'Accredited Tutor'}
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
                      className="min-h-[44px] px-5 font-extrabold shadow-[2px_2px_0_var(--color-ink)]"
                    >
                      {requestingId === topTutor.id ? 'Opening…' : 'Book'}
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

              {/* Secondary matches list (tap a tutor to select them, or tap Book directly) */}
              {otherTutors.length > 0 && (
                <div className="border-t-2 border-line/60 pt-3">
                  <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Also available — tap a tutor to select or Book ({otherTutors.length} other peer{otherTutors.length > 1 ? 's' : ''})
                  </p>
                  <div className="space-y-2">
                    {otherTutors.map((tutor) => (
                      <div
                        key={tutor.id || tutor.custom_id}
                        onClick={() => setSelectedTutorId(tutor.id || tutor.custom_id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedTutorId(tutor.id || tutor.custom_id);
                          }
                        }}
                        className="flex cursor-pointer items-center justify-between gap-3 border-2 border-ink bg-paper p-3 shadow-[2px_2px_0_var(--color-ink)] hover:bg-surface-highlight"
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
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestSession(tutor);
                          }}
                          className="min-h-[36px] px-4 text-[12px] font-extrabold"
                        >
                          {requestingId === tutor.id ? 'Opening…' : 'Book'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ─── State 3: No Peer Match → Faculty Specialist Choice ─── */}
        {state === 'no-match' && (
          <div className="panel border-2 border-ink bg-paper p-6 sm:p-8 text-center shadow-[4px_4px_0_var(--color-ink)] mm-ease-in">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-surface-quiet shadow-[2px_2px_0_var(--color-ink)]">
              <UserX className="h-7 w-7 text-ink" />
            </div>

            <h2 className="mt-4 font-display text-[20px] font-extrabold tracking-[-0.03em] text-ink">
              No available peer tutor for {subjectLabel}
            </h2>

            <p className="mt-1 text-[14px] text-muted-foreground max-w-[50ch] mx-auto">
              No student peer tutors are currently available for{' '}
              <strong className="text-ink">{subjectLabel}</strong> during your preferred window.
            </p>

            {/* Faculty Specialist Choice Box */}
            <div className="mt-6 border-2 border-ink bg-surface-highlight p-5 text-left shadow-[3px_3px_0_var(--color-ink)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 border-2 border-ink bg-ink px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-gold shadow-[2px_2px_0_var(--color-gold)]">
                  <Award className="h-3.5 w-3.5 text-gold" strokeWidth={2.4} />
                  Faculty Specialist Option
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink/70">
                  Direct Department Mentorship
                </span>
              </div>

              <h3 className="mt-3 font-display text-[17px] font-extrabold text-ink">
                Would you like a session with a Faculty Subject Specialist?
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-ink/80">
                When peer tutors are unavailable, you can choose to match with an LCCB faculty member who specializes in{' '}
                <strong>{subjectLabel}</strong> for direct academic consultation.
              </p>

              <div className="mt-4">
                <Button
                  onClick={() => runFacultySearch(null)}
                  className="min-h-[44px] w-full sm:w-auto gap-2 border-2 border-ink bg-gold px-5 font-extrabold text-ink shadow-[3px_3px_0_var(--color-ink)] hover:bg-gold/90"
                >
                  <Award className="h-4 w-4 text-ink" strokeWidth={2.4} />
                  Match with a Faculty Specialist {course && course !== 'Any' ? `for ${course}` : ''}
                </Button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                className="min-h-[44px] font-bold"
                onClick={onCancel}
              >
                <ArrowLeft className="h-4 w-4" /> Adjust search criteria
              </Button>
              <Button
                variant="ghost"
                className="min-h-[44px] font-bold"
                onClick={() => {
                  setMockMode(null);
                  runSearch(null, 'Any');
                }}
              >
                <RefreshCw className="h-4 w-4" /> Browse all peer tutors
              </Button>
            </div>
          </div>
        )}

        {/* ─── State 3B: Searching Faculty Specialists ────────────── */}
        {state === 'faculty-searching' && (
          <div className="panel border-2 border-ink bg-paper p-8 text-center shadow-[4px_4px_0_var(--color-ink)]" aria-busy="true">
            <div className="relative mx-auto my-6 flex h-36 w-36 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-gold mm-ripple pointer-events-none" />
              <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-2 border-ink bg-ink text-gold shadow-[3px_3px_0_var(--color-gold)] mm-pulse">
                <Award className="h-9 w-9 text-gold" strokeWidth={2.2} />
              </div>
            </div>

            <h2 className="font-display text-[21px] font-extrabold tracking-[-0.03em] text-ink">
              Searching LCCB Faculty Specialists…
            </h2>
            <p className="mt-2 text-[14px] font-medium text-muted-foreground">
              Checking department faculty specializing in <strong className="text-ink">{subjectLabel}</strong>…
            </p>
          </div>
        )}

        {/* ─── State 3C: Faculty Specialist Matched ───────────────── */}
        {state === 'faculty-matched' && facultyMatches.length > 0 && (
          <div className="space-y-4 mm-ease-in">
            <div className="border-2 border-ink bg-surface-highlight px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 shadow-[3px_3px_0_var(--color-ink)]">
              <div>
                <span className="inline-flex items-center gap-1.5 border-2 border-ink bg-ink px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-gold shadow-[2px_2px_0_var(--color-gold)]">
                  <Award className="h-3.5 w-3.5 text-gold" strokeWidth={2.4} />
                  Faculty Specialist Match
                </span>
                <h2 className="mt-1 font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                  {facultyMatches.length === 1
                    ? `1 Faculty Specialist available for ${subjectLabel}`
                    : `${facultyMatches.length} Faculty Specialists available for ${subjectLabel}`}
                </h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setState('no-match')}
                className="flex items-center gap-1 text-[12px] font-bold"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
            </div>

            <div className="space-y-3">
              {facultyMatches.map((faculty) => (
                <div
                  key={faculty.id}
                  className="panel border-2 border-ink bg-card p-5 shadow-[4px_4px_0_var(--color-ink)] transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <button
                        type="button"
                        onClick={() => navigate(`/tutors/${faculty.custom_id || faculty.id}`)}
                        className="shrink-0 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
                        title={`View ${faculty.name}'s public profile`}
                      >
                        <Avatar name={faculty.name} src={faculty.avatar} size="lg" />
                      </button>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/tutors/${faculty.custom_id || faculty.id}`)}
                            className="font-display text-left text-[17px] font-extrabold text-ink underline decoration-gold decoration-2 underline-offset-2 hover:decoration-ink"
                          >
                            {faculty.name}
                          </button>
                          {/* Distinguishable Faculty Badge */}
                          <span className="inline-flex items-center gap-1 border-2 border-ink bg-ink px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-gold shadow-[2px_2px_0_var(--color-gold)]">
                            <Award className="h-3 w-3 text-gold" strokeWidth={2.5} />
                            LCCB Faculty Specialist
                          </span>
                        </div>

                        <p className="text-[13px] font-semibold text-ink/80 mt-1">
                          {faculty.title || 'Faculty Advisor'}
                          {faculty.department ? ` · ${faculty.department} Dept.` : ''}
                        </p>

                        {faculty.bio && (
                          <p className="mt-1 text-[12px] text-muted-foreground line-clamp-2">
                            {faculty.bio}
                          </p>
                        )}

                        {Array.isArray(faculty.subjects) && faculty.subjects.length > 0 && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink/70">
                              Specializes in:
                            </span>
                            {faculty.subjects.map((s) => (
                              <span
                                key={s.code || s}
                                className={cn(
                                  'border border-ink px-1.5 py-0.5 text-[11px] font-bold',
                                  (s.code || s) === course
                                    ? 'bg-gold text-ink shadow-[1px_1px_0_var(--color-ink)]'
                                    : 'bg-surface-quiet text-ink'
                                )}
                              >
                                {s.code || s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                      <Button
                        size="sm"
                        disabled={requestingId === faculty.id}
                        onClick={() => onRequestSession(faculty)}
                        className="min-h-[44px] px-5 font-bold shadow-[2px_2px_0_var(--color-ink)]"
                      >
                        {requestingId === faculty.id ? 'Booking…' : 'Book'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/tutors/${faculty.custom_id || faculty.id}`)}
                        className="text-[12px] font-semibold text-muted-foreground hover:text-ink"
                      >
                        View public profile →
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── State 3D: No Faculty Match → LCCB Contact Prompt ───── */}
        {state === 'no-faculty-match' && (
          <div className="panel border-2 border-ink bg-paper p-6 sm:p-8 shadow-[4px_4px_0_var(--color-ink)] mm-ease-in">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-gold shadow-[2px_2px_0_var(--color-ink)]">
                <PhoneCall className="h-7 w-7 text-ink" strokeWidth={2.2} />
              </div>

              <span className="mt-3 inline-block border-2 border-ink bg-ink px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-gold">
                LCCB Academic Support Assistance
              </span>

              <h2 className="mt-2 font-display text-[21px] font-extrabold tracking-[-0.03em] text-ink">
                No Faculty Specialist Available for {subjectLabel}
              </h2>

              <p className="mt-1.5 text-[14px] text-muted-foreground max-w-[54ch]">
                Neither peer tutors nor faculty specialists are currently available on the roster for{' '}
                <strong className="text-ink">{subjectLabel}</strong>. Please contact{' '}
                <strong className="text-ink">La Consolacion College - Bacolod</strong> directly for help assigning a tutor or faculty mentor for your subject concern.
              </p>
            </div>

            {/* Official LCCB Contact Prompt Box */}
            <div className="mt-6 border-2 border-ink bg-surface-highlight p-5 shadow-[3px_3px_0_var(--color-ink)]">
              <div className="flex items-center gap-2 border-b-2 border-ink/20 pb-3">
                <Building2 className="h-5 w-5 text-ink shrink-0" strokeWidth={2.2} />
                <div>
                  <h3 className="font-display text-[16px] font-extrabold text-ink">
                    La Consolacion College - Bacolod (LCCB)
                  </h3>
                  <p className="text-[12px] font-semibold text-ink/75">
                    Academic Affairs & Student Tutoring Support Desk
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="border-2 border-ink bg-paper p-3.5 shadow-[2px_2px_0_var(--color-ink)]">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Contact Number (Trunkline)
                  </p>
                  <a
                    href="tel:+63344349661"
                    className="mt-1 inline-flex items-center gap-2 font-display text-[18px] font-extrabold text-ink underline decoration-gold decoration-2 underline-offset-4 hover:decoration-ink"
                  >
                    <PhoneCall className="h-4 w-4 text-ink" strokeWidth={2.4} />
                    (034) 434-9661 to 64
                  </a>
                  <p className="mt-1 text-[12px] text-ink/75">
                    Academic Affairs: <strong>Local 118</strong> · Guidance & Testing: <strong>Local 124</strong>
                  </p>
                </div>

                <div className="border-2 border-ink bg-paper p-3.5 shadow-[2px_2px_0_var(--color-ink)]">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Email & Campus Office
                  </p>
                  <a
                    href={`mailto:info@lccbonline.edu.ph?subject=${encodeURIComponent(`Tutor Assistance Concern: ${subjectLabel}`)}`}
                    className="mt-1 inline-flex items-center gap-1.5 text-[14px] font-extrabold text-ink underline decoration-gold decoration-2 underline-offset-4 hover:decoration-ink"
                  >
                    <Mail className="h-4 w-4 text-ink" strokeWidth={2.2} />
                    info@lccbonline.edu.ph
                  </a>
                  <p className="mt-1.5 flex items-start gap-1 text-[12px] text-ink/75">
                    <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-ink" />
                    <span>Galo – Gatuslao Sts., Bacolod City, Negros Occidental 6100</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href="tel:+63344349661"
                className="inline-flex min-h-[44px] items-center gap-2 border-2 border-ink bg-gold px-4 py-2 text-[13px] font-extrabold text-ink shadow-[2px_2px_0_var(--color-ink)] hover:bg-gold/90"
              >
                <PhoneCall className="h-4 w-4" strokeWidth={2.2} />
                Call LCCB Help Desk: (034) 434-9661
              </a>
              <Button
                variant="outline"
                className="min-h-[44px] font-bold"
                onClick={onCancel}
              >
                <ArrowLeft className="h-4 w-4" /> Choose another subject
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
            { id: 'instant', label: 'Peer Match' },
            { id: 'no-match', label: 'No Peer (Faculty Choice)' },
            { id: 'faculty-match', label: 'Faculty Match' },
            { id: 'no-faculty', label: 'No Faculty (LCCB Help)' },
            { id: 'timeout', label: 'Timeout' },
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
