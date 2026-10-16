"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Users, Clock, Award, TrendingUp, AlertTriangle } from 'lucide-react';
import { Progress } from '../components/ui/progress';

export default function Dashboard({ role, showToast }) {
  if (role === 'superadmin') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Institution Overview</h2>
          <p className="text-muted-foreground">Monitor the health and activity of the LCCB Academix platform.</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Active Tutors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">142</div>
              <p className="text-xs text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Point Inflation Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2.4%</div>
              <p className="text-xs text-muted-foreground text-emerald">Healthy ecosystem</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recovery Rate</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87%</div>
              <p className="text-xs text-muted-foreground">Referred students passing midterms</p>
            </CardContent>
          </Card>
        </div>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Tutoring Hours Logged (Area Chart Mock)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full bg-slate-100 rounded-lg flex items-center justify-center border border-dashed border-border text-muted-foreground">
              [Area Chart Visualization]
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (role === 'faculty') {
    return (
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary">Early-Warning Referral Board</h2>
            <p className="text-muted-foreground">Manage and track student interventions.</p>
          </div>
          <Button onClick={() => showToast('Opening Nominate Student Modal', 'info')}>+ Nominate Student</Button>
        </div>
        
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 pb-4">
          {['Flagged', 'Assigned', 'In Progress', 'Resolved'].map((col, i) => (
            <div key={col} className="bg-slate-100 rounded-lg p-4 flex flex-col h-full border border-border">
              <h3 className="font-semibold text-charcoal mb-4 flex justify-between">
                {col} <Badge variant="secondary">{i === 0 ? 2 : i === 1 ? 1 : 0}</Badge>
              </h3>
              
              {i === 0 && (
                <Card className="mb-3 cursor-pointer hover:border-primary transition-colors hover:shadow-md">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-md">Mark Antipo</CardTitle>
                    <CardDescription>IT 101 • Missed 3 classes</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Badge variant="destructive" className="bg-crimson">High Urgency</Badge>
                  </CardContent>
                </Card>
              )}
              {i === 0 && (
                <Card className="mb-3 cursor-pointer hover:border-primary transition-colors hover:shadow-md">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-md">Julian Gemelo</CardTitle>
                    <CardDescription>MATH 205 • Failed Quiz 1</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Badge variant="amber">Medium Urgency</Badge>
                  </CardContent>
                </Card>
              )}
              {i === 1 && (
                <Card className="mb-3 cursor-pointer hover:border-primary transition-colors hover:shadow-md opacity-80">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-md">Sarah Dela Cruz</CardTitle>
                    <CardDescription>ACCT 102 • Assigned to Tutor</CardDescription>
                  </CardHeader>
                </Card>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (role === 'tutor') {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 bg-gradient-to-br from-primary to-primary/90 text-white shadow-xl relative overflow-hidden border-0">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Award className="w-32 h-32" />
            </div>
            <CardHeader>
              <CardTitle className="text-white text-lg font-medium opacity-80">Community Points Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold text-secondary mb-2">1,250 <span className="text-xl font-normal text-white/60">pts</span></div>
              <p className="text-sm text-white/80 flex items-center gap-2"><Clock className="w-4 h-4" /> 45 Total Sessions Completed</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-md border-border">
            <CardHeader>
              <CardTitle className="text-lg">My Badges</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="px-3 py-1 bg-secondary/20 text-secondary-foreground hover:bg-secondary/30">🏆 Top 10% Tutor</Badge>
              <Badge variant="secondary" className="px-3 py-1 bg-secondary/20 text-secondary-foreground hover:bg-secondary/30">💻 IT Specialist</Badge>
              <Badge variant="secondary" className="px-3 py-1 bg-secondary/20 text-secondary-foreground hover:bg-secondary/30">⏱️ Fast Responder</Badge>
            </CardContent>
          </Card>
        </div>

        <h3 className="text-xl font-bold text-primary mt-8 mb-4">Upcoming Sessions</h3>
        <Card className="shadow-sm border-border hover:border-primary/50 transition-colors">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-charcoal font-bold">
                  MA
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-charcoal">Mark Antipo</h4>
                  <p className="text-sm text-muted-foreground">IT 101 • Variables & Loops</p>
                </div>
              </div>
              <div className="text-right mt-4 sm:mt-0">
                <p className="font-semibold text-primary">Today, 2:00 PM</p>
                <p className="text-sm text-muted-foreground">Library, Study Room A</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tutee Role
  return (
    <div className="space-y-6">
      <div className="bg-amber/10 border border-amber/20 rounded-lg p-4 flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-amber shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-amber-800">Active Faculty Referral for ACCT 102</h3>
          <p className="text-sm text-amber-700/80 mt-1">Prof. Santos has recommended 4 hours of peer tutoring before the midterms.</p>
          <Button variant="outline" size="sm" className="mt-3 border-amber text-amber-800 hover:bg-amber/20">Find a Tutor Now</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Mandatory Hours Progress</CardTitle>
            <CardDescription>ACCT 102 Referral</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="relative w-40 h-40 flex items-center justify-center mb-4">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="#0F2942" strokeWidth="10" strokeDasharray={`${2.5/4 * 283} 283`} strokeLinecap="round" className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-primary">2.5</span>
                <span className="text-xs text-muted-foreground">/ 4.0 hrs</span>
              </div>
            </div>
            <p className="text-sm font-medium text-charcoal">Keep going! You're almost there.</p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="font-semibold text-charcoal">Julian Gemelo</p>
                <p className="text-sm text-muted-foreground">ACCT 102 • Basic Accounting</p>
              </div>
              <Badge variant="emerald" className="bg-emerald">Completed</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-charcoal">Sarah Dela Cruz</p>
                <p className="text-sm text-muted-foreground">IT 101 • Introduction</p>
              </div>
              <Badge variant="emerald" className="bg-emerald">Completed</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
