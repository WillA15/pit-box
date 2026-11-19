/**
 * The Pit Box mark: a red board slanted like the site's tags, with the white bracket a car
 * stops in when it "boxes". The same shapes are in public/favicon.svg; keep them in step.
 */
export function LogoMark({ size = 28 }) {
  return (
    <svg className="logo-mark" viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <path d="M9 3h21l-7 26H2z" fill="var(--accent)" />
      <path d="M11.2 9.5h3.2l-3 11h9.4l3-11h3.2l-4 15H7.2z" fill="#fff" />
    </svg>
  );
}

/** Mark plus the "PIT BOX" wordmark. Always two words, BOX in red. */
export default function Logo({ size = 28 }) {
  return (
    <span className="logo-lockup">
      <LogoMark size={size} />
      <span className="logo-word">PIT <span>BOX</span></span>
    </span>
  );
}
