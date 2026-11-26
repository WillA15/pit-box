import { useReducedMotion } from 'framer-motion';

/** Small "Back to top" button at the bottom middle of every page. */
export default function BackToTop() {
  const reduce = useReducedMotion();
  const toTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: reduce ? 'instant' : 'smooth' });
    // Send keyboard focus back to the top too, so the next Tab starts at the page header.
    document.getElementById('main')?.focus({ preventScroll: true });
  };
  return (
    <div className="back-to-top">
      <button type="button" className="btn btn--primary btn--sm" onClick={toTop}>Back to top</button>
    </div>
  );
}
