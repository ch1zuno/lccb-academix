import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ArrowRight, ArrowLeft, Loader2, Star, CheckCircle2, Shield, Clock, BookOpen } from 'lucide-react';
import api from '../api';
import { SUBJECTS, TUTORS } from '../data';

const steps = [
  { id: 'goal', title: 'Academic Goal' },
  { id: 'timeline', title: 'Timeline' },
  { id: 'course', title: 'Course Selection' },
  { id: 'level', title: 'Current Level' },
  { id: 'language', title: 'Language' },
  { id: 'availability', title: 'Availability' },
  { id: 'match', title: 'Matching' }
];

// Course codes for the wizard step
const COURSE_OPTIONS = SUBJECTS.filter(s => s.dept === 'BSIT' || s.dept === 'General').map(s => s.code);

export default function LearnerWizard({ showToast }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState({});
  const [matching, setMatching] = useState(false);
  const [liveSubjects, setLiveSubjects] = useState(null); // [{id,code,name,department}]
  const [matches, setMatches] = useState(null);           // live tutors for step 7
  const [matchError, setMatchError] = useState(null);
  const [requesting, setRequesting] = useState(null);     // tutorId in flight

  // Subject pills come from /subjects when reachable; fall back to mock otherwise.
  useEffect(() => {
    api.get('/subjects')
      .then(({ subjects }) => setLiveSubjects(subjects.filter(s => s.department === 'BSIT' || s.department === 'General')))
      .catch(() => setLiveSubjects(null));
  }, []);

  const subjectOptions = useMemo(
    () => (liveSubjects ?? SUBJECTS.filter(s => s.dept === 'BSIT' || s.dept === 'General')).map(s => ({
      code: s.code, id: s.id,
    })),
    [liveSubjects],
  );

  const nextStep = async () => {
    if (currentStep === steps.length - 2 && !matches) {
      setMatching(true);
      setMatchError(null);
      try {
        const apiCall = data.course && data.course !== 'Any'
          ? api.get('/tutors', { subject: data.course, available: '1' })
          : api.get('/tutors', { available: '1' });
        const [{ tutors }] = [await apiCall];
        // give the snack animation a beat; waiting is part of the UX
        await new Promise(r => setTimeout(r, 1200));
        setMatches(tutors);
        setCurrentStep(s => s + 1);
        showToast(`Found ${tutors.length} accredited ${data.course || '*/'} matches!`, 'success');
      } catch (e) {
        setMatchError(e.message);
        showToast('Matching failed — please retry.', 'error');
      } finally {
        setMatching(false);
      }
    } else {
      setCurrentStep(s => Math.min(steps.length - 1, s + 1));
    }
  };
  const prevStep = () => setCurrentStep(s => Math.max(0, s - 1));

  const selectOption = (key, value) => {
    // changing course invalidates cached matches
    if (key === 'course') setMatches(null);
    setData(prev => ({ ...prev, [key]: value }));
  };

  // Live matches first, mock directory only while offline.
  const getMatches = () => (matches ?? TUTORS.filter(t => t.verified && t.available).slice(0, 4));

  const OptionCard = ({ label, selected, onClick, icon: Icon, description }) => (
    <Card 
      className={`cursor-pointer transition-all hover:scale-[1.03] hover:shadow-md ${selected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:border-primary/50'}`}
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-3 h-full">
        {Icon && <Icon className={`w-8 h-8 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />}
        <span className={`font-medium ${selected ? 'text-primary' : 'text-charcoal'}`}>{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </CardContent>
    </Card>
  );

  const CoursePill = ({ label, selected, onClick }) => (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-full font-semibold transition-all hover:scale-105 text-sm ${selected ? 'bg-primary text-white shadow-md' : 'bg-white border border-border text-charcoal hover:border-primary'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto py-8">
      {currentStep < steps.length - 1 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={prevStep} disabled={currentStep === 0 || matching}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep + 1} of {steps.length - 1}
            </span>
            <Button variant="ghost" size="sm" onClick={nextStep} disabled={matching || !data[steps[currentStep].id]}>
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <div className="h-2 w-full bg-secondary/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep) / (steps.length - 2)) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center min-h-[400px]">
        <AnimatePresence mode="wait">
          {matching ? (
            <motion.div 
              key="matching"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center text-center space-y-6"
            >
              <div className="relative">
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-primary">Matching you with Faculty-Certified Peers...</h2>
              <p className="text-muted-foreground">Analyzing schedules, subjects, strengths, and availability...</p>
              <div className="flex items-center gap-8 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-emerald" /> Verified tutors only</span>
                <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Subject: {data.course || 'Any'}</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <h2 className="text-3xl font-bold text-center text-primary mb-8">
                {steps[currentStep].id === 'goal' && "What do you need help with?"}
                {steps[currentStep].id === 'timeline' && "When is your deadline?"}
                {steps[currentStep].id === 'course' && "Select your Course Code"}
                {steps[currentStep].id === 'level' && "How well do you currently understand it?"}
                {steps[currentStep].id === 'language' && "Preferred spoken language?"}
                {steps[currentStep].id === 'availability' && "When can you take lessons?"}
              </h2>

              {steps[currentStep].id === 'goal' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['Prepare for Exams', 'Understand a specific topic', 'Catch up on missed lessons'].map(opt => (
                    <OptionCard key={opt} label={opt} selected={data.goal === opt} onClick={() => selectOption('goal', opt)} />
                  ))}
                </div>
              )}

              {steps[currentStep].id === 'timeline' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['Within this week', 'Before Midterms', 'Before Finals'].map(opt => (
                    <OptionCard key={opt} label={opt} selected={data.timeline === opt} onClick={() => selectOption('timeline', opt)} />
                  ))}
                </div>
              )}

              {steps[currentStep].id === 'course' && (
                <div className="flex flex-wrap justify-center gap-3">
                  {subjectOptions.map(opt => (
                    <CoursePill key={opt.code} label={opt.code} selected={data.course === opt.code} onClick={() => selectOption('course', opt.code)} />
                  ))}
                </div>
              )}

              {steps[currentStep].id === 'level' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['Completely lost', 'I know the basics', 'I just need advanced review'].map(opt => (
                    <OptionCard key={opt} label={opt} selected={data.level === opt} onClick={() => selectOption('level', opt)} />
                  ))}
                </div>
              )}

              {steps[currentStep].id === 'language' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['English', 'Tagalog', 'Hiligaynon'].map(opt => (
                    <OptionCard key={opt} label={opt} selected={data.language === opt} onClick={() => selectOption('language', opt)} />
                  ))}
                </div>
              )}

              {steps[currentStep].id === 'availability' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['Mon Morning', 'Tue Afternoon', 'Wed Evening', 'Thu Morning', 'Fri Afternoon', 'Sat Morning'].map(opt => (
                    <OptionCard key={opt} label={opt} selected={data.availability === opt} onClick={() => selectOption('availability', opt)} />
                  ))}
                </div>
              )}

              {steps[currentStep].id === 'match' && (
                <div className="space-y-6">
                  {matchError && (
                    <Card><CardContent className="p-6 text-center text-crimson">
                      Matching failed: {matchError}
                      <div className="mt-3"><Button variant="outline" size="sm" onClick={() => setMatches(null)}>Try again</Button></div>
                    </CardContent></Card>
                  )}
                  {matches === null && !matchError ? (
                    <Card><CardContent className="p-8 text-center text-muted-foreground">No matches loaded yet — go back and continue.</CardContent></Card>
                  ) : matches !== null && matches.length === 0 && !matchError ? (
                    <Card><CardContent className="p-8 text-center text-muted-foreground">
                      No tutors match this filter. Try another subject.
                    </CardContent></Card>
                  ) : (
                    getMatches().map((tutor, i) => (
                      <motion.div
                        key={tutor.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.15 }}
                      >
                        <Card className="hover:border-primary/50 transition-all cursor-pointer group hover:shadow-lg">
                          <CardContent className="p-6 flex items-center gap-6">
                            <div className="w-16 h-16 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xl font-bold shadow-inner shrink-0">
                              {tutor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-primary group-hover:text-secondary transition-colors">{tutor.name}</h3>
                                {(tutor.is_verified ?? tutor.verified) && <Shield className="w-4 h-4 text-emerald" />}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{tutor.program}</p>
                              <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
                                <Star className="w-4 h-4 fill-secondary text-secondary" /> {tutor.stats ? tutor.stats.rating : tutor.rating}
                                <span className="mx-1">•</span>
                                <span>{tutor.stats ? tutor.stats.sessions : tutor.sessions} sessions</span>
                                <span className="mx-1">•</span>
                                <span className="font-semibold text-charcoal">
                                  {tutor.subjects ? tutor.subjects.map(s => s.code).join(', ') : tutor.subjects.join(', ')}
                                </span>
                              </div>
                              <div className="flex gap-2 mt-2">
                                <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground hover:bg-secondary/30 text-xs">
                                  {(tutor.stats ? tutor.stats.sessions : tutor.sessions) > 50 ? '🏆 Experienced' : '🌟 Rising'}
                                </Badge>
                                <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground hover:bg-secondary/30 text-xs">
                                  {(tutor.stats ? tutor.stats.rating : tutor.rating) >= 4.8 ? '⭐ Top Rated' : '👍 Well Reviewed'}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              className="shrink-0"
                              disabled={requesting === tutor.id}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setRequesting(tutor.id);
                                const fallbackDate = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
                                try {
                                  await api.post('/session-requests', {
                                    tutorId: tutor.id,
                                    subjectId: (subjectOptions.find(s => s.code === data.course) || {}).id,
                                    topic: data.goal || 'General review',
                                    preferredDate: fallbackDate,
                                    preferredTime: '3:30 PM',
                                    note: data.level ? `Level: ${data.level} • Language: ${data.language || 'English'} • Preview: ${data.availability || ''}` : null,
                                  });
                                  showToast(`Session requested with ${tutor.name}!`, 'success');
                                } catch (err) {
                                  showToast(err.message || 'Request failed', 'error');
                                } finally {
                                  setRequesting(null);
                                }
                              }}
                            >
                              {requesting === tutor.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Request Session'}
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {currentStep < steps.length - 1 && (
        <div className="mt-8 flex justify-center">
          <Button size="lg" className="w-full max-w-xs shadow-lg" onClick={nextStep} disabled={matching || !data[steps[currentStep].id]}>
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}
