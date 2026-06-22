import { NextResponse } from "next/server";
import {
  loadWorldCupFixtures,
  normalizeDataError,
} from "@/lib/dataSource";

export async function GET() {
  try {
    const matches = await loadWorldCupFixtures();
    return NextResponse.json(matches);
  } catch (err) {
    const { message, status } = normalizeDataError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
