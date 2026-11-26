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
  Zap,
  ChevronDown,
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar } from './ui/Avatar';
import StepProgress from './ui/StepProgress';
import {
  FaceToFaceIllustration,
  OnlineIllustration,
  SessionModeBadge,
  formatModeLabel,
} from './SessionModeArtwork';
import { useBookingDraft } from '../context/BookingDraftContext';
import { cn } from '../lib/utils';
import { addDaysYmd, localYmd } from '../lib/dates';
import api from '../api';

const BOOKING_STEPS = [
  { id: 'mode', num: 1, short: 'Mode', title: 'Choose session mode' },
  { id: 'details', num: 2, short: 'Details', title: 'Session details' },
  { id: 'review', num: 3, short: 'Review', title: 'Review & confirm' },
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

const ALL_LANGUAGES = ['English', 'Tagalog', 'Hiligaynon'];

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

function mapWizardGoalToTopic(goal) {
  if (!goal) return '';
  if (/exam/i.test(goal)) return 'Exam & Quiz Prep';
  if (/topic/i.test(goal)) return 'Concept Walkthrough';
  if (/catch/i.test(goal)) return 'Catch Up on Missed Lesson';
  return goal;
}

function SummaryRow({ label, value, onEdit, editLabel }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-ink/15 px-3 py-2.5 last:border-b-0">
      <div className="min-w-0">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <p className="truncate text-[14px] font-bold text-ink">{value}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={editLabel || `Edit ${label.toLowerCase()}`}
        className="inline-flex min-h-[36px] shrink-0 items-center gap-1 border-2 border-ink bg-paper px-2.5 text-[12px] font-bold text-ink hover:bg-gold"
      >
        <Pencil className="h-3 w-3" aria-hidden="true" />
        Edit
      </button>
    </div>
  );
}

/**
 * 3-step mobile-first booking flow:
 * 1) Mode (Face to Face vs Online — conscious choice, nothing preselected)
 * 2) Compact Details (progressive disclosure: collapsed editable summary for wizard prefill,
 *    Date & Time with instant "Now" chip when tutor is available, Venue for F2F, Language & help prompt)
 * 3) Review & Confirm -> Success state
 */
