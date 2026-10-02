import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { AdminNav } from "@/components/admin/nav";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { Avatar, Pagination } from "@/components/ui/misc";
import { formatDateShort } from "@/lib/dates";
import { UserAdminRow } from "@/components/admin/user-row";

export const metadata: Metadata = {
  title: "Admin · Users",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 25;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }>;
}) {
  requireAdmin().catch(() => redirect("/login?next=/admin/users"));

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const where = {
    ...(params.q
      ? {
          OR: [
            { fullName: { contains: params.q, mode: "insensitive" as const } },
            { email: { contains: params.q, mode: "insensitive" as const } },
            { username: { contains: params.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(params.role ? { role: params.role.toUpperCase() as never } : {}),
    ...(params.status ? { status: params.status.toUpperCase() as never } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        city: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        avatarUrl: true,
        _count: { select: { gamesCreated: true, posts: true, reportsFiled: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  const pageCount = Math.ceil(total / PAGE_SIZE);

  const buildHref = (nextPage: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "page") search.set(key, value);
    }
    if (nextPage > 1) search.set("page", String(nextPage));
    const query = search.toString();
    return query ? `/admin/users?${query}` : "/admin/users";
  };

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Users</h1>
      <p className="mt-1 text-ink-soft">{total} accounts. Suspending or banning a user ends their sessions immediately.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <AdminNav />

        <div>
          <form className="flex flex-wrap gap-2" action="/admin/users">
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Search name, email, username"
              className="min-w-48 flex-1 rounded-xl border border-line px-3 py-2 text-sm"
            />
            <select name="role" defaultValue={params.role ?? ""} className="rounded-xl border border-line px-3 py-2 text-sm">
              <option value="">All roles</option>
              {["PLAYER", "CLUB_ADMIN", "COACH", "ORGANIZER", "SELLER", "MODERATOR", "ADMIN"].map((role) => (
                <option key={role} value={role}>{role.replace(/_/g, " ")}</option>
              ))}
            </select>
            <select name="status" defaultValue={params.status ?? ""} className="rounded-xl border border-line px-3 py-2 text-sm">
              <option value="">All statuses</option>
              {["ACTIVE", "SUSPENDED", "BANNED"].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <button type="submit" className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
              Filter
            </button>
          </form>

          {users.length === 0 ? (
            <div className="mt-6">
              <EmptyState title="No users match" description="Try a different search or filter." icon="👥" />
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {users.map((user) => (
                <li key={user.id}>
                  <Card className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Avatar name={user.fullName} src={user.avatarUrl} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                          {user.fullName}
                          <Badge tone="neutral">{user.role.replace(/_/g, " ")}</Badge>
                          {user.status !== "ACTIVE" ? (
                            <Badge tone={user.status === "BANNED" ? "danger" : "warning"}>{user.status}</Badge>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-ink-soft">
                          @{user.username} · {user.email} · {user.city.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-ink-soft">
                          Joined {formatDateShort(user.createdAt)} · {user._count.gamesCreated} games ·{" "}
                          {user._count.posts} posts
                        </p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <UserAdminRow userId={user.id} status={user.status} />
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}

          <Pagination page={page} pageCount={pageCount} buildHref={buildHref} />
        </div>
      </div>
    </Container>
  );
}