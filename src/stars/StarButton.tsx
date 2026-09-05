import { Check, Plus } from "lucide-react";
import { useStars } from "./context";
import { useAccount } from "../accounts/context";
import type { Film } from "./api";
export function StarButton({ film }: { film: Film }) {
  const { user } = useAccount();
  const { films, loading, ready, pending, toggle } = useStars();
  const starred = films.some((f) => f.id === film.id);
  const Icon = starred ? Check : Plus;
  return (
    <button
      type="button"
      className={`film-save-button${starred ? " is-starred" : ""}`}
      aria-label={
        starred
          ? `On your watchlist: ${film.title} (remove)`
          : `Want to watch ${film.title}`
      }
      title={starred ? "Remove from your watchlist" : "Add to your watchlist"}
      aria-pressed={starred}
      disabled={loading || pending.has(film.id) || (!!user && !ready)}
      onClick={() => void toggle(film)}
    >
      <Icon size={18} aria-hidden="true" />
      {starred ? "On your watchlist" : "Want to watch"}
    </button>
  );
}
