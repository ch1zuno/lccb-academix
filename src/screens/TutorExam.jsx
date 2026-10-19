import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { CheckCircle2, Loader2, Info, FileText, Link2, Trash2, Plus } from 'lucide-react';
import api from '../api';

/* Entry point for students who want to tutor: pick subjects, attach
 * supporting documents of academic achievement, submit. The application
 * itself — qualification exam, documents, review status — lives on the
 * separate pending-applicant page (/tutor-pending). */
export default function TutorExam({ showToast, user }) {
  const nav = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | verified | not-learner | no-application
  const [subjects, setSubjects] = useState(null);
  const [pickedSubjects, setPickedSubjects] = useState([]);
  const [docs, setDocs] = useState([{ title: '', detail: '', link: '' }]);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (user?.is_verified) { setStatus('verified'); return; }
    if (user && user.role !== 'learner') { setStatus('not-learner'); return; }
    api.get('/accreditation/mine')
      .then(({ application: app }) => {
        if (cancelled) return;
        // An application already exists → everything else happens on the pending page.
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

  /* Subject list for the application step */
  useEffect(() => {
    if (status !== 'no-application') return;
    api.get('/subjects')
      .then(({ subjects: rows }) => setSubjects(rows))
      .catch(() => setSubjects([]));
  }, [status]);

  const setDoc = (i, key, val) => setDocs(list => list.map((d, j) => (j === i ? { ...d, [key]: val } : d)));

  const apply = async () => {
    setApplying(true);
    try {
      const achievements = docs.filter(d => d.title.trim());
      await api.post('/accreditation/apply', { subjectIds: pickedSubjects, achievements });
      showToast('Application submitted — continue to your qualification exam!', 'success');
      nav('/tutor-pending');
    } catch (e) {
      showToast(e.message || 'Could not apply', 'error');
    } finally {
      setApplying(false);
    }
  };

  /* ---- Already certified: nothing to do here ---- */
  if (status === 'verified') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <CheckCircle2 className="w-24 h-24 text-secondary mb-6" />
        <h2 className="text-3xl font-bold text-primary mb-2">You're Verified</h2>
        <p className="text-muted-foreground mb-8">
          {user?.name} is an accredited tutor{user?.certified_by_id ? ' — certification on record.' : '.'}
        </p>
      </div>
    );
  }

  /* ---- Only students can apply ---- */
  if (status === 'not-learner') {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <Info className="w-16 h-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-primary mb-2">Students Only</h2>
        <p className="text-muted-foreground">
          Only currently-enrolled students can apply for tutor accreditation.
        </p>
      </div>
    );
  }

  if (status === 'loading') {
    return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  }

  /* ---- Application step ---- */
  return (
    <div className="max-w-2xl mx-auto py-12">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Become an Accredited Tutor</CardTitle>
          <CardDescription>{error ?? 'Pick the subjects you can tutor and add your supporting academic documents. Submitting creates your application — the qualification exam opens on the next page.'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">1 • Subjects you can tutor</h4>
            <div className="space-y-2">
              {(subjects ?? []).map(s => (
                <label key={s.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary border-slate-300"
                    checked={pickedSubjects.includes(s.id)}
                    onChange={(e) => setPickedSubjects(sel => e.target.checked ? [...sel, s.id] : sel.filter(id => id !== s.id))}
                  />
                  <span className="text-charcoal"><strong>{s.code}</strong> — {s.name}</span>
                </label>
              ))}
            </div>
            {subjects !== null && subjects.length === 0 && <p className="text-sm text-muted-foreground">No subjects available.</p>}
          </div>

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">2 • Supporting documents — academic achievement</h4>
            <p className="text-xs text-muted-foreground mb-3">Grades, honors or certificates that show you can teach these subjects. A link to the scanned copy is optional.</p>
            <div className="space-y-3">
              {docs.map((d, i) => (
                <div key={i} className="p-3 border rounded-lg bg-slate-50 space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <Input
                      placeholder="Document title — e.g. Dean's Lister, 1st Sem AY 2025-2026"
                      value={d.title}
                      onChange={(e) => setDoc(i, 'title', e.target.value)}
                      className="h-9"
                    />
                    {docs.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-crimson shrink-0"
                        title="Remove document"
                        onClick={() => setDocs(list => list.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <Input
                    placeholder="Details — e.g. GWA 1.45, certified copy on file"
                    value={d.detail}
                    onChange={(e) => setDoc(i, 'detail', e.target.value)}
                    className="h-9 text-sm"
                  />
                  <div className="flex items-center gap-2 text-slate-400">
                    <Link2 className="w-4 h-4 shrink-0" />
                    <Input
                      placeholder="Optional link to the scanned document"
                      value={d.link}
                      onChange={(e) => setDoc(i, 'link', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
            {docs.length < 8 && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setDocs(list => [...list, { title: '', detail: '', link: '' }])}>
                <Plus className="w-4 h-4 mr-1" /> Add document
              </Button>
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6 bg-slate-50">
          <Button disabled={applying || pickedSubjects.length === 0} onClick={apply}>
            {applying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Application ({pickedSubjects.length})
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
