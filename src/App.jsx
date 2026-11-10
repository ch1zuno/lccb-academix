import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  BookOpen, Bell, ChevronDown, Check, LayoutDashboard, Search, Clock,
  ShieldCheck, Users, Award, LogOut, Menu, X, Inbox, KeyRound, MessageSquare,
  User, WifiOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';
import { usePageTitle, fmtManilaDateTime } from './lib/ux';
import { Button } from './components/ui/button';

import api from './api';
import { loadSession, saveSession, clearSession } from './authToken';

import Login from './screens/Login';
import AccountDialog from './components/AccountDialog';
import Avatar from './components/ui/Avatar';
import SplashScreen from './components/SplashScreen';

/* Route-level code splitting keeps the landing bundle small; each role only
 * downloads the workspace it can enter. */
const SuperadminApprovals = React.lazy(() => import('./screens/SuperadminApprovals'));
const LearnerWizard = React.lazy(() => import('./screens/LearnerWizard'));
const Dashboard = React.lazy(() => import('./screens/Dashboard'));
const TutorExam = React.lazy(() => import('./screens/TutorExam'));
const TutorApplicant = React.lazy(() => import('./screens/TutorApplicant'));
const FacultyReferral = React.lazy(() => import('./screens/FacultyReferral'));
const SessionCheckIn = React.lazy(() => import('./screens/SessionCheckIn'));
const RewardCatalog = React.lazy(() => import('./screens/RewardCatalog'));
const Messages = React.lazy(() => import('./screens/Messages'));
const TutorProfile = React.lazy(() => import('./screens/TutorProfile'));
const MyTutors = React.lazy(() => import('./screens/MyTutors'));

/* Production builds hide the demo switcher unless VITE_DEMO_MODE=1. Local dev
 * keeps it on; VITE_DEMO_MODE=0 can disable it during a local production test. */
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === '1'
  || (import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE !== '0');

export const ROLE_LABELS = {
  superadmin: 'Superadmin (Dean)',
  faculty: 'Faculty / Advisor',
  tutor: 'Accredited Tutor',
  learner: 'Student (Learner)',
};

const DEMO_ROLES = [
  { role: 'learner', loginId: 'TE-128' },
  { role: 'tutor', loginId: 'TU-042' },
  { role: 'faculty', loginId: 'b.tisuela@lccbacolod.edu.ph' },
  { role: 'superadmin', loginId: 'l.betita.admin@lccbacolod.edu.ph' },
];

/* Which workspace actually owns each page. A direct URL (or a role switch made
 * while standing on a page) must never render another role's screen. */
const ROLE_ROUTES = {
  '/wizard': ['learner'],
  '/my-tutors': ['learner'],
  '/dashboard': ['learner', 'tutor', 'faculty', 'superadmin'],
  '/exam': ['learner', 'tutor'],
  '/tutor-pending': ['learner'],
  '/referral': ['faculty'],
  '/checkin': ['learner', 'tutor'],
  '/rewards': ['learner', 'tutor'],
  '/messages': ['learner', 'tutor'],
  '/approvals': ['superadmin'],
};

