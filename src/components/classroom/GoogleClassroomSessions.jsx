import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Filter,
  ArrowUpDown,
  BookOpen,
  Search,
  Loader2,
  Star,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../ui/button';
import Avatar from '../ui/Avatar';
import SessionDetailModal, { getSubjectBannerPalette } from './SessionDetailModal';
import { cn } from '../../lib/utils';
import api from '../../api';

const PAGE_SIZE = 6;

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'in-progress', label: 'In-progress' },
  { value: 'cancelled', label: 'Cancelled' },
];

function fmtShortDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDurationShort(totalSeconds = 0) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec > 0 ? `${sec}s` : ''}`.trim();
  return `${sec}s`;
}

function StatusBadge({ status }) {
  const STATUS_STYLES = {
    completed: 'bg-emerald text-white border-emerald',
    upcoming: 'bg-gold text-ink border-ink',
    'in-progress': 'bg-amber text-white border-amber',
    cancelled: 'bg-crimson text-white border-crimson',
  };

  const style = STATUS_STYLES[status] || 'bg-stone text-ink border-ink';

  return (
    <span
      className={cn(
        'inline-flex items-center border px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider shadow-[1px_1px_0_rgba(0,0,0,0.2)]',
        style
      )}
    >
      {status}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="panel animate-pulse overflow-hidden border-2 border-ink bg-paper">
      <div className="h-24 bg-stone" />
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 border-2 border-line bg-stone" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-3/4 bg-stone" />
            <div className="h-3 w-1/2 bg-stone" />
          </div>
        </div>
        <div className="space-y-2 border-t border-line pt-3">
          <div className="h-3 w-4/5 bg-stone" />
          <div className="h-3 w-2/3 bg-stone" />
        </div>
      </div>
    </div>
  );
}

export default function GoogleClassroomSessions({ role = 'learner' }) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState([]);

  // Filters and Sort State
  const [statusFilter, setStatusFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [sortDirection, setSortDirection] = useState('desc');

  // Modal State
  const [selectedSession, setSelectedSession] = useState(null);

  const isLearner = role === 'learner';

  const fetchSessions = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const offset = isLoadMore ? sessions.length : 0;
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
        sort: sortDirection,
      });

      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (subjectFilter !== 'all') params.append('subject', subjectFilter);

      const res = await api.get(`/sessions/mine?${params.toString()}`);
      const newRows = res.sessions || [];

      if (isLoadMore) {
        setSessions(prev => [...prev, ...newRows]);
      } else {
        setSessions(newRows);
      }

      setTotalCount(res.total ?? (isLoadMore ? sessions.length + newRows.length : newRows.length));
      setHasMore(Boolean(res.hasMore));

      if (res.subjects && res.subjects.length > 0) {
        setAvailableSubjects(res.subjects);
      }
    } catch (e) {
      console.error('Failed to fetch sessions:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [sessions.length, statusFilter, subjectFilter, sortDirection]);

  // Refetch when filters or sort change
  useEffect(() => {
    fetchSessions(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, subjectFilter, sortDirection]);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    fetchSessions(true);
  };

  return (
    <div className="space-y-5">
      {/* Filter and Control Bar */}
      <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'min-h-[38px] border-2 border-ink px-3 py-1 text-[13px] font-bold transition-[transform,box-shadow]',
                statusFilter === f.value
                  ? 'bg-gold text-ink shadow-[2px_2px_0_var(--color-ink)]'
                  : 'bg-paper text-ink hover:bg-surface-highlight'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Dropdowns: Subject & Sort */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Subject Filter */}
          <div className="relative min-w-[150px]">
            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              aria-label="Filter by subject"
              className="min-h-[40px] w-full appearance-none border-2 border-ink bg-paper px-3 py-1.5 pr-8 text-[13px] font-bold text-ink shadow-[2px_2px_0_var(--color-ink)] outline-none focus-visible:shadow-[3px_3px_0_var(--color-gold)]"
            >
              <option value="all">All Subjects</option>
              {availableSubjects.map(sub => (
                <option key={sub.code} value={sub.code}>
                  {sub.code} · {sub.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink" strokeWidth={2.4} />
          </div>

          {/* Sort Order Toggle */}
          <button
            type="button"
            onClick={() => setSortDirection(prev => (prev === 'desc' ? 'asc' : 'desc'))}
            className="flex min-h-[40px] items-center gap-1.5 border-2 border-ink bg-paper px-3 py-1.5 text-[13px] font-bold text-ink shadow-[2px_2px_0_var(--color-ink)] transition-transform hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5"
            title={`Sort order: ${sortDirection === 'desc' ? 'Newest first' : 'Oldest first'}`}
            aria-label={`Sort order: ${sortDirection === 'desc' ? 'Newest first' : 'Oldest first'}`}
          >
            <ArrowUpDown className="h-4 w-4" strokeWidth={2.2} />
            <span>{sortDirection === 'desc' ? 'Newest' : 'Oldest'}</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Empty State */}
      {!loading && sessions.length === 0 && (
        <div className="panel flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="grid h-16 w-16 place-items-center border-2 border-ink bg-gold text-ink shadow-[3px_3px_0_var(--color-ink)]">
            <BookOpen className="h-8 w-8" strokeWidth={2.2} />
          </span>
          <h3 className="mt-4 font-display text-[18px] font-bold tracking-[-0.02em] text-ink">
            No sessions match your filter
          </h3>
          <p className="mt-1 max-w-[40ch] text-[13px] text-muted-foreground">
            {statusFilter !== 'all' || subjectFilter !== 'all'
              ? 'Try changing or clearing your status and subject filters.'
              : isLearner
                ? 'Your completed and upcoming sessions will appear here.'
                : 'Tutoring sessions with your learners will be recorded here.'}
          </p>
          {(statusFilter !== 'all' || subjectFilter !== 'all') ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setSubjectFilter('all');
              }}
              className="mt-4 min-h-[40px]"
            >
              Clear filters
            </Button>
          ) : isLearner ? (
            <Button
              size="sm"
              onClick={() => navigate('/wizard')}
              className="mt-4 min-h-[40px]"
            >
              <Search className="mr-1.5 h-4 w-4" />
              Find a tutor
            </Button>
          ) : null}
        </div>
      )}

      {/* Classroom Card Grid (1, 2, or 3 columns by width) */}
      {!loading && sessions.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => {
              const partnerName = isLearner ? session.tutor_name : session.learner_name;
              const partnerAvatar = isLearner ? session.tutor_avatar : session.learner_avatar;
              const palette = getSubjectBannerPalette(session.subject_code || session.subject);

              return (
                <div
                  key={session.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedSession(session)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedSession(session);
                    }
                  }}
                  className="group panel relative flex flex-col justify-between overflow-hidden text-left transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-[5px_5px_0_var(--color-ink)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-gold"
                  aria-label={`${session.subject_code || session.subject} session with ${partnerName}. Status: ${session.status}. Date: ${fmtShortDate(session.date)}`}
                >
                  {/* Top Classroom Banner */}
                  <div>
                    <div className={cn('relative p-4 sm:p-5', palette.bg, palette.text)}>
                      {/* Status Badge in Banner */}
                      <div className="flex items-start justify-between gap-2">
                        <span className={cn('px-2 py-0.5 text-[11px] font-black uppercase tracking-wider', palette.badge)}>
                          {session.subject_code || 'COURSE'}
                        </span>
                        <StatusBadge status={session.status} />
                      </div>

                      <h3 className="mt-2 line-clamp-1 font-display text-[17px] font-extrabold tracking-[-0.02em] text-white">
                        {session.subject}
                      </h3>
                      <p className="mt-0.5 line-clamp-1 text-[13px] text-white/90">
                        {session.topic || 'General tutoring review'}
                      </p>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 sm:p-5">
                      {/* Partner Avatar & Name */}
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={partnerName}
                          avatarUrl={partnerAvatar}
                          size="md"
                          className="shrink-0 shadow-[2px_2px_0_var(--color-ink)]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-muted-foreground">
                            {isLearner ? 'Tutor' : 'Learner'}
                          </p>
                          <p className="truncate text-[14px] font-bold leading-tight text-ink">
                            {partnerName}
                          </p>
                        </div>
                      </div>

                      {/* Date & Time Details */}
                      <div className="mt-3.5 space-y-1.5 border-t border-ink/10 pt-3 text-[12px] text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
                          <span className="font-semibold text-ink">{fmtShortDate(session.date)}</span>
                          <span>·</span>
                          <span>{session.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
                          <span className="truncate">{session.location || 'Library Study Room A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Code, Logged Duration & Rating */}
                  <div className="flex items-center justify-between border-t border-ink/10 bg-surface-quiet px-4 py-2 text-[12px]">
                    <span className="font-mono text-muted-foreground">
                      {session.session_code || 'SES'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium">
                        {session.actual_duration_seconds > 0
                          ? formatDurationShort(session.actual_duration_seconds)
                          : (session.duration || `${session.duration_hours || 1} hr`)}
                      </span>
                      {session.rating && (
                        <span className="inline-flex items-center gap-1 font-bold text-ink">
                          <Star className="h-3.5 w-3.5 fill-gold text-gold-ink" />
                          <span>{session.rating}/5</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Pagination */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="min-h-[44px] min-w-[160px] shadow-[3px_3px_0_var(--color-ink)]"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading more…
                  </>
                ) : (
                  `Load more (${sessions.length} of ${totalCount})`
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Accessible Session Detail Dialog */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          role={role}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}

