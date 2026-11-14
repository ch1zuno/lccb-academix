import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, Award, Calendar, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar } from './ui/Avatar';
import { cn } from '../lib/utils';

export const GOALS = [
  { value: 'Prepare for Exams', label: 'Prepare for exams', desc: 'A focused pass over the topics most likely to appear.' },
  { value: 'Understand a specific topic', label: 'Understand a topic', desc: 'Slow down on one idea until it clicks.' },
  { value: 'Catch up on missed lessons', label: 'Catch up', desc: 'Cover what you missed and rebuild the foundation.' },
];

export const TIMELINES = [
  { value: 'Within this week', label: 'This week', desc: 'The deadline is close; book the earliest window.' },
  { value: 'Before Midterms', label: 'Before midterms', desc: 'A steady block of sessions ahead of the exams.' },
  { value: 'Before Finals', label: 'Before finals', desc: 'Time to review broadly and close the gaps.' },
];

export const ADVANCED_REVIEW_OPTIONS = [
  { value: 'Yes — I just need advanced review', label: 'Yes — Advanced review', desc: 'Push past the comfortable material into complex problems.' },
  { value: 'No — I know the basics', label: 'No — Build on basics', desc: 'Reinforce core concepts and practice standard problems.' },
  { value: 'No — Completely lost', label: 'No — Start from scratch', desc: 'Start from the very beginning; no question is too basic.' },
];

export const LANGUAGES = [
  { value: 'English', label: 'English', desc: 'Most sessions run in English.' },
  { value: 'Tagalog', label: 'Tagalog', desc: 'Explain the material in Tagalog.' },
  { value: 'Hiligaynon', label: 'Hiligaynon', desc: 'Explain the material in Hiligaynon.' },
];

export const SCHEDULES = [
  { value: 'Mon Morning', label: 'Mon morning' },
  { value: 'Tue Afternoon', label: 'Tue afternoon' },
  { value: 'Wed Evening', label: 'Wed evening' },
  { value: 'Thu Morning', label: 'Thu morning' },
  { value: 'Fri Afternoon', label: 'Fri afternoon' },
  { value: 'Sat Morning', label: 'Sat morning' },
];

function OptionCard({ label, desc, badge, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex min-h-[88px] w-full items-start justify-between gap-4 border-2 border-ink p-4 text-left transition-[background-color,box-shadow,transform]',
        selected
          ? 'bg-gold text-ink shadow-[4px_4px_0_var(--color-ink)]'
          : 'bg-paper text-ink hover:-translate-y-0.5 hover:bg-surface-highlight hover:shadow-[3px_3px_0_var(--color-ink)]'
      )}
    >
      <span className="min-w-0">
        {badge && (
          <span className="mb-1 inline-block border border-ink bg-surface-quiet px-1.5 py-0.5 text-[11px] font-extrabold text-ink">
            {badge}
          </span>
        )}
        <span className="font-display block text-[15px] font-bold leading-tight text-ink">
          {label}
        </span>
        {desc && (
          <span className="mt-1 block text-[13px] leading-snug text-ink/75">
            {desc}
          </span>
        )}
      </span>
      <span
        className={cn(
          'mt-0.5 grid h-5 w-5 shrink-0 place-items-center border-2 border-ink',
          selected ? 'bg-ink text-paper' : 'bg-paper'
        )}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={2.4} />}
      </span>
    </button>
  );
}

/**
 * Shared Booking Questions Form used by both Flow A (Subject Search -> Matchmaking -> Book)
 * and Flow B (Tutor Search -> Tutor Public Profile -> Book).
 *
 * @param {object} props
 * @param {object} props.tutor - The tutor or faculty specialist being booked
 * @param {boolean} [props.skipCourse=false] - True in Flow A (Course already chosen); False in Flow B
 * @param {string} [props.selectedCourse=''] - Pre-selected course code in Flow A
 * @param {Array} [props.subjects=[]] - The specific tutor's subjects array (used in Flow B)
 * @param {function} props.onSubmit - Called with { goal, timeline, level, language, availability, course }
 * @param {function} props.onCancel - Called when learner cancels or goes back
 * @param {boolean} [props.submitting=false] - Loading state while submitting booking
 */
