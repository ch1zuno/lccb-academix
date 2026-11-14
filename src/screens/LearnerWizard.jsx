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
import { cn } from '../lib/utils';
import { addDaysYmd } from '../lib/dates';
import MatchmakingAnimation from '../components/MatchmakingAnimation';
import BookingQuestionsForm from '../components/BookingQuestionsForm';
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
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex min-h-[96px] w-full items-start justify-between gap-4 border-2 border-ink p-4 text-left transition-[background-color,box-shadow,transform]',
        selected
          ? 'bg-gold shadow-[4px_4px_0_var(--color-ink)]'
          : 'bg-paper hover:-translate-y-0.5 hover:bg-surface-highlight hover:shadow-[3px_3px_0_var(--color-ink)]',
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
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const prefilledTutor = location.state?.prefilledTutor;
  const prefilledTutorId = searchParams.get('tutorId') || prefilledTutor?.id;

  // Original 6-step main frame wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState({});
  const [liveSubjects, setLiveSubjects] = useState(null);
  const [liveTutors, setLiveTutors] = useState([]);
  const [matches, setMatches] = useState(null);
  const [requesting, setRequesting] = useState(null);

  // Top Dual Search Bars state (results only appear when user types in a search bar)
  const [subjectQuery, setSubjectQuery] = useState('');
  const [tutorQuery, setTutorQuery] = useState('');

  // Search-triggered flows:
  // null = show the original main-frame 6-step wizard
  // 'subject-matchmaking' = Matchmaking screen opened by clicking a subject in [ Search subject ] results
  // 'booking-form' = Shared BookingQuestionsForm opened after picking a tutor from Subject Search (skipCourse=true) or Tutor Profile (skipCourse=false)
  const [searchFlowMode, setSearchFlowMode] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [skipCourse, setSkipCourse] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Sync live subject & tutor UUIDs from backend while keeping src/data.js for instant search
  useEffect(() => {
    api
      .get('/subjects')
      .then(({ subjects }) => setLiveSubjects(subjects || []))
      .catch(() => setLiveSubjects([]));

    api
      .get('/tutors')
      .then(({ tutors }) => setLiveTutors(tutors || []))
      .catch(() => {});
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
            subjects: profile.subjects,
            avatar: profile.avatar,
            stats: profile.stats,
          });
          setSelectedTutor(enriched);
          setSkipCourse(false);
          setSearchFlowMode('booking-form');
        })
        .catch(() => {
          if (localMatch) {
            setSelectedTutor(localMatch);
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
  const handleBookFromSubjectMatchmaking = (tutor) => {
    const mockMatch = findMockMentorById(tutor.custom_id || tutor.id);
    setSelectedTutor({
      ...mockMatch,
      ...tutor,
      subjects:
        Array.isArray(tutor.subjects) && tutor.subjects.length > 0
          ? tutor.subjects
          : mockMatch?.subjects || (selectedSubject ? [selectedSubject] : []),
    });
    setSkipCourse(true);
    setSearchFlowMode('booking-form');
  };

  // Submit handler for Shared Booking Questions Form
  const handleBookingQuestionsSubmit = async (answers) => {
    if (!selectedTutor) return;
    setSubmittingBooking(true);

    const chosenCourseCode = skipCourse
      ? selectedSubject?.code || answers.course || selectedTutor.subjects?.[0]?.code
      : answers.course || selectedTutor.subjects?.[0]?.code;

    const matchedSubjectObj =
      allSubjects.find(
        (s) => String(s.code).toUpperCase() === String(chosenCourseCode || '').toUpperCase()
      ) ||
      selectedTutor.subjects?.find(
        (s) => String(s.code).toUpperCase() === String(chosenCourseCode || '').toUpperCase()
      ) ||
      selectedSubject ||
      selectedTutor.subjects?.[0];

    const liveTutorMatch = liveTutors.find(
      (lt) =>
        lt.id === selectedTutor.id ||
        (lt.custom_id &&
          String(lt.custom_id).toUpperCase() ===
            String(selectedTutor.custom_id || selectedTutor.id).toUpperCase()) ||
        (lt.name && lt.name.toLowerCase() === String(selectedTutor.name || '').toLowerCase())
    );

    const resolvedTutorId = liveTutorMatch?.id || selectedTutor.id;
    const resolvedSubjectId = matchedSubjectObj?.id;

    try {
      if (
        resolvedSubjectId &&
        !String(resolvedSubjectId).startsWith('sub-') &&
        !String(resolvedTutorId).startsWith('TU-') &&
        !String(resolvedTutorId).startsWith('FA-')
      ) {
        await api.post('/session-requests', {
          tutorId: resolvedTutorId,
          subjectId: resolvedSubjectId,
          topic: answers.goal || 'General review',
          preferredDate: answers.preferredDate || addDaysYmd(3),
          preferredTime: answers.preferredTime || '3:30 PM',
          note: `Timeline: ${answers.timeline} • Advanced Review: ${answers.advancedReview} • Language: ${answers.language} • Window: ${answers.schedule}`,
        });
      }
      showToast?.(
        `Session booked with ${selectedTutor.name} for ${chosenCourseCode || 'selected course'}.`,
        'success'
      );
      setSearchFlowMode(null);
      setSelectedTutor(null);
      setSelectedSubject(null);
    } catch (err) {
      showToast?.(err.message || 'Booking request failed', 'error');
    } finally {
      setSubmittingBooking(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[880px]">
      {/* Header */}
      <div className="section-head">
        <div>
          <h1 className="section-title">Find a tutor</h1>
          <p className="section-subtitle">Six questions, then a live list of accredited peers.</p>
        </div>
        {!searchFlowMode && isQuestionStep && (
          <span className="num text-[13px] text-muted-foreground">
            {currentStep + 1} / {steps.length - 1}
          </span>
        )}
      </div>

      {/* ─── TOP DUAL SEARCH BARS (Side by side on desktop, stacked on mobile) ─── */}
      <div className="mb-7 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Search Bar 1: [ Search subject ] */}
        <div className="panel border-2 border-ink bg-card p-3 shadow-[3px_3px_0_var(--color-ink)]">
          <label
            htmlFor="tutor-tab-search-subject"
            className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-ink"
          >
            <BookOpen className="h-3.5 w-3.5 text-ink" strokeWidth={2.2} />
            Search subject
          </label>
          <div className="relative flex items-center">
            <Search
              className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground"
              strokeWidth={2}
            />
            <input
              id="tutor-tab-search-subject"
              type="text"
              value={subjectQuery}
              onChange={(e) => {
                setSubjectQuery(e.target.value);
                if (e.target.value) setTutorQuery('');
                if (searchFlowMode) setSearchFlowMode(null);
              }}
              placeholder='Search subject (e.g. "Programming", "Calculus")...'
              aria-label="Search subject"
              className="h-10 w-full border-2 border-ink bg-paper pl-9 pr-9 text-[13px] font-medium text-ink placeholder:text-muted-foreground focus-visible:outline-none focus-visible:shadow-[3px_3px_0_var(--color-gold)]"
            />
            {subjectQuery && (
              <button
                type="button"
                onClick={() => setSubjectQuery('')}
                aria-label="Clear subject search"
                className="absolute right-2.5 grid h-6 w-6 place-items-center text-muted-foreground hover:text-ink"
              >
                <X className="h-4 w-4" strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>

        {/* Search Bar 2: [ Search tutor ] */}
        <div className="panel border-2 border-ink bg-card p-3 shadow-[3px_3px_0_var(--color-ink)]">
          <label
            htmlFor="tutor-tab-search-tutor"
            className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-ink"
          >
            <UserCheck className="h-3.5 w-3.5 text-ink" strokeWidth={2.2} />
            Search tutor
          </label>
          <div className="relative flex items-center">
            <Search
              className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground"
              strokeWidth={2}
            />
            <input
              id="tutor-tab-search-tutor"
              type="text"
              value={tutorQuery}
              onChange={(e) => {
                setTutorQuery(e.target.value);
                if (e.target.value) setSubjectQuery('');
                if (searchFlowMode) setSearchFlowMode(null);
              }}
              placeholder='Search tutor by name (e.g. "Angela", "Mark")...'
              aria-label="Search tutor"
              className="h-10 w-full border-2 border-ink bg-paper pl-9 pr-9 text-[13px] font-medium text-ink placeholder:text-muted-foreground focus-visible:outline-none focus-visible:shadow-[3px_3px_0_var(--color-gold)]"
            />
            {tutorQuery && (
              <button
                type="button"
                onClick={() => setTutorQuery('')}
                aria-label="Clear tutor search"
                className="absolute right-2.5 grid h-6 w-6 place-items-center text-muted-foreground hover:text-ink"
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

      {/* ─── SEARCH-TRIGGERED VIEW 2: SHARED BOOKING QUESTIONS FORM ─── */}
      {searchFlowMode === 'booking-form' && selectedTutor && (
        <BookingQuestionsForm
          tutor={selectedTutor}
          skipCourse={skipCourse}
          selectedCourse={selectedSubject?.code || ''}
          subjects={selectedTutor.subjects || []}
          submitting={submittingBooking}
          onBack={() => {
            if (skipCourse && selectedSubject) {
              setSearchFlowMode('subject-matchmaking');
            } else {
              setSearchFlowMode(null);
              setSelectedTutor(null);
            }
          }}
          onSubmit={handleBookingQuestionsSubmit}
        />
      )}

      {/* ─── MAIN FRAME (DEFAULT): ORIGINAL 6-QUESTION MATCHMAKING WIZARD & BUTTON ─── */}
      {!searchFlowMode && (
        <div className="relative min-h-[460px]">
          {/* ─── SEARCH RESULTS OVERLAY ON THE MATCH MAKING AREA ─── */}
          {(hasSubjectSearch || hasTutorSearch) && (
            <div className="absolute inset-x-0 top-0 z-30 overflow-hidden border-2 border-ink bg-paper shadow-[6px_6px_0_var(--color-ink)] mm-ease-in">
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-ink bg-surface-highlight px-4 py-3">
                <div className="flex items-center gap-2">
                  {hasSubjectSearch ? (
                    <>
                      <BookOpen className="h-4 w-4 text-ink" strokeWidth={2.2} />
                      <span className="font-display text-[14px] font-bold text-ink">
                        Subject Results for &ldquo;{subjectQuery}&rdquo; ({filteredSubjects.length})
                      </span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 text-ink" strokeWidth={2.2} />
                      <span className="font-display text-[14px] font-bold text-ink">
                        Tutor Results for &ldquo;{tutorQuery}&rdquo; ({filteredTutors.length})
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
                  className="min-h-[32px] gap-1 text-[11px] font-bold"
                >
                  <X className="h-3.5 w-3.5" />
                  Close overlay
                </Button>
              </div>

              {/* Overlay Content */}
              <div className="max-h-[500px] overflow-y-auto p-4 sm:p-5">
                {hasSubjectSearch && (
                  filteredSubjects.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="font-display text-[15px] font-bold text-ink">No subjects found</p>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        Try searching for another subject code or name (e.g. &ldquo;Programming&rdquo;, &ldquo;Calculus&rdquo;).
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
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
                            className="cursor-pointer border-2 border-ink bg-card p-4 transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:bg-surface-highlight hover:shadow-[4px_4px_0_var(--color-ink)]"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5">
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
                                className="min-h-[36px] shrink-0 gap-1.5 px-4 font-bold shadow-[2px_2px_0_var(--color-ink)]"
                              >
                                Find tutor
                                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
                              </Button>
                            </div>

                            <div className="mt-3 border-t border-ink/15 pt-2.5">
                              <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                                Available Tutors ({availableTutors.length})
                              </p>
                              {availableTutors.length > 0 ? (
                                <div className="mt-1.5 flex flex-wrap gap-2">
                                  {availableTutors.map((t) => (
                                    <span
                                      key={t.id}
                                      className="inline-flex items-center gap-1.5 border border-ink bg-paper px-2 py-1 text-[12px] font-semibold text-ink"
                                    >
                                      <span className="h-2 w-2 rounded-full bg-emerald-600" />
                                      {t.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-muted-foreground">
                                  <Sparkles className="h-3.5 w-3.5 text-gold" strokeWidth={2.2} />
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
                    <div className="py-10 text-center">
                      <p className="font-display text-[15px] font-bold text-ink">No tutors found</p>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        Try searching for another tutor name or specialization.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {filteredTutors.map((tutor) => (
                        <div
                          key={tutor.id}
                          className="flex flex-col justify-between border-2 border-ink bg-card p-4 transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--color-ink)]"
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
                                className="truncate text-left font-display text-[15px] font-extrabold text-ink underline decoration-gold decoration-2 underline-offset-2 hover:decoration-ink"
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
                                      className="border border-ink/40 bg-paper px-1.5 py-0.5 text-[10px] font-bold text-ink"
                                    >
                                      {s.code}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-end gap-2 border-t border-ink/15 pt-2.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/tutors/${tutor.custom_id || tutor.id}`)}
                              className="min-h-[32px] text-[11px] font-bold"
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
                              className="min-h-[32px] px-3 text-[11px] font-bold shadow-[2px_2px_0_var(--color-ink)]"
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
            <div className="mb-8">
              <div className="h-3 w-full border-2 border-ink bg-paper">
                <motion.div
                  className="h-full bg-gold"
                  initial={false}
                  animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
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
                  <div className="mb-6">
                    <p className="inline-block border-2 border-ink bg-ink px-2 py-0.5 text-[13px] font-bold text-paper">
                      {steps[currentStep].title}
                    </p>
                    <h2 className="mt-3 font-display text-[26px] font-extrabold leading-tight tracking-[-0.035em]">
                      {questionTitle}
                    </h2>
                    <p className="mt-2 max-w-[58ch] text-[14px] text-muted-foreground">
                      {questionDetail}
                    </p>
                  </div>

                  {steps[currentStep].id === 'goal' && (
                    <div className="grid gap-2.5 md:grid-cols-3">
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
                    <div className="grid gap-2.5 md:grid-cols-3">
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
                    <div>
                      {subjectOptions.length === 0 && (
                        <div className="panel empty">No subjects are available to match right now.</div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {subjectOptions.map((option) => (
                          <button
                            key={option.code}
                            type="button"
                            onClick={() => selectOption('course', option.code)}
                            aria-pressed={data.course === option.code}
                            className={cn(
                              'h-10 border-2 border-ink px-4 text-[14px] font-bold shadow-[2px_2px_0_var(--color-ink)] transition-[background-color,transform,box-shadow]',
                              data.course === option.code
                                ? 'bg-gold text-ink'
                                : 'bg-paper text-ink hover:-translate-y-0.5 hover:bg-surface-highlight',
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
                    <div className="grid gap-2.5 md:grid-cols-3">
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
                    <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
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
                  <div className="mb-6">
                    <p className="inline-block border-2 border-ink bg-ink px-2 py-0.5 text-[13px] font-bold text-paper">
                      Matching
                    </p>
                    <h2 className="mt-3 font-display text-[26px] font-extrabold leading-tight tracking-[-0.035em]">
                      {getMatches().length > 0
                        ? `${getMatches().length} accredited ${data.course ? `for ${data.course}` : 'tutors'}`
                        : 'The match list'}
                    </h2>
                    <p className="mt-2 max-w-[58ch] text-[14px] text-muted-foreground">
                      Request a session and the tutor confirms the final time. Every tutor here passed the qualification exam.
                    </p>
                  </div>

                  <MatchmakingAnimation
                    course={data.course}
                    availability={data.availability}
                    goal={data.goal}
                    onCancel={() => setCurrentStep(steps.length - 2)}
                    onRequestSession={async (tutor) => {
                      setRequesting(tutor.id);
                      const fallbackDate = addDaysYmd(3);
                      const targetSubjectId =
                        (subjectOptions.find((s) => s.code === data.course) || {}).id ||
                        (tutor.subjects?.[0] || {}).id;
                      try {
                        await api.post('/session-requests', {
                          tutorId: tutor.id,
                          subjectId: targetSubjectId,
                          topic: data.goal || 'General review',
                          preferredDate: fallbackDate,
                          preferredTime: '3:30 PM',
                          note: data.level
                            ? `Level: ${data.level} • Language: ${data.language || 'English'} • Preview: ${data.availability || ''}`
                            : null,
                        });
                        showToast(`Session requested with ${tutor.name}.`, 'success');
                      } catch (err) {
                        showToast(err.message || 'Request failed', 'error');
                      } finally {
                        setRequesting(null);
                      }
                    }}
                    requestingId={requesting}
                    navigate={navigate}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {isQuestionStep && (
            <div className="mt-8 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={prevStep} disabled={currentStep === 0}>
                <ArrowLeft className="h-4 w-4" strokeWidth={1.8} /> Back
              </Button>
              <Button onClick={nextStep} disabled={!data[steps[currentStep].id]}>
                {currentStep === steps.length - 2 ? 'Find matches' : 'Continue'}
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
