import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import ApplicationDocumentPicker, { ApplicationFileList } from '../components/ApplicationDocumentPicker';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ExternalLink, FileText, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { downloadApplicationDocument, openApplicationDocument, MAX_APPLICATION_FILES } from '../lib/applicationFiles';
import api from '../api';

const nextFileId = () => (
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
);

/* Separate page for students who just applied as tutor (pending applicants):
 * 1. the qualification exam, 2. their attached files, 3. academic-record
 *    notes. After the exam the student waits for the superadmin's approval
 *    and can jump back home or off to find a tutor. */
export default function TutorApplicant({ showToast, user }) {
  const nav = useNavigate();
  const [app, setApp] = useState(null);
  const [phase, setPhase] = useState('loading'); // loading | exam | waiting | approved | rejected
  const [fileDocs, setFileDocs] = useState(null);
  const [fileBusy, setFileBusy] = useState([]);
  const [examStarted, setExamStarted] = useState(false);
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(1800);
  const [starting, setStarting] = useState(false);
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState(null);

  const loadFiles = async (applicationId) => {
    if (!applicationId) return;
    const { documents } = await api.get(`/accreditation/${applicationId}/documents`);
    setFileDocs(documents);
    setApp(current => (current ? { ...current, document_count: documents.length } : current));
  };

  useEffect(() => {
    let cancelled = false;
    api.get('/accreditation/mine')
      .then(({ application: a }) => {
        if (cancelled) return;
        if (!a) { nav('/exam', { replace: true }); return; }
        setApp(a);
        if (a.status === 'approved') setPhase('approved');
        else if (a.status === 'rejected') setPhase('rejected');
        else if (a.exam_score != null) setPhase('waiting');
        else setPhase('exam');
        loadFiles(a.id).catch(() => { if (!cancelled) setFileDocs([]); });
      })
      .catch((e) => {
        if (cancelled) return;
        showToast(e.message || 'Could not load your application', 'error');
        nav('/dashboard', { replace: true });
      });
    return () => { cancelled = true; };
  }, []);

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
        showToast(e.message || `Could not upload ${file.name}`, 'error');
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
      showToast(e.message || 'Could not remove the file', 'error');
    }
  };

  const openFile = (item) => openApplicationDocument(item.doc).catch(e => showToast(e.message, 'error'));
  const downloadFile = (item) => downloadApplicationDocument(item.doc).catch(e => showToast(e.message, 'error'));

  const startExam = async () => {
    setStarting(true);
    try {
      const res = await api.get('/accreditation/exam');
      setQuestions(res.questions);
      setAnswers({});
      setCurrentQ(0);
      setTimeLeft(1800);
      setExamStarted(true);
    } catch (e) {
      showToast(e.message || 'Could not open the exam', 'error');
    } finally {
      setStarting(false);
    }
  };

  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  const fmtDate = (d) => {
    const dt = d instanceof Date ? d : new Date(d ?? '');
    return Number.isNaN(dt.getTime())
      ? String(d ?? '')
      : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleFinish = async () => {
    if (grading) return;
    setGrading(true);
    try {
      const payload = {};
      (questions ?? []).forEach((q) => { payload[q.question_number] = answers[q.question_number] ?? -1; });
      const res = await api.post('/accreditation/exam', { answers: payload });
      setResult({ score: res.exam_score, passed: res.passed });
      setApp(a => ({ ...a, exam_score: res.exam_score }));
      setPhase('waiting');
      showToast(res.passed
        ? `Exam submitted — ${res.exam_score}%. Awaiting superadmin approval.`
        : `Exam submitted — ${res.exam_score}%. The superadmin will review it.`, res.passed ? 'success' : 'info');
    } catch (e) {
      showToast(e.message || 'Submission failed', 'error');
    } finally {
      setGrading(false);
    }
  };

  useEffect(() => {
    if (phase !== 'exam' || !examStarted) return undefined;
    if (timeLeft <= 0) { handleFinish(); return undefined; }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [phase, examStarted, timeLeft]);

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
  const q = questions?.[currentQ];
  const options = q ? (Array.isArray(q.options) ? q.options : Object.values(q.options ?? {})) : [];
  const score = result?.score ?? app?.exam_score;
  const progress = questions?.length ? ((currentQ + 1) / questions.length) * 100 : 0;

  const status = phase === 'approved'
    ? { label: 'Approved', dot: 'bg-emerald', tone: 'text-ink' }
    : phase === 'rejected'
      ? { label: 'Not approved', dot: 'bg-crimson', tone: 'text-ink' }
      : phase === 'waiting'
        ? { label: 'Awaiting review', dot: 'bg-amber', tone: 'text-ink' }
        : { label: 'Exam open', dot: 'bg-ink/40', tone: 'text-ink' };

  return (
    <div className="mx-auto w-full max-w-[920px]">
      <div className="section-head">
        <div>
          <h1 className="section-title">Tutor application</h1>
          <p className="section-subtitle">
            {user?.name} · {app?.application_code} · Applied {fmtDate(app?.date_applied)}
          </p>
        </div>
        <span className="status-pill"><span className={cn('status-dot', status.dot)} /> {status.label}</span>
      </div>

      <div className="panel mb-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[13px] text-muted-foreground">Subjects applied for</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(app?.subjects ?? []).map(s => (
                <span key={s.code || s} className="inline-flex h-6 items-center border-2 border-ink bg-[#fff7d6] px-2 text-[13px] font-semibold text-ink">
                  {s.code || s}
                </span>
              ))}
              {(app?.subjects ?? []).length === 0 && <span className="text-[14px] text-muted-foreground">No subjects listed.</span>}
            </div>
          </div>
          {score != null && (
            <div className="text-right">
              <p className="text-[13px] font-semibold text-muted-foreground">Qualification exam</p>
              <p className="num mt-1 inline-block border-2 border-ink bg-gold px-2 text-[28px] leading-none text-ink">{score}%</p>
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="border-b-2 border-ink bg-[#f8f1e2] px-5 py-4">
          <h2 className="font-display text-[18px] font-extrabold tracking-[-0.03em]">
            {phase === 'exam' ? 'Qualification exam' : 'Application status'}
          </h2>
          <p className="meta mt-0.5">
            {phase === 'exam'
              ? '15 multiple-choice questions · 30 minutes · one attempt'
              : phase === 'waiting'
                ? 'The exam is in. The superadmin is reading the file.'
                : phase === 'approved'
                  ? 'The application was verified.'
                  : phase === 'rejected'
                    ? 'The application was not approved.'
                    : 'Reading your file…'}
          </p>
        </div>

        {pending && fileCount === 0 && (
          <div className="mx-5 mt-4 border-2 border-ink bg-[#fff0c2] px-4 py-3">
            <p className="text-[13px] font-bold text-ink">Submission incomplete</p>
            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
              Attach at least one supporting file below — the superadmin cannot approve the application without one.
            </p>
          </div>
        )}

        {phase === 'loading' && <div className="empty">Loading your application…</div>}

        {phase === 'exam' && !examStarted && (
          <div className="p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-[62ch]">
                <p className="text-[14px] text-ink">Answer all fifteen questions in one sitting.</p>
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                  Graded the moment you submit. Afterwards you will wait for the superadmin&apos;s approval — you can head home or find a tutor in the meantime.
                </p>
              </div>
              <Button onClick={startExam} disabled={starting} className="shrink-0">
                {starting ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : null}
                {starting ? 'Opening…' : 'Start exam'}
              </Button>
            </div>
          </div>
        )}

        {phase === 'exam' && examStarted && q && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink px-5 py-3">
              <div>
                <p className="num text-[13px] font-semibold text-muted-foreground">Question {currentQ + 1} of {questions.length}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{Object.keys(answers).length} answered</p>
              </div>
              <span className={cn('num border-2 border-ink px-2 py-0.5 text-[16px]', timeLeft < 300 ? 'bg-[#f4d6d0] text-crimson' : 'bg-paper text-ink')}>
                {formatTime(timeLeft)}
              </span>
            </div>
            <div className="h-2.5 w-full border-2 border-ink bg-paper">
              <motion.div
                className="h-full bg-gold"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.25 }}
              />
            </div>

            <div className="p-5 sm:p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQ}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.16 }}
                >
                  <h3 className="max-w-[64ch] font-display text-[21px] font-extrabold leading-snug tracking-[-0.03em]">
                    {q.question}
                  </h3>
                  <div className="mt-5 space-y-2">
                    {options.map((opt, i) => {
                      const selected = answers[q.question_number] === i;
                      return (
                        <label
                          key={i}
                          className={cn(
                            'flex cursor-pointer items-start gap-3 border-2 border-ink p-3.5 transition-[background-color,box-shadow]',
                            selected ? 'bg-gold shadow-[3px_3px_0_#0f2942]' : 'bg-paper hover:bg-[#fff7d6]',
                          )}
                        >
                          <input
                            type="radio"
                            name={`q-${q.question_number}`}
                            className="sr-only"
                            checked={selected}
                            onChange={() => setAnswers(prev => ({ ...prev, [q.question_number]: i }))}
                          />
                          <span className={cn(
                            'mt-0.5 grid h-5 w-5 shrink-0 place-items-center border-2 border-ink',
                            selected ? 'bg-ink text-paper' : 'bg-paper',
                          )}>
                            {selected && <Check className="h-3 w-3" strokeWidth={2.2} />}
                          </span>
                          <span className="text-[14px] leading-snug text-ink">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink px-5 py-3.5">
              <Button
                variant="ghost"
                onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                disabled={currentQ === 0 || grading}
              >
                Previous
              </Button>
              {currentQ < questions.length - 1 ? (
                <Button onClick={() => setCurrentQ(Math.min(questions.length - 1, currentQ + 1))}>
                  Next question
                </Button>
              ) : (
                <Button onClick={handleFinish} disabled={grading}>
                  {grading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : null}
                  {grading ? 'Submitting…' : 'Submit exam'}
                </Button>
              )}
            </div>
          </>
        )}

        {phase === 'waiting' && (
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 border-2 border-ink bg-amber" />
              <div>
                <h3 className="font-display text-[20px] font-extrabold tracking-[-0.03em]">Awaiting superadmin approval</h3>
                <p className="mt-1 max-w-[58ch] text-[14px] leading-snug text-muted-foreground">
                  Your exam scored {score ?? '—'}%. The superadmin is reviewing your score and supporting documents — you will receive a notification with the decision.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => nav('/dashboard')}>Back to overview</Button>
              <Button onClick={() => nav('/wizard')}>Find a tutor</Button>
            </div>
          </div>
        )}

        {phase === 'approved' && (
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 border-2 border-ink bg-emerald" />
              <div>
                <h3 className="font-display text-[20px] font-extrabold tracking-[-0.03em]">Approved — you are a verified tutor.</h3>
                <p className="mt-1 max-w-[58ch] text-[14px] leading-snug text-muted-foreground">
                  The superadmin verified your application. Your subjects are bookable and you can be matched as a tutor.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => nav('/dashboard')}>Back to overview</Button>
              <Button onClick={() => nav('/wizard')}>Find a tutor</Button>
            </div>
          </div>
        )}

        {phase === 'rejected' && (
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 border-2 border-ink bg-crimson" />
              <div>
                <h3 className="font-display text-[20px] font-extrabold tracking-[-0.03em]">Application not approved</h3>
                <p className="mt-1 max-w-[58ch] text-[14px] leading-snug text-muted-foreground">
                  Check your notifications for the superadmin&apos;s note. You can keep using peer tutoring as a learner.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => nav('/dashboard')}>Back to overview</Button>
              <Button onClick={() => nav('/wizard')}>Find a tutor</Button>
            </div>
          </div>
        )}
      </div>

      <div className="panel mt-4">
        <div className="border-b-2 border-ink bg-[#f8f1e2] px-5 py-4">
          <h2 className="font-display text-[18px] font-extrabold tracking-[-0.03em]">Supporting documents</h2>
          <p className="meta mt-0.5">Files and academic-record notes the reviewer sees.</p>
        </div>

        <div className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[13px] font-bold uppercase tracking-[0.08em]">Attached files</h3>
            <span className={cn(
              'border-2 border-ink px-2 py-0.5 text-[11px] font-bold',
              fileCount === 0 ? 'bg-[#f6d7d2] text-crimson' : 'bg-gold text-ink',
            )}>
              {fileCount} / {MAX_APPLICATION_FILES}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">
            PDF, DOC/DOCX, PNG, JPG or WEBP · 4 MB each.
            {pending
              ? ' You can add or withdraw files while the application is pending.'
              : ' The file set is locked because the application is decided.'}
          </p>

          {fileDocs === null ? (
            <p className="mt-3 text-[13px] text-muted-foreground">Reading attached files…</p>
          ) : pending ? (
            <ApplicationDocumentPicker
              className="mt-3"
              items={allFileItems}
              onAdd={addFiles}
              onRemove={removeFile}
              onError={(message) => showToast(message, 'error')}
            />
          ) : (
            <div className="mt-3">
              <ApplicationFileList
                items={attachedItems}
                onOpen={openFile}
                onDownload={downloadFile}
                empty={<p className="border-2 border-dashed border-ink/40 px-4 py-3 text-[13px] text-muted-foreground">No files were attached to this application.</p>}
              />
            </div>
          )}

          <div className="mt-6 border-t-2 border-ink pt-4">
            <h3 className="text-[13px] font-bold uppercase tracking-[0.08em]">Academic record notes</h3>
            <p className="mt-1 text-[13px] text-muted-foreground">Text notes and links submitted with the application.</p>
            {docs.length === 0 ? (
              <p className="mt-3 text-[13px] text-muted-foreground">No academic-record notes were submitted.</p>
            ) : (
              <ul className="mt-1">
                {docs.map((d, i) => {
                  const entry = typeof d === 'string' ? { title: d } : d;
                  return (
                    <li key={`${entry.title}-${i}`} className="flex items-start gap-3 border-b border-ink/15 py-3.5 last:border-0">
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
