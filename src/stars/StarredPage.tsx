import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { useAccount } from "../accounts/context";
import { useStars } from "./context";
import { WatchListSections } from "./WatchListSections";
export function StarredPage() {
  const { user, loading: accountLoading } = useAccount();
  const { films, loading, ready, error } = useStars();
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
          <WatchListSections films={films} />
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
