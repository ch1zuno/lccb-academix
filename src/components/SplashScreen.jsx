import React, { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Logo2D from './Logo2D';

/**
 * LCCB Academix Splash Screen
 * Clean white background with authentic Logo2D brandmark from the login page.
 * Responsive, accessible role="status", respects prefers-reduced-motion.
 */
export default function SplashScreen({ onComplete, duration = 1200 }) {
  const shouldReduceMotion = useReducedMotion();
  const effectiveDuration = shouldReduceMotion ? 200 : duration;

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, effectiveDuration);
    return () => clearTimeout(timer);
  }, [effectiveDuration, onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        role="status"
        aria-live="polite"
        aria-label="Loading LCCB Academix"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-4 text-center selection:bg-gold selection:text-ink"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: shouldReduceMotion ? 0.1 : 0.25 } }}
      >
        <motion.div
          className="flex flex-col items-center justify-center"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: shouldReduceMotion ? 0.1 : 0.4, ease: [0.65, 0, 0.35, 1] }}
        >
          {/* Authentic 2D logo from login page */}
          <Logo2D className="h-auto w-72 max-w-full sm:w-80 md:w-96 drop-shadow-[0_4px_16px_rgba(15,41,66,0.08)]" />

          {/* Subtitle & tagline matching login page */}
          <div className="mt-4 text-center">
            <small className="block font-sans text-xs font-semibold uppercase tracking-wider text-[#5b5a52]">
              La Consolacion College Bacolod
            </small>
            <h1 className="mt-1 font-display text-lg font-bold text-[#0f2942] sm:text-xl">
              Peer tutoring that counts.
            </h1>
          </div>

          {/* Subtle loading indicator */}
          <div className="mt-6 flex items-center justify-center gap-2" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#0f2942] animate-pulse" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#d4ac0d] animate-pulse [animation-delay:200ms]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#0f2942] animate-pulse [animation-delay:400ms]" />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
