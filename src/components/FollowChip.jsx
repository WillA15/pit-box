import { motion } from 'framer-motion';
import { useBookmarks } from '../lib/useBookmarks.js';

/** A labelled follow toggle, for quick-pick lists. */
export default function FollowChip({ kind, id, label, color }) {
  const { has, toggle } = useBookmarks();
  const on = has(kind, id);
  return (
    <motion.button
      type="button"
      className={`follow-chip${on ? ' is-on' : ''}`}
      style={{ '--team': color }}
      aria-pressed={on}
      onClick={() => toggle(kind, id)}
      whileTap={{ scale: 0.94 }}
    >
      <span aria-hidden="true">{on ? '★' : '☆'}</span> {label}
    </motion.button>
  );
}
