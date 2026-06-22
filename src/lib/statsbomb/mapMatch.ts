import type { Match } from "@/lib/types";
import type { SbMatch } from "./types";

export function buildKickoffIso(match: SbMatch): string {
  const time = match.kick_off.replace(/\.\d+$/, "");
  return `${match.match_date}T${time}Z`;
}

function formatRound(match: SbMatch): string {
  const stage = match.competition_stage.name;
  if (stage === "Group Stage" && match.home_team.home_team_group) {
    return `Group ${match.home_team.home_team_group} · MD${match.match_week}`;
  }
  return stage;
}

/** StatsBomb open data only includes completed tournaments — all matches are replayable. */
export function mapSbMatchToMatch(match: SbMatch): Match {
  return {
    id: String(match.match_id),
    homeTeam: match.home_team.home_team_name,
    awayTeam: match.away_team.away_team_name,
    homeScore: match.home_score,
    awayScore: match.away_score,
    competition: `FIFA World Cup ${match.season.season_name}`,
    round: formatRound(match),
    kickoff: buildKickoffIso(match),
    status: "FT",
    venue: match.stadium?.name,
  };
}
