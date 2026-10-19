import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, CheckCircle2, Loader2, XCircle, Home, Search, Hourglass,
  FileText, ExternalLink, GraduationCap, ListChecks,
} from 'lucide-react';
import api from '../api';

/* Separate page for students who just applied as tutor (pending applicants):
 * 1. the qualification exam, 2. their supporting documents of academic
 *    achievement. After the exam the student waits for the superadmin's
 *    approval and can jump back home or off to find a tutor. */
export default function TutorApplicant({ showToast, user }) {
  const nav = useNavigate();
  const [app, setApp] = useState(null);
  const [phase, setPhase] = useState('loading'); // loading | exam | waiting | approved | rejected
  const [examStarted, setExamStarted] = useState(false);
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 mins
  const [starting, setStarting] = useState(false);
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState(null); // {score, passed}

  /* Load this learner's application; no application → the apply page. */
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
      })
      .catch((e) => {
        if (cancelled) return;
        showToast(e.message || 'Could not load your application', 'error');
        nav('/dashboard', { replace: true });
      });
    return () => { cancelled = true; };
  }, []);

  /* While waiting, poll occasionally so an approval lights up live. */
  useEffect(() => {
    if (phase !== 'waiting') return;
    const timer = setInterval(() => {
      api.get('/accreditation/mine').then(({ application: a }) => {
        if (a?.status === 'approved') setPhase('approved');
        if (a?.status === 'rejected') setPhase('rejected');
      }).catch(() => {});
    }, 20000);
    return () => clearInterval(timer);
  }, [phase]);

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

  /* date_applied arrives as a local-midnight Date — show the calendar date only */
  const fmtDate = (d) => {
    const dt = d instanceof Date ? d : new Date(d ?? '');
    return Number.isNaN(dt.getTime()) ? String(d ?? '') : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
        ? `Exam submitted — ${res.exam_score}%! Now awaiting superadmin approval.`
        : `Exam submitted — ${res.exam_score}%. The superadmin will review it.`, res.passed ? 'success' : 'info');
    } catch (e) {
      showToast(e.message || 'Submission failed', 'error');
    } finally {
      setGrading(false);
    }
  };

  /* Countdown; auto-submit on expiry. */
  useEffect(() => {
    if (phase !== 'exam' || !examStarted) return;
    if (timeLeft <= 0) { handleFinish(); return; }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [phase, examStarted, timeLeft]);

  if (phase === 'loading') {
    return <div className="py-20 text-center text-muted-foreground">Loading your application…</div>;
  }

  const docs = Array.isArray(app?.achievements) ? app.achievements : [];
  const q = questions?.[currentQ];
  const options = q ? (Array.isArray(q.options) ? q.options : Object.values(q.options ?? {})) : [];

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      {/* Application header */}
      <Card className="bg-gradient-to-br from-primary via-primary to-primary/80 text-white border-0 shadow-xl">
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/15 border-2 border-white/25 flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Pending Tutor Application</h2>
              <p className="text-white/80 text-sm">{user?.name} • {app.application_code} • Applied {fmtDate(app.date_applied)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap md:justify-end">
            {(app.subjects ?? []).map(s => (
              <Badge key={s.code || s} className="bg-white/15 border border-white/25 text-white">{s.code || s}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 1 — Qualification exam */}
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-lg font-bold text-charcoal">
          <ListChecks className="w-5 h-5 text-primary" /> Qualification Exam
        </h3>

        {phase === 'exam' && !examStarted && (
          <Card className="shadow-sm">
            <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-charcoal">15 multiple-choice questions • 30 minutes • one attempt</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Graded the moment you submit. Afterwards you'll wait for the superadmin's approval —
                  you can head home or find a tutor in the meantime.
                </p>
              </div>
              <Button onClick={startExam} disabled={starting} className="shrink-0 bg-primary hover:bg-primary/90">
                {starting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                Start Exam
              </Button>
            </CardContent>
          </Card>
        )}

        {phase === 'exam' && examStarted && q && (
          <Card className="shadow-md">
            <div className="p-4 border-b bg-slate-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-charcoal">Question {currentQ + 1} of {questions.length}</p>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-border">
                  <Clock className={`w-4 h-4 ${timeLeft < 300 ? 'text-crimson animate-pulse' : 'text-primary'}`} />
                  <span className={`font-mono font-bold ${timeLeft < 300 ? 'text-crimson' : 'text-primary'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>
              <Progress value={(currentQ / questions.length) * 100} className="h-2 mt-3" />
            </div>
            <CardContent className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQ}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h3 className="text-xl font-medium text-charcoal mb-6 leading-relaxed">
                    {currentQ + 1}. {q.question}
                  </h3>
                  <div className="space-y-3">
                    {options.map((opt, i) => (
                      <label
                        key={i}
                        className="flex items-center p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-1 has-[:checked]:ring-primary"
                      >
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
                </motion.div>
              </AnimatePresence>
            </CardContent>
            <div className="p-4 border-t bg-slate-50 rounded-b-lg flex items-center justify-between">
              <Button variant="ghost" onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}>Previous</Button>
              <span className="text-xs text-muted-foreground font-medium">{Object.keys(answers).length}/{questions.length} answered</span>
              {currentQ < questions.length - 1 ? (
                <Button onClick={() =>setCurrentQ(Math.min(questions.length - 1, currentQ + 1))}>Next Question</Button>
              ) : (
                <Button onClick={handleFinish} disabled={grading} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
                  {grading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Exam
                </Button>
              )}
            </div>
          </Card>
        )}

        {phase === 'waiting' && (
          <Card className="shadow-md border-amber/30 bg-amber/5">
            <CardContent className="p-6 text-center">
              <Hourglass className="w-12 h-12 text-amber mx-auto mb-3" />
              <h4 className="text-xl font-bold text-charcoal">Waiting for superadmin approval</h4>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                {result ? `Your exam scored ${result.score}%. ` : `Your exam scored ${app.exam_score}%. `}
                The superadmin is reviewing your score and supporting documents —
                you'll receive a notification with the decision.
              </p>
              <div className="flex flex-wrap gap-3 justify-center mt-5">
                <Button variant="outline" onClick={() => nav('/dashboard')} className="border-primary/30 text-primary hover:bg-primary/5">
                  <Home className="w-4 h-4 mr-2" /> Back to Home
                </Button>
                <Button onClick={() => nav('/wizard')} className="bg-primary hover:bg-primary/90">
                  <Search className="w-4 h-4 mr-2" /> Find a Tutor
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {phase === 'approved' && (
          <Card className="shadow-md border-secondary/40 bg-secondary/5">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald mx-auto mb-3" />
              <h4 className="text-xl font-bold text-charcoal">Approved — you're a verified tutor candidate!</h4>
              <p className="text-sm text-muted-foreground mt-1">
                The superadmin verified your application. You can now be matched as a tutor too.
              </p>
              <div className="flex flex-wrap gap-3 justify-center mt-5">
                <Button variant="outline" onClick={() => nav('/dashboard')} className="border-primary/30 text-primary hover:bg-primary/5">
                  <Home className="w-4 h-4 mr-2" /> Back to Home
                </Button>
                <Button onClick={() => nav('/wizard')} className="bg-primary hover:bg-primary/90">
                  <Search className="w-4 h-4 mr-2" /> Find a Tutor
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {phase === 'rejected' && (
          <Card className="shadow-md border-crimson/30">
            <CardContent className="p-6 text-center">
              <XCircle className="w-12 h-12 text-crimson mx-auto mb-3" />
              <h4 className="text-xl font-bold text-charcoal">Application not approved</h4>
              <p className="text-sm text-muted-foreground mt-1">Check your notifications for the superadmin's note.</p>
              <div className="flex flex-wrap gap-3 justify-center mt-5">
                <Button variant="outline" onClick={() => nav('/dashboard')} className="border-primary/30 text-primary hover:bg-primary/5">
                  <Home className="w-4 h-4 mr-2" /> Back to Home
                </Button>
                <Button onClick={() => nav('/wizard')} className="bg-primary hover:bg-primary/90">
                  <Search className="w-4 h-4 mr-2" /> Find a Tutor
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* 2 — Supporting documents (academic achievement) */}
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-lg font-bold text-charcoal">
          <FileText className="w-5 h-5 text-secondary" /> Supporting Documents — Academic Achievement
        </h3>
        <Card className="shadow-sm">
          <CardContent className="p-5">
            {docs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No supporting documents were submitted with this application.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {docs.map((d, i) => {
                  const entry = typeof d === 'string' ? { title: d } : d;
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-slate-50">
                      <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-semibold text-charcoal text-sm">{entry.title}</p>
                        {entry.detail && <p className="text-xs text-muted-foreground mt-0.5">{entry.detail}</p>}
                        {entry.link && (
                          <a
                            href={entry.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                          >
                            View document <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
