const PATHS = {
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="5" r="2" />
      <path d="M8 19h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5" />
      <path d="M12 14v4M8.5 20.5h7M9.5 18h5" />
    </>
  ),
  star: <path d="m12 3.5 2.7 5.5 6 .9-4.35 4.25 1 6-5.35-2.85L6.65 20.15l1-6L3.3 9.9l6-.9z" />,
  flame: <path d="M12 3c.5 3-3.5 5-3.5 9.5a3.5 3.5 0 0 0 7 0c0-1.2-.5-2-1-2.8 2.7 1 4.5 3.3 4.5 6.3A7 7 0 0 1 12 22a7 7 0 0 1-7-7c0-4.5 4-6.5 4.5-9.5C10.5 5 11.5 4 12 3z" />,
  play: <path d="M7 4.5v15a.5.5 0 0 0 .75.43l12.5-7.5a.5.5 0 0 0 0-.86L7.750 4.070A.5.5 0 0 0 7 4.5z" />,
  pause: (
    <>
      <rect x="6" y="4.5" width="4" height="15" rx="1" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  helmet: (
    <>
      <path d="M3.5 15.5C3.5 9 7.5 5 12.5 5c4.7 0 8 3.5 8 8.5v2a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2z" />
      <path d="M12 9.5h8.5v4H12a2 2 0 0 1 0-4z" />
    </>
  ),
};

/** Lucide-style 24px line icon. Decorative unless `title` is given. */
export default function Icon({ name, size = 20, title, className }) {
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true };
  return (
    <svg
      className={`icon${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...a11y}
    >
      {title && <title>{title}</title>}
      {PATHS[name]}
    </svg>
  );
}
