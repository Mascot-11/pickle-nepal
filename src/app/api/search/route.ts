import { NextResponse } from "next/server";
import { search } from "@/lib/search";

export const dynamic = "force-dynamic";

/** Search suggestions endpoint used by the header search box (§40). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const term = searchParams.get("q") ?? "";

  if (term.trim().length < 2) {
    return NextResponse.json(
      {
        query: term,
        players: [],
        courts: [],
        clubs: [],
        coaches: [],
        games: [],
        events: [],
        tournaments: [],
        posts: [],
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const results = await search(term);
  return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } });
}