export default function BookingQuestionsForm({
  user,
  tutor,
  selectedCourse = '',
  wizardPrefill = null, // { course, goal, language, fromWizard }
  subjects = [],
  onSubmit,
  onCancel,
  onDone,
  onBookAnother,
  submitting = false,
}) {
  const { draft, updateDraft, clearDraft } = useBookingDraft();

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

  const matchingDraft = useMemo(() => {
    const tutorKey = tutor?.id || tutor?.custom_id;
    if (!draft || !tutorKey) return null;
    if (draft.tutorKey && draft.tutorKey === tutorKey) return draft;
    return null;
  }, [draft, tutor?.id, tutor?.custom_id]);

  const prefilledCourse = useMemo(() => {
    const candidate = matchingDraft?.course || wizardPrefill?.course || selectedCourse || '';
    if (candidate && tutorSubjects.some((s) => String(s.code).toUpperCase() === String(candidate).toUpperCase())) {
      return candidate;
    }
    if (tutorSubjects.length === 1) return tutorSubjects[0].code;
    return '';
  }, [matchingDraft?.course, wizardPrefill?.course, selectedCourse, tutorSubjects]);

  const prefilledTopic = useMemo(() => {
    if (matchingDraft?.topic) return matchingDraft.topic;
    if (wizardPrefill?.goal) return mapWizardGoalToTopic(wizardPrefill.goal);
    return '';
  }, [matchingDraft?.topic, wizardPrefill?.goal]);

  const tutorOfferedLanguagesInit = useMemo(() => {
    if (Array.isArray(tutor?.languages) && tutor.languages.length > 0) {
      return tutor.languages.filter((l) => ALL_LANGUAGES.includes(l));
    }
    return ALL_LANGUAGES;
  }, [tutor?.languages]);

  const prefilledLanguage = useMemo(() => {
    const candidate = matchingDraft?.language || wizardPrefill?.language || '';
    if (candidate && tutorOfferedLanguagesInit.includes(candidate)) return candidate;
    return tutorOfferedLanguagesInit[0] || 'English';
  }, [matchingDraft?.language, wizardPrefill?.language, tutorOfferedLanguagesInit]);

  const isFromWizard = Boolean(matchingDraft?.fromWizard || wizardPrefill?.fromWizard);
  const today = useMemo(() => localYmd(), []);
  const quickDates = useMemo(() => [
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addDaysYmd(1) },
    { label: 'In 2 days', value: addDaysYmd(2) },
  ], [today]);

  const [stepIndex, setStepIndex] = useState(() => {
    if (matchingDraft?.mode && typeof matchingDraft?.stepIndex === 'number') {
      return Math.min(1, Math.max(0, matchingDraft.stepIndex));
    }
    return 0;
  });

  const [form, setForm] = useState(() => ({
    mode: matchingDraft?.mode || '',
    course: prefilledCourse,
    topic: prefilledTopic || 'Concept Walkthrough',
    customTopic: matchingDraft?.customTopic || '',
    isNow: Boolean(matchingDraft?.isNow),
    preferredDate: matchingDraft?.preferredDate || addDaysYmd(1),
    preferredTime: matchingDraft?.preferredTime || '',
    durationHours: matchingDraft?.durationHours || 1,
    venueId: matchingDraft?.venueId || '',
    language: prefilledLanguage,
    helpNote: matchingDraft?.helpNote || '',
  }));

  // Progressive disclosure toggles on Details screen:
  // Prefilled fields start collapsed in an editable summary card; missing fields start expanded.
  const [editingCourse, setEditingCourse] = useState(() => !prefilledCourse);
  const [editingTopic, setEditingTopic] = useState(() => !(isFromWizard && prefilledTopic));
  const [editingLanguage, setEditingLanguage] = useState(() => !(isFromWizard && (wizardPrefill?.language || matchingDraft?.language)));
  const [showNoteInput, setShowNoteInput] = useState(() => Boolean(matchingDraft?.helpNote));

  const [stepError, setStepError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [confirmed, setConfirmed] = useState(null);

  // Live slots, tutor Now availability, tutor languages, & campus venues
  const [slots, setSlots] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availableNow, setAvailableNow] = useState(false);
  const [nowTtlMinutes, setNowTtlMinutes] = useState(5);
  const [offeredLanguages, setOfferedLanguages] = useState(tutorOfferedLanguagesInit);
  const [venues, setVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(false);

  const f2fRadioRef = useRef(null);
  const onlineRadioRef = useRef(null);
  const stepHeadingRef = useRef(null);

  // Persist booking draft in BookingDraftContext (in-memory + sessionStorage fallback)
  useEffect(() => {
    if (confirmed) return;
    const tutorKey = tutor?.id || tutor?.custom_id;
    if (!tutorKey) return;
    updateDraft({
      tutorKey,
      tutor,
      fromWizard: isFromWizard,
      stepIndex,
      ...form,
    });
  }, [tutor, isFromWizard, stepIndex, form, confirmed, updateDraft]);

  // Sync course if tutor subjects resolve asynchronously
  useEffect(() => {
    if (!form.course && prefilledCourse) {
      setForm((prev) => ({ ...prev, course: prefilledCourse }));
    }
  }, [prefilledCourse, form.course]);

  // Fetch live tutor slots, availableNow flag, and offered languages
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
      .then(({ slots: list, availableNow: canNow, nowTtlMinutes: ttl, languages }) => {
        if (!alive) return;
        const rows = Array.isArray(list) && list.length > 0
          ? list
          : DEFAULT_SLOTS.map((t) => ({ time: t, available: true, reason: null }));
        setSlots(rows);
        setAvailableNow(Boolean(canNow));
        if (ttl) setNowTtlMinutes(Number(ttl) || 5);
        if (Array.isArray(languages) && languages.length > 0) {
          setOfferedLanguages(languages);
          setForm((prev) => (languages.includes(prev.language) ? prev : { ...prev, language: languages[0] }));
        }
        if (!canNow && form.isNow) {
          setForm((prev) => ({ ...prev, isNow: false }));
        }
        if (form.preferredTime && !form.isNow) {
          const stillOpen = rows.find((s) => s.time === form.preferredTime && s.available);
          if (!stillOpen) {
            setForm((prev) => ({ ...prev, preferredTime: '' }));
          }
        }
      })
      .catch(() => {
        if (alive) {
          setSlots(DEFAULT_SLOTS.map((t) => ({ time: t, available: true, reason: null })));
          setAvailableNow(false);
        }
      })
      .finally(() => { if (alive) setSlotsLoading(false); });
    return () => { alive = false; };
  }, [tutor?.id, tutor?.custom_id, form.preferredDate, form.durationHours, form.mode, form.venueId]);

  // Fetch approved campus venues for Face to Face
  useEffect(() => {
    if (form.mode !== 'face_to_face') return undefined;
    let alive = true;
    setVenuesLoading(true);
    api.get('/venues', {
      ...(!form.isNow && form.preferredDate && form.preferredTime
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
  }, [form.mode, form.isNow, form.preferredDate, form.preferredTime, form.durationHours]);

  const updateField = (key, value) => {
    setStepError('');
    setSubmitError('');
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'mode' && value === 'online') {
        next.venueId = '';
      }
      if (key === 'isNow' && value === true) {
        next.preferredDate = today;
        next.preferredTime = '';
      }
      if (key === 'preferredDate' || key === 'preferredTime') {
        next.isNow = false;
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
    if (id === 'details') {
      if (!form.course) {
        setEditingCourse(true);
        return 'Pick one of this tutor’s subjects to continue.';
      }
      if (!resolvedTopic || resolvedTopic.length < 2) {
        setEditingTopic(true);
        return 'Choose a topic focus or enter at least 2 characters for a custom topic.';
      }
      if (!offeredLanguages.includes(form.language)) {
        setEditingLanguage(true);
        return `Pick a language this tutor offers (${offeredLanguages.join(', ')}).`;
      }
      if (!form.isNow) {
        if (!form.preferredDate) return 'Pick a date for your session.';
        if (form.preferredDate < today) return 'Choose today or a future date.';
        if (!form.preferredTime) return 'Tap an available time slot (or choose Now) to continue.';
      }
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

    setSubmitError('');
    const payload = {
      mode: form.mode,
      course: form.course,
      topic: resolvedTopic,
      isNow: form.isNow,
      preferredDate: form.isNow ? today : form.preferredDate,
      preferredTime: form.isNow ? undefined : form.preferredTime,
      durationHours: form.durationHours,
      venueId: form.mode === 'face_to_face' ? form.venueId : null,
      venueName: form.mode === 'face_to_face' ? selectedVenueObj?.name : 'Online · LCCB Live Classroom',
      language: form.language,
      note: form.helpNote.trim() ? form.helpNote.trim().slice(0, 300) : null,
    };

    try {
      const result = await onSubmit?.(payload);
      clearDraft();
      setConfirmed({
        ...payload,
        requestId: result?.id || null,
        expiresAt: result?.expires_at || null,
        preferredTime: result?.preferred_time || payload.preferredTime || 'Right now',
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

  // ─── SUCCESS STATE ───
  if (confirmed) {
    return (
      <div className="panel border-2 border-ink bg-card p-5 sm:p-7 shadow-[var(--nb-shadow)_var(--nb-shadow)_0_var(--color-ink)]">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center border-2 border-ink bg-emerald text-white shadow-[2px_2px_0_var(--color-ink)]">
            <CheckCircle2 className="h-6 w-6" strokeWidth={2.4} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[12px] font-extrabold uppercase tracking-wider text-emerald">
                {confirmed.isNow ? 'Instant request sent' : 'Request sent'}
              </p>
              {confirmed.isNow && (
                <span className="inline-flex items-center gap-1 border border-ink bg-gold px-1.5 py-0.5 text-[11px] font-extrabold text-ink">
                  <Zap className="h-3 w-3" /> {nowTtlMinutes}-min window
                </span>
              )}
            </div>
            <h2 className="mt-1 font-display text-[clamp(20px,5vw+4px,26px)] font-extrabold leading-tight tracking-[-0.03em] text-ink">
              Waiting for {tutor?.name} to respond
            </h2>
            <p className="mt-1 text-[14px] text-muted-foreground">
              {confirmed.isNow
                ? `${tutor?.name} received a high-priority alert and has ${nowTtlMinutes} minutes to accept. If it times out, we will notify you so you can pick a scheduled slot instead.`
                : 'Your tutor can accept or propose another time/venue. You will get a notification as soon as they respond.'}
            </p>
          </div>
        </div>

        <dl className="mt-5 grid gap-3 border-2 border-ink bg-surface-quiet p-4 text-[13px] sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Session mode</dt>
            <dd className="mt-1"><SessionModeBadge mode={confirmed.mode} /></dd>
          </div>
          <div>
            <dt className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {confirmed.mode === 'face_to_face' ? 'Approved campus venue' : 'Online classroom'}
            </dt>
            <dd className="mt-1 font-bold text-ink">{confirmed.venueDetail}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Subject &amp; topic</dt>
            <dd className="mt-1 font-bold text-ink">{confirmed.course} — {confirmed.topic}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">When</dt>
            <dd className="mt-1 font-bold text-ink">
              {confirmed.isNow
                ? `Now (starts on acceptance · ${durationLabel})`
                : `${formatPrettyDate(confirmed.preferredDate)} · ${confirmed.preferredTime} (${durationLabel})`}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
          {onBookAnother && (
            <Button
              type="button"
              variant="outline"
              onClick={onBookAnother}
              className="min-h-[44px] bg-paper font-bold"
            >
              Book another session
            </Button>
          )}
          <Button
            type="button"
            onClick={onDone || onCancel}
            className="min-h-[44px] font-extrabold"
          >
            Go to my dashboard
            <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={2.2} />
          </Button>
        </div>
      </div>
    );
  }

  const currentStep = BOOKING_STEPS[stepIndex];
  const hasCollapsedSummary = !editingCourse || !editingTopic || !editingLanguage;

  return (
    <div className="space-y-4">
      {/* Compact tutor context bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-surface-highlight px-3.5 py-2.5 shadow-[var(--nb-shadow-sm)_var(--nb-shadow-sm)_0_var(--color-ink)]">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={tutor?.name} src={tutor?.avatar} size="md" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-display text-[15px] font-extrabold text-ink">
                Booking with {tutor?.name}
              </p>
              {form.mode && <SessionModeBadge mode={form.mode} compact />}
            </div>
            <p className="truncate text-[12px] font-semibold text-ink/75">
              {tutor?.specialization || tutor?.program || 'Accredited Peer Tutor'}
              {user?.name ? ` · For ${user.name}${user.program ? ` (${user.program})` : ''}` : ''}
            </p>
          </div>
        </div>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="min-h-[44px] bg-paper text-[12px] font-bold"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" strokeWidth={2.2} />
            Change tutor
          </Button>
        )}
      </div>

      {/* 3-Step Progress Indicator */}
      <StepProgress
        steps={BOOKING_STEPS}
        currentIndex={stepIndex}
        interactive
        onStepClick={(idx) => {
          if (idx < stepIndex) goToStep(idx);
        }}
      />

      {/* Main Step Card */}
      <div className="panel panel-pad border-2 border-ink bg-card shadow-[var(--nb-shadow)_var(--nb-shadow)_0_var(--color-ink)]">
        <div className="mb-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
            Step {currentStep.num} of {BOOKING_STEPS.length}
          </p>
          <h2
            ref={stepHeadingRef}
            tabIndex={-1}
            className="mt-1 font-display text-[clamp(20px,5vw+4px,24px)] font-extrabold leading-tight tracking-[-0.03em] text-ink focus:outline-none"
          >
            {currentStep.title}
          </h2>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.16 }}
            className="space-y-5"
          >
            {/* ─── STEP 1: MODE ─── */}
            {currentStep.id === 'mode' && (
              <div>
                <p className="mb-4 text-[14px] text-muted-foreground">
                  Pick how you want to meet. Your choice decides whether you select a campus room or join the online classroom.
                </p>

                <div
                  role="radiogroup"
                  aria-label="Session mode"
                  onKeyDown={handleModeRadioKeyDown}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                >
                  <button
                    ref={f2fRadioRef}
                    type="button"
                    role="radio"
                    aria-checked={form.mode === 'face_to_face'}
                    onClick={() => updateField('mode', 'face_to_face')}
                    className={cn(
                      'group flex min-h-[168px] w-full flex-col justify-between border-2 border-ink p-4 text-left transition-[transform,box-shadow,background-color] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold',
                      form.mode === 'face_to_face'
                        ? 'bg-gold text-ink shadow-[var(--nb-shadow)_var(--nb-shadow)_0_var(--color-ink)] -translate-y-0.5'
                        : 'bg-paper text-ink shadow-[var(--nb-shadow-sm)_var(--nb-shadow-sm)_0_var(--color-ink)] hover:bg-surface-highlight hover:-translate-y-0.5',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <FaceToFaceIllustration />
                      <span
                        aria-hidden="true"
                        className={cn(
                          'grid h-7 w-7 shrink-0 place-items-center border-2 border-ink',
                          form.mode === 'face_to_face' ? 'bg-ink text-paper' : 'bg-paper',
                        )}
                      >
                        {form.mode === 'face_to_face' && <Check className="h-4 w-4" strokeWidth={2.6} />}
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="flex items-center gap-1.5 font-display text-[17px] font-extrabold leading-tight text-ink">
                        <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
                        Face to Face
                      </span>
                      <p className="mt-1 text-[13px] leading-snug text-ink/80">
                        Meet in person at an approved LCCB campus venue with QR code check-in.
                      </p>
                    </div>
                  </button>

                  <button
                    ref={onlineRadioRef}
                    type="button"
                    role="radio"
                    aria-checked={form.mode === 'online'}
                    onClick={() => updateField('mode', 'online')}
                    className={cn(
                      'group flex min-h-[168px] w-full flex-col justify-between border-2 border-ink p-4 text-left transition-[transform,box-shadow,background-color] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold',
                      form.mode === 'online'
                        ? 'bg-gold text-ink shadow-[var(--nb-shadow)_var(--nb-shadow)_0_var(--color-ink)] -translate-y-0.5'
                        : 'bg-paper text-ink shadow-[var(--nb-shadow-sm)_var(--nb-shadow-sm)_0_var(--color-ink)] hover:bg-surface-highlight hover:-translate-y-0.5',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <OnlineIllustration />
                      <span
                        aria-hidden="true"
                        className={cn(
                          'grid h-7 w-7 shrink-0 place-items-center border-2 border-ink',
                          form.mode === 'online' ? 'bg-ink text-paper' : 'bg-paper',
                        )}
                      >
                        {form.mode === 'online' && <Check className="h-4 w-4" strokeWidth={2.6} />}
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="flex items-center gap-1.5 font-display text-[17px] font-extrabold leading-tight text-ink">
                        <Video className="h-4 w-4 shrink-0" aria-hidden="true" />
                        Online
                      </span>
                      <p className="mt-1 text-[13px] leading-snug text-ink/80">
                        Join the built-in live video classroom and shared chat from any device.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 2: COMPACT DETAILS (PROGRESSIVE DISCLOSURE) ─── */}
            {currentStep.id === 'details' && (
              <div className="space-y-5">
                {/* Collapsed summary rows for anything already prefilled (always editable) */}
                {hasCollapsedSummary && (
                  <div className="border-2 border-ink bg-surface-quiet">
                    <div className="border-b border-ink/20 bg-surface-highlight px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-ink">
                      {isFromWizard ? 'Prefilled from your matches' : 'Selected details'}
                    </div>
                    {!editingCourse && form.course && (
                      <SummaryRow
                        label="Course"
                        value={`${form.course}${selectedSubjectObj?.name && selectedSubjectObj.name !== form.course ? ` · ${selectedSubjectObj.name}` : ''}`}
                        onEdit={() => setEditingCourse(true)}
                      />
                    )}
                    {!editingTopic && resolvedTopic && (
                      <SummaryRow
                        label="Topic focus"
                        value={resolvedTopic}
                        onEdit={() => setEditingTopic(true)}
                      />
                    )}
                    {!editingLanguage && form.language && (
                      <SummaryRow
                        label="Language"
                        value={form.language}
                        onEdit={() => setEditingLanguage(true)}
                      />
                    )}
                  </div>
                )}

                {/* Course picker (expanded if missing or editing; limited to tutor's subjects) */}
                {editingCourse && (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="field-label">Course</p>
                      {form.course && (
                        <button
                          type="button"
                          onClick={() => setEditingCourse(false)}
                          className="text-[12px] font-bold text-ink underline decoration-gold decoration-2"
                        >
                          Done
                        </button>
                      )}
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      Limited to courses {tutor?.name} is accredited to teach.
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Course">
                      {tutorSubjects.map((sub) => {
                        const selected = String(form.course).toUpperCase() === String(sub.code).toUpperCase();
                        return (
                          <button
                            key={sub.code}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => updateField('course', sub.code)}
                            className={cn(
                              'flex min-h-[48px] items-center justify-between gap-2 border-2 border-ink px-3.5 py-2 text-left transition-colors',
                              selected ? 'bg-gold font-bold text-ink shadow-[2px_2px_0_var(--color-ink)]' : 'bg-paper text-ink hover:bg-surface-highlight',
                            )}
                          >
                            <span className="min-w-0">
                              <span className="block font-display text-[14px] font-extrabold">{sub.code}</span>
                              {sub.name && sub.name !== sub.code && (
                                <span className="block truncate text-[12px] text-ink/75">{sub.name}</span>
                              )}
                            </span>
                            {selected && <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Topic picker (expanded if missing or editing) */}
                {editingTopic && (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="field-label">Topic focus</p>
                      {resolvedTopic && (
                        <button
                          type="button"
                          onClick={() => setEditingTopic(false)}
                          className="text-[12px] font-bold text-ink underline decoration-gold decoration-2"
                        >
                          Done
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Topic focus">
                      {TOPIC_CHIPS.map((chip) => {
                        const active = form.topic === chip.value;
                        return (
                          <button
                            key={chip.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => updateField('topic', chip.value)}
                            className={cn(
                              'min-h-[44px] border-2 border-ink px-3 py-1.5 text-[13px] font-bold transition-colors',
                              active ? 'bg-gold text-ink shadow-[2px_2px_0_var(--color-ink)]' : 'bg-paper text-ink hover:bg-surface-highlight',
                            )}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        role="radio"
                        aria-checked={form.topic === '__custom__'}
                        onClick={() => updateField('topic', '__custom__')}
                        className={cn(
                          'min-h-[44px] border-2 border-ink px-3 py-1.5 text-[13px] font-bold transition-colors',
                          form.topic === '__custom__' ? 'bg-gold text-ink shadow-[2px_2px_0_var(--color-ink)]' : 'bg-paper text-ink hover:bg-surface-highlight',
                        )}
                      >
                        Other topic…
                      </button>
                    </div>
                    {form.topic === '__custom__' && (
                      <div className="mt-2.5">
                        <label htmlFor="booking-custom-topic" className="sr-only">Custom topic</label>
                        <input
                          id="booking-custom-topic"
                          type="text"
                          maxLength={120}
                          value={form.customTopic}
                          onChange={(e) => updateField('customTopic', e.target.value)}
                          placeholder="e.g. Recursion & binary trees"
                          className="input-field"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Date & Time section (with instant "Now" chip first when available) */}
                <div>
                  <p className="field-label flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" aria-hidden="true" />
                    Date &amp; time
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    All times are in Philippine Time (Asia/Manila).
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {availableNow && (
                      <button
                        type="button"
                        aria-pressed={form.isNow}
                        onClick={() => updateField('isNow', true)}
                        className={cn(
                          'inline-flex min-h-[44px] items-center gap-1.5 border-2 border-ink px-3.5 text-[13px] font-extrabold transition-colors',
                          form.isNow
                            ? 'bg-emerald text-white shadow-[2px_2px_0_var(--color-ink)]'
                            : 'bg-gold text-ink shadow-[2px_2px_0_var(--color-ink)] hover:brightness-95',
                        )}
                      >
                        <Zap className="h-4 w-4 shrink-0" aria-hidden="true" />
                        Now
                      </button>
                    )}
                    {quickDates.map((q) => {
                      const active = !form.isNow && form.preferredDate === q.value;
                      return (
                        <button
                          key={q.value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => updateField('preferredDate', q.value)}
                          className={cn(
                            'min-h-[44px] border-2 border-ink px-3 text-[13px] font-bold transition-colors',
                            active ? 'bg-gold text-ink shadow-[2px_2px_0_var(--color-ink)]' : 'bg-paper text-ink hover:bg-surface-highlight',
                          )}
                        >
                          {q.label}
                        </button>
                      );
                    })}
                    <input
                      id="booking-date"
                      type="date"
                      min={today}
                      aria-label="Pick a specific date"
                      value={form.preferredDate}
                      onChange={(e) => updateField('preferredDate', e.target.value)}
                      className="input-field min-h-[44px] w-full sm:w-auto"
                    />
                  </div>

                  {/* Duration chips */}
                  <div className="mt-3">
                    <p className="text-[12px] font-bold text-muted-foreground">Duration</p>
                    <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Session duration">
                      {DURATIONS.map((d) => {
                        const active = form.durationHours === d.value;
                        return (
                          <button
                            key={d.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => updateField('durationHours', d.value)}
                            className={cn(
                              'min-h-[44px] border-2 border-ink px-3 text-[13px] font-bold',
                              active ? 'bg-gold text-ink shadow-[2px_2px_0_var(--color-ink)]' : 'bg-paper text-ink hover:bg-surface-highlight',
                            )}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Now notice OR scheduled slot picker */}
                  {form.isNow ? (
                    <div className="mt-3 border-l-4 border-emerald bg-surface-highlight px-3.5 py-3 text-[13px] text-ink">
                      <p className="font-bold">Instant session request</p>
                      <p className="mt-0.5 text-ink/80">
                        {tutor?.name} is available right now. They get a high-priority alert and have{' '}
                        <strong>{nowTtlMinutes} minutes</strong> to accept
                        {form.mode === 'face_to_face' ? ' once you pick a campus venue below.' : '.'}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-bold text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                          Available slots for {formatPrettyDate(form.preferredDate)}
                        </p>
                        {slotsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Time slot">
                        {(slots || []).map((slot) => {
                          const active = form.preferredTime === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              disabled={!slot.available}
                              onClick={() => updateField('preferredTime', slot.time)}
                              className={cn(
                                'min-h-[44px] border-2 px-2.5 text-[13px] font-bold transition-colors',
                                !slot.available
                                  ? 'cursor-not-allowed border-ink/20 bg-surface-quiet text-muted-foreground line-through'
                                  : active
                                    ? 'border-ink bg-gold text-ink shadow-[2px_2px_0_var(--color-ink)]'
                                    : 'border-ink bg-paper text-ink hover:bg-surface-highlight',
                              )}
                            >
                              {slot.time}
                            </button>
                          );
                        })}
                      </div>
                      {slots && slots.every((s) => !s.available) && (
                        <p className="mt-2 text-[13px] font-semibold text-destructive">
                          No open slots left on this day. Pick another date above.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Face to Face Approved Campus Venue picker */}
                {form.mode === 'face_to_face' && (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="field-label flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                        Approved campus venue
                      </p>
                      {venuesLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      For student safety, Face to Face sessions must meet at an approved campus space.
                    </p>
                    {venues.length === 0 && !venuesLoading ? (
                      <p className="mt-2 border-l-4 border-crimson bg-surface-alert px-3 py-2 text-[13px] font-semibold text-destructive">
                        No approved campus venues are currently active. Ask faculty or switch to Online mode.
                      </p>
                    ) : (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Campus venue">
                        {venues.map((v) => {
                          const selected = form.venueId === v.id;
                          const unavailable = v.available === false;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              disabled={unavailable}
                              onClick={() => updateField('venueId', v.id)}
                              className={cn(
                                'flex min-h-[52px] items-start justify-between gap-2 border-2 px-3 py-2 text-left',
                                unavailable
                                  ? 'cursor-not-allowed border-ink/20 bg-surface-quiet text-muted-foreground'
                                  : selected
                                    ? 'border-ink bg-gold text-ink shadow-[2px_2px_0_var(--color-ink)]'
                                    : 'border-ink bg-paper text-ink hover:bg-surface-highlight',
                              )}
                            >
                              <span className="min-w-0">
                                <span className="block text-[13px] font-extrabold leading-tight">{v.name}</span>
                                <span className="mt-0.5 block text-[11px] text-ink/70">
                                  {[v.building, v.room].filter(Boolean).join(' · ') || 'LCCB Campus'}
                                  {unavailable ? ' · Booked at this time' : ''}
                                </span>
                              </span>
                              {selected && <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Language picker (expanded if missing or editing; limited to tutor's offered languages) */}
                {editingLanguage && (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="field-label">Preferred language</p>
                      {form.language && (
                        <button
                          type="button"
                          onClick={() => setEditingLanguage(false)}
                          className="text-[12px] font-bold text-ink underline decoration-gold decoration-2"
                        >
                          Done
                        </button>
                      )}
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      Languages offered by {tutor?.name}.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Preferred language">
                      {offeredLanguages.map((lang) => {
                        const active = form.language === lang;
                        return (
                          <button
                            key={lang}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => updateField('language', lang)}
                            className={cn(
                              'min-h-[44px] border-2 border-ink px-3.5 text-[13px] font-bold',
                              active ? 'bg-gold text-ink shadow-[2px_2px_0_var(--color-ink)]' : 'bg-paper text-ink hover:bg-surface-highlight',
                            )}
                          >
                            {lang}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Progressive disclosure: optional note */}
                <div className="border-t border-ink/15 pt-3">
                  <button
                    type="button"
                    aria-expanded={showNoteInput}
                    onClick={() => setShowNoteInput((v) => !v)}
                    className="flex min-h-[44px] w-full items-center justify-between gap-2 text-left text-[13px] font-bold text-ink"
                  >
                    <span>
                      What do you need help with?{' '}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                    </span>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', showNoteInput && 'rotate-180')} />
                  </button>
                  {showNoteInput && (
                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {NOTE_EXAMPLES.map((ex, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => updateField('helpNote', ex)}
                            className="border border-ink/40 bg-surface-quiet px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-gold"
                          >
                            + {ex.slice(0, 36)}…
                          </button>
                        ))}
                      </div>
                      <label htmlFor="booking-help-note" className="sr-only">What you need help with</label>
                      <textarea
                        id="booking-help-note"
                        rows={2}
                        maxLength={MAX_NOTE_LEN}
                        value={form.helpNote}
                        onChange={(e) => updateField('helpNote', e.target.value)}
                        placeholder="One or two sentences so your tutor can prepare."
                        className="textarea-field"
                      />
                      <p className="text-right text-[11px] font-semibold text-muted-foreground">
                        {form.helpNote.length}/{MAX_NOTE_LEN}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── STEP 3: REVIEW & CONFIRM ─── */}
            {currentStep.id === 'review' && (
              <div className="space-y-4">
                <p className="text-[14px] text-muted-foreground">
                  Double-check your booking details before sending the request.
                </p>

                <div className="divide-y-2 divide-ink/15 border-2 border-ink bg-surface-quiet">
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Session mode</p>
                      <div className="mt-1"><SessionModeBadge mode={form.mode} /></div>
                    </div>
                    <button
                      type="button"
                      onClick={() => goToStep(0)}
                      className="inline-flex min-h-[36px] items-center gap-1 border-2 border-ink bg-paper px-2.5 text-[12px] font-bold text-ink hover:bg-gold"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Subject &amp; topic</p>
                      <p className="mt-0.5 font-bold text-ink">
                        {form.course}{selectedSubjectObj?.name && selectedSubjectObj.name !== form.course ? ` — ${selectedSubjectObj.name}` : ''}
                      </p>
                      <p className="text-[13px] text-muted-foreground">{resolvedTopic}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setEditingCourse(true); setEditingTopic(true); goToStep(1); }}
                      className="inline-flex min-h-[36px] shrink-0 items-center gap-1 border-2 border-ink bg-paper px-2.5 text-[12px] font-bold text-ink hover:bg-gold"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Date &amp; time</p>
                      <p className="mt-0.5 font-bold text-ink">
                        {form.isNow
                          ? `Now · Instant request (${nowTtlMinutes}m accept window) · ${durationLabel}`
                          : `${formatPrettyDate(form.preferredDate)} · ${form.preferredTime} · ${durationLabel}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => goToStep(1)}
                      className="inline-flex min-h-[36px] shrink-0 items-center gap-1 border-2 border-ink bg-paper px-2.5 text-[12px] font-bold text-ink hover:bg-gold"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        {form.mode === 'face_to_face' ? 'Campus venue' : 'Online platform'}
                      </p>
                      <p className="mt-0.5 font-bold text-ink">
                        {form.mode === 'face_to_face'
                          ? (selectedVenueObj?.name || 'Approved Campus Venue')
                          : 'Online · LCCB Live Classroom'}
                      </p>
                      <p className="text-[12px] text-muted-foreground">Language: {form.language}</p>
                      {form.helpNote.trim() && (
                        <p className="mt-1 text-[12px] italic text-ink/80">“{form.helpNote.trim()}”</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setEditingLanguage(true); goToStep(1); }}
                      className="inline-flex min-h-[36px] shrink-0 items-center gap-1 border-2 border-ink bg-paper px-2.5 text-[12px] font-bold text-ink hover:bg-gold"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-l-4 border-gold bg-surface-highlight px-3.5 py-2.5 text-[12px] text-ink">
                  <Award className="h-4 w-4 shrink-0 text-gold-ink" aria-hidden="true" />
                  <span>
                    Complete the session to earn <strong>+25 attendance points</strong> (tutor earns <strong>+50 pts</strong>).
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Inline validation / submit error — never wipes form */}
        {(stepError || submitError) && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 border-l-4 border-crimson bg-surface-alert px-3.5 py-2.5 text-[13px] font-semibold text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{stepError || submitError}</span>
          </div>
        )}
      </div>

      {/* Sticky mobile bottom action bar */}
      <div className="action-bar">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={submitting}
          className="flex-1 bg-paper font-bold sm:flex-none"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          {stepIndex === 0 ? 'Cancel' : 'Back'}
        </Button>
        <Button
          type="button"
          onClick={handleNext}
          disabled={submitting}
          className="flex-1 font-extrabold sm:flex-none"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {stepIndex === BOOKING_STEPS.length - 1
            ? (submitting ? 'Sending request…' : form.isNow ? 'Send instant request' : 'Confirm booking')
            : stepIndex === 0
              ? 'Continue to details'
              : 'Review booking'}
          {!submitting && <ArrowRight className="h-4 w-4" strokeWidth={2.2} />}
        </Button>
      </div>
    </div>
  );
}
