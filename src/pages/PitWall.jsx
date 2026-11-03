import { useSeason } from '../lib/useSeason.js';
import { Loading, LoadError, SourceNote } from '../components/Status.jsx';

export default function PitWall() {
  const { data, error, loading } = useSeason();
  return (
    <section className="page">
      <h1>My Pit Wall</h1>
      {loading && <Loading />}
      {error && <LoadError error={error} />}
      {data && (
        <>
          <p className="muted">Your followed drivers and teams arrive in stage 5.</p>
          <SourceNote data={data} />
        </>
      )}
    </section>
  );
}
