"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/toast";
import { Button } from "@/components/ui/button";
import { recordMatchResultAction } from "@/lib/tournaments/actions";

export function MatchResultForm({ matchId }: { matchId: string }) {
  const { push } = useToast();
  const router = useRouter();
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
          const result = await recordMatchResultAction(matchId, Number(scoreA), Number(scoreB));
          if (result.error) push(result.error, "error");
          else if (result.success) push(result.success);
          router.refresh();
        } catch (error) {
          push(error instanceof Error ? error.message : "Could not save the result", "error");
        } finally {
          setBusy(false);
        }
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <label className="text-xs font-semibold text-ink-soft">
        Score
        <span className="mt-1 flex items-center gap-1">
          <input
            value={scoreA}
            onChange={(event) => setScoreA(event.target.value)}
            inputMode="numeric"
            required
            className="w-14 rounded-lg border border-line px-2 py-1 text-sm"
            aria-label="Score for side A"
          />
          <span aria-hidden="true">–</span>
          <input
            value={scoreB}
            onChange={(event) => setScoreB(event.target.value)}
            inputMode="numeric"
            required
            className="w-14 rounded-lg border border-line px-2 py-1 text-sm"
            aria-label="Score for side B"
          />
        </span>
      </label>
      <Button type="submit" size="sm" disabled={busy || scoreA === "" || scoreB === ""}>
        {busy ? "Saving…" : "Save result"}
      </Button>
    </form>
  );
}