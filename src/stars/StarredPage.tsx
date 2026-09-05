import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { useAccount } from "../accounts/context";
import { useStars } from "./context";
import { sortedStars } from "./api";
import { FilmCard } from "../components/FilmCard";
export function StarredPage() {
  const { user, loading: accountLoading } = useAccount();
  const { films, loading, ready, error } = useStars();
  const sorted = sortedStars(films);
  return (
    <section className="starred-page" aria-labelledby="starred-title">
      <p className="eyebrow">YOUR NEXT GREAT WATCH</p>
      <h1 id="starred-title">
        Worth the <em>wait.</em>
      </h1>
      {loading || accountLoading ? (
        <p role="status">Loading your stars…</p>
      ) : !user ? (
        <div className="empty-state">
          <Star size={28} aria-hidden="true" />
          <h2>A place for your must-sees.</h2>
          <p>Sign in to save the films you’re looking forward to.</p>
          <Link className="action-button" to="/login?returnTo=%2Fstarred">
            Sign in to save films
          </Link>
        </div>
      ) : ready ? (
        <>
          <p className="starred-summary" role="status">
            {films.length} {films.length === 1 ? "film" : "films"} on your list
          </p>
          {!films.length && !error && (
            <div className="empty-state">
              <Star size={28} aria-hidden="true" />
              <h2>Your next great watch is out there.</h2>
              <p>
                Choose “Want to watch” on the release calendar and you’ll find
                your films here.
              </p>
            </div>
          )}
          {(["upcoming", "released", "tbc"] as const).map((section) => {
            const entries = sorted.filter((f) => f.section === section);
            if (!entries.length) return null;
            return (
              <section
                className={`starred-section${section === "released" ? " release-day-past" : ""}`}
                key={section}
                aria-labelledby={`stars-${section}`}
              >
                <div className="date-heading">
                  <h2 id={`stars-${section}`}>
                    {
                      {
                        upcoming: "Upcoming",
                        released: "Already released",
                        tbc: "Date to be confirmed",
                      }[section]
                    }
                  </h2>
                  <span>{entries.length}</span>
                </div>
                <div className="film-grid">
                  {entries.map((film) => (
                    <FilmCard
                      key={film.id}
                      film={film}
                      showYear
                      past={section === "released"}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      ) : null}
      <p>
        <Link className="text-link" to="/releases">
          Back to releases
        </Link>
      </p>
    </section>
  );
}