export default function BookingQuestionsForm({
  tutor,
  skipCourse = false,
  selectedCourse = '',
  subjects = [],
  onSubmit,
  onCancel,
  submitting = false,
}) {
  // Normalize tutor's own subjects for Flow B
  const tutorSubjects = useMemo(() => {
    const raw = Array.isArray(subjects) && subjects.length > 0
      ? subjects
      : Array.isArray(tutor?.subjects)
      ? tutor.subjects
      : [];
    return raw.map((s) =>
      typeof s === 'string'
        ? { code: s, name: s, department: '' }
        : { id: s.id, code: s.code, name: s.name || s.code, department: s.department || '' }
    );
  }, [subjects, tutor?.subjects]);

  const formSteps = useMemo(() => {
    const list = [
      {
        id: 'goal',
        title: 'Academic goal',
        question: 'What do you need help with?',
        detail: 'One choice is enough. This sets the main topic for your tutoring session.',
      },
      {
        id: 'timeline',
        title: 'Timeline',
        question: 'When is your deadline?',
        detail: 'This helps your tutor pace the session for your upcoming exam or requirement.',
      },
      {
        id: 'level',
        title: 'Advanced review',
        question: 'Do you need advanced review or foundational help?',
        detail: 'Be honest here — your tutor will tailor the session depth to match.',
      },
      {
        id: 'language',
        title: 'Language',
        question: 'Which language should the session use?',
        detail: 'Choose the language you are most comfortable learning in.',
      },
      {
        id: 'availability',
        title: 'Schedule',
        question: 'When can you meet?',
        detail: 'Select your preferred schedule window. Your tutor will confirm the final slot.',
      },
    ];

    if (!skipCourse) {
      list.push({
        id: 'course',
        title: 'Course',
        question: `Which of ${tutor?.name || 'this tutor'}'s subjects are you booking?`,
        detail: 'Only the subjects this specific tutor teaches or specializes in are listed below.',
      });
    }

    return list;
  }, [skipCourse, tutor?.name]);

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState(() => ({
    goal: '',
    timeline: '',
    level: '',
    language: '',
    availability: '',
    course: skipCourse
      ? selectedCourse || tutorSubjects[0]?.code || ''
      : tutorSubjects.length === 1
      ? tutorSubjects[0].code
      : '',
  }));

  const currentStep = formSteps[stepIndex] || formSteps[0];
  const isLastStep = stepIndex === formSteps.length - 1;
  const currentVal = answers[currentStep.id];

  const selectAnswer = (key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (!currentVal) return;
    if (isLastStep) {
      const finalCourse = skipCourse
        ? selectedCourse || answers.course || tutorSubjects[0]?.code
        : answers.course || tutorSubjects[0]?.code;
      onSubmit?.({
        ...answers,
        course: finalCourse,
      });
    } else {
      setStepIndex((i) => Math.min(formSteps.length - 1, i + 1));
    }
  };

  const handlePrev = () => {
    if (stepIndex === 0) {
      onCancel?.();
    } else {
      setStepIndex((i) => Math.max(0, i - 1));
    }
  };

  return (
    <div className="panel border-2 border-ink bg-card p-5 sm:p-7 shadow-[4px_4px_0_var(--color-ink)]">
      {/* Selected Tutor & Flow Summary Banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink bg-surface-quiet p-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={tutor?.name || 'Tutor'} src={tutor?.avatar} size="md" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-[16px] font-extrabold text-ink truncate">
                Booking with {tutor?.name || 'Tutor'}
              </span>
              {tutor?.role === 'faculty' ? (
                <span className="inline-flex items-center gap-1 border border-ink bg-ink px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-gold">
                  <Award className="h-3 w-3 text-gold" /> Faculty Specialist
                </span>
              ) : (
                <span className="border border-ink bg-gold px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-ink">
                  Verified Tutor
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[12px] text-muted-foreground truncate">
              {skipCourse && (selectedCourse || answers.course) ? (
                <>
                  Subject pre-selected: <strong className="text-ink">{selectedCourse || answers.course}</strong> (Course question skipped)
                </>
              ) : (
                tutor?.specialization || tutor?.program || tutor?.title || 'Complete the booking questions below'
              )}
            </p>
          </div>
        </div>

        <span className="num border-2 border-ink bg-paper px-2.5 py-1 text-[12px] font-extrabold text-ink">
          Question {stepIndex + 1} / {formSteps.length}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 h-3 w-full border-2 border-ink bg-paper">
        <motion.div
          className="h-full bg-gold"
          initial={false}
          animate={{ width: `${((stepIndex + 1) / formSteps.length) * 100}%` }}
          transition={{ duration: 0.25 }}
        />
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.16 }}
        >
          <div className="mb-5">
            <span className="inline-block border-2 border-ink bg-ink px-2.5 py-0.5 text-[12px] font-bold uppercase tracking-wider text-paper">
              {currentStep.title}
            </span>
            <h2 className="mt-2.5 font-display text-[22px] sm:text-[25px] font-extrabold leading-tight tracking-[-0.03em] text-ink">
              {currentStep.question}
            </h2>
            <p className="mt-1.5 max-w-[58ch] text-[13px] sm:text-[14px] text-muted-foreground">
              {currentStep.detail}
            </p>
          </div>

          {currentStep.id === 'goal' && (
            <div className="grid gap-2.5 md:grid-cols-3">
              {GOALS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  label={opt.label}
                  desc={opt.desc}
                  selected={answers.goal === opt.value}
                  onClick={() => selectAnswer('goal', opt.value)}
                />
              ))}
            </div>
          )}

          {currentStep.id === 'timeline' && (
            <div className="grid gap-2.5 md:grid-cols-3">
              {TIMELINES.map((opt) => (
                <OptionCard
                  key={opt.value}
                  label={opt.label}
                  desc={opt.desc}
                  selected={answers.timeline === opt.value}
                  onClick={() => selectAnswer('timeline', opt.value)}
                />
              ))}
            </div>
          )}

          {currentStep.id === 'level' && (
            <div className="grid gap-2.5 md:grid-cols-3">
              {ADVANCED_REVIEW_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  label={opt.label}
                  desc={opt.desc}
                  selected={answers.level === opt.value}
                  onClick={() => selectAnswer('level', opt.value)}
                />
              ))}
            </div>
          )}

          {currentStep.id === 'language' && (
            <div className="grid gap-2.5 md:grid-cols-3">
              {LANGUAGES.map((opt) => (
                <OptionCard
                  key={opt.value}
                  label={opt.label}
                  desc={opt.desc}
                  selected={answers.language === opt.value}
                  onClick={() => selectAnswer('language', opt.value)}
                />
              ))}
            </div>
          )}

          {currentStep.id === 'availability' && (
            <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {SCHEDULES.map((opt) => (
                <OptionCard
                  key={opt.value}
                  label={opt.label}
                  selected={answers.availability === opt.value}
                  onClick={() => selectAnswer('availability', opt.value)}
                />
              ))}
            </div>
          )}

          {currentStep.id === 'course' && !skipCourse && (
            <div>
              {tutorSubjects.length === 0 ? (
                <div className="border-2 border-ink bg-surface-quiet p-6 text-center text-[14px] text-muted-foreground">
                  No specialized subjects listed for this tutor.
                </div>
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {tutorSubjects.map((sub) => (
                    <OptionCard
                      key={sub.code}
                      badge={sub.department || 'Subject'}
                      label={sub.code}
                      desc={sub.name}
                      selected={answers.course === sub.code}
                      onClick={() => selectAnswer('course', sub.code)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Footer */}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink/15 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrev}
          disabled={submitting}
          className="min-h-[44px] font-bold"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" strokeWidth={2} />
          {stepIndex === 0 ? 'Cancel' : 'Back'}
        </Button>

        <Button
          type="button"
          onClick={handleNext}
          disabled={!currentVal || submitting}
          className="min-h-[44px] px-5 font-extrabold shadow-[3px_3px_0_var(--color-ink)]"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Booking…
            </>
          ) : isLastStep ? (
            <>
              <Calendar className="mr-1.5 h-4 w-4" /> Confirm & Book Session
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

