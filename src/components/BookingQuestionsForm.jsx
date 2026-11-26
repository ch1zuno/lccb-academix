import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Award,
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  AlertCircle,
  CheckCircle2,
  Pencil,
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar } from './ui/Avatar';
import {
  FaceToFaceIllustration,
  OnlineIllustration,
  SessionModeBadge,
  formatModeLabel,
} from './SessionModeArtwork';
import { cn } from '../lib/utils';
import { addDaysYmd, localYmd } from '../lib/dates';
import api from '../api';

const BOOKING_STEPS = [
  { id: 'mode', num: 1, short: 'Mode', title: 'Choose session mode' },
  { id: 'subject', num: 2, short: 'Subject', title: 'Subject & topic' },
  { id: 'schedule', num: 3, short: 'Date & time', title: 'Date & time' },
  { id: 'details', num: 4, short: 'Details', title: 'Venue & notes' },
  { id: 'review', num: 5, short: 'Review', title: 'Review & confirm' },
];

const TOPIC_CHIPS = [
  { value: 'Exam & Quiz Prep', label: 'Exam & quiz prep' },
  { value: 'Lab / Assignment Help', label: 'Lab / assignment help' },
  { value: 'Concept Walkthrough', label: 'Concept walkthrough' },
  { value: 'Problem Solving Practice', label: 'Problem solving' },
  { value: 'Catch Up on Missed Lesson', label: 'Catch up' },
];

const DURATIONS = [
  { value: 0.5, label: '30 min' },
  { value: 1, label: '1 hr' },
  { value: 1.5, label: '1.5 hrs' },
  { value: 2, label: '2 hrs' },
];

const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Tagalog', label: 'Tagalog' },
  { value: 'Hiligaynon', label: 'Hiligaynon' },
];

const NOTE_EXAMPLES = [
  'Reviewing for our upcoming quiz and need practice problems.',
  'Walk through the latest lecture step by step — stuck on the core concept.',
  'Need help tracing my lab exercise and fixing logic errors.',
  'Missed last class and want to catch up before the next meeting.',
];

const DEFAULT_SLOTS = [
  '9:00 AM', '10:00 AM', '11:00 AM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM',
];

const MAX_NOTE_LEN = 280;

