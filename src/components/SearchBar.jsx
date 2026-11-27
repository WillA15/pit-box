import { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import './SearchBar.css';

/**
 * The search text, kept in the address as ?q= so Back from a result returns to the same search.
 * Returns [query, setQuery].
 */
export function useSearchQuery() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const setQuery = (q) => setParams(q ? { q } : {}, { replace: true });
  return [query, setQuery];
}

/**
 * A labelled search box with a Clear button (Escape clears too) and a spoken count of matches.
 * `noun` names what's counted ("driver" -> "3 drivers found").
 */
export default function SearchBar({ id, label, placeholder, query, onChange, found, noun }) {
  const input = useRef(null);
  const searching = query.trim() !== '';
  const statusId = `${id}-status`;
  return (
    <div className="search-bar" role="search">
      <label htmlFor={id} className="search-bar__label">{label}</label>
      <div className="search-bar__field">
        <input
          ref={input}
          id={id}
          type="search"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onChange('')}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck="false"
          aria-describedby={statusId}
        />
        {searching && (
          <button type="button" className="btn btn--primary btn--sm search-bar__clear" onClick={() => { onChange(''); input.current?.focus(); }}>
            Clear
          </button>
        )}
      </div>
      <p id={statusId} className="muted search-bar__status" aria-live="polite">
        {searching && found > 0 ? `${found} ${noun}${found === 1 ? '' : 's'} found` : ''}
      </p>
    </div>
  );
}
