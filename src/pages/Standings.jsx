import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useSeason } from '../lib/useSeason.js';
import { useBookmarks } from '../lib/useBookmarks.js';
import { computeStandingsHistory, interpolateStandings, championClinch } from '../lib/standingsHistory.js';
import { useTween } from '../lib/useTween.js';
import { teamColor } from '../lib/teams.js';
import { Loading, LoadError, SourceNote } from '../components/Status.jsx';
import Segmented from '../components/Segmented.jsx';
import FollowStar from '../components/FollowStar.jsx';
import PointsChart from '../components/PointsChart.jsx';
import RoundTrack from '../components/RoundTrack.jsx';
import Trophy from '../components/Trophy.jsx';
import './Standings.css';

const KIND_OPTIONS = [
  { value: 'drivers', label: 'Drivers' },
  { value: 'constructors', label: 'Constructors' },
];

export default function Standings() {
  const { data, error, loading } = useSeason();
  return (
    <section className="page">
      <div className="page-head">
        <h1>Standings</h1>
        <SourceNote data={data} />
      </div>
      {loading && <Loading />}
      {error && <LoadError error={error} />}
      {data && <StandingsBody season={data} />}
    </section>
  );
}

// Replay pacing at 1×: glide to each race's totals, then hold so the result can sink in.
// 18 transitions × (1.3s + 0.8s) ≈ 38s for the full season.
const MOVE_MS = 1300;
const HOLD_MS = 800;
const SNAP_MS = 700;
const REWIND_MS = 1500;
const SPEEDS = [
  { value: 0.5, label: '0.5×' },
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
];
const FLASH_MS = 1400;

