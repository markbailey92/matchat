# MATCHAT

Synced World Cup match chat — events unlock based on your match clock, so everyone comments in sync with how they're watching.

## Setup

No API key required for the default MVP (StatsBomb open data, World Cup 2022).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional: copy `.env.example` to `.env.local` if you want to switch data sources later.

## How it works

1. **Pick a fixture** — All 64 Qatar 2022 matches (replay).
2. **Set the clock** — Enter what the match clock shows on your screen (e.g. `22:24`) and tap **Set clock**.
3. **Events reveal in real time** — Goals, cards, and subs unlock at **second-level** timing from StatsBomb.
4. **Comment on events** — Set your display name once, then comment on any revealed event.

Use **Pause** at half time and **Resume** when the second half starts.

## Data sources

| Source | Env | Cost | Seconds | Live |
|--------|-----|------|---------|------|
| **StatsBomb** (default) | `MATCHAT_DATA_SOURCE=statsbomb` | Free | Yes | No (replay only) |
| **API-Football** | `MATCHAT_DATA_SOURCE=api-football` + `API_FOOTBALL_KEY` | Free tier | No (minute) | Yes |

StatsBomb data: [github.com/statsbomb/open-data](https://github.com/statsbomb/open-data) (attribution appreciated).

## API routes

| Route | Description |
|-------|-------------|
| `GET /api/world-cup/fixtures` | All World Cup fixtures |
| `GET /api/matches/:id` | Single match details |
| `GET /api/matches/:id/events` | Match events (goals, cards, subs) |
| `POST /api/events/:id/comments` | Add a comment |

## Architecture

- **Replay data** — StatsBomb open JSON (cached 24h on the server)
- **Clock sync** — `localStorage` per match
- **Comments** — In-memory store (swap for a database for production)
