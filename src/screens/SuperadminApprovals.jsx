import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Loader2, Check, X, ExternalLink, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [applications, setApplications] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    api.get('/accreditation/applications')
      .then(({ applications: rows }) => setApplications(rows))
      .catch((e) => { setApplications([]); showToast(e.message || 'Failed to load applications', 'error'); });
  }, []);

  useEffect(() => {
    if (!selectedApp) return undefined;
    const onKey = (event) => { if (event.key === 'Escape' && !busy) setSelectedApp(null); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
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

  const handleReject = async (app) => {
    setBusy(app.id);
    try {
      await api.post(`/accreditation/${app.id}/reject`, {});
      setApplications(rows => rows.filter(row => row.id !== app.id));
      setSelectedApp(null);
      showToast(`Rejected ${app.name}'s application.`, 'error');
    } catch (e) {
      showToast(e.message || 'Rejection failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <div className="section-head">
        <div>
          <h1 className="section-title">Tutor approvals</h1>
          <p className="section-subtitle">Read the exam score, academic record, and supporting documents before you sign off.</p>
        </div>
        <span className="border-2 border-ink bg-gold px-2 py-1 text-[13px] font-bold text-ink shadow-[2px_2px_0_#0f2942]">{applications?.length ?? '—'} pending</span>
      </div>

      {applications === null && <div className="panel empty">Reading the applications…</div>}

      {applications !== null && applications.length === 0 && (
        <div className="panel flex flex-col items-start gap-2 border-t-8 border-t-gold px-6 py-10">
          <h2 className="font-display text-[20px] font-extrabold tracking-[-0.03em]">No pending applications.</h2>
          <p className="max-w-[52ch] text-[14px] text-muted-foreground">
            When a student submits an accreditation application it lands here with their exam score and documents.
          </p>
        </div>
      )}

      {applications !== null && applications.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {applications.map(app => {
              const achievements = Array.isArray(app.achievements) ? app.achievements : [];
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
                    <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-ink bg-gold text-[13px] font-bold text-ink shadow-[2px_2px_0_#0f2942]">
                      {initials(app.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-[16px] font-bold leading-tight text-ink">{app.name}</h2>
                      <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{app.program || app.department}</p>
                    </div>
                    <span className="status-pill shrink-0">
                      <span className="status-dot bg-amber" />
                      Pending
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 border-t-2 border-ink pt-4">
                    <div className="border-2 border-ink bg-[#f8f1e2] p-2">
                      <p className="text-[13px] font-semibold text-muted-foreground">Exam score</p>
                      <p className="num mt-1 text-[22px] leading-none text-ink">{app.exam_score == null ? '—' : `${app.exam_score}%`}</p>
                    </div>
                    <div className="border-2 border-ink bg-[#f8f1e2] p-2 text-right">
                      <p className="text-[13px] font-semibold text-muted-foreground">Documents</p>
                      <p className="num mt-1 text-[22px] leading-none text-ink">{achievements.length}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {(app.subjects ?? []).map(subject => (
                      <span key={subjectCode(subject)} className="inline-flex h-6 items-center border-2 border-ink bg-[#fff7d6] px-2 text-[13px] font-semibold text-ink">
                        {subjectCode(subject)}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                    <p className="text-[13px] text-muted-foreground">Applied {fmtDate(app.date_applied)}</p>
                    <Button size="sm" variant="outline" onClick={() => setSelectedApp(app)}>
                      Review file
                    </Button>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
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
              role="dialog"
              aria-modal="true"
              aria-labelledby="application-title"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="fixed left-1/2 top-1/2 z-50 flex max-h-[90svh] w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden border-2 border-ink bg-paper shadow-[10px_10px_0_#d4ac0d]"
            >
              <div className="flex items-start justify-between gap-4 border-b-2 border-ink bg-[#f8f1e2] px-6 py-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center border-2 border-ink bg-gold text-[14px] font-bold shadow-[2px_2px_0_#0f2942]">
                    {initials(selectedApp.name)}
                  </span>
                  <div>
                    <h2 id="application-title" className="font-display text-[22px] font-extrabold tracking-[-0.035em]">{selectedApp.name}</h2>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {selectedApp.program || selectedApp.department} · Applied {fmtDate(selectedApp.date_applied)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  disabled={Boolean(busy)}
                  className="grid h-9 w-9 place-items-center border-2 border-ink bg-paper text-ink shadow-[2px_2px_0_#0f2942] transition-colors hover:bg-gold disabled:opacity-40"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" strokeWidth={1.6} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: 'Exam score', value: selectedApp.exam_score == null ? '—' : `${selectedApp.exam_score}%` },
                    { label: 'Subjects', value: (selectedApp.subjects ?? []).length },
                    { label: 'Documents', value: (selectedApp.achievements ?? []).length },
                    { label: 'Status', value: 'Pending' },
                  ].map(item => (
                    <div key={item.label} className="border-2 border-ink bg-[#f8f1e2] p-3">
                      <p className="text-[13px] font-semibold text-muted-foreground">{item.label}</p>
                      <p className="num mt-1 text-[18px] leading-none text-ink">{item.value}</p>
                    </div>
                  ))}
                </div>

                <section className="mt-6">
                  <h3 className="font-display text-[17px] font-bold text-ink">Academic record</h3>
                  {selectedApp.grades && Object.keys(selectedApp.grades).length > 0 ? (
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {Object.entries(selectedApp.grades).map(([term, grade]) => (
                        <div key={term} className="border-2 border-ink bg-[#f8f1e2] p-3">
                          <p className="text-[13px] text-muted-foreground">{term.replace('preFinal', 'Pre-Final')}</p>
                          <p className="num mt-1 text-[20px] leading-none text-ink">{grade}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-[13px] text-muted-foreground">No academic records provided.</p>
                  )}
                </section>

                <section className="mt-6">
                  <h3 className="font-display text-[17px] font-bold text-ink">Achievements &amp; documents</h3>
                  {Array.isArray(selectedApp.achievements) && selectedApp.achievements.length > 0 ? (
                    <ul className="mt-1">
                      {selectedApp.achievements.map((achievement, index) => {
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
                                  Open document <ExternalLink className="h-3 w-3" strokeWidth={1.6} />
                                </a>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[13px] text-muted-foreground">No achievements submitted.</p>
                  )}
                </section>

                <section className="mt-6">
                  <h3 className="font-display text-[17px] font-bold text-ink">Subjects applied for</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(selectedApp.subjects ?? []).map(subject => (
                      <span key={subjectCode(subject)} className="inline-flex h-6 items-center border-2 border-ink bg-[#fff7d6] px-2 text-[13px] font-semibold text-ink">
                        {subjectCode(subject)}
                      </span>
                    ))}
                  </div>
                </section>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink bg-[#f8f1e2] px-6 py-4">
                <p className="text-[13px] text-muted-foreground">Approval verifies the tutor and makes their subjects bookable.</p>
                <div className="flex items-center gap-2">
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
                    disabled={busy === selectedApp.id}
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
    </div>
  );
}
