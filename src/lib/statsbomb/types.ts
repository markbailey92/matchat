export interface SbNamedEntity {
  id: number;
  name: string;
}

export interface SbMatch {
  match_id: number;
  match_date: string;
  kick_off: string;
  home_score: number;
  away_score: number;
  match_week: number;
  competition_stage: SbNamedEntity;
  stadium: {
    id: number;
    name: string;
    country?: SbNamedEntity;
  };
  referee?: {
    id: number;
    name: string;
    country?: SbNamedEntity;
  };
  home_team: {
    home_team_id: number;
    home_team_name: string;
    home_team_group?: string;
  };
  away_team: {
    away_team_id: number;
    away_team_name: string;
    away_team_group?: string;
  };
  competition: {
    competition_id: number;
    competition_name: string;
  };
  season: {
    season_id: number;
    season_name: string;
  };
}

export interface SbEvent {
  id: string;
  index: number;
  period: number;
  minute: number;
  second: number;
  timestamp: string;
  type: SbNamedEntity;
  possession?: number;
  team?: SbNamedEntity;
  player?: { id: number; name: string };
  position?: SbNamedEntity;
  shot?: {
    outcome?: SbNamedEntity;
    type?: SbNamedEntity;
    technique?: SbNamedEntity;
    statsbomb_xg?: number;
    key_pass_id?: string;
  };
  foul_committed?: { card?: SbNamedEntity; type?: SbNamedEntity };
  bad_behaviour?: { card?: SbNamedEntity };
  substitution?: {
    outcome?: SbNamedEntity;
    replacement?: { id: number; name: string };
  };
  pass?: {
    type?: SbNamedEntity;
    technique?: SbNamedEntity;
    outcome?: SbNamedEntity;
    length?: number;
    assist?: boolean;
    goal_assist?: boolean;
  };
}

export interface SbLineupPlayer {
  player_id: number;
  player_name: string;
  player_nickname?: string | null;
  jersey_number: number;
  positions: Array<{
    position: string;
    start_reason: string;
    from: string;
    to: string | null;
  }>;
}

export interface SbLineupTeam {
  team_id: number;
  team_name: string;
  lineup: SbLineupPlayer[];
}
