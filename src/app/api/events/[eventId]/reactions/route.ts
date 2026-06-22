import { NextResponse } from "next/server";
import { REACTION_TYPES } from "@/lib/reactions";
import { getEventReactions, addEventReactionClick } from "@/lib/store";
import { summarizeReactions } from "@/lib/reactions";
import type { ReactionType } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const author = new URL(request.url).searchParams.get("author")?.trim() || undefined;
  const eventReactions = getEventReactions(eventId);
  return NextResponse.json(summarizeReactions(eventReactions, author));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const body = await request.json();
  const author = typeof body.author === "string" ? body.author.trim() : "";
  const type = body.type as ReactionType;

  if (!author) {
    return NextResponse.json({ error: "Author is required" }, { status: 400 });
  }

  if (!REACTION_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });
  }

  const state = addEventReactionClick(eventId, author, type);
  return NextResponse.json(state);
}
