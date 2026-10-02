import Link from "next/link";
import { cityLabel, formatPrice } from "@/lib/nepal";
import { Badge } from "@/components/ui/primitives";
import { SmartImage } from "@/components/ui/smart-image";

export type CourtCardData = {
  id: string;
  slug: string;
  name: string;
  city: string;
  images: string[];
  indoorOutdoor: string;
  pricePerHour: number | null;
};

export function CourtCard({ court }: { court: CourtCardData }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/courts/${court.slug}`}>
        <div className="relative aspect-[16/9] overflow-hidden bg-brand-100">
          <SmartImage
            src={court.images[0]}
            alt={`${court.name} court`}
            className="h-full w-full transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3">
            <Badge tone="brand">{court.indoorOutdoor === "INDOOR" ? "Indoor" : "Outdoor"}</Badge>
          </span>
        </div>
        <div className="p-4">
          <h3 className="font-bold text-ink group-hover:text-brand-800">{court.name}</h3>
          <p className="mt-0.5 text-sm text-ink-soft">{cityLabel(court.city)}</p>
          <p className="mt-2 text-sm font-semibold text-brand-800">
            {court.pricePerHour ? `${formatPrice(court.pricePerHour)} / hour` : "Pricing on request"}
          </p>
        </div>
      </Link>
    </article>
  );
}

export function CourtCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface-raised">
      <div className="skeleton aspect-[16/9]" />
      <div className="space-y-2 p-4">
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-3 w-1/3" />
      </div>
    </div>
  );
}