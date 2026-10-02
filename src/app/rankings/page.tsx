import type { Metadata } from "next";
import { getRankings, getMonthlyPoints, RANKING_LABEL, RANKING_METHODOLOGY } from "@/lib/stats";
import { cityLabel, SKILL_LABELS } from "@/lib/nepal";
import { Container, SectionHeading } from "@/components/ui/container";
import { Card, EmptyState, Badge } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/misc";

export const metadata: Metadata = {
  title: "Pickleball rankings in Nepal",
  description:
    "PickleNepal Community Rankings by city, skill level and format. Built from games played on PickleNepal — not an official DUPR rating.",
  alternates: { canonical: "/rankings" },
};

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; city?: string; skill?: string; format?: string; period?: string }>;
}) {
  const { scope, city, skill, format, period } = await searchParams;
  const scopeValue = scope === "CITY" ? "CITY" : "NEPAL";

  const [rows, monthly] = await Promise.all([
    getRankings({
      scope: scopeValue,
      city: scopeValue === "CITY" ? (city?.toUpperCase() ?? "KATHMANDU") : null,
      skillLevel: skill?.toUpperCase() ?? null,
      format: (format?.toUpperCase() as "SINGLES" | "DOUBLES" | null) ?? null,
      limit: 100,
    }),
    period === "monthly" ? getMonthlyPoints(20) : Promise.resolve([]),
  ]);

  return (
    <Container className="py-8 sm:py-10">
      <SectionHeading
        eyebrow="Rankings"
        title="PickleNepal Community Rankings"
        description={RANKING_METHODOLOGY}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <a href="/rankings" className={scopeValue === "NEPAL" ? "chip chip-active" : "chip"}>
          Nepal
        </a>
        <a href="/rankings?scope=CITY" className={scopeValue === "CITY" ? "chip chip-active" : "chip"}>
          By city
        </a>
        {scopeValue === "CITY" ? (
          <>
            {["KATHMANDU", "LALITPUR", "POKHARA", "BHAKTAPUR", "CHITWAN"].map((value) => (
              <a
                key={value}
                href={`/rankings?scope=CITY&city=${value.toLowerCase()}${skill ? `&skill=${skill}` : ""}`}
                className={(city?.toUpperCase() ?? "KATHMANDU") === value ? "chip chip-active" : "chip"}
              >
                {cityLabel(value)}
              </a>
            ))}
          </>
        ) : null}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {["", "COMPLETE_BEGINNER", "BEGINNER", "INTERMEDIATE", "UPPER_INTERMEDIATE", "ADVANCED", "COMPETITIVE"].map(
          (value) => (
            <a
              key={value || "any"}
              href={`/rankings?scope=${scopeValue}${city ? `&city=${city}` : ""}${value ? `&skill=${value.toLowerCase()}` : ""}`}
              className={(skill?.toUpperCase() ?? "") === value ? "chip chip-active" : "chip"}
            >
              {value ? SKILL_LABELS[value] : "All levels"}
            </a>
          ),
        )}
        <a href={`/rankings?scope=${scopeValue}&period=monthly`} className={period === "monthly" ? "chip chip-active" : "chip"}>
          This month
        </a>
      </div>

      {period === "monthly" ? (
        <Card>
          <h2 className="font-semibold text-ink">Points earned in the last 30 days</h2>
          <p className="mt-1 text-xs text-ink-soft">{RANKING_LABEL} · not official DUPR data.</p>
          {monthly.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">No recorded results in the last 30 days.</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                  <th className="py-2">#</th>
                  <th className="py-2">Player</th>
                  <th className="py-2 text-right">Played</th>
                  <th className="py-2 text-right">Won</th>
                  <th className="py-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((row, index) => (
                  <tr key={row.playerId} className="border-b border-line last:border-0">
                    <td className="py-2 text-ink-soft">{index + 1}</td>
                    <td className="py-2">
                      <a href={`/players/${row.username}`} className="font-medium text-ink hover:text-brand-800">
                        {row.fullName}
                      </a>
                    </td>
                    <td className="py-2 text-right">{row.played}</td>
                    <td className="py-2 text-right">{row.won}</td>
                    <td className="py-2 text-right font-semibold">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No ranked players yet"
          description="Rankings appear once players have recorded game results on PickleNepal."
          icon="📈"
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="px-5 pt-5 text-left text-xs text-ink-soft">
              {RANKING_LABEL}. Not an official DUPR rating.
            </caption>
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-5 py-3">Rank</th>
                <th className="py-3">Player</th>
                <th className="py-3">City</th>
                <th className="py-3">Level</th>
                <th className="py-3 text-right">Points</th>
                <th className="px-5 py-3 text-right">W–L</th>
                <th className="py-3 text-right">Win %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 font-bold text-ink">{row.rank}</td>
                  <td className="py-3">
                    <a href={`/players/${row.username}`} className="flex items-center gap-2 font-medium text-ink hover:text-brand-800">
                      <Avatar name={row.fullName} src={row.avatarUrl} size={28} />
                      {row.fullName}
                    </a>
                  </td>
                  <td className="py-3 text-ink-soft">{cityLabel(row.city)}</td>
                  <td className="py-3">
                    <Badge tone="neutral">{row.skillLevel ? SKILL_LABELS[row.skillLevel] : "—"}</Badge>
                  </td>
                  <td className="py-3 text-right font-semibold">{row.points}</td>
                  <td className="px-5 py-3 text-right text-ink-soft">
                    {row.gamesWon}–{row.gamesLost}
                  </td>
                  <td className="py-3 text-right font-semibold">{row.winPercentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </Container>
  );
}