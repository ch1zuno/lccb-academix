import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { animate } from 'animejs';
import { ArrowRight, ArrowLeft, Loader2, X } from 'lucide-react';
import api from '../api';
import { saveSession } from '../authToken';
import { focusFirst, trapTabKey } from '../lib/focusTrap';
import Logo2D from '../components/Logo2D';
import { supabase, signInWithGoogleLccb } from '../lib/supabase';
import './Landing.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const DEV = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === '1' || !GOOGLE_CLIENT_ID;

const DEMO_ACCOUNTS = [
  { role: 'superadmin', loginId: 'l.betita.admin@lccbacolod.edu.ph', label: 'Sir Lenuel Betita' },
  { role: 'faculty', loginId: 'b.tisuela@lccbacolod.edu.ph', label: 'Mrs. Bethel Tisuela' },
  { role: 'tutor', loginId: 'TU-042', label: 'Mark Antipo' },
  { role: 'learner', loginId: 'TE-128', label: 'Julian Gemelo' },
];

const GOOGLE_DEMO_PERSONAS = [
  { name: 'Cemer Daniel L. Miranda', email: 'cemerdaniel.miranda@lccbonline.edu.ph', badge: 'Student · 24-0870-103', role: 'learner' },
  { name: 'Mark Antipo', email: 'm.antipo@lccbonline.edu.ph', badge: 'Accredited Tutor · TU-042', role: 'tutor' },
  { name: 'Mrs. Bethel Tisuela', email: 'b.tisuela@lccbonline.edu.ph', badge: 'Faculty · FA-017', role: 'faculty' },
  { name: 'Juan Dela Cruz', email: 'juan.delacruz@gmail.com', badge: 'Personal Gmail · tests 403 block', role: 'blocked' },
];

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.87Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.07.72-2.44 1.15-4.05 1.15-3.12 0-5.77-2.11-6.72-4.96H1.28v3.09A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.28 14.28A7.12 7.12 0 0 1 4.91 12c0-.79.14-1.56.37-2.28V6.63H1.28a12 12 0 0 0 0 10.74l4-3.09Z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.63l4 3.09c.95-2.85 3.6-4.97 6.72-4.97Z" />
    </svg>
  );
}

const ROLE_TITLES = {
  learner: 'Student sign in',
  tutor: 'Tutor sign in',
  faculty: 'Faculty sign in',
  superadmin: 'Admin sign in',
};

/* ── Hero 3D scene: cartoonish brutalist cubes built from six faces ──── */
function HsCube({ name = '', float = '', bare = false, style, w, h, d, cF, cS, cT, label }) {
  const vars = {
    '--w': `${w}px`,
    '--h': `${h}px`,
    '--d': `${d}px`,
  };
  if (cF) vars['--cF'] = cF;
  if (cS) vars['--cS'] = cS;
  if (cT) vars['--cT'] = cT;
  const cube = (
    <div
      className={`hs-cube ${float}`.trim()}
      style={style ? { ...vars, ...style } : vars}
    >
      <i className="f f-front">{label ? <span className="hs-face-label" data-ch={label} /> : null}</i>
      <i className="f f-back" />
      <i className="f f-right" />
      <i className="f f-left" />
      <i className="f f-top" />
      <i className="f f-bottom" />
    </div>
  );
  if (bare) return cube;
  return (
    <div className={`hs-w ${name}`.trim()}>
      {cube}
    </div>
  );
}

const MENU_GROUPS = [
  {
    name: 'For learners',
    items: [
      { name: 'Find a tutor', value: 'Free', desc: 'Verified students who passed the qualification exam and were approved by the dean.' },
      { name: 'Book a session', value: '3 steps', desc: 'Pick a subject, a focus, and a time that fits between classes.' },
      { name: 'Attendance credit', value: '+25 pts', desc: 'Posted to the learner’s ledger when a checked-in session is wrapped up.' },
    ],
  },
  {
    name: 'For tutors',
    items: [
      { name: 'Accreditation', value: 'Exam + review', desc: 'One exam attempt and a document review, then the dean signs off.' },
      { name: 'Session credit', value: '50 pts', desc: 'Posted to your ledger after a completed, double-confirmed session.' },
      { name: 'Check in', value: '2 devices', desc: 'Tutor and learner confirm the same one-time code before the hour starts.' },
    ],
  },
  {
    name: 'For the college',
    items: [
      { name: 'Referrals', value: 'Live board', desc: 'Faculty flag a student early; the board tracks the hours to resolution.' },
      { name: 'Rewards', value: 'Catalog', desc: 'Campus perks, merchandise, and event passes, priced in community points.' },
      { name: 'Records', value: 'Permanent', desc: 'An append-only ledger of sessions, hours, points, and approvals.' },
    ],
  },
];

const STEPS = [
  {
    title: 'The nudge',
    text: 'A faculty member flags a student who needs help. The referral lands on the board with a topic and hours.',
    image: '/illustrations/elearning.svg',
    alt: 'Students studying at laptops',
    position: 'center 40%',
    credit: 'E-learning · Storyset',
  },
  {
    title: 'The match',
    text: 'The student picks a subject and an available window. The matcher returns accredited, available peers.',
    image: '/illustrations/college-students.svg',
    alt: 'Two students walking together with books',
    position: 'center 50%',
    credit: 'College students · Storyset',
  },
  {
    title: 'The booking',
    text: 'A session request carries the topic, date, time, and room. The tutor accepts; both dashboards update.',
    image: '/illustrations/back-to-school.svg',
    alt: 'Students with books and a backpack',
    position: 'center 50%',
    credit: 'Back to school · Storyset',
  },
  {
    title: 'The check-in',
    text: 'The tutor generates a one-time code. Both devices confirm it; the timer only starts after both parties match.',
    image: '/illustrations/classroom.svg',
    alt: 'Students working in a classroom',
    position: 'center 50%',
    credit: 'Classroom · Storyset',
  },
  {
    title: 'The hour',
    text: 'The session runs on the clock. Ending it opens the wrap-up: notes for the record, a rating from the learner.',
    image: '/illustrations/learning-bro.svg',
    alt: 'A student studying at a desk with a laptop',
    position: 'center 50%',
    credit: 'Learning · Storyset',
  },
  {
    title: 'The entry',
    text: 'Fifty points post to the tutor’s ledger; the learner earns 25 attendance points. Referral hours burn down by the hour.',
    image: '/illustrations/graduation.svg',
    alt: 'A graduate in cap and gown holding a diploma',
    position: 'center 30%',
    credit: 'Graduation · Storyset',
  },
];

