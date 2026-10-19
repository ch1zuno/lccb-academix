import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Bookmark, Clock, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';

export default function TutorExam({ showToast, user }) {
  const [status, setStatus] = useState('loading'); // loading | verified | no-application | ready | submitted
  const [application, setApplication] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({});
  const [subjects, setSubjects] = useState(null);
  const [pickedSubjects, setPickedSubjects] = useState([]);
  const [applying, setApplying] = useState(false);
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState(null); // {score, passed}
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 mins
  const [currentQ, setCurrentQ] = useState(0);

  /* Load the caller's accreditation state */
  useEffect(() => {
    let cancelled = false;
    if (user?.is_verified) { setStatus('verified'); return () => { cancelled = true; }; }
    api.get('/accreditation/mine')
      .then(({ application: app }) => {
        if (cancelled) return;
        setApplication(app);
        if (!app) setStatus('no-application');
        else if (app.exam_score != null) setStatus('submitted'); // graded; superadmin reviews
        else return api.get('/accreditation/exam');
      })
      .then((res) => { if (res) { setQuestions(res.questions); setStatus('ready'); } })
      .catch((e) => {
        if (cancelled) return;
        if (e.status === 404) setStatus('no-application');
        else { setError(e.message); setStatus('no-application'); }
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

  /* Countdown; auto-submit on expiry */
  useEffect(() => {
    if (status !== 'ready') return;
    if (timeLeft <= 0) { handleFinish(); return; }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [status, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const apply = async () => {
    setApplying(true);
    try {
      const { application: app } = await api.post('/accreditation/apply', { subjectIds: pickedSubjects });
      setApplication(app);
      const res = await api.get('/accreditation/exam');
      setQuestions(res.questions);
      setStatus('ready');
      showToast('Application submitted — exam started!', 'success');
    } catch (e) {
      showToast(e.message || 'Could not apply', 'error');
    } finally {
      setApplying(false);
    }
  };

  const handleFinish = async () => {
    if (grading) return;
    setGrading(true);
    try {
      const payload = {};
      (questions ?? []).forEach((q) => { payload[q.question_number] = answers[q.question_number] ?? -1; });
      const res = await api.post('/accreditation/exam', { answers: payload });
      setResult({ score: res.exam_score, passed: res.passed });
      setApplication(a => ({ ...a, exam_score: res.exam_score, status: a.status }));
      setStatus('submitted');
      showToast(res.passed ? `Exam submitted — ${res.exam_score}%! Await superadmin verification.` : `Exam submitted — ${res.exam_score}%`, res.passed ? 'success' : 'info');
    } catch (e) {
      showToast(e.message || 'Submission failed', 'error');
    } finally {
      setGrading(false);
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
        {Array.isArray(application?.subjects) && application.subjects.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Accredited for: {application.subjects.map(s => s.code || s).join(', ')}
          </p>
        )}
      </div>
    );
  }

  /* ---- Result state (graded; superadmin decision pending) ---- */
  if (status === 'submitted') {
    const passed = result ? result.passed : true;
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          {passed ? (
            <>
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-secondary/20 blur-xl rounded-full" />
                <CheckCircle2 className="w-32 h-32 text-secondary relative z-10 mx-auto mb-6 drop-shadow-lg" />
              </div>
              <h2 className="text-4xl font-bold text-primary mb-4">Exam Complete!</h2>
              <p className="text-xl text-muted-foreground mb-2">Score: <strong className="text-charcoal">{result?.score ?? application?.exam_score}%</strong></p>
              <p className="text-sm text-muted-foreground mb-8">Awaiting superadmin verification. You will be notified of the decision.</p>
            </>
          ) : (
            <XCircle className="w-28 h-28 text-crimson mx-auto mb-6" />
          )}
          <Card className="bg-gradient-to-br from-primary to-primary/80 border-0 shadow-2xl inline-block text-left mb-8 max-w-sm w-full">
            <CardContent className="p-8 text-center text-white">
              <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/20 shadow-inner">
                <span className="text-2xl font-bold text-primary">TQ</span>
              </div>
              <h3 className="text-2xl font-bold mb-1" style={{ color: '#fff' }}>Tutor Qualification</h3>
              <p className="text-white/80 text-sm">Application {application?.application_code ?? ''} • Status: {application?.status ?? 'pending'}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  /* ---- Application step (no application / failed to load) ---- */
  if (status === 'no-application') {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Become an Accredited Tutor</CardTitle>
            <CardDescription>{error ?? 'Choose the subjects you can teach. Submitting creates your application and starts the qualification exam.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
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
            {subjects !== null && subjects.length === 0 && <p className="text-sm text-muted-foreground">No subjects available.</p>}
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

  if (status === 'loading' || questions === null) {
    return <div className="py-20 text-center text-muted-foreground">Loading exam…</div>;
  }

  /* ---- Exam ---- */
  const q = questions[currentQ];
  const options = Array.isArray(q.options) ? q.options : Object.values(q.options ?? {});

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col pt-4">
      <div className="sticky top-0 bg-white z-10 pb-4 mb-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-primary">Tutor Qualification Exam</h2>
          <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-border">
            <Clock className={`w-5 h-5 ${timeLeft < 300 ? 'text-crimson animate-pulse' : 'text-primary'}`} />
            <span className={`font-mono font-bold text-lg ${timeLeft < 300 ? 'text-crimson' : 'text-primary'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
        <Progress value={(currentQ / questions.length) * 100} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground mt-2 font-medium">
          <span>Question {currentQ + 1} of {questions.length}</span>
          <span>{Math.round((currentQ / questions.length) * 100)}% Completed</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex-1"
        >
          <Card className="border-0 shadow-sm bg-transparent">
            <CardContent className="p-0">
              <h3 className="text-xl font-medium text-charcoal mb-8 leading-relaxed">
                {currentQ + 1}. {q.question}
              </h3>
              <div className="space-y-3">
                {options.map((opt, i) => (
                  <label key={i} className="flex items-center p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-1 has-[:checked]:ring-primary">
                    <input
                      type="radio"
                      name={`q-${q.question_number}`}
                      className="w-4 h-4 text-primary focus:ring-primary border-slate-300"
                      checked={answers[q.question_number] === i}
                      onChange={() => setAnswers(prev => ({ ...prev, [q.question_number]: i }))}
                    />
                    <span className="ml-3 text-charcoal font-medium group-hover:text-primary transition-colors">{opt}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="mt-auto pt-8 flex items-center justify-between">
        <Button variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50">
          <Bookmark className="w-4 h-4 mr-2" /> Flag for Review
        </Button>
        <div className="flex gap-4">
          <Button variant="ghost" onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}>Previous</Button>
          {currentQ < questions.length - 1 ? (
            <Button onClick={() => setCurrentQ(Math.min(questions.length - 1, currentQ + 1))}>Next Question</Button>
          ) : (
            <Button onClick={handleFinish} disabled={grading} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
              {grading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Exam
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
