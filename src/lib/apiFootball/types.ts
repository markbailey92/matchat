export interface ApiFixtureStatus {
  long: string;
  short: string;
  elapsed: number | null;
  extra: number | null;
}

export interface ApiFixture {
  id: number;
  date: string;
  timestamp: number;
  referee?: string | null;
  status: ApiFixtureStatus;
  venue?: { name?: string; city?: string };
  periods?: {
    first: number | null;
    second: number | null;
  };
}

export interface ApiTeam {
  id: number;
  name: string;
  logo?: string;
}

export interface ApiFixtureItem {
  fixture: ApiFixture;
  league: { id: number; name: string; round?: string; season: number };
  teams: { home: ApiTeam; away: ApiTeam };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
  };
}

export interface ApiEventTime {
  elapsed: number | null;
  extra: number | null;
}

export interface ApiMatchEvent {
  time: ApiEventTime;
  team: ApiTeam;
  player: { id: number | null; name: string | null };
  assist: { id: number | null; name: string | null };
  type: string;
  detail: string;
  comments: string | null;
}

export interface ApiFootballResponse<T> {
  get: string;
  parameters: Record<string, string>;
  errors: Record<string, string> | string[];
  results: number;
  paging: { current: number; total: number };
  response: T;
}

export interface ApiLineupPlayer {
  id: number | null;
  name: string | null;
  number: number | null;
  pos: string | null;
}

export interface ApiLineupEntry {
  player: ApiLineupPlayer;
}

export interface ApiLineup {
  team: ApiTeam;
  coach?: { id: number | null; name: string | null };
  formation: string | null;
  startXI: ApiLineupEntry[];
  substitutes: ApiLineupEntry[];
}
