import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <span className="text-6xl" aria-hidden="true">
        🏓
      </span>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">Page not found</h1>
      <p className="mt-2 text-ink-soft">
        That page does not exist, or the game, court or player it referred to has been removed.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/" className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
          Go home
        </Link>
        <Link href="/games" className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:bg-brand-50">
          Find a game
        </Link>
      </div>
    </div>
  );
}