function StandingsBody({ season }) {
  const history = useMemo(() => computeStandingsHistory(season.races), [season]);
  const lastIdx = history.rounds.length - 1;
  const champions = useMemo(
    () => ({ drivers: championClinch(history, season.races, 'drivers'), constructors: championClinch(history, season.races, 'constructors') }),
    [history, season.races],
  );
  const [kind, setKind] = useState('drivers');
  const [onlyFollowed, setOnlyFollowed] = useState(false);
  const reduceMotion = useReducedMotion();
  // t is a fractional index into history.rounds: 3.5 = halfway between the 4th and 5th rounds.
  const tween = useTween(lastIdx);
  const t = tween.value;
  const [playing, setPlaying] = useState(false);
  const [holding, setHolding] = useState(false);
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(1);
  speedRef.current = speed;
  const playToken = useRef(0);
  const holdTimer = useRef(0);
  const bm = useBookmarks();
  const bmKind = kind === 'drivers' ? 'drivers' : 'teams';
  const followed = bm[bmKind];

  const nearestIdx = Math.round(t);
  const round = history.rounds[nearestIdx];
  const race = season.races.find((r) => r.round === round);

  const stopPlayback = () => {
    playToken.current += 1;
    clearTimeout(holdTimer.current);
    setHolding(false);
  };
  useEffect(() => () => stopPlayback(), []);

  // Always open on the latest round. If newer live data adds a round after the snapshot
  // rendered, follow it, unless the viewer has already picked a round or started a replay.
  const touched = useRef(false);
  useEffect(() => {
    if (!touched.current) tween.set(lastIdx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastIdx]);

  const play = () => {
    touched.current = true;
    stopPlayback();
    const token = playToken.current;
    const live = () => token === playToken.current;
    const atEnd = tween.ref.current >= lastIdx - 0.01;
    setPlaying(true);

    const hold = (next) => {
      setHolding(true);
      holdTimer.current = setTimeout(() => { setHolding(false); if (live()) next(); }, HOLD_MS / speedRef.current);
    };
    // Move to round index i, hold, then continue to i + 1.
    const stepTo = (i) => {
      if (!live()) return;
      if (i > lastIdx) { setPlaying(false); return; }
      if (reduceMotion) { tween.set(i); hold(() => stepTo(i + 1)); return; }
      tween.tweenTo(i, { duration: MOVE_MS / speedRef.current, ease: 'inOut', onDone: () => live() && hold(() => stepTo(i + 1)) });
    };

    if (atEnd) {
      // Rewind to round 1 first so rows glide back instead of jumping.
      if (reduceMotion) { tween.set(0); hold(() => stepTo(1)); }
      else tween.tweenTo(0, { duration: REWIND_MS, ease: 'inOut', onDone: () => live() && hold(() => stepTo(1)) });
    } else {
      stepTo(Math.floor(tween.ref.current) + 1);
    }
  };
  const pause = () => { stopPlayback(); tween.stop(); setPlaying(false); };
  const snap = (target) => {
    touched.current = true;
    stopPlayback();
    setPlaying(false);
    const clamped = Math.min(Math.max(target, 0), lastIdx);
    if (reduceMotion) tween.set(clamped);
    else tween.tweenTo(clamped, { duration: SNAP_MS, ease: 'inOut' });
  };

  const rows = interpolateStandings(history, kind, t);
  // Arrows compare against the round before the one we're nearest to.
  const prevRows = nearestIdx > 0 ? history[kind][history.rounds[nearestIdx - 1]] : null;
  const prevPos = new Map(prevRows?.map((r) => [r.id, r.pos]) ?? []);
  const changes = Object.fromEntries(rows.map((r) => [r.id, prevPos.has(r.id) ? prevPos.get(r.id) - r.pos : 0]));

  // Overtake flashes: compare each row's position with the previous frame.
  const lastPos = useRef({ kind, pos: new Map() });
  const flashes = useRef(new Map()); // id -> { dir: 'up' | 'down', key }
  if (lastPos.current.kind !== kind) lastPos.current = { kind, pos: new Map(), fresh: true };
  const nowMs = typeof performance !== 'undefined' ? performance.now() : 0;
  for (const r of rows) {
    const before = lastPos.current.pos.get(r.id);
    if (!lastPos.current.fresh && before !== undefined && before !== r.pos && !reduceMotion) {
      flashes.current.set(r.id, { dir: r.pos < before ? 'up' : 'down', key: nowMs, until: nowMs + FLASH_MS });
    }
    lastPos.current.pos.set(r.id, r.pos);
  }
  lastPos.current.fresh = false;
  const flashFor = (id) => {
    const f = flashes.current.get(id);
    return f && f.until > nowMs ? f : null;
  };

  const leaderPts = rows[0]?.points ?? 0;
  const shown = onlyFollowed ? rows.filter((r) => followed.includes(r.id)) : rows;

  const nameOf = (id) => {
    if (kind === 'constructors') return season.constructors[id]?.name ?? id;
    const d = season.drivers[id];
    return d ? `${d.givenName} ${d.familyName}` : id;
  };
  const teamOf = (r) => (kind === 'constructors' ? r.id : r.constructorId);

  // Chart: top 5 at this round plus anything followed.
  const chartIds = [...new Set([...rows.slice(0, 5).map((r) => r.id), ...followed.filter((id) => rows.some((r) => r.id === id))])];
  const seenTeams = new Set();
  const series = chartIds.map((id) => {
    const r = rows.find((x) => x.id === id);
    const team = teamOf(r);
    const dashed = seenTeams.has(team);
    seenTeams.add(team);
    return {
      id,
      label: kind === 'drivers' ? season.drivers[id]?.code ?? id : season.constructors[id]?.name ?? id,
      color: teamColor(team),
      dashed,
      highlight: followed.includes(id),
    };
  });

  return (
    <>
      <div className="toolbar">
        <Segmented label="Standings type" options={KIND_OPTIONS} value={kind} onChange={setKind} />
        <label className="check">
          <input type="checkbox" checked={onlyFollowed} onChange={(e) => setOnlyFollowed(e.target.checked)} />
          Bookmarked only
        </label>
      </div>

      <div className="panel round-slider">
        <div className="round-slider__head">
          <div className={`round-slider__now${holding ? ' is-holding' : ''}`} aria-live="polite">
            <span className="tag">After round {round}</span>
            <h2 className="round-slider__race">
              {race ? (
                <Link to={`/tracks/${race.round}`} className="round-slider__race-link" title={`Open the ${race.name} track page`}>
                  {race.name}
                </Link>
              ) : null}
            </h2>
          </div>
          <div className="round-slider__controls">
            <Segmented label="Replay speed" options={SPEEDS} value={speed} onChange={setSpeed} />
            <button type="button" className="btn btn--primary" onClick={playing ? pause : play}>
              {playing ? '❚❚ Pause' : '▶ Replay season'}
            </button>
          </div>
        </div>
        <RoundTrack
          rounds={history.rounds}
          races={season.races}
          t={t}
          label="Choose a round"
          onSelect={(i) => snap(i)}
        />
        <p className="round-track__legend" aria-hidden="true">
          <span><i />Sprint weekend</span>
          <span>Click or drag to pick a round · ← → to step</span>
        </p>
      </div>

      {onlyFollowed && !shown.length && (
        <p className="panel muted">
          You aren't following any {kind === 'drivers' ? 'drivers' : 'teams'} yet. Tap ☆ next to a name to follow it.
        </p>
      )}

      <ol className="standings" aria-label={`${kind === 'drivers' ? 'Driver' : 'Constructor'} standings after round ${round}`}>
        <li className="standings__row standings__row--head" aria-hidden="true">
          <span>Pos</span><span /><span>{kind === 'drivers' ? 'Driver' : 'Team'}</span><span>Pts</span><span>Gap</span><span>Wins</span><span />
        </li>
        <AnimatePresence initial={false}>
          {shown.map((r) => {
            const ch = changes[r.id] ?? 0;
            const isFollowed = followed.includes(r.id);
            const teamFollowed = kind === 'drivers' && !isFollowed && bm.teams.includes(r.constructorId);
            const flash = flashFor(r.id);
            const champ = champions[kind];
            const isChampion = champ && champ.id === r.id && round >= champ.round;
            const clinchRace = isChampion && season.races.find((x) => x.round === champ.round);
            return (
              <motion.li
                key={r.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ layout: { type: 'spring', stiffness: 120, damping: 24 }, opacity: { duration: 0.5 } }}
                className={`standings__row${isFollowed ? ' standings__row--followed' : ''}${teamFollowed ? ' standings__row--team-followed' : ''}${isChampion ? ' standings__row--champion' : ''}`}
                style={{ '--team': teamColor(teamOf(r)) }}
                data-testid="standings-row"
              >
                {flash && <span key={flash.key} className={`standings__flash standings__flash--${flash.dir}`} aria-hidden="true" />}
                <span className="standings__pos">{r.pos}</span>
                <span className={`standings__change ${ch > 0 ? 'up' : ch < 0 ? 'down' : ''}`} aria-label={ch ? `${ch > 0 ? 'up' : 'down'} ${Math.abs(ch)}` : 'no change'}>
                  {ch > 0 ? `▲${ch}` : ch < 0 ? `▼${-ch}` : '–'}
                </span>
                <span className="standings__name">
                  {kind === 'drivers' ? (
                    <Link to={`/drivers/${r.id}`}>{nameOf(r.id)}</Link>
                  ) : (
                    nameOf(r.id)
                  )}
                  {kind === 'drivers' && <small className="muted">{season.constructors[r.constructorId]?.name}</small>}
                  {isChampion && (
                    <Trophy
                      title={`2026 ${kind === 'drivers' ? "Drivers'" : "Constructors'"} World Champion, clinched at the ${clinchRace?.name} (round ${champ.round})`}
                    />
                  )}
                </span>
                <span className="standings__pts">{Math.round(r.points)}</span>
                <span className="standings__gap muted">{r.pos === 1 ? 'Leader' : `−${Math.round(leaderPts - r.points)}`}</span>
                <span className="standings__wins">{r.wins}</span>
                <FollowStar kind={bmKind} id={r.id} label={nameOf(r.id)} />
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>

      <div className="panel">
        <h2>Points progression</h2>
        <p className="muted">Top 5 after round {round}, plus anyone you follow. Dashed lines are second drivers in a team.</p>
        <PointsChart
          history={history}
          kind={kind}
          series={series}
          t={t}
          animate={!playing && Number.isInteger(t)}
          raceName={(r) => season.races.find((x) => x.round === r)?.name}
        />
      </div>
    </>
  );
}
