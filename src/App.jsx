import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  BookOpen, Bell, ChevronDown, Check, LayoutDashboard, Search, Clock,
  ShieldCheck, Users, Award, LogOut, Menu, X, Inbox,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';
import { Button } from './components/ui/button';

import api from './api';
import { loadSession, saveSession, clearSession } from './authToken';

import SuperadminApprovals from './screens/SuperadminApprovals';
import LearnerWizard from './screens/LearnerWizard';
import Dashboard from './screens/Dashboard';
import TutorExam from './screens/TutorExam';
import TutorApplicant from './screens/TutorApplicant';
import FacultyReferral from './screens/FacultyReferral';
import SessionCheckIn from './screens/SessionCheckIn';
import RewardCatalog from './screens/RewardCatalog';
import Login from './screens/Login';

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

const initialsOf = (name = '') => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

export default function App() {
  const [user, setUser] = useState(() => loadSession()?.user ?? null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [role, setRole] = useState(user?.role ?? 'learner');

  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.substring(1) || 'dashboard';

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Revalidate the persisted session against the API on boot.
  useEffect(() => {
    const stored = loadSession();
    if (!stored?.token) return;
    api.get('/auth/me')
      .then(({ user: fresh }) => { setUser(fresh); setRole(fresh.role); saveSession(stored.token, fresh); })
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

  const markAllRead = () => {
    api.patch('/notifications', {}).then(refreshNotifications).catch(() => {});
  };

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
          { id: 'checkin', label: 'Session check-in', icon: Clock },
          { id: 'rewards', label: 'Rewards catalog', icon: Award },
          { id: 'exam', label: 'Qualification exam', icon: BookOpen },
        ];
      case 'learner':
        return [
          { id: 'wizard', label: 'Find a tutor', icon: Search },
          { id: 'dashboard', label: 'My progress', icon: LayoutDashboard },
          { id: 'checkin', label: 'Session check-in', icon: Clock },
          { id: 'exam', label: 'Become a tutor', icon: Award },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  if (!user) {
    return <Login onLogin={(freshUser) => { setUser(freshUser); setRole(freshUser.role); showToast(`Welcome back, ${freshUser.name}.`); }} />;
  }

  const Wordmark = ({ compact = false }) => (
    <div className="flex items-center gap-2.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-ink bg-gold text-ink shadow-[2px_2px_0_#0f2942]">
        <BookOpen className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <p className="truncate font-display text-[18px] font-extrabold uppercase leading-none tracking-[-0.035em] text-ink">LCCB Academix</p>
        {!compact && <p className="mt-1 text-[12px] font-semibold uppercase leading-tight tracking-[0.04em] text-muted-foreground">Incentive ledger</p>}
      </div>
    </div>
  );

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
          </button>
        ))}
      </div>
      <div className="mx-2.5 my-5 h-0.5 bg-ink/15" />
      <p className="group-label mb-2 px-2.5 uppercase tracking-[0.04em]">Account</p>
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

  return (
    <div className="min-h-screen bg-stone text-ink">
      {/* Mobile bar */}
      <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b-2 border-ink bg-[#f7f0e2] px-4 lg:hidden">
        <Wordmark compact />
        <div className="flex items-center gap-1.5">
          <button
            className="relative grid h-10 w-10 place-items-center border-2 border-transparent text-ink transition-colors hover:border-ink hover:bg-gold"
            aria-label="Notifications"
            onClick={() => { setShowNotifications(v => !v); refreshNotifications(); }}
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
            {unreadNotifications > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 border-2 border-ink bg-crimson" />}
          </button>
          <button
            className="grid h-10 w-10 place-items-center border-2 border-ink bg-paper text-ink shadow-[2px_2px_0_#0f2942] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r-2 border-ink bg-[#f7f0e2] px-3 py-5 lg:flex">
          <div className="px-2 pb-6"><Wordmark /></div>

          <div className="relative px-2 pb-6">
            <button
              onClick={() => setShowRoleMenu(v => !v)}
              className="flex w-full items-center justify-between border-2 border-ink bg-paper px-3 py-2.5 text-left shadow-[3px_3px_0_#0f2942] transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-[4px_4px_0_#0f2942]"
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
                  className="absolute left-2 right-2 top-full z-40 mt-1.5 border-2 border-ink bg-paper shadow-[5px_5px_0_#0f2942]"
                >
                  {DEMO_ROLES.map(({ role: rId, loginId }) => (
                    <button
                      key={rId}
                      onClick={() => switchDemoRole(rId, loginId)}
                      className={cn(
                        'flex w-full items-center justify-between border-b border-ink/15 px-3 py-2.5 text-left text-[13px] last:border-b-0 hover:bg-gold',
                        role === rId && 'bg-[#fff7d6] font-bold'
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

          <div className="flex-1"><NavList /></div>

          <div className="mt-4 border-t-2 border-ink px-2 pt-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center border-2 border-ink bg-gold text-[13px] font-bold shadow-[2px_2px_0_#0f2942]">
                  {currentProfile.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold leading-tight">{currentProfile.name}</p>
                  <p className="truncate text-[12px] leading-tight text-muted-foreground">{currentProfile.subtitle}</p>
                </div>
              </div>
              <button onClick={signOut} className="grid h-9 w-9 shrink-0 place-items-center border-2 border-transparent text-muted-foreground transition-colors hover:border-ink hover:bg-gold hover:text-ink" title="Sign out" aria-label="Sign out">
                <LogOut className="h-[17px] w-[17px]" strokeWidth={2} />
              </button>
            </div>
          </div>
        </aside>

        {/* Canvas */}
        <main className="min-w-0 flex-1">
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
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/wizard" element={<LearnerWizard showToast={showToast} />} />
                  <Route path="/dashboard" element={<Dashboard role={role} user={user} showToast={showToast} />} />
                  <Route path="/exam" element={<TutorExam showToast={showToast} user={user} />} />
                  <Route path="/tutor-pending" element={<TutorApplicant showToast={showToast} user={user} />} />
                  <Route path="/referral" element={<FacultyReferral showToast={showToast} user={user} />} />
                  <Route path="/checkin" element={<SessionCheckIn role={role} user={user} showToast={showToast} />} />
                  <Route path="/rewards" element={<RewardCatalog showToast={showToast} />} />
                  <Route path="/approvals" element={<SuperadminApprovals showToast={showToast} />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-stone lg:hidden"
          >
            <div className="flex h-16 items-center justify-between border-b-2 border-ink bg-[#f7f0e2] px-4">
              <Wordmark compact />
              <button className="grid h-10 w-10 place-items-center border-2 border-ink bg-paper shadow-[2px_2px_0_#0f2942]" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" strokeWidth={2.2} />
              </button>
            </div>
            <div className="flex h-[calc(100vh-4rem)] flex-col overflow-y-auto px-4 py-5">
              <button
                onClick={() => setShowRoleMenu(v => !v)}
                className="mb-5 flex w-full items-center justify-between border-2 border-ink bg-paper px-3 py-2.5 text-left shadow-[3px_3px_0_#0f2942]"
              >
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Demo workspace</p>
                  <p className="mt-1 text-[14px] font-bold">{ROLE_LABELS[role]}</p>
                </div>
                <ChevronDown className="h-4 w-4" strokeWidth={2.2} />
              </button>
              {showRoleMenu && (
                <div className="mb-5 -mt-3 border-2 border-ink bg-paper shadow-[4px_4px_0_#0f2942]">
                  {DEMO_ROLES.map(({ role: rId, loginId }) => (
                    <button
                      key={rId}
                      onClick={() => switchDemoRole(rId, loginId)}
                      className={cn(
                        'flex w-full items-center justify-between border-b border-ink/15 px-3 py-2.5 text-left text-[13px] last:border-b-0 hover:bg-gold',
                        role === rId && 'bg-[#fff7d6] font-bold'
                      )}
                    >
                      <span>{ROLE_LABELS[rId]}</span>
                      {role === rId && <Check className="h-4 w-4" strokeWidth={2.4} />}
                    </button>
                  ))}
                </div>
              )}
              <NavList onNavigate={() => setMobileOpen(false)} />
              <div className="mt-auto border-t-2 border-ink pt-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-ink bg-gold text-[13px] font-bold shadow-[2px_2px_0_#0f2942]">
                      {currentProfile.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold">{currentProfile.name}</p>
                      <p className="truncate text-[12px] text-muted-foreground">{currentProfile.subtitle}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" strokeWidth={2} /> Sign out</Button>
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
              className="fixed right-4 top-20 z-50 w-[min(390px,calc(100vw-2rem))] border-2 border-ink bg-paper shadow-[6px_6px_0_#0f2942] lg:right-8 lg:top-8"
            >
              <div className="flex items-center justify-between border-b-2 border-ink bg-gold px-4 py-3">
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
                  <div key={n.id} className={cn('border-b border-ink/15 px-4 py-3 last:border-0', !n.is_read && 'bg-[#fff7d6]')}>
                    <div className="flex items-start gap-2.5">
                      <span className={cn('mt-1.5 h-2 w-2 shrink-0 border border-ink', n.type === 'warning' ? 'bg-crimson' : n.type === 'success' ? 'bg-emerald' : 'bg-ink/30')} />
                      <div className="min-w-0">
                        <p className={cn('text-[13px] leading-snug text-ink', !n.is_read && 'font-semibold')}>
                          {n.title && n.title !== n.message ? `${n.title} — ` : ''}{n.message}
                        </p>
                        <p className="mt-1 text-[12px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
              'fixed bottom-5 right-5 z-[60] flex max-w-[min(430px,calc(100vw-2rem))] items-center gap-2.5 border-2 border-ink px-3.5 py-3 text-ink shadow-[5px_5px_0_#0f2942]',
              toast.type === 'error' ? 'bg-[#f4d6d0]' : 'bg-gold'
            )}
          >
            <span className={cn('h-2.5 w-2.5 shrink-0 border-2 border-ink', toast.type === 'error' ? 'bg-crimson' : toast.type === 'info' ? 'bg-paper' : 'bg-emerald')} />
            <span className="text-[13px] font-semibold leading-snug">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
