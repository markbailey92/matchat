"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TeamFlag } from "@/components/TeamFlag";
import type { Match } from "@/lib/types";
import {
  formatKickoff,
  isFinishedMatch,
  isLiveMatch,
  isUpcomingMatch,
  statusLabel,
} from "@/lib/matchFormat";

function FixtureCard({ fixture }: { fixture: Match }) {
  const showScore =
    isLiveMatch(fixture.status) ||
    isFinishedMatch(fixture.status) ||
    (fixture.status && fixture.status !== "NS") ||
    fixture.homeScore > 0 ||
    fixture.awayScore > 0;

  return (
    <Link
      href={`/match/${fixture.id}`}
      className="block rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 transition active:scale-[0.99] hover:border-[var(--accent)] touch-manipulation"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isLiveMatch(fixture.status) && (
              <span className="rounded-full bg-[var(--danger)] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                Live
              </span>
            )}
            {isFinishedMatch(fixture.status) && (
              <span className="rounded-full border border-[var(--card-border)] px-2 py-0.5 text-[10px] font-medium uppercase text-[var(--muted)]">
                Finished
              </span>
            )}
            {fixture.round && (
              <span className="truncate text-xs text-[var(--muted)]">{fixture.round}</span>
            )}
          </div>

          {/* Mobile: stacked teams */}
          <div className="mt-2 sm:hidden">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                <span className="truncate font-semibold">{fixture.homeTeam}</span>
                <TeamFlag teamName={fixture.homeTeam} />
              </span>
              {showScore ? (
                <span className="shrink-0 font-mono text-sm tabular-nums text-[var(--accent)]">
                  {fixture.homeScore} – {fixture.awayScore}
                </span>
              ) : (
                <span className="shrink-0 text-sm text-[var(--muted)]">vs</span>
              )}
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <TeamFlag teamName={fixture.awayTeam} />
                <span className="truncate font-semibold">{fixture.awayTeam}</span>
              </span>
            </div>
          </div>

          {/* Desktop: inline */}
          <p className="mt-1 hidden items-center gap-1.5 font-semibold sm:flex sm:flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              {fixture.homeTeam}
              <TeamFlag teamName={fixture.homeTeam} />
            </span>
            {showScore ? (
              <span className="font-mono text-[var(--accent)]">
                {fixture.homeScore} – {fixture.awayScore}
              </span>
            ) : (
              <span className="text-[var(--muted)]">vs</span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <TeamFlag teamName={fixture.awayTeam} />
              {fixture.awayTeam}
            </span>
          </p>

          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
            {formatKickoff(fixture.kickoff)}
            {fixture.venue ? ` · ${fixture.venue}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="hidden text-xs text-[var(--muted)] sm:inline">
            {statusLabel(fixture.status)}
          </span>
          <p className="text-sm font-medium text-[var(--accent)] sm:mt-1">
            {isFinishedMatch(fixture.status) ? "Replay →" : "Open →"}
          </p>
        </div>
      </div>
    </Link>
  );
}

function FixtureSection({
  title,
  fixtures,
}: {
  title: string;
  fixtures: Match[];
}) {
  if (fixtures.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {title}
      </h3>
      <div className="space-y-2">
        {fixtures.map((fixture) => (
          <FixtureCard key={fixture.id} fixture={fixture} />
        ))}
      </div>
    </div>
  );
}

export function FixtureList({
  initialFixtures,
  initialError,
}: {
  initialFixtures?: Match[];
  initialError?: string | null;
} = {}) {
  const [fixtures, setFixtures] = useState<Match[]>(initialFixtures ?? []);
  const [loading, setLoading] = useState(initialFixtures === undefined && !initialError);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const loadFixtures = useCallback(() => {
    setError(null);
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20_000);

    return fetch("/api/world-cup/fixtures", { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? data.error ?? "Failed to load");
        if (!Array.isArray(data)) throw new Error("Invalid fixtures response");
        setFixtures(data);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") {
          setError("Fixtures took too long to load. Check your connection and try again.");
          return;
        }
        setError(err.message);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (initialFixtures !== undefined || initialError) return;
    loadFixtures();
  }, [initialError, initialFixtures, loadFixtures]);

  const { live, upcoming, finished } = useMemo(() => {
    const live = fixtures.filter((f) => isLiveMatch(f.status));
    const upcoming = fixtures.filter((f) => isUpcomingMatch(f.status));
    const finished = fixtures
      .filter((f) => isFinishedMatch(f.status))
      .sort(
        (a, b) =>
          new Date(b.kickoff ?? 0).getTime() - new Date(a.kickoff ?? 0).getTime()
      );
    return { live, upcoming, finished };
  }, [fixtures]);

  if (loading) {
    return (
      <div className="py-12 text-center text-[var(--muted)]">Loading World Cup fixtures...</div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <p className="font-medium text-[var(--danger)]">Could not load fixtures</p>
        <p className="mt-2 text-sm text-[var(--muted)]">{error}</p>
        <button
          type="button"
          onClick={loadFixtures}
          className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black"
        >
          Retry
        </button>
      </div>
    );
  }

  if (fixtures.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--card-border)] py-12 text-center text-[var(--muted)]">
        No World Cup fixtures found.
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
          World Cup fixtures
        </h2>
        <span className="text-xs text-[var(--muted)]">{fixtures.length} matches</span>
      </div>

      <FixtureSection title="Live" fixtures={live} />
      <FixtureSection title="Upcoming" fixtures={upcoming} />
      <FixtureSection title="Finished" fixtures={finished} />
    </section>
  );
}
