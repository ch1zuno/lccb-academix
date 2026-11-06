"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Bookmark, Clock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TutorExam({ showToast }) {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 mins
  const [currentQ, setCurrentQ] = useState(0);

  useEffect(() => {
    let timer;
    if (started && !finished && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [started, finished, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleFinish = () => {
    setFinished(true);
    showToast('Exam submitted successfully!', 'success');
  };

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-secondary/20 blur-xl rounded-full" />
            <CheckCircle2 className="w-32 h-32 text-secondary relative z-10 mx-auto mb-6 drop-shadow-lg" />
          </div>
          <h2 className="text-4xl font-bold text-primary mb-4">Congratulations!</h2>
          <p className="text-xl text-muted-foreground mb-8">You passed the IT 101 Qualification Exam with a score of 92%.</p>
          
          <Card className="bg-gradient-to-br from-primary to-primary/80 border-0 shadow-2xl inline-block text-left mb-8 max-w-sm w-full">
            <CardContent className="p-8 text-center text-white">
              <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/20 shadow-inner">
                <span className="text-2xl font-bold text-primary">IT</span>
              </div>
              <h3 className="text-2xl font-bold mb-1">IT 101 Certified Tutor</h3>
              <p className="text-white/80 text-sm">Issued by LCCB Academix</p>
            </CardContent>
          </Card>
          
          <div>
            <Button size="lg" className="shadow-md">View Dashboard</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Tutor Qualification Examination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-charcoal">
            <p>You are about to take the qualification exam for <strong>IT 101: Introduction to Computing</strong>.</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Time limit: 30 minutes</li>
              <li>Number of questions: 40 multiple choice</li>
              <li>Required passing score: 85%</li>
              <li>Do not close this window during the exam.</li>
            </ul>
          </CardContent>
          <CardFooter className="flex justify-end gap-4 border-t pt-6 bg-slate-50">
            <Button variant="outline">Cancel</Button>
            <Button onClick={() => { setStarted(true); showToast('Exam started. Good luck!', 'info'); }}>Start Examination</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col pt-4">
      <div className="sticky top-0 bg-white z-10 pb-4 mb-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-primary">IT 101 Exam</h2>
          <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-border">
            <Clock className={`w-5 h-5 ${timeLeft < 300 ? 'text-crimson animate-pulse' : 'text-primary'}`} />
            <span className={`font-mono font-bold text-lg ${timeLeft < 300 ? 'text-crimson' : 'text-primary'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
        <Progress value={(currentQ / 40) * 100} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground mt-2 font-medium">
          <span>Question {currentQ + 1} of 40</span>
          <span>{Math.round((currentQ / 40) * 100)}% Completed</span>
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
                {currentQ + 1}. Which of the following data structures operates on a Last-In, First-Out (LIFO) principle?
              </h3>
              <div className="space-y-3">
                {['Queue', 'Stack', 'Linked List', 'Array'].map((opt, i) => (
                  <label key={i} className="flex items-center p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-1 has-[:checked]:ring-primary">
                    <input type="radio" name="q1" className="w-4 h-4 text-primary focus:ring-primary border-slate-300" />
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
          {currentQ < 39 ? (
            <Button onClick={() => setCurrentQ(Math.min(39, currentQ + 1))}>Next Question</Button>
          ) : (
            <Button onClick={handleFinish} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">Submit Exam</Button>
          )}
        </div>
      </div>
    </div>
  );
}
