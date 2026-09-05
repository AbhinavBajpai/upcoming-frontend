import { useId, useState } from "react";
import { Film, ExternalLink } from "lucide-react";
import { dateLabel } from "../calendar/api";
import type { Film as FilmData } from "../stars/api";
import { StarButton } from "../stars/StarButton";
function Poster({ film }: { film: FilmData }) {
  const [failed, setFailed] = useState(false);
  const valid = film.posterPath && /^\/[a-zA-Z0-9_.-]+$/.test(film.posterPath);
  return (
    <div className="poster">
      {valid && !failed ? (
        <img
          src={`https://image.tmdb.org/t/p/w185${film.posterPath}`}
          alt=""
          width="92"
          height="138"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <Film size={25} aria-hidden="true" />
          <span className="sr-only">Poster unavailable</span>
        </>
      )}
    </div>
  );
}

export function FilmCard({
  film,
  past = false,
  showYear = false,
}: {
  film: FilmData;
  past?: boolean;
  showYear?: boolean;
}) {
  const headingId = useId();
  return (
    <article
      className={`film-card${past ? " film-past" : ""}`}
      aria-labelledby={headingId}
    >
      <Poster key={`${film.id}-${film.posterPath}`} film={film} />
      <div className="film-info">
        <p className="film-category">
          {film.isRevival ? "BACK ON THE BIG SCREEN" : "UK CINEMA RELEASE"}
        </p>
        <h4 id={headingId}>{film.title}</h4>
        <p className="film-release">
          {film.isRevival ? "Theatrical revival" : "In cinemas"} ·{" "}
          {film.releaseDate ? (
            <time dateTime={film.releaseDate}>
              {dateLabel(film.releaseDate)}
              {showYear ? ` ${film.releaseDate.slice(0, 4)}` : null}
            </time>
          ) : (
            "Date to be confirmed"
          )}
        </p>
        <div className="film-links">
          <StarButton film={film} />
          {film.imdbId ? (
            <a
              href={`https://www.imdb.com/title/${film.imdbId}/`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${film.title} on IMDb (opens in a new tab)`}
            >
              IMDb <ExternalLink size={13} aria-hidden="true" />
            </a>
          ) : (
            <span
              className="film-link-unavailable"
              aria-label={`IMDb page unavailable for ${film.title}`}
              title="IMDb page unavailable"
            >
              IMDb
            </span>
          )}
          <a
            href={`https://letterboxd.com/tmdb/${film.tmdbId}/`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${film.title} on Letterboxd (opens in a new tab)`}
          >
            Letterboxd <ExternalLink size={13} aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}
