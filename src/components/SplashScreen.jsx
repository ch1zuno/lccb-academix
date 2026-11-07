import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

/**
 * LCCB Academix Splash Screen
 * Neo-brutalist logo reveal with stroke-draw animation
 * Background: creamy white (#fffdf6), Logo: navy ink (#0f2942) + gold (#d4ac0d)
 */
export default function SplashScreen({ onComplete, duration = 2000 }) {
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationComplete(true);
      setTimeout(() => onComplete?.(), 300); // Fade out delay
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-paper"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.3 } }}
      >
        <div className="relative">
          {/* Animated Logo SVG */}
          <svg
            className="w-80 h-auto md:w-96"
            viewBox="0 0 318 88"
            role="img"
            aria-label="LCCB Academix"
          >
            <defs>
              {/* Clip path for reveal animation */}
              <clipPath id="logo-reveal">
                <rect className="reveal-rect" x="0" y="0" width="0" height="88">
                  <animate
                    attributeName="width"
                    from="0"
                    to="318"
                    dur="1.2s"
                    fill="freeze"
                    calcMode="spline"
                    keySplines="0.65 0 0.35 1"
                  />
                </rect>
              </clipPath>

              {/* Gradient for gold accent */}
              <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d4ac0d" />
                <stop offset="100%" stopColor="#e3bb19" />
              </linearGradient>
            </defs>

            {/* LCCB stamp - animated reveal */}
            <g clipPath="url(#logo-reveal)">
              <motion.g
                initial={{ rotate: -2, opacity: 0 }}
                animate={{ rotate: -2, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.65, 0, 0.35, 1] }}
                transform="rotate(-2 20 12)"
              >
                {/* Gold offset layer */}
                <text
                  x="7" y="18"
                  fontFamily='"Bricolage Grotesque", sans-serif'
                  fontWeight="800"
                  fontSize="15"
                  letterSpacing="2.5"
                  stroke="#0f2942"
                  strokeWidth="2.6"
                  fill="#d4ac0d"
                  rotate="2 -2 2 -1"
                  className="logo-stroke"
                >
                  LCCB
                </text>
                {/* Navy top layer */}
                <text
                  x="7" y="18"
                  fontFamily='"Bricolage Grotesque", sans-serif'
                  fontWeight="800"
                  fontSize="15"
                  letterSpacing="2.5"
                  stroke="#0f2942"
                  strokeWidth="0.8"
                  fill="#0f2942"
                  rotate="2 -2 2 -1"
                  className="logo-stroke"
                >
                  LCCB
                </text>
              </motion.g>
            </g>

            {/* ACADEMIX - main wordmark with staggered reveal */}
            <g clipPath="url(#logo-reveal)">
              {/* Gold offset shadow */}
              <motion.text
                className="academix-gold"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5, ease: [0.65, 0, 0.35, 1] }}
                x="9"
                y="84"
                fontFamily='"Bricolage Grotesque", sans-serif'
                fontWeight="800"
                fontSize="62"
                letterSpacing="-1.5"
                textLength="302"
                lengthAdjust="spacing"
                stroke="#0f2942"
                strokeWidth="3.4"
                fill="url(#gold-gradient)"
                rotate="-3 2 -1 3 -2 2 -1 2"
              >
                ACADEMIX
              </motion.text>

              {/* Navy main letters */}
              <motion.text
                className="academix-navy"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6, ease: [0.65, 0, 0.35, 1] }}
                x="4"
                y="80"
                fontFamily='"Bricolage Grotesque", sans-serif'
                fontWeight="800"
                fontSize="62"
                letterSpacing="-1.5"
                textLength="302"
                lengthAdjust="spacing"
                stroke="#0f2942"
                strokeWidth="4.2"
                fill="#0f2942"
                rotate="-3 2 -1 3 -2 2 -1 2"
              >
                ACADEMIX
              </motion.text>
            </g>
          </svg>

          {/* Loading indicator */}
          <motion.div
            className="mt-8 flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <div className="flex items-center gap-2">
              <motion.div
                className="w-2 h-2 bg-gold rounded-full"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="w-2 h-2 bg-gold rounded-full"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div
                className="w-2 h-2 bg-gold rounded-full"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
              />
            </div>
          </motion.div>
        </div>

        {/* Neo-brutalist decorative elements */}
        <motion.div
          className="absolute bottom-8 left-8 w-16 h-1 bg-gold"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
        />
        <motion.div
          className="absolute top-8 right-8 w-8 h-8 border-2 border-ink"
          initial={{ scale: 0, rotate: 45 }}
          animate={{ scale: 1, rotate: 45 }}
          transition={{ duration: 0.6, delay: 1.2, ease: [0.65, 0, 0.35, 1] }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
