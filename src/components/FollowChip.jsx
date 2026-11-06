import { motion } from 'framer-motion';
import { useBookmarks } from '../lib/useBookmarks.js';

/**
 * A labelled follow toggle. Pass `label` for a plain chip (quick-pick lists), or `name` to have
 * the text say what it does: "Follow Lando Norris", then "Following Lando Norris".
 */
export default function FollowChip({ kind, id, label, name, color }) {
  const { has, toggle } = useBookmarks();
  const on = has(kind, id);
  return (
    <motion.button
      type="button"
      className={`follow-chip${on ? ' is-on' : ''}`}
      style={{ '--team': color }}
      // With `name`, the words themselves change, so a pressed state would say it twice.
      aria-pressed={name ? undefined : on}
      onClick={() => toggle(kind, id)}
      whileTap={{ scale: 0.94 }}
    >
      <span aria-hidden="true">{on ? '★' : '☆'}</span> {name ? `${on ? 'Following' : 'Follow'} ${name}` : label}
    </motion.button>
  );
}
