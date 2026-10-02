import { relativeDayLabel } from "@/lib/dates";
import { Avatar } from "@/components/ui/misc";

export type ReviewData = {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date;
  reviewer: { username: string; fullName: string; avatarUrl: string | null };
};

export function ReviewList({ reviews }: { reviews: ReviewData[] }) {
  if (reviews.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-surface-raised px-4 py-8 text-center text-sm text-ink-soft">
        No reviews yet. Be the first to share how this court plays.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {reviews.map((review) => (
        <li key={review.id} className="rounded-xl border border-line bg-surface-raised p-4">
          <div className="flex items-center gap-3">
            <Avatar name={review.reviewer.fullName} src={review.reviewer.avatarUrl} size={32} />
            <div>
              <a href={`/players/${review.reviewer.username}`} className="text-sm font-semibold text-ink hover:text-brand-800">
                {review.reviewer.fullName}
              </a>
              <p className="text-xs text-ink-soft">{relativeDayLabel(review.createdAt)}</p>
            </div>
            <span className="ml-auto text-sm font-bold text-accent-700" aria-label={`${review.rating} out of 5`}>
              {"★".repeat(review.rating)}
              <span className="text-line">{"★".repeat(5 - review.rating)}</span>
            </span>
          </div>
          <p className="mt-2 text-sm text-ink">{review.comment}</p>
        </li>
      ))}
    </ul>
  );
}
