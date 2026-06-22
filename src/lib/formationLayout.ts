import type { LineupPlayer } from "./types";

interface PositionSlot {
  row: number;
  col: number;
}

const POSITION_SLOTS: Record<string, PositionSlot> = {
  Goalkeeper: { row: 0, col: 2 },
  "Left Back": { row: 1, col: 0 },
  "Left Center Back": { row: 1, col: 1 },
  "Right Center Back": { row: 1, col: 3 },
  "Right Back": { row: 1, col: 4 },
  "Left Defensive Midfield": { row: 2, col: 0 },
  "Center Defensive Midfield": { row: 2, col: 2 },
  "Right Defensive Midfield": { row: 2, col: 4 },
  "Left Center Midfield": { row: 3, col: 1 },
  "Center Attacking Midfield": { row: 3, col: 2 },
  "Right Center Midfield": { row: 3, col: 3 },
  "Left Wing": { row: 4, col: 0 },
  "Center Forward": { row: 4, col: 2 },
  "Right Wing": { row: 4, col: 4 },
};

const COL_PERCENT = [12, 30, 50, 70, 88];
/** Y positions within one defensive half (GK at bottom, attack toward halfway at top). */
const HALF_ROW_PERCENT = [88, 73, 58, 43, 20];
const DEFENSIVE_ROW = 1;

function evenlySpacedX(count: number, margin = 14): number[] {
  if (count <= 0) return [];
  if (count === 1) return [50];
  return Array.from({ length: count }, (_, index) =>
    margin + (index / (count - 1)) * (100 - 2 * margin)
  );
}

export interface PositionedLineupPlayer extends LineupPlayer {
  x: number;
  y: number;
}

export interface FormationLayout {
  formation: string;
  rows: LineupPlayer[][];
  positioned: PositionedLineupPlayer[];
}

export function layoutLineup(players: LineupPlayer[]): FormationLayout {
  const rowMap = new Map<number, Array<{ player: LineupPlayer; col: number }>>();

  for (const player of players) {
    const slot = POSITION_SLOTS[player.position] ?? { row: 3, col: 2 };
    const row = rowMap.get(slot.row) ?? [];
    row.push({ player, col: slot.col });
    rowMap.set(slot.row, row);
  }

  const maxRow = Math.max(0, ...rowMap.keys());
  const rows: LineupPlayer[][] = [];

  for (let row = 0; row <= maxRow; row += 1) {
    const rowPlayers = rowMap.get(row) ?? [];
    rowPlayers.sort((a, b) => a.col - b.col);
    rows.push(rowPlayers.map(({ player }) => player));
  }

  const lineCounts = rows
    .slice(1)
    .map((row) => row.length)
    .filter((count) => count > 0);

  const defenderX = new Map<number, number>();
  const defensiveLine = rowMap.get(DEFENSIVE_ROW) ?? [];
  const sortedDefenders = [...defensiveLine].sort((a, b) => a.col - b.col);
  evenlySpacedX(sortedDefenders.length).forEach((x, index) => {
    defenderX.set(sortedDefenders[index]!.player.jerseyNumber, x);
  });

  const positioned: PositionedLineupPlayer[] = players.map((player) => {
    const slot = POSITION_SLOTS[player.position] ?? { row: 3, col: 2 };
    return {
      ...player,
      x: defenderX.get(player.jerseyNumber) ?? COL_PERCENT[slot.col] ?? 50,
      y: HALF_ROW_PERCENT[slot.row] ?? 50,
    };
  });

  return {
    formation: lineCounts.join("-"),
    rows,
    positioned,
  };
}

export function shortPlayerName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1]! : name;
}
