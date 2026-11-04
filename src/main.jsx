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
