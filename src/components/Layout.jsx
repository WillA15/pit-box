import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSeason } from '../lib/useSeason.js';
import { pageTitle } from '../lib/pageTitle.js';
import BackButton from './BackButton.jsx';
import Logo from './Logo.jsx';
import BackToTop from './BackToTop.jsx';
import './Layout.css';

const TABS = [
  { to: '/standings', label: 'Standings' },
  { to: '/schedule', label: 'Schedule' },
  { to: '/tracks', label: 'Tracks' },
  { to: '/drivers', label: 'Drivers' },
  { to: '/pit-wall', label: 'My Pit Wall' },
];

export default function Layout() {
  const { pathname } = useLocation();
  const { data: season } = useSeason();
  const mainRef = useRef(null);
  const firstLoad = useRef(true);
  const headerRef = useRef(null);
  // Phone menu. It remembers the page it was opened on, so navigating closes it by itself.
  const [menuFor, setMenuFor] = useState(null);
  const menuOpen = menuFor === pathname;
  const setMenuOpen = (open) => setMenuFor(open ? pathname : null);

  // Also close it on Escape and on a tap outside the header.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenuFor(null); };
    const onDown = (e) => { if (!headerRef.current?.contains(e.target)) setMenuFor(null); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [menuOpen]);
  // Start every page at the top, before it paints (so there's no flash of the old position).
  // Braces matter: newer browsers return a Promise from scrollTo, which React would treat as a cleanup.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  // Each page gets its own tab title.
  useEffect(() => {
    document.title = pageTitle(pathname, season);
  }, [pathname, season]);

  // After navigating (not on first load) move keyboard focus to the page, so screen readers notice.
  useEffect(() => {
    if (firstLoad.current) { firstLoad.current = false; return; }
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className={`site-header${menuOpen ? ' is-open' : ''}`} ref={headerRef}>
        <div className="wrap site-header__inner">
          <NavLink to="/" className="logo" aria-label="Pit Box home">
            <Logo />
          </NavLink>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="main-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
          </button>
          <nav aria-label="Main" id="main-nav" className="site-nav">
            <ul className="tabs">
              {TABS.map((t) => (
                <li key={t.to}>
                  <NavLink to={t.to} className={({ isActive }) => `tab${isActive ? ' tab--active' : ''}`}>
                    {({ isActive }) => (
                      <>
                        {t.label}
                        {/* One underline that slides between tabs. */}
                        {isActive && <motion.span className="tab__bar" layoutId="tab-bar" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" className="wrap" ref={mainRef} tabIndex={-1}>
        <BackButton />
        {/* Each page eases in when you change tab (enter-only, so navigation never waits). */}
        <motion.div key={pathname.split('/')[1] || 'home'} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
          <Outlet />
        </motion.div>
        <BackToTop />
      </main>
      <footer className="site-footer">
        <div className="wrap">
          <p>
            Pit Box is an unofficial fan site and is not associated with Formula 1 companies or the FIA.
            Data from <a href="https://github.com/jolpica/jolpica-f1">Jolpica</a> and{' '}
            <a href="https://openf1.org">OpenF1</a>.
          </p>
        </div>
      </footer>
    </>
  );
}
