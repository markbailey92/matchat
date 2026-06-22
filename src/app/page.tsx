import { FixtureList } from "@/components/FixtureList";
import { pageShellClass } from "@/lib/layout";

export default function HomePage() {
  return (
    <main className={pageShellClass}>
      <header className="mb-6 sm:mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent)]">
          MATCHAT
        </p>
        <h1 className="mt-2 text-xl font-bold sm:text-2xl">FIFA World Cup 2022</h1>
        <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
          Sync to your stream, comment on events as they happen — replay with second-level
          timing from StatsBomb open data.
        </p>
      </header>

      <FixtureList />
    </main>
  );
}
