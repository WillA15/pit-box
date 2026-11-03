import { Link } from 'react-router-dom';
import { useSeason } from '../lib/useSeason.js';
import { Loading, LoadError, SourceNote } from '../components/Status.jsx';

export default function Landing() {
  const { data, error, loading } = useSeason();
  const done = data?.races.filter((r) => r.status === 'completed').length ?? 0;
  const leader = data?.driverStandings[0];
  const leaderDriver = leader && data.drivers[leader.driverId];
  return (
    <section className="page">
      <div>
        <span className="tag">F1 2026</span>
        <h1>Pit Box: Your one-stop strategy for all things F1 2026</h1>
        <p className="muted">The full landing page (countdown, title fight, podium) arrives in stage 6.</p>
      </div>
      {loading && <Loading />}
      {error && <LoadError error={error} />}
      {data && (
        <div className="panel">
          <p>
            {done} of {data.races.length} rounds complete.
            {leaderDriver && ` Championship leader: ${leaderDriver.givenName} ${leaderDriver.familyName} (${leader.points} pts).`}
          </p>
          <p>
            <Link to="/standings">Standings</Link> · <Link to="/schedule">Schedule</Link> ·{' '}
            <Link to="/tracks">Tracks</Link> · <Link to="/drivers">Driver Spotlight</Link>
          </p>
          <SourceNote data={data} />
        </div>
      )}
    </section>
  );
}
