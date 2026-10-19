import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { BookOpen, Calendar, Award, LayoutDashboard, Search, Bell, Users, Clock, ShieldCheck, ChevronDown, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';

import api from './api';
import { loadSession, saveSession, clearSession } from './authToken';

import SuperadminApprovals from './screens/SuperadminApprovals';
import LearnerWizard from './screens/LearnerWizard';
import Dashboard from './screens/Dashboard';
import TutorExam from './screens/TutorExam';
import FacultyReferral from './screens/FacultyReferral';
import SessionCheckIn from './screens/SessionCheckIn';
import RewardCatalog from './screens/RewardCatalog';
import Login from './screens/Login';

import { NOTIFICATIONS } from './data';

export const ROLE_LABELS = {
  superadmin: 'Superadmin (Dean)',
  faculty: 'Faculty / Advisor',
  tutor: 'Accredited Tutor',
  learner: 'Student (Learner)',
};

const initialsOf = (name = '') => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

export default function App() {
  const [user, setUser] = useState(() => loadSession()?.user ?? null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [role, setRole] = useState(user?.role ?? 'learner'); // demo role switch target

  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.substring(1) || 'dashboard';

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Revalidate the persisted session against the API on boot.
  useEffect(() => {
    const stored = loadSession();
    if (!stored?.token) return;
    api.get('/auth/me')
      .then(({ user: fresh }) => { setUser(fresh); setRole(fresh.role); saveSession(stored.token, fresh); })
      .catch(() => { clearSession(); setUser(null); });
  }, []);

  const currentProfile = user
    ? { name: user.name, initials: initialsOf(user.name), subtitle: user.program ? `${user.program} • ${ROLE_LABELS[user.role] || user.role}` : (user.department || user.title || ROLE_LABELS[user.role] || user.role) }
    : null;
  const unreadNotifications = NOTIFICATIONS.filter(n => !n.read).length;

  const getNavItems = () => {
    switch (role) {
      case 'superadmin':
        return [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'approvals', label: 'Tutor Approvals', icon: ShieldCheck }
        ];
      case 'faculty':
        return [
          { id: 'dashboard', label: 'Referrals Board', icon: LayoutDashboard },
          { id: 'referral', label: 'New Referral', icon: Users }
        ];
      case 'tutor':
        return [
          { id: 'dashboard', label: 'My Wallet & Sessions', icon: LayoutDashboard },
          { id: 'exam', label: 'Qualification Exam', icon: Award },
          { id: 'checkin', label: 'Session Check-In', icon: Clock },
          { id: 'rewards', label: 'Rewards Catalog', icon: Award }
        ];
      case 'learner':
        return [
          { id: 'wizard', label: 'Find a Tutor', icon: Search },
          { id: 'dashboard', label: 'My Progress', icon: LayoutDashboard },
          { id: 'checkin', label: 'Session Check-In', icon: Clock }
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  if (!user) {
    return <Login onLogin={(freshUser) => { setUser(freshUser); setRole(freshUser.role); showToast(`Welcome back, ${freshUser.name}!`); }} />;
  }

  return (
    <div className="min-h-screen bg-slate flex overflow-hidden font-sans">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 260 : 80 }}
        className="bg-primary text-primary-foreground flex flex-col shadow-xl z-20"
      >
        <div className="p-4 flex items-center justify-between h-16 border-b border-primary-foreground/10">
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 font-bold text-lg text-secondary">
                <BookOpen className="w-6 h-6" />
                LCCB Academix
              </motion.div>
            )}
          </AnimatePresence>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-primary-foreground hover:bg-primary-foreground/10">
            <LayoutDashboard className="w-5 h-5" />
          </Button>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-2 px-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(`/${item.id}`)}
              className={cn(
                "nav-item whitespace-nowrap overflow-hidden",
                activeTab === item.id ? "nav-item.active" : "text-primary-foreground/80"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          ))}
        </nav>

        {/* Sidebar Footer — Current User */}
        {sidebarOpen && (
          <div className="p-4 border-t border-primary-foreground/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center text-secondary text-sm font-bold">
                {currentProfile.initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary-foreground truncate">{currentProfile.name}</p>
                <p className="text-xs text-primary-foreground/60 truncate">{currentProfile.subtitle}</p>
              </div>
            </div>
          </div>
        )}
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 relative">

        {/* Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-96 hidden md:block group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary" />
              <Input placeholder="Press Cmd+K to search..." className="pl-9 bg-slate-50 border-transparent focus-visible:ring-primary focus-visible:bg-white transition-all shadow-sm" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative text-charcoal hover:bg-slate-100"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-crimson rounded-full text-[10px] text-white font-bold flex items-center justify-center animate-pulse">
                    {unreadNotifications}
                  </span>
                )}
              </Button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-border z-50 overflow-hidden"
                  >
                    <div className="p-3 border-b border-border bg-slate-50">
                      <p className="text-sm font-semibold text-charcoal">Notifications</p>
                      <p className="text-xs text-muted-foreground">{unreadNotifications} unread</p>
                    </div>
                    <div className="max-h-80 overflow-auto divide-y divide-border">
                      {NOTIFICATIONS.slice(0, 6).map(n => (
                        <div key={n.id} className={`p-3 text-sm hover:bg-slate-50 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}>
                          <div className="flex items-start gap-2">
                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.type === 'warning' ? 'bg-crimson' : n.type === 'success' ? 'bg-emerald' : 'bg-blue-400'}`} />
                            <div>
                              <p className={`text-charcoal ${!n.read ? 'font-medium' : ''}`}>{n.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-2 border-t border-border bg-slate-50 text-center">
                      <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => setShowNotifications(false)}>View All</Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-charcoal">{currentProfile.name}</p>
                <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
              </div>
              <div className="relative group cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold border-2 border-white shadow-sm ring-2 ring-transparent group-hover:ring-primary transition-all">
                  {currentProfile.initials}
                </div>

                {/* Role Switcher Dropdown Mock */}
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right scale-95 group-hover:scale-100 z-50">
                  <div className="p-2 border-b border-border bg-slate-50 rounded-t-lg">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Switch Role (Demo)</p>
                  </div>
                  <div className="p-1">
                    {Object.entries(ROLE_LABELS).map(([rId, rLabel]) => (
                      <button
                        key={rId}
                        onClick={() => { setRole(rId); navigate('/dashboard'); }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                          role === rId ? "bg-primary/10 text-primary font-medium" : "hover:bg-slate-100 text-charcoal"
                        )}
                      >
                        <div className="text-left">
                          <p>{rLabel}</p>
                        </div>
                        {role === rId && <CheckCircle2 className="w-4 h-4 ml-auto text-primary" />}
                      </button>
                    ))}
                    <div className="my-1 border-t border-border"></div>
                    <button
                      onClick={() => { clearSession(); setUser(null); navigate('/dashboard'); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors hover:bg-crimson/10 text-crimson font-medium"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <main className="flex-1 overflow-auto p-6 scroll-smooth" onClick={() => showNotifications && setShowNotifications(false)}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + role}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-6xl mx-auto h-full"
            >
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/wizard" element={<LearnerWizard showToast={showToast} />} />
                <Route path="/dashboard" element={<Dashboard role={role} user={user} showToast={showToast} />} />
                <Route path="/exam" element={<TutorExam showToast={showToast} />} />
                <Route path="/referral" element={<FacultyReferral showToast={showToast} />} />
                <Route path="/checkin" element={<SessionCheckIn role={role} showToast={showToast} />} />
                <Route path="/rewards" element={<RewardCatalog showToast={showToast} />} />
                <Route path="/approvals" element={<SuperadminApprovals showToast={showToast} />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="absolute bottom-6 right-6 z-50 flex items-center gap-3 bg-charcoal text-white px-4 py-3 rounded-lg shadow-2xl border border-charcoal/80 backdrop-blur-sm"
            >
              {toast.type === 'success' && <div className="w-2 h-2 rounded-full bg-emerald shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
              {toast.type === 'info' && <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />}
              {toast.type === 'error' && <div className="w-2 h-2 rounded-full bg-crimson shadow-[0_0_8px_rgba(239,68,68,0.8)]" />}
              <span className="font-medium text-sm">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
