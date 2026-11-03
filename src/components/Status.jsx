/** Shared loading / error / data-source indicators. */
export function Loading({ label = 'Loading data' }) {
  return <p className="muted" role="status">{label}…</p>;
}

export function LoadError({ error }) {
  return (
    <div className="panel" role="alert">
      <h3>Couldn't load race data</h3>
      <p className="muted">Both the live feed and the saved snapshot failed. {String(error?.message ?? '')}</p>
    </div>
  );
}

export function SourceNote({ data }) {
  if (!data) return null;
  const when = data.generatedAt ? new Date(data.generatedAt).toLocaleString() : 'unknown';
  return (
    <p className="source-note">
      {data.source === 'live' ? 'Live data' : 'Saved snapshot'} · updated {when}
    </p>
  );
}
