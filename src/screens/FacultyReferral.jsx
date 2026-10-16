import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Search, UserPlus, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { STUDENTS, SUBJECTS, FACULTY } from '../data';

export default function FacultyReferral({ showToast }) {
  const [step, setStep] = useState(1);
  const [student, setStudent] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('');
  const [hours, setHours] = useState(4);
  const [notes, setNotes] = useState('');

  const filteredStudents = student.length > 2 
    ? STUDENTS.filter(s => s.name.toLowerCase().includes(student.toLowerCase()) || s.id.toLowerCase().includes(student.toLowerCase()))
    : [];

  const handleRefer = () => {
    showToast(`${selectedStudent?.name || student} successfully referred for peer tutoring.`, 'success');
    setStep(1);
    setStudent('');
    setSelectedStudent(null);
    setSelectedSubject('');
    setSelectedUrgency('');
    setHours(4);
    setNotes('');
  };

  const selectStudent = (s) => {
    setSelectedStudent(s);
    setStudent(s.name);
    setStep(2);
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">New Student Referral</h2>
          <p className="text-sm text-muted-foreground mt-1">Referring as <span className="font-semibold text-charcoal">Mrs. Bethel Tisuela</span> — IT Department</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span className={step >= 1 ? 'text-primary font-semibold' : ''}>1. Student</span>
          <span className="text-border">/</span>
          <span className={step >= 2 ? 'text-primary font-semibold' : ''}>2. Details</span>
          <span className="text-border">/</span>
          <span className={step >= 3 ? 'text-primary font-semibold' : ''}>3. Review</span>
        </div>
      </div>

      <Card className="shadow-lg border-border">
        <CardContent className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-charcoal">Search Student</h3>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input 
                  placeholder="Type student name or ID..." 
                  className="pl-10 h-12 text-lg"
                  value={student}
                  onChange={(e) => { setStudent(e.target.value); setSelectedStudent(null); }}
                />
              </div>
              
              {filteredStudents.length > 0 && (
                <div className="border rounded-md divide-y divide-border max-h-[320px] overflow-auto">
                  {filteredStudents.map(s => (
                    <div key={s.id} className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => selectStudent(s)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                          {s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-charcoal">{s.name}</p>
                          <p className="text-sm text-muted-foreground">ID: {s.id} • {s.program}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">Select</Button>
                    </div>
                  ))}
                </div>
              )}

              {student.length > 2 && filteredStudents.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No students found matching "{student}"
                </div>
              )}

              {student.length <= 2 && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Start typing at least 3 characters to search</p>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {STUDENTS.slice(0, 6).map(s => (
                      <button key={s.id} onClick={() => selectStudent(s)} className="px-3 py-1.5 rounded-full text-xs font-medium border border-border hover:border-primary hover:bg-primary/5 transition-colors text-charcoal">
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg border border-border">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                  {selectedStudent?.name.split(' ').map(n => n[0]).join('').slice(0, 2) || 'ST'}
                </div>
                <div>
                  <p className="font-semibold text-charcoal">{selectedStudent?.name || student}</p>
                  <p className="text-sm text-muted-foreground">{selectedStudent?.program || 'Student'} • {selectedStudent?.id || ''}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Subject / Course</label>
                  <select 
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                  >
                    <option value="">— Select a subject —</option>
                    {SUBJECTS.map(s => (
                      <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Urgency Level</label>
                  <div className="flex gap-4">
                    {[
                      { value: 'low', label: 'Low', color: 'primary', hoverColor: 'primary' },
                      { value: 'medium', label: 'Medium', color: 'amber', hoverColor: 'amber' },
                      { value: 'high', label: 'High', color: 'crimson', hoverColor: 'crimson' },
                    ].map(u => (
                      <label key={u.value} className={`flex-1 border rounded-md p-3 flex items-center gap-2 cursor-pointer transition-all ${selectedUrgency === u.value ? `border-${u.color} bg-${u.color}/5 ring-1 ring-${u.color}/30` : `hover:border-${u.hoverColor}`}`}>
                        <input type="radio" name="urgency" value={u.value} checked={selectedUrgency === u.value} onChange={() => setSelectedUrgency(u.value)} className="text-primary" />
                        {u.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Mandatory Hours Recommended</label>
                  <Input type="number" value={hours} onChange={(e) => setHours(e.target.value)} min={1} max={10} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Notes for Tutor (Optional)</label>
                  <textarea 
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]" 
                    placeholder="Describe the student's specific struggles, missed topics, or recommended focus areas..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)} disabled={!selectedSubject || !selectedUrgency}>Review Referral</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-amber/10 border border-amber/20 rounded-lg p-4 flex gap-3 text-amber-800">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">This will notify the student and add this referral to the centralized dashboard. An academic advisor will monitor the progress.</p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-50 p-4 border-b">
                  <h4 className="font-semibold text-charcoal">Referral Summary</h4>
                </div>
                <div className="p-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Student:</span>
                    <span className="font-medium text-charcoal">{selectedStudent?.name || student}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Program:</span>
                    <span className="font-medium text-charcoal">{selectedStudent?.program || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subject:</span>
                    <span className="font-medium text-charcoal">{selectedSubject}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Urgency:</span>
                    <Badge 
                      variant={selectedUrgency === 'high' ? 'destructive' : 'secondary'} 
                      className={selectedUrgency === 'high' ? 'bg-crimson' : selectedUrgency === 'medium' ? 'bg-amber/20 text-amber-800' : ''}
                    >
                      {selectedUrgency.charAt(0).toUpperCase() + selectedUrgency.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Required Hours:</span>
                    <span className="font-medium text-charcoal">{hours} Hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Referring Faculty:</span>
                    <span className="font-medium text-charcoal">Mrs. Bethel Tisuela</span>
                  </div>
                  {notes && (
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground block mb-1">Notes:</span>
                      <p className="text-charcoal italic text-xs bg-slate-50 p-2 rounded">{notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={handleRefer} className="bg-primary hover:bg-primary/90">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Submit Referral
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
