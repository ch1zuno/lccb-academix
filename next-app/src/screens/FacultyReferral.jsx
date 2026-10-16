"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Search, UserPlus, AlertTriangle } from 'lucide-react';

export default function FacultyReferral({ showToast }) {
  const [step, setStep] = useState(1);
  const [student, setStudent] = useState('');
  
  const handleRefer = () => {
    showToast('Student successfully referred for peer tutoring.', 'success');
    setStep(1);
    setStudent('');
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-3xl font-bold text-primary">New Student Referral</h2>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span className={step >= 1 ? 'text-primary' : ''}>1. Student</span>
          <span className="text-border">/</span>
          <span className={step >= 2 ? 'text-primary' : ''}>2. Details</span>
          <span className="text-border">/</span>
          <span className={step >= 3 ? 'text-primary' : ''}>3. Review</span>
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
                  onChange={(e) => setStudent(e.target.value)}
                />
              </div>
              
              {student.length > 2 && (
                <div className="border rounded-md divide-y divide-border">
                  <div className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer" onClick={() => { setStudent('Mark Antipo'); setStep(2); }}>
                    <div>
                      <p className="font-semibold text-charcoal">Mark Antipo</p>
                      <p className="text-sm text-muted-foreground">ID: 2024-0123 • BSIT 1st Year</p>
                    </div>
                    <Button variant="ghost" size="sm">Select</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg border border-border">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">MA</div>
                <div>
                  <p className="font-semibold text-charcoal">{student}</p>
                  <p className="text-sm text-muted-foreground">BSIT 1st Year</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Subject / Course</label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>IT 101 - Introduction to Computing</option>
                    <option>MATH 205 - Discrete Mathematics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Urgency Level</label>
                  <div className="flex gap-4">
                    <label className="flex-1 border rounded-md p-3 flex items-center gap-2 cursor-pointer hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                      <input type="radio" name="urgency" className="text-primary" /> Low
                    </label>
                    <label className="flex-1 border rounded-md p-3 flex items-center gap-2 cursor-pointer hover:border-amber has-[:checked]:border-amber has-[:checked]:bg-amber/5">
                      <input type="radio" name="urgency" className="text-amber" /> Medium
                    </label>
                    <label className="flex-1 border rounded-md p-3 flex items-center gap-2 cursor-pointer hover:border-crimson has-[:checked]:border-crimson has-[:checked]:bg-crimson/5">
                      <input type="radio" name="urgency" className="text-crimson" /> High
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Mandatory Hours Recommended</label>
                  <Input type="number" defaultValue={4} min={1} max={10} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Notes for Tutor (Optional)</label>
                  <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]" placeholder="Student is struggling with loops and conditional statements..."></textarea>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)}>Review Referral</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
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
                    <span className="font-medium text-charcoal">{student}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subject:</span>
                    <span className="font-medium text-charcoal">IT 101</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Urgency:</span>
                    <Badge variant="destructive" className="bg-crimson">High</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Required Hours:</span>
                    <span className="font-medium text-charcoal">4 Hours</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={handleRefer} className="bg-primary hover:bg-primary/90">Submit Referral</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
