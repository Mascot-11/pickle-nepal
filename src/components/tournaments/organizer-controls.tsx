"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/toast";
import { Button } from "@/components/ui/button";
import { updateTournamentStatusAction, generateBracketAction } from "@/lib/tournaments/actions";

const STATUSES = [
  "DRAFT",
  "UPCOMING",
  "REGISTRATION_OPEN",
  "REGISTRATION_CLOSED",
  "LIVE",
  "COMPLETED",
  "CANCELLED",
] as const;

export function OrganizerControls({
  tournamentId,
  status,
  hasBracket,
}: {
  tournamentId: string;
  status: string;
  hasBracket: boolean;
}) {
  const { push } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<{ error?: string; success?: string }>) => {
    setBusy(key);
    try {
      const result = await fn();
      if (result.error) push(result.error, "error");
      else if (result.success) push(result.success);
      router.refresh();
    } catch (error) {
      push(error instanceof Error ? error.message : "Something went wrong", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <label htmlFor="status" className="sr-only">
        Tournament status
      </label>
      <select
        id="status"
        value={status}
        onChange={(event) => {
          const next = event.target.value;
          void run("status", () => updateTournamentStatusAction(tournamentId, next as never));
        }}
        className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
      >
        {STATUSES.map((value) => (
          <option key={value} value={value}>
            {value.replace(/_/g, " ")}
          </option>
        ))}
      </select>

      <Button
        variant="secondary"
        disabled={busy !== null}
        onClick={() => run("bracket", () => generateBracketAction(tournamentId))}
      >
        {busy === "bracket" ? "Generating…" : hasBracket ? "Bracket exists" : "Generate bracket"}
      </Button>
    </div>
  );
}