import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { ArrowRight, ArrowLeft, Loader2, Star, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../api';

const steps = [
  { id: 'goal', title: 'Academic goal' },
  { id: 'timeline', title: 'Timeline' },
  { id: 'course', title: 'Course' },
  { id: 'level', title: 'Current level' },
  { id: 'language', title: 'Language' },
  { id: 'availability', title: 'Availability' },
  { id: 'match', title: 'Matching' },
];

const GOALS = [
  { value: 'Prepare for Exams', label: 'Prepare for exams', desc: 'A focused pass over the topics most likely to appear.' },
  { value: 'Understand a specific topic', label: 'Understand a topic', desc: 'Slow down on one idea until it clicks.' },
  { value: 'Catch up on missed lessons', label: 'Catch up', desc: 'Cover what you missed and rebuild the foundation.' },
];

const TIMELINES = [
  { value: 'Within this week', label: 'This week', desc: 'The deadline is close; book the earliest window.' },
  { value: 'Before Midterms', label: 'Before midterms', desc: 'A steady block of sessions ahead of the exams.' },
  { value: 'Before Finals', label: 'Before finals', desc: 'Time to review broadly and close the gaps.' },
];

const LEVELS = [
  { value: 'Completely lost', label: 'Completely lost', desc: 'Start from the beginning; no question is too basic.' },
  { value: 'I know the basics', label: 'I know the basics', desc: 'Build on what you already understand.' },
  { value: 'I just need advanced review', label: 'Advanced review', desc: 'Push past the comfortable material.' },
];

const LANGUAGES = [
  { value: 'English', label: 'English', desc: 'Most sessions run in English.' },
  { value: 'Tagalog', label: 'Tagalog', desc: 'Explain the material in Tagalog.' },
  { value: 'Hiligaynon', label: 'Hiligaynon', desc: 'Explain the material in Hiligaynon.' },
];

const AVAILABILITY = [
  { value: 'Mon Morning', label: 'Mon morning' },
  { value: 'Tue Afternoon', label: 'Tue afternoon' },
  { value: 'Wed Evening', label: 'Wed evening' },
  { value: 'Thu Morning', label: 'Thu morning' },
  { value: 'Fri Afternoon', label: 'Fri afternoon' },
  { value: 'Sat Morning', label: 'Sat morning' },
];

function OptionRow({ label, desc, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex min-h-[96px] w-full items-start justify-between gap-4 border-2 border-ink p-4 text-left transition-[background-color,box-shadow,transform]',
        selected
          ? 'bg-gold shadow-[4px_4px_0_#0f2942]'
          : 'bg-paper hover:-translate-y-0.5 hover:bg-[#fff7d6] hover:shadow-[3px_3px_0_#0f2942]',
      )}
    >
      <span>
        <span className="font-display block text-[15px] font-bold leading-tight text-ink">{label}</span>
        {desc && <span className="mt-1 block text-[13px] leading-snug text-ink/70">{desc}</span>}
      </span>
      <span
        className={cn(
          'mt-0.5 grid h-5 w-5 shrink-0 place-items-center border-2 border-ink',
          selected ? 'bg-ink text-paper' : 'bg-paper',
        )}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={2.2} />}
      </span>
    </button>
  );
}

