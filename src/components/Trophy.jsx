import { motion } from 'framer-motion';

/** Small gold trophy for a clinched championship. */
export default function Trophy({ title }) {
  return (
    <motion.span
      className="trophy"
      role="img"
      aria-label={title}
      title={title}
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 14 }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <defs>
          <linearGradient id="trophy-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe08a" />
            <stop offset="0.55" stopColor="#f5b301" />
            <stop offset="1" stopColor="#b87800" />
          </linearGradient>
        </defs>
        {/* handles */}
        <path d="M6 5H3.5a.5.5 0 0 0-.5.5C3 9 4.6 11 7 11.4M18 5h2.5a.5.5 0 0 1 .5.5c0 3.5-1.6 5.5-4 5.9" fill="none" stroke="url(#trophy-gold)" strokeWidth="1.8" strokeLinecap="round" />
        {/* cup */}
        <path d="M6 3h12v5.5a6 6 0 0 1-12 0z" fill="url(#trophy-gold)" />
        {/* stem + base */}
        <path d="M10.5 14h3l.6 4h-4.2z" fill="url(#trophy-gold)" />
        <rect x="7.5" y="18" width="9" height="3" rx="0.8" fill="url(#trophy-gold)" />
        {/* shine */}
        <path d="M8.6 4.6v3.6a3.6 3.6 0 0 0 1.4 2.8" fill="none" stroke="#fff6d6" strokeOpacity="0.7" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </motion.span>
  );
}
