import { NextResponse } from "next/server";
import {
  loadMatch,
  normalizeDataError,
} from "@/lib/dataSource";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;

  try {
    const match = await loadMatch(matchId);
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }
    return NextResponse.json(match);
  } catch (err) {
    const { message, status } = normalizeDataError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
