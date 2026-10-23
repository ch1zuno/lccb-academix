import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { animate } from 'animejs';
import { ArrowRight, ArrowLeft, Loader2, X } from 'lucide-react';
import api from '../api';
import { saveSession } from '../authToken';
import Logo3D from '../components/Logo3D';
import './Landing.css';

const DEV = import.meta.env.DEV;

const DEMO_ACCOUNTS = DEV ? [
  { role: 'superadmin', loginId: 'l.betita.admin@lccbacolod.edu.ph', label: 'Sir Lenuel Betita' },
  { role: 'faculty', loginId: 'b.tisuela@lccbacolod.edu.ph', label: 'Mrs. Bethel Tisuela' },
  { role: 'tutor', loginId: 'TU-042', label: 'Mark Antipo' },
  { role: 'learner', loginId: 'TE-128', label: 'Julian Gemelo' },
] : [];

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
  const [loginRole, setLoginRole] = useState('learner');
  const [loading, setLoading] = useState(false);
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
    if (reduce) return undefined;
    const onMove = (event) => {
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      stage.style.setProperty('--tilt-x', `${(-x * 24).toFixed(2)}deg`);
      stage.style.setProperty('--tilt-y', `${(9 + y * 16).toFixed(2)}deg`);
    };
    const onLeave = () => {
      stage.style.setProperty('--tilt-x', '-17deg');
      stage.style.setProperty('--tilt-y', '9deg');
    };
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerleave', onLeave);
    return () => {
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
    document.body.style.overflow = 'hidden';
    const onKey = (event) => { if (event.key === 'Escape') closeLogin(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [showLogin]);

  const openLogin = (role = 'learner') => {
    setLoginRole(role);
    setShowLogin(true);
    setError('');
    setPassword('');
  };

  const closeLogin = () => {
    setShowLogin(false);
    setError('');
    setPassword('');
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
      const { token, user } = await api.post('/auth/login', { loginId: schoolId.trim(), password });
      saveSession(token, user);
      onLogin(user);
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
      {/* ── First screen: the ledger as an object ─────────────────────────── */}
      <section className="ledger-hero" aria-labelledby="hero-title">
        <div className="ledger-hero-grid">
          <div className="ledger-card">
            <div className="ledger-band" aria-hidden="true">
              {Array.from({ length: 48 }).map((_, i) => <span key={i} />)}
            </div>
            <span className="ledger-sticker" aria-hidden="true">Peer<br />verified</span>
            <motion.div
              className="ledger-card-inner"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="ledger-wordmark">
                <Logo3D
                  className="ledger-monogram-3d"
                  fallback={<span className="ledger-monogram">LCCB</span>}
                />
                <span>
                  <strong>Academix</strong>
                  <small>La Consolacion College Bacolod</small>
                </span>
              </div>
              <h1 id="hero-title">Peer tutoring<br />that <span className="ledger-mark">counts.</span></h1>
              <p className="ledger-summary">
                Book a verified student tutor, check in together, and watch every hour
                land on the official LCCB community ledger.
              </p>
              <button className="ledger-action" type="button" onClick={() => openLogin('learner')}>
                Find a tutor <ArrowRight size={18} strokeWidth={2.2} />
              </button>
            </motion.div>
            <motion.div
              className="ledger-card-foot"
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
          </div>

          <div
            className="ledger-hero-stage"
            ref={stageRef}
            aria-label="Interactive peer-tutoring scene: move your pointer to tilt the blocks"
          >
            <div className="hs-floor" aria-hidden="true" />
            <div className="hs-sun" aria-hidden="true" />
            <div className="hs-shadow hs-shadow-a" aria-hidden="true" />
            <div className="hs-shadow hs-shadow-b" aria-hidden="true" />
            <div className="hs-scene" aria-hidden="true">
              {/* graduation cap with a swinging tassel */}
              <div className="hs-w hs-cap">
                <HsCube
                  bare
                  float="hs-bob-a"
                  style={{ left: 5, top: 44 }}
                  w={150}
                  h={20}
                  d={150}
                  cF="#1E3D5C"
                  cS="#1E3D5C"
                  cT="var(--lg-gold)"
                />
                <HsCube
                  bare
                  float="hs-bob-a"
                  style={{ left: 62, top: 20 }}
                  w={26}
                  h={26}
                  d={26}
                  cF="var(--lg-gold)"
                  cS="var(--lg-gold)"
                  cT="var(--lg-gold)"
                />
                <div className="hs-cap-tassel">
                  <div className="hs-cap-swing">
                    <HsCube
                      bare
                      style={{ left: 7, top: 0 }}
                      w={12}
                      h={52}
                      d={12}
                      cF="var(--lg-gold)"
                      cS="var(--lg-gold)"
                      cT="var(--lg-gold)"
                    />
                    <HsCube
                      bare
                      style={{ left: 0, top: 54 }}
                      w={24}
                      h={24}
                      d={24}
                      cF="var(--lg-gold)"
                      cS="var(--lg-gold)"
                      cT="var(--lg-gold)"
                    />
                  </div>
                </div>
              </div>

              {/* the record: a stack of ledgers */}
              <HsCube
                name="hs-book1"
                float="hs-bob-a"
                w={168}
                h={212}
                d={74}
                cF="var(--lg-gold)"
                cS="var(--lg-navy)"
                cT="var(--lg-paper)"
                label="A+"
              />
              <HsCube
                name="hs-book2"
                float="hs-bob-b"
                w={124}
                h={44}
                d={102}
                cF="var(--lg-paper)"
                cS="var(--lg-gold)"
                cT="var(--lg-navy)"
                label="LCCB"
              />

              {/* one-on-one, on the clock */}
              <HsCube
                name="hs-clock"
                float="hs-bob-b"
                w={112}
                h={112}
                d={34}
                cF="var(--lg-paper)"
                cS="var(--lg-gold)"
                cT="var(--lg-navy)"
                label="1:1"
              />

              {/* honor-roll star */}
              <HsCube
                name="hs-star"
                float="hs-bob-a"
                w={82}
                h={82}
                d={28}
                cF="var(--lg-gold)"
                cS="var(--lg-paper)"
                cT="var(--lg-navy)"
              />

              {/* session points in coins */}
              <div className="hs-w hs-coins">
                <HsCube
                  bare
                  float="hs-bob-b"
                  style={{ left: -4, top: -26, '--rx': '0deg', '--ry': '0deg' }}
                  w={96}
                  h={28}
                  d={96}
                  cF="var(--lg-gold)"
                  cS="var(--lg-navy)"
                  cT="var(--lg-gold)"
                />
                <HsCube
                  bare
                  float="hs-bob-b"
                  style={{ left: 2, top: 0, animationDelay: '0.45s', '--rx': '0deg', '--ry': '0deg' }}
                  w={96}
                  h={28}
                  d={96}
                  cF="var(--lg-gold)"
                  cS="var(--lg-navy)"
                  cT="var(--lg-paper)"
                />
                <HsCube
                  bare
                  float="hs-bob-b"
                  style={{ left: -2, top: 26, animationDelay: '0.9s', '--rx': '0deg', '--ry': '0deg' }}
                  w={96}
                  h={28}
                  d={96}
                  cF="var(--lg-gold)"
                  cS="var(--lg-navy)"
                  cT="var(--lg-paper)"
                />
              </div>

              {/* subject letter tiles, stacked like a stairway */}
              <div className="hs-w hs-math">
                {['M', 'A', 'T', 'H'].map((ch, i) => (
                  <HsCube
                    key={ch}
                    bare
                    float="hs-bob-b"
                    style={{
                      left: i * 57,
                      top: i * 27,
                      animationDelay: `${i * 0.5}s`,
                      '--rx': '-10deg',
                      '--ry': '-24deg',
                      '--tz': '26px',
                    }}
                    w={54}
                    h={54}
                    d={18}
                    cF="var(--lg-paper)"
                    cS="var(--lg-gold)"
                    cT="var(--lg-navy)"
                    label={ch}
                  />
                ))}
              </div>

              <div className="hs-chip hs-chip-pts">+50 pts</div>
              <div className="hs-chip hs-chip-role">TUTOR</div>
            </div>
            <div className="ledger-photo-stamp">
              LCCB, on the record.
              <span>Move your pointer — the blocks tilt. No photos, just brutalist 3D.</span>
            </div>
          </div>
        </div>
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
            <h2>What’s on the ledger</h2>
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
              <h2 id="how-title">How it’s filed</h2>
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
            {STEPS.map(step => (
              <article className="ledger-step" key={step.title}>
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
              <h2 id="proof-title">On the record</h2>
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
                ) : honorRoll.map(tutor => (
                  <span className="ledger-proof-row" key={tutor.name}>
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
              <h2 id="faq-title">Before you book</h2>
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
        <motion.div {...reveal} className="ledger-cta-grid">
          <p className="ledger-cta-note">
            Help becomes a record.
          </p>
          <div className="ledger-reply-card">
            <h2 id="cta-title">Start your first entry.</h2>
            <p>Sign in with your LCCB school ID. Booking, check-in, and points are already wired.</p>
            <button className="ledger-action" type="button" onClick={() => openLogin('learner')}>
              Go to sign in <ArrowRight size={18} strokeWidth={1.7} />
            </button>
            <p className="ledger-reply-small">Official use · La Consolacion College Bacolod</p>
          </div>
        </motion.div>
      </section>

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
                      className={`login-role${loginRole === role ? ' active' : ''}`}
                      onClick={() => setLoginRole(role)}
                    >
                      {title.replace(' sign in', '')}
                    </button>
                  ))}
                </div>

                <form className="login-form" onSubmit={handleLogin}>
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="login-error">{error}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="login-field">
                    <label htmlFor="school-id">School ID or email</label>
                    <input
                      id="school-id"
                      className="login-input"
                      placeholder="TE-128 or name@lccbacolod.edu.ph"
                      autoComplete="username"
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
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </div>

                  <button className="login-submit" type="submit" disabled={loading}>
                    {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                    {loading ? 'Signing in…' : 'Sign in'}
                  </button>
                </form>

                {DEMO_ACCOUNTS.length > 0 && (
                  <div className="login-demo">
                    <p>Demo accounts — tap to fill</p>
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
