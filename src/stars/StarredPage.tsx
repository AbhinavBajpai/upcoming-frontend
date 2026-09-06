import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { useAccount } from "../accounts/context";
import { useStars } from "./context";
import { WatchListSections } from "./WatchListSections";
export function StarredPage() {
  const { user, loading: accountLoading } = useAccount();
  const { films, loading, ready, error } = useStars();
  return (
    <section className="starred-page">
      {loading || accountLoading ? (
        <p role="status">Loading watch list…</p>
      ) : !user ? (
        <div className="empty-state">
          <Star size={28} aria-hidden="true" />
          <h2>Sign in to view your watch list</h2>
          <p>Save films you want to watch.</p>
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
              <h2>Your watch list is empty.</h2>
              <p>Select “Want to watch” on a film to add it here.</p>
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
