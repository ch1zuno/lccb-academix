"use client";
import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, Award, LayoutDashboard, Search, Bell, Users, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppContext } from '@/lib/AppContext';

const roles = [
  { id: 'superadmin', label: 'Superadmin (Dean)', icon: ShieldCheck },
  { id: 'faculty', label: 'Faculty / Advisor', icon: BookOpen },
  { id: 'tutor', label: 'Accredited Tutor', icon: Award },
  { id: 'tutee', label: 'Student (Tutee)', icon: Users },
];

export default function AppLayout({ children }) {
  const { role, setRole, toast } = useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = pathname.substring(1) || 'dashboard';

  const currentRole = roles.find(r => r.id === role);
  
  const getNavItems = () => {
    switch (role) {
      case 'superadmin':
        return [{ id: 'dashboard', label: 'Overview', icon: LayoutDashboard }];
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
      case 'tutee':
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
              onClick={() => router.push(`/${item.id}`)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors whitespace-nowrap overflow-hidden",
                activeTab === item.id ? "bg-secondary text-secondary-foreground font-semibold" : "hover:bg-primary-foreground/10 text-primary-foreground/80 hover:text-primary-foreground"
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
            <Button variant="ghost" size="icon" className="relative text-charcoal hover:bg-slate-100">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-crimson rounded-full animate-pulse" />
            </Button>
            
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-charcoal">Mark Antipo</p>
                <p className="text-xs text-muted-foreground">{currentRole?.label}</p>
              </div>
              <div className="relative group cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold border-2 border-white shadow-sm ring-2 ring-transparent group-hover:ring-primary transition-all">
                  MA
                </div>
                
                {/* Role Switcher Dropdown Mock */}
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right scale-95 group-hover:scale-100 z-50">
                  <div className="p-2 border-b border-border bg-slate-50 rounded-t-lg">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Switch Role</p>
                  </div>
                  <div className="p-1">
                    {roles.map(r => (
                      <button
                        key={r.id}
                        onClick={() => { setRole(r.id); router.push('/dashboard'); }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                          role === r.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-slate-100 text-charcoal"
                        )}
                      >
                        <r.icon className="w-4 h-4" />
                        {r.label}
                        {role === r.id && <CheckCircle2 className="w-4 h-4 ml-auto text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <main className="flex-1 overflow-auto p-6 scroll-smooth">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname + role}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-6xl mx-auto h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        
        {/* Toast Notification Mock */}
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
              <span className="font-medium text-sm">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