const FAQS = [
  {
    q: 'Who can become a tutor?',
    a: 'Currently enrolled students who pass the qualification exam and are approved by the superadmin. Supporting documents — grades, honors, certificates — are part of the application and stay attached to the record.',
  },
  {
    q: 'How is a session verified?',
    a: 'The tutor generates a one-time code. The learner enters it on their device, and the tutor confirms on theirs. The timer starts only after both confirmations, so a session cannot be logged from one side alone.',
  },
  {
    q: 'How do points work?',
    a: 'A wrapped-up session credits 50 community points to the tutor’s ledger and 25 attendance points to the learner’s. The ledger is append-only: entries are never quietly edited or deleted.',
  },
  {
    q: 'What can points buy?',
    a: 'Campus perks, merchandise, and event passes from the rewards catalog. Stock and balances are live, and every redemption issues a claim voucher with a unique code.',
  },
  {
    q: 'What happens to a faculty referral?',
    a: 'It moves from flagged, to assigned, to in progress, to resolved as tutoring hours are completed. The learner sees the remaining hours on their dashboard; the faculty board follows the same record.',
  },
  {
    q: 'Who can see my record?',
    a: 'Learners see their own sessions, referrals, and progress. Tutors see their own sessions and ledger. Faculty see the referrals they create; the superadmin sees institution totals and pending applications.',
  },
];

const ILLUSTRATION_CREDITS = [
  {
    title: 'Teacher · Student',
    by: 'Storyset (Freepik Labs)',
    licence: 'free illustration',
    href: 'https://storyset.com/education',
  },
  {
    title: 'College students',
    by: 'Storyset (Freepik Labs)',
    licence: 'free illustration',
    href: 'https://storyset.com/education',
  },
  {
    title: 'Classroom',
    by: 'Storyset (Freepik Labs)',
    licence: 'free illustration',
    href: 'https://storyset.com/education',
  },
  {
    title: 'E-learning',
    by: 'Storyset (Freepik Labs)',
    licence: 'free illustration',
    href: 'https://storyset.com/education',
  },
  {
    title: 'Back to school',
    by: 'Storyset (Freepik Labs)',
    licence: 'free illustration',
    href: 'https://storyset.com/education',
  },
  {
    title: 'Learning',
    by: 'Storyset (Freepik Labs)',
    licence: 'free illustration',
    href: 'https://storyset.com/education',
  },
  {
    title: 'Graduation',
    by: 'Storyset (Freepik Labs)',
    licence: 'free illustration',
    href: 'https://storyset.com/education',
  },
];