function RoleGate({ role, path, showToast, navigate, children }) {
  const allowed = (ROLE_ROUTES[path] ?? []).includes(role);
  useEffect(() => {
    if (!allowed) showToast('That page belongs to another workspace.', 'error');
    // showToast is intentionally not a dependency — it only calls setToast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);
  if (allowed) return children;
  const ownerLabels = (ROLE_ROUTES[path] ?? []).map(r => ROLE_LABELS[r] || r).join(' or ');
  return (
    <div role="alert" className="panel mx-auto mt-10 max-w-[560px] p-8 text-center">
      <p className="meta uppercase tracking-[0.14em] text-destructive">403 · Restricted workspace</p>
      <h1 className="mt-3 font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em]">
        That page belongs to another role.
      </h1>
      <p className="mt-2 text-[14px] text-muted-foreground">
        {ownerLabels ? `Only ${ownerLabels} accounts can open ${path}.` : 'Your current workspace does not have access to this page.'}
      </p>
      <Button className="mt-6" onClick={() => navigate('/dashboard')}>Back to my dashboard</Button>
    </div>
  );
}

const initialsOf = (name = '') => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

export default function App() {
  const [user, setUser] = useState(() => loadSession()?.user ?? null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileCloseRef = useRef(null);
  const [toast, setToast] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountTab, setAccountTab] = useState('profile');
  const [role, setRole] = useState(user?.role ?? 'learner');
  const [showSplash, setShowSplash] = useState(true);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const toastTimerRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.substring(1) || 'dashboard';

  const routeTitle = (() => {
    if (!user) {
      if (/^\/(profile|users|tutors)\//.test(location.pathname)) return 'Public Profile';
      if (location.pathname !== '/' && location.pathname !== '/login' && location.pathname !== '/dashboard' && !ROLE_ROUTES[location.pathname]) {
        return '404 Not Found';
      }
      return '';
    }
    const map = {
      '/dashboard': {
        superadmin: 'Institution Overview',
        faculty: 'Referral Board',
        tutor: 'Tutor Overview',
        learner: 'My Progress',
      }[role] || 'Dashboard',
      '/wizard': 'Find a Tutor',
      '/my-tutors': 'My Tutors',
      '/exam': role === 'tutor' ? 'Qualification Exam' : 'Become a Tutor',
      '/tutor-pending': 'Tutor Application & Exam',
      '/referral': 'New Faculty Referral',
      '/checkin': 'Session Check-In',
      '/rewards': 'Rewards Catalog',
      '/messages': 'Messages',
      '/approvals': 'Tutor Approvals',
    };
    if (/^\/(profile|users|tutors)\//.test(location.pathname)) return 'Public Profile';
    return map[location.pathname] ?? '404 Not Found';
  })();
  usePageTitle(routeTitle);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const showToast = (message, type = 'success', action = null) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type, action });
    toastTimerRef.current = setTimeout(() => setToast(null), action ? 5200 : 3200);
  };

  // Revalidate the persisted session against the API on boot.
  useEffect(() => {
    const stored = loadSession();
    if (!stored?.user) return;
    api.get('/auth/me')
      .then(({ user: fresh }) => { setUser(fresh); setRole(fresh.role); saveSession(fresh); })
      .catch(() => { clearSession(); setUser(null); });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setShowNotifications(false);
      setShowRoleMenu(false);
      setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The mobile workspace menu is a full-screen dialog: lock the page behind it
  // and put keyboard focus on its close control.
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    mobileCloseRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [mobileOpen]);

  const currentProfile = user
    ? {
      name: user.name,
      initials: initialsOf(user.name),
      subtitle: user.program
        ? `${user.program} · ${ROLE_LABELS[user.role] || user.role}`
        : (user.department || user.title || ROLE_LABELS[user.role] || user.role),
    }
    : null;

  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const refreshNotifications = () => {
    api.get('/notifications')
      .then(({ notifications: rows, unread }) => { setNotifications(rows ?? []); setUnreadNotifications(unread ?? 0); })
      .catch(() => {});
  };
  useEffect(() => { if (user) refreshNotifications(); }, [user?.id]);

  // Token expiry / revoke: api.js emits this on any 401 outside the login call.
  useEffect(() => {
    const onExpired = () => {
      clearSession();
      setUser(null);
      setShowRoleMenu(false);
      setMobileOpen(false);
      navigate('/dashboard');
      showToast('Session expired — sign in again.', 'error');
    };
    window.addEventListener('academix:unauthorized', onExpired);
    return () => window.removeEventListener('academix:unauthorized', onExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Keep the notification badge honest without a socket: focus + 30s poll.
  useEffect(() => {
    if (!user) return undefined;
    const timer = setInterval(refreshNotifications, 30_000);
    const onFocus = () => refreshNotifications();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markAllRead = () => {
    api.patch('/notifications', {}).then(refreshNotifications).catch(() => {});
  };

  // Chat badge: same idea as notifications — no socket, focus + 15s poll.
  const [unreadMessages, setUnreadMessages] = useState(0);

  const refreshUnreadMessages = () => {
    if (role !== 'learner' && role !== 'tutor') { setUnreadMessages(0); return; }
    api.get('/messages/unread')
      .then(({ unread }) => setUnreadMessages(unread ?? 0))
      .catch(() => {});
  };

  useEffect(() => { if (user) refreshUnreadMessages(); }, [user?.id, role]);

  useEffect(() => {
    if (!user || (role !== 'learner' && role !== 'tutor')) return undefined;
    const timer = setInterval(refreshUnreadMessages, 15_000);
    const onFocus = () => refreshUnreadMessages();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role]);

  const switchDemoRole = async (rId, loginId) => {
    try {
      const { token, user: fresh } = await api.post('/auth/login', { loginId, password: 'demo1234' });
      saveSession(token, fresh);
      setUser(fresh);
      setRole(fresh.role);
      setShowRoleMenu(false);
      setMobileOpen(false);
      navigate('/dashboard');
      showToast(`Workspace switched — ${ROLE_LABELS[fresh.role] || fresh.role}`);
    } catch (e) {
      showToast(e.message || 'Switch failed', 'error');
    }
  };

  const signOut = () => {
    // Clearing the HttpOnly cookie requires a round trip; local state can drop
    // immediately so the UI never looks signed in after the click.
    api.post('/auth/logout').catch(() => {});
    clearSession();
    setUser(null);
    setShowRoleMenu(false);
    setMobileOpen(false);
    navigate('/dashboard');
  };

  const getNavItems = () => {
    switch (role) {
      case 'superadmin':
        return [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'approvals', label: 'Tutor approvals', icon: ShieldCheck },
        ];
      case 'faculty':
        return [
          { id: 'dashboard', label: 'Referral board', icon: LayoutDashboard },
          { id: 'referral', label: 'New referral', icon: Users },
        ];
      case 'tutor':
        return [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'messages', label: 'Messages', icon: MessageSquare },
          { id: 'checkin', label: 'Session check-in', icon: Clock },
          { id: 'rewards', label: 'Rewards catalog', icon: Award },
          { id: 'exam', label: 'Qualification exam', icon: BookOpen },
        ];
      case 'learner':
        return [
          { id: 'wizard', label: 'Find a tutor', icon: Search },
          { id: 'my-tutors', label: 'My tutors', icon: Users },
          { id: 'dashboard', label: 'My progress', icon: LayoutDashboard },
          { id: 'messages', label: 'Messages', icon: MessageSquare },
          { id: 'checkin', label: 'Session check-in', icon: Clock },
          { id: 'exam', label: 'Become a tutor', icon: Award },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const Wordmark = ({ compact = false }) => (
    <div className="flex items-center gap-2.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-ink bg-gold text-ink shadow-[2px_2px_0_var(--color-ink)]">
        <BookOpen className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <p className="truncate font-display text-[18px] font-extrabold uppercase leading-none tracking-[-0.035em] text-ink">LCCB Academix</p>
        {!compact && <p className="mt-1 text-[12px] font-semibold uppercase leading-tight tracking-[0.04em] text-muted-foreground">Incentive ledger</p>}
      </div>
    </div>
  );

  if (!user) {
    const isPublicProfileRoute = /^\/(profile|users|tutors)\/[^/]+$/.test(location.pathname);
    const isKnownRoute = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/dashboard' || Boolean(ROLE_ROUTES[location.pathname]);

    if (isPublicProfileRoute || !isKnownRoute) {
      return (
        <div className="min-h-screen bg-stone text-ink">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:border-2 focus:border-ink focus:bg-gold focus:px-4 focus:py-2.5 focus:text-[13px] focus:font-bold focus:text-ink focus:shadow-[4px_4px_0_var(--color-ink)]"
          >
            Skip to main content
          </a>
          <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b-2 border-ink bg-surface-sidebar px-5 pt-[env(safe-area-inset-top)]">
            <button type="button" onClick={() => navigate('/')} className="text-left">
              <Wordmark compact />
            </button>
            <Button size="sm" onClick={() => navigate('/')}>Sign in</Button>
          </header>
          <main id="main-content" className="mx-auto w-full max-w-[1040px] px-5 py-8">
            <React.Suspense fallback={<div className="panel empty">Reading the ledger…</div>}>
              {isPublicProfileRoute ? (
                <Routes location={location}>
                  <Route path="/profile/:id" element={<TutorProfile currentUser={null} showToast={showToast} />} />
                  <Route path="/users/:id" element={<TutorProfile currentUser={null} showToast={showToast} />} />
                  <Route path="/tutors/:id" element={<TutorProfile currentUser={null} showToast={showToast} />} />
                </Routes>
              ) : (
                <div className="panel mx-auto mt-10 max-w-[560px] p-8 text-center">
                  <p className="meta uppercase tracking-[0.14em]">404 · Off the ledger</p>
                  <h1 className="mt-3 font-display text-[30px] font-extrabold leading-tight tracking-[-0.03em]">
                    This page is not in the ledger.
                  </h1>
                  <p className="mt-2 text-[14px] text-muted-foreground">
                    Check the address or return to the LCCB Academix home page.
                  </p>
                  <Button className="mt-6" onClick={() => navigate('/')}>Back to home</Button>
                </div>
              )}
            </React.Suspense>
          </main>
        </div>
      );
    }

    return <Login onLogin={(freshUser) => { setUser(freshUser); setRole(freshUser.role); showToast(`Welcome back, ${freshUser.name}.`); }} />;
  }

  const NavList = ({ onNavigate }) => (
    <nav className="flex flex-col">
      <p className="group-label mb-2 px-2.5 uppercase tracking-[0.04em]">Workspace</p>
      <div className="space-y-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => { navigate(`/${item.id}`); onNavigate?.(); }}
            className={cn('nav-item w-full', activeTab === item.id && 'active')}
            aria-current={activeTab === item.id ? 'page' : undefined}
          >
            <item.icon />
            <span>{item.label}</span>
            {item.id === 'messages' && unreadMessages > 0 && (
              <span className="num ml-auto grid h-5 min-w-5 place-items-center border-2 border-ink bg-gold px-1 text-[13px] leading-none text-ink">
                {unreadMessages}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="mx-2.5 my-5 h-0.5 bg-ink/15" />
      <p className="group-label mb-2 px-2.5 uppercase tracking-[0.04em]">Account</p>
      <button
        onClick={() => { setAccountTab('profile'); setAccountOpen(true); onNavigate?.(); }}
        className="nav-item w-full"
      >
        <span className="flex items-center gap-2.5"><User /> Profile</span>
      </button>
      <button
        onClick={() => { setShowNotifications(v => !v); refreshNotifications(); onNavigate?.(); }}
        className="nav-item w-full justify-between"
      >
        <span className="flex items-center gap-2.5"><Bell /> Notifications</span>
        {unreadNotifications > 0 && (
          <span className="num grid h-5 min-w-5 place-items-center border-2 border-ink bg-gold px-1 text-[13px] leading-none text-ink">{unreadNotifications}</span>
        )}
      </button>
    </nav>
  );

  const gate = (path, element) => (
    <RoleGate role={role} path={path} showToast={showToast} navigate={navigate}>{element}</RoleGate>
  );

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:border-2 focus:border-ink focus:bg-gold focus:px-4 focus:py-2.5 focus:text-[13px] focus:font-bold focus:text-ink focus:shadow-[4px_4px_0_var(--color-ink)]"
      >
        Skip to main content
      </a>
      <AnimatePresence>
        {showSplash && (
          <SplashScreen onComplete={() => setShowSplash(false)} duration={2000} />
        )}
      </AnimatePresence>
      <div className={cn("min-h-screen bg-stone text-ink", showSplash && 'hidden')}>
        {!isOnline && (
          <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 border-b-2 border-ink bg-surface-alert px-4 py-2 text-center text-[13px] font-bold text-destructive">
            <WifiOff className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span>You are offline — changes cannot be saved to the ledger until your connection returns.</span>
          </div>
        )}
        {/* Mobile bar */}
      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b-2 border-ink bg-surface-sidebar px-4 pt-[env(safe-area-inset-top)] lg:hidden">
        <Wordmark compact />
        <div className="flex items-center gap-1.5">
          <button
            className="relative grid h-11 w-11 min-h-[44px] min-w-[44px] place-items-center border-2 border-transparent text-ink transition-colors hover:border-ink hover:bg-gold"
            aria-label="Notifications"
            onClick={() => { setShowNotifications(v => !v); refreshNotifications(); }}
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
            {unreadNotifications > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 border-2 border-ink bg-crimson" />}
          </button>
          <button
            className="grid h-11 w-11 min-h-[44px] min-w-[44px] place-items-center border-2 border-ink bg-paper text-ink shadow-[2px_2px_0_var(--color-ink)] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-controls="mobile-workspace-menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r-2 border-ink bg-surface-sidebar px-3 py-5 lg:flex">
          <div className="px-2 pb-6"><Wordmark /></div>

          {DEMO_MODE ? (
            <div className="relative px-2 pb-6">
              <button
                onClick={() => setShowRoleMenu(v => !v)}
                className="flex w-full items-center justify-between border-2 border-ink bg-paper px-3 py-2.5 text-left shadow-[3px_3px_0_var(--color-ink)] transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-[4px_4px_0_var(--color-ink)]"
                aria-expanded={showRoleMenu}
              >
                <div>
                  <p className="text-[12px] font-semibold uppercase leading-tight tracking-[0.04em] text-muted-foreground">Demo workspace</p>
                  <p className="mt-1 text-[13px] font-bold leading-tight">{ROLE_LABELS[role]}</p>
                </div>
                <ChevronDown className={cn('h-4 w-4 transition-transform', showRoleMenu && 'rotate-180')} strokeWidth={2.2} />
              </button>
              <AnimatePresence>
                {showRoleMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-2 right-2 top-full z-40 mt-1.5 border-2 border-ink bg-paper shadow-[5px_5px_0_var(--color-ink)]"
                  >
                    {DEMO_ROLES.map(({ role: rId, loginId }) => (
                      <button
                        key={rId}
                        onClick={() => switchDemoRole(rId, loginId)}
                        className={cn(
                          'flex w-full items-center justify-between border-b border-ink/15 px-3 py-2.5 text-left text-[13px] last:border-b-0 hover:bg-gold',
                          role === rId && 'bg-surface-highlight font-bold'
                        )}
                      >
                        <span>{ROLE_LABELS[rId]}</span>
                        {role === rId && <Check className="h-4 w-4" strokeWidth={2.4} />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="px-2 pb-6">
              <p className="group-label uppercase tracking-[0.04em]">Workspace</p>
              <p className="mt-1.5 text-[14px] font-bold leading-tight">{ROLE_LABELS[role]}</p>
            </div>
          )}

          <div className="flex-1"><NavList /></div>

          <div className="mt-4 border-t-2 border-ink px-2 pt-4">
            <div className="flex items-center justify-between gap-2">
              <div
                role="button"
                tabIndex={0}
                onClick={() => { setAccountTab('profile'); setAccountOpen(true); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAccountTab('profile'); setAccountOpen(true); } }}
                className="flex min-w-0 cursor-pointer items-center gap-2.5 transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                title="Edit profile"
                aria-label="Edit profile"
              >
                <Avatar name={user?.name || ''} avatarUrl={user?.avatar_url} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold leading-tight">{currentProfile.name}</p>
                  <p className="truncate text-[12px] leading-tight text-muted-foreground">{currentProfile.subtitle}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  onClick={() => { setAccountTab('security'); setAccountOpen(true); }}
                  className="grid h-9 w-9 place-items-center border-2 border-transparent text-muted-foreground transition-colors hover:border-ink hover:bg-gold hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  title="Account settings"
                  aria-label="Account settings"
                >
                  <KeyRound className="h-[17px] w-[17px]" strokeWidth={2} />
                </button>
                <button
                  onClick={signOut}
                  className="grid h-9 w-9 place-items-center border-2 border-transparent text-muted-foreground transition-colors hover:border-ink hover:bg-gold hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="h-[17px] w-[17px]" strokeWidth={2} />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/profile/${user?.custom_id || user?.id}`)}
              className="mt-2.5 block w-full text-center text-[12px] font-bold text-ink underline decoration-gold decoration-2 underline-offset-4 hover:decoration-ink"
            >
              View my public profile →
            </button>
          </div>
        </aside>

        {/* Canvas */}
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          <div className="mx-auto w-full max-w-[1240px] px-5 pb-12 pt-6 sm:px-8 lg:px-10 lg:pt-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab + role}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="min-h-[calc(100vh-7rem)]"
              >
                <React.Suspense fallback={<div className="panel empty">Opening workspace…</div>}>
                  <Routes location={location} key={location.pathname}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/wizard" element={gate('/wizard', <LearnerWizard showToast={showToast} />)} />
                  <Route path="/my-tutors" element={gate('/my-tutors', <MyTutors showToast={showToast} />)} />
                  <Route path="/dashboard" element={gate('/dashboard', <Dashboard role={role} user={user} showToast={showToast} />)} />
                  <Route path="/exam" element={gate('/exam', <TutorExam showToast={showToast} user={user} />)} />
                  <Route path="/tutor-pending" element={gate('/tutor-pending', <TutorApplicant showToast={showToast} user={user} />)} />
                  <Route path="/referral" element={gate('/referral', <FacultyReferral showToast={showToast} user={user} />)} />
                  <Route path="/checkin" element={gate('/checkin', <SessionCheckIn role={role} user={user} showToast={showToast} />)} />
                  <Route path="/rewards" element={gate('/rewards', <RewardCatalog showToast={showToast} />)} />
                  <Route path="/messages" element={gate('/messages', <Messages user={user} showToast={showToast} onRead={refreshUnreadMessages} />)} />
                  <Route path="/approvals" element={gate('/approvals', <SuperadminApprovals showToast={showToast} />)} />
                  <Route
                    path="/profile/:id"
                    element={(
                      <TutorProfile
                        currentUser={user}
                        showToast={showToast}
                        onEditProfile={() => {
                          setAccountTab('profile');
                          setAccountOpen(true);
                        }}
                      />
                    )}
                  />
                  <Route
                    path="/users/:id"
                    element={(
                      <TutorProfile
                        currentUser={user}
                        showToast={showToast}
                        onEditProfile={() => {
                          setAccountTab('profile');
                          setAccountOpen(true);
                        }}
                      />
                    )}
                  />
                  <Route
                    path="/tutors/:id"
                    element={(
                      <TutorProfile
                        currentUser={user}
                        showToast={showToast}
                        onEditProfile={() => {
                          setAccountTab('profile');
                          setAccountOpen(true);
                        }}
                      />
                    )}
                  />
                  <Route
                    path="*"
                    element={(
                      <div className="panel mx-auto mt-10 max-w-[560px] p-8 text-center">
                        <p className="meta uppercase tracking-[0.14em]">404 · Off the ledger</p>
                        <h1 className="mt-3 font-display text-[30px] font-extrabold leading-tight tracking-[-0.03em]">
                          This page is not in the ledger.
                        </h1>
                        <p className="mt-2 text-[14px] text-muted-foreground">
                          The address may have moved with a workspace switch.
                        </p>
                        <Button className="mt-6" onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
                      </div>
                    )}
                  />
                  </Routes>
                </React.Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-workspace-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Workspace menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex h-[100vh] h-[100dvh] flex-col bg-stone lg:hidden"
          >
            {/* Pinned header */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b-2 border-ink bg-surface-sidebar px-4">
              <Wordmark compact />
              <button
                ref={mobileCloseRef}
                className="grid h-11 w-11 min-h-[44px] min-w-[44px] place-items-center border-2 border-ink bg-paper shadow-[2px_2px_0_var(--color-ink)]"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" strokeWidth={2.2} />
              </button>
            </div>

            {/* Scrollable nav list */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-5">
              {DEMO_MODE ? (
                <>
                  <button
                    onClick={() => setShowRoleMenu(v => !v)}
                    className="mb-5 flex min-h-[44px] w-full items-center justify-between border-2 border-ink bg-paper px-3 py-2.5 text-left shadow-[3px_3px_0_var(--color-ink)]"
                  >
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Demo workspace</p>
                      <p className="mt-1 text-[14px] font-bold">{ROLE_LABELS[role]}</p>
                    </div>
                    <ChevronDown className="h-4 w-4" strokeWidth={2.2} />
                  </button>
                  {showRoleMenu && (
                    <div className="mb-5 -mt-3 border-2 border-ink bg-paper shadow-[4px_4px_0_var(--color-ink)]">
                      {DEMO_ROLES.map(({ role: rId, loginId }) => (
                        <button
                          key={rId}
                          onClick={() => switchDemoRole(rId, loginId)}
                          className={cn(
                            'flex min-h-[44px] w-full items-center justify-between border-b border-ink/15 px-3 py-2.5 text-left text-[13px] last:border-b-0 hover:bg-gold',
                            role === rId && 'bg-surface-highlight font-bold'
                          )}
                        >
                          <span>{ROLE_LABELS[rId]}</span>
                          {role === rId && <Check className="h-4 w-4" strokeWidth={2.4} />}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="mb-5">
                  <p className="group-label uppercase tracking-[0.04em]">Workspace</p>
                  <p className="mt-1.5 text-[14px] font-bold">{ROLE_LABELS[role]}</p>
                </div>
              )}
              <NavList onNavigate={() => setMobileOpen(false)} />
            </div>

            {/* Pinned bottom footer with safe-area padding and 44px tap targets */}
            <div className="shrink-0 border-t-2 border-ink bg-surface-sidebar px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-2px_0_var(--color-ink)]">
              <div className="flex items-center justify-between gap-2">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => { setMobileOpen(false); setAccountTab('profile'); setAccountOpen(true); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMobileOpen(false); setAccountTab('profile'); setAccountOpen(true); } }}
                  className="flex min-w-0 cursor-pointer items-center gap-2.5 transition-opacity hover:opacity-85"
                  title="Edit profile"
                  aria-label="Edit profile"
                >
                  <Avatar name={user?.name || ''} avatarUrl={user?.avatar_url} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold leading-tight">{currentProfile.name}</p>
                    <p className="truncate text-[12px] leading-tight text-muted-foreground">{currentProfile.subtitle}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => { setMobileOpen(false); setAccountTab('security'); setAccountOpen(true); }}
                    className="flex h-11 min-h-[44px] items-center gap-1.5 border-2 border-ink bg-paper px-3 text-[13px] font-bold text-ink shadow-[2px_2px_0_var(--color-ink)] hover:bg-gold active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    aria-label="Account security"
                  >
                    <KeyRound className="h-4 w-4" strokeWidth={2} /> Security
                  </button>
                  <button
                    onClick={signOut}
                    className="flex h-11 min-h-[44px] items-center gap-1.5 border-2 border-ink bg-gold px-3 text-[13px] font-bold text-ink shadow-[2px_2px_0_var(--color-ink)] hover:bg-[#e3bb19] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-4 w-4" strokeWidth={2} /> Sign out
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              aria-label="Close notifications"
              className="fixed inset-0 z-40 cursor-default bg-ink/20"
              onClick={() => setShowNotifications(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.14 }}
              className="fixed right-4 top-20 z-50 w-[min(390px,calc(100vw-2rem))] border-2 border-ink bg-paper shadow-[6px_6px_0_var(--color-ink)] lg:right-8 lg:top-8"
            >
              <div className="flex items-center justify-between border-b-2 border-ink bg-gold px-4 py-3 text-ink">
                <div>
                  <p className="font-display text-[16px] font-extrabold uppercase leading-none tracking-[-0.02em]">Notifications</p>
                  <p className="mt-1.5 text-[13px] font-semibold">{unreadNotifications} unread</p>
                </div>
                <button onClick={markAllRead} className="text-[13px] font-semibold underline decoration-ink/40 decoration-2 underline-offset-4 hover:decoration-ink">
                  Mark all read
                </button>
              </div>
              <div className="max-h-[min(420px,60vh)] overflow-auto">
                {notifications.length === 0 && (
                  <div className="flex flex-col items-center px-6 py-10 text-center">
                    <Inbox className="mb-3 h-6 w-6 text-muted-foreground" strokeWidth={1.8} />
                    <p className="text-[14px] text-muted-foreground">Nothing on the wire yet.</p>
                  </div>
                )}
                {notifications.slice(0, 8).map(n => (
                  <div key={n.id} className={cn('border-b border-ink/15 px-4 py-3 last:border-0', !n.is_read && 'bg-surface-highlight')}>
                    <div className="flex items-start gap-2.5">
                      <span className={cn('mt-1.5 h-2 w-2 shrink-0 border border-ink', n.type === 'warning' ? 'bg-crimson' : n.type === 'success' ? 'bg-emerald' : 'bg-ink/30')} />
                      <div className="min-w-0">
                        <p className={cn('text-[13px] leading-snug text-ink', !n.is_read && 'font-semibold')}>
                          {n.title && n.title !== n.message ? `${n.title} — ` : ''}{n.message}
                        </p>
                        <p className="mt-1 text-[12px] text-muted-foreground">{fmtManilaDateTime(n.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {accountOpen && (
        <AccountDialog
          user={user}
          initialTab={accountTab}
          onClose={() => setAccountOpen(false)}
          onSignOut={signOut}
          showToast={showToast}
          onUserUpdated={(fresh) => {
            setUser(fresh);
            setRole(fresh.role);
          }}
        />
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            role="status"
            className={cn(
              'fixed bottom-5 right-5 z-[60] flex max-w-[min(430px,calc(100vw-2rem))] items-center gap-2.5 border-2 border-ink px-3.5 py-3 text-ink shadow-[5px_5px_0_var(--color-ink)]',
              toast.type === 'error' ? 'bg-surface-alert text-destructive' : 'bg-gold text-ink'
            )}
          >
            <span className={cn('h-2.5 w-2.5 shrink-0 border-2 border-ink', toast.type === 'error' ? 'bg-crimson' : toast.type === 'info' ? 'bg-paper' : 'bg-emerald')} />
            <span className="text-[13px] font-semibold leading-snug">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  const fn = toast.action.onClick;
                  setToast(null);
                  fn?.();
                }}
                className="ml-2 shrink-0 border-2 border-ink bg-paper px-2 py-0.5 text-[12px] font-bold text-ink shadow-[2px_2px_0_var(--color-ink)] hover:bg-surface-highlight"
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}
