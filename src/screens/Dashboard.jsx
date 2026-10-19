import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Users, Clock, Award, TrendingUp, AlertTriangle, Star, BookOpen, ArrowUpRight, Activity, BarChart3, Zap, Target, CheckCircle2, XCircle, Calendar } from 'lucide-react';
import { Progress } from '../components/ui/progress';
import { motion } from 'framer-motion';
import api from '../api';
import { REFERRALS, SESSIONS, TUTORS, LEADERBOARD, FACULTY, PLATFORM_STATS, ACTIVITY_FEED, CHART_DATA_HOURS, CHART_DATA_BY_DEPT } from '../data';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

/**
 * Live referrals for the signed-in user.
 * Server enforces per-role scoping. Falls back to mock data while
 * a screen still expects records the API doesn't provide yet.
 */
export function useReferrals(role) {
  const [referrals, setReferrals] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    api.get('/referrals')
      .then(({ referrals: rows }) => { if (!cancelled) setReferrals(rows); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [role]);
  return { referrals, error, loading: referrals === null && !error };
}

export default function Dashboard({ role, user, showToast }) {
  const { referrals: liveReferrals, error: referralsError, loading: referralsLoading } = useReferrals(role);
  const scopedByName = (name) => !user || !user?.name || name === user.name;

  // Superadmin analytics (live aggregates)
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [analyticTutors, setAnalyticTutors] = useState(null); // leaderboard: all tutors sorted by points
  useEffect(() => {
    api.get('/analytics')
      .then(setAnalytics)
      .catch((e) => setAnalyticsError(e.message));
    api.get('/tutors')
      .then(({ tutors: rows }) => setAnalyticTutors([...rows].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))))
      .catch(() => setAnalyticTutors([]));
  }, []);

  // ═══════════════════════════════════════════════════
  // SUPERADMIN DASHBOARD
  // ═══════════════════════════════════════════════════
  if (role === 'superadmin') {
    const weeklyTrend = (analytics?.trends ?? [{ week: 0, sessions: 0 }]).map(t => ({
      label: t.week ? new Date(t.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '…',
      sessions: t.sessions ?? 0,
    }));
    const maxTrend = Math.max(1, ...weeklyTrend.map(t => t.sessions));
    const kpis = analytics ? [
      { title: 'Active Tutors', value: analytics.activeTutors, sub: `${analytics.totalLearners} learners enrolled`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
      { title: 'Sessions This Month', value: analytics.monthlySessions, sub: `${analytics.monthlyPrev} previous month`, icon: Calendar, color: 'text-emerald', bg: 'bg-emerald/10' },
      { title: 'Recovery Rate', value: `${analytics.recoveryRate}%`, sub: `${analytics.resolvedReferrals}/${analytics.totalReferrals} referrals resolved`, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
      { title: 'Points Issued', value: (analytics.pointsIssued ?? 0).toLocaleString(), sub: `${analytics.avgRating ?? '—'}★ average rating`, icon: Zap, color: 'text-amber', bg: 'bg-amber/10' },
    ] : null;
    const deptRows = analytics?.byDept ?? [];
    const maxDept = Math.max(1, ...deptRows.map(d => d.completed + 1));
    const topTutors = analyticTutors?.slice(0, 5) ?? [];
    const feed = (liveReferrals ?? []).slice(0, 5);

    return (
      <div className="space-y-6">
        <div className="section-head">
          <div>
            <h2 className="section-title text-primary">Institution Overview</h2>
            <p className="section-subtitle">Monitor the health and activity of the LCCB Academix platform.</p>
          </div>
          <Badge variant="secondary" className="bg-emerald/10 text-emerald border border-emerald/20 px-3 py-1 text-sm font-semibold">
            <Activity className="w-3.5 h-3.5 mr-1.5" /> Live Data
          </Badge>
        </div>

        {analyticsError && (
          <Card><CardContent className="p-4 text-center text-crimson">Failed to load analytics: {analyticsError}</CardContent></Card>
        )}
        {kpis === null && !analyticsError && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Loading platform analytics…</CardContent></Card>
        )}

        {/* KPI Row */}
        {kpis && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi, i) => (
              <motion.div key={kpi.title} {...fadeInUp} transition={{ delay: i * 0.1 }}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                    <div className={`p-2 rounded-lg ${kpi.bg}`}>
                      <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-charcoal">{kpi.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Charts Row */}
        {kpis && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Weekly sessions trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weekly Sessions Trend</CardTitle>
                <CardDescription>Completed sessions over the last 6 weeks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3 h-[180px] pt-4">
                  {weeklyTrend.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xs font-bold text-primary">{d.sessions}</span>
                      <motion.div
                        className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t-md"
                        initial={{ height: 0 }}
                        animate={{ height: `${(d.sessions / maxTrend) * 140}px` }}
                        transition={{ delay: i * 0.08, duration: 0.5 }}
                      />
                      <span className="text-xs text-muted-foreground font-medium">{d.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sessions by Department */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity by Department</CardTitle>
                <CardDescription>Completed sessions per program</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {deptRows.length === 0 && <p className="text-sm text-muted-foreground">No department data.</p>}
                {deptRows.map((d, i) => (
                  <div key={d.department} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-charcoal">{d.department}</span>
                      <span className="text-muted-foreground">{d.completed} sessions • {d.learners} learners • {d.tutors} tutors</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${i === 0 ? 'bg-primary' : i === 1 ? 'bg-secondary' : i === 2 ? 'bg-emerald' : i === 3 ? 'bg-purple-500' : 'bg-amber'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(d.completed / maxDept) * 100}%` }}
                        transition={{ delay: i * 0.15, duration: 0.6 }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bottom Row: Leaderboard + Referral pipeline + Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Top Tutors Leaderboard */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">🏆 Top Tutors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topTutors.length === 0 && <p className="text-sm text-muted-foreground">{analyticTutors === null ? 'Loading…' : 'No tutors registered yet.'}</p>}
              {topTutors.map((t, i) => (
                <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-secondary text-primary' : i === 1 ? 'bg-slate-300 text-slate-700' : i === 2 ? 'bg-amber/30 text-amber-800' : 'bg-slate-100 text-charcoal'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-charcoal truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.program}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">{(t.points ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">pts</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Referral Pipeline (live counts) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">📋 Referral Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {referralsLoading && <p className="text-sm text-muted-foreground">Loading referrals…</p>}
              {(liveReferrals ?? []).length === 0 && !referralsLoading && (
                <p className="text-sm text-muted-foreground">No referrals yet.</p>
              )}
              {['flagged', 'assigned', 'in-progress', 'resolved'].map((key, i) => {
                const n = (liveReferrals ?? []).filter(r => r.status === key).length;
                return (
                  <div key={key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0 capitalize">
                      <p className="font-semibold text-sm text-charcoal">{key.replace('-', ' ')}</p>
                      <p className="text-xs text-muted-foreground">{n} referral{n === 1 ? '' : 's'}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{n}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Recent Activity Feed */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">⚡ Recent Referrals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {feed.length === 0 && <p className="text-sm text-muted-foreground">No recent activity.</p>}
              {feed.map(r => (
                <div key={r.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <Badge variant="secondary" className="text-[10px] uppercase mt-0.5 shrink-0">{r.urgency}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-charcoal truncate">
                      <span className="font-semibold">{r.learner}</span>
                      <span className="text-muted-foreground"> — {r.topic}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.subject_code} • {r.status}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // FACULTY DASHBOARD — Kanban Referral Board
  // ═══════════════════════════════════════════════════
  if (role === 'faculty') {
    const board = (liveReferrals ?? []);
    const columns = [
      { key: 'flagged', label: 'Flagged', color: 'bg-crimson', items: board.filter(r => r.status === 'flagged') },
      { key: 'assigned', label: 'Assigned', color: 'bg-amber', items: board.filter(r => r.status === 'assigned') },
      { key: 'in-progress', label: 'In Progress', color: 'bg-blue-500', items: board.filter(r => r.status === 'in-progress') },
      { key: 'resolved', label: 'Resolved', color: 'bg-emerald', items: board.filter(r => r.status === 'resolved') },
    ];

    return (
      <div className="space-y-6 h-full flex flex-col">
        <div className="section-head">
          <div>
            <h2 className="section-title text-primary">Early-Warning Referral Board</h2>
            <p className="section-subtitle">Manage and track student interventions — Logged in as <span className="font-semibold text-charcoal">{user?.name ?? '…'}</span></p>
          </div>
          <Button onClick={() => showToast('Opening New Referral Wizard', 'info')}>+ Nominate Student</Button>
        </div>

        {referralsLoading && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Loading referral board…</CardContent></Card>
        )}
        {referralsError && (
          <Card><CardContent className="p-8 text-center text-crimson">Failed to load referrals: {referralsError}</CardContent></Card>
        )}
        {!referralsLoading && !referralsError && board.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No referrals yet. Create one with “Nominate Student”.</CardContent></Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {columns.map(col => (
            <div key={col.key} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-border">
              <div className={`w-3 h-3 rounded-full ${col.color}`} />
              <div>
                <p className="text-2xl font-bold text-charcoal">{col.items.length}</p>
                <p className="text-xs text-muted-foreground">{col.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Kanban Board */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 pb-4">
          {columns.map(col => (
            <div key={col.key} className="bg-slate-50 rounded-lg p-3 flex flex-col border border-border">
              <h3 className="font-semibold text-charcoal mb-3 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                  {col.label}
                </span>
                <Badge variant="secondary" className="text-xs">{col.items.length}</Badge>
              </h3>

              <div className="space-y-2.5 flex-1 overflow-auto">
                {col.items.map(ref => (
                  <Card key={ref.id} className="cursor-pointer hover:border-primary transition-all hover:shadow-md group">
                    <CardHeader className="p-3 pb-1.5">
                      <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors">{ref.student}</CardTitle>
                      <CardDescription className="text-xs">{ref.subject} • {ref.topic}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={ref.urgency === 'high' ? 'destructive' : ref.urgency === 'medium' ? 'amber' : 'secondary'}
                          className={ref.urgency === 'high' ? 'bg-crimson text-xs' : ref.urgency === 'medium' ? 'bg-amber/20 text-amber-800 text-xs' : 'text-xs'}
                        >
                          {ref.urgency} urgency
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{ref.hoursRequired}h req</span>
                      </div>
                      {ref.assigned_tutor && (
                        <p className="text-xs text-muted-foreground">
                          → <span className="font-medium text-charcoal">{ref.assigned_tutor}</span>
                        </p>
                      )}
                      {ref.hours_completed !== undefined && (
                        <div className="space-y-1">
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald rounded-full" style={{ width: `${Math.min(100, (ref.hours_completed / ref.hours_required) * 100)}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground">{ref.hours_completed}/{ref.hours_required} hrs</p>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground italic line-clamp-2">{ref.notes}</p>
                      <p className="text-[10px] text-muted-foreground">by {ref.faculty} • {ref.date}</p>
                    </CardContent>
                  </Card>
                ))}
                {col.items.length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground py-12 opacity-50">
                    No items
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // TUTOR DASHBOARD — Wallet, Badges & Sessions
  // ═══════════════════════════════════════════════════
  if (role === 'tutor') {
    const myUpcoming = SESSIONS.filter(s => s.status === 'upcoming' && s.tutor === 'Mark Antipo');
    const myCompleted = SESSIONS.filter(s => s.status === 'completed' && s.tutor === 'Mark Antipo');
    const myRank = LEADERBOARD.find(l => l.name === 'Mark Antipo');

    return (
      <div className="space-y-6">
        {/* Points Hero Card + Stats */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 bg-gradient-to-br from-primary via-primary to-primary/80 text-white shadow-xl relative overflow-hidden border-0">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Award className="w-32 h-32" />
            </div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full -translate-x-1/2 translate-y-1/2" />
            <CardHeader>
              <CardTitle className="text-white text-lg font-medium opacity-80">Community Points Balance</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-5xl font-bold text-secondary mb-2">2,450 <span className="text-xl font-normal text-white/60">pts</span></div>
              <div className="flex items-center gap-6 mt-4 text-white/80">
                <p className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> 67 Sessions Completed</p>
                <p className="text-sm flex items-center gap-2"><Star className="w-4 h-4 fill-secondary text-secondary" /> 4.8 Avg Rating</p>
                <p className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Rank #{myRank?.rank || 4}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-border">
            <CardHeader>
              <CardTitle className="text-lg">My Badges</CardTitle>
              <CardDescription>Achievements unlocked</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {[
                { label: '🏆 Top 10% Tutor', earned: true },
                { label: '💻 IT Specialist', earned: true },
                { label: '⏱️ Fast Responder', earned: true },
                { label: '🏃 Marathon Mentor', earned: true },
                { label: '🌟 Rising Star', earned: true },
                { label: '👑 Consistency King', earned: false },
              ].map(b => (
                <Badge key={b.label} variant="secondary" className={`px-3 py-1 text-xs ${b.earned ? 'bg-secondary/20 text-secondary-foreground hover:bg-secondary/30' : 'bg-slate-100 text-slate-400 opacity-50'}`}>
                  {b.label}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Sessions */}
        <div>
          <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Upcoming Sessions
          </h3>
          {myUpcoming.length > 0 ? (
            <div className="space-y-3">
              {myUpcoming.map(s => (
                <Card key={s.id} className="shadow-sm border-border hover:border-primary/50 transition-colors group">
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row items-center justify-between p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {s.learner.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h4 className="font-semibold text-charcoal">{s.learner}</h4>
                          <p className="text-sm text-muted-foreground">{s.subject} • {s.topic}</p>
                        </div>
                      </div>
                      <div className="text-right mt-3 sm:mt-0">
                        <p className="font-semibold text-primary">{s.date === '2026-09-30' ? 'Today' : s.date}, {s.time}</p>
                        <p className="text-sm text-muted-foreground">{s.location} • {s.duration}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-sm border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground">
                No upcoming sessions scheduled. Check back soon!
              </CardContent>
            </Card>
          )}
        </div>

        {/* Completed Sessions */}
        <div>
          <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Recently Completed
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {myCompleted.map(s => (
              <Card key={s.id} className="shadow-sm border-border opacity-85 hover:opacity-100 transition-opacity">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-charcoal text-sm">{s.learner}</p>
                    <p className="text-xs text-muted-foreground">{s.subject} • {s.topic}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.date} • {s.duration}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < s.rating ? 'fill-secondary text-secondary' : 'text-slate-200'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-emerald font-semibold mt-1">+{s.pointsAwarded} pts</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // LEARNER DASHBOARD — Progress & History
  // ═══════════════════════════════════════════════════
  const myLiveReferral = (liveReferrals ?? []).find(r => r.status !== 'resolved');
  const myReferral = myLiveReferral
    ? myLiveReferral
    : null;
  const mySessions = SESSIONS.filter(s => s.learner === (user?.name || 'Julian Gemelo'));
  const myUpcomingSessions = mySessions.filter(s => s.status === 'upcoming');
  const myCompletedSessions = mySessions.filter(s => s.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Referral Alert */}
      {myReferral && (
        <motion.div {...fadeInUp}>
          <div className="bg-amber/10 border border-amber/20 rounded-lg p-4 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800">Active Faculty Referral — {myReferral.subject}</h3>
              <p className="text-sm text-amber-700/80 mt-1">
                {myReferral.faculty} has recommended {myReferral.hours_required} hours of peer tutoring. Topic: <span className="font-medium">{myReferral.topic}</span>
              </p>
              <p className="text-xs text-amber-600/70 mt-1 italic">"{myReferral.notes}"</p>
              <Button variant="outline" size="sm" className="mt-3 border-amber text-amber-800 hover:bg-amber/20">Find a Tutor Now</Button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Progress Circle */}
        <motion.div {...fadeInUp} transition={{ delay: 0.1 }}>
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Mandatory Hours Progress</CardTitle>
              <CardDescription>{myReferral?.subject || 'No active referral'} • {myReferral?.faculty || ''}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <div className="relative w-40 h-40 flex items-center justify-center mb-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#0F2942" strokeWidth="10"
                    strokeDasharray={`${((myReferral?.hours_completed ?? 0) / (myReferral?.hours_required || 6)) * 283} 283`}
                    strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-primary">{myReferral ? myReferral.hours_completed : '0'}</span>
                  <span className="text-xs text-muted-foreground">/ {myReferral?.hours_required || '?'} hrs</span>
                </div>
              </div>
              {myReferral ? (
                <>
                  <p className="text-sm font-medium text-charcoal">Keep going! Every session counts.</p>
                  <p className="text-xs text-muted-foreground mt-1">{myReferral.hours_required - myReferral.hours_completed} hours remaining</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {referralsLoading ? 'Loading referral…' : 'No active referral on file.'}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent & Upcoming Sessions */}
        <motion.div {...fadeInUp} transition={{ delay: 0.2 }}>
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>My Sessions</CardTitle>
              <CardDescription>Upcoming and completed tutoring sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {myUpcomingSessions.length > 0 && myUpcomingSessions.map(s => (
                <div key={s.id} className="flex items-center justify-between border-b pb-3">
                  <div>
                    <p className="font-semibold text-charcoal text-sm">{s.tutor}</p>
                    <p className="text-xs text-muted-foreground">{s.subject} • {s.topic}</p>
                    <p className="text-xs text-primary font-medium mt-0.5">{s.date === '2026-09-30' ? 'Today' : s.date}, {s.time}</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border border-blue-200">Upcoming</Badge>
                </div>
              ))}
              {myCompletedSessions.length > 0 && myCompletedSessions.slice(0, 3).map(s => (
                <div key={s.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-semibold text-charcoal text-sm">{s.tutor}</p>
                    <p className="text-xs text-muted-foreground">{s.subject} • {s.topic}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.date}</p>
                  </div>
                  <Badge className="bg-emerald/10 text-emerald border border-emerald/20">Completed</Badge>
                </div>
              ))}
              {mySessions.length === 0 && (
                <div className="text-center text-muted-foreground py-4 text-sm">
                  No sessions yet. Find a tutor to get started!
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
