import { Star } from "lucide-react";
import { useStars } from "./context";
import { useAccount } from "../accounts/context";
import type { Film } from "./api";
export function StarButton({ film }: { film: Film }) {
  const { user } = useAccount();
  const { films, loading, ready, pending, toggle } = useStars();
  const starred = films.some((f) => f.id === film.id);
  return (
    <button
      type="button"
      className={`film-save-button${starred ? " is-starred" : ""}`}
      aria-label={`${starred ? "Unstar" : "Star"} ${film.title}`}
      aria-pressed={starred}
      disabled={loading || pending.has(film.id) || (!!user && !ready)}
      onClick={() => void toggle(film)}
    >
      <Star
        size={16}
        fill={starred ? "currentColor" : "none"}
        aria-hidden="true"
      />
      {starred ? "Starred" : "Star"}
    </button>
  );
}
