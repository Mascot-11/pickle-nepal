import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/misc";
import { Card } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings");

  const links = [
    { href: "/profile/edit", label: "Edit profile", description: "Name, city, skill level, formats and availability" },
    { href: "/settings/account", label: "Account", description: "Email, phone, password and sessions" },
    { href: "/settings/privacy", label: "Privacy", description: "Who can see your profile" },
    { href: "/settings/notifications", label: "Notifications", description: "Choose channels and categories" },
    { href: "/games/saved", label: "Saved items", description: "Games, posts and listings you saved" },
  ];

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Settings" }]} />
      <h1 className="text-2xl font-bold tracking-tight text-ink">Settings</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="h-full hover:border-brand-300">
              <p className="font-semibold text-ink">{link.label}</p>
              <p className="mt-1 text-sm text-ink-soft">{link.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </Container>
  );
}