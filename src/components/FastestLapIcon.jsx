import { motion } from 'framer-motion';

/** Purple stopwatch for the fastest lap (purple = fastest, as on F1 timing screens). */
export default function FastestLapIcon({ title = 'Fastest lap', size = 18 }) {
  return (
    <motion.span
      className="fastest-lap-icon"
      role="img"
      aria-label={title}
      title={title}
      initial={{ scale: 0, rotate: 30 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.1 }}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <rect x="9.5" y="1.5" width="5" height="2.4" rx="0.8" fill="#c77dff" />
        <path d="M18.2 5.2l1.6 1.6" stroke="#c77dff" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="13.5" r="8.2" fill="#2a1240" stroke="#c77dff" strokeWidth="2.2" />
        <path d="M12 13.5V8.6" stroke="#f3e6ff" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 13.5l3.2 2" stroke="#c77dff" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="13.5" r="1.3" fill="#f3e6ff" />
      </svg>
    </motion.span>
  );
}
