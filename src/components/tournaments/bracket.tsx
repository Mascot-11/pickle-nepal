"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/primitives";
import { formatTime } from "@/lib/dates";

type Match = {
  id: string;
  categoryId: string;
  round: number;
  position: number;
  scoreA: number | null;
  scoreB: number | null;
  status: string;
  scheduledAt: Date | null;
  playerA: { id: string; fullName: string; username: string } | null;
  playerB: { id: string; fullName: string; username: string } | null;
  teamA: { id: string; name: string | null; members: Array<{ player: { fullName: string } }> } | null;
  teamB: { id: string; name: string | null; members: Array<{ player: { fullName: string } }> } | null;
};

/**
 * Bracket UI (§31): horizontal on desktop, horizontally scrollable and
 * collapsible by round on mobile.
 */
export function Bracket({
  matches,
  categories,
}: {
  matches: Match[];
  categories: Array<{ id: string; name: string }>;
}) {
  const [openCategory, setOpenCategory] = useState<string>(categories[0]?.id ?? "");

  if (categories.length === 0) return null;

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const categoryMatches = matches.filter((m) => m.categoryId === category.id);
        if (categoryMatches.length === 0) return null;

        const rounds = [...new Set(categoryMatches.map((m) => m.round))].sort((a, b) => a - b);
        const expanded = openCategory === category.id;

        return (
          <section key={category.id} className="rounded-2xl border border-line bg-surface-raised p-4">
            <button
              type="button"
              onClick={() => setOpenCategory(expanded ? "" : category.id)}
              aria-expanded={expanded}
              className="flex w-full items-center justify-between text-left"
            >
              <h3 className="font-semibold text-ink">{category.name}</h3>
              <span className="text-sm text-ink-soft">{expanded ? "Hide" : "Show"}</span>
            </button>

            {expanded ? (
              <div className="scroll-x mt-4 flex gap-6 pb-2">
                {rounds.map((round) => (
                  <div key={round} className="flex min-w-[220px] flex-col gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                      Round {round}
                    </p>
                    {categoryMatches
                      .filter((m) => m.round === round)
                      .map((match) => (
                        <MatchCard key={match.id} match={match} />
                      ))}
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function label(side: Match["playerA"], team: Match["teamA"]): string {
  if (team) {
    return team.name ?? team.members.map((m) => m.player.fullName.split(" ")[0]).join(" / ");
  }
  return side?.fullName ?? "TBD";
}

function MatchCard({ match }: { match: Match }) {
  const winnerIsA = match.scoreA !== null && match.scoreB !== null && match.scoreA > match.scoreB;
  const winnerIsB = match.scoreA !== null && match.scoreB !== null && match.scoreB > match.scoreA;

  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="flex items-center justify-between">
        <span
          className={`truncate text-sm ${winnerIsA ? "font-bold text-brand-700" : "text-ink"}`}
        >
          {label(match.playerA, match.teamA)}
        </span>
        <span className="ml-2 shrink-0 text-sm font-bold text-ink">{match.scoreA ?? "–"}</span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className={`truncate text-sm ${winnerIsB ? "font-bold text-brand-700" : "text-ink"}`}>
          {label(match.playerB, match.teamB)}
        </span>
        <span className="ml-2 shrink-0 text-sm font-bold text-ink">{match.scoreB ?? "–"}</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-ink-soft">
        <Badge tone={match.status === "COMPLETED" ? "success" : "neutral"}>
          {match.status.replace(/_/g, " ")}
        </Badge>
        {match.scheduledAt ? <span>{formatTime(match.scheduledAt)}</span> : null}
      </div>
    </div>
  );
}