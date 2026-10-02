import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { RANKING_LABEL, RANKING_METHODOLOGY } from "@/lib/stats";
import { CITIES } from "@/lib/nepal";

export const metadata: Metadata = {
  title: "About PickleNepal",
  description:
    "PickleNepal is Nepal's pickleball community: find courts, join open games, follow clubs and tournaments, and grow the game together.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          The home of pickleball in Nepal
        </h1>
        <p className="mt-4 text-lg text-ink-soft">
          PickleNepal answers one question: <strong className="text-ink">how can I play pickleball today?</strong>
        </p>

        <div className="mt-10 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-ink">What we do</h2>
            <ul className="mt-3 space-y-2 text-ink">
              <li>· Help you find a court in your city</li>
              <li>· Show open games you can join today</li>
              <li>· Help you find players at your level, format and position</li>
              <li>· Publish club, coach and tournament information</li>
              <li>· Track your games, results and community points</li>
              <li>· Keep you connected to the people you play with</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-ink">How it works</h2>
            <ol className="mt-3 space-y-2 text-ink">
              <li>1. Create a free account and pick your city.</li>
              <li>2. Tell us your level, format, side and when you are free.</li>
              <li>3. Browse games near you and join one — or create your own.</li>
              <li>4. Play, record the result, and watch your statistics grow.</li>
              <li>5. Enter tournaments, follow clubs, and invite friends.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-ink">Cities</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {CITIES.map((city) => (
                <span key={city.value} className="rounded-full border border-line px-3 py-1 text-sm text-ink-soft">
                  {city.label}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              We ask you to choose your city manually. GPS is optional and never required.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-ink">Honest rankings</h2>
            <Card className="mt-3">
              <p className="font-semibold text-ink">{RANKING_LABEL}</p>
              <p className="mt-1 text-sm text-ink-soft">{RANKING_METHODOLOGY}</p>
              <p className="mt-2 text-sm text-ink-soft">
                We never present an internal score as an official DUPR rating, and we never invent a
                DUPR number for a player.
              </p>
            </Card>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-ink">Community first</h2>
            <p className="mt-3 text-ink">
              Everything that makes PickleNepal useful — finding games, joining courts, following
              players — is free. Bookings, payments, sponsorships and premium features are prepared
              for the future, and business rules live in configuration rather than being hardcoded.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-ink">Safety and privacy</h2>
            <ul className="mt-3 space-y-2 text-ink">
              <li>· Your email, phone and account identifiers are never public.</li>
              <li>· You control who can see your profile.</li>
              <li>· You can block players and report anything that looks wrong.</li>
              <li>· Every moderation action by staff is recorded in an audit log.</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <ButtonLink href="/register" size="lg">
            Join PickleNepal
          </ButtonLink>
          <ButtonLink href="/games" size="lg" variant="secondary">
            Find a Game
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}