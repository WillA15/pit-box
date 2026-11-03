import { useSeason } from '../lib/useSeason.js';
import { Loading, LoadError, SourceNote } from '../components/Status.jsx';

export default function Schedule() {
  const { data, error, loading } = useSeason();
  return (
    <section className="page">
      <h1>Schedule</h1>
      {loading && <Loading />}
      {error && <LoadError error={error} />}
      {data && (
        <>
          <p className="muted">The full 2026 calendar arrives in stage 2.</p>
          <SourceNote data={data} />
        </>
      )}
    </section>
  );
}
