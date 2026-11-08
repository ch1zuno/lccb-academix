import React, { useState } from 'react';
import { Check, X, Award, HelpCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export default function SessionQuizModal({ quiz = [], summary, onClose }) {
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  if (!Array.isArray(quiz) || quiz.length === 0) return null;

  const handleSelect = (qIdx, optIdx) => {
    if (submitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const calculateScore = () => {
    let correct = 0;
    quiz.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.answer) correct += 1;
    });
    return correct;
  };

  const score = calculateScore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-[680px] flex-col border-2 border-ink bg-paper shadow-[8px_8px_0_var(--color-ink)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-ink bg-gold p-4 text-ink">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            <h2 className="font-display text-[18px] font-extrabold uppercase tracking-tight">
              AI Session Review Quiz
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center border-2 border-ink bg-paper hover:bg-surface-highlight"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {summary && (
            <div className="border-2 border-ink bg-surface-quiet p-4 text-[13px] leading-relaxed shadow-[2px_2px_0_var(--color-ink)]">
              <p className="font-bold uppercase tracking-wider text-muted-foreground text-[11px] mb-1">
                Antigravity AI Lesson Synthesis
              </p>
              <div className="prose prose-sm max-w-none text-ink whitespace-pre-line">
                {summary}
              </div>
            </div>
          )}

          {submitted && (
            <div className="flex items-center justify-between border-2 border-ink bg-surface-highlight p-4">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Your Score</p>
                <p className="num text-[28px] font-extrabold text-ink">
                  {score} / {quiz.length} Correct
                </p>
              </div>
              <span className="neo-tag">
                {score === quiz.length ? '🌟 Mastery Achieved' : '📚 Keep Reviewing'}
              </span>
            </div>
          )}

          <div className="space-y-5">
            {quiz.map((q, qIdx) => {
              const answered = selectedAnswers[qIdx] != null;
              const isCorrect = selectedAnswers[qIdx] === q.answer;

              return (
                <div key={qIdx} className="border-2 border-ink bg-paper p-4 shadow-[3px_3px_0_var(--color-ink)]">
                  <p className="text-[14px] font-bold text-ink mb-3">
                    <span className="mr-1.5 font-mono text-[13px] bg-gold px-1.5 py-0.5 border border-ink">
                      Q{qIdx + 1}
                    </span>
                    {q.question}
                  </p>

                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = selectedAnswers[qIdx] === optIdx;
                      let optionStyle = 'bg-paper hover:bg-surface-highlight border-ink';

                      if (submitted) {
                        if (optIdx === q.answer) {
                          optionStyle = 'bg-emerald/20 border-emerald font-bold';
                        } else if (isSelected && !isCorrect) {
                          optionStyle = 'bg-crimson/20 border-crimson line-through';
                        }
                      } else if (isSelected) {
                        optionStyle = 'bg-gold border-ink font-bold';
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelect(qIdx, optIdx)}
                          className={cn(
                            'flex w-full items-start gap-2.5 border-2 p-2.5 text-left text-[13px] transition-colors',
                            optionStyle
                          )}
                        >
                          <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center border border-ink bg-paper text-[10px]">
                            {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                          </span>
                          <span className="flex-1">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {submitted && q.explanation && (
                    <div className="mt-3 flex items-start gap-2 border-t border-ink/15 pt-2 text-[12px] text-muted-foreground">
                      <HelpCircle className="h-4 w-4 shrink-0 text-ink mt-0.5" />
                      <span>{q.explanation}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t-2 border-ink bg-surface-quiet p-4">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {!submitted ? (
            <Button
              onClick={() => setSubmitted(true)}
              disabled={Object.keys(selectedAnswers).length < quiz.length}
            >
              Submit Quiz
            </Button>
          ) : (
            <Button onClick={onClose}>Finish Review</Button>
          )}
        </div>
      </div>
    </div>
  );
}