export default function LearnerWizard({ showToast }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState({});
  const [matching, setMatching] = useState(false);
  const [liveSubjects, setLiveSubjects] = useState(null);
  const [matches, setMatches] = useState(null);
  const [matchError, setMatchError] = useState(null);
  const [requesting, setRequesting] = useState(null);

  useEffect(() => {
    api.get('/subjects')
      .then(({ subjects }) => setLiveSubjects(subjects.filter(s => s.department === 'BSIT' || s.department === 'General')))
      .catch(() => setLiveSubjects([]));
  }, []);

  const subjectOptions = useMemo(
    () => (liveSubjects ?? []).map(s => ({ code: s.code, id: s.id })),
    [liveSubjects],
  );

  const nextStep = async () => {
    if (currentStep === steps.length - 2 && !matches) {
      setMatching(true);
      setMatchError(null);
      try {
        const apiCall = data.course && data.course !== 'Any'
          ? api.get('/tutors', { subject: data.course, available: '1' })
          : api.get('/tutors', { available: '1' });
        const [{ tutors }] = [await apiCall];
        await new Promise(resolve => setTimeout(resolve, 700));
        setMatches(tutors);
        setCurrentStep(s => s + 1);
        showToast(`Found ${tutors.length} accredited ${data.course || ''} matches.`, 'success');
      } catch (e) {
        setMatchError(e.message);
        showToast('Matching failed — please retry.', 'error');
      } finally {
        setMatching(false);
      }
    } else {
      setCurrentStep(s => Math.min(steps.length - 1, s + 1));
    }
  };

  const prevStep = () => setCurrentStep(s => Math.max(0, s - 1));

  const selectOption = (key, value) => {
    if (key === 'course') setMatches(null);
    setData(prev => ({ ...prev, [key]: value }));
  };

  const getMatches = () => matches ?? [];
  const isQuestionStep = currentStep < steps.length - 1;

  const questionTitle = {
    goal: 'What do you need help with?',
    timeline: 'When is your deadline?',
    course: 'Which course is this for?',
    level: 'How well do you know it now?',
    language: 'Which language should the session use?',
    availability: 'When can you meet?',
  }[steps[currentStep].id];

  const questionDetail = {
    goal: 'One sentence is enough. The matcher uses it to set the session topic.',
    timeline: 'This decides how the session is framed, not how many you can book.',
    course: 'Only BSIT and general subjects currently have accredited tutors.',
    level: 'Be honest here — the tutor will meet you where you are.',
    language: 'The tutor may not speak all three; the matcher shows availability.',
    availability: 'A preferred window, not a confirmed booking. The tutor confirms.',
  }[steps[currentStep].id];

  return (
    <div className="mx-auto w-full max-w-[880px]">
      <div className="section-head">
        <div>
          <h1 className="section-title">Find a tutor</h1>
          <p className="section-subtitle">Six questions, then a live list of accredited peers.</p>
        </div>
        {isQuestionStep && (
          <span className="num text-[13px] text-muted-foreground">
            {currentStep + 1} / {steps.length - 1}
          </span>
        )}
      </div>

      {isQuestionStep && (
        <div className="mb-8">
          <div className="h-3 w-full border-2 border-ink bg-paper">
            <motion.div
              className="h-full bg-gold"
              initial={false}
              animate={{ width: `${((currentStep) / (steps.length - 1)) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {matching ? (
          <motion.div
            key="matching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="panel p-8 text-center"
          >
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-ink" strokeWidth={1.6} />
            <h2 className="mt-4 font-display text-[22px] font-extrabold tracking-[-0.03em]">Reading the tutor file…</h2>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Checking verified peers for {data.course || 'any subject'} and your availability.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
          >
            {isQuestionStep && (
              <>
                <div className="mb-6">
                  <p className="inline-block border-2 border-ink bg-ink px-2 py-0.5 text-[13px] font-bold text-paper">{steps[currentStep].title}</p>
                  <h2 className="mt-3 font-display text-[26px] font-extrabold leading-tight tracking-[-0.035em]">{questionTitle}</h2>
                  <p className="mt-2 max-w-[58ch] text-[14px] text-muted-foreground">{questionDetail}</p>
                </div>

                {steps[currentStep].id === 'goal' && (
                  <div className="grid gap-2.5 md:grid-cols-3">
                    {GOALS.map(option => (
                      <OptionRow key={option.value} {...option} selected={data.goal === option.value} onClick={() => selectOption('goal', option.value)} />
                    ))}
                  </div>
                )}

                {steps[currentStep].id === 'timeline' && (
                  <div className="grid gap-2.5 md:grid-cols-3">
                    {TIMELINES.map(option => (
                      <OptionRow key={option.value} {...option} selected={data.timeline === option.value} onClick={() => selectOption('timeline', option.value)} />
                    ))}
                  </div>
                )}

                {steps[currentStep].id === 'course' && (
                  <div>
                    {liveSubjects === null && <p className="text-[14px] text-muted-foreground">Reading subjects…</p>}
                    {liveSubjects !== null && subjectOptions.length === 0 && (
                      <div className="panel empty">No subjects are available to match right now.</div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {subjectOptions.map(option => (
                        <button
                          key={option.code}
                          type="button"
                          onClick={() => selectOption('course', option.code)}
                          aria-pressed={data.course === option.code}
                          className={cn(
                            'h-10 border-2 border-ink px-4 text-[14px] font-bold shadow-[2px_2px_0_#0f2942] transition-[background-color,transform,box-shadow]',
                            data.course === option.code
                              ? 'bg-gold text-ink'
                              : 'bg-paper text-ink hover:-translate-y-0.5 hover:bg-[#fff7d6]',
                          )}
                        >
                          {option.code}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {steps[currentStep].id === 'level' && (
                  <div className="grid gap-2.5 md:grid-cols-3">
                    {LEVELS.map(option => (
                      <OptionRow key={option.value} {...option} selected={data.level === option.value} onClick={() => selectOption('level', option.value)} />
                    ))}
                  </div>
                )}

                {steps[currentStep].id === 'language' && (
                  <div className="grid gap-2.5 md:grid-cols-3">
                    {LANGUAGES.map(option => (
                      <OptionRow key={option.value} {...option} selected={data.language === option.value} onClick={() => selectOption('language', option.value)} />
                    ))}
                  </div>
                )}

                {steps[currentStep].id === 'availability' && (
                  <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                    {AVAILABILITY.map(option => (
                      <OptionRow key={option.value} {...option} selected={data.availability === option.value} onClick={() => selectOption('availability', option.value)} />
                    ))}
                  </div>
                )}
              </>
            )}

            {steps[currentStep].id === 'match' && (
              <div>
                <div className="mb-6">
                  <p className="inline-block border-2 border-ink bg-ink px-2 py-0.5 text-[13px] font-bold text-paper">Matching</p>
                  <h2 className="mt-3 font-display text-[26px] font-extrabold leading-tight tracking-[-0.035em]">
                    {getMatches().length > 0 ? `${getMatches().length} accredited ${data.course ? `for ${data.course}` : 'tutors'}` : 'The match list'}
                  </h2>
                  <p className="mt-2 max-w-[58ch] text-[14px] text-muted-foreground">
                    Request a session and the tutor confirms the final time. Every tutor here passed the qualification exam.
                  </p>
                </div>

                {matchError && (
                  <div className="panel mb-4 px-5 py-4">
                    <p className="text-[14px] text-crimson">Matching failed: {matchError}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setMatches(null)}>Try again</Button>
                  </div>
                )}

                {matches === null && !matchError && (
                  <div className="panel empty">No matches loaded yet. Go back and continue the questions.</div>
                )}

                {matches !== null && matches.length === 0 && !matchError && (
                  <div className="panel empty">No tutor matches this combination. Try another course or window.</div>
                )}

                {getMatches().length > 0 && (
                  <div className="panel overflow-hidden">
                    {getMatches().map(tutor => (
                      <div key={tutor.id} className="flex flex-col gap-4 border-b border-ink/15 p-5 last:border-0 sm:flex-row sm:items-center">
                        <span className="grid h-11 w-11 shrink-0 place-items-center border-2 border-ink bg-[#fff7d6] font-display text-[14px] font-bold text-ink">
                          {tutor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <h3 className="font-display text-[16px] font-bold text-ink">{tutor.name}</h3>
                            <span className="text-[13px] text-muted-foreground">Verified · {tutor.program}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Star className="h-3.5 w-3.5" strokeWidth={1.6} />
                              <span className="num">{tutor.stats?.rating ?? '—'}</span>
                            </span>
                            <span><span className="num">{tutor.stats?.sessions ?? 0}</span> sessions</span>
                            {Array.isArray(tutor.subjects) && (
                              <span className="text-ink/70">{tutor.subjects.map(s => s.code).join(' · ')}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          className="shrink-0"
                          disabled={requesting === tutor.id}
                          onClick={async () => {
                            setRequesting(tutor.id);
                            const fallbackDate = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
                            try {
                              await api.post('/session-requests', {
                                tutorId: tutor.id,
                                subjectId: (subjectOptions.find(s => s.code === data.course) || {}).id,
                                topic: data.goal || 'General review',
                                preferredDate: fallbackDate,
                                preferredTime: '3:30 PM',
                                note: data.level ? `Level: ${data.level} • Language: ${data.language || 'English'} • Preview: ${data.availability || ''}` : null,
                              });
                              showToast(`Session requested with ${tutor.name}.`, 'success');
                            } catch (err) {
                              showToast(err.message || 'Request failed', 'error');
                            } finally {
                              setRequesting(null);
                            }
                          }}
                        >
                          {requesting === tutor.id ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} /> : 'Request session'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {isQuestionStep && !matching && (
        <div className="mt-8 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={prevStep} disabled={currentStep === 0}>
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} /> Back
          </Button>
          <Button onClick={nextStep} disabled={!data[steps[currentStep].id] || matching}>
            {currentStep === steps.length - 2 ? 'Find matches' : 'Continue'}
            <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
          </Button>
        </div>
      )}
    </div>
  );
}
