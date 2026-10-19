import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { FileText, CheckCircle, XCircle, Award, BookOpen, GraduationCap, Clock, Loader2 } from 'lucide-react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';

export default function SuperadminApprovals({ showToast }) {
  const [applications, setApplications] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    api.get('/accreditation/applications')
      .then(({ applications: rows }) => setApplications(rows))
      .catch((e) => { setApplications([]); showToast(e.message || 'Failed to load applications', 'error'); });
  }, []);

  const handleApprove = async (app) => {
    setBusy(app.id);
    try {
      await api.post(`/accreditation/${app.id}/approve`);
      setApplications(rows => rows.filter(a => a.id !== app.id));
      setSelectedApp(null);
      showToast(`Approved ${app.name} as a tutor (verified by you)!`, 'success');
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
      setApplications(rows => rows.filter(a => a.id !== app.id));
      setSelectedApp(null);
      showToast(`Rejected ${app.name}'s application.`, 'error');
    } catch (e) {
      showToast(e.message || 'Rejection failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">Tutor Applications</h1>
        <p className="text-muted-foreground mt-1">Review student records, achievements, and exam scores before approving new tutors.</p>
      </div>

      {applications === null ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading pending applications…</p>
          </CardContent>
        </Card>
      ) : applications.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-300 bg-slate-50">
          <CardContent className="flex flex-col items-center justify-center h-64">
            <CheckCircle className="w-16 h-16 text-emerald mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-charcoal mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground">There are no pending tutor applications to review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {applications.map((app) => (
              <motion.div
                key={app.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full flex flex-col hover:shadow-lg transition-shadow cursor-pointer border-t-4 border-t-primary" onClick={() => setSelectedApp(app)}>
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-500 border">
                        {app.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                        {app.exam_score == null ? 'No exam yet' : 'Pending'}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl text-primary">{app.name}</CardTitle>
                    <CardDescription className="text-sm font-semibold">{app.program || app.department}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Subjects Applied</p>
                      <div className="flex flex-wrap gap-1">
                        {app.subjects.map(sub => (
                          <Badge key={sub.code || sub} variant="outline" className="text-xs bg-slate-50">{sub.code || sub}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold">Exam Score</p>
                        <p className="text-lg font-bold text-charcoal">{app.exam_score == null ? '—' : `${app.exam_score}%`}</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4 border-t border-slate-100 flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={(e) => { e.stopPropagation(); setSelectedApp(app); }}>
                      View Records
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal for Detailed Review */}
      <AnimatePresence>
        {selectedApp && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-50"
              onClick={() => setSelectedApp(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-primary p-6 text-primary-foreground flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white text-base font-bold text-primary flex items-center justify-center">
                    {selectedApp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedApp.name}</h2>
                    <p className="text-primary-foreground/80">{selectedApp.program || selectedApp.department} • Applied {selectedApp.date_applied}</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wider font-semibold opacity-80 mb-1">Exam Score</p>
                  <div className="bg-white text-primary px-3 py-1 rounded-full text-xl font-bold shadow-inner">
                    {selectedApp.exam_score == null ? '—' : `${selectedApp.exam_score}%`}
                  </div>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                
                {/* Academic Records */}
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-charcoal mb-4 border-b pb-2">
                    <BookOpen className="w-5 h-5 text-primary" /> Academic Records (Latest Semester)
                  </h3>
                  {selectedApp.grades && Object.keys(selectedApp.grades).length > 0 ? (
                    <div className="grid grid-cols-4 gap-4">
                      {Object.entries(selectedApp.grades).map(([term, grade]) => (
                        <div key={term} className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">
                            {term.replace('preFinal', 'Pre-Final')}
                          </p>
                          <p className={`text-3xl font-black ${grade >= 90 ? 'text-emerald' : 'text-primary'}`}>
                            {grade}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No academic records provided in the application.</p>
                  )}
                </div>

                {/* Achievements */}
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-charcoal mb-4 border-b pb-2">
                    <Award className="w-5 h-5 text-secondary" /> Achievements & Extracurriculars
                  </h3>
                  {Array.isArray(selectedApp.achievements) && selectedApp.achievements.length > 0 ? (
                    <ul className="space-y-3">
                      {selectedApp.achievements.map((ach, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald shrink-0 mt-0.5" />
                          <span className="text-slate-700">{typeof ach === 'string' ? ach : (ach.title ?? JSON.stringify(ach))}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No achievements submitted.</p>
                  )}
                </div>

                {/* Requested Subjects */}
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-charcoal mb-4 border-b pb-2">
                    <GraduationCap className="w-5 h-5 text-primary" /> Subjects Applied For
                  </h3>
                  <div className="flex gap-2">
                    {selectedApp.subjects.map(sub => (
                      <Badge key={sub.code || sub} className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1 text-sm">{sub.code || sub}</Badge>
                    ))}
                  </div>
                </div>

              </div>

              <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setSelectedApp(null)}>Cancel</Button>
                <Button variant="destructive" disabled={busy === selectedApp.id} className="flex items-center gap-2" onClick={() => handleReject(selectedApp)}>
                  {busy === selectedApp.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Reject Application
                </Button>
                <Button disabled={busy === selectedApp.id} className="flex items-center gap-2 bg-emerald hover:bg-emerald-600 text-white" onClick={() => handleApprove(selectedApp)}>
                  <CheckCircle className="w-4 h-4" /> Approve Tutor
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
