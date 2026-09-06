import { InterestProvider } from "../interest/InterestProvider";
import { useId } from "react";
import { sortedStars, type StarredFilm } from "./api";
import { FilmCard } from "../components/FilmCard";
export function WatchListSections({ films }: { films: StarredFilm[] }) {
  const sorted = sortedStars(films);
  const prefix = useId();
  return (
    <InterestProvider filmIds={films.map((f) => f.id)}>
      {(["upcoming", "released", "tbc"] as const).map((section) => {
        const entries = sorted.filter((f) => f.section === section);
        if (!entries.length) return null;
        return (
          <section
            className={`starred-section${section === "released" ? " release-day-past" : ""}`}
            key={section}
            aria-labelledby={`${prefix}-${section}`}
          >
            <div className="date-heading">
              <h2 id={`${prefix}-${section}`}>
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
    </InterestProvider>
  );
}
