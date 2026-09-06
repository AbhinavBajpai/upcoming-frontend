import { DateRail } from "../calendar/DateRail";
import { InterestProvider } from "../interest/InterestProvider";
import { useId, useRef, useState } from "react";
import { type StarredFilm } from "./api";
import { FilmCard } from "../components/FilmCard";
import {
  currentUkMonth,
  dateLabel,
  monthLabel,
  offsetMonth,
} from "../calendar/api";
import { useMonthScrollOffset } from "../calendar/useMonthScrollOffset";
import { MonthControls } from "../calendar/MonthControls";

export function WatchListSections({ films }: { films: StarredFilm[] }) {
  const root = useRef<HTMLDivElement>(null);
  useMonthScrollOffset(root);
  const currentMonth = currentUkMonth();
  const [month, setMonth] = useState(currentMonth);
  const [tbc, setTbc] = useState(false);
  const [allMonths, setAllMonths] = useState(false);
  const fromDate = `${offsetMonth(currentMonth, -1)}-01`;
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
    tbc
      ? undated
      : films.filter(
          (f) =>
            f.releaseDate &&
            (allMonths
              ? f.releaseDate >= fromDate
              : f.releaseDate.startsWith(`${month}-`)),
        )
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
    setAllMonths(false);
  }
  return (
    <InterestProvider filmIds={visible.map((f) => f.id)}>
      <div className="watch-list-sections" ref={root}>
        <div className="watch-month-navigation" data-month-navigation>
          <div className="release-month-navigation">
            <div className="section-heading">
              <h2>
                {tbc
                  ? "Date to be confirmed"
                  : allMonths
                    ? "Recent and upcoming"
                    : monthLabel(month)}
              </h2>
            </div>
            <MonthControls
              month={month}
              currentMonth={currentMonth}
              from={months[0]}
              to={months.at(-1)}
              monthActive={!tbc && !allMonths}
              onChange={changeMonth}
            />
          </div>
          <div className="watch-view-controls">
            <button
              type="button"
              className="watch-tbc"
              aria-pressed={allMonths && !tbc}
              onClick={() => {
                setAllMonths(tbc || !allMonths);
                setTbc(false);
              }}
            >
              All
            </button>
            <button
              type="button"
              className="watch-tbc"
              aria-pressed={tbc}
              onClick={() => setTbc(!tbc)}
            >
              TBC ({undated.length})
            </button>
            <label className="watch-month-select">
              <span className="sr-only">Watch list month</span>
              <select
                value={tbc || allMonths ? "" : month}
                onChange={(e) => changeMonth(e.target.value)}
              >
                <option value="" disabled>
                  Month
                </option>
                {months.map((value) => (
                  <option key={value} value={value}>
                    {monthLabel(value)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <p className="calendar-summary" role="status">
          {visible.length} {visible.length === 1 ? "film" : "films"}{" "}
          {tbc
            ? "awaiting a date"
            : allMonths
              ? `from ${monthLabel(offsetMonth(currentMonth, -1))} onward`
              : "this month"}
        </p>
        {!visible.length && (
          <div className="empty-state">
            <h3>
              {tbc
                ? "No films awaiting a date."
                : allMonths
                  ? "No recent or upcoming watch-list films."
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
          dates={tbc || allMonths ? [] : [...groups.keys()]}
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
                    {date === "tbc"
                      ? "Awaiting a release date"
                      : `${dateLabel(date)}${allMonths ? ` ${date.slice(0, 4)}` : ""}`}
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
      </div>
    </InterestProvider>
  );
}
