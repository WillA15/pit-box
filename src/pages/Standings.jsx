import { useSeason } from '../lib/useSeason.js';
import { Loading, LoadError, SourceNote } from '../components/Status.jsx';

export default function Standings() {
  const { data, error, loading } = useSeason();
  return (
    <section className="page">
      <h1>Standings</h1>
      {loading && <Loading />}
      {error && <LoadError error={error} />}
      {data && (
        <>
          <p className="muted">Driver and constructor standings arrive in stage 2.</p>
          <SourceNote data={data} />
        </>
      )}
    </section>
  );
}
