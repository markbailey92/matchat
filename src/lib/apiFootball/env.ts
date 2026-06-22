export function isApiConfigured(): boolean {
  return Boolean(process.env.API_FOOTBALL_KEY);
}

/** API-Football free plan supports 2022–2024; default to 2022 for World Cup replay. */
export function getWorldCupSeason(): number {
  const raw = process.env.WORLD_CUP_SEASON;
  if (raw) {
    const season = parseInt(raw, 10);
    if (!Number.isNaN(season) && season >= 2000 && season <= 2100) return season;
  }
  return 2022;
}
