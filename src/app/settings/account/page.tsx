import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/misc";
import { Card } from "@/components/ui/primitives";
import { formatNepalPhone } from "@/lib/nepal";

export const metadata: Metadata = {
  title: "Account settings",
  robots: { index: false, follow: false },
};

export default async function AccountSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings/account");

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      email: true,
      emailVerified: true,
      phone: true,
      fullName: true,
      username: true,
      city: true,
      role: true,
      status: true,
      createdAt: true,
      referrerCode: true,
      referredById: true,
      _count: { select: { sessions: true } },
    },
  });

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Settings", href: "/settings" }, { label: "Account" }]} />
      <h1 className="text-2xl font-bold tracking-tight text-ink">Account</h1>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-ink">Details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Full name</dt>
              <dd className="font-medium text-ink">{account?.fullName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Username</dt>
              <dd className="font-medium text-ink">@{account?.username}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Email</dt>
              <dd className="font-medium text-ink">
                {account?.email}{" "}
                {account?.emailVerified ? (
                  <span className="text-xs text-brand-700">verified</span>
                ) : (
                  <span className="text-xs text-amber-700">unverified</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Phone</dt>
              <dd className="font-medium text-ink">{account ? formatNepalPhone(account.phone) : ""}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Role</dt>
              <dd className="font-medium text-ink">{account?.role.replace(/_/g, " ")}</dd>
            </div>
          </dl>
          <Link href="/profile/edit" className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline">
            Edit profile →
          </Link>
        </Card>

        <Card>
          <h2 className="font-semibold text-ink">Security</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            <li>· Active sessions: {account?._count.sessions ?? 0}</li>
            <li>· Password: use the reset flow to change it</li>
            <li>· Changing your password signs you out everywhere</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/forgot-password"
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:bg-brand-50"
            >
              Reset password
            </Link>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Log out
              </button>
            </form>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-ink">Your referral code</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Share this so friends can join with <code className="rounded bg-brand-50 px-1">{account?.referrerCode}</code>.
          </p>
          <p className="mt-2 text-xs text-ink-soft">
            Referral rewards are tracked but no monetary reward is promised.
          </p>
        </Card>

        <Card>
          <h2 className="font-semibold text-ink">Settings</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/settings/privacy" className="text-brand-700 hover:underline">Privacy</Link></li>
            <li><Link href="/settings/notifications" className="text-brand-700 hover:underline">Notification preferences</Link></li>
            <li><Link href="/games/saved" className="text-brand-700 hover:underline">Saved items</Link></li>
            <li><Link href="/notifications" className="text-brand-700 hover:underline">Notifications</Link></li>
          </ul>
        </Card>
      </div>
    </Container>
  );
}