const fmt = (value) => new Intl.NumberFormat('en-US').format(Number(value) || 0);
const fmtHours = (value) => {
  const hours = Number(value) || 0;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(hours);
};
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export default function LandingPage({ onLogin }) {
  const [showLogin, setShowLogin] = useState(false);
  /* Sketched-draft opening: the hero renders through a rough pencil filter
   * that "inks in" over ~1s; then the finished UI stands alone. */
  const [sketching, setSketching] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    if (!sketching) return undefined;
    // the SMIL tracks hang on begin="indefinite": start them now, at mount,
    // so the draft phase runs from this moment, inking in over ~1.05s.
    document.querySelectorAll('#acid-sketch animate').forEach((a) => a.beginElement());
    const t = setTimeout(() => setSketching(false), 1150);
    return () => clearTimeout(t);
  }, []);
  const [loginRole, setLoginRole] = useState('learner');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null);
  const [overviewFailed, setOverviewFailed] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [railProgress, setRailProgress] = useState(0);
  const railRef = useRef(null);
  const tickerRef = useRef(null);
  const stageRef = useRef(null);
  const loginDialogRef = useRef(null);
  const loginPreviousFocusRef = useRef(null);

  const totals = overview?.totals ?? null;
  const subjects = overview?.subjects ?? [];
  const honorRoll = overview?.tutors ?? [];
  const chosenSubject = subjects.find(s => s.code === selectedSubject) ?? null;

  useEffect(() => {
    let cancelled = false;
    api.get('/public/overview')
      .then(data => { if (!cancelled) setOverview(data); })
      .catch(() => { if (!cancelled) setOverviewFailed(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      stage.setAttribute('data-bg-paused', 'true');
      return undefined;
    }
    let inView = true;
    const syncPause = () => {
      if (!inView || document.hidden) stage.setAttribute('data-bg-paused', 'true');
      else stage.removeAttribute('data-bg-paused');
    };
    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting;
          syncPause();
        })
      : null;
    io?.observe(stage);
    document.addEventListener('visibilitychange', syncPause);

    const onMove = (event) => {
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      stage.style.setProperty('--tilt-x', `${(-8 - x * 20).toFixed(2)}deg`);
      stage.style.setProperty('--tilt-y', `${(6 + y * 14).toFixed(2)}deg`);
    };
    const onLeave = () => {
      stage.style.setProperty('--tilt-x', '-8deg');
      stage.style.setProperty('--tilt-y', '6deg');
    };
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerleave', onLeave);
    return () => {
      io?.disconnect();
      document.removeEventListener('visibilitychange', syncPause);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;
    const update = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      setRailProgress(max > 8 ? Math.round((rail.scrollLeft / max) * 100) : 100);
    };
    update();
    rail.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      rail.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    const track = tickerRef.current;
    if (!track) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const distance = track.scrollWidth / 2;
    if (!distance) return undefined;
    const anim = animate(track, {
      x: [0, -distance],
      duration: Math.max(22000, distance * 26),
      ease: 'linear',
      loop: true,
    });
    return () => anim.pause();
  }, [overview]);

  useEffect(() => {
    if (!showLogin) return undefined;
    const previous = document.body.style.overflow;
    loginPreviousFocusRef.current = document.activeElement;
    document.body.style.overflow = 'hidden';
    const focusTimer = setTimeout(() => focusFirst(loginDialogRef.current, '#school-id'), 30);
    const onKey = (event) => {
      if (event.key === 'Escape') { closeLogin(); return; }
      trapTabKey(event, loginDialogRef.current);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
      loginPreviousFocusRef.current?.focus?.();
    };
  }, [showLogin]);

  const openLogin = (role = 'learner') => {
    setLoginRole(role);
    setShowLogin(true);
    setShowGoogleChooser(false);
    setCustomGoogleEmail('');
    setGoogleLoading(false);
    setError('');
    setPassword('');
  };

  const closeLogin = () => {
    setShowLogin(false);
    setShowGoogleChooser(false);
    setCustomGoogleEmail('');
    setGoogleLoading(false);
    setError('');
    setPassword('');
  };

  const completeGoogleAuth = async (payload) => {
    setError('');
    setGoogleLoading(true);
    try {
      const { user, sessionExpiresAt } = await api.post('/auth/google', payload);
      saveSession(user, sessionExpiresAt);
      onLogin(user, sessionExpiresAt);
      setShowGoogleChooser(false);
      setCustomGoogleEmail('');
      setShowLogin(false);
    } catch (err) {
      setError(err.message || 'Google sign in failed.');
    } finally {
      // Supabase is only a login handoff; drop its local token so it cannot auto-refresh forever.
      supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      setGoogleLoading(false);
    }
  };

  // Listen for Supabase OAuth redirect completion
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        if (session.provider_token) {
          await completeGoogleAuth({ accessToken: session.provider_token });
        } else if (session.user.email) {
          await completeGoogleAuth({
            demoEmail: session.user.email,
            demoName: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
          });
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setError('');
    // 1. Supabase Google Sign-In with LCCB domain restriction
    if (import.meta.env.VITE_SUPABASE_ANON_KEY) {
      try {
        setGoogleLoading(true);
        await signInWithGoogleLccb();
        return;
      } catch (err) {
        setGoogleLoading(false);
        setError(err.message || 'Supabase Google sign-in could not start.');
        return;
      }
    }

    // 2. Google Identity Services (GIS) direct client
    if (GOOGLE_CLIENT_ID && window.google?.accounts?.oauth2) {
      try {
        setGoogleLoading(true);
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'openid email profile',
          hd: 'lccbonline.edu.ph',
          prompt: 'select_account',
          callback: (tokenResponse) => {
            if (tokenResponse?.access_token) {
              completeGoogleAuth({ accessToken: tokenResponse.access_token });
              return;
            }
            setGoogleLoading(false);
            if (tokenResponse?.error && tokenResponse.error !== 'access_denied') {
              setError('Google sign in could not be completed.');
            }
          },
          error_callback: (err) => {
            setGoogleLoading(false);
            if (err?.type === 'popup_failed_to_open') {
              setError('Popup was blocked. Allow popups or sign in with your LCCB school ID.');
            } else if (err?.type !== 'popup_closed') {
              setError('Google sign in window closed before completion.');
            }
          },
        });
        tokenClient.requestAccessToken();
      } catch {
        setGoogleLoading(false);
        setError('Google Sign-In could not initialize. Use your LCCB school ID below.');
      }
      return;
    }

    // Fallback to Google Demo Account Chooser when VITE_GOOGLE_CLIENT_ID is not configured
    setShowGoogleChooser((prev) => !prev);
  };

  const handleCustomGoogleSubmit = (event) => {
    event.preventDefault();
    const trimmed = customGoogleEmail.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Enter an email address (e.g. name@lccbonline.edu.ph).');
      return;
    }
    completeGoogleAuth({ demoEmail: trimmed });
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    if (!schoolId.trim() || !password) {
      setError('Enter your LCCB school ID (or email) and password.');
      return;
    }
    setLoading(true);
    try {
      const { user, sessionExpiresAt } = await api.post('/auth/login', { loginId: schoolId.trim(), password });
      saveSession(user, sessionExpiresAt);
      onLogin(user, sessionExpiresAt);
      setShowLogin(false);
    } catch (err) {
      setError(err.message || 'Sign in failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const scrollRail = (direction) => {
    railRef.current?.scrollBy({ left: direction * 312, behavior: 'smooth' });
  };

  const jumpTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const tickerItems = [
    'Live community ledger',
    `${fmt(totals?.tutors)} verified tutors`,
    `${fmtHours(totals?.hours)} hours on the record`,
    `${fmt(totals?.points_issued)} points issued`,
    'Every session double-confirmed',
    'Referrals tracked to resolution',
  ];

  const reveal = {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.55, ease: 'easeOut' },
  };

  const subjectResult = (() => {
    if (overviewFailed) return 'The ledger is offline. Sign in to read the course entries.';
    if (!chosenSubject) return 'Pick a course to read its entry.';
    const tutorCount = chosenSubject.tutors ?? 0;
    const sessionCount = chosenSubject.sessions ?? 0;
    return (
      <>
        <strong>{plural(tutorCount, 'accredited tutor', 'accredited tutors')}</strong> on file
        <span className="sep"> · </span>
        <strong>{plural(sessionCount, 'completed session', 'completed sessions')}</strong> logged
        <span className="sep"> · </span>
        {chosenSubject.department}
      </>
    );
  })();

  return (
    <div className="ledger-page">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:border-2 focus:border-ink focus:bg-gold focus:px-4 focus:py-2.5 focus:text-[13px] focus:font-bold focus:text-ink focus:shadow-[4px_4px_0_var(--color-ink)]"
      >
        Skip to main content
      </a>
      {/* ── Sketch filter: the hero opens as a rough pencil draft and inks in ──
       * The whole filter animates toward identity (SMIL), so removing the class
       * at 1.2s is seamless — scale 0 + saturate 1 + slope 1 == passthrough. */}
      <svg className="sketch-filter-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="acid-sketch" x="-4%" y="-6%" width="108%" height="112%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.021 0.032" numOctaves="2" seed="7" result="grain" />
            <feDisplacementMap in="SourceGraphic" in2="grain" scale="0" xChannelSelector="R" yChannelSelector="G" result="rough">
              <animate begin="indefinite" attributeName="scale" values="27;24;0" keyTimes="0;0.28;1" dur="0.95s" fill="freeze" calcMode="spline" keySplines="0.3 0 0.4 1;0 0 0.2 1" />
            </feDisplacementMap>
            <feColorMatrix in="rough" type="saturate" values="1" result="ink">
              <animate begin="indefinite" attributeName="values" values="0.05;0.08;1" keyTimes="0;0.32;1" dur="1.05s" fill="freeze" />
            </feColorMatrix>
            <feComponentTransfer in="ink">
              <feFuncR type="linear" slope="1" intercept="0">
                <animate begin="indefinite" attributeName="slope" values="2.25;2.25;1" keyTimes="0;0.38;1" dur="1.05s" fill="freeze" />
                <animate begin="indefinite" attributeName="intercept" values="-0.63;-0.63;0" keyTimes="0;0.38;1" dur="1.05s" fill="freeze" />
              </feFuncR>
              <feFuncG type="linear" slope="1" intercept="0">
                <animate begin="indefinite" attributeName="slope" values="2.25;2.25;1" keyTimes="0;0.38;1" dur="1.05s" fill="freeze" />
                <animate begin="indefinite" attributeName="intercept" values="-0.63;-0.63;0" keyTimes="0;0.38;1" dur="1.05s" fill="freeze" />
              </feFuncG>
              <feFuncB type="linear" slope="1" intercept="0">
                <animate begin="indefinite" attributeName="slope" values="2.25;2.25;1" keyTimes="0;0.38;1" dur="1.05s" fill="freeze" />
                <animate begin="indefinite" attributeName="intercept" values="-0.63;-0.63;0" keyTimes="0;0.38;1" dur="1.05s" fill="freeze" />
              </feFuncB>
              <feFuncA type="identity" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      <main id="main-content">
        {/* ── First screen: full-width neo-brutalist poster ────────────────── */}
        <section
          className={`ledger-hero hero-poster${sketching ? ' sketching' : ''}`}
          ref={stageRef}
          aria-labelledby="hero-title"
        >
          {/* ── Live Network Telemetry Background (z-0, non-interactive) ──── */}
          <div className="hero-telemetry-bg" aria-hidden="true">
            <div className="hero-telemetry-grid" />

            {/* Full-width responsive SVG with 3 cubic-bezier dotted paths + glowing packets */}
            <svg
              className="hero-telemetry-svg"
              viewBox="0 0 1440 720"
              preserveAspectRatio="none"
              focusable="false"
            >
              <defs>
                <filter id="tel-dot-glow" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <path
                  id="tel-path-1"
                  d="M -40 190 C 310 70, 560 330, 880 175 C 1120 65, 1290 250, 1480 140"
                />
                <path
                  id="tel-path-2"
                  d="M -40 370 C 260 470, 590 200, 910 350 C 1150 460, 1310 290, 1480 380"
                />
                <path
                  id="tel-path-3"
                  d="M -40 510 C 340 360, 650 540, 1020 390 C 1220 310, 1350 470, 1480 430"
                />
              </defs>

              <use href="#tel-path-1" className="hero-telemetry-path" />
              <use href="#tel-path-2" className="hero-telemetry-path hero-telemetry-path-alt" />
              <use href="#tel-path-3" className="hero-telemetry-path" />

              {/* Traveling glowing telemetry packets */}
              <g className="hero-telemetry-packets" filter="url(#tel-dot-glow)">
                <circle r="5" className="tel-packet tel-packet-gold">
                  <animateMotion dur="16s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#tel-path-1" />
                  </animateMotion>
                </circle>
                <circle r="4" className="tel-packet tel-packet-green">
                  <animateMotion dur="16s" begin="-8s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#tel-path-1" />
                  </animateMotion>
                </circle>
                <circle r="5" className="tel-packet tel-packet-green">
                  <animateMotion dur="19s" begin="-3s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#tel-path-2" />
                  </animateMotion>
                </circle>
                <circle r="4.5" className="tel-packet tel-packet-gold">
                  <animateMotion dur="19s" begin="-12s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#tel-path-2" />
                  </animateMotion>
                </circle>
                <circle r="5" className="tel-packet tel-packet-gold">
                  <animateMotion dur="22s" begin="-5s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#tel-path-3" />
                  </animateMotion>
                </circle>
                <circle r="4" className="tel-packet tel-packet-green">
                  <animateMotion dur="22s" begin="-15s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#tel-path-3" />
                  </animateMotion>
                </circle>
              </g>
            </svg>

            {/* 5 Floating Live Nodes along the curves */}
            <div className="hero-telemetry-nodes">
              <div className="hero-live-node node-1">
                <span className="hero-node-avatar hero-node-avatar-gold">MA</span>
                <span className="hero-node-dot" />
                <span className="hero-node-label">IT 101 · <b>LIVE</b></span>
              </div>
              <div className="hero-live-node node-2">
                <span className="hero-node-avatar hero-node-avatar-navy">AD</span>
                <span className="hero-node-dot" />
                <span className="hero-node-label">PROG 201 · <b>LIVE</b></span>
              </div>
              <div className="hero-live-node node-3">
                <span className="hero-node-avatar hero-node-avatar-teal">RT</span>
                <span className="hero-node-dot" />
                <span className="hero-node-label">CALC 1 · <b>LIVE</b></span>
              </div>
              <div className="hero-live-node node-4">
                <span className="hero-node-avatar hero-node-avatar-gold">JC</span>
                <span className="hero-node-dot" />
                <span className="hero-node-label">ACCTG · <b>LIVE</b></span>
              </div>
              <div className="hero-live-node node-5">
                <span className="hero-node-avatar hero-node-avatar-navy">KL</span>
                <span className="hero-node-dot" />
                <span className="hero-node-label">NURS 102 · <b>LIVE</b></span>
              </div>
            </div>

            {/* Corner Telemetry Wireframe Window Cards (opacity-40) */}
            <div className="hero-telemetry-card hero-telemetry-card-left">
              <div className="hero-tel-bar">
                <span className="hero-tel-dots"><i /><i /><i /></span>
                <span className="hero-tel-title">NET_TELEMETRY // PEER_NODES</span>
              </div>
              <div className="hero-tel-body">
                <div className="hero-tel-metric">
                  <span className="hero-tel-count">{totals ? fmt(totals.tutors) : '12'}</span>
                  <span className="hero-tel-meta">ACTIVE TUTORS<small>SYNC · 99.8%</small></span>
                </div>
                <div className="hero-tel-eq">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <span key={i} style={{ '--eq-i': i }} />
                  ))}
                </div>
              </div>
            </div>

            <div className="hero-telemetry-card hero-telemetry-card-right">
              <div className="hero-tel-bar">
                <span className="hero-tel-dots"><i /><i /><i /></span>
                <span className="hero-tel-title">LEDGER_SYNC // ACTIVITY</span>
              </div>
              <div className="hero-tel-body">
                <div className="hero-tel-metric">
                  <span className="hero-tel-count">{totals ? fmtHours(totals.hours) : '21'}h</span>
                  <span className="hero-tel-meta">VERIFIED HOURS<small>LIVE FEED</small></span>
                </div>
                <div className="hero-tel-chart">
                  {[42, 68, 54, 86, 62, 94, 78].map((h, i) => (
                    <span key={i} style={{ '--bar-h': `${h}%`, '--bar-i': i }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <span className="ledger-sticker" aria-hidden="true">Peer<br />verified</span>

          <div className="hero-poster-stage">
            {/* Interactive 3D floating brutalist blocks (hover + pointer tilt) */}
            <div className="hs-scene" aria-hidden="true">
              {/* Upper-left gold star cube */}
              <HsCube
                name="hs-star"
                float="hs-bob-a"
                w={68}
                h={72}
                d={24}
                cF="var(--lg-gold)"
                cS="var(--lg-paper)"
                cT="var(--lg-navy)"
              />

              {/* Far upper-left LCCB horizontal block */}
              <HsCube
                name="hs-book2"
                float="hs-bob-b"
                w={114}
                h={40}
                d={84}
                cF="var(--lg-paper)"
                cS="var(--lg-gold)"
                cT="var(--lg-navy)"
                label="LCCB"
              />

              {/* Upper-right graduation cap with swinging tassel */}
              <div className="hs-w hs-cap">
                <HsCube
                  bare
                  float="hs-bob-a"
                  style={{ left: 5, top: 34, '--rx': '16deg', '--ry': '-18deg' }}
                  w={144}
                  h={18}
                  d={144}
                  cF="#1E3D5C"
                  cS="#1E3D5C"
                  cT="var(--lg-gold)"
                />
                <HsCube
                  bare
                  float="hs-bob-a"
                  style={{ left: 60, top: 14, '--rx': '16deg', '--ry': '-18deg' }}
                  w={24}
                  h={22}
                  d={24}
                  cF="var(--lg-gold)"
                  cS="var(--lg-gold)"
                  cT="var(--lg-gold)"
                />
                <div className="hs-cap-tassel">
                  <div className="hs-cap-swing">
                    <HsCube
                      bare
                      style={{ left: 6, top: 0 }}
                      w={10}
                      h={46}
                      d={10}
                      cF="var(--lg-gold)"
                      cS="var(--lg-gold)"
                      cT="var(--lg-gold)"
                    />
                    <HsCube
                      bare
                      style={{ left: 0, top: 46 }}
                      w={22}
                      h={22}
                      d={22}
                      cF="var(--lg-gold)"
                      cS="var(--lg-gold)"
                      cT="var(--lg-gold)"
                    />
                  </div>
                </div>
              </div>

              {/* Mid-left stack of 3 gold point bars */}
              <div className="hs-w hs-coins">
                <HsCube
                  bare
                  float="hs-bob-b"
                  style={{ left: -2, top: -22, '--rx': '-6deg', '--ry': '-18deg' }}
                  w={74}
                  h={18}
                  d={46}
                  cF="var(--lg-gold)"
                  cS="var(--lg-navy)"
                  cT="var(--lg-gold)"
                />
                <HsCube
                  bare
                  float="hs-bob-b"
                  style={{ left: 2, top: 0, animationDelay: '0.45s', '--rx': '-6deg', '--ry': '-18deg' }}
                  w={74}
                  h={18}
                  d={46}
                  cF="var(--lg-gold)"
                  cS="var(--lg-navy)"
                  cT="var(--lg-paper)"
                />
                <HsCube
                  bare
                  float="hs-bob-b"
                  style={{ left: -3, top: 22, animationDelay: '0.9s', '--rx': '-6deg', '--ry': '-18deg' }}
                  w={74}
                  h={18}
                  d={46}
                  cF="var(--lg-gold)"
                  cS="var(--lg-navy)"
                  cT="var(--lg-paper)"
                />
              </div>

              {/* Mid-right 1:1 square block */}
              <HsCube
                name="hs-clock"
                float="hs-bob-b"
                w={82}
                h={82}
                d={26}
                cF="var(--lg-paper)"
                cS="var(--lg-gold)"
                cT="var(--lg-navy)"
                label="1:1"
              />

              {/* +50 pts sticker chip below 1:1 */}
              <div className="hs-chip hs-chip-pts">+50 pts</div>
            </div>

            {/* Centered brand wordmark + giant display headline */}
            <motion.div
              className="hero-poster-copy"
              initial={{ y: 12 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <div className="ledger-wordmark hero-poster-wordmark">
                <Logo2D className="ledger-brand-2d" />
                <small className="sr-only">La Consolacion College Bacolod</small>
              </div>
              <h1 id="hero-title">Peer tutoring<br />that <span className="ledger-mark">counts.</span></h1>
              <p className="sr-only">
                Book a verified student tutor, check in together, and watch every hour
                land on the official LCCB community ledger.
              </p>
            </motion.div>

            {/* Students cutout + unified telemetry bridge button wired into laptops */}
            <div className="hero-poster-visual">
              <div className="hero-bridge-wrap">
                <button
                  className="hero-bridge-btn"
                  type="button"
                  onClick={() => openLogin('learner')}
                  aria-label="Find a tutor - connect to verified student peer"
                >
                  <span className="hero-bridge-pill">
                    <span className="hero-bridge-pill-dot" />
                    PEER LINK
                  </span>
                  <span className="hero-bridge-label">
                    Find a tutor <ArrowRight size={18} strokeWidth={2.4} />
                  </span>
                </button>

                {/* Unified connection lines emerging from bottom socket jacks of the button */}
                <svg
                  className="hero-bridge-svg"
                  viewBox="0 0 320 84"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  focusable="false"
                >
                  <defs>
                    <linearGradient id="bridgeCableLeft" x1="110" y1="0" x2="38" y2="72" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#0F1E36" />
                      <stop offset="0.6" stopColor="#0F1E36" />
                      <stop offset="1" stopColor="#1E3D5C" />
                    </linearGradient>
                    <linearGradient id="bridgeCableRight" x1="210" y1="0" x2="282" y2="72" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#0F1E36" />
                      <stop offset="0.6" stopColor="#0F1E36" />
                      <stop offset="1" stopColor="#1E3D5C" />
                    </linearGradient>
                    <filter id="bridgePulseGlow" x="-60%" y="-60%" width="220%" height="220%">
                      <feGaussianBlur stdDeviation="2.5" result="glow" />
                      <feMerge>
                        <feMergeNode in="glow" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <path
                      id="bridgePathL"
                      d="M 112 0 C 82 14, 52 40, 38 70"
                    />
                    <path
                      id="bridgePathR"
                      d="M 208 0 C 238 14, 268 40, 282 70"
                    />
                  </defs>

                  {/* Socket Jack Connectors directly docking the button casing */}
                  <rect x="104" y="0" width="16" height="7" rx="1.5" fill="#0F1E36" stroke="#0F1E36" strokeWidth="1" />
                  <rect x="200" y="0" width="16" height="7" rx="1.5" fill="#0F1E36" stroke="#0F1E36" strokeWidth="1" />
                  <rect x="108" y="0" width="8" height="3" fill="var(--lg-gold)" />
                  <rect x="204" y="0" width="8" height="3" fill="var(--lg-gold)" />

                  {/* Heavy base pipelines (thick neo-brutalist border) */}
                  <path
                    d="M 112 0 C 82 14, 52 40, 38 70"
                    stroke="#0F1E36"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 208 0 C 238 14, 268 40, 282 70"
                    stroke="#0F1E36"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />

                  {/* Core interior conduit lines (amber gold neon core) */}
                  <path
                    d="M 112 0 C 82 14, 52 40, 38 70"
                    stroke="var(--lg-gold)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 208 0 C 238 14, 268 40, 282 70"
                    stroke="var(--lg-gold)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Live flowing telemetry pulses streaming into laptops */}
                  <g filter="url(#bridgePulseGlow)">
                    <circle r="3.5" fill="#22C55E" stroke="#0F1E36" strokeWidth="1">
                      <animateMotion dur="2.8s" repeatCount="indefinite">
                        <mpath href="#bridgePathL" />
                      </animateMotion>
                    </circle>
                    <circle r="3.5" fill="var(--lg-gold-bright)" stroke="#0F1E36" strokeWidth="1">
                      <animateMotion dur="2.8s" begin="-1.4s" repeatCount="indefinite">
                        <mpath href="#bridgePathL" />
                      </animateMotion>
                    </circle>
                    <circle r="3.5" fill="#22C55E" stroke="#0F1E36" strokeWidth="1">
                      <animateMotion dur="2.8s" begin="-0.7s" repeatCount="indefinite">
                        <mpath href="#bridgePathR" />
                      </animateMotion>
                    </circle>
                    <circle r="3.5" fill="var(--lg-gold-bright)" stroke="#0F1E36" strokeWidth="1">
                      <animateMotion dur="2.8s" begin="-2.1s" repeatCount="indefinite">
                        <mpath href="#bridgePathR" />
                      </animateMotion>
                    </circle>
                  </g>

                  {/* Left Laptop Magnetic Terminal Plug */}
                  <circle cx="38" cy="70" r="9" fill="#0F1E36" />
                  <circle cx="38" cy="70" r="6" fill="#FAF9F5" stroke="#0F1E36" strokeWidth="1.5" />
                  <circle cx="38" cy="70" r="3" fill="#22C55E" className="hero-bridge-led" />

                  {/* Right Laptop Magnetic Terminal Plug */}
                  <circle cx="282" cy="70" r="9" fill="#0F1E36" />
                  <circle cx="282" cy="70" r="6" fill="#FAF9F5" stroke="#0F1E36" strokeWidth="1.5" />
                  <circle cx="282" cy="70" r="3" fill="#22C55E" className="hero-bridge-led" />
                </svg>
              </div>

              <img
                className="hero-students-img"
                src="/hero-students.png"
                width="1200"
                height="512"
                alt="LCCB peer tutor with headset and student taking notes during a live video tutoring session"
              />
            </div>
          </div>

          <motion.div
            className="ledger-card-foot hero-poster-foot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            <p className="ledger-live">
              <span className="ledger-live-dot" aria-hidden="true" />
              {totals ? (
                <>
                  Live ledger · <b>{fmt(totals.tutors)}</b> tutors
                  <span className="sep">·</span> <b>{fmtHours(totals.hours)}</b> hours
                  <span className="sep">·</span> <b>{fmt(totals.points_issued)}</b> points
                </>
              ) : overviewFailed ? (
                <>Ledger offline · sign-in still works</>
              ) : (
                <>Live ledger · reading the record…</>
              )}
            </p>
            <div className="ledger-links">
              <button className="ledger-link" type="button" onClick={() => openLogin('learner')}>Student sign in</button>
              <button className="ledger-link" type="button" onClick={() => openLogin('tutor')}>Tutor portal</button>
              <button className="ledger-link" type="button" onClick={() => openLogin('faculty')}>Faculty &amp; admin</button>
            </div>
          </motion.div>
        </section>

        <div className="ledger-ticker" aria-hidden="true">
          <div className="ledger-ticker-track" ref={tickerRef}>
            {[0, 1].map(run => (
              <div className="ledger-ticker-run" key={run}>
                {tickerItems.map(item => (
                  <span className="ledger-ticker-item" key={item}>
                    {item}<i>/</i>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── 1. Capabilities as a printed menu ─────────────────────────────── */}
        <section id="ledger" className="ledger-section ledger-field-navy">
          <motion.div {...reveal}>
            <div className="ledger-menu-sheet">
              <span className="ledger-sheet-tag" aria-hidden="true">Official ledger</span>
              <h2>What’s on the <span className="ledger-title-mark">ledger</span></h2>
              <div className="ledger-menu-groups">
                {MENU_GROUPS.map(group => (
                  <div className="ledger-menu-group" key={group.name}>
                    <h3>{group.name}</h3>
                    {group.items.map(item => (
                      <div className="ledger-menu-row" key={item.name}>
                        <span className="name">{item.name}</span>
                        <span className="leader" aria-hidden="true" />
                        <span className="value">{item.value}</span>
                        <span className="desc">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="ledger-lookup">
                <label htmlFor="course-lookup">Check a course</label>
                <select
                  id="course-lookup"
                  value={selectedSubject}
                  onChange={(event) => setSelectedSubject(event.target.value)}
                  disabled={!overview}
                >
                  <option value="">
                    {overviewFailed ? 'Ledger unavailable' : overview ? 'Choose a course code' : 'Reading the ledger…'}
                  </option>
                  {subjects.map(subject => (
                    <option key={subject.code} value={subject.code}>
                      {subject.code} — {subject.name}
                    </option>
                  ))}
                </select>
                <p className="ledger-lookup-result" aria-live="polite">{subjectResult}</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── 2. How it’s filed — a horizontal row of moments ───────────────── */}
        <section id="how-it-works" className="ledger-section ledger-field-paper" aria-labelledby="how-title">
          <motion.div {...reveal}>
            <div className="ledger-row-head">
              <div>
                <h2 id="how-title">How it’s <span className="ledger-title-mark">filed</span></h2>
                <p style={{ color: 'var(--lg-muted)', fontSize: 16, margin: '10px 0 0', maxWidth: '38ch' }}>
                  Six moments, one record. Drag the row or use the arrows.
                </p>
              </div>
              <div className="ledger-row-buttons">
                <button className="ledger-square-btn" type="button" aria-label="Previous moments" onClick={() => scrollRail(-1)}>
                  <ArrowLeft size={20} strokeWidth={1.7} />
                </button>
                <button className="ledger-square-btn" type="button" aria-label="Next moments" onClick={() => scrollRail(1)}>
                  <ArrowRight size={20} strokeWidth={1.7} />
                </button>
              </div>
            </div>
            <div className="ledger-progress" aria-hidden="true">
              <span style={{ width: `${Math.max(6, railProgress)}%` }} />
            </div>
            <div className="ledger-rail" ref={railRef}>
              {STEPS.map((step, idx) => (
                <article className="ledger-step" key={step.title}>
                  <span className="ledger-step-num" aria-hidden="true">0{idx + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  <figure>
                    <img
                      src={step.image}
                      alt={step.alt}
                      loading="lazy"
                      style={{ objectPosition: step.position }}
                    />
                    <figcaption>{step.credit}</figcaption>
                  </figure>
                </article>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── 3. Proof as a printed honor roll ──────────────────────────────── */}
        <section id="proof" className="ledger-proof" aria-labelledby="proof-title">
          <motion.div {...reveal}>
            <div className="ledger-section-head">
              <div>
                <h2 id="proof-title">On the <span className="ledger-title-mark">record</span></h2>
                <p>This term’s tutor balances, read live from the ledger.</p>
              </div>
            </div>
            <div className="ledger-proof-stage">
              <article className="ledger-proof-card">
                <h2>This term’s honor roll</h2>
                <img
                  className="ledger-proof-photo"
                  src="/illustrations/graduation.svg"
                  alt="An LCCB graduate receives a diploma at commencement"
                  loading="lazy"
                  width="1600"
                  height="900"
                />
                <div className="ledger-proof-names">
                  {honorRoll.length === 0 ? (
                    <p className="ledger-proof-row">{overviewFailed ? 'The ledger is offline.' : 'Reading the ledger…'}</p>
                  ) : honorRoll.map((tutor, idx) => (
                    <span className="ledger-proof-row" key={tutor.name}>
                      <span className="ledger-proof-rank" aria-hidden="true">#{idx + 1}</span>
                      {tutor.name}
                      <span className="dot">·</span>
                      {tutor.program || 'LCCB'}
                      <span className="dot">·</span>
                      <span className="pts">{fmt(tutor.points)} pts</span>
                    </span>
                  ))}
                </div>
                <p className="ledger-proof-note">
                  {totals
                    ? `${fmt(totals.tutors)} verified tutors · ${plural(totals.sessions, 'completed session', 'completed sessions')}`
                    : 'Balances post after each wrap-up.'}
                </p>
              </article>
            </div>
          </motion.div>
        </section>

        {/* ── 4. Questions beside a tall photograph ─────────────────────────── */}
        <section id="faq" className="ledger-section ledger-field-paper" aria-labelledby="faq-title">
          <div className="ledger-faq-grid">
            <motion.div {...reveal}>
              <div className="ledger-faq-left">
                <h2 id="faq-title">Before you <span className="ledger-title-mark">book</span></h2>
                <div className="ledger-faq-facts">
                  <p><span>Where · </span>Library study rooms</p>
                  <p><span>When · </span>By appointment, set at booking</p>
                  <p><span>Cost · </span>Free for enrolled students</p>
                </div>
              </div>

              <div className="ledger-faq-list">
                {FAQS.map((item, index) => (
                  <details className="ledger-faq-item" key={item.q} open={index === 0}>
                    <summary>
                      {item.q}
                      <span className="ledger-faq-chevron" aria-hidden="true" />
                    </summary>
                    <p>{item.a}</p>
                  </details>
                ))}
              </div>

              <div className="ledger-faq-actions">
                <button className="ledger-action" type="button" onClick={() => openLogin('learner')} style={{ marginTop: 0, height: 52 }}>
                  Find a tutor <ArrowRight size={18} strokeWidth={1.7} />
                </button>
                <button className="ledger-link" type="button" onClick={() => jumpTo('ledger')}>
                  Read the ledger again
                </button>
              </div>
            </motion.div>

            <motion.div {...reveal} className="ledger-faq-photos">
              <img
                className="ledger-faq-tall"
                src="/illustrations/classroom.svg"
                alt="Students working in a classroom"
                loading="lazy"
                width="800"
                height="1066"
              />
              <img
                className="ledger-faq-square"
                src="/illustrations/back-to-school.svg"
                alt="Students with books and a backpack"
                loading="lazy"
                width="600"
                height="600"
              />
              <p className="ledger-photo-credit">
                Flat illustrations from Storyset (freepik labs), free for personal and commercial use.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── 5. The reply card ─────────────────────────────────────────────── */}
        <section id="sign-in" className="ledger-cta" aria-labelledby="cta-title">
          <div className="ledger-hazard-band" aria-hidden="true" />
          <motion.div {...reveal} className="ledger-cta-grid">
            <p className="ledger-cta-note">
              Help becomes a <span className="ledger-title-mark ledger-title-mark-paper">record.</span>
            </p>
            <div className="ledger-reply-card">
              <span className="ledger-reply-stamp" aria-hidden="true">Instant check-in</span>
              <h2 id="cta-title">Start your first entry.</h2>
              <p>Sign in with your LCCB school ID. Booking, check-in, and points are already wired.</p>
              <button className="ledger-action" type="button" onClick={() => openLogin('learner')}>
                Go to sign in <ArrowRight size={18} strokeWidth={1.7} />
              </button>
              <p className="ledger-reply-small">Official use · La Consolacion College Bacolod</p>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ── Back of the object ────────────────────────────────────────────── */}
      <footer className="ledger-footer">
        <div className="ledger-footer-grid">
          <div>
            <h3>LCCB Academix</h3>
            <p>
              The official faculty-guided peer tutoring and incentive ledger of
              La Consolacion College Bacolod.
            </p>
            <p style={{ marginTop: 12 }}>Bacolod City, Negros Occidental, Philippines</p>
          </div>
          <div>
            <p className="footer-label">The object</p>
            <div className="ledger-footer-links">
              <button type="button" onClick={() => jumpTo('ledger')}>What’s on the ledger</button>
              <button type="button" onClick={() => jumpTo('how-it-works')}>How it’s filed</button>
              <button type="button" onClick={() => jumpTo('proof')}>On the record</button>
              <button type="button" onClick={() => jumpTo('faq')}>Before you book</button>
              <button type="button" onClick={() => openLogin('learner')}>Sign in</button>
            </div>
          </div>
          <div>
            <p className="footer-label">Illustrations</p>
            <div className="ledger-credits">
              {ILLUSTRATION_CREDITS.map(credit => (
                <p className="ledger-credit" key={credit.title}>
                  <a href={credit.href} target="_blank" rel="noreferrer">{credit.title}</a>
                  {' '}— {credit.by}, {credit.licence}.
                </p>
              ))}
              <p className="ledger-credit" style={{ marginTop: 4 }}>
                Flat illustrations from Storyset (freepik labs), free for personal and commercial use.
              </p>
            </div>
          </div>
        </div>
        <div className="ledger-fineprint">
          <span>© 2026 La Consolacion College Bacolod. All rights reserved.</span>
          <span>Ledger live · built for the LCCB community</span>
        </div>
      </footer>

      {/* ── Sign-in slip ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showLogin && (
          <motion.div
            className="login-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLogin}
          >
            <motion.div
              ref={loginDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="login-title"
              className="login-sheet"
              initial={{ opacity: 0, y: 16, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.985 }}
              transition={{ duration: 0.18 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="login-sheet-band" aria-hidden="true">
                {Array.from({ length: 20 }).map((_, i) => <span key={i} />)}
              </div>
              <div className="login-sheet-body">
                <button className="login-close" type="button" onClick={closeLogin} aria-label="Close sign in">
                  <X size={20} strokeWidth={1.6} />
                </button>
                <p className="login-wordmark">LCCB Academix</p>
                <h2 id="login-title">{ROLE_TITLES[loginRole]}</h2>
                <p className="login-sub">Use your LCCB school ID or email.</p>

                <div className="login-roles" role="group" aria-label="Sign-in type">
                  {Object.entries(ROLE_TITLES).map(([role, title]) => (
                    <button
                      key={role}
                      type="button"
                      aria-pressed={loginRole === role}
                      className={`login-role${loginRole === role ? ' active' : ''}`}
                      onClick={() => setLoginRole(role)}
                    >
                      {title.replace(' sign in', '')}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div id="login-error-msg" role="alert" className="login-error">{error}</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  className="login-google-btn"
                  type="button"
                  disabled={loading || googleLoading}
                  onClick={handleGoogleSignIn}
                >
                  {googleLoading ? <Loader2 size={18} className="animate-spin" /> : <GoogleMark />}
                  <span>{googleLoading ? 'Verifying Google account…' : 'Continue with Google (@lccbonline.edu.ph)'}</span>
                </button>

                {showGoogleChooser && (
                  <div className="login-google-chooser" role="region" aria-label="Google OAuth Demo Account Chooser">
                    <div className="login-google-chooser-head">
                      <span>Choose a Google account (Demo)</span>
                      <button type="button" onClick={() => setShowGoogleChooser(false)}>Cancel</button>
                    </div>
                    <div className="login-google-chooser-list">
                      {GOOGLE_DEMO_PERSONAS.map((persona) => (
                        <button
                          key={persona.email}
                          type="button"
                          disabled={googleLoading}
                          className={`login-google-persona${persona.role === 'blocked' ? ' is-blocked' : ''}`}
                          onClick={() => completeGoogleAuth({ demoEmail: persona.email, demoName: persona.name })}
                        >
                          <strong>{persona.name}</strong>
                          <span>{persona.email}</span>
                          <small>{persona.badge}</small>
                        </button>
                      ))}
                    </div>
                    <form className="login-google-custom" onSubmit={handleCustomGoogleSubmit}>
                      <input
                        type="email"
                        aria-label="Test any Google email"
                        placeholder="panelist@lccbonline.edu.ph"
                        value={customGoogleEmail}
                        onChange={(event) => setCustomGoogleEmail(event.target.value)}
                      />
                      <button type="submit" disabled={googleLoading}>Test email</button>
                    </form>
                  </div>
                )}

                <div className="login-divider" aria-hidden="true">
                  <span>or use school ID &amp; password</span>
                </div>

                <form className="login-form" onSubmit={handleLogin}>
                  <div className="login-field">
                    <label htmlFor="school-id">School ID or email</label>
                    <input
                      id="school-id"
                      className="login-input"
                      placeholder="24-0870-103 or name@lccbonline.edu.ph"
                      autoComplete="username"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? 'login-error-msg' : undefined}
                      value={schoolId}
                      onChange={(event) => setSchoolId(event.target.value)}
                    />
                  </div>
                  <div className="login-field">
                    <label htmlFor="password">Password</label>
                    <input
                      id="password"
                      className="login-input"
                      type="password"
                      placeholder="Your password"
                      autoComplete="current-password"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? 'login-error-msg' : undefined}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </div>

                  <button className="login-submit" type="submit" disabled={loading || googleLoading}>
                    {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                    {loading ? 'Signing in…' : 'Sign in'}
                  </button>
                </form>

                <p className="login-consent">
                  By signing in, you agree that session, referral, and accreditation records are
                  stored for official LCCB use. Supporting documents are visible only to the
                  applicant and reviewing staff.
                </p>

                {DEMO_ACCOUNTS.length > 0 && (
                  <div className="login-demo">
                    <div className="login-demo-head">
                      <p>Demo accounts — tap to fill</p>
                      {GOOGLE_CLIENT_ID ? (
                        <button
                          type="button"
                          className="login-demo-google-link"
                          onClick={() => setShowGoogleChooser((prev) => !prev)}
                        >
                          {showGoogleChooser ? 'Hide Google demo' : 'Simulate Google OAuth'}
                        </button>
                      ) : null}
                    </div>
                    <div className="login-demo-grid">
                      {DEMO_ACCOUNTS.map(account => (
                        <button
                          key={account.role}
                          type="button"
                          onClick={() => {
                            setLoginRole(account.role);
                            setSchoolId(account.loginId);
                            setPassword('demo1234');
                            setError('');
                          }}
                        >
                          <span>{account.role}</span>
                          <small>{account.label}</small>
                        </button>
                      ))}
                    </div>
                    <p className="login-hint">Password for all demo users: demo1234</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
