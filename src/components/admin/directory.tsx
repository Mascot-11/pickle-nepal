import Link from "next/link";
import { Container } from "@/components/ui/container";
import { AdminNav } from "@/components/admin/nav";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { formatDateShort } from "@/lib/dates";

export type DirectoryRow = {
  id: string;
  name: string;
  meta: string;
  status: string;
  href: string;
  createdAt: Date;
};

export function AdminDirectory({ title, rows }: { title: string; rows: DirectoryRow[] }) {
  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
      <p className="mt-1 text-ink-soft">Read-only overview of the most recent records.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <AdminNav />
        <div>
          {rows.length === 0 ? (
            <EmptyState title="Nothing here yet" description="Records will appear once created." />
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                    <th className="px-5 py-3">Name</th>
                    <th className="py-3">Details</th>
                    <th className="py-3">Status</th>
                    <th className="px-5 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-3">
                        <Link href={row.href} className="font-medium text-ink hover:text-brand-800">
                          {row.name}
                        </Link>
                      </td>
                      <td className="py-3 text-ink-soft">{row.meta}</td>
                      <td className="py-3">
                        <Badge tone="neutral">{row.status}</Badge>
                      </td>
                      <td className="px-5 py-3 text-ink-soft">{formatDateShort(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
}
