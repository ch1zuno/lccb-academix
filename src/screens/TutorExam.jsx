import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Check, Loader2, Trash2, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../api';

/* Entry point for students who want to tutor: pick subjects, attach
 * supporting documents of academic achievement, submit. The application
 * itself — exam, documents, review status — lives on /tutor-pending. */
export default function TutorExam({ showToast, user }) {
  const nav = useNavigate();
  const [status, setStatus] = useState('loading');
  const [subjects, setSubjects] = useState(null);
  const [pickedSubjects, setPickedSubjects] = useState([]);
  const [docs, setDocs] = useState([{ title: '', detail: '', link: '' }]);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (user?.is_verified) { setStatus('verified'); return undefined; }
    if (user && user.role !== 'learner') { setStatus('not-learner'); return undefined; }
    api.get('/accreditation/mine')
      .then(({ application: app }) => {
        if (cancelled) return;
        if (app) { nav('/tutor-pending', { replace: true }); return; }
        setStatus('no-application');
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
        setStatus('no-application');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (status !== 'no-application') return;
    api.get('/subjects')
      .then(({ subjects: rows }) => setSubjects(rows))
      .catch(() => setSubjects([]));
  }, [status]);

  const setDoc = (index, key, value) => setDocs(list => list.map((doc, i) => (i === index ? { ...doc, [key]: value } : doc)));

  const apply = async () => {
    setApplying(true);
    try {
      const achievements = docs.filter(doc => doc.title.trim());
      await api.post('/accreditation/apply', { subjectIds: pickedSubjects, achievements });
      showToast('Application submitted. Continue to the qualification exam.', 'success');
      nav('/tutor-pending');
    } catch (e) {
      showToast(e.message || 'Could not apply', 'error');
    } finally {
      setApplying(false);
    }
  };

  if (status === 'verified') {
    return (
      <div className="mx-auto w-full max-w-[720px]">
        <div className="panel border-t-8 border-t-gold p-6">
          <span className="status-pill"><span className="status-dot bg-emerald" /> Verified</span>
          <h1 className="mt-4 font-display text-[28px] font-extrabold leading-tight tracking-[-0.04em]">You are an accredited tutor.</h1>
          <p className="mt-2 max-w-[56ch] text-[14px] text-muted-foreground">
            {user?.name} is verified{user?.certified_by_id ? ' — certification is on record.' : '.'} Your subjects are bookable and sessions can be checked in.
          </p>
          <Button className="mt-5" onClick={() => nav('/dashboard')}>Go to overview</Button>
        </div>
      </div>
    );
  }

  if (status === 'not-learner') {
    return (
      <div className="mx-auto w-full max-w-[720px]">
        <div className="panel border-t-8 border-t-gold p-6">
          <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-[-0.04em]">Students only</h1>
          <p className="mt-2 max-w-[56ch] text-[14px] text-muted-foreground">
            Only currently enrolled students can apply for tutor accreditation. Faculty and staff can manage approvals from the admin workspace.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return <div className="panel empty">Reading your accreditation file…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-[860px]">
      <div className="section-head">
        <div>
          <h1 className="section-title">Become a tutor</h1>
          <p className="section-subtitle">Pick the subjects you can teach and attach the record that proves it. The exam opens next.</p>
        </div>
        <span className="border-2 border-ink bg-paper px-2 py-1 text-[13px] font-semibold text-ink">Application</span>
      </div>

      {error && <div className="panel mb-4 px-5 py-4 text-[14px] text-crimson">{error}</div>}

      <div className="panel p-6">
        <h2 className="font-display text-[20px] font-extrabold tracking-[-0.03em]">Subjects you can tutor</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">Choose at least one. You can add more after accreditation.</p>

        {subjects === null && <p className="mt-4 text-[13px] text-muted-foreground">Reading the subject list…</p>}
        {subjects !== null && subjects.length === 0 && <p className="mt-4 text-[13px] text-muted-foreground">No subjects are available right now.</p>}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {(subjects ?? []).map(subject => {
            const selected = pickedSubjects.includes(subject.id);
            return (
              <label
                key={subject.id}
                className={cn(
                  'flex cursor-pointer items-start gap-2.5 border-2 border-ink p-3 transition-[background-color,box-shadow]',
                  selected ? 'bg-gold shadow-[3px_3px_0_#0f2942]' : 'bg-paper hover:bg-[#fff7d6]',
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selected}
                  onChange={(event) => setPickedSubjects(current => (
                    event.target.checked ? [...current, subject.id] : current.filter(id => id !== subject.id)
                  ))}
                />
                <span className={cn(
                  'mt-0.5 grid h-5 w-5 shrink-0 place-items-center border-2 border-ink',
                  selected ? 'bg-ink text-paper' : 'bg-paper',
                )}>
                  {selected && <Check className="h-2.5 w-2.5" strokeWidth={2.4} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold text-ink">{subject.code}</span>
                  <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{subject.name}</span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-8 border-t-2 border-ink pt-6">
          <h2 className="font-display text-[20px] font-extrabold tracking-[-0.03em]">Supporting documents</h2>
          <p className="mt-1 max-w-[62ch] text-[13px] text-muted-foreground">
            Grades, honors, or certificates that show you can teach these subjects. A scanned copy is optional, but a link helps the reviewer.
          </p>

          <div className="mt-4 space-y-3">
            {docs.map((doc, index) => (
              <div key={index} className="border-2 border-ink bg-[#f8f1e2] p-3">
                <div className="flex items-center gap-2">
                  <span className="num grid h-6 w-6 shrink-0 place-items-center border-2 border-ink bg-gold text-[13px] font-bold text-ink">{index + 1}</span>
                  <Input
                    placeholder="Document title — e.g. Dean's Lister, 1st Sem AY 2025–2026"
                    value={doc.title}
                    onChange={(event) => setDoc(index, 'title', event.target.value)}
                  />
                  {docs.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Remove document"
                      aria-label="Remove document"
                      onClick={() => setDocs(list => list.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.6} />
                    </Button>
                  )}
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Details — e.g. GWA 1.45, certified copy on file"
                    value={doc.detail}
                    onChange={(event) => setDoc(index, 'detail', event.target.value)}
                  />
                  <Input
                    placeholder="Optional link to the scanned document"
                    value={doc.link}
                    onChange={(event) => setDoc(index, 'link', event.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          {docs.length < 8 && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setDocs(list => [...list, { title: '', detail: '', link: '' }])}
            >
              <Plus className="h-4 w-4" strokeWidth={1.8} /> Add document
            </Button>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-5">
          <p className="text-[13px] text-muted-foreground">
            {pickedSubjects.length === 0
              ? 'Choose at least one subject to continue.'
              : `${pickedSubjects.length} subject${pickedSubjects.length === 1 ? '' : 's'} selected · ${docs.filter(doc => doc.title.trim()).length} document${docs.filter(doc => doc.title.trim()).length === 1 ? '' : 's'} attached`}
          </p>
          <Button disabled={applying || pickedSubjects.length === 0} onClick={apply}>
            {applying ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : null}
            {applying ? 'Submitting…' : 'Submit application'}
          </Button>
        </div>
      </div>
    </div>
  );
}
