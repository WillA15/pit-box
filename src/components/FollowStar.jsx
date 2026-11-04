import { motion } from 'framer-motion';
import { useBookmarks } from '../lib/useBookmarks.js';
import './FollowStar.css';

/** ★ toggle for following a driver ("drivers") or team ("teams"). */
export default function FollowStar({ kind, id, label }) {
  const { has, toggle } = useBookmarks();
  const on = has(kind, id);
  return (
    <motion.button
      type="button"
      className={`follow-star${on ? ' follow-star--on' : ''}`}
      aria-pressed={on}
      aria-label={`${on ? 'Unfollow' : 'Follow'} ${label}`}
      title={on ? `Following ${label}` : `Follow ${label}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(kind, id); }}
      whileTap={{ scale: 1.4 }}
    >
      {on ? '★' : '☆'}
    </motion.button>
  );
}
