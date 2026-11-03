// Pure helpers that turn OpenF1 rows into per-driver strategy summaries.

export const COMPOUNDS = ['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'];

/** Format seconds as m:ss.sss (e.g. 84.123 -> "1:24.123"). */
export function formatLapTime(sec) {
  if (sec == null || !Number.isFinite(sec)) return null;
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(3).padStart(6, '0');
  return m ? `${m}:${s}` : s;
}

/**
 * @param {object} p
 * @param {Array} p.stints   OpenF1 /stints rows
 * @param {Array} p.pits     OpenF1 /pit rows
 * @param {Array} p.laps     OpenF1 /laps rows
 * @param {Array} p.drivers  OpenF1 /drivers rows
 */
export function buildStrategies({ stints = [], pits = [], laps = [], drivers = [] }) {
  const byDriver = new Map();
  const ensure = (n) => {
    if (!byDriver.has(n)) byDriver.set(n, { number: n, stints: [], pits: [], lapsCompleted: 0, fastestLap: null });
    return byDriver.get(n);
  };
  drivers.forEach((d) => ensure(d.driver_number));

  for (const lap of laps) {
    const d = ensure(lap.driver_number);
    d.lapsCompleted = Math.max(d.lapsCompleted, lap.lap_number);
    if (lap.lap_duration && !lap.is_pit_out_lap && (!d.fastestLap || lap.lap_duration < d.fastestLap.seconds)) {
      d.fastestLap = { lap: lap.lap_number, seconds: lap.lap_duration, time: formatLapTime(lap.lap_duration) };
    }
  }

  const sortedStints = [...stints].sort((a, b) => a.driver_number - b.driver_number || a.stint_number - b.stint_number);
  for (const s of sortedStints) {
    const d = ensure(s.driver_number);
    d.stints.push({
      n: s.stint_number,
      compound: (s.compound ?? 'UNKNOWN').toUpperCase(),
      lapStart: s.lap_start,
      lapEnd: s.lap_end,
      tyreAge: s.tyre_age_at_start ?? 0,
    });
  }

  for (const p of pits) {
    // OpenF1 sometimes logs lap-1 rows with no timing (formation/garage events); skip those.
    if (p.lap_number <= 1 && p.pit_duration == null && p.stop_duration == null) continue;
    ensure(p.driver_number).pits.push({
      lap: p.lap_number,
      stopDuration: p.stop_duration ?? null,
      laneDuration: p.lane_duration ?? p.pit_duration ?? null,
    });
  }

  for (const d of byDriver.values()) {
    // Fill missing stint ends from the next stint's start or laps completed.
    d.stints.forEach((s, i) => {
      if (s.lapEnd == null) s.lapEnd = d.stints[i + 1] ? d.stints[i + 1].lapStart - 1 : d.lapsCompleted || s.lapStart;
    });
    d.pits.sort((a, b) => a.lap - b.lap);
    d.lapsByCompound = {};
    for (const s of d.stints) {
      const n = Math.max(0, s.lapEnd - s.lapStart + 1);
      d.lapsByCompound[s.compound] = (d.lapsByCompound[s.compound] ?? 0) + n;
    }
    d.stopCount = d.pits.length;
  }

  return [...byDriver.values()];
}

/** Count safety cars, VSCs and red flags from OpenF1 /race_control rows. */
export function summarizeRaceControl(rows = []) {
  const out = { safetyCars: 0, virtualSafetyCars: 0, redFlags: 0 };
  for (const r of rows) {
    const msg = (r.message ?? '').toUpperCase();
    if (msg.includes('VIRTUAL SAFETY CAR DEPLOYED')) out.virtualSafetyCars++;
    else if (msg.includes('SAFETY CAR DEPLOYED')) out.safetyCars++;
    if ((r.flag ?? '').toUpperCase() === 'RED') out.redFlags++;
  }
  return out;
}
