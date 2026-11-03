import { useParams } from 'react-router-dom';
import { useRace } from '../lib/useSeason.js';
import { Loading, LoadError, SourceNote } from '../components/Status.jsx';

export default function TrackDetail() {
  const { round } = useParams();
  const { data, error, loading } = useRace(round);
  return (
    <section className="page">
      <h1>Round {round}</h1>
      {loading && <Loading label="Loading strategy data" />}
      {error && <LoadError error={error} />}
      {data && (
        <>
          <p className="muted">
            Grand Prix strategies: {data.grandPrix?.strategies.length ?? 0} drivers · Sprint:{' '}
            {data.sprint ? 'yes' : 'no'}. Full track page arrives in stage 3.
          </p>
          <SourceNote data={data} />
        </>
      )}
    </section>
  );
}
