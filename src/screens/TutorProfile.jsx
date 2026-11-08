import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Avatar } from '../components/ui/Avatar';
import {
  Calendar,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Clock,
  Sparkles,
  UserCheck,
  Edit3,
} from 'lucide-react';
import api from '../api';

export default function TutorProfile({ currentUser, onEditProfile, showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tutor, setTutor] = useState(null);
  const [tutorId, setTutorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    api.get(`/tutors/${id}`)
      .then((res) => {
        if (!active) return;
        setTutor(res.profile);
        setTutorId(res.tutorId);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.status === 404 ? 'not_found' : err.message || 'Failed to load tutor');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const isOwnProfile = Boolean(
    currentUser &&
    (currentUser.id === tutorId || currentUser.custom_id === id || currentUser.name === tutor?.name)
  );
  const isLearner = currentUser?.role === 'learner';
  const isAvailable = tutor?.is_available !== false;
  const isAccredited = tutor?.is_verified !== false;

  const handleBookSession = () => {
    if (!isLearner) {
      showToast?.('Only students with learner accounts can book peer tutoring sessions.', 'error');
      return;
    }
    if (!isAccredited) {
      showToast?.('This tutor is not currently accredited for bookings.', 'error');
      return;
    }
    if (!isAvailable) {
      showToast?.('This tutor is currently unavailable for new bookings.', 'error');
      return;
    }

    const prefilledTutor = {
      id: tutorId || id,
      name: tutor.name,
      avatar: tutor.avatar,
      program: tutor.program,
      subjects: tutor.subjects || [],
      stats: tutor.stats,
    };

    navigate('/wizard', { state: { prefilledTutor } });
  };

  // Loading State
  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[880px] py-12">
        <div className="flex flex-col items-center justify-center gap-3 border-2 border-ink bg-paper p-12 text-ink shadow-[4px_4px_0_var(--color-ink)]">
          <Loader2 className="h-8 w-8 animate-spin text-ink" strokeWidth={2} />
          <p className="font-display text-[15px] font-bold">Loading tutor profile...</p>
        </div>
      </div>
    );
  }

  // Not Found State (unknown ID or non-tutor ID)
  if (error === 'not_found' || !tutor) {
    return (
      <div className="mx-auto w-full max-w-[720px] py-8">
        <div className="border-2 border-ink bg-paper p-8 text-center text-ink shadow-[4px_4px_0_var(--color-ink)] sm:p-12">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center border-2 border-ink bg-surface-highlight text-ink">
            <AlertCircle className="h-7 w-7" strokeWidth={2} />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Tutor Profile Not Found</h1>
          <p className="mx-auto mt-2 max-w-[480px] text-[14px] leading-relaxed text-ink/75">
            This profile does not exist or does not belong to an accredited tutor. The tutor ID might be mistyped or no longer active.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="min-h-[44px]"
            >
              <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={2} /> Back to Dashboard
            </Button>
            {isLearner && (
              <Button onClick={() => navigate('/wizard')} className="min-h-[44px]">
                Find Available Tutors
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Network Error State
  if (error) {
    return (
      <div className="mx-auto w-full max-w-[720px] py-8">
        <div className="border-2 border-ink bg-paper p-8 text-center text-ink shadow-[4px_4px_0_var(--color-ink)]">
          <p className="text-[14px] font-bold text-destructive">Error: {error}</p>
          <Button
            className="mt-4 min-h-[44px]"
            onClick={() => {
              setLoading(true);
              setError(null);
              api.get(`/tutors/${id}`)
                .then(res => { setTutor(res.profile); setTutorId(res.tutorId); setLoading(false); })
                .catch(err => { setError(err.message || 'Error'); setLoading(false); });
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[880px] pb-12">
      {/* Top back navigation link */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex min-h-[44px] items-center gap-2 text-[14px] font-semibold text-ink underline decoration-gold decoration-2 underline-offset-4 hover:decoration-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Back
        </button>
      </div>

      {/* Profile Card Container with Facebook-style layout */}
      <div className="overflow-hidden border-2 border-ink bg-paper shadow-[6px_6px_0_var(--color-ink)]">
        {/* Cover Banner */}
        <div className="relative h-36 w-full border-b-2 border-ink bg-gradient-to-r from-[#002347] via-[#0b3c6d] to-[#002347] sm:h-48">
          <div className="absolute inset-0 opacity-15 [background-image:radial-gradient(#FBB03B_1.5px,transparent_1.5px)] [background-size:16px_16px]" />
          <div className="absolute bottom-3 right-3 rounded-none border border-paper/40 bg-ink/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-paper backdrop-blur-sm">
            La Consolacion College Bacolod
          </div>
        </div>

        {/* Facebook-style Header Details */}
        <div className="px-5 pb-6 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            {/* Overlapping Large Avatar */}
            <div className="-mt-14 shrink-0 sm:-mt-20">
              <div className="inline-block border-4 border-paper bg-paper shadow-[4px_4px_0_var(--color-ink)]">
                <Avatar
                  name={tutor.name}
                  src={tutor.avatar}
                  size="2xl"
                  className="h-24 w-24 rounded-none text-2xl sm:h-32 sm:w-32 sm:text-3xl"
                />
              </div>
            </div>

            {/* Header Action Button */}
            <div className="shrink-0 pt-2 sm:pt-0">
              {isOwnProfile ? (
                <Button
                  onClick={onEditProfile}
                  className="min-h-[44px] w-full gap-2 sm:w-auto"
                >
                  <Edit3 className="h-4 w-4" strokeWidth={2} />
                  Edit Profile
                </Button>
              ) : isLearner ? (
                <div className="flex flex-col items-start gap-1 sm:items-end">
                  <Button
                    onClick={handleBookSession}
                    disabled={!isAccredited || !isAvailable}
                    className="min-h-[44px] w-full gap-2 sm:w-auto"
                  >
                    <Calendar className="h-4 w-4" strokeWidth={2} />
                    Book session
                  </Button>
                  {!isAccredited && (
                    <span className="text-[12px] font-medium text-destructive">
                      This tutor is not currently accredited.
                    </span>
                  )}
                  {isAccredited && !isAvailable && (
                    <span className="text-[12px] font-medium text-amber-700">
                      This tutor is currently unavailable for new bookings.
                    </span>
                  )}
                </div>
              ) : (
                <div className="rounded-none border-2 border-ink bg-surface-highlight px-3 py-2 text-[13px] font-semibold text-ink">
                  {currentUser?.role === 'superadmin' ? 'Administrator Review' : 'Faculty Review'}
                </div>
              )}
            </div>
          </div>

          {/* Identity & Badges */}
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {tutor.name}
              </h1>
              <span className="inline-flex items-center gap-1 border border-ink bg-gold px-2.5 py-0.5 text-[12px] font-bold text-ink">
                <UserCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
                Accredited Tutor
              </span>
              {isAvailable ? (
                <span className="inline-flex items-center gap-1 border border-emerald-800 bg-emerald-100 px-2 py-0.5 text-[12px] font-bold text-emerald-900">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  Available
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 border border-amber-800 bg-amber-100 px-2 py-0.5 text-[12px] font-bold text-amber-900">
                  <Clock className="h-3 w-3" strokeWidth={2} />
                  Unavailable
                </span>
              )}
            </div>
            {tutor.program && (
              <p className="mt-1 text-[14px] font-medium text-ink/75">
                {tutor.program}
              </p>
            )}
          </div>
        </div>

        {/* Content Tabs / Sections */}
        <div className="grid grid-cols-1 gap-6 border-t-2 border-ink bg-stone/40 p-5 sm:p-8 md:grid-cols-3">
          {/* Main Column: About & Subjects (2 cols) */}
          <div className="space-y-6 md:col-span-2">
            {/* About Card */}
            <section aria-labelledby="about-heading" className="border-2 border-ink bg-paper p-5 shadow-[3px_3px_0_var(--color-ink)]">
              <h2 id="about-heading" className="font-display flex items-center gap-2 text-[16px] font-bold text-ink">
                <BookOpen className="h-4 w-4" strokeWidth={2} />
                About
              </h2>
              <div className="mt-3 text-[14px] leading-relaxed text-ink/85">
                {tutor.bio ? (
                  <p className="whitespace-pre-wrap">{tutor.bio}</p>
                ) : (
                  <p className="italic text-ink/60">No bio provided by this tutor yet.</p>
                )}
              </div>
            </section>

            {/* Subjects Card */}
            <section aria-labelledby="subjects-heading" className="border-2 border-ink bg-paper p-5 shadow-[3px_3px_0_var(--color-ink)]">
              <h2 id="subjects-heading" className="font-display flex items-center gap-2 text-[16px] font-bold text-ink">
                <Sparkles className="h-4 w-4" strokeWidth={2} />
                Subjects Taught
              </h2>
              {Array.isArray(tutor.subjects) && tutor.subjects.length > 0 ? (
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {tutor.subjects.map((sub) => (
                    <div
                      key={sub.code}
                      className="border-2 border-ink bg-paper p-3 transition-transform hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-[14px] font-bold text-ink">
                          {sub.code}
                        </span>
                        {sub.department && (
                          <span className="border border-ink/40 bg-stone px-1.5 py-0.5 text-[11px] font-semibold text-ink/80">
                            {sub.department}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[13px] text-ink/75">{sub.name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[14px] italic text-ink/60">No subjects currently assigned.</p>
              )}
            </section>
          </div>

          {/* Sidebar Column: Real Stats Only (1 col) */}
          <div className="space-y-6">
            <section aria-labelledby="stats-heading" className="border-2 border-ink bg-paper p-5 shadow-[3px_3px_0_var(--color-ink)]">
              <h2 id="stats-heading" className="font-display flex items-center gap-2 text-[16px] font-bold text-ink">
                <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                Activity & Stats
              </h2>
              <div className="mt-4">
                <div className="border-2 border-ink bg-surface-highlight p-4 text-center">
                  <div className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
                    {tutor.stats?.completed_sessions ?? 0}
                  </div>
                  <div className="mt-1 text-[12px] font-bold uppercase tracking-wider text-ink/80">
                    Completed Sessions
                  </div>
                </div>
                <p className="mt-3 text-[12px] leading-snug text-ink/65">
                  Verified session records checked in through LCCB Academix.
                </p>
              </div>
            </section>

            {/* Peer Tutoring Notice */}
            <div className="border-2 border-ink bg-paper p-4 text-[12px] leading-relaxed text-ink/75">
              <span className="font-bold text-ink">LCCB Peer Tutoring:</span> All peer tutors are enrolled students certified by college faculty. Sessions earn academic incentive ledger points.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
