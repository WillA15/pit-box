import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import './Layout.css';

const TABS = [
  { to: '/standings', label: 'Standings' },
  { to: '/schedule', label: 'Schedule' },
  { to: '/tracks', label: 'Tracks' },
  { to: '/drivers', label: 'Driver Spotlight' },
  { to: '/pit-wall', label: 'My Pit Wall' },
];

export default function Layout() {
  const { pathname } = useLocation();
  // Braces matter: newer browsers return a Promise from scrollTo, which React would treat as a cleanup.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="wrap site-header__inner">
          <NavLink to="/" className="logo" aria-label="Pit Box home">
            PIT<span>BOX</span>
          </NavLink>
          <nav aria-label="Main">
            <ul className="tabs">
              {TABS.map((t) => (
                <li key={t.to}>
                  <NavLink to={t.to} className={({ isActive }) => `tab${isActive ? ' tab--active' : ''}`}>
                    {t.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" className="wrap">
        <Outlet />
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
