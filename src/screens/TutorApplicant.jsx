import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import ApplicationDocumentPicker, { ApplicationFileList } from '../components/ApplicationDocumentPicker';
import LoadState from '../components/ui/LoadState';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, ExternalLink, FileText, Check, ClipboardList, Clock,
  CheckCircle2, XCircle, AlertTriangle, ArrowDown, Cloud, CloudOff,
  ListChecks, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { downloadApplicationDocument, openApplicationDocument, MAX_APPLICATION_FILES } from '../lib/applicationFiles';
import { useDraftState, friendlyError } from '../lib/ux';
import api from '../api';

const nextFileId = () => (
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
);

function StepBadge({ done, tone = 'neutral', label }) {
  const styles = done
    ? 'bg-surface-highlight text-emerald border-ink'
    : tone === 'warn'
      ? 'bg-surface-alert text-crimson border-ink'
      : tone === 'active'
        ? 'bg-gold text-ink border-ink'
        : 'bg-paper text-muted-foreground border-ink/40';
  return (
    <span className={cn('inline-flex items-center gap-1 border-2 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em]', styles)}>
      {done && <Check className="h-3 w-3" strokeWidth={2.6} aria-hidden="true" />}
      {label}
    </span>
  );
}

/* Pending tutor applicant workspace organized as a 3-step checklist:
 * 1) Attach supporting file, 2) Take the qualification exam (resumable + server-autosaved),
 * 3) Wait for approval. */
