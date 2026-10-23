import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Search, Loader2, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import api from '../api';

const URGENCIES = [
  { value: 'low', label: 'Low', desc: 'Watch it for now.', dot: 'bg-ink/30' },
  { value: 'medium', label: 'Medium', desc: 'Needs a plan this month.', dot: 'bg-amber' },
  { value: 'high', label: 'High', desc: 'Falling behind now.', dot: 'bg-crimson' },
];

const initials = (name = '') => name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();

const STEP_LABELS = { 1: 'Student', 2: 'Referral details', 3: 'Review' };

function StudentRow({ student, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(student)}
      className="flex w-full items-center gap-3 border-b border-ink/15 px-1 py-3 text-left transition-colors last:border-0 hover:bg-gold/25"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center border-2 border-ink bg-[#fff7d6] text-[13px] font-bold text-ink">
        {initials(student.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-bold text-ink">{student.name}</span>
        <span className="block truncate text-[13px] text-muted-foreground">{student.custom_id} · {student.program}</span>
      </span>
      <span className="border-2 border-ink bg-paper px-1.5 py-0.5 text-[13px] font-semibold text-ink">Select</span>
    </button>
  );
}

export default function FacultyReferral({ showToast, user }) {
  const [step, setStep] = useState(1);
  const [student, setStudent] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('');
  const [hours, setHours] = useState(4);
  const [notes, setNotes] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [results, setResults] = useState([]);
  const [everyone, setEveryone] = useState([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/subjects').then(({ subjects: rows }) => setSubjects(rows)).catch(() => setSubjects([]));
    api.get('/referrals/search-students', { q: 'a' }).then(({ students }) => setEveryone(students)).catch(() => {});
  }, []);

  useEffect(() => {
    if (student.trim().length <= 2 || selectedStudent) return undefined;
    const timer = setTimeout(() => {
      setSearching(true);
      api.get('/referrals/search-students', { q: student.trim() })
        .then(({ students }) => setResults(students))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [student, selectedStudent]);

  const filteredStudents = student.length > 2 ? results : [];
  const subjectLabel = subjects.find(s => s.id === selectedSubject)?.code ?? '—';
  const selectedUrgencyLabel = URGENCIES.find(u => u.value === selectedUrgency)?.label;

  const selectStudent = (value) => {
    setSelectedStudent(value);
    setStudent(value.name);
    setStep(2);
  };

  const handleRefer = async () => {
    if (!selectedStudent || !selectedSubject) return;
    setSubmitting(true);
    try {
      await api.post('/referrals', {
        learnerId: selectedStudent.id,
        subjectId: selectedSubject,
        topic: topic.trim() || 'General review',
        urgency: selectedUrgency || 'medium',
        hoursRequired: Number(hours) || 4,
        notes: notes || null,
      });
      showToast(`${selectedStudent.name} was referred for peer tutoring.`, 'success');
      setStep(1);
      setStudent('');
      setSelectedStudent(null);
      setSelectedSubject('');
      setTopic('');
      setSelectedUrgency('');
      setHours(4);
      setNotes('');
    } catch (e) {
      showToast(e.message || 'Referral failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[780px]">
      <div className="section-head">
        <div>
          <h1 className="section-title">New referral</h1>
          <p className="section-subtitle">
            Nominate a student for peer tutoring. {user?.name ? `Signed in as ${user.name}.` : ''}
          </p>
        </div>
        <span className="border-2 border-ink bg-paper px-2 py-1 text-[13px] font-semibold text-ink">
          Step <span className="num">{step}</span> of 3 · {STEP_LABELS[step]}
        </span>
      </div>

      <div className="mb-6 h-3 w-full border-2 border-ink bg-paper">
        <motion.div
          className="h-full bg-gold"
          initial={false}
          animate={{ width: `${(step / 3) * 100}%` }}
          transition={{ duration: 0.25 }}
        />
      </div>

      <div className="panel p-6">
        {step === 1 && (
          <div>
            <h2 className="font-display text-[20px] font-extrabold tracking-[-0.03em]">Find the student</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">Search by name or school ID. At least three characters.</p>

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.6} />
              <Input
                placeholder="e.g. Julian or TE-128"
                className="pl-9"
                value={student}
                onChange={(event) => { setStudent(event.target.value); setSelectedStudent(null); }}
              />
            </div>

            {searching && <p className="mt-3 text-[13px] text-muted-foreground">Searching the student file…</p>}

            {filteredStudents.length > 0 && (
              <div className="mt-3 border-t-2 border-ink">
                {filteredStudents.map(row => <StudentRow key={row.id} student={row} onSelect={selectStudent} />)}
              </div>
            )}

            {student.length > 2 && !searching && filteredStudents.length === 0 && (
              <p className="mt-4 text-[13px] text-muted-foreground">No student matches “{student}”.</p>
            )}

            {student.length <= 2 && (
              <div className="mt-6">
                <p className="text-[13px] text-muted-foreground">Or pick from the current list</p>
                <div className="mt-1 border-t-2 border-ink">
                  {everyone.slice(0, 6).map(row => <StudentRow key={row.id} student={row} onSelect={selectStudent} />)}
                  {everyone.length === 0 && <p className="py-6 text-[13px] text-muted-foreground">The student list is empty.</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="flex items-center gap-3 border-b-2 border-ink pb-5">
              <span className="grid h-10 w-10 place-items-center border-2 border-ink bg-gold text-[13px] font-bold shadow-[2px_2px_0_#0f2942]">
                {initials(selectedStudent?.name || student)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-[16px] font-bold text-ink">{selectedStudent?.name || student}</p>
                <p className="text-[13px] text-muted-foreground">{selectedStudent?.program} · {selectedStudent?.custom_id}</p>
              </div>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setStep(1)}>Change</Button>
            </div>

            <div className="mt-5 grid gap-4">
              <div>
                <label className="field-label" htmlFor="referral-subject">Subject</label>
                <select
                  id="referral-subject"
                  className="select-field"
                  value={selectedSubject}
                  onChange={(event) => setSelectedSubject(event.target.value)}
                >
                  <option value="">Choose a course</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.code} — {subject.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label" htmlFor="referral-topic">Topic or focus area</label>
                <Input
                  id="referral-topic"
                  placeholder="e.g. Linked lists and recursion"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                />
              </div>

              <div>
                <span className="field-label">Urgency</span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {URGENCIES.map(option => (
                    <label
                      key={option.value}
                      className={cn(
                        'flex cursor-pointer items-start gap-2.5 border-2 border-ink p-3 transition-[background-color,box-shadow]',
                        selectedUrgency === option.value ? 'bg-gold shadow-[3px_3px_0_#0f2942]' : 'bg-paper hover:bg-[#fff7d6]',
                      )}
                    >
                      <input
                        type="radio"
                        name="urgency"
                        value={option.value}
                        checked={selectedUrgency === option.value}
                        onChange={() => setSelectedUrgency(option.value)}
                        className="sr-only"
                      />
                      <span className={cn('mt-1 h-2 w-2 shrink-0 border border-ink', option.dot)} />
                      <span>
                        <span className="block text-[14px] font-bold text-ink">{option.label}</span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{option.desc}</span>
                      </span>
                      {selectedUrgency === option.value && <Check className="ml-auto h-3.5 w-3.5 shrink-0" strokeWidth={2} />}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="referral-hours">Recommended hours</label>
                  <Input
                    id="referral-hours"
                    type="number"
                    min={1}
                    max={10}
                    value={hours}
                    onChange={(event) => setHours(event.target.value)}
                  />
                  <p className="mt-1 text-[13px] text-muted-foreground">One session is 1.5 hours.</p>
                </div>
                <div className="flex items-end pb-1">
                  <p className="text-[13px] text-muted-foreground">The board tracks hours completed against this target.</p>
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="referral-notes">Notes for the tutor (optional)</label>
                <textarea
                  id="referral-notes"
                  className="textarea-field"
                  placeholder="What is the student struggling with? What should the tutor focus on?"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t-2 border-ink pt-5">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} disabled={!selectedSubject || !selectedUrgency || !selectedStudent}>
                Review referral
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
            <h2 className="font-display text-[20px] font-extrabold tracking-[-0.03em]">Check the entry</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">This will appear on the referral board and notify the student.</p>

            <div className="mt-5 border-2 border-ink bg-[#f8f1e2] p-4 shadow-[3px_3px_0_#0f2942]">
              <div className="space-y-3">
                {[
                  ['Student', selectedStudent?.name || student],
                  ['Program', selectedStudent?.program || '—'],
                  ['Student ID', selectedStudent?.custom_id || '—'],
                  ['Subject', subjectLabel],
                  ['Topic', topic || 'General review'],
                  ['Required hours', `${hours} hours`],
                  ['Referring faculty', user?.name || 'Faculty'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-4 border-b border-line pb-2.5 last:border-0 last:pb-0">
                    <span className="text-[13px] text-muted-foreground">{label}</span>
                    <span className="text-right text-[14px] font-bold text-ink">{value}</span>
                  </div>
                ))}
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[13px] text-muted-foreground">Urgency</span>
                  <span className="status-pill capitalize">
                    <span className={cn('status-dot', URGENCIES.find(u => u.value === selectedUrgency)?.dot)} />
                    {selectedUrgencyLabel}
                  </span>
                </div>
              </div>
              {notes && (
                <div className="mt-4 border-t border-line pt-3">
                  <p className="text-[13px] text-muted-foreground">Notes</p>
                  <p className="mt-1 text-[13px] leading-snug text-ink">“{notes}”</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t-2 border-ink pt-5">
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleRefer} disabled={submitting || !selectedStudent || !selectedSubject}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : null}
                {submitting ? 'Submitting…' : 'Submit referral'}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
