import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { allFeatureFlags } from "@/lib/feature-flags";
import { platformCommissionBps } from "@/lib/payments/provider";
import { Container } from "@/components/ui/container";
import { AdminNav } from "@/components/admin/nav";
import { Badge } from "@/components/ui/primitives";
import { FeatureFlagToggle } from "@/components/admin/flag-toggle";

export const metadata: Metadata = {
  title: "Admin · Settings",
  robots: { index: false, follow: false },
};

export default async function AdminSettingsPage() {
  requireAdmin().catch(() => redirect("/login?next=/admin/settings"));

  const [flags, settings] = await Promise.all([
    allFeatureFlags(),
    prisma.platformSettings.findMany(),
  ]);

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Platform settings</h1>
      <p className="mt-1 text-ink-soft">
        Feature flags are disabled by default so an unconfigured feature is safely off.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <AdminNav />

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold text-ink">Feature flags</h2>
            <div className="mt-4 space-y-2">
              {Object.entries(flags).map(([key, enabled]) => (
                <FeatureFlagToggle key={key} flag={key} enabled={enabled} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink">Business rules</h2>
            <ul className="mt-4 space-y-2">
              {settings.map((setting) => (
                <li
                  key={setting.key}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm"
                >
                  <span className="font-medium text-ink">{setting.key.replace(/_/g, " ")}</span>
                  <Badge tone="neutral">{String(setting.value)}</Badge>
                </li>
              ))}
              <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm">
                <span className="font-medium text-ink">Platform commission (bps)</span>
                <Badge tone="neutral">{platformCommissionBps()} — from PLATFORM_COMMISSION_BPS</Badge>
              </li>
            </ul>
            <p className="mt-2 text-xs text-ink-soft">
              Commission rates live in env/config, never hardcoded in call sites.
            </p>
          </section>
        </div>
      </div>
    </Container>
  );
}