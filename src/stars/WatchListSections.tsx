import { DateRail } from "../calendar/DateRail";
import { InterestProvider } from "../interest/InterestProvider";
import { useId, useState } from "react";
import { type StarredFilm } from "./api";
import { FilmCard } from "../components/FilmCard";
import { currentUkMonth, dateLabel, monthLabel } from "../calendar/api";
import { MonthControls } from "../calendar/MonthControls";

export function WatchListSections({ films }: { films: StarredFilm[] }) {
  const currentMonth = currentUkMonth();
  const [month, setMonth] = useState(currentMonth);
  const [tbc, setTbc] = useState(false);
  const prefix = useId();
  const months = [
    ...new Set([
      currentMonth,
      month,
      ...films.flatMap((f) =>
        f.releaseDate ? [f.releaseDate.slice(0, 7)] : [],
      ),
    ]),
  ].sort();
  const undated = films.filter((f) => !f.releaseDate);
  const visible = (
    tbc ? undated : films.filter((f) => f.releaseDate?.startsWith(`${month}-`))
  )
    .slice()
    .sort(
      (a, b) =>
        (a.releaseDate ?? "").localeCompare(b.releaseDate ?? "") ||
        a.title.localeCompare(b.title, "en-GB") ||
        a.id.localeCompare(b.id),
    );
  const groups = new Map<string, StarredFilm[]>();
  for (const film of visible) {
    const date = film.releaseDate ?? "tbc";
    groups.set(date, [...(groups.get(date) ?? []), film]);
  }
  function changeMonth(value: string) {
    setMonth(value);
    setTbc(false);
  }
  return (
    <InterestProvider filmIds={visible.map((f) => f.id)}>
      <div className="watch-month-heading">
        <h2>{tbc ? "Date to be confirmed" : monthLabel(month)}</h2>
        <button
          type="button"
          className="watch-tbc"
          aria-pressed={tbc}
          onClick={() => setTbc(!tbc)}
        >
          {tbc ? "Back to month" : `Date TBC (${undated.length})`}
        </button>
      </div>
      <div className="calendar-toolbar">
        <MonthControls
          month={tbc ? "" : month}
          currentMonth={currentMonth}
          from={months[0]}
          to={months.at(-1)}
          disabled={tbc}
          onChange={changeMonth}
        />
        <label className="watch-month-select">
          Jump to month
          <select
            aria-label="Watch list month"
            value={month}
            onChange={(e) => changeMonth(e.target.value)}
          >
            {months.map((value) => (
              <option key={value} value={value}>
                {monthLabel(value)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="calendar-summary" role="status">
        {visible.length} {visible.length === 1 ? "film" : "films"}{" "}
        {tbc ? "awaiting a date" : "this month"}
      </p>
      {!visible.length && (
        <div className="empty-state">
          <h3>
            {tbc
              ? "No films awaiting a date."
              : "No watch-list films this month."}
          </h3>
          <p>
            {tbc
              ? "Films without a release date will appear here."
              : "Explore another month or check Date TBC for films awaiting a date."}
          </p>
        </div>
      )}
      <DateRail
        key={`${month}-${tbc}`}
        month={month}
        dates={tbc ? [] : [...groups.keys()]}
      >
        <div className="release-groups">
          {[...groups].map(([date, entries]) => (
            <section
              key={date}
              data-release-date={date === "tbc" ? undefined : date}
              className="release-day"
              aria-labelledby={`${prefix}-${date}`}
            >
              <div className="date-heading">
                <h3 id={`${prefix}-${date}`}>
                  {date === "tbc" ? "Awaiting a release date" : dateLabel(date)}
                </h3>
                <span>
                  {entries.length} {entries.length === 1 ? "film" : "films"}
                </span>
              </div>
              <div className="film-grid">
                {entries.map((film) => (
                  <FilmCard
                    key={film.id}
                    film={film}
                    past={film.section === "released"}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </DateRail>
    </InterestProvider>
  );
}
