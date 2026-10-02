"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/toast";
import { toggleFeatureFlagAction } from "@/lib/settings/actions";

export function FeatureFlagToggle({ flag, enabled }: { flag: string; enabled: boolean }) {
  const { push } = useToast();
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-raised px-4 py-3">
      <span className="font-medium text-ink">{flag}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`Toggle ${flag}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const result = await toggleFeatureFlagAction(flag, !on);
            if (result.error) push(result.error, "error");
            else {
              setOn(!on);
              if (result.success) push(result.success);
              router.refresh();
            }
          } catch (error) {
            push(error instanceof Error ? error.message : "Something went wrong", "error");
          } finally {
            setBusy(false);
          }
        }}
        className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-brand-600" : "bg-line"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-5.5" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}