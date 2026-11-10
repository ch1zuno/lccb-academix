import { useState, useEffect, useCallback } from 'react';

const BASE_TITLE = 'LCCB Academix — Peer Tutoring & Incentive Ledger';

/**
 * Sets document.title for the active screen and restores the default on unmount.
 */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · LCCB Academix` : BASE_TITLE;
  }, [title]);
}

/**
 * Persists form draft state in localStorage under `academix-draft:${key}`.
 * Returns [value, setValue, clearDraft, hasRestored].
 */
export function useDraftState(key, initialValue) {
  const storageKey = key ? `academix-draft:${key}` : null;
  const [hasRestored, setHasRestored] = useState(false);

  const [value, setValue] = useState(() => {
    if (!storageKey) return typeof initialValue === 'function' ? initialValue() : initialValue;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw != null) {
        return JSON.parse(raw);
      }
    } catch {
      /* ignore corrupt storage */
    }
    return typeof initialValue === 'function' ? initialValue() : initialValue;
  });

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw != null) {
        setValue(JSON.parse(raw));
        setHasRestored(true);
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const isEmptyObject =
        value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0;
      const isEmptyString = value === '';
      if (value == null || isEmptyObject || isEmptyString) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(value));
      }
    } catch {
      /* ignore quota errors */
    }
  }, [storageKey, value]);

  const clearDraft = useCallback(() => {
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
    }
    setHasRestored(false);
    setValue(typeof initialValue === 'function' ? initialValue() : initialValue);
  }, [storageKey, initialValue]);

  return [value, setValue, clearDraft, hasRestored];
}

/**
 * Returns today's YYYY-MM-DD in Asia/Manila timezone.
 */
export function manilaTodayYmd() {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const d = parts.find(p => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    /* fallback */
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Formats a YYYY-MM-DD or ISO date in the Philippines timezone (Asia/Manila).
 */
export function fmtManilaDate(ymd, opts = { month: 'short', day: 'numeric' }) {
  if (!ymd) return '—';
  const raw = String(ymd).slice(0, 10);
  const d = new Date(`${raw}T00:00:00+08:00`);
  if (Number.isNaN(d.getTime())) return String(ymd);
  return d.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', ...opts });
}

/**
 * Formats a full timestamp in the Philippines timezone (Asia/Manila).
 */
export function fmtManilaDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Parses a date string (YYYY-MM-DD) and a time label (e.g. "3:30 PM") into Manila start/end UTC timestamps for .ics.
 */
function toIcsUtcStamp(dateYmd, timeStr, addMinutes = 0) {
  const rawDate = String(dateYmd || manilaTodayYmd()).slice(0, 10);
  const match = String(timeStr || '3:30 PM').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  let hours = 15;
  let minutes = 30;
  if (match) {
    hours = Number(match[1]);
    minutes = Number(match[2]);
    const meridiem = (match[3] || '').toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
  }
  const start = new Date(`${rawDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+08:00`);
  const target = new Date(start.getTime() + addMinutes * 60_000);
  return target.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Generates and downloads an .ics calendar event for a tutoring session.
 */
export function downloadSessionIcs(session) {
  if (!session) return;
  const durationHours = Number(session.duration_hours) || 1;
  const dtStart = toIcsUtcStamp(session.date, session.time, 0);
  const dtEnd = toIcsUtcStamp(session.date, session.time, Math.round(durationHours * 60));
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const summary = `LCCB Academix: ${session.subject || 'Tutoring'} (${session.topic || 'Peer Session'})`;
  const partner = session.tutor_name && session.learner_name
    ? `Tutor: ${session.tutor_name} | Learner: ${session.learner_name}`
    : (session.tutor_name || session.learner_name || '');
  const description = [
    `Session Code: ${session.session_code || session.id}`,
    partner,
    `Topic: ${session.topic || 'General review'}`,
    'Check in on LCCB Academix with your partner at the start of the session.',
  ].filter(Boolean).join('\\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//La Consolacion College Bacolod//LCCB Academix//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${session.session_code || session.id}@academix.lccbacolod.edu.ph`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary.replace(/[,;]/g, ' ')}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${(session.location || 'LCCB Campus / Online Classroom').replace(/[,;]/g, ' ')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(session.session_code || 'academix-session').toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
