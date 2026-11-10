import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ApplicationFileList } from '../components/ApplicationDocumentPicker';
import { Loader2, Check, X, ExternalLink, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadApplicationDocument, openApplicationDocument, MAX_APPLICATION_FILES } from '../lib/applicationFiles';
import { cn } from '../lib/utils';
import { trapTabKey } from '../lib/focusTrap';
import Pagination from '../components/ui/Pagination';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ErrorBanner from '../components/ui/ErrorBanner';
import api from '../api';

const fmtDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const initials = (name = '') => name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();
const subjectCode = (subject) => (typeof subject === 'string' ? subject : subject?.code) || '—';

export default function SuperadminApprovals({ showToast }) {
  const navigate = useNavigate();
  const [applications, setApplications] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedDocs, setSelectedDocs] = useState(null);
  const [busy, setBusy] = useState(null);
  const [auditEntries, setAuditEntries] = useState(null);
  const [page, setPage] = useState(1);
  const [appsError, setAppsError] = useState(null);
  const [confirmRejectApp, setConfirmRejectApp] = useState(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  const loadApplications = () => {
    setAppsError(null);
    api.get('/accreditation/applications')
      .then(({ applications: rows }) => setApplications(rows))
      .catch((e) => {
        setApplications([]);
        setAppsError(e.message || 'Failed to load applications');
        showToast(e.message || 'Failed to load applications', 'error');
      });
  };

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    api.get('/audit', { limit: 8 })
      .then(({ entries }) => setAuditEntries(entries ?? []))
      .catch(() => setAuditEntries([]));
  }, []);

  useEffect(() => {
    if (!selectedApp) { setSelectedDocs(null); return undefined; }
    let alive = true;
    setSelectedDocs(null);
    api.get(`/accreditation/${selectedApp.id}/documents`)
      .then(({ documents }) => { if (alive) setSelectedDocs(documents); })
      .catch((e) => {
        if (!alive) return;
        setSelectedDocs([]);
        showToast(e.message || 'Could not read the attached files', 'error');
      });
    return () => { alive = false; };
  }, [selectedApp?.id]);

  // Dialog focus: remember the trigger, move focus inside, trap Tab, restore on close.
  useEffect(() => {
    if (!selectedApp) return undefined;
    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = setTimeout(() => closeButtonRef.current?.focus(), 30);
    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [selectedApp?.id]);

  useEffect(() => {
    if (!selectedApp) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape' && !busy) { setSelectedApp(null); return; }
      trapTabKey(event, dialogRef.current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedApp, busy]);

  const handleApprove = async (app) => {
    setBusy(app.id);
    try {
      await api.post(`/accreditation/${app.id}/approve`);
      setApplications(rows => rows.filter(row => row.id !== app.id));
      setSelectedApp(null);
      showToast(`Approved ${app.name} as a verified tutor.`, 'success');
    } catch (e) {
      showToast(e.message || 'Approval failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  const executeReject = async (app) => {
    setBusy(app.id);
    setConfirmRejectApp(null);
    try {
      await api.post(`/accreditation/${app.id}/reject`, {});
      setApplications(rows => rows.filter(row => row.id !== app.id));
      setSelectedApp(null);
      showToast(`Rejected ${app.name}'s application.`, 'info');
    } catch (e) {
      showToast(e.message || 'Rejection failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleReject = (app) => {
    setConfirmRejectApp(app);
  };

  const openFile = (item) => openApplicationDocument(item.doc).catch(e => showToast(e.message, 'error'));
  const downloadFile = (item) => downloadApplicationDocument(item.doc).catch(e => showToast(e.message, 'error'));

  const selectedGrades = selectedApp?.grades && typeof selectedApp.grades === 'object' ? selectedApp.grades : {};
  const selectedAchievements = Array.isArray(selectedApp?.achievements) ? selectedApp.achievements : [];
  const hasSelectedGrades = Object.keys(selectedGrades).length > 0;

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <div className="section-head">
        <div>
          <h1 className="section-title">Tutor approvals</h1>
          <p className="section-subtitle">Read the exam score, academic record, and attached files before you sign off.</p>
        </div>
        <span className="border-2 border-ink bg-gold px-2 py-1 text-[13px] font-bold text-ink shadow-[2px_2px_0_var(--color-ink)]">{applications?.length ?? '—'} pending</span>
      </div>

      {appsError && (
        <ErrorBanner
          message={`Applications could not be read: ${appsError}`}
          onRetry={loadApplications}
          className="mb-4"
        />
      )}

      {applications === null && !appsError && <div className="panel empty">Reading the applications…</div>}

      {applications !== null && applications.length === 0 && (
        <div className="panel flex flex-col items-start gap-2 border-t-8 border-t-gold px-6 py-10">
          <h2 className="font-display text-[20px] font-extrabold tracking-[-0.03em]">No pending applications.</h2>
          <p className="max-w-[52ch] text-[14px] text-muted-foreground">
            When a student submits an accreditation application it lands here with their exam score and documents.
          </p>
        </div>
      )}

      {applications !== null && applications.length > 0 && (() => {
        const pageSize = 4;
        const total = applications.length;
        const maxPage = Math.max(1, Math.ceil(total / pageSize));
        const currentPage = Math.min(page, maxPage);
        const pagedApplications = applications.slice((currentPage - 1) * pageSize, currentPage * pageSize);

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence initial={false}>
                {pagedApplications.map(app => {
                  const fileCount = app.document_count ?? 0;
                  const noFiles = fileCount === 0;
                  return (
                    <motion.article
                      layout
                      key={app.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.985 }}
                      transition={{ duration: 0.18 }}
                      className="panel flex flex-col p-5 transition-transform hover:-translate-y-1"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${app.custom_id || app.user_id || app.id}`);
                          }}
                          className="grid h-10 w-10 shrink-0 place-items-center border-2 border-ink bg-gold text-[13px] font-bold text-ink shadow-[2px_2px_0_var(--color-ink)] transition-transform hover:scale-105"
                          title={`View ${app.name}'s public profile`}
                        >
                          {initials(app.name)}
                        </button>
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/profile/${app.custom_id || app.user_id || app.id}`);
                            }}
                            className="truncate text-left font-display text-[16px] font-bold leading-tight text-ink underline decoration-gold decoration-2 underline-offset-2 hover:decoration-ink"
                          >
                            {app.name}
                          </button>
                          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{app.program || app.department}</p>
                        </div>
                        <span className="status-pill shrink-0">
                          <span className="status-dot bg-amber" />
                          Pending
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 border-t-2 border-ink pt-4">
                        <div className="border-2 border-ink bg-surface-quiet p-2">
                          <p className="text-[13px] font-semibold text-muted-foreground">Exam score</p>
                          <p className="num mt-1 text-[22px] leading-none text-ink">{app.exam_score == null ? '—' : `${app.exam_score}%`}</p>
                        </div>
                        <div className={cn('border-2 border-ink p-2 text-right', noFiles ? 'bg-surface-alert' : 'bg-surface-quiet')}>
                          <p className="text-[13px] font-semibold text-muted-foreground">Files</p>
                          <div className="mt-1 flex items-baseline justify-end gap-1.5">
                            <p className={cn('num text-[22px] leading-none', noFiles ? 'text-crimson' : 'text-ink')}>{fileCount}</p>
                            {noFiles && <span className="text-[10px] font-bold uppercase tracking-[0.04em] text-crimson">Needs file</span>}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {(app.subjects ?? []).map(subject => (
                          <span key={subjectCode(subject)} className="inline-flex h-6 items-center border-2 border-ink bg-surface-highlight px-2 text-[13px] font-semibold text-ink">
                            {subjectCode(subject)}
                          </span>
                        ))}
                      </div>

                      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                        <p className="text-[13px] text-muted-foreground">Applied {fmtDate(app.date_applied)}</p>
                        <Button size="sm" variant="outline" onClick={() => setSelectedApp(app)}>
                          Review application
                        </Button>
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </div>
            <Pagination
              currentPage={currentPage}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={setPage}
              itemName="applicants"
            />
          </div>
        );
      })()}

      {auditEntries && auditEntries.length > 0 && (
        <section className="mt-8">
          <div className="section-head">
            <div>
              <h2 className="section-title">Recorded decisions</h2>
              <p className="section-subtitle">Append-only trail of approvals, exams, referrals, and redemptions.</p>
            </div>
            <span className="border-2 border-ink bg-paper px-2 py-1 text-[12px] font-bold uppercase tracking-[0.04em] text-muted-foreground">
              Last {auditEntries.length}
            </span>
          </div>
          <div className="panel divide-y-2 divide-ink/10">
            {auditEntries.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5">
                <span className="font-mono text-[12px] font-bold uppercase tracking-[0.03em] text-ink">
                  {String(entry.action || '').replace(/\./g, ' ')}
                </span>
                <span className="text-[13px] font-semibold">{entry.actor_name || entry.actor_role || 'System'}</span>
                {entry.detail?.code && <span className="text-[12px] text-muted-foreground">{entry.detail.code}</span>}
                <span className="ml-auto text-[12px] text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <AnimatePresence>
        {selectedApp && (
          <>
            <motion.button
              type="button"
              aria-label="Close application"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 cursor-default bg-ink/70"
              onClick={() => { if (!busy) setSelectedApp(null); }}
            />
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="application-title"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="fixed left-1/2 top-1/2 z-50 flex max-h-[90svh] w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden border-2 border-ink bg-paper shadow-[10px_10px_0_var(--color-gold)]"
            >
              <div className="flex items-start justify-between gap-4 border-b-2 border-ink bg-surface-quiet px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center border-2 border-ink bg-gold text-[14px] font-bold shadow-[2px_2px_0_var(--color-ink)]">
                    {initials(selectedApp.name)}
                  </span>
                  <div className="min-w-0">
                    <h2 id="application-title" className="font-display text-[22px] font-extrabold tracking-[-0.035em]">{selectedApp.name}</h2>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {selectedApp.program || selectedApp.department} · Applied {fmtDate(selectedApp.date_applied)}
                    </p>
                  </div>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  disabled={Boolean(busy)}
                  className="grid h-9 w-9 place-items-center border-2 border-ink bg-paper text-ink shadow-[2px_2px_0_var(--color-ink)] transition-colors hover:bg-gold disabled:opacity-40"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" strokeWidth={1.6} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: 'Exam score', value: selectedApp.exam_score == null ? '—' : `${selectedApp.exam_score}%` },
                    { label: 'Subjects', value: (selectedApp.subjects ?? []).length },
                    { label: 'Files', value: selectedDocs?.length ?? selectedApp.document_count ?? 0 },
                    { label: 'Notes', value: (selectedApp.achievements ?? []).length },
                  ].map(item => (
                    <div key={item.label} className="border-2 border-ink bg-surface-quiet p-3">
                      <p className="text-[13px] font-semibold text-muted-foreground">{item.label}</p>
                      <p className="num mt-1 text-[18px] leading-none text-ink">{item.value}</p>
                    </div>
                  ))}
                </div>

                <section className="mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-[17px] font-bold text-ink">Supporting files</h3>
                    <span className="border-2 border-ink bg-gold px-2 py-0.5 text-[11px] font-bold">
                      {selectedDocs?.length ?? selectedApp.document_count ?? 0} / {MAX_APPLICATION_FILES}
                    </span>
                  </div>
                  {selectedDocs === null ? (
                    <p className="mt-2 text-[13px] text-muted-foreground">Reading attached files…</p>
                  ) : selectedDocs.length === 0 ? (
                    <p className="mt-2 border-2 border-ink bg-surface-alert px-4 py-3 text-[13px] font-semibold text-crimson">
                      No files attached. Approval is blocked until the applicant uploads at least one supporting file.
                    </p>
                  ) : (
                    <div className="mt-2">
                      <ApplicationFileList
                        items={selectedDocs.map(doc => ({
                          id: doc.id,
                          name: doc.file_name,
                          size: doc.size_bytes,
                          mime: doc.mime_type,
                          doc,
                        }))}
                        onOpen={openFile}
                        onDownload={downloadFile}
                      />
                    </div>
                  )}
                </section>

                {hasSelectedGrades && (
                  <section className="mt-6">
                    <h3 className="font-display text-[17px] font-bold text-ink">Academic record</h3>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {Object.entries(selectedGrades).map(([term, grade]) => (
                        <div key={term} className="border-2 border-ink bg-surface-quiet p-3">
                          <p className="text-[13px] text-muted-foreground">{term.replace('preFinal', 'Pre-Final')}</p>
                          <p className="num mt-1 text-[20px] leading-none text-ink">{grade}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {selectedAchievements.length > 0 && (
                  <section className="mt-6">
                    <h3 className="font-display text-[17px] font-bold text-ink">Academic record notes</h3>
                    <ul className="mt-1">
                      {selectedAchievements.map((achievement, index) => {
                        const entry = typeof achievement === 'string' ? { title: achievement } : achievement;
                        return (
                          <li key={`${entry.title}-${index}`} className="flex items-start gap-2.5 border-b border-ink/15 py-3 last:border-0">
                            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink" strokeWidth={2} />
                            <div className="min-w-0">
                              <p className="text-[14px] font-semibold leading-snug text-ink">{entry.title}</p>
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
                  </section>
                )}

                {!hasSelectedGrades && selectedAchievements.length === 0 && (
                  <section className="mt-6">
                    <h3 className="font-display text-[17px] font-bold text-ink">Academic record</h3>
                    <p className="mt-2 text-[13px] text-muted-foreground">No academic record or notes were submitted.</p>
                  </section>
                )}

                <section className="mt-6">
                  <h3 className="font-display text-[17px] font-bold text-ink">Subjects applied for</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(selectedApp.subjects ?? []).map(subject => (
                      <span key={subjectCode(subject)} className="inline-flex h-6 items-center border-2 border-ink bg-surface-highlight px-2 text-[13px] font-semibold text-ink">
                        {subjectCode(subject)}
                      </span>
                    ))}
                  </div>
                </section>
              </div>

              <div className="flex flex-col gap-3 border-t-2 border-ink bg-surface-quiet px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
                <p className="text-[13px] text-muted-foreground sm:max-w-[42ch]">
                  {selectedDocs === null
                    ? 'Checking the attached files…'
                    : selectedDocs.length === 0
                      ? 'Approval is blocked until at least one supporting file is attached.'
                      : 'Approval verifies the tutor and makes their subjects bookable.'}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                  <Button variant="ghost" onClick={() => setSelectedApp(null)} disabled={Boolean(busy)}>Cancel</Button>
                  <Button
                    variant="destructive"
                    disabled={busy === selectedApp.id}
                    onClick={() => handleReject(selectedApp)}
                  >
                    {busy === selectedApp.id ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : null}
                    Reject
                  </Button>
                  <Button
                    className="col-span-2 sm:col-auto"
                    disabled={busy === selectedApp.id || selectedDocs === null || selectedDocs.length === 0}
                    onClick={() => handleApprove(selectedApp)}
                  >
                    {busy === selectedApp.id ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : <Check className="h-4 w-4" strokeWidth={2} />}
                    Approve tutor
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={Boolean(confirmRejectApp)}
        title="Reject tutor application?"
        description={`Reject ${confirmRejectApp?.name}'s tutor accreditation application?`}
        warning="The student will be notified and this rejection will be logged in the audit trail."
        confirmLabel="Reject application"
        variant="destructive"
        busy={Boolean(busy)}
        onCancel={() => setConfirmRejectApp(null)}
        onConfirm={() => executeReject(confirmRejectApp)}
      />
    </div>
  );
}
