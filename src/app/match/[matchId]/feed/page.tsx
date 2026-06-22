import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EventFeedView } from "@/components/EventFeedView";
import { loadMatch, normalizeDataError } from "@/lib/dataSource";

export default async function EventFeedPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;

  try {
    const match = await loadMatch(matchId);
    if (!match) notFound();

    return (
      <Suspense
        fallback={
          <div className="flex h-[100dvh] items-center justify-center bg-[var(--background)] text-[var(--muted)]">
            Loading...
          </div>
        }
      >
        <EventFeedView match={match} />
      </Suspense>
    );
  } catch (err) {
    const { message } = normalizeDataError(err);
    return (
      <main className="flex h-[100dvh] items-center justify-center px-4 text-center">
        <p className="text-[var(--danger)]">{message}</p>
      </main>
    );
  }
}
