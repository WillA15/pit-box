# Pit Box

Pit Box is a fan site for the 2026 Formula 1 season. It shows the championship standings, the race
calendar, a breakdown of each track and its tyre strategies, driver profiles, and a "Pit Wall" tab for
the drivers and teams you follow.

**Live site:** https://pit-box-orpin.vercel.app

This is an unofficial fan site. It is not associated with Formula 1 companies or the FIA.

## What is on each tab
- **Home:** the latest race result, the next race, and the championship leaders.
- **Standings:** driver and constructor tables, with how positions changed after each race.
- **Schedule:** every round of the season with session times shown in your own time zone.
- **Tracks:** a card for each circuit; open one for the circuit facts, the race result and tyre stints.
- **Drivers:** a list of the grid and a profile page for each driver with season and career numbers.
- **Pit Wall:** your followed drivers and teams (saved in your browser) and the latest news about them.

## How data loads
The saved snapshot in `public/data/` draws at once, so the page is never empty. At the same time the
site asks the live API (`/api/season`, `/api/race`, `/api/news`) and replaces the snapshot when the live
data arrives. If the snapshot has newer standings than the live reply, the snapshot is kept. While the
live request is still running, the page says it is checking for newer results. If both fail, the page
shows an error with a "Try again" button. An open tab checks again for fresh season data when you come
back to it after more than 10 minutes.

## Install, run, test
You need Node 22 or newer.

```bash
npm install
npm run dev        # dev server at http://localhost:5173 (the api/ functions run inside it)
npm test           # unit tests (Vitest)
npm run test:e2e   # browser tests (Playwright), run against the snapshot data
npm run lint       # ESLint on src/ and api/
npm run build      # production build into dist/
```

## Refresh the snapshot after a race
```bash
npm run snapshot           # whole season
npm run snapshot -- 20     # season plus only round 20
npm run snapshot -- news   # only the news archive
```
Check that `public/data/races/N.json` exists for every finished round, then deploy.

## Preview a different date
Add `?now=` with a date to any page to see the site as it would look then, for example
`/?now=2026-11-08T12:00:00Z`. It is meant for previews and demos, and it works on the public site too.

## Built with
Vite, React, React Router, Framer Motion and Recharts. Serverless functions in `api/` (hosted on Vercel)
fetch and cache the data.

## Known limitations
- The snapshot is refreshed by hand, so it can be a race behind until someone runs the command above.
- A race that has no snapshot file shows "Loading" until the live request finishes, which can take several seconds.
- Tyre and stint data comes from OpenF1 and can be missing or incomplete for some races.
- News depends on the outlets' public feeds, so a feed that is down is simply skipped.

## Credits
- Results, schedule and standings: [Jolpica F1 API](https://github.com/jolpica/jolpica-f1).
- Tyre stints, pit stops and laps: [OpenF1](https://openf1.org).
- News headlines and links come from Autosport, Motorsport.com, BBC Sport, RaceFans and The Race. All
  stories belong to their publishers.
- Fonts: [Barlow and Barlow Condensed](https://github.com/jpt/barlow), used under the SIL Open Font
  License 1.1, served through the Fontsource packages.
- Flag artwork: [Twemoji](https://github.com/twitter/twemoji), packaged as a flags-only font by
  [country-flag-emoji-polyfill](https://github.com/talkjs/country-flag-emoji-polyfill). The polyfill's
  code is MIT licensed; the Twemoji artwork in its font is used under CC BY 4.0
  (https://creativecommons.org/licenses/by/4.0/).
