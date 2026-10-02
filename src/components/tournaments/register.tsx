"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/toast";
import { Button } from "@/components/ui/button";
import {
  registerForTournamentAction,
  withdrawFromTournamentAction,
  type SocialState,
} from "@/lib/social/actions";
import { formatPrice } from "@/lib/nepal";
import { formatDate } from "@/lib/dates";

type Category = {
  id: string;
  name: string;
  format: string;
  maxEntries: number | null;
  entries: number;
};

export function TournamentRegister({
  tournamentId,
  entryFee,
  registrationDeadline,
  categories,
  registeredCategoryIds,
  partners,
}: {
  tournamentId: string;
  entryFee: number;
  registrationDeadline: Date;
  categories: Category[];
  registeredCategoryIds: string[];
  partners: Array<{ id: string; name: string }>;
}) {
  const { push } = useToast();
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? "");
  const [partnerId, setPartnerId] = useState<string>("");
  const [teamName, setTeamName] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const selected = categories.find((c) => c.id === categoryId);
  const isDoubles = selected?.format === "DOUBLES";
  const full = selected?.maxEntries ? (selected?.entries ?? 0) >= selected.maxEntries : false;

  const register = async () => {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("tournamentId", tournamentId);
      formData.set("categoryId", categoryId);
      if (isDoubles) {
        formData.set("partnerId", partnerId);
        formData.set("teamName", teamName);
      }
      const result: SocialState = await registerForTournamentAction(formData);
      if (result.error) push(result.error, "error");
      else if (result.success) push(result.success);
      router.refresh();
    } catch (error) {
      push(error instanceof Error ? error.message : "Could not register", "error");
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (categoryIdToRemove: string) => {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("tournamentId", tournamentId);
      void categoryIdToRemove;
      const result = await withdrawFromTournamentAction(formData);
      if (result.error) push(result.error, "error");
      else if (result.success) push(result.success);
      router.refresh();
    } catch (error) {
      push(error instanceof Error ? error.message : "Could not withdraw", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-ink">Register</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {entryFee > 0 ? `${formatPrice(entryFee)} entry fee, settled with the organiser.` : "Free entry."}{" "}
          Closes {formatDate(registrationDeadline)}.
        </p>
      </div>

      {registeredCategoryIds.length > 0 ? (
        <p className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800">
          You are registered in {registeredCategoryIds.length}{" "}
          {registeredCategoryIds.length === 1 ? "category" : "categories"}.
        </p>
      ) : null}

      <div>
        <label htmlFor="category" className="text-sm font-semibold text-ink">
          Category
        </label>
        <select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id} disabled={full}>
              {category.name} {category.format === "DOUBLES" ? "(doubles)" : "(singles)"}
              {full ? " — full" : ""}
            </option>
          ))}
        </select>
      </div>

      {isDoubles ? (
        <>
          <div>
            <label htmlFor="partner" className="text-sm font-semibold text-ink">
              Doubles partner
            </label>
            <select
              id="partner"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
            >
              <option value="">Choose a partner</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="teamName" className="text-sm font-semibold text-ink">
              Team name (optional)
            </label>
            <input
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={60}
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
            />
          </div>
        </>
      ) : null}

      <Button className="w-full" disabled={busy || full || !categoryId} onClick={register}>
        {busy ? "Registering…" : full ? "Category full" : "Register"}
      </Button>

      {registeredCategoryIds.length > 0 ? (
        <Button variant="ghost" className="w-full" disabled={busy} onClick={() => withdraw(registeredCategoryIds[0])}>
          Withdraw my registration
        </Button>
      ) : null}

      <p className="text-xs text-ink-soft">
        Duplicate registrations, entries after the deadline and categories at capacity are rejected
        automatically.
      </p>
    </div>
  );
}