import { notFound } from "next/navigation";
import { MatchView } from "@/components/MatchView";
import { loadMatch, normalizeDataError } from "@/lib/dataSource";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;

  try {
    const match = await loadMatch(matchId);
    if (!match) notFound();
    return <MatchView match={match} />;
  } catch (err) {
    const { message } = normalizeDataError(err);
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-[var(--danger)]">{message}</p>
      </main>
    );
  }
}
