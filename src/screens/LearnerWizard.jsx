import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Star,
  Check,
  Search,
  BookOpen,
  UserCheck,
  Sparkles,
  X,
  ChevronRight,
} from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import StepProgress from '../components/ui/StepProgress';
import LoadState from '../components/ui/LoadState';
import { cn } from '../lib/utils';
import { addDaysYmd } from '../lib/dates';
import { friendlyError } from '../lib/ux';
import MatchmakingAnimation from '../components/MatchmakingAnimation';
import BookingQuestionsForm from '../components/BookingQuestionsForm';
import { useBookingDraft } from '../context/BookingDraftContext';
import {
  SUBJECTS as MOCK_SUBJECTS,
  TUTORS as MOCK_TUTORS,
  filterSubjects,
  filterTutors,
  getAvailableTutorsForSubject,
  findMockMentorById,
} from '../data';
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
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'flex min-h-[64px] w-full items-start justify-between gap-3 border-2 border-ink p-3.5 text-left transition-[background-color,box-shadow,transform] sm:min-h-[84px] sm:p-4',
        selected
          ? 'bg-gold shadow-[var(--nb-shadow)_var(--nb-shadow)_0_var(--color-ink)]'
          : 'bg-paper hover:-translate-y-0.5 hover:bg-surface-highlight hover:shadow-[var(--nb-shadow-sm)_var(--nb-shadow-sm)_0_var(--color-ink)]',
      )}
    >
      <span className="min-w-0">
        <span className="font-display block text-[15px] font-bold leading-tight text-ink">{label}</span>
        {desc && <span className="mt-1 block text-[13px] leading-snug text-ink/75">{desc}</span>}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 grid h-6 w-6 shrink-0 place-items-center border-2 border-ink',
          selected ? 'bg-ink text-paper' : 'bg-paper',
        )}
      >
        {selected && <Check className="h-3.5 w-3.5" strokeWidth={2.4} />}
      </span>
    </button>
  );
}

