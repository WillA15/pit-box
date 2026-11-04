# Pit Box

Your one-stop strategy for all things F1 2026: standings, schedule, track and tyre-strategy breakdowns,
driver spotlights, and bookmarks for the drivers and teams you follow.

**Live site:** https://pit-box-orpin.vercel.app

Unofficial fan site, not associated with Formula 1 companies or the FIA.

## Stack
- Vite + React, React Router, Framer Motion, Recharts
- Vercel serverless functions in `api/` (cached proxies to the data sources)
- Data: [Jolpica](https://github.com/jolpica/jolpica-f1) (schedule, results, standings) and
  [OpenF1](https://openf1.org) (stints, tyres, pit stops, laps)

## How data loads
1. The browser asks `/api/season` or `/api/race?round=N`. These build fresh data from Jolpica/OpenF1 and
   are cached at Vercel's edge for an hour.
2. If that fails or times out, it falls back to the bundled snapshot in `public/data/`.

Refresh the snapshot after each race weekend:

```bash
npm run snapshot          # whole season
npm run snapshot -- 20    # just round 20
```

## Scripts
| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :5173 (the `api/` functions run inside it too) |
| `npm run build` | Production build to `dist/` |
| `npm test` | Unit tests (Vitest) for the data logic |
| `npm run test:e2e` | Browser tests (Playwright), run against the snapshot data |

## Layout
```
api/            serverless functions
scripts/        snapshot script
public/data/    bundled fallback data
src/lib/        pure data logic (unit tested)
src/components/ shared UI
src/pages/      one file per route
tests/          unit/ and e2e/
```
