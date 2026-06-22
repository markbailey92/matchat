import type { LineupPlayer } from "@/lib/types";
import { layoutLineup, shortPlayerName } from "@/lib/formationLayout";

interface FormationLineupProps {
  players: LineupPlayer[];
  formation?: string;
}

function HalfPitchMarkings() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-2 bottom-2 top-2 rounded-sm border border-white/25 sm:inset-x-3 sm:bottom-3 sm:top-3"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-2 top-2 h-px bg-white/30 sm:inset-x-3 sm:top-3"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-2 h-8 w-16 -translate-x-1/2 rounded-b-full border border-t-0 border-white/20 sm:top-3 sm:h-9 sm:w-[4.5rem]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-[22%] bottom-2 h-[34%] rounded-t-sm border border-b-0 border-white/20 sm:inset-x-[24%] sm:bottom-3"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-[34%] bottom-2 h-[14%] rounded-t-sm border border-b-0 border-white/20 sm:inset-x-[36%] sm:bottom-3"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-2 left-1/2 h-3 w-16 -translate-x-1/2 rounded-t-full border border-b-0 border-white/20 sm:bottom-3"
        aria-hidden
      />
    </>
  );
}

function PlayerMarker({
  jerseyNumber,
  name,
}: {
  jerseyNumber: number;
  name: string;
}) {
  return (
    <div
      className="flex flex-col items-center"
      title={`${jerseyNumber}. ${name}`}
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/90 bg-[var(--accent)] font-mono text-[11px] font-bold tabular-nums text-black shadow-md sm:h-8 sm:w-8 sm:text-xs">
        {jerseyNumber}
      </div>
      <span className="mt-0.5 max-w-[4.25rem] truncate text-center text-[9px] font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] sm:max-w-[4.75rem] sm:text-[10px]">
        {shortPlayerName(name)}
      </span>
    </div>
  );
}

export function FormationLineup({ players, formation }: FormationLineupProps) {
  const { formation: inferred, positioned } = layoutLineup(players);
  const label = formation ?? inferred;

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-[var(--card-border)]">
      {label && (
        <div className="border-b border-[var(--card-border)] bg-[var(--card)] px-3 py-1.5 text-center text-xs font-medium text-[var(--muted)]">
          {label}
        </div>
      )}

      <div
        className="relative aspect-[4/3] w-full bg-[linear-gradient(180deg,#1a6b3c_0%,#145730_50%,#1a6b3c_100%)]"
        role="img"
        aria-label={`Formation ${label} on half pitch`}
      >
        <HalfPitchMarkings />

        {positioned.map((player) => (
          <div
            key={player.jerseyNumber}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${player.x}%`, top: `${player.y}%` }}
          >
            <PlayerMarker
              jerseyNumber={player.jerseyNumber}
              name={player.name}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