function formatPrettyDate(ymd) {
  if (!ymd) return '—';
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function nextMondayYmd() {
  const now = new Date();
  const days = ((8 - now.getDay()) % 7) || 7;
  return addDaysYmd(days);
}

/**
 * Unified 5-step mobile-first booking flow:
 * 1) Mode (nothing preselected — Face to Face vs Online)
 * 2) Subject & topic
 * 3) Date & time (live tutor availability)
 * 4) Details (approved campus venue picker for F2F, platform note for Online, language + help prompt)
 * 5) Review & confirm (plain-English summary with Edit links) -> Success screen
 */
export default function BookingQuestionsForm({
  user,
  tutor,
  skipCourse = false,
  selectedCourse = '',
  subjects = [],
  onSubmit,
  onCancel,
  onDone,
  onBookAnother,
  submitting = false,
}) {
  const tutorSubjects = useMemo(() => {
    const raw = Array.isArray(subjects) && subjects.length > 0
      ? subjects
      : Array.isArray(tutor?.subjects)
        ? tutor.subjects
        : [];
    return raw.map((s) =>
      typeof s === 'string'
        ? { code: s, name: s, department: '' }
        : { id: s.id, code: s.code, name: s.name || s.code, department: s.department || '' },
    );
  }, [subjects, tutor?.subjects]);

  const initialCourse = useMemo(() => {
    if (selectedCourse) return selectedCourse;
    if (tutorSubjects.length === 1) return tutorSubjects[0].code;
    return '';
  }, [selectedCourse, tutorSubjects]);

  const today = useMemo(() => localYmd(), []);
  const quickDates = useMemo(() => [
    { label: 'Tomorrow', value: addDaysYmd(1) },
    { label: 'In 2 days', value: addDaysYmd(2) },
    { label: 'Next Mon', value: nextMondayYmd() },
  ], []);

  // All inputs stay in memory across step changes and validation errors.
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState(() => ({
    mode: '', // Conscious choice: nothing preselected
    course: initialCourse,
    topic: 'Concept Walkthrough',
    customTopic: '',
    preferredDate: addDaysYmd(1),
    preferredTime: '',
    durationHours: 1,
    venueId: '',
    language: 'English',
    helpNote: '',
  }));

  const [stepError, setStepError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [confirmed, setConfirmed] = useState(null);

  // Live slots & campus venues
  const [slots, setSlots] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [venues, setVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(false);

  const f2fRadioRef = useRef(null);
  const onlineRadioRef = useRef(null);
  const stepHeadingRef = useRef(null);

  // Keep course synced if tutor subjects resolve asynchronously
  useEffect(() => {
    if (!form.course && initialCourse) {
      setForm((prev) => ({ ...prev, course: initialCourse }));
    }
  }, [initialCourse, form.course]);

  // Fetch live tutor time slots when date, duration, or mode changes
  useEffect(() => {
    const tutorKey = tutor?.id || tutor?.custom_id;
    if (!tutorKey || !form.preferredDate) return undefined;
    let alive = true;
    setSlotsLoading(true);
    api.get(`/tutors/${tutorKey}/slots`, {
      date: form.preferredDate,
      durationHours: form.durationHours,
      mode: form.mode || 'online',
      ...(form.mode === 'face_to_face' && form.venueId ? { venueId: form.venueId } : {}),
    })
      .then(({ slots: list }) => {
        if (!alive) return;
        const rows = Array.isArray(list) && list.length > 0
          ? list
          : DEFAULT_SLOTS.map((t) => ({ time: t, available: true, reason: null }));
        setSlots(rows);
        // If current selected slot became unavailable, clear it with a clear message
        if (form.preferredTime) {
          const stillOpen = rows.find((s) => s.time === form.preferredTime && s.available);
          if (!stillOpen) {
            setForm((prev) => ({ ...prev, preferredTime: '' }));
          }
        }
      })
      .catch(() => {
        if (alive) setSlots(DEFAULT_SLOTS.map((t) => ({ time: t, available: true, reason: null })));
      })
      .finally(() => { if (alive) setSlotsLoading(false); });
    return () => { alive = false; };
  }, [tutor?.id, tutor?.custom_id, form.preferredDate, form.durationHours, form.mode, form.venueId]);

  // Fetch approved campus venues (annotated with live slot availability) for Face to Face
  useEffect(() => {
    if (form.mode !== 'face_to_face') return undefined;
    let alive = true;
    setVenuesLoading(true);
    api.get('/venues', {
      ...(form.preferredDate && form.preferredTime
        ? { date: form.preferredDate, time: form.preferredTime, durationHours: form.durationHours }
        : {}),
    })
      .then(({ venues: rows }) => {
        if (!alive) return;
        setVenues(rows || []);
        if (form.venueId) {
          const stillAvailable = (rows || []).find((v) => v.id === form.venueId && v.available);
          if (!stillAvailable) {
            setForm((prev) => ({ ...prev, venueId: '' }));
          }
        }
      })
      .catch(() => { if (alive) setVenues([]); })
      .finally(() => { if (alive) setVenuesLoading(false); });
    return () => { alive = false; };
  }, [form.mode, form.preferredDate, form.preferredTime, form.durationHours]);

  const updateField = (key, value) => {
    setStepError('');
    setSubmitError('');
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'mode' && value === 'online') {
        next.venueId = '';
      }
      return next;
    });
  };

  const selectedSubjectObj = tutorSubjects.find(
    (s) => String(s.code).toUpperCase() === String(form.course).toUpperCase(),
  );
  const selectedVenueObj = venues.find((v) => v.id === form.venueId) || null;
  const resolvedTopic = form.topic === '__custom__' ? form.customTopic.trim() : form.topic;
  const durationLabel = DURATIONS.find((d) => d.value === form.durationHours)?.label || '1 hr';

  const validateStep = (idx) => {
    const id = BOOKING_STEPS[idx]?.id;
    if (id === 'mode') {
      if (!form.mode) return 'Choose Face to Face or Online before continuing.';
    }
    if (id === 'subject') {
      if (!form.course) return 'Pick one of this tutor’s subjects to continue.';
      if (!resolvedTopic) return 'Choose a topic focus or type a short custom topic.';
    }
    if (id === 'schedule') {
      if (!form.preferredDate) return 'Pick a date for your session.';
      if (form.preferredDate < today) return 'Choose today or a future date.';
      if (!form.preferredTime) return 'Tap an available time slot to continue.';
    }
    if (id === 'details') {
      if (form.mode === 'face_to_face' && !form.venueId) {
        return 'Choose an approved campus venue so both of you know where to meet.';
      }
      if (form.helpNote.length > MAX_NOTE_LEN) {
        return `Keep your note under ${MAX_NOTE_LEN} characters.`;
      }
    }
    return '';
  };

  const goToStep = (idx) => {
    setStepError('');
    setSubmitError('');
    setStepIndex(idx);
    setTimeout(() => stepHeadingRef.current?.focus(), 40);
  };

  const handleNext = async () => {
    const err = validateStep(stepIndex);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError('');
    if (stepIndex < BOOKING_STEPS.length - 1) {
      goToStep(stepIndex + 1);
      return;
    }

    // Final confirmation submit
    setSubmitError('');
    const noteParts = [`Language: ${form.language}`];
    if (form.helpNote.trim()) noteParts.unshift(form.helpNote.trim());
    const payload = {
      mode: form.mode,
      course: form.course,
      topic: resolvedTopic,
      preferredDate: form.preferredDate,
      preferredTime: form.preferredTime,
      durationHours: form.durationHours,
      venueId: form.mode === 'face_to_face' ? form.venueId : null,
      venueName: form.mode === 'face_to_face' ? selectedVenueObj?.name : 'Online · LCCB Live Classroom',
      language: form.language,
      note: noteParts.join(' · ').slice(0, 300),
    };

    try {
      const result = await onSubmit?.(payload);
      setConfirmed({
        ...payload,
        requestId: result?.id || null,
        subjectName: selectedSubjectObj?.name || form.course,
        venueDetail: selectedVenueObj
          ? `${selectedVenueObj.name}${selectedVenueObj.building ? ` (${selectedVenueObj.building}${selectedVenueObj.room ? `, ${selectedVenueObj.room}` : ''})` : ''}`
          : 'Online · LCCB Live Classroom',
      });
    } catch (e) {
      setSubmitError(e?.message || 'Could not send booking request. Review your details and try again.');
    }
  };

  const handleBack = () => {
    setStepError('');
    setSubmitError('');
    if (stepIndex === 0) {
      onCancel?.();
    } else {
      goToStep(stepIndex - 1);
    }
  };

  const handleModeRadioKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = form.mode === 'face_to_face' ? 'online' : 'face_to_face';
      updateField('mode', next);
      (next === 'face_to_face' ? f2fRadioRef : onlineRadioRef).current?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = form.mode === 'online' ? 'face_to_face' : 'online';
      updateField('mode', prev);
      (prev === 'face_to_face' ? f2fRadioRef : onlineRadioRef).current?.focus();
    }
  };

  // ── Success State ────────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div className="panel border-2 border-ink bg-card p-5 sm:p-7 shadow-[5px_5px_0_var(--color-ink)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-ink pb-5">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center border-2 border-ink bg-emerald text-white shadow-[3px_3px_0_var(--color-ink)]">
              <CheckCircle2 className="h-6 w-6" strokeWidth={2.4} />
            </span>
            <div>
              <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-emerald">
                Booking request sent
              </p>
              <h2 className="mt-1 font-display text-[24px] font-extrabold leading-tight tracking-[-0.03em] text-ink">
                Waiting on {tutor?.name || 'your tutor'}
              </h2>
            </div>
          </div>
          <SessionModeBadge mode={confirmed.mode} />
        </div>

        <div className="mt-5 border-2 border-ink bg-surface-quiet p-4 space-y-2 text-[14px]">
          <p className="font-bold text-ink">
            {confirmed.course} — {confirmed.topic}
          </p>
          <p className="text-muted-foreground">
            {formatPrettyDate(confirmed.preferredDate)} · {confirmed.preferredTime} ({durationLabel})
          </p>
          <p className="font-semibold text-ink">
            {confirmed.mode === 'face_to_face' ? 'Campus venue: ' : 'Platform: '}
            {confirmed.venueDetail}
          </p>
        </div>

        <div className="mt-5 border-2 border-ink bg-surface-highlight p-4 text-[13px] leading-relaxed text-ink">
          <p className="font-bold">What happens next</p>
          <p className="mt-1 text-ink/85">
            {tutor?.name || 'Your tutor'} has been notified and can accept, decline, or propose another{' '}
            {confirmed.mode === 'face_to_face' ? 'campus venue or time' : 'time'}. You will get a notification as soon as they respond.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() => onDone?.()}
            className="min-h-[44px] flex-1 font-extrabold shadow-[3px_3px_0_var(--color-ink)]"
          >
            Go to My progress
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setConfirmed(null);
              setStepIndex(0);
              setForm((prev) => ({ ...prev, mode: '', preferredTime: '', venueId: '', helpNote: '' }));
              onBookAnother?.();
            }}
            className="min-h-[44px] font-bold"
          >
            Book another session
          </Button>
        </div>
      </div>
    );
  }

  const currentStep = BOOKING_STEPS[stepIndex];
  const isLastStep = stepIndex === BOOKING_STEPS.length - 1;

  return (
    <div className="panel border-2 border-ink bg-card p-4 sm:p-7 shadow-[4px_4px_0_var(--color-ink)]">
      {/* Prefilled context strip (student + tutor) */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-surface-quiet p-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={tutor?.name || 'Tutor'} avatarUrl={tutor?.avatar_url || tutor?.avatar} size="md" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-[16px] font-extrabold text-ink truncate">
                {tutor?.name || 'Tutor'}
              </span>
              {tutor?.role === 'faculty' ? (
                <span className="inline-flex items-center gap-1 border border-ink bg-ink px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-gold">
                  <Award className="h-3 w-3 text-gold" /> Faculty
                </span>
              ) : (
                <span className="border border-ink bg-gold px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-ink">
                  Verified Tutor
                </span>
              )}
              {form.mode && <SessionModeBadge mode={form.mode} compact />}
            </div>
            <p className="mt-0.5 text-[12px] text-muted-foreground truncate">
              Booking as <strong className="text-ink">{user?.name || 'Student'}</strong>
              {user?.program ? ` · ${user.program}` : ''}
              {form.course ? ` · ${form.course}` : ''}
            </p>
          </div>
        </div>

        <span className="num border-2 border-ink bg-paper px-2.5 py-1 text-[12px] font-extrabold text-ink">
          Step {stepIndex + 1} of {BOOKING_STEPS.length}
        </span>
      </div>

      {/* Visible 5-step progress indicator (wraps cleanly on mobile, zero horizontal scroll) */}
      <nav aria-label="Booking progress" className="mb-6">
        <ol className="grid grid-cols-5 gap-1.5">
          {BOOKING_STEPS.map((s, idx) => {
            const done = idx < stepIndex;
            const current = idx === stepIndex;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!done}
                  onClick={() => done && goToStep(idx)}
                  aria-current={current ? 'step' : undefined}
                  className={cn(
                    'flex min-h-[44px] w-full flex-col items-center justify-center border-2 px-1 py-1.5 text-center transition-colors',
                    current
                      ? 'border-ink bg-gold text-ink shadow-[2px_2px_0_var(--color-ink)]'
                      : done
                        ? 'cursor-pointer border-ink bg-ink text-paper hover:opacity-90'
                        : 'cursor-default border-ink/25 bg-paper text-muted-foreground',
                  )}
                >
                  <span className="num text-[11px] font-extrabold leading-none">
                    {done ? '✓' : s.num}
                  </span>
                  <span className="mt-1 hidden text-[11px] font-bold leading-none sm:block">
                    {s.short}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -6 }}
          transition={{ duration: 0.14 }}
        >
          {/* ── STEP 1: MODE ─────────────────────────────────────────────── */}
          {currentStep.id === 'mode' && (
            <div>
              <h2
                ref={stepHeadingRef}
                tabIndex={-1}
                id="mode-step-heading"
                className="font-display text-[22px] sm:text-[25px] font-extrabold leading-tight tracking-[-0.03em] text-ink focus:outline-none"
              >
                How do you want to meet?
              </h2>
              <p className="mt-1.5 text-[14px] text-muted-foreground">
                Pick one first — this decides whether you choose a campus venue or join the online classroom.
              </p>

              <div
                role="radiogroup"
                aria-labelledby="mode-step-heading"
                aria-required="true"
                onKeyDown={handleModeRadioKeyDown}
                className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2"
              >
                {/* Face to Face card */}
                <button
                  ref={f2fRadioRef}
                  type="button"
                  role="radio"
                  aria-checked={form.mode === 'face_to_face'}
                  tabIndex={form.mode === 'online' ? -1 : 0}
                  onClick={() => updateField('mode', 'face_to_face')}
                  className={cn(
                    'group flex min-h-[210px] w-full flex-col items-start justify-between border-2 border-ink p-5 text-left transition-[transform,box-shadow,background-color] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold',
                    form.mode === 'face_to_face'
                      ? 'bg-gold text-ink shadow-[5px_5px_0_var(--color-ink)] -translate-y-0.5'
                      : 'bg-paper text-ink shadow-[3px_3px_0_var(--color-ink)] hover:-translate-y-0.5 hover:bg-surface-highlight hover:shadow-[5px_5px_0_var(--color-ink)]',
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 border-2 border-ink bg-paper px-2 py-0.5 text-[11px] font-extrabold uppercase text-ink">
                      <Users className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                      On campus
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'grid h-6 w-6 place-items-center border-2 border-ink',
                        form.mode === 'face_to_face' ? 'bg-ink text-paper' : 'bg-paper',
                      )}
                    >
                      {form.mode === 'face_to_face' && <Check className="h-3.5 w-3.5" strokeWidth={2.8} />}
                    </span>
                  </div>

                  <div className="my-4 flex w-full justify-center">
                    <FaceToFaceIllustration />
                  </div>

                  <div>
                    <span className="font-display block text-[19px] font-extrabold leading-tight text-ink">
                      Face to Face
                    </span>
                    <span className={cn(
                      'mt-1 block text-[13px] leading-snug',
                      form.mode === 'face_to_face' ? 'text-ink/90 font-medium' : 'text-muted-foreground',
                    )}>
                      Meet in person at an approved LCCB campus venue.
                    </span>
                  </div>
                </button>

                {/* Online card */}
                <button
                  ref={onlineRadioRef}
                  type="button"
                  role="radio"
                  aria-checked={form.mode === 'online'}
                  tabIndex={form.mode === 'online' ? 0 : form.mode === '' ? 0 : -1}
                  onClick={() => updateField('mode', 'online')}
                  className={cn(
                    'group flex min-h-[210px] w-full flex-col items-start justify-between border-2 border-ink p-5 text-left transition-[transform,box-shadow,background-color] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold',
                    form.mode === 'online'
                      ? 'bg-gold text-ink shadow-[5px_5px_0_var(--color-ink)] -translate-y-0.5'
                      : 'bg-paper text-ink shadow-[3px_3px_0_var(--color-ink)] hover:-translate-y-0.5 hover:bg-surface-highlight hover:shadow-[5px_5px_0_var(--color-ink)]',
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 border-2 border-ink bg-paper px-2 py-0.5 text-[11px] font-extrabold uppercase text-ink">
                      <Video className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                      Video call
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'grid h-6 w-6 place-items-center border-2 border-ink',
                        form.mode === 'online' ? 'bg-ink text-paper' : 'bg-paper',
                      )}
                    >
                      {form.mode === 'online' && <Check className="h-3.5 w-3.5" strokeWidth={2.8} />}
                    </span>
                  </div>

                  <div className="my-4 flex w-full justify-center">
                    <OnlineIllustration />
                  </div>

                  <div>
                    <span className="font-display block text-[19px] font-extrabold leading-tight text-ink">
                      Online
                    </span>
                    <span className={cn(
                      'mt-1 block text-[13px] leading-snug',
                      form.mode === 'online' ? 'text-ink/90 font-medium' : 'text-muted-foreground',
                    )}>
                      Join a live video classroom and shared chat from anywhere.
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: SUBJECT & TOPIC ──────────────────────────────────── */}
          {currentStep.id === 'subject' && (
            <div className="space-y-6">
              <div>
                <h2
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="font-display text-[22px] sm:text-[25px] font-extrabold leading-tight tracking-[-0.03em] text-ink focus:outline-none"
                >
                  Subject and topic
                </h2>
                <p className="mt-1 text-[14px] text-muted-foreground">
                  Only subjects {tutor?.name || 'this tutor'} is accredited to teach are shown.
                </p>
              </div>

              <div>
                <label htmlFor="booking-subject-select" className="field-label">
                  Subject
                </label>
                {tutorSubjects.length > 6 ? (
                  <select
                    id="booking-subject-select"
                    value={form.course}
                    onChange={(e) => updateField('course', e.target.value)}
                    className="select-field mt-1 min-h-[44px]"
                  >
                    <option value="">Select a subject…</option>
                    {tutorSubjects.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code} — {s.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2" role="group" aria-label="Choose subject">
                    {tutorSubjects.map((sub) => {
                      const active = String(form.course).toUpperCase() === String(sub.code).toUpperCase();
                      return (
                        <button
                          key={sub.code}
                          type="button"
                          aria-pressed={active}
                          onClick={() => updateField('course', sub.code)}
                          className={cn(
                            'flex min-h-[60px] items-center justify-between gap-3 border-2 border-ink p-3.5 text-left transition-all',
                            active
                              ? 'bg-gold text-ink shadow-[3px_3px_0_var(--color-ink)]'
                              : 'bg-paper text-ink hover:bg-surface-highlight',
                          )}
                        >
                          <div className="min-w-0">
                            <span className="font-display block text-[14px] font-extrabold leading-tight">
                              {sub.code}
                            </span>
                            <span className="mt-0.5 block truncate text-[12px] text-ink/80">
                              {sub.name}
                            </span>
                          </div>
                          {active && <Check className="h-4 w-4 shrink-0" strokeWidth={2.6} />}
                        </button>
                      );
                    })}
                  </div>
                )}
                {skipCourse && selectedCourse && (
                  <p className="mt-1.5 text-[12px] text-muted-foreground">
                    Pre-filled from your subject search ({selectedCourse}). Tap another if you want to switch.
                  </p>
                )}
              </div>

              <div>
                <p className="field-label">What kind of help do you need?</p>
                <p className="text-[12px] text-muted-foreground">
                  Pick the closest focus so your tutor knows how to prepare.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label="Topic focus">
                  {TOPIC_CHIPS.map((chip) => {
                    const active = form.topic === chip.value;
                    return (
                      <button
                        key={chip.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => updateField('topic', chip.value)}
                        className={cn(
                          'min-h-[44px] border-2 border-ink px-3.5 py-2 text-[13px] font-bold transition-all',
                          active
                            ? 'bg-gold text-ink shadow-[2px_2px_0_var(--color-ink)]'
                            : 'bg-paper text-ink hover:bg-surface-highlight',
                        )}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    aria-pressed={form.topic === '__custom__'}
                    onClick={() => updateField('topic', '__custom__')}
                    className={cn(
                      'min-h-[44px] border-2 border-ink px-3.5 py-2 text-[13px] font-bold transition-all',
                      form.topic === '__custom__'
                        ? 'bg-gold text-ink shadow-[2px_2px_0_var(--color-ink)]'
                        : 'bg-paper text-ink hover:bg-surface-highlight',
                    )}
                  >
                    Specific topic…
                  </button>
                </div>

                {form.topic === '__custom__' && (
                  <div className="mt-3">
                    <label htmlFor="booking-custom-topic" className="field-label">
                      Specific topic name
                    </label>
                    <input
                      id="booking-custom-topic"
                      type="text"
                      maxLength={120}
                      value={form.customTopic}
                      onChange={(e) => updateField('customTopic', e.target.value)}
                      placeholder="e.g., Linked Lists & Pointers or SQL Joins"
                      className="input-field mt-1 min-h-[44px]"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: DATE & TIME ──────────────────────────────────────── */}
          {currentStep.id === 'schedule' && (
            <div className="space-y-6">
              <div>
                <h2
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="font-display text-[22px] sm:text-[25px] font-extrabold leading-tight tracking-[-0.03em] text-ink focus:outline-none"
                >
                  Pick a date and time
                </h2>
                <p className="mt-1 text-[14px] text-muted-foreground">
                  Open slots reflect {tutor?.name || 'your tutor'}’s live schedule.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="booking-date" className="field-label">
                    Date
                  </label>
                  <input
                    id="booking-date"
                    type="date"
                    min={today}
                    value={form.preferredDate}
                    onChange={(e) => updateField('preferredDate', e.target.value)}
                    className="input-field mt-1 min-h-[44px]"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {quickDates.map((qd) => (
                      <button
                        key={qd.label}
                        type="button"
                        onClick={() => updateField('preferredDate', qd.value)}
                        className={cn(
                          'min-h-[34px] border-2 border-ink px-2.5 text-[12px] font-bold',
                          form.preferredDate === qd.value
                            ? 'bg-gold text-ink'
                            : 'bg-paper text-ink hover:bg-surface-highlight',
                        )}
                      >
                        {qd.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="field-label">Session length</p>
                  <div className="mt-1 grid grid-cols-2 gap-2" role="group" aria-label="Session duration">
                    {DURATIONS.map((d) => {
                      const active = form.durationHours === d.value;
                      return (
                        <button
                          key={d.value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => updateField('durationHours', d.value)}
                          className={cn(
                            'min-h-[44px] border-2 border-ink px-3 text-[13px] font-bold',
                            active
                              ? 'bg-gold text-ink shadow-[2px_2px_0_var(--color-ink)]'
                              : 'bg-paper text-ink hover:bg-surface-highlight',
                          )}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[12px] text-muted-foreground">
                    1 hour is the standard LCCB session length.
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="field-label">Available time slots</p>
                  {slotsLoading && (
                    <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking schedule…
                    </span>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Time slots">
                  {(slots || DEFAULT_SLOTS.map((t) => ({ time: t, available: true }))).map((slot) => {
                    const active = form.preferredTime === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        aria-pressed={active}
                        onClick={() => updateField('preferredTime', slot.time)}
                        className={cn(
                          'flex min-h-[46px] items-center justify-between gap-2 border-2 px-3 py-2 text-[13px] font-bold transition-all',
                          !slot.available
                            ? 'cursor-not-allowed border-ink/25 bg-surface-quiet text-muted-foreground line-through'
                            : active
                              ? 'border-ink bg-gold text-ink shadow-[2px_2px_0_var(--color-ink)]'
                              : 'border-ink bg-paper text-ink hover:bg-surface-highlight',
                        )}
                      >
                        <span className="num">{slot.time}</span>
                        {!slot.available ? (
                          <span className="text-[10px] font-extrabold uppercase no-underline">Booked</span>
                        ) : active ? (
                          <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.6} />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[12px] text-muted-foreground">
                  Your tutor confirms the final slot (or can suggest another time).
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 4: DETAILS (MODE-SPECIFIC) ──────────────────────────── */}
          {currentStep.id === 'details' && (
            <div className="space-y-6">
              <div>
                <h2
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="font-display text-[22px] sm:text-[25px] font-extrabold leading-tight tracking-[-0.03em] text-ink focus:outline-none"
                >
                  {form.mode === 'face_to_face' ? 'Choose a campus venue & notes' : 'Classroom details & notes'}
                </h2>
                <p className="mt-1 text-[14px] text-muted-foreground">
                  {form.mode === 'face_to_face'
                    ? 'Pick an approved campus space for your meeting and tell your tutor what to focus on.'
                    : 'Your online classroom opens automatically once both of you check in.'}
                </p>
              </div>

              {form.mode === 'face_to_face' ? (
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="field-label flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" aria-hidden="true" /> Campus meeting venue
                    </p>
                    {venuesLoading && (
                      <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking rooms…
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    Only faculty-approved campus spaces are allowed for student safety.
                  </p>

                  {!venuesLoading && venues.length === 0 ? (
                    <div className="mt-2 border-2 border-ink bg-surface-alert p-4 text-[13px] font-semibold text-destructive">
                      No approved campus venues are currently active. Ask faculty or switch to Online mode.
                    </div>
                  ) : (
                    <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Campus venue">
                      {venues.map((v) => {
                        const active = form.venueId === v.id;
                        const disabled = !v.available;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            disabled={disabled}
                            onClick={() => updateField('venueId', v.id)}
                            className={cn(
                              'flex min-h-[68px] items-start justify-between gap-3 border-2 p-3.5 text-left transition-all',
                              disabled
                                ? 'cursor-not-allowed border-ink/25 bg-surface-quiet text-muted-foreground'
                                : active
                                  ? 'border-ink bg-gold text-ink shadow-[3px_3px_0_var(--color-ink)]'
                                  : 'border-ink bg-paper text-ink hover:bg-surface-highlight',
                            )}
                          >
                            <div className="min-w-0">
                              <span className="font-display block text-[14px] font-extrabold leading-tight">
                                {v.name}
                              </span>
                              <span className="mt-0.5 block text-[12px] opacity-80">
                                {[v.building, v.room, `Cap ${v.capacity}`].filter(Boolean).join(' · ')}
                              </span>
                            </div>
                            {disabled ? (
                              <span className="shrink-0 border border-ink/30 bg-paper px-1.5 py-0.5 text-[10px] font-extrabold uppercase">
                                Booked
                              </span>
                            ) : active ? (
                              <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.6} />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-3 border-2 border-ink bg-surface-highlight p-4">
                  <Video className="mt-0.5 h-5 w-5 shrink-0 text-ink" strokeWidth={2.2} aria-hidden="true" />
                  <div className="text-[13px]">
                    <p className="font-bold text-ink">Platform: LCCB Live Classroom</p>
                    <p className="mt-0.5 text-ink/80">
                      Includes Direct WebRTC / Jitsi Meet video and live chat. Both devices confirm a one-time code to start the session.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <p className="field-label">Preferred language</p>
                <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Preferred language">
                  {LANGUAGES.map((lang) => {
                    const active = form.language === lang.value;
                    return (
                      <button
                        key={lang.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => updateField('language', lang.value)}
                        className={cn(
                          'min-h-[44px] border-2 border-ink px-4 text-[13px] font-bold',
                          active
                            ? 'bg-gold text-ink shadow-[2px_2px_0_var(--color-ink)]'
                            : 'bg-paper text-ink hover:bg-surface-highlight',
                        )}
                      >
                        {lang.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor="booking-help-note" className="field-label">
                    What do you need help with? <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <span className="num text-[12px] text-muted-foreground">
                    {form.helpNote.length} / {MAX_NOTE_LEN}
                  </span>
                </div>
                <p className="text-[12px] text-muted-foreground">
                  One or two sentences helps your tutor bring the right examples. Tap an example to start:
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {NOTE_EXAMPLES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => updateField('helpNote', example.slice(0, MAX_NOTE_LEN))}
                      className="min-h-[34px] border border-ink/50 bg-surface-quiet px-2.5 py-1 text-left text-[12px] font-semibold text-ink hover:border-ink hover:bg-surface-highlight"
                    >
                      + {example.slice(0, 42)}…
                    </button>
                  ))}
                </div>
                <textarea
                  id="booking-help-note"
                  rows={3}
                  maxLength={MAX_NOTE_LEN}
                  value={form.helpNote}
                  onChange={(e) => updateField('helpNote', e.target.value)}
                  placeholder="e.g., I'm stuck on deleting the middle node of a linked list before Friday's lab."
                  className="textarea-field mt-2"
                />
              </div>
            </div>
          )}

          {/* ── STEP 5: REVIEW & CONFIRM ─────────────────────────────────── */}
          {currentStep.id === 'review' && (
            <div className="space-y-4">
              <div>
                <h2
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="font-display text-[22px] sm:text-[25px] font-extrabold leading-tight tracking-[-0.03em] text-ink focus:outline-none"
                >
                  Review your booking
                </h2>
                <p className="mt-1 text-[14px] text-muted-foreground">
                  Check every detail below. Tap Edit next to any line to change it without losing your work.
                </p>
              </div>

              <div className="divide-y-2 divide-ink/15 border-2 border-ink bg-paper">
                {/* Mode */}
                <div className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Session mode</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <SessionModeBadge mode={form.mode} />
                      <span className="text-[13px] text-muted-foreground">
                        {form.mode === 'face_to_face' ? 'In person on campus' : 'Video call + live chat'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToStep(0)}
                    className="inline-flex min-h-[40px] items-center gap-1 px-2 text-[13px] font-bold text-ink underline decoration-gold decoration-2 underline-offset-4 hover:decoration-ink"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                  </button>
                </div>

                {/* Tutor & Student */}
                <div className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Tutor & Student</p>
                    <p className="mt-1 text-[14px] font-bold text-ink">
                      {tutor?.name || 'Tutor'} with {user?.name || 'You'}
                      {user?.program ? ` (${user.program})` : ''}
                    </p>
                  </div>
                </div>

                {/* Subject & Topic */}
                <div className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Subject & Topic</p>
                    <p className="mt-1 text-[14px] font-bold text-ink">
                      {form.course}{selectedSubjectObj?.name ? ` · ${selectedSubjectObj.name}` : ''}
                    </p>
                    <p className="text-[13px] text-muted-foreground">{resolvedTopic}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="inline-flex min-h-[40px] items-center gap-1 px-2 text-[13px] font-bold text-ink underline decoration-gold decoration-2 underline-offset-4 hover:decoration-ink"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                  </button>
                </div>

                {/* Date & Time */}
                <div className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Date & Time</p>
                    <p className="mt-1 flex items-center gap-1.5 text-[14px] font-bold text-ink">
                      <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      {formatPrettyDate(form.preferredDate)} · {form.preferredTime} ({durationLabel})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="inline-flex min-h-[40px] items-center gap-1 px-2 text-[13px] font-bold text-ink underline decoration-gold decoration-2 underline-offset-4 hover:decoration-ink"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                  </button>
                </div>

                {/* Place / Platform & Notes */}
                <div className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                      {form.mode === 'face_to_face' ? 'Campus venue' : 'Online platform'}
                    </p>
                    <p className="mt-1 text-[14px] font-bold text-ink">
                      {form.mode === 'face_to_face'
                        ? (selectedVenueObj
                          ? `${selectedVenueObj.name}${selectedVenueObj.building ? ` · ${selectedVenueObj.building}` : ''}${selectedVenueObj.room ? ` (${selectedVenueObj.room})` : ''}`
                          : 'Selected campus venue')
                        : 'Online · LCCB Live Classroom'}
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      Language: {form.language}
                      {form.helpNote.trim() ? ` · “${form.helpNote.trim()}”` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="inline-flex min-h-[40px] shrink-0 items-center gap-1 px-2 text-[13px] font-bold text-ink underline decoration-gold decoration-2 underline-offset-4 hover:decoration-ink"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Inline validation or server error (never clears form state) */}
      {(stepError || submitError) && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 border-2 border-ink bg-surface-alert p-3.5 text-[13px] font-bold text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{submitError || stepError}</span>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink/15 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={submitting}
          className="min-h-[44px] font-bold"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" strokeWidth={2} />
          {stepIndex === 0 ? 'Cancel' : 'Back'}
        </Button>

        <Button
          type="button"
          onClick={handleNext}
          disabled={submitting}
          className="min-h-[44px] px-5 font-extrabold shadow-[3px_3px_0_var(--color-ink)]"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Sending request…
            </>
          ) : isLastStep ? (
            <>
              <Clock className="mr-1.5 h-4 w-4" /> Confirm booking request
            </>
          ) : (
            <>
              Continue <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={2} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
