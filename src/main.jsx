import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import App from './App.jsx';
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';
import flagFontUrl from 'country-flag-emoji-polyfill/dist/TwemojiCountryFlags.woff2?url';
import './styles/global.css';

// Windows has no flag emoji; this loads a small flags-only font (bundled locally) only when needed.
polyfillCountryFlagEmojis('Twemoji Country Flags', flagFontUrl);

// Every page change (including Back) should land at the top, so turn off the browser's own
// scroll restoration, which would otherwise put you back where you were.
if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* "user" = follow the visitor's reduced-motion OS setting everywhere. */}
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
);
