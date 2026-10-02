import Link from "next/link";
import { formatDateTime, formatDateShort, timeAgo } from "@/lib/dates";
import { Badge } from "./primitives";

export function Avatar({
  name,
  src,
  size = 40,
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${name}'s photo`}
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-200 font-bold text-brand-900 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials || "?"}
    </span>
  );
}

export function VerifiedBadge({ label = "Verified" }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800"
      title={label}
    >
      <span aria-hidden="true">✓</span> {label}
    </span>
  );
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-ink-soft">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {item.href ? (
              <Link href={item.href} className="hover:text-brand-800 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-ink">
                {item.label}
              </span>
            )}
            {index < items.length - 1 ? <span aria-hidden="true">/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function RelativeTime({ value }: { value: Date | string }) {
  const date = new Date(value);
  return (
    <time dateTime={date.toISOString()} title={formatDateTime(date)}>
      {timeAgo(date)}
    </time>
  );
}

export function MetaList({ items }: { items: Array<{ label: string; value: React.ReactNode }> }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-soft">{item.label}</dt>
          <dd className="mt-0.5 text-sm font-semibold text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Pagination({
  page,
  pageCount,
  buildHref,
}: {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  const window = 2;
  const pages: number[] = [];
  for (let i = 1; i <= pageCount; i += 1) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= window) pages.push(i);
  }

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-1" aria-label="Pagination">
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-brand-50"
        >
          Previous
        </Link>
      ) : null}
      {pages.map((p, index) => (
        <span key={p} className="flex items-center gap-1">
          {index > 0 && pages[index - 1] !== p - 1 ? (
            <span className="px-1 text-ink-soft">…</span>
          ) : null}
          <Link
            href={buildHref(p)}
            aria-current={p === page ? "page" : undefined}
            className={`min-w-9 rounded-lg px-3 py-1.5 text-center text-sm font-medium ${
              p === page ? "bg-brand-700 text-white" : "border border-line hover:bg-brand-50"
            }`}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pageCount ? (
        <Link
          href={buildHref(page + 1)}
          className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-brand-50"
        >
          Next
        </Link>
      ) : null}
    </nav>
  );
}

export function DateBadge({ date }: { date: Date | string }) {
  const value = new Date(date);
  const month = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "Asia/Kathmandu" }).format(value);
  return (
    <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-brand-700 py-1.5 text-white">
      <span className="text-[10px] font-semibold uppercase">{month}</span>
      <span className="text-lg font-bold leading-none">{value.getUTCDate()}</span>
    </div>
  );
}

export function TagPill({ label }: { label: string }) {
  return <Badge tone="neutral">{label}</Badge>;
}

export function CopyLinkButton({ url, label = "Copy link" }: { url: string; label?: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium hover:bg-brand-50"
      onClick={undefined}
      data-copy-url={url}
      data-copy-label={label}
    >
      🔗 {label}
    </button>
  );
}

export function ShareRow({ title, path }: { title: string; path: string }) {
  const absolute = typeof window === "undefined" ? path : `${window.location.origin}${path}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ShareButton kind="native" title={title} />
      <ShareButton kind="whatsapp" title={title} absolutePath={absolute} />
      <CopyLinkButton url={path} />
    </div>
  );
}

function ShareButton({
  kind,
  title,
  absolutePath,
}: {
  kind: "native" | "whatsapp";
  title: string;
  absolutePath?: string;
}) {
  return (
    <a
      href={
        kind === "whatsapp"
          ? `https://wa.me/?text=${encodeURIComponent(`${title} — ${absolutePath ?? ""}`)}`
          : "#share"
      }
      target={kind === "whatsapp" ? "_blank" : undefined}
      rel="noreferrer"
      data-share-kind={kind}
      aria-label={kind === "whatsapp" ? "Share on WhatsApp" : "Share"}
      className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium hover:bg-brand-50"
    >
      {kind === "whatsapp" ? "💬" : "↗"} {kind === "whatsapp" ? "WhatsApp" : "Share"}
    </a>
  );
}

export { formatDateShort };