export default function TutorApplicant({ showToast, user }) {
  const nav = useNavigate();
  const filesSectionRef = useRef(null);
  const [app, setApp] = useState(null);
  const [phase, setPhase] = useState('loading'); // loading | error | exam | waiting | approved | rejected
  const [loadError, setLoadError] = useState(null);
  const [fileDocs, setFileDocs] = useState(null);
  const [fileBusy, setFileBusy] = useState([]);

  // Exam state
  const [examStarted, setExamStarted] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [questions, setQuestions] = useState(null);
  const draftKey = app?.id ? `tutor-exam-${app.id}` : 'tutor-exam-draft';
  const [answers, setAnswers, clearAnswers] = useDraftState(`${draftKey}-answers`, {});
  const [currentQ, setCurrentQ, clearCurrentQ] = useDraftState(`${draftKey}-currentq`, 0);
  const [timeLeft, setTimeLeft] = useState(1800);
  const [starting, setStarting] = useState(false);
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState(null);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | offline

  // Authoritative server clock & autosave queue refs
  const expiresAtMsRef = useRef(null);
  const clockSkewMsRef = useRef(0);
  const submittingRef = useRef(false);
  const savingRef = useRef(false);
  const pendingDraftRef = useRef(null);
  const answersRef = useRef(answers);
  const questionsRef = useRef(questions);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  const computeRemainingSeconds = useCallback(() => {
    if (!expiresAtMsRef.current) return 1800;
    const serverNowEstimate = Date.now() + clockSkewMsRef.current;
    return Math.max(0, Math.ceil((expiresAtMsRef.current - serverNowEstimate) / 1000));
  }, []);

  const loadFiles = async (applicationId) => {
    if (!applicationId) return;
    const { documents } = await api.get(`/accreditation/${applicationId}/documents`);
    setFileDocs(documents);
    setApp(current => (current ? { ...current, document_count: documents.length } : current));
  };

  // Coalescing autosave to PUT /accreditation/exam/answers
  const flushDraft = useCallback(async (snapshot) => {
    const payload = {};
    for (const [k, v] of Object.entries(snapshot || {})) {
      if (Number.isInteger(v) && v >= 0) payload[String(k)] = v;
    }
    if (Object.keys(payload).length === 0) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      pendingDraftRef.current = payload;
      setSaveState('offline');
      return;
    }

    if (savingRef.current) {
      pendingDraftRef.current = payload;
      return;
    }

    savingRef.current = true;
    setSaveState('saving');
    try {
      await api.put('/accreditation/exam/answers', { answers: payload });
      setSaveState('saved');
    } catch (e) {
      if (e?.status === 409) {
        // Exam closed or already submitted on another tab
        pendingDraftRef.current = null;
      } else {
        pendingDraftRef.current = payload;
        setSaveState('offline');
      }
    } finally {
      savingRef.current = false;
      if (pendingDraftRef.current && (typeof navigator === 'undefined' || navigator.onLine)) {
        const next = pendingDraftRef.current;
        pendingDraftRef.current = null;
        flushDraft(next);
      }
    }
  }, []);

  const openOrResumeExam = useCallback(async ({ silent = false } = {}) => {
    setStarting(true);
    try {
      const res = await api.get('/accreditation/exam');
      const serverNowMs = res.serverNow ? Date.parse(res.serverNow) : Date.now();
      clockSkewMsRef.current = Number.isFinite(serverNowMs) ? (serverNowMs - Date.now()) : 0;
      expiresAtMsRef.current = res.expiresAt ? Date.parse(res.expiresAt) : (Date.now() + 1800_000);

      setQuestions(res.questions || []);
      // Merge server draft with any local unsynced picks (server is base, local fills gaps)
      const serverDraft = res.draft && typeof res.draft === 'object' ? res.draft : {};
      setAnswers((local) => {
        const merged = { ...local, ...serverDraft };
        // If local had answers not yet on server (e.g. picked while offline), sync them up
        const localOnly = Object.keys(local || {}).some((k) => serverDraft[k] == null && Number.isInteger(local[k]) && local[k] >= 0);
        if (localOnly) {
          setTimeout(() => flushDraft({ ...serverDraft, ...local }), 50);
          return { ...serverDraft, ...local };
        }
        return merged;
      });
      setSaveState(Object.keys(serverDraft).length > 0 ? 'saved' : 'idle');
      setTimeLeft(computeRemainingSeconds());
      setReviewing(false);
      setExamStarted(true);
    } catch (e) {
      if (e?.status === 409) {
        // Already submitted or expired & lazily graded — reload application state
        const { application: fresh } = await api.get('/accreditation/mine').catch(() => ({ application: null }));
        if (fresh) {
          setApp(fresh);
          setExamStarted(false);
          if (fresh.status === 'approved') setPhase('approved');
          else if (fresh.status === 'rejected') setPhase('rejected');
          else if (fresh.exam_score != null) setPhase('waiting');
          if (!silent) showToast('Your exam attempt has already been submitted and graded.', 'info');
          return;
        }
      }
      if (!silent) {
        showToast(friendlyError(e, 'Could not open the exam. Try again.'), 'error');
      }
    } finally {
      setStarting(false);
    }
  }, [computeRemainingSeconds, flushDraft, setAnswers, showToast]);

  const loadApplication = useCallback(() => {
    setLoadError(null);
    setPhase('loading');
    return api.get('/accreditation/mine')
      .then(({ application: a }) => {
        if (!a) { nav('/exam', { replace: true }); return; }
        setApp(a);
        if (a.status === 'approved') setPhase('approved');
        else if (a.status === 'rejected') setPhase('rejected');
        else if (a.exam_score != null) setPhase('waiting');
        else {
          setPhase('exam');
          // Auto-resume active exam attempt after refresh or tab kill
          if (a.exam_started_at) {
            openOrResumeExam({ silent: true });
          }
        }
        loadFiles(a.id).catch(() => setFileDocs([]));
      })
      .catch((e) => {
        setLoadError(friendlyError(e, "We couldn't load your tutor application. Try again.", { forceGeneric: true }));
        setPhase('error');
      });
  }, [nav, openOrResumeExam]);

  useEffect(() => {
    loadApplication();
  }, []);

  // Poll approval status while waiting
  useEffect(() => {
    if (phase !== 'waiting') return undefined;
    const timer = setInterval(() => {
      api.get('/accreditation/mine').then(({ application: a }) => {
        if (a) setApp(a);
        if (a?.status === 'approved') setPhase('approved');
        if (a?.status === 'rejected') setPhase('rejected');
      }).catch(() => {});
    }, 20000);
    return () => clearInterval(timer);
  }, [phase]);

  // Flush offline draft automatically on reconnect
  useEffect(() => {
    if (phase !== 'exam' || !examStarted) return undefined;
    const onOnline = () => {
      if (pendingDraftRef.current) {
        const draft = pendingDraftRef.current;
        pendingDraftRef.current = null;
        flushDraft(draft);
      } else if (Object.keys(answersRef.current || {}).length > 0) {
        flushDraft(answersRef.current);
      }
    };
    const onOffline = () => setSaveState('offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [phase, examStarted, flushDraft]);

  // Warn before closing or reloading tab while exam is active
  useEffect(() => {
    if (phase !== 'exam' || !examStarted) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [phase, examStarted]);

  const handleFinish = useCallback(async ({ auto = false } = {}) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setGrading(true);
    try {
      const payload = {};
      (questionsRef.current ?? []).forEach((item) => {
        const val = answersRef.current?.[item.question_number] ?? answersRef.current?.[String(item.question_number)];
        payload[item.question_number] = val != null ? val : -1;
      });
      const res = await api.post('/accreditation/exam', { answers: payload });
      clearAnswers();
      clearCurrentQ();
      setResult({ score: res.exam_score, passed: res.passed });
      setApp(a => ({ ...a, exam_score: res.exam_score }));
      setExamStarted(false);
      setReviewing(false);
      setPhase('waiting');
      showToast(
        auto
          ? `Time is up — your saved answers were submitted (${res.exam_score}%).`
          : res.passed
            ? `Exam submitted — ${res.exam_score}%. Sent to the program administrator for review.`
            : `Exam submitted — ${res.exam_score}%. The program administrator will review your application.`,
        res.passed ? 'success' : 'info',
      );
    } catch (e) {
      if (e?.status === 409) {
        // Already submitted or expired & lazily graded — treat cleanly and reload state
        clearAnswers();
        clearCurrentQ();
        setExamStarted(false);
        setReviewing(false);
        await loadApplication();
        showToast('Your exam has been recorded and graded.', 'info');
      } else {
        showToast(friendlyError(e, 'Could not submit your exam. Try again.'), 'error');
      }
    } finally {
      submittingRef.current = false;
      setGrading(false);
    }
  }, [clearAnswers, clearCurrentQ, loadApplication, showToast]);

  // Server-authoritative timer: recomputes from expiresAt + skew every second and on tab return
  useEffect(() => {
    if (phase !== 'exam' || !examStarted) return undefined;
    const tick = () => {
      const rem = computeRemainingSeconds();
      setTimeLeft(rem);
      if (rem <= 0 && !submittingRef.current) {
        handleFinish({ auto: true });
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [phase, examStarted, computeRemainingSeconds, handleFinish]);

  const pickAnswer = (questionNumber, optionIndex) => {
    const next = { ...answersRef.current, [questionNumber]: optionIndex };
    setAnswers(next);
    flushDraft(next);
  };

  const addFiles = async (files) => {
    if (!app?.id) return;
    for (const file of files) {
      const key = nextFileId();
      setFileBusy(list => [...list, { id: key, name: file.name, size: file.size, mime: file.type, busy: true }]);
      try {
        const form = new FormData();
        form.append('document', file);
        await api.upload(`/accreditation/${app.id}/documents`, form);
        showToast(`${file.name} attached.`, 'success');
      } catch (e) {
        showToast(friendlyError(e, `Could not upload ${file.name}.`), 'error');
      } finally {
        setFileBusy(list => list.filter(item => item.id !== key));
      }
    }
    try { await loadFiles(app.id); } catch { /* keep the last good list */ }
  };

  const removeFile = async (id) => {
    try {
      await api.delete(`/accreditation/documents/${id}`);
      const remaining = (fileDocs ?? []).filter(doc => doc.id !== id);
      setFileDocs(remaining);
      setApp(current => (current ? { ...current, document_count: remaining.length } : current));
      showToast('File removed.', 'success');
    } catch (e) {
      showToast(friendlyError(e, 'Could not remove the file.'), 'error');
    }
  };

  const openFile = (item) => openApplicationDocument(item.doc).catch(e => showToast(friendlyError(e, 'Could not open file.'), 'error'));
  const downloadFile = (item) => downloadApplicationDocument(item.doc).catch(e => showToast(friendlyError(e, 'Could not download file.'), 'error'));

  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  const fmtDate = (d) => {
    const dt = d instanceof Date ? d : new Date(d ?? '');
    return Number.isNaN(dt.getTime())
      ? String(d ?? '')
      : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const scrollToFiles = () => {
    filesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    filesSectionRef.current?.focus?.({ preventScroll: true });
  };

  const docs = Array.isArray(app?.achievements) ? app.achievements : [];
  const attachedItems = (fileDocs ?? []).map(doc => ({
    id: doc.id,
    name: doc.file_name,
    size: doc.size_bytes,
    mime: doc.mime_type,
    doc,
  }));
  const allFileItems = [...attachedItems, ...fileBusy];
  const fileCount = fileDocs?.length ?? app?.document_count ?? 0;
  const pending = phase === 'exam' || phase === 'waiting';
  const safeQIndex = questions?.length ? Math.max(0, Math.min(questions.length - 1, currentQ)) : 0;
  const q = questions?.[safeQIndex];
  const options = q ? (Array.isArray(q.options) ? q.options : Object.values(q.options ?? {})) : [];
  const score = result?.score ?? app?.exam_score;

  const isAnswered = (qNum) => {
    const v = answers?.[qNum] ?? answers?.[String(qNum)];
    return Number.isInteger(v) && v >= 0;
  };
  const answeredCount = (questions ?? []).filter((item) => isAnswered(item.question_number)).length;
  const unansweredQuestions = (questions ?? [])
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => !isAnswered(item.question_number));

  const statusMeta = phase === 'approved'
    ? { label: 'Approved', Icon: CheckCircle2, pill: 'bg-surface-highlight text-emerald' }
    : phase === 'rejected'
      ? { label: 'Not approved', Icon: XCircle, pill: 'bg-surface-alert text-crimson' }
      : phase === 'waiting'
        ? { label: 'Awaiting review', Icon: Clock, pill: 'bg-surface-banner text-ink' }
        : { label: 'Exam open', Icon: ClipboardList, pill: 'bg-gold text-ink' };

  if (phase === 'loading' || phase === 'error') {
    return (
      <div className="mx-auto w-full max-w-[920px]">
        <div className="section-head">
          <h1 className="section-title">Tutor application</h1>
        </div>
        <LoadState
          loading={phase === 'loading'}
          error={loadError}
          errorText={loadError || "We couldn't load your tutor application. Try again."}
          onRetry={loadApplication}
          skeleton={(
            <div className="space-y-4">
              <div className="panel panel-pad space-y-3">
                <div className="skeleton h-4 w-40" />
                <div className="skeleton h-6 w-2/3" />
              </div>
              <div className="panel panel-pad space-y-3">
                <div className="skeleton h-5 w-48" />
                <div className="skeleton h-20 w-full" />
              </div>
            </div>
          )}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[920px] space-y-4">
      {!examStarted && (
        <>
          <div className="section-head mb-0">
            <div>
              <h1 className="section-title">Tutor application</h1>
            </div>
            <span className={cn('status-pill h-7 gap-1.5 px-2.5 text-[12px] font-bold', statusMeta.pill)}>
              <statusMeta.Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} aria-hidden="true" />
              {statusMeta.label}
            </span>
          </div>

          {/* Summary card: stacked label/value pairs + subjects + score */}
          <div className="panel panel-pad">
            <dl className="grid grid-cols-1 gap-2.5 border-b border-line pb-3.5 sm:grid-cols-3">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">Applicant</dt>
                <dd className="mt-0.5 text-[14px] font-bold text-ink">{user?.name || app?.name || '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">Application ID</dt>
                <dd className="num mt-0.5 text-[14px] text-ink">{app?.application_code || '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">Applied</dt>
                <dd className="mt-0.5 text-[14px] font-semibold text-ink">{fmtDate(app?.date_applied)}</dd>
              </div>
            </dl>

            <div className="mt-3.5 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-muted-foreground">Subjects applied for</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(app?.subjects ?? []).map(s => (
                    <span key={s.code || s} className="inline-flex h-6 items-center border-2 border-ink bg-surface-highlight px-2 text-[12px] font-bold text-ink">
                      {s.code || s}
                    </span>
                  ))}
                  {(app?.subjects ?? []).length === 0 && <span className="text-[14px] text-muted-foreground">No subjects listed.</span>}
                </div>
              </div>
              {score != null && (
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-muted-foreground">Exam score</p>
                  <p className="num mt-1 inline-block border-2 border-ink bg-gold px-2.5 py-0.5 text-[24px] leading-none text-ink">{score}%</p>
                </div>
              )}
            </div>
          </div>

          {/* Actionable callout linking straight to Step 1 when a supporting file is missing */}
          {pending && fileCount === 0 && (
            <div role="alert" className="callout callout-banner flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" strokeWidth={2.2} aria-hidden="true" />
                <div>
                  <p className="text-[13px] font-bold text-ink">Step 1 is missing a supporting file</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                    Attach at least one file in Step 1 so the Academix program administrator can approve your application.
                  </p>
                </div>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={scrollToFiles} className="bg-paper">
                Go to Step 1 <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Active exam view: sticky timer + question map + autosave + review screen */}
      {phase === 'exam' && examStarted && questions?.length > 0 ? (
        <div className="space-y-4">
          {/* Sticky timer and progress bar stacked cleanly under the app header */}
          <div className="sticky top-[var(--app-header-h)] z-20 -mx-[var(--page-pad)] border-y-2 border-ink bg-surface-sidebar px-[var(--page-pad)] py-2.5 lg:static lg:mx-0 lg:border-2 lg:bg-card lg:px-5 lg:py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="num text-[14px] font-extrabold text-ink">
                  {reviewing ? 'Review' : `Q ${safeQIndex + 1} / ${questions.length}`}
                </span>
                <span className="text-[12px] font-semibold text-muted-foreground">
                  {answeredCount}/{questions.length} answered
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  role="status"
                  aria-live="polite"
                  className={cn(
                    'inline-flex items-center gap-1 text-[11px] font-bold',
                    saveState === 'offline' ? 'text-amber' : 'text-muted-foreground',
                  )}
                >
                  {saveState === 'saving' && <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>}
                  {saveState === 'saved' && <><Cloud className="h-3 w-3 text-emerald" /> Saved</>}
                  {saveState === 'offline' && <><CloudOff className="h-3 w-3 text-amber" /> Saved on device</>}
                </span>
                <span
                  aria-label={`Time remaining ${formatTime(timeLeft)}`}
                  className={cn(
                    'num border-2 border-ink px-2 py-0.5 text-[15px]',
                    timeLeft < 300 ? 'bg-surface-alert text-crimson' : 'bg-paper text-ink',
                  )}
                >
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            {/* Interactive 15-segment question map */}
            <div
              role="navigation"
              aria-label="Exam question map"
              className="mt-2 grid gap-1"
              style={{ gridTemplateColumns: `repeat(${questions.length}, minmax(0, 1fr))` }}
            >
              {questions.map((item, idx) => {
                const answered = isAnswered(item.question_number);
                const current = !reviewing && idx === safeQIndex;
                return (
                  <button
                    key={item.question_number}
                    type="button"
                    onClick={() => { setReviewing(false); setCurrentQ(idx); }}
                    aria-label={`Question ${idx + 1}${answered ? ', answered' : ', unanswered'}`}
                    aria-current={current ? 'step' : undefined}
                    className={cn(
                      'h-3 border border-ink transition-colors',
                      current ? 'bg-gold' : answered ? 'bg-ink' : 'bg-paper',
                    )}
                  />
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Timer keeps running if you leave. Tap any segment to jump.
            </p>
          </div>

          {reviewing ? (
            <div className="panel panel-pad sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b-2 border-ink pb-3">
                <div>
                  <h2 className="font-display text-[clamp(20px,5vw+4px,24px)] font-extrabold leading-tight tracking-[-0.02em]">
                    Review before submitting
                  </h2>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {answeredCount} of {questions.length} answered. Tap any question to review or change your answer.
                  </p>
                </div>
                <span className={cn(
                  'border-2 border-ink px-2.5 py-1 text-[12px] font-bold',
                  unansweredQuestions.length === 0 ? 'bg-surface-highlight text-emerald' : 'bg-surface-banner text-ink',
                )}>
                  {unansweredQuestions.length === 0
                    ? 'All answered'
                    : `${unansweredQuestions.length} unanswered`}
                </span>
              </div>

              {unansweredQuestions.length > 0 && (
                <div className="callout callout-banner mt-4 text-[13px] text-ink">
                  <p className="font-bold">Unanswered questions count as wrong.</p>
                  <p className="mt-0.5 text-muted-foreground">
                    Tap any highlighted row below to answer it before submitting.
                  </p>
                </div>
              )}

              <ul className="mt-4 divide-y divide-line border-y border-line">
                {questions.map((item, idx) => {
                  const answered = isAnswered(item.question_number);
                  return (
                    <li key={item.question_number}>
                      <button
                        type="button"
                        onClick={() => { setReviewing(false); setCurrentQ(idx); }}
                        className={cn(
                          'flex min-h-[48px] w-full items-center justify-between gap-3 px-2 py-2.5 text-left transition-colors hover:bg-surface-highlight',
                          !answered && 'bg-surface-banner/60',
                        )}
                      >
                        <span className="min-w-0 flex-1 text-[14px]">
                          <span className="num mr-2 font-bold text-ink">Q{idx + 1}.</span>
                          <span className="line-clamp-1 text-ink/90">{item.question}</span>
                        </span>
                        <span className={cn(
                          'shrink-0 border border-ink px-2 py-0.5 text-[11px] font-bold uppercase',
                          answered ? 'bg-ink text-paper' : 'bg-surface-alert text-crimson',
                        )}>
                          {answered ? 'Answered' : 'Unanswered'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-4 text-[13px] text-muted-foreground">
                One attempt only. Once submitted, your score is graded and sent to the Academix program administrator for review.
              </p>

              <div className="action-bar mt-5">
                <Button
                  type="button"
                  variant="outline"
                  disabled={grading}
                  onClick={() => setReviewing(false)}
                  className="flex-1 bg-paper sm:flex-none"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Back to questions
                </Button>
                <Button
                  type="button"
                  disabled={grading}
                  onClick={() => handleFinish({ auto: false })}
                  className="flex-1 whitespace-normal sm:flex-none"
                >
                  {grading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : null}
                  {grading ? 'Submitting…' : 'Submit exam'}
                </Button>
              </div>
            </div>
          ) : q ? (
            <div className="panel">
              <div className="panel-pad sm:p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={safeQIndex}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.14 }}
                  >
                    <h2
                      id="exam-question-heading"
                      className="max-w-[64ch] font-display text-[clamp(18px,4vw+4px,21px)] font-extrabold leading-snug tracking-[-0.02em]"
                    >
                      {q.question}
                    </h2>
                    <div
                      role="radiogroup"
                      aria-labelledby="exam-question-heading"
                      className="mt-4 space-y-2.5"
                    >
                      {options.map((opt, i) => {
                        const selected = (answers?.[q.question_number] ?? answers?.[String(q.question_number)]) === i;
                        return (
                          <button
                            key={i}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => pickAnswer(q.question_number, i)}
                            className={cn(
                              'flex min-h-[56px] w-full items-start gap-3 border-2 border-ink p-3.5 text-left transition-[background-color,box-shadow]',
                              selected
                                ? 'bg-gold shadow-[var(--nb-shadow-sm)_var(--nb-shadow-sm)_0_var(--color-ink)]'
                                : 'bg-paper hover:bg-surface-highlight',
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                'mt-0.5 grid h-6 w-6 shrink-0 place-items-center border-2 border-ink',
                                selected ? 'bg-ink text-paper' : 'bg-paper',
                              )}
                            >
                              {selected && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                            </span>
                            <span className="text-[16px] leading-snug text-ink">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="action-bar px-4 sm:px-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentQ(Math.max(0, safeQIndex - 1))}
                  disabled={safeQIndex === 0 || grading}
                  className="bg-paper"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Prev
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReviewing(true)}
                  disabled={grading}
                  className="bg-paper"
                >
                  <ListChecks className="h-4 w-4" strokeWidth={2} /> Review
                </Button>

                {safeQIndex < questions.length - 1 ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentQ(Math.min(questions.length - 1, safeQIndex + 1))}
                    className="flex-1 sm:flex-none"
                  >
                    Next <ArrowRight className="h-4 w-4" strokeWidth={2} />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setReviewing(true)}
                    disabled={grading}
                    className="flex-1 whitespace-normal sm:flex-none"
                  >
                    Review &amp; submit
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <ol className="space-y-4">
          {/* STEP 1: Supporting file */}
          <li id="step-files" ref={filesSectionRef} tabIndex={-1} className="panel focus:outline-none">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink bg-surface-quiet px-[var(--card-pad)] py-3.5">
              <div className="flex items-center gap-2.5">
                <span className={cn(
                  'num grid h-7 w-7 shrink-0 place-items-center border-2 border-ink text-[13px] font-extrabold',
                  fileCount > 0 ? 'bg-ink text-paper' : 'bg-gold text-ink',
                )}>
                  {fileCount > 0 ? <Check className="h-4 w-4" strokeWidth={2.6} /> : '1'}
                </span>
                <div>
                  <h2 className="font-display text-[17px] font-extrabold tracking-[-0.02em]">
                    Attach a supporting file
                  </h2>
                  <p className="text-[12px] text-muted-foreground">
                    Grade slip, honors certificate, or registration form ({fileCount} / {MAX_APPLICATION_FILES}).
                  </p>
                </div>
              </div>
              <StepBadge
                done={fileCount > 0}
                tone={fileCount === 0 && pending ? 'warn' : 'neutral'}
                label={fileCount > 0 ? `Done · ${fileCount} file${fileCount === 1 ? '' : 's'}` : 'Not done'}
              />
            </div>

            <div className="panel-pad">
              <p className="text-[13px] text-muted-foreground">
                PDF, DOC/DOCX, PNG, JPG, or WEBP · 4 MB each.
                {pending
                  ? ' You can add or remove files while your application is pending.'
                  : ' Files are locked because your application has been decided.'}
              </p>

              {fileDocs === null ? (
                <div className="mt-3 space-y-2">
                  <div className="skeleton h-14 w-full" />
                </div>
              ) : pending ? (
                <ApplicationDocumentPicker
                  className="mt-3"
                  items={allFileItems}
                  onAdd={addFiles}
                  onRemove={removeFile}
                  onOpen={openFile}
                  onDownload={downloadFile}
                  onError={(message) => showToast(message, 'error')}
                />
              ) : (
                <div className="mt-3">
                  <ApplicationFileList
                    items={attachedItems}
                    onOpen={openFile}
                    onDownload={downloadFile}
                    empty={<p className="callout text-[13px] text-muted-foreground">No files were attached to this application.</p>}
                  />
                </div>
              )}

              {docs.length > 0 && (
                <div className="mt-5 border-t border-line pt-4">
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-muted-foreground">Academic record notes</h3>
                  <ul className="mt-1 divide-y divide-line">
                    {docs.map((d, i) => {
                      const entry = typeof d === 'string' ? { title: d } : d;
                      return (
                        <li key={`${entry.title}-${i}`} className="flex items-start gap-2.5 py-3">
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink" strokeWidth={2} />
                          <div className="min-w-0">
                            <p className="text-[14px] font-bold leading-snug text-ink">{entry.title}</p>
                            {entry.detail && <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{entry.detail}</p>}
                            {entry.link && (
                              <a
                                href={entry.link}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-ink underline decoration-gold decoration-2 underline-offset-4 hover:decoration-ink"
                              >
                                Open link <ExternalLink className="h-3 w-3" strokeWidth={1.6} />
                              </a>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </li>

          {/* STEP 2: Qualification exam */}
          <li id="step-exam" className="panel">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink bg-surface-quiet px-[var(--card-pad)] py-3.5">
              <div className="flex items-center gap-2.5">
                <span className={cn(
                  'num grid h-7 w-7 shrink-0 place-items-center border-2 border-ink text-[13px] font-extrabold',
                  score != null ? 'bg-ink text-paper' : 'bg-gold text-ink',
                )}>
                  {score != null ? <Check className="h-4 w-4" strokeWidth={2.6} /> : '2'}
                </span>
                <div>
                  <h2 className="font-display text-[17px] font-extrabold tracking-[-0.02em]">
                    Take the qualification exam
                  </h2>
                  <p className="text-[12px] text-muted-foreground">
                    15 questions · 30 minutes · one attempt
                  </p>
                </div>
              </div>
              <StepBadge
                done={score != null}
                tone={phase === 'exam' ? 'active' : 'neutral'}
                label={score != null ? `Done · ${score}%` : app?.exam_started_at ? 'In progress' : 'Ready'}
              />
            </div>

            <div className="panel-pad">
              {phase === 'exam' ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-[58ch] text-[14px] text-ink">
                    15 questions · 30 min · one attempt. Answers save automatically; the timer keeps running if you leave.
                  </p>
                  <Button onClick={() => openOrResumeExam()} disabled={starting} className="w-full shrink-0 sm:w-auto">
                    {starting ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : null}
                    {starting ? 'Opening…' : app?.exam_started_at ? 'Resume exam' : 'Start exam'}
                  </Button>
                </div>
              ) : (
                <p className="text-[14px] text-muted-foreground">
                  Submitted and graded ({score ?? '—'}%).
                </p>
              )}
            </div>
          </li>

          {/* STEP 3: Approval */}
          <li id="step-approval" className="panel">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink bg-surface-quiet px-[var(--card-pad)] py-3.5">
              <div className="flex items-center gap-2.5">
                <span className={cn(
                  'num grid h-7 w-7 shrink-0 place-items-center border-2 border-ink text-[13px] font-extrabold',
                  phase === 'approved' ? 'bg-ink text-paper' : phase === 'waiting' ? 'bg-gold text-ink' : 'bg-paper text-muted-foreground',
                )}>
                  {phase === 'approved' ? <Check className="h-4 w-4" strokeWidth={2.6} /> : '3'}
                </span>
                <div>
                  <h2 className="font-display text-[17px] font-extrabold tracking-[-0.02em]">
                    Wait for approval
                  </h2>
                  <p className="text-[12px] text-muted-foreground">
                    Reviewed by the Academix program administrator
                  </p>
                </div>
              </div>
              <StepBadge
                done={phase === 'approved'}
                tone={phase === 'rejected' ? 'warn' : phase === 'waiting' ? 'active' : 'neutral'}
                label={
                  phase === 'approved' ? 'Approved'
                    : phase === 'rejected' ? 'Not approved'
                      : phase === 'waiting' ? 'In review'
                        : 'Waiting'
                }
              />
            </div>

            <div className="panel-pad">
              {phase === 'exam' && (
                <p className="text-[14px] text-muted-foreground">
                  The Academix program administrator reviews your exam score and files, then approves or declines your application. You&apos;ll get a notification.
                </p>
              )}

              {phase === 'waiting' && (
                <div>
                  <p className="max-w-[58ch] text-[14px] leading-snug text-ink">
                    The Academix program administrator is reviewing your exam score ({score ?? '—'}%) and supporting files. You&apos;ll get a notification once a decision is made.
                  </p>
                  <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                    <Button variant="outline" className="w-full sm:w-auto" onClick={() => nav('/dashboard')}>Back to overview</Button>
                    <Button className="w-full sm:w-auto" onClick={() => nav('/wizard')}>Find a tutor</Button>
                  </div>
                </div>
              )}

              {phase === 'approved' && (
                <div>
                  <p className="max-w-[58ch] text-[14px] leading-snug text-ink">
                    Approved — you are now a verified tutor. Your subjects are bookable and students can match with you.
                  </p>
                  <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                    <Button variant="outline" className="w-full sm:w-auto" onClick={() => nav('/dashboard')}>Back to overview</Button>
                    <Button className="w-full sm:w-auto" onClick={() => nav('/wizard')}>Find a tutor</Button>
                  </div>
                </div>
              )}

              {phase === 'rejected' && (
                <div>
                  <p className="max-w-[58ch] text-[14px] leading-snug text-ink">
                    Your application was not approved. Check your notifications for the program administrator&apos;s note — you can keep using peer tutoring as a student.
                  </p>
                  <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                    <Button variant="outline" className="w-full sm:w-auto" onClick={() => nav('/dashboard')}>Back to overview</Button>
                    <Button className="w-full sm:w-auto" onClick={() => nav('/wizard')}>Find a tutor</Button>
                  </div>
                </div>
              )}
            </div>
          </li>
        </ol>
      )}
    </div>
  );
}
