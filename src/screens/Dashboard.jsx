import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import api from '../api';

/**
 * Live referrals for the signed-in user.
 * The server scopes rows by role; the dashboard only shapes them.
 */
export function useReferrals(role) {
  const [referrals, setReferrals] = useState(null);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api.get('/referrals')
      .then(({ referrals: rows }) => { if (!cancelled) setReferrals(rows); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [role, refreshKey]);
  return {
    referrals,
    error,
    loading: referrals === null && !error,
    reload: () => setRefreshKey((k) => k + 1),
  };
}

const fmtDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const fmtLongDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const fmtPoints = (value) => new Intl.NumberFormat('en-US').format(Number(value) || 0);

const initialsOf = (name = '') =>
  name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();

const STATUS_DOT = {
  flagged: 'bg-crimson',
  assigned: 'bg-amber',
  'in-progress': 'bg-ink/45',
  resolved: 'bg-emerald',
  rejected: 'bg-ink/40',
  upcoming: 'bg-ink/35',
  completed: 'bg-ink',
  cancelled: 'bg-crimson',
};

const URGENCY_DOT = {
  high: 'bg-crimson',
  medium: 'bg-amber',
  low: 'bg-ink/30',
};

function StatusPill({ status, className }) {
  return (
    <span className={cn('status-pill', className)}>
      <span className={cn('status-dot', STATUS_DOT[status] || 'bg-ink/30')} />
      <span className="capitalize">{String(status || '—').replace('-', ' ')}</span>
    </span>
  );
}

function Metrics({ items }) {
  return (
    <div className="panel overflow-hidden">
      <div className="grid grid-cols-2 gap-0.5 bg-ink lg:grid-cols-4">
        {items.map(item => (
          <div key={item.label} className="bg-card p-5">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
              {item.dot && <span className={cn('h-2 w-2 border border-ink', item.dot)} />}
              {item.label}
            </div>
            <p className="num mt-3 text-[34px] leading-none text-ink">{item.value}</p>
            <p className="mt-2 text-[13px] leading-snug text-muted-foreground">{item.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeading({ title, detail, action }) {
  return (
    <div className="section-head">
      <div>
        <h1 className="section-title">{title}</h1>
        {detail && <p className="section-subtitle">{detail}</p>}
      </div>
      {action}
    </div>
  );
}

export default function Dashboard({ role, user, showToast }) {
  const navigate = useNavigate();
  const { referrals: liveReferrals, error: referralsError, loading: referralsLoading, reload: reloadReferrals } = useReferrals(role);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [analyticTutors, setAnalyticTutors] = useState(null);
  const [sessionsMine, setSessionsMine] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (role === 'superadmin') {
      api.get('/analytics').then(data => { if (!cancelled) setAnalytics(data); }).catch(e => { if (!cancelled) setAnalyticsError(e.message); });
      api.get('/tutors')
        .then(({ tutors: rows }) => { if (!cancelled) setAnalyticTutors([...rows].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))); })
        .catch(() => { if (!cancelled) setAnalyticTutors([]); });
    }
    if (role === 'tutor' || role === 'learner') {
      api.get('/sessions/mine')
        .then(({ sessions }) => { if (!cancelled) setSessionsMine(sessions); })
        .catch(() => { if (!cancelled) setSessionsMine([]); });
    }
    if (role === 'tutor') {
      api.get('/wallet').then(({ balance }) => { if (!cancelled) setWalletBalance(balance); }).catch(() => {});
    }
    return () => { cancelled = true; };
  }, [role]);

  // ── Superadmin ───────────────────────────────────────────────────────────
  if (role === 'superadmin') {
    const weeklyTrend = (analytics?.trends ?? Array.from({ length: 6 }, () => ({ week: null, sessions: 0 }))).map((t, index, all) => ({
      label: index === all.length - 1
        ? 'This wk'
        : t.week ? fmtDate(t.week) : '—',
      sessions: t.sessions ?? 0,
    }));
    const chartMax = Math.max(4, Math.ceil(Math.max(1, ...weeklyTrend.map(t => t.sessions)) / 4) * 4);
    const chartMid = Math.round(chartMax / 2);
    const deptRows = analytics?.byDept ?? [];
    const topTutors = analyticTutors?.slice(0, 5) ?? [];
    const feed = (liveReferrals ?? []).slice(0, 5);
    const rejectedRows = (liveReferrals ?? []).filter(r => r.status === 'rejected');
    const pipeline = ['flagged', 'assigned', 'in-progress', 'resolved', 'rejected'].map(key => ({
      key,
      count: (liveReferrals ?? []).filter(r => r.status === key).length,
    }));
    const pipelineTotal = Math.max(1, ...pipeline.map(p => p.count));

    const kpis = [
      { label: 'Active tutors', value: analytics ? fmtPoints(analytics.activeTutors) : '—', sub: analytics ? `${fmtPoints(analytics.totalLearners)} learners enrolled` : 'Reading the ledger…' },
      { label: 'Sessions · 30 days', value: analytics ? fmtPoints(analytics.monthlySessions) : '—', sub: analytics ? `${fmtPoints(analytics.monthlyPrev)} in the prior 30 days` : ' ' },
      { label: 'Referral recovery', value: analytics ? `${analytics.recoveryRate ?? 0}%` : '—', sub: analytics ? `${analytics.resolvedReferrals} of ${analytics.totalReferrals} resolved` : ' ' },
      { label: 'Points issued', value: analytics ? fmtPoints(analytics.pointsIssued) : '—', sub: analytics ? `${analytics.avgRating ?? '—'} average session rating` : ' ' },
    ];

    const removeReferral = async (referral) => {
      if (!window.confirm(`Remove ${referral.referral_code} from the ledger? This cannot be undone.`)) return;
      try {
        await api.delete(`/referrals/${referral.id}`);
        showToast(`${referral.referral_code} was removed from the ledger.`, 'success');
        reloadReferrals();
      } catch (e) {
        showToast(e.message || 'Could not remove the referral', 'error');
      }
    };

    return (
      <div className="space-y-5">
        <SectionHeading
          title="Institution overview"
          detail="Session, referral, and point activity across the ledger."
          action={(
            <span className="flex items-center gap-2 border-2 border-ink bg-paper px-2.5 py-1.5 text-[13px] font-semibold">
              <span className="h-2 w-2 border border-ink bg-emerald" />
              Live from the ledger
            </span>
          )}
        />

        {analyticsError && (
          <div className="panel px-5 py-4 text-[14px] text-crimson">Analytics could not be read: {analyticsError}</div>
        )}

        <Metrics items={kpis} />

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Weekly sessions — the one chart on this screen */}
          <div className="panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-[17px] font-bold leading-tight tracking-[-0.02em]">Sessions per week</h2>
                <p className="meta mt-0.5">Completed sessions, last six weeks</p>
              </div>
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
                <span className="h-2.5 w-2.5 border-2 border-ink bg-gold" /> This week
              </span>
            </div>

            <div className="mt-6 flex gap-3">
              <div className="num flex h-[150px] w-6 flex-col justify-between text-right text-[13px] leading-none text-muted-foreground">
                <span>{chartMax}</span>
                <span>{chartMid}</span>
                <span>0</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="relative h-[150px]">
                  <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">
                    {[0, 1, 2].map(i => <span key={i} className="h-0.5 w-full bg-ink/10" />)}
                  </div>
                  <div className="relative z-10 flex h-full items-end gap-2" role="img" aria-label={weeklyTrend.map(t => `${t.label}: ${t.sessions} sessions`).join(', ')}>
                    {weeklyTrend.map((point, index) => (
                      <div key={`${point.label}-${index}`} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                        <span className="num text-[13px] leading-none text-ink">{point.sessions}</span>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(2, (point.sessions / chartMax) * 118)}px` }}
                          transition={{ duration: 0.45, delay: index * 0.05, ease: 'easeOut' }}
                          className={cn('w-full max-w-[38px] border-2 border-ink', index === weeklyTrend.length - 1 ? 'bg-gold' : 'bg-[#e4dbc9]')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  {weeklyTrend.map((point, index) => (
                    <span key={`${point.label}-label-${index}`} className={cn('flex-1 text-center text-[13px]', index === weeklyTrend.length - 1 ? 'text-ink' : 'text-muted-foreground')}>
                      {point.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {analytics === null && !analyticsError && <p className="meta mt-4">Reading the ledger…</p>}
          </div>

          {/* Departments — a table, not a second chart */}
          <div className="panel p-5">
            <h2 className="font-display text-[17px] font-bold leading-tight tracking-[-0.02em]">Activity by department</h2>
            <p className="meta mt-0.5">Completed sessions and the people behind them</p>
            {deptRows.length === 0 ? (
              <div className="empty">{analytics ? 'No department data yet.' : 'Reading the ledger…'}</div>
            ) : (
              <table className="data-table mt-4">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th className="text-right">Sessions</th>
                    <th className="text-right">Learners</th>
                    <th className="text-right">Tutors</th>
                  </tr>
                </thead>
                <tbody>
                  {deptRows.map(row => (
                    <tr key={row.department}>
                      <td className="font-medium">{row.department}</td>
                      <td className="num text-right">{row.completed}</td>
                      <td className="num text-right text-muted-foreground">{row.learners}</td>
                      <td className="num text-right text-muted-foreground">{row.tutors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="panel p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-[17px] font-bold leading-tight tracking-[-0.02em]">Top tutors</h2>
              <span className="meta">By balance</span>
            </div>
            <div className="mt-3">
              {topTutors.length === 0 && <div className="empty">{analyticTutors === null ? 'Reading the ledger…' : 'No tutors on file yet.'}</div>}
              {topTutors.map((tutor, index) => (
                <div key={tutor.id} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
                  <span className="num w-4 text-[13px] text-muted-foreground">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium leading-tight">{tutor.name}</p>
                    <p className="text-[13px] leading-tight text-muted-foreground">{tutor.program}</p>
                  </div>
                  <p className="num text-[14px] text-ink">
                    {fmtPoints(tutor.points)} <span className="text-[13px] font-normal text-muted-foreground">pts</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-[17px] font-bold leading-tight tracking-[-0.02em]">Referral pipeline</h2>
              <span className="num text-[13px] text-muted-foreground">{liveReferrals?.length ?? 0}</span>
            </div>
            <div className="mt-4 space-y-3.5">
              {pipeline.map(row => (
                <div key={row.key}>
                  <div className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="capitalize text-ink">{row.key.replace('-', ' ')}</span>
                    <span className="num text-ink">{row.count}</span>
                  </div>
                  <div className="mt-1.5 h-2.5 w-full border-2 border-ink bg-paper">
                    <div className="h-full bg-gold" style={{ width: `${Math.max(row.count ? 4 : 0, (row.count / pipelineTotal) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {referralsError && <p className="meta mt-4 text-crimson">{referralsError}</p>}
          </div>

          <div className="panel p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-[17px] font-bold leading-tight tracking-[-0.02em]">Recent referrals</h2>
              <button type="button" onClick={() => navigate('/referral')} className="text-[13px] font-semibold text-ink underline decoration-gold decoration-2 underline-offset-4 hover:decoration-ink">
                Board
              </button>
            </div>
            <div className="mt-3">
              {referralsLoading && <div className="empty">Reading referrals…</div>}
              {!referralsLoading && feed.length === 0 && <div className="empty">No referrals yet.</div>}
              {feed.map(referral => (
                <div key={referral.id} className="flex items-start gap-2.5 border-b border-line py-2.5 last:border-0">
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 border border-ink', URGENCY_DOT[referral.urgency] || 'bg-ink/30')} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] leading-tight text-ink">
                      <span className="font-medium">{referral.learner}</span>
                      <span className="text-muted-foreground"> · {referral.topic}</span>
                    </p>
                    <p className="mt-1 text-[13px] leading-tight text-muted-foreground">
                      {referral.subject_code} · {referral.status.replace('-', ' ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {rejectedRows.length > 0 && (
          <div className="panel p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-[17px] font-bold leading-tight tracking-[-0.02em]">Rejected referrals</h2>
              <span className="num text-[13px] text-muted-foreground">{rejectedRows.length}</span>
            </div>
            <p className="meta mt-0.5">Flagged as rejected by the board. Removal is permanent.</p>
            <div className="mt-3">
              {rejectedRows.map(referral => (
                <div key={referral.id} className="flex items-start gap-3 border-b border-line py-2.5 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] leading-tight text-ink">
                      <span className="num font-semibold">{referral.referral_code}</span> · {referral.learner}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] leading-tight text-muted-foreground">
                      {referral.subject_code} · {referral.topic} · {referral.faculty}
                    </p>
                  </div>
                  <Button variant="destructive" size="sm" className="shrink-0" onClick={() => removeReferral(referral)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Faculty ──────────────────────────────────────────────────────────────
  if (role === 'faculty') {
    const board = liveReferrals ?? [];
    const columns = [
      { key: 'flagged', label: 'Flagged', dot: 'bg-crimson', items: board.filter(r => r.status === 'flagged') },
      { key: 'assigned', label: 'Assigned', dot: 'bg-amber', items: board.filter(r => r.status === 'assigned') },
      { key: 'in-progress', label: 'In progress', dot: 'bg-ink/45', items: board.filter(r => r.status === 'in-progress') },
      { key: 'resolved', label: 'Resolved', dot: 'bg-emerald', items: board.filter(r => r.status === 'resolved') },
      { key: 'rejected', label: 'Rejected', dot: 'bg-ink/40', items: board.filter(r => r.status === 'rejected') },
    ];
    const stats = columns.map(col => ({ label: col.label, value: col.items.length, sub: col.items.length === 1 ? 'referral' : 'referrals', dot: col.dot }));

    const rejectReferral = async (referral) => {
      try {
        await api.patch(`/referrals/${referral.id}/status`, { status: 'rejected' });
        showToast(`${referral.referral_code} was rejected.`, 'success');
        reloadReferrals();
      } catch (e) {
        showToast(e.message || 'Could not reject the referral', 'error');
      }
    };

    return (
      <div className="space-y-5">
        <SectionHeading
          title="Referral board"
          detail={`Early-warning interventions for ${user?.name ?? 'your students'}.`}
          action={<Button onClick={() => navigate('/referral')}><Plus className="h-4 w-4" strokeWidth={1.8} /> New referral</Button>}
        />

        <Metrics items={stats} />

        {referralsError && <div className="panel px-5 py-4 text-[14px] text-crimson">The board could not be read: {referralsError}</div>}
        {referralsLoading && <div className="panel empty">Reading the board…</div>}

        {!referralsLoading && !referralsError && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {columns.map(column => (
              <div key={column.key} className="border-2 border-ink bg-[#e9e1d1] p-2.5">
                <div className="flex items-center justify-between gap-2 border-b-2 border-ink px-1 pb-2.5">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-ink">
                    <span className={cn('h-2 w-2 border border-ink', column.dot)} />
                    {column.label}
                  </div>
                  <span className="num border-2 border-ink bg-paper px-1.5 text-[13px]">{column.items.length}</span>
                </div>

                <div className="mt-2.5 space-y-2.5">
                  {column.items.map(referral => {
                    const completed = Number(referral.hours_completed) || 0;
                    const required = Number(referral.hours_required) || 1;
                    const pct = Math.min(100, (completed / required) * 100);
                    return (
                      <article key={referral.id} className="border-2 border-ink bg-paper p-3.5 shadow-[3px_3px_0_#0f2942] transition-transform hover:-translate-y-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[14px] font-bold leading-snug text-ink">{referral.learner}</p>
                          <span className={cn('mt-1.5 h-2 w-2 shrink-0 border border-ink', URGENCY_DOT[referral.urgency] || 'bg-ink/30')} title={`${referral.urgency} urgency`} />
                        </div>
                        <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                          {referral.subject} · {referral.topic}
                        </p>

                        <div className="mt-3 flex items-baseline justify-between gap-2 text-[13px]">
                          <span className="capitalize text-muted-foreground">{referral.urgency} urgency</span>
                          <span className="num text-ink">{completed}/{required}h</span>
                        </div>
                        <div className="mt-1.5 h-2 w-full border border-ink bg-paper">
                          <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
                        </div>

                        {referral.assigned_tutor && (
                          <p className="mt-2 truncate text-[13px] text-muted-foreground">
                            Tutor · <span className="text-ink">{referral.assigned_tutor}</span>
                          </p>
                        )}
                        {referral.notes && <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-muted-foreground">{referral.notes}</p>}
                        <p className="mt-2 text-[13px] text-muted-foreground">{fmtDate(referral.date)} · {referral.faculty}</p>
                        {(referral.status === 'flagged' || referral.status === 'rejected') && (
                          <div className="mt-3 border-t border-line pt-2.5">
                            {referral.status === 'flagged'
                              ? (
                                <Button variant="outline" size="sm" className="w-full" onClick={() => rejectReferral(referral)}>
                                  Reject referral
                                </Button>
                              )
                              : (
                                <p className="text-center text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                                  Removal is a superadmin action
                                </p>
                              )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                  {column.items.length === 0 && (
                    <div className="border-2 border-dashed border-ink/30 px-2 py-8 text-center text-[13px] text-muted-foreground">Nothing here.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!referralsLoading && !referralsError && board.length === 0 && (
          <div className="panel flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <p className="text-[14px] text-muted-foreground">The board is empty. Start with a student who needs a hand.</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/referral')}>Write the first referral</Button>
          </div>
        )}
      </div>
    );
  }

  // ── Tutor ────────────────────────────────────────────────────────────────
  if (role === 'tutor') {
    const mine = sessionsMine ?? [];
    const upcoming = mine.filter(s => s.status === 'upcoming');
    const completed = mine.filter(s => s.status === 'completed');
    const rated = completed.filter(s => s.rating != null);
    const avgRating = rated.length
      ? (rated.reduce((sum, s) => sum + Number(s.rating), 0) / rated.length).toFixed(1)
      : '—';
    const hoursTutored = completed.reduce((sum, s) => sum + (Number(s.duration_hours) || 0), 0);
    const next = [...upcoming].sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];

    return (
      <div className="space-y-5">
        <SectionHeading
          title="Tutor overview"
          detail="Your sessions, ratings, and points on record."
          action={(
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/rewards')}>Rewards</Button>
              <Button onClick={() => navigate('/checkin')}>Session check-in</Button>
            </div>
          )}
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="panel p-5 lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold text-muted-foreground">Community points</p>
                <p className="num mt-2 text-[48px] leading-none text-ink">
                  {walletBalance === null ? '—' : fmtPoints(walletBalance)}
                  <span className="ml-2 text-[16px] font-normal tracking-normal text-muted-foreground">pts</span>
                </p>
              </div>
              <span className="status-pill">
                <span className={cn('status-dot', 'bg-emerald')} /> Ledger current
              </span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              {[
                { label: 'Sessions completed', value: completed.length },
                { label: 'Average rating', value: avgRating },
                { label: 'Hours tutored', value: hoursTutored ? Number(hoursTutored.toFixed(1)) : '0' },
              ].map((stat, index) => (
                <div key={stat.label} className={cn(index > 0 && 'border-l border-line pl-4')}>
                  <p className="num text-[20px] leading-none text-ink">{stat.value}</p>
                  <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[13px] text-muted-foreground">50 points post after each completed and double-confirmed session.</p>
          </div>

          <div className="panel p-5">
            <h2 className="font-display text-[17px] font-bold leading-tight tracking-[-0.02em]">At a glance</h2>
            <div className="mt-4 space-y-3">
              {[
                { label: 'Upcoming sessions', value: upcoming.length },
                { label: 'Tutored this term', value: `${Number(hoursTutored.toFixed(1))} hrs` },
                { label: 'Sessions rated 5', value: completed.filter(s => Number(s.rating) === 5).length },
              ].map(row => (
                <div key={row.label} className="flex items-baseline justify-between gap-3 border-b border-line pb-2.5 last:border-0 last:pb-0">
                  <span className="text-[13px] text-muted-foreground">{row.label}</span>
                  <span className="num text-[14px] text-ink">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <p className="text-[13px] text-muted-foreground">Next session</p>
              {next ? (
                <>
                  <p className="mt-1 text-[14px] font-medium text-ink">{fmtLongDate(next.date)} · {next.time}</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{next.learner_name} · {next.subject}</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{next.location}</p>
                </>
              ) : (
                <p className="mt-1 text-[14px] text-muted-foreground">No session booked.</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="panel">
            <div className="flex items-center justify-between gap-3 border-b-2 border-ink bg-[#f8f1e2] px-5 py-4">
              <h2 className="font-display text-[17px] font-bold leading-tight tracking-[-0.02em]">Upcoming sessions</h2>
              <span className="num border-2 border-ink bg-paper px-1.5 text-[13px]">{upcoming.length}</span>
            </div>
            {sessionsMine === null && <div className="empty">Reading your sessions…</div>}
            {sessionsMine !== null && upcoming.length === 0 && <div className="empty">No upcoming sessions booked.</div>}
            {[...upcoming].sort((a, b) => String(a.date).localeCompare(String(b.date))).map(session => (
              <div key={session.id} className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5 last:border-0">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center border-2 border-ink bg-[#fff7d6] text-[13px] font-bold text-ink">
                    {initialsOf(session.learner_name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium leading-tight text-ink">{session.learner_name}</p>
                    <p className="mt-0.5 truncate text-[13px] leading-tight text-muted-foreground">{session.subject} · {session.topic}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="num text-[13px] text-ink">{fmtLongDate(session.date)}</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{session.time} · {session.duration}</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{session.location}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="flex items-center justify-between gap-3 border-b-2 border-ink bg-[#f8f1e2] px-5 py-4">
              <h2 className="font-display text-[17px] font-bold leading-tight tracking-[-0.02em]">Completed</h2>
              <span className="num border-2 border-ink bg-paper px-1.5 text-[13px]">{completed.length}</span>
            </div>
            {sessionsMine === null && <div className="empty">Reading your record…</div>}
            {sessionsMine !== null && completed.length === 0 && <div className="empty">Completed sessions appear here after wrap-up.</div>}
            {completed.length > 0 && (
              <div className="px-5 pb-2">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Learner</th>
                      <th>Date</th>
                      <th className="text-right">Rating</th>
                      <th className="text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completed.map(session => (
                      <tr key={session.id}>
                        <td>
                          <p className="font-medium leading-tight">{session.learner_name}</p>
                          <p className="mt-0.5 text-[13px] leading-tight text-muted-foreground">{session.subject}</p>
                        </td>
                        <td className="num whitespace-nowrap text-[13px] text-muted-foreground">{fmtDate(session.date)}</td>
                        <td className="num text-right">{session.rating ? `${session.rating}/5` : '—'}</td>
                        <td className="num whitespace-nowrap text-right">+50</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Learner ──────────────────────────────────────────────────────────────
  const mine = sessionsMine ?? [];
  const myReferral = (liveReferrals ?? []).find(referral => referral.status !== 'resolved') ?? null;
  const myUpcoming = mine.filter(session => session.status === 'upcoming');
  const myCompleted = mine.filter(session => session.status === 'completed');
  const hoursLogged = myCompleted.reduce((sum, session) => sum + (Number(session.duration_hours) || 0), 0);
  const distinctTutors = new Set(mine.map(session => session.tutor_name).filter(Boolean)).size;
  const required = Number(myReferral?.hours_required) || 0;
  const completedHours = Number(myReferral?.hours_completed) || 0;
  const remaining = Math.max(0, required - completedHours);
  const progress = required ? Math.min(100, (completedHours / required) * 100) : 0;
  const mySessions = [...mine].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 8);

  return (
    <div className="space-y-5">
      <SectionHeading
        title="My progress"
        detail="Referral hours, sessions, and the record you are building."
        action={<Button onClick={() => navigate('/wizard')}>Find a tutor</Button>}
      />

      {referralsError && <div className="panel px-5 py-4 text-[14px] text-crimson">Your referral could not be read: {referralsError}</div>}

      {myReferral && (
        <div className="panel overflow-hidden">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 border-2 border-ink bg-amber" />
              <div>
                <p className="text-[13px] font-semibold text-muted-foreground">Active referral · {myReferral.faculty}</p>
                <h2 className="mt-1 font-display text-[20px] font-bold leading-tight tracking-[-0.03em]">{myReferral.subject} — {myReferral.topic}</h2>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {remaining > 0 ? `${remaining} of ${required} hours remaining` : 'All required hours logged — awaiting resolution'}
                </p>
                {myReferral.notes && <p className="mt-2 max-w-[60ch] text-[13px] leading-snug text-muted-foreground">“{myReferral.notes}”</p>}
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate('/wizard')}>Book a session</Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-[17px] font-bold leading-tight tracking-[-0.02em]">Mandatory hours</h2>
              <p className="meta mt-0.5">{myReferral ? `${myReferral.subject} · ${myReferral.faculty}` : 'No active referral on file'}</p>
            </div>
            <span className="num text-[13px] text-muted-foreground">{Math.round(progress)}%</span>
          </div>

          <div className="mt-6 flex items-end gap-2">
            <p className="num text-[48px] leading-none text-ink">{completedHours}</p>
            <p className="mb-1 text-[16px] text-muted-foreground">/ {required || '—'} hrs</p>
          </div>
          <div className="mt-4 h-3 w-full border-2 border-ink bg-paper">
            <div className="h-full bg-gold transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <span className="text-[13px] text-muted-foreground">{myReferral ? `${remaining} hours remaining` : referralsLoading ? 'Reading referral…' : 'Ask your faculty adviser for a referral.'}</span>
            <span className="text-[13px] text-muted-foreground">Hours post after wrap-up</span>
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="font-display text-[17px] font-bold leading-tight tracking-[-0.02em]">This term</h2>
          <div className="mt-4 space-y-3">
            {[
              { label: 'Sessions logged', value: mine.length },
              { label: 'Upcoming', value: myUpcoming.length },
              { label: 'Hours logged', value: Number(hoursLogged.toFixed(1)) },
              { label: 'Tutors worked with', value: distinctTutors },
            ].map(row => (
              <div key={row.label} className="flex items-baseline justify-between gap-3 border-b border-line pb-2.5 last:border-0 last:pb-0">
                <span className="text-[13px] text-muted-foreground">{row.label}</span>
                <span className="num text-[14px] text-ink">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="flex items-center justify-between gap-3 border-b-2 border-ink bg-[#f8f1e2] px-5 py-4">
          <h2 className="font-display text-[17px] font-bold leading-tight tracking-[-0.02em]">Session record</h2>
          <span className="num border-2 border-ink bg-paper px-1.5 text-[13px]">{mine.length}</span>
        </div>
        {sessionsMine === null && <div className="empty">Reading your sessions…</div>}
        {sessionsMine !== null && mySessions.length === 0 && (
          <div className="empty">
            No sessions yet. <button type="button" onClick={() => navigate('/wizard')} className="link-ink">Find a tutor</button> to start the record.
          </div>
        )}
        {mySessions.length > 0 && (
          <div className="overflow-x-auto px-5 pb-2">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tutor</th>
                  <th>Subject</th>
                  <th>When</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {mySessions.map(session => (
                  <tr key={session.id}>
                    <td className="font-medium">{session.tutor_name}</td>
                    <td>
                      <p className="leading-tight">{session.subject}</p>
                      <p className="mt-0.5 text-[13px] leading-tight text-muted-foreground">{session.topic}</p>
                    </td>
                    <td className="num whitespace-nowrap text-[13px] text-muted-foreground">{fmtLongDate(session.date)} · {session.time}</td>
                    <td className="text-right"><StatusPill status={session.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showToast && (
        <p className="text-[13px] text-muted-foreground">
          Need a hand? Ask your faculty adviser or book a peer tutor from the catalog.
        </p>
      )}
      <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.6} />
        Your record is append-only. Changes appear after each verified session.
      </div>
    </div>
  );
}
