import { NextResponse } from "next/server";
import { getReactionTotalsForEvents } from "@/lib/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  await params;
  const idsParam = new URL(request.url).searchParams.get("ids");

  if (!idsParam) {
    return NextResponse.json(
      { error: "Missing ids query parameter" },
      { status: 400 }
    );
  }

  const eventIds = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return NextResponse.json(getReactionTotalsForEvents(eventIds));
}
