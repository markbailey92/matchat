import { NextResponse } from "next/server";
import { addComment, getComments } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  return NextResponse.json(getComments(eventId));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const body = await request.json();
  const author = typeof body.author === "string" ? body.author.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!author || !text) {
    return NextResponse.json(
      { error: "Author and text are required" },
      { status: 400 }
    );
  }

  const comment = addComment(eventId, author, text);
  return NextResponse.json(comment, { status: 201 });
}
