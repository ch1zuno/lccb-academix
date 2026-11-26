import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import ApplicationDocumentPicker from '../components/ApplicationDocumentPicker';
import LoadState from '../components/ui/LoadState';
import { Check, Loader2, Trash2, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { useDraftState, friendlyError } from '../lib/ux';
import api from '../api';

const nextFileId = () => (
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
);

/* Entry point for students who want to tutor: pick subjects, upload proof
 * files, add academic notes, submit. The application itself — exam, files,
 * review status — lives on /tutor-pending. */
export default function TutorExam({ showToast, user }) {
  const nav = useNavigate();
  const [status, setStatus] = useState('loading');
  const [subjects, setSubjects] = useState(null);
  const [pickedSubjects, setPickedSubjects, clearPickedSubjects] = useDraftState('tutor-apply-subjects', []);
  const [staged, setStaged] = useState([]); // [{ id, file }]
  const [docs, setDocs, clearDocs] = useDraftState('tutor-apply-docs', [{ title: '', detail: '', link: '' }]);
  const [applying, setApplying] = useState(false);
  const [uploadStep, setUploadStep] = useState('');
  const [error, setError] = useState(null);

  const fileItems = staged.map(({ id, file }) => ({
    id,
    name: file.name,
    size: file.size,
    mime: file.type,
    file,
  }));

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
    if (pickedSubjects.length === 0) {
      showToast('Choose at least one subject before submitting.', 'error');
      return;
    }
    if (staged.length === 0) {
      showToast('Attach at least one supporting file before submitting.', 'error');
      return;
    }
    setApplying(true);
    setUploadStep('Submitting application…');
    try {
      const achievements = docs.filter(doc => doc.title.trim());
      const { application } = await api.post('/accreditation/apply', { subjectIds: pickedSubjects, achievements });
      let failed = 0;
      for (let i = 0; i < staged.length; i += 1) {
        setUploadStep(`Uploading file ${i + 1} of ${staged.length}…`);
        const form = new FormData();
        form.append('document', staged[i].file);
        try {
          await api.upload(`/accreditation/${application.id}/documents`, form);
        } catch {
          failed += 1;
        }
      }
      clearPickedSubjects();
      clearDocs();
      if (failed) {
        showToast(
          `Application submitted, but ${failed} file${failed === 1 ? '' : 's'} did not upload. Add ${failed === 1 ? 'it' : 'them'} from your application page.`,
          'error',
        );
      } else {
        showToast('Application submitted with supporting files. Continue to the qualification exam.', 'success');
      }
      nav('/tutor-pending');
    } catch (e) {
      showToast(e.message || 'Could not apply', 'error');
    } finally {
      setApplying(false);
      setUploadStep('');
    }
  };

  if (status === 'verified') {
    return (
      <div className="mx-auto w-full max-w-[720px]">
        <div className="panel panel-pad border-t-4 border-t-gold">
          <span className="status-pill"><span className="status-dot bg-emerald" /> Verified</span>
          <h1 className="mt-4 font-display text-[clamp(22px,6vw+2px,28px)] font-extrabold leading-tight tracking-[-0.03em]">You are an accredited tutor.</h1>
          <p className="mt-2 max-w-[56ch] text-[14px] text-muted-foreground">
            {user?.name} is verified{user?.certified_by_id ? ' — certification is on record.' : '.'} Your subjects are bookable and sessions can be checked in.
          </p>
          <Button className="mt-5 w-full sm:w-auto" onClick={() => nav('/dashboard')}>Go to overview</Button>
        </div>
      </div>
    );
  }

  if (status === 'not-learner') {
    return (
      <div className="mx-auto w-full max-w-[720px]">
        <div className="panel panel-pad border-t-4 border-t-gold">
          <h1 className="font-display text-[clamp(22px,6vw+2px,28px)] font-extrabold leading-tight tracking-[-0.03em]">Students only</h1>
          <p className="mt-2 max-w-[56ch] text-[14px] text-muted-foreground">
            Only currently enrolled students can apply for tutor accreditation. Faculty and staff can manage approvals from the admin workspace.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="mx-auto w-full max-w-[860px]">
        <LoadState loading />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[860px]">
      <div className="section-head">
        <div>
          <h1 className="section-title">Become a tutor</h1>
          <p className="section-subtitle">Pick subjects, attach proof, and apply. The exam opens next.</p>
        </div>
        <span className="border-2 border-ink bg-paper px-2 py-1 text-[13px] font-semibold text-ink">Application</span>
      </div>

      {error && <div className="callout callout-alert mb-4 text-[14px] text-crimson">{friendlyError(error, "We couldn't check your application status. Try again.")}</div>}

      <div className="panel panel-pad sm:p-6">
        <h2 className="font-display text-[20px] font-extrabold tracking-[-0.03em]">Subjects you can tutor</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">Choose at least one. You can add more after accreditation.</p>

        <div className="mt-4">
          <LoadState
            inline
            loading={subjects === null}
            empty={subjects !== null && subjects.length === 0}
            emptyText="No subjects are available right now."
            skeleton={(
              <div className="grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 w-full" />)}
              </div>
            )}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {(subjects ?? []).map(subject => {
                const selected = pickedSubjects.includes(subject.id);
                return (
                  <label
                    key={subject.id}
                    className={cn(
                      'flex min-h-[56px] cursor-pointer items-start gap-2.5 border-2 border-ink p-3 transition-[background-color,box-shadow]',
                      selected ? 'bg-gold shadow-[var(--nb-shadow-sm)_var(--nb-shadow-sm)_0_var(--color-ink)]' : 'bg-paper hover:bg-surface-highlight',
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
                      'mt-0.5 grid h-6 w-6 shrink-0 place-items-center border-2 border-ink',
                      selected ? 'bg-ink text-paper' : 'bg-paper',
                    )}>
                      {selected && <Check className="h-3.5 w-3.5" strokeWidth={2.4} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold text-ink">{subject.code}</span>
                      <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted-foreground">{subject.name}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </LoadState>
        </div>

        <div className="mt-6 border-t-2 border-ink pt-5 sm:mt-8 sm:pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-[20px] font-extrabold tracking-[-0.03em]">Supporting files</h2>
            <span className="border-2 border-ink bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]">Required</span>
          </div>
          <p className="mt-1 max-w-[62ch] text-[13px] text-muted-foreground">
            Upload a grade slip, honors certificate, or registration form. The Academix program administrator needs at least one file before approving your application.
          </p>

          <ApplicationDocumentPicker
            className="mt-4"
            items={fileItems}
            onAdd={(files) => setStaged(list => [...list, ...files.map(file => ({ id: nextFileId(), file }))])}
            onRemove={(id) => setStaged(list => list.filter(item => item.id !== id))}
            onError={(message) => showToast(message, 'error')}
            disabled={applying}
          />

          {applying && uploadStep && (
            <p className="mt-2 text-[12px] font-semibold text-ink" role="status">{uploadStep}</p>
          )}
        </div>

        <div className="mt-6 border-t-2 border-ink pt-5 sm:mt-8 sm:pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-[20px] font-extrabold tracking-[-0.03em]">Academic record notes</h2>
            <span className="border-2 border-ink bg-paper px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Optional</span>
          </div>
          <p className="mt-1 max-w-[62ch] text-[13px] text-muted-foreground">
            Add honors or roles (for example: &ldquo;Dean&apos;s Lister&rdquo;, &ldquo;GWA 1.45&rdquo;, or a drive link).
          </p>

          <div className="mt-4 space-y-3">
            {docs.map((doc, index) => (
              <div key={index} className="callout space-y-2">
                <div className="flex items-center gap-2">
                  <span className="num grid h-6 w-6 shrink-0 place-items-center border-2 border-ink bg-gold text-[13px] font-bold text-ink">{index + 1}</span>
                  <Input
                    aria-label={`Note ${index + 1} title`}
                    placeholder="Note title"
                    value={doc.title}
                    onChange={(event) => setDoc(index, 'title', event.target.value)}
                  />
                  {docs.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Remove note"
                      aria-label="Remove note"
                      onClick={() => setDocs(list => list.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.6} />
                    </Button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    aria-label={`Note ${index + 1} details`}
                    placeholder="Details (optional)"
                    value={doc.detail}
                    onChange={(event) => setDoc(index, 'detail', event.target.value)}
                  />
                  <Input
                    aria-label={`Note ${index + 1} optional link`}
                    placeholder="Link (optional, https://…)"
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
              <Plus className="h-4 w-4" strokeWidth={1.8} /> Add note
            </Button>
          )}
        </div>

        <div className="action-bar mt-6 flex-col items-stretch sm:flex-row sm:items-center">
          <p className="text-[13px] text-muted-foreground">
            {pickedSubjects.length === 0
              ? 'Choose at least one subject to continue.'
              : staged.length === 0
                ? 'Attach at least one supporting file to submit.'
                : `${pickedSubjects.length} subject${pickedSubjects.length === 1 ? '' : 's'} · ${staged.length} file${staged.length === 1 ? '' : 's'} · ${docs.filter(doc => doc.title.trim()).length} note${docs.filter(doc => doc.title.trim()).length === 1 ? '' : 's'}`}
          </p>
          <Button
            className="w-full sm:w-auto"
            disabled={applying || pickedSubjects.length === 0 || staged.length === 0}
            onClick={apply}
          >
            {applying ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : null}
            {applying ? (uploadStep || 'Submitting…') : 'Submit application'}
          </Button>
        </div>
      </div>
    </div>
  );
}
