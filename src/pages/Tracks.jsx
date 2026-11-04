import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSeason, useCircuits } from '../lib/useSeason.js';
import { nextRace, podium, weekendRange } from '../lib/schedule.js';
import { flag } from '../lib/flags.js';
import { teamColor } from '../lib/teams.js';
import { getNow } from '../lib/now.js';
import { Loading, LoadError, SourceNote } from '../components/Status.jsx';
import TrackMap from '../components/TrackMap.jsx';
import './Tracks.css';

export default function Tracks() {
  const { data: season, error, loading } = useSeason();
  const { data: circuits } = useCircuits();
  const next = season && nextRace(season.races, getNow());
  return (
    <section className="page">
      <div className="page-head">
        <h1>Tracks</h1>
        <SourceNote data={season} />
      </div>
      <p className="muted">Every circuit on the 2026 calendar. Pick one for its breakdown, results and every driver's pit strategy.</p>
      <p className="track-map__legend tracks__legend">
        <span><i className="track-map__key track-map__key--track" style={{ '--map-color': 'var(--muted)' }} /> Circuit (winner's team colour)</span>
        <span><i className="track-map__key track-map__key--pit" /> Pit lane</span>
      </p>
      {loading && <Loading />}
      {error && <LoadError error={error} />}
      {season && (
        <ol className="track-grid">
          {season.races.map((race, i) => {
            const winner = podium(race)[0];
            const c = circuits?.circuits[race.circuitId];
            return (
              <motion.li
                key={race.round}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.6) }}
              >
                <Link to={`/tracks/${race.round}`} className={`track-card${race.round === next?.round ? ' track-card--next' : ''}`} data-testid="track-card">
                  <div className="track-card__map">
                    <TrackMap outline={c?.outline} animated={false} color={winner ? teamColor(winner.constructorId) : 'var(--muted)'} label={`${race.circuitName} outline`} />
                  </div>
                  <div className="track-card__body">
                    <span className="track-card__round">R{race.round}</span>
                    <h2 className="track-card__name"><span aria-hidden="true">{flag(race.country)} </span>{race.name}</h2>
                    <p className="muted track-card__circuit">{race.circuitName}</p>
                    <div className="track-card__meta">
                      {race.sprint && <span className="tag tag--sprint">Sprint</span>}
                      {race.round === next?.round && <span className="tag tag--next">Next up</span>}
                      {winner ? (
                        <span className="track-card__winner" style={{ '--team': teamColor(winner.constructorId) }}>
                          🏆 {season.drivers[winner.driverId]?.familyName}
                        </span>
                      ) : (
                        <span className="muted">{weekendRange(race)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
