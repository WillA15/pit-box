/** Side-on racing helmet (closed-face, visor, chin bar), drawn inline. */
export default function RacingHelmet({ size = 28, color = 'var(--accent)', title }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      {/* Shell: rounded crown sweeping back to a flat chin bar at the front */}
      <path d="M8 40C8 22 20 10 36 10c12 0 21 8 21 20v6c0 2-1 4-3 5l-6 3H14c-3 0-6-1.5-6-4z" fill={color} />
      {/* Lower shell / neck roll */}
      <path d="M12 44h36l-3 6c-.6 1.2-1.8 2-3.2 2H17c-1.6 0-3-1-3.5-2.4z" fill="#1c1f27" />
      {/* Visor opening and tinted visor */}
      <path d="M30 22h22c2.5 0 4 1.8 4 4v6c0 1.6-1.2 3-3 3H34c-3.5 0-6-2.6-6-6v-4c0-1.7.9-3 2-3z" fill="#0b0c10" />
      <path d="M33 25h19c1.2 0 2 .8 2 2v3.5c0 1-.7 1.6-1.6 1.6H35.5c-2 0-3.5-1.4-3.5-3.2V26c0-.6.4-1 1-1z" fill="#3a6ea5" opacity="0.9" />
      {/* Visor shine */}
      <path d="M36 27h12" stroke="#cfe3ff" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      {/* Racing stripe over the crown */}
      <path d="M12 34c3-12 12-20 24-20" fill="none" stroke="#f4f5f7" strokeWidth="3" strokeLinecap="round" />
      {/* Visor hinge */}
      <circle cx="29" cy="31" r="2.2" fill="#f4f5f7" />
    </svg>
  );
}
