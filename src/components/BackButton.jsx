import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { reduceHistory, previousEntry, labelForPath } from '../lib/backStack.js';
import { useSeason } from '../lib/useSeason.js';
import './BackButton.css';

const STORE = 'pitbox.history.v1';
const load = () => {
  try { return JSON.parse(sessionStorage.getItem(STORE) ?? 'null'); } catch { return null; }
};
const save = (s) => {
  try { sessionStorage.setItem(STORE, JSON.stringify(s)); } catch { /* storage blocked */ }
};
let memory = load();

/**
 * "← Back to Standings": returns to the previous Pit Box page (same as the browser's back button,
 * so scroll position and history stay consistent). Hidden when there's no earlier page on the site.
 */
export default function BackButton() {
  const location = useLocation();
  const type = useNavigationType();
  const navigate = useNavigate();
  const { data: season } = useSeason();
  const [state, setState] = useState(memory);

  useEffect(() => {
    memory = reduceHistory(memory, { type, key: location.key, path: location.pathname + location.search });
    save(memory);
    setState(memory);
  }, [location.key, location.pathname, location.search, type]);

  const prev = previousEntry(state);
  const current = state?.entries?.[state.index];
  const visible = prev && current?.key === location.key;
  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.button
          key="back"
          type="button"
          className="back-button"
          onClick={() => navigate(-1)}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <span aria-hidden="true">←</span> Back to {labelForPath(prev.path, season)}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
