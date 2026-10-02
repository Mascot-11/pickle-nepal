import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/misc";
import { Card } from "@/components/ui/primitives";
import { NotificationPreferencesForm } from "@/components/settings/notification-form";

export const metadata: Metadata = {
  title: "Notification preferences",
  robots: { index: false, follow: false },
};

export default async function NotificationSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings/notifications");

  const prefs = await prisma.notificationPreference.findUnique({ where: { userId: user.id } });

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Settings", href: "/settings" }, { label: "Notifications" }]} />
      <h1 className="text-2xl font-bold tracking-tight text-ink">Notification preferences</h1>
      <p className="mt-1 text-ink-soft">
        In-app notifications are always recorded; choose which channels you receive.
      </p>

      <div className="mt-6 max-w-2xl">
        <Card>
          <NotificationPreferencesForm
            defaults={{
              gameInApp: prefs?.gameInApp ?? true,
              gameEmail: prefs?.gameEmail ?? false,
              tournamentInApp: prefs?.tournamentInApp ?? true,
              tournamentEmail: prefs?.tournamentEmail ?? false,
              eventInApp: prefs?.eventInApp ?? true,
              eventEmail: prefs?.eventEmail ?? false,
              socialInApp: prefs?.socialInApp ?? true,
              socialEmail: prefs?.socialEmail ?? false,
              messageInApp: prefs?.messageInApp ?? true,
              messageEmail: prefs?.messageEmail ?? false,
              marketingEmail: prefs?.marketingEmail ?? false,
              pushEnabled: prefs?.pushEnabled ?? false,
            }}
          />
        </Card>
      </div>
    </Container>
  );
}