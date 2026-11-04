import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useBookmarks } from '../lib/useBookmarks.js';
import './FollowStar.css';

/** ★ toggle for following a driver ("drivers") or team ("teams"). */
export default function FollowStar({ kind, id, label }) {
  const { has, toggle } = useBookmarks();
  const on = has(kind, id);
  const reduce = useReducedMotion();
  const [burst, setBurst] = useState(0);
  return (
    <motion.button
      type="button"
      className={`follow-star${on ? ' follow-star--on' : ''}`}
      aria-pressed={on}
      aria-label={`${on ? 'Unfollow' : 'Follow'} ${label}`}
      title={on ? `Following ${label}` : `Follow ${label}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!on) setBurst((b) => b + 1);
        toggle(kind, id);
      }}
      whileTap={{ scale: 1.4 }}
    >
      {on ? '★' : '☆'}
      {/* A little spark burst when you follow someone. */}
      <AnimatePresence>
        {burst > 0 && !reduce && on && (
          <span key={burst} className="follow-star__burst" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <motion.i
                key={i}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: Math.cos((i / 6) * Math.PI * 2) * 18, y: Math.sin((i / 6) * Math.PI * 2) * 18, opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                onAnimationComplete={() => i === 5 && setBurst(0)}
              />
            ))}
          </span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
