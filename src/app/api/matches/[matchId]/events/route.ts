import { NextResponse } from "next/server";
import {
  loadMatchEvents,
  normalizeDataError,
} from "@/lib/dataSource";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;

  try {
    const events = await loadMatchEvents(matchId);
    return NextResponse.json(events);
  } catch (err) {
    const { message, status } = normalizeDataError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