export default function LearnerWizard({ user, showToast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { draft, clearDraft } = useBookingDraft();
  const prefilledTutor = location.state?.prefilledTutor;
  const prefilledTutorId = searchParams.get('tutorId') || prefilledTutor?.id;

  // Original 6-step main frame wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState({});
  const [liveSubjects, setLiveSubjects] = useState(null);
  const [subjectsError, setSubjectsError] = useState(null);
  const [liveTutors, setLiveTutors] = useState([]);
  const [matches, setMatches] = useState(null);
  const [requesting, setRequesting] = useState(null);

  // Compact single search control with Subject / Tutor name toggle
  const [searchBy, setSearchBy] = useState('subject'); // 'subject' | 'tutor'
  const [subjectQuery, setSubjectQuery] = useState('');
  const [tutorQuery, setTutorQuery] = useState('');

  // Search-triggered flows:
  // null = show the original main-frame 6-step wizard
  // 'subject-matchmaking' = Matchmaking screen opened by clicking a subject in [ Search subject ] results
  // 'booking-form' = Shared BookingQuestionsForm opened after picking a tutor from Subject Search (skipCourse=true) or Tutor Profile (skipCourse=false)
  const [searchFlowMode, setSearchFlowMode] = useState(() => (draft?.tutor && !prefilledTutor && !prefilledTutorId ? 'booking-form' : null));
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState(() => (draft?.tutor && !prefilledTutor && !prefilledTutorId ? draft.tutor : null));
  const [fromWizardFlow, setFromWizardFlow] = useState(() => Boolean(draft?.fromWizard));
  const [skipCourse, setSkipCourse] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);

  const loadDirectory = () => {
    setSubjectsError(null);
    api
      .get('/subjects')
      .then(({ subjects }) => setLiveSubjects(subjects || []))
      .catch((err) => {
        setLiveSubjects([]);
        setSubjectsError(friendlyError(err, "We couldn't load the live subject list. Try again."));
      });

    Promise.allSettled([
      api.get('/tutors'),
      api.get('/tutors', { role: 'faculty' }),
    ]).then(([peerRes, facRes]) => {
      const peers = peerRes.status === 'fulfilled' ? (peerRes.value?.tutors || []) : [];
      const faculty = facRes.status === 'fulfilled' ? (facRes.value?.tutors || []) : [];
      setLiveTutors([...peers, ...faculty]);
    });
  };

  // Sync live subject & tutor UUIDs from backend while keeping src/data.js for instant search
  useEffect(() => {
    loadDirectory();
  }, []);

  // Merge src/data.js subjects with live DB IDs
  const allSubjects = useMemo(() => {
    const liveList = liveSubjects || [];
    const byCode = new Map(liveList.map((s) => [String(s.code).toUpperCase(), s]));
    const merged = MOCK_SUBJECTS.map((mockSub) => {
      const live = byCode.get(String(mockSub.code).toUpperCase());
      return live ? { ...mockSub, id: live.id } : mockSub;
    });
    liveList.forEach((live) => {
      if (!merged.some((m) => String(m.code).toUpperCase() === String(live.code).toUpperCase())) {
        merged.push(live);
      }
    });
    return merged;
  }, [liveSubjects]);

  // Merge src/data.js tutors with live DB IDs
  const allTutors = useMemo(() => {
    const byCustomId = new Map();
    const byName = new Map();
    liveTutors.forEach((lt) => {
      if (lt.custom_id) byCustomId.set(String(lt.custom_id).toUpperCase(), lt);
      if (lt.name) byName.set(String(lt.name).toLowerCase(), lt);
    });

    return MOCK_TUTORS.map((mockTutor) => {
      const live =
        byCustomId.get(String(mockTutor.custom_id || mockTutor.id).toUpperCase()) ||
        byName.get(String(mockTutor.name).toLowerCase());
      if (!live) return mockTutor;
      return {
        ...mockTutor,
        id: live.id || mockTutor.id,
        custom_id: live.custom_id || mockTutor.custom_id,
        is_available: live.is_available ?? mockTutor.is_available,
        is_verified: live.is_verified ?? mockTutor.is_verified,
        languages: Array.isArray(live.languages) && live.languages.length > 0 ? live.languages : mockTutor.languages,
        subjects:
          Array.isArray(live.subjects) && live.subjects.length > 0
            ? live.subjects
            : mockTutor.subjects,
      };
    });
  }, [liveTutors]);

  // When arriving from a Tutor Public Profile ("Book" button), open the Shared Booking Questions Form
  // with skipCourse={false} and subjects={tutor.subjects}
  useEffect(() => {
    const enrichTutor = (raw) => {
      if (!raw) return null;
      const mockMatch =
        findMockMentorById(raw.custom_id || raw.id) ||
        allTutors.find((t) => t.name?.toLowerCase() === raw.name?.toLowerCase());
      const mergedSubjects =
        Array.isArray(raw.subjects) && raw.subjects.length > 0
          ? raw.subjects
          : mockMatch?.subjects || [];
      return {
        ...mockMatch,
        ...raw,
        specialization: raw.specialization || mockMatch?.specialization,
        subjects: mergedSubjects,
      };
    };

    if (prefilledTutor) {
      const enriched = enrichTutor(prefilledTutor);
      setSelectedTutor(enriched);
      setFromWizardFlow(false);
      setSkipCourse(false);
      setSearchFlowMode('booking-form');
    } else if (prefilledTutorId) {
      const localMatch = findMockMentorById(prefilledTutorId);
      api
        .get(`/tutors/${prefilledTutorId}`)
        .then(({ profile, tutorId, customId }) => {
          const enriched = enrichTutor({
            id: tutorId || prefilledTutorId,
            custom_id: customId || profile?.custom_id,
            name: profile.name,
            role: profile.role,
            program: profile.program || profile.title || profile.department,
            specialization: profile.specialization,
            languages: profile.languages,
            subjects: profile.subjects,
            avatar: profile.avatar,
            stats: profile.stats,
          });
          setSelectedTutor(enriched);
          setFromWizardFlow(false);
          setSkipCourse(false);
          setSearchFlowMode('booking-form');
        })
        .catch(() => {
          if (localMatch) {
            setSelectedTutor(localMatch);
            setFromWizardFlow(false);
            setSkipCourse(false);
            setSearchFlowMode('booking-form');
          }
        });
    }
  }, [prefilledTutor, prefilledTutorId, allTutors]);

  // Live filtered search results (only shown when user types in the search bars)
  const hasSubjectSearch = subjectQuery.trim().length > 0;
  const hasTutorSearch = tutorQuery.trim().length > 0;

  // Close search overlay on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && (subjectQuery || tutorQuery)) {
        setSubjectQuery('');
        setTutorQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [subjectQuery, tutorQuery]);

  const filteredSubjects = useMemo(
    () => (hasSubjectSearch ? filterSubjects(allSubjects, subjectQuery) : []),
    [allSubjects, subjectQuery, hasSubjectSearch]
  );

  const filteredTutors = useMemo(
    () => (hasTutorSearch ? filterTutors(allTutors, tutorQuery) : []),
    [allTutors, tutorQuery, hasTutorSearch]
  );

  const subjectOptions = useMemo(
    () => allSubjects.map((s) => ({ code: s.code, name: s.name, department: s.department, id: s.id })),
    [allSubjects]
  );

  // Original 6-step wizard navigation
  const nextStep = () => {
    setCurrentStep((s) => Math.min(steps.length - 1, s + 1));
  };

  const prevStep = () => setCurrentStep((s) => Math.max(0, s - 1));

  const selectOption = (key, value) => {
    if (key === 'course') setMatches(null);
    setData((prev) => ({ ...prev, [key]: value }));
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
    course: 'All LCCB courses with accredited peer tutors or faculty specialists.',
    level: 'Be honest here — the tutor will meet you where you are.',
    language: 'The tutor may not speak all three; the matcher shows availability.',
    availability: 'A preferred window, not a confirmed booking. The tutor confirms.',
  }[steps[currentStep].id];

  // Subject Search Bar -> Tapping a subject or "Find tutor" opens Matchmaking screen
  const handleSelectSubjectFromSearch = (subject) => {
    setSelectedSubject(subject);
    setSubjectQuery('');
    setSearchFlowMode('subject-matchmaking');
  };

  // Matchmaking screen (from Subject Search) -> Tapping "Book" opens Shared Booking Form with skipCourse={true}
  const handleBookFromSubjectMatchmaking = (tutor, { viaWizard = false } = {}) => {
    const mockMatch = findMockMentorById(tutor.custom_id || tutor.id);
    const liveMatch = liveTutors.find((lt) => lt.id === tutor.id || lt.custom_id === tutor.custom_id);
    setSelectedTutor({
      ...mockMatch,
      ...liveMatch,
      ...tutor,
      languages: liveMatch?.languages || tutor.languages || mockMatch?.languages,
      subjects:
        Array.isArray(tutor.subjects) && tutor.subjects.length > 0
          ? tutor.subjects
          : liveMatch?.subjects || mockMatch?.subjects || (selectedSubject ? [selectedSubject] : []),
    });
    setFromWizardFlow(viaWizard);
    setSkipCourse(true);
    setSearchFlowMode('booking-form');
  };

  // Submit handler for unified 5-step Booking Form
  const handleBookingQuestionsSubmit = async (answers) => {
    if (!selectedTutor) return null;
    setSubmittingBooking(true);

    const chosenCourseCode =
      answers.course || selectedSubject?.code || selectedTutor.subjects?.[0]?.code;

    const matchedSubjectObj =
      allSubjects.find(
        (s) => String(s.code).toUpperCase() === String(chosenCourseCode || '').toUpperCase(),
      ) ||
      selectedTutor.subjects?.find(
        (s) => String(s.code).toUpperCase() === String(chosenCourseCode || '').toUpperCase(),
      ) ||
      selectedSubject ||
      selectedTutor.subjects?.[0];

    const liveTutorMatch = liveTutors.find(
      (lt) =>
        lt.id === selectedTutor.id ||
        (lt.custom_id &&
          String(lt.custom_id).toUpperCase() ===
            String(selectedTutor.custom_id || selectedTutor.id).toUpperCase()) ||
        (lt.name && lt.name.toLowerCase() === String(selectedTutor.name || '').toLowerCase()),
    );

    const resolvedTutorId = liveTutorMatch?.id || selectedTutor.id;
    const resolvedSubjectId = matchedSubjectObj?.id;

    try {
      if (!resolvedSubjectId || String(resolvedSubjectId).startsWith('sub-')) {
        throw new Error('Could not resolve the course record yet. Reload the page and try again.');
      }
      const res = await api.post('/session-requests', {
        tutorId: resolvedTutorId,
        subjectId: resolvedSubjectId,
        mode: answers.mode,
        venueId: answers.mode === 'face_to_face' ? answers.venueId : undefined,
        topic: answers.topic || 'Concept Walkthrough',
        language: answers.language || 'English',
        isNow: Boolean(answers.isNow),
        preferredDate: answers.isNow ? undefined : (answers.preferredDate || addDaysYmd(1)),
        preferredTime: answers.isNow ? undefined : (answers.preferredTime || '3:00 PM'),
        durationHours: answers.durationHours || 1,
        note: answers.note || null,
      });
      const created = res?.request ?? null;
      showToast?.(
        `Session request sent to ${selectedTutor.name} (${chosenCourseCode || 'selected course'}).`,
        'success',
      );
      return created;
    } catch (err) {
      showToast?.(err.message || 'Booking request failed', 'error');
      throw err;
    } finally {
      setSubmittingBooking(false);
    }
  };

  const questionSteps = steps.slice(0, steps.length - 1);
  const activeQuery = searchBy === 'subject' ? subjectQuery : tutorQuery;
  const setActiveQuery = (val) => {
    if (searchBy === 'subject') {
      setSubjectQuery(val);
      if (val) setTutorQuery('');
    } else {
      setTutorQuery(val);
      if (val) setSubjectQuery('');
    }
    if (searchFlowMode) setSearchFlowMode(null);
  };

  return (
    <div className="mx-auto w-full max-w-[880px]">
      {/* Header */}
      <div className="section-head">
        <div>
          <h1 className="section-title">Find a tutor</h1>
          <p className="section-subtitle">6 quick questions, then your matches.</p>
        </div>
      </div>

      {/* Compact single search control with Subject / Tutor name toggle */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <div
            role="radiogroup"
            aria-label="Search by"
            className="grid shrink-0 grid-cols-2 border-2 border-ink bg-paper sm:w-auto"
          >
            <button
              type="button"
              role="radio"
              aria-checked={searchBy === 'subject'}
              onClick={() => {
                setSearchBy('subject');
                setTutorQuery('');
              }}
              className={cn(
                'flex min-h-11 items-center justify-center gap-1.5 border-r-2 border-ink px-3 text-[13px] font-bold transition-colors',
                searchBy === 'subject' ? 'bg-gold text-ink' : 'bg-paper text-muted-foreground hover:bg-surface-highlight hover:text-ink',
              )}
            >
              <BookOpen className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
              Subject
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={searchBy === 'tutor'}
              onClick={() => {
                setSearchBy('tutor');
                setSubjectQuery('');
              }}
              className={cn(
                'flex min-h-11 items-center justify-center gap-1.5 px-3 text-[13px] font-bold transition-colors',
                searchBy === 'tutor' ? 'bg-gold text-ink' : 'bg-paper text-muted-foreground hover:bg-surface-highlight hover:text-ink',
              )}
            >
              <UserCheck className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
              Tutor name
            </button>
          </div>

          <div className="relative flex min-w-0 flex-1 items-center">
            <Search
              className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground"
              strokeWidth={2}
              aria-hidden="true"
            />
            <input
              id="tutor-tab-search"
              type="search"
              value={activeQuery}
              onChange={(e) => setActiveQuery(e.target.value)}
              placeholder={searchBy === 'subject' ? 'e.g. Calculus, PROG 201' : 'e.g. Angela, Mark'}
              aria-label={searchBy === 'subject' ? 'Search by subject' : 'Search by tutor name'}
              className="min-h-11 w-full border-2 border-ink bg-paper pl-9 pr-11 text-[14px] font-medium text-ink placeholder:text-muted-foreground focus-visible:outline-none focus-visible:shadow-[var(--nb-shadow-sm)_var(--nb-shadow-sm)_0_var(--color-gold)]"
            />
            {activeQuery && (
              <button
                type="button"
                onClick={() => { setSubjectQuery(''); setTutorQuery(''); }}
                aria-label="Clear search"
                className="absolute right-0 grid h-11 w-11 min-h-[44px] min-w-[44px] place-items-center text-muted-foreground hover:text-ink"
              >
                <X className="h-4 w-4" strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── SEARCH-TRIGGERED VIEW 1: MATCHMAKING FROM SUBJECT SEARCH BAR ─── */}
      {searchFlowMode === 'subject-matchmaking' && selectedSubject && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-surface-highlight px-4 py-3 shadow-[3px_3px_0_var(--color-ink)]">
            <div className="flex items-center gap-2 text-[13px] font-bold text-ink">
              <span className="border border-ink bg-ink px-2 py-0.5 text-[11px] font-extrabold uppercase text-gold">
                {selectedSubject.code}
              </span>
              <span>{selectedSubject.name}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchFlowMode(null);
                setSelectedSubject(null);
              }}
              className="min-h-[36px] text-[12px] font-bold"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" strokeWidth={2} />
              Back to Find a tutor
            </Button>
          </div>

          <MatchmakingAnimation
            course={selectedSubject.code}
            availability=""
            goal={`Tutoring for ${selectedSubject.code} (${selectedSubject.name})`}
            onCancel={() => {
              setSearchFlowMode(null);
              setSelectedSubject(null);
            }}
            onRequestSession={handleBookFromSubjectMatchmaking}
            requestingId={null}
            navigate={navigate}
          />
        </div>
      )}

      {/* ─── SEARCH-TRIGGERED VIEW 2: STREAMLINED 3-STEP BOOKING FORM ─── */}
      {searchFlowMode === 'booking-form' && selectedTutor && (
        <BookingQuestionsForm
          user={user}
          tutor={selectedTutor}
          selectedCourse={selectedSubject?.code || data.course || ''}
          wizardPrefill={fromWizardFlow ? {
            course: data.course || selectedSubject?.code || '',
            goal: data.goal || '',
            language: data.language || '',
            fromWizard: true,
          } : null}
          subjects={selectedTutor.subjects || []}
          submitting={submittingBooking}
          onCancel={() => {
            clearDraft();
            if (skipCourse && selectedSubject && !fromWizardFlow) {
              setSearchFlowMode('subject-matchmaking');
            } else {
              setSearchFlowMode(null);
              setSelectedTutor(null);
              setFromWizardFlow(false);
            }
          }}
          onDone={() => {
            clearDraft();
            navigate('/dashboard');
          }}
          onBookAnother={() => {
            clearDraft();
            setSearchFlowMode(null);
            setSelectedTutor(null);
            setSelectedSubject(null);
            setFromWizardFlow(false);
          }}
          onSubmit={handleBookingQuestionsSubmit}
        />
      )}

      {/* ─── MAIN FRAME (DEFAULT): ORIGINAL 6-QUESTION MATCHMAKING WIZARD & BUTTON ─── */}
      {!searchFlowMode && (
        <div className="relative">
          {/* ─── SEARCH RESULTS OVERLAY ON THE MATCH MAKING AREA ─── */}
          {(hasSubjectSearch || hasTutorSearch) && (
            <div className="absolute inset-x-0 top-0 z-30 overflow-hidden border-2 border-ink bg-paper shadow-[var(--nb-shadow)_var(--nb-shadow)_0_var(--color-ink)] mm-ease-in">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink bg-surface-highlight px-3.5 py-2.5 sm:px-4 sm:py-3">
                <div className="flex min-w-0 items-center gap-2">
                  {hasSubjectSearch ? (
                    <>
                      <BookOpen className="h-4 w-4 shrink-0 text-ink" strokeWidth={2.2} />
                      <span className="truncate font-display text-[14px] font-bold text-ink">
                        Subjects for &ldquo;{subjectQuery}&rdquo; ({filteredSubjects.length})
                      </span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 shrink-0 text-ink" strokeWidth={2.2} />
                      <span className="truncate font-display text-[14px] font-bold text-ink">
                        Tutors for &ldquo;{tutorQuery}&rdquo; ({filteredTutors.length})
                      </span>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSubjectQuery('');
                    setTutorQuery('');
                  }}
                  className="gap-1 bg-paper font-bold"
                >
                  <X className="h-3.5 w-3.5" />
                  Close
                </Button>
              </div>

              {/* Overlay Content (flat divided rows on mobile to avoid nested bordered boxes) */}
              <div className="max-h-[65dvh] overflow-y-auto">
                {hasSubjectSearch && (
                  filteredSubjects.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="font-display text-[15px] font-bold text-ink">No subjects found</p>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        Try another code or name, like Calculus or PROG 201.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y-2 divide-ink/15">
                      {filteredSubjects.map((sub) => {
                        const availableTutors = getAvailableTutorsForSubject(allTutors, sub.code);
                        return (
                          <div
                            key={sub.code}
                            onClick={() => handleSelectSubjectFromSearch(sub)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleSelectSubjectFromSearch(sub);
                              }
                            }}
                            className="cursor-pointer bg-card p-3.5 transition-colors hover:bg-surface-highlight sm:p-4"
                          >
                            <div className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="border border-ink bg-gold px-2 py-0.5 font-display text-[12px] font-extrabold text-ink">
                                    {sub.code}
                                  </span>
                                  <span className="border border-ink/40 bg-surface-quiet px-1.5 py-0.5 text-[11px] font-bold text-ink/80">
                                    {sub.department}
                                  </span>
                                </div>
                                <h3 className="mt-1 font-display text-[16px] font-extrabold text-ink">
                                  {sub.name}
                                </h3>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectSubjectFromSearch(sub);
                                }}
                                className="w-full shrink-0 gap-1.5 px-4 font-bold sm:w-auto"
                              >
                                Find tutor
                                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
                              </Button>
                            </div>

                            <div className="mt-2.5 pt-2">
                              <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                                Available Tutors ({availableTutors.length})
                              </p>
                              {availableTutors.length > 0 ? (
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                  {availableTutors.map((t) => (
                                    <span
                                      key={t.id}
                                      className="inline-flex items-center gap-1.5 border border-ink bg-paper px-2 py-1 text-[12px] font-semibold text-ink"
                                    >
                                      <span className="h-2 w-2 rounded-full bg-emerald" />
                                      {t.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-muted-foreground">
                                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-gold" strokeWidth={2.2} />
                                  No peer tutors online — tap to match with a Faculty Specialist
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}

                {hasTutorSearch && (
                  filteredTutors.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="font-display text-[15px] font-bold text-ink">No tutors found</p>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        Try another tutor name or specialization.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y-2 divide-ink/15 sm:grid sm:grid-cols-2 sm:gap-3 sm:divide-y-0 sm:p-4">
                      {filteredTutors.map((tutor) => (
                        <div
                          key={tutor.id}
                          className="flex flex-col justify-between bg-card p-3.5 sm:border-2 sm:border-ink sm:p-4"
                        >
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => navigate(`/tutors/${tutor.custom_id || tutor.id}`)}
                              className="shrink-0 transition-transform hover:scale-105"
                            >
                              <Avatar name={tutor.name} src={tutor.avatar} size="lg" />
                            </button>
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => navigate(`/tutors/${tutor.custom_id || tutor.id}`)}
                                className="block max-w-full truncate text-left font-display text-[15px] font-extrabold text-ink underline decoration-gold decoration-2 underline-offset-2 hover:decoration-ink"
                              >
                                {tutor.name}
                              </button>
                              <p className="mt-0.5 text-[12px] font-semibold text-ink/80">
                                {tutor.specialization || tutor.program}
                              </p>
                              {Array.isArray(tutor.subjects) && tutor.subjects.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {tutor.subjects.map((s) => (
                                    <span
                                      key={s.code}
                                      className="border border-ink/40 bg-paper px-1.5 py-0.5 text-[11px] font-bold text-ink"
                                    >
                                      {s.code}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-2 border-t border-ink/15 pt-2.5 sm:justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/tutors/${tutor.custom_id || tutor.id}`)}
                              className="flex-1 font-bold sm:flex-none"
                            >
                              View profile
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedTutor(tutor);
                                setSkipCourse(false);
                                setSearchFlowMode('booking-form');
                              }}
                              className="flex-1 font-bold sm:flex-none"
                            >
                              Book
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {isQuestionStep && (
            <StepProgress
              steps={questionSteps}
              currentIndex={currentStep}
              onStepClick={setCurrentStep}
              className="mb-4 sm:mb-6"
            />
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
            >
              {isQuestionStep && (
                <>
                  <div className="mb-4 sm:mb-5">
                    <h2
                      id="wizard-question-title"
                      className="font-display text-[clamp(20px,5vw+4px,26px)] font-extrabold leading-tight tracking-[-0.03em]"
                    >
                      {questionTitle}
                    </h2>
                    <p className="mt-1 max-w-[58ch] text-[14px] text-muted-foreground">
                      {questionDetail}
                    </p>
                  </div>

                  {steps[currentStep].id === 'goal' && (
                    <div role="radiogroup" aria-labelledby="wizard-question-title" className="grid gap-2.5 md:grid-cols-3">
                      {GOALS.map((option) => (
                        <OptionRow
                          key={option.value}
                          {...option}
                          selected={data.goal === option.value}
                          onClick={() => selectOption('goal', option.value)}
                        />
                      ))}
                    </div>
                  )}

                  {steps[currentStep].id === 'timeline' && (
                    <div role="radiogroup" aria-labelledby="wizard-question-title" className="grid gap-2.5 md:grid-cols-3">
                      {TIMELINES.map((option) => (
                        <OptionRow
                          key={option.value}
                          {...option}
                          selected={data.timeline === option.value}
                          onClick={() => selectOption('timeline', option.value)}
                        />
                      ))}
                    </div>
                  )}

                  {steps[currentStep].id === 'course' && (
                    <LoadState
                      loading={liveSubjects === null && subjectOptions.length === 0}
                      error={subjectOptions.length === 0 ? subjectsError : null}
                      empty={subjectOptions.length === 0}
                      emptyText="No subjects are available to match right now."
                      errorText="We couldn't load the subject list. Try again."
                      onRetry={loadDirectory}
                      skeleton={(
                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="skeleton h-11 w-24" />
                          ))}
                        </div>
                      )}
                    >
                      <div role="radiogroup" aria-labelledby="wizard-question-title" className="flex flex-wrap gap-2">
                        {subjectOptions.map((option) => (
                          <button
                            key={option.code}
                            type="button"
                            role="radio"
                            aria-checked={data.course === option.code}
                            onClick={() => selectOption('course', option.code)}
                            className={cn(
                              'min-h-11 border-2 border-ink px-4 text-[14px] font-bold shadow-[var(--nb-shadow-sm)_var(--nb-shadow-sm)_0_var(--color-ink)] transition-[background-color,transform,box-shadow]',
                              data.course === option.code
                                ? 'bg-gold text-ink'
                                : 'bg-paper text-ink hover:-translate-y-0.5 hover:bg-surface-highlight',
                            )}
                          >
                            {option.code}
                          </button>
                        ))}
                      </div>
                    </LoadState>
                  )}

                  {steps[currentStep].id === 'level' && (
                    <div role="radiogroup" aria-labelledby="wizard-question-title" className="grid gap-2.5 md:grid-cols-3">
                      {LEVELS.map((option) => (
                        <OptionRow
                          key={option.value}
                          {...option}
                          selected={data.level === option.value}
                          onClick={() => selectOption('level', option.value)}
                        />
                      ))}
                    </div>
                  )}

                  {steps[currentStep].id === 'language' && (
                    <div role="radiogroup" aria-labelledby="wizard-question-title" className="grid gap-2.5 md:grid-cols-3">
                      {LANGUAGES.map((option) => (
                        <OptionRow
                          key={option.value}
                          {...option}
                          selected={data.language === option.value}
                          onClick={() => selectOption('language', option.value)}
                        />
                      ))}
                    </div>
                  )}

                  {steps[currentStep].id === 'availability' && (
                    <div role="radiogroup" aria-labelledby="wizard-question-title" className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                      {AVAILABILITY.map((option) => (
                        <OptionRow
                          key={option.value}
                          {...option}
                          selected={data.availability === option.value}
                          onClick={() => selectOption('availability', option.value)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {steps[currentStep].id === 'match' && (
                <div>
                  <div className="mb-5">
                    <p className="inline-block border-2 border-ink bg-ink px-2 py-0.5 text-[13px] font-bold text-paper">
                      Matching
                    </p>
                    <h2 className="mt-3 font-display text-[clamp(20px,5vw+4px,26px)] font-extrabold leading-tight tracking-[-0.03em]">
                      {getMatches().length > 0
                        ? `${getMatches().length} accredited ${data.course ? `for ${data.course}` : 'tutors'}`
                        : 'The match list'}
                    </h2>
                    <p className="mt-1.5 max-w-[58ch] text-[14px] text-muted-foreground">
                      Request a session and the tutor confirms the final time. Every tutor here passed the qualification exam.
                    </p>
                  </div>

                  <MatchmakingAnimation
                    course={data.course}
                    availability={data.availability}
                    goal={data.goal}
                    onCancel={() => setCurrentStep(steps.length - 2)}
                    onRequestSession={(tutor) => {
                      const chosenSub = subjectOptions.find((s) => s.code === data.course) || null;
                      setSelectedSubject(chosenSub);
                      handleBookFromSubjectMatchmaking(tutor, { viaWizard: true });
                    }}
                    requestingId={requesting}
                    navigate={navigate}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {isQuestionStep && (
            <div className="action-bar mt-6">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex-1 bg-paper sm:flex-none"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.8} /> Back
              </Button>
              <Button
                onClick={nextStep}
                disabled={!data[steps[currentStep].id]}
                className="flex-1 whitespace-normal sm:flex-none"
              >
                {currentStep === steps.length - 2 ? 'Find matches' : 'Next'}
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
