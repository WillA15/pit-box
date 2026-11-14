/** Shared loading / error / data-source indicators. */
import { useSeason } from '../lib/useSeason.js';
export function Loading({ label = 'Loading data' }) {
  return <p className="muted" role="status">{label}…</p>;
}

// onRetry is optional; without it the button re-requests the season data.
export function LoadError({ onRetry }) {
  const { retry } = useSeason();
  return (
    <div className="panel" role="alert">
      <h3>Couldn't load race data</h3>
      <p className="muted">Check your connection and try again.</p>
      <button type="button" className="btn" onClick={() => (onRetry ? onRetry() : retry ? retry() : window.location.reload())}>
        Try again
      </button>
    </div>
  );
}

// Every page shows season data here, so the "still checking" state is read from the season resource.
export function SourceNote({ data, liveLoading }) {
  const season = useSeason();
  if (!data) return null;
  if (liveLoading === undefined) liveLoading = season.liveLoading;
  const when = data.generatedAt ? new Date(data.generatedAt).toLocaleString() : 'unknown';
  const checking = data.source !== 'live' && liveLoading;
  return (
    <p className="source-note">
      {data.source === 'live' ? 'Live data' : 'Saved snapshot'} · updated {when}
      {checking && ' · checking for newer results…'}
    </p>
  );
}
