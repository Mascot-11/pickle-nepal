import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/misc";
import { Card } from "@/components/ui/primitives";
import { PrivacySettingsForm } from "@/components/settings/privacy-form";

export const metadata: Metadata = {
  title: "Privacy settings",
  robots: { index: false, follow: false },
};

export default async function PrivacySettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings/privacy");

  const profile = await prisma.playerProfile.findUnique({
    where: { userId: user.id },
    select: { visibility: true, showDOB: true },
  });

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Settings", href: "/settings" }, { label: "Privacy" }]} />
      <h1 className="text-2xl font-bold tracking-tight text-ink">Privacy</h1>
      <p className="mt-1 text-ink-soft">Control who can see your profile. Private details are never public.</p>

      <div className="mt-6 max-w-2xl">
        <Card>
          <PrivacySettingsForm
            defaults={{ visibility: profile?.visibility ?? "PUBLIC", showDOB: profile?.showDOB ?? false }}
          />
        </Card>
      </div>

      <div className="mt-6 max-w-2xl">
        <Card>
          <h2 className="font-semibold text-ink">Always private</h2>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            <li>· Your email address</li>
            <li>· Your phone number</li>
            <li>· Your internal account identifiers</li>
            <li>· Moderation and verification notes</li>
          </ul>
          <Link href="/settings/account" className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">
            Manage your account details →
          </Link>
        </Card>
      </div>
    </Container>
  );
}
