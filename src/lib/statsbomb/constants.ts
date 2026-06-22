/** StatsBomb open-data identifiers for FIFA World Cup 2022 (Qatar). */
export const WORLD_CUP_COMPETITION_ID = 43;
export const WORLD_CUP_2022_SEASON_ID = 106;

export const STATSBOMB_RAW_BASE =
  "https://raw.githubusercontent.com/statsbomb/open-data/master/data";

export const STATSBOMB_MATCHES_URL = `${STATSBOMB_RAW_BASE}/matches/${WORLD_CUP_COMPETITION_ID}/${WORLD_CUP_2022_SEASON_ID}.json`;

export function statsbombEventsUrl(matchId: number | string): string {
  return `${STATSBOMB_RAW_BASE}/events/${matchId}.json`;
}

export function statsbombLineupsUrl(matchId: number | string): string {
  return `${STATSBOMB_RAW_BASE}/lineups/${matchId}.json`;
}
