import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Video,
  Users,
  Search,
  Check,
  AlertCircle,
  Play,
  Loader2,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import Avatar from './ui/Avatar';
import { cn } from '../lib/utils';
import api from '../api';

function notifySessionSync(payload) {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('academix-session-sync');
      bc.postMessage(payload);
      bc.close();
    }
  } catch {
    // ignore
  }
}

export default function DemoSessionModal({ isOpen, onClose, user, role, showToast }) {
  const navigate = useNavigate();

  const [mode, setMode] = useState('online'); // 'online' | 'face_to_face'
  const [startState, setStartState] = useState('in-progress'); // 'in-progress' | 'upcoming'

  // Selected participants
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState(null);

  // Search queries & search states
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [showStudentSearch, setShowStudentSearch] = useState(false);

  const [tutorQuery, setTutorQuery] = useState('');
  const [tutorResults, setTutorResults] = useState([]);
  const [searchingTutors, setSearchingTutors] = useState(false);
  const [showTutorSearch, setShowTutorSearch] = useState(false);

  // Venues (for offline mode)
  const [venues, setVenues] = useState([]);
  const [selectedVenueId, setSelectedVenueId] = useState('');

  const [booting, setBooting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Initial user pre-population
  useEffect(() => {
    if (!isOpen || !user) return;
    setErrorMsg(null);

    if (role === 'learner') {
      setSelectedStudent({
        id: user.id,
        name: user.name,
        custom_id: user.custom_id,
        role: 'learner',
        avatar: user.avatar || user.avatar_url,
        program: user.program,
      });
      setShowStudentSearch(false);
      setShowTutorSearch(true);
    } else if (role === 'tutor' || (role === 'faculty' && user.is_verified)) {
      setSelectedTutor({
        id: user.id,
        name: user.name,
        custom_id: user.custom_id,
        role: user.role,
        avatar: user.avatar || user.avatar_url,
        department: user.department || user.program,
      });
      setShowTutorSearch(false);
      setShowStudentSearch(true);
    } else {
      setShowStudentSearch(true);
      setShowTutorSearch(true);
    }
  }, [isOpen, user, role]);

  // Load venues on modal open
  useEffect(() => {
    if (!isOpen) return;
    api.get('/venues')
      .then(({ venues: rows }) => {
        const active = (rows || []).filter((v) => v.is_active);
        setVenues(active);
        if (active.length > 0 && !selectedVenueId) {
          setSelectedVenueId(active[0].id);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Search students debounce
  useEffect(() => {
    if (!isOpen || !showStudentSearch) return undefined;
    setSearchingStudents(true);
    const timer = setTimeout(() => {
      api.get('/sessions/demo-participants', { role: 'learner', q: studentQuery })
        .then(({ participants }) => {
          setStudentResults(participants || []);
        })
        .catch(() => setStudentResults([]))
        .finally(() => setSearchingStudents(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [isOpen, showStudentSearch, studentQuery]);

  // Search tutors debounce
  useEffect(() => {
    if (!isOpen || !showTutorSearch) return undefined;
    setSearchingTutors(true);
    const timer = setTimeout(() => {
      api.get('/sessions/demo-participants', { role: 'tutor', q: tutorQuery })
        .then(({ participants }) => {
          setTutorResults(participants || []);
        })
        .catch(() => setTutorResults([]))
        .finally(() => setSearchingTutors(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [isOpen, showTutorSearch, tutorQuery]);

  if (!isOpen) return null;

  const isValidPair =
    selectedStudent &&
    selectedTutor &&
    selectedStudent.id !== selectedTutor.id &&
    selectedStudent.role === 'learner' &&
    (selectedTutor.role === 'tutor' || selectedTutor.role === 'faculty');

  const handleBootSession = async () => {
    if (!isValidPair) return;
    setBooting(true);
    setErrorMsg(null);

    try {
      const payload = {
        learnerId: selectedStudent.id,
        tutorId: selectedTutor.id,
        mode,
        venueId: mode === 'face_to_face' ? selectedVenueId || null : null,
        status: startState,
      };

      const res = await api.post('/sessions/demo-boot', payload);
      const session = res.session;

      notifySessionSync({ type: 'session-booted', session });
      showToast?.(`Demo ${mode === 'face_to_face' ? 'In-Person' : 'Online'} session ${session.session_code} booted!`, 'success');

      onClose();

      if (startState === 'in-progress') {
        navigate(`/session/${session.id}`);
      } else {
        navigate('/checkin');
      }
    } catch (e) {
      setErrorMsg(e.message || 'Failed to boot demo session');
    } finally {
      setBooting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-session-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/70 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !booting) onClose();
      }}
    >
      <div className="relative flex max-h-[90dvh] w-full max-w-[560px] flex-col overflow-hidden border-2 border-ink bg-paper shadow-[6px_6px_0_var(--color-ink)] animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-ink bg-surface-highlight px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center border-2 border-ink bg-gold text-ink font-black text-xs shadow-[1.5px_1.5px_0_var(--color-ink)]">
              ⚡
            </span>
            <div>
              <h2 id="demo-session-title" className="text-[15px] sm:text-[16px] font-black uppercase tracking-tight text-ink">
                Quick Demo Session
              </h2>
              <p className="text-[11px] font-medium text-muted-foreground">Instant testing between 1 student and 1 tutor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={booting}
            className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-paper text-ink transition-colors hover:bg-gold hover:text-ink disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2 border-2 border-destructive bg-destructive/10 p-2.5 text-[12px] font-bold text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Mode Selection */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              1. Session Mode
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setMode('online')}
                className={cn(
                  'flex items-center gap-2.5 border-2 border-ink p-2.5 text-left transition-all',
                  mode === 'online'
                    ? 'bg-gold font-bold shadow-[3px_3px_0_var(--color-ink)] -translate-y-0.5'
                    : 'bg-paper hover:bg-surface-highlight shadow-[1.5px_1.5px_0_var(--color-ink)]'
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink bg-paper">
                  <Video className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[13px] font-bold leading-tight">Online</div>
                  <div className="text-[10px] text-muted-foreground">Video + Chat</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('face_to_face')}
                className={cn(
                  'flex items-center gap-2.5 border-2 border-ink p-2.5 text-left transition-all',
                  mode === 'face_to_face'
                    ? 'bg-gold font-bold shadow-[3px_3px_0_var(--color-ink)] -translate-y-0.5'
                    : 'bg-paper hover:bg-surface-highlight shadow-[1.5px_1.5px_0_var(--color-ink)]'
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink bg-paper">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[13px] font-bold leading-tight">Face to Face</div>
                  <div className="text-[10px] text-muted-foreground">In-Person & Venue</div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Participant Pair Selection */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              2. Participants (Must be 1 Student + 1 Tutor)
            </label>

            <div className="space-y-3">
              {/* Student Slot */}
              <div className="border-2 border-ink bg-paper p-3 shadow-[2px_2px_0_var(--color-ink)]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Student (Learner)
                  </span>
                  {selectedStudent && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowStudentSearch(true);
                        setSelectedStudent(null);
                      }}
                      className="text-[11px] font-bold text-ink underline hover:text-gold"
                    >
                      Change
                    </button>
                  )}
                </div>

                {selectedStudent ? (
                  <div className="flex items-center gap-2.5 bg-surface-highlight border border-ink/20 p-2">
                    <Avatar name={selectedStudent.name} avatarUrl={selectedStudent.avatar} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold truncate">{selectedStudent.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {selectedStudent.custom_id} {selectedStudent.program ? `· ${selectedStudent.program}` : ''}
                      </div>
                    </div>
                    <span className="shrink-0 border border-ink/40 bg-paper px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink">
                      Student
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search student by name or ID (e.g. Mark, TE-...)"
                        value={studentQuery}
                        onChange={(e) => setStudentQuery(e.target.value)}
                        className="pl-8 text-[12px] h-9"
                        autoFocus={showStudentSearch}
                      />
                      {searchingStudents && (
                        <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <div className="mt-1.5 max-h-36 overflow-y-auto border border-ink/20 bg-paper divide-y divide-ink/10">
                      {studentResults.length === 0 && !searchingStudents ? (
                        <div className="p-2 text-center text-[11px] text-muted-foreground">No students found</div>
                      ) : (
                        studentResults.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedStudent(s);
                              setShowStudentSearch(false);
                            }}
                            className="flex w-full items-center gap-2 p-2 text-left hover:bg-gold transition-colors"
                          >
                            <Avatar name={s.name} avatarUrl={s.avatar} size="sm" />
                            <div className="min-w-0 flex-1">
                              <div className="text-[12px] font-bold truncate">{s.name}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {s.custom_id} {s.program ? `· ${s.program}` : ''}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Tutor Slot */}
              <div className="border-2 border-ink bg-paper p-3 shadow-[2px_2px_0_var(--color-ink)]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Tutor (Accredited Peer or Faculty)
                  </span>
                  {selectedTutor && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowTutorSearch(true);
                        setSelectedTutor(null);
                      }}
                      className="text-[11px] font-bold text-ink underline hover:text-gold"
                    >
                      Change
                    </button>
                  )}
                </div>

                {selectedTutor ? (
                  <div className="flex items-center gap-2.5 bg-surface-highlight border border-ink/20 p-2">
                    <Avatar name={selectedTutor.name} avatarUrl={selectedTutor.avatar} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold truncate">{selectedTutor.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {selectedTutor.custom_id} {selectedTutor.department ? `· ${selectedTutor.department}` : ''}
                      </div>
                    </div>
                    <span className="shrink-0 border border-ink/40 bg-gold px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink">
                      Tutor
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search tutor by name or ID (e.g. Bea, TU-...)"
                        value={tutorQuery}
                        onChange={(e) => setTutorQuery(e.target.value)}
                        className="pl-8 text-[12px] h-9"
                        autoFocus={showTutorSearch}
                      />
                      {searchingTutors && (
                        <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <div className="mt-1.5 max-h-36 overflow-y-auto border border-ink/20 bg-paper divide-y divide-ink/10">
                      {tutorResults.length === 0 && !searchingTutors ? (
                        <div className="p-2 text-center text-[11px] text-muted-foreground">No accredited tutors found</div>
                      ) : (
                        tutorResults.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setSelectedTutor(t);
                              setShowTutorSearch(false);
                            }}
                            className="flex w-full items-center gap-2 p-2 text-left hover:bg-gold transition-colors"
                          >
                            <Avatar name={t.name} avatarUrl={t.avatar} size="sm" />
                            <div className="min-w-0 flex-1">
                              <div className="text-[12px] font-bold truncate">{t.name}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {t.custom_id} {t.department ? `· ${t.department}` : ''}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Pill */}
            <div className="mt-2 flex items-center justify-between">
              {isValidPair ? (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-success">
                  <Check className="h-3.5 w-3.5" />
                  <span>Valid pair: 1 Student ↔ 1 Tutor</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Select one student and one tutor to proceed</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Venue (if offline) */}
          {mode === 'face_to_face' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                3. Campus Venue
              </label>
              <select
                value={selectedVenueId}
                onChange={(e) => setSelectedVenueId(e.target.value)}
                className="w-full border-2 border-ink bg-paper p-2 text-[12px] font-bold shadow-[2px_2px_0_var(--color-ink)] focus:outline-hidden"
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.building} - {v.room})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 4. Start State Option */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              {mode === 'face_to_face' ? '4.' : '3.'} Start State
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStartState('in-progress')}
                className={cn(
                  'border-2 border-ink p-2 text-left transition-all',
                  startState === 'in-progress'
                    ? 'bg-surface-highlight font-bold shadow-[2px_2px_0_var(--color-ink)]'
                    : 'bg-paper opacity-80 hover:opacity-100'
                )}
              >
                <div className="flex items-center gap-1.5 text-[12px] font-bold">
                  <Sparkles className="h-3.5 w-3.5 text-gold shrink-0" />
                  <span>Live Now (In-Progress)</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Auto-checks in; straight to room & video/timer
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStartState('upcoming')}
                className={cn(
                  'border-2 border-ink p-2 text-left transition-all',
                  startState === 'upcoming'
                    ? 'bg-surface-highlight font-bold shadow-[2px_2px_0_var(--color-ink)]'
                    : 'bg-paper opacity-80 hover:opacity-100'
                )}
              >
                <div className="flex items-center gap-1.5 text-[12px] font-bold">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>Ready for Check-In</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Scheduled for today; test code OTP/QR
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t-2 border-ink bg-surface-highlight px-4 py-3 sm:px-5">
          <Button variant="outline" onClick={onClose} disabled={booting} className="text-[12px]">
            Cancel
          </Button>
          <Button
            onClick={handleBootSession}
            disabled={!isValidPair || booting}
            className="gap-1.5 text-[12px] bg-gold text-ink font-bold hover:bg-gold/90"
          >
            {booting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Booting...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Boot Demo Session</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
