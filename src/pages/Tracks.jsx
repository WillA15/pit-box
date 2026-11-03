import { useSeason } from '../lib/useSeason.js';
import { Loading, LoadError, SourceNote } from '../components/Status.jsx';

export default function Tracks() {
  const { data, error, loading } = useSeason();
  return (
    <section className="page">
      <h1>Tracks</h1>
      {loading && <Loading />}
      {error && <LoadError error={error} />}
      {data && (
        <>
          <p className="muted">Circuit breakdowns and strategy arrive in stage 3.</p>
          <SourceNote data={data} />
        </>
      )}
    </section>
  );
}
