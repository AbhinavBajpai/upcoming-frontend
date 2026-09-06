import { FriendInterest } from "../interest/FriendInterest";
import { useId, useState } from "react";
import { Film } from "lucide-react";
import { dateLabel } from "../calendar/api";
import type { Film as FilmData } from "../stars/api";
import { StarButton } from "../stars/StarButton";
import { useStars } from "../stars/context";
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
  const { films } = useStars();
  const starred = films.some((entry) => entry.id === film.id);
  return (
    <article
      className={`film-card${past ? " film-past" : ""}${starred ? " film-card-starred" : ""}`}
      aria-labelledby={headingId}
    >
      <Poster key={`${film.id}-${film.posterPath}`} film={film} />
      <div className="film-info">
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
        <div className="film-primary-action">
          <StarButton film={film} />
        </div>
        <FriendInterest filmId={film.id} title={film.title} />
        <div className="film-links">
          {film.imdbId ? (
            <a
              href={`https://www.imdb.com/title/${film.imdbId}/`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${film.title} on IMDb (opens in a new tab)`}
            >
              <img
                className="imdb-logo"
                src="/brands/imdb.svg"
                width="22"
                height="22"
                alt=""
              />
            </a>
          ) : (
            <span
              className="film-link-unavailable"
              aria-label={`IMDb page unavailable for ${film.title}`}
              title="IMDb page unavailable"
            >
              <img
                className="imdb-logo"
                src="/brands/imdb.svg"
                width="22"
                height="22"
                alt=""
              />
            </span>
          )}
          <a
            href={`https://letterboxd.com/tmdb/${film.tmdbId}/`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${film.title} on Letterboxd (opens in a new tab)`}
          >
            <img
              className="letterboxd-logo"
              src="/brands/letterboxd.svg"
              width="22"
              height="22"
              alt=""
            />
          </a>
        </div>
      </div>
    </article>
  );
}
