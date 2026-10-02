import Link from "next/link";

/** Friendly 403 body (§93). */
export default function Forbidden() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <span className="text-5xl" aria-hidden="true">
        🔒
      </span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">You do not have access to this</h1>
      <p className="mt-2 text-ink-soft">
        Your account does not have permission for this page. If you think that is wrong, ask a club
        admin or reach out to support.
      </p>
      <Link href="/" className="mt-6 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
        Go home
      </Link>
    </div>
  );
}
