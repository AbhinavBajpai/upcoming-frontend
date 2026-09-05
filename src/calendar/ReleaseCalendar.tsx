import { FilmCard } from "../components/FilmCard";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  X,
} from "lucide-react";
import {
  currentUkMonth,
  dateLabel,
  fetchCalendar,
  monthLabel,
  offsetMonth,
  type CalendarFilm,
  type ReleaseCalendar as CalendarData,
} from "./api";

type Result =
  | { month: string; data: CalendarData; error?: never }
  | { month: string; error: true; data?: never };

export function ReleaseCalendar({ active }: { active: boolean }) {
  const [month, setMonth] = useState(currentUkMonth);
  const [filter, setFilter] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const calendarRef = useRef<HTMLElement>(null);
  const nextDateRef = useRef<HTMLElement>(null);
  const processedMonth = useRef<string | null>(null);
  const positions = useRef(new Map<string, number>());
  const returning = useRef(false);
  const data = result?.month === month ? result.data : undefined;
  const failed = result?.month === month && result.error;
  const loading = !data && !failed;
  const range = result?.data?.range;
  const currentMonth = data?.currentMonth ?? currentUkMonth();

  useEffect(() => {
    const controller = new AbortController();
    void fetchCalendar(month, controller.signal).then(
      (payload) => {
        if (!controller.signal.aborted) setResult({ month, data: payload });
      },
      () => {
        if (!controller.signal.aborted) setResult({ month, error: true });
      },
    );
    return () => controller.abort();
  }, [month, attempt]);

  useEffect(() => {
    if (!active) {
      returning.current = true;
      return;
    }
    if (!data) return;
    const frame = requestAnimationFrame(() => {
      if (processedMonth.current === month && !returning.current) return;
      const saved = positions.current.get(month);
      if (saved !== undefined)
        window.scrollTo({ top: saved, behavior: "instant" });
      else if (month === data.currentMonth && !filter && nextDateRef.current)
        nextDateRef.current.scrollIntoView({
          block: "start",
          behavior: "instant",
        });
      else if (processedMonth.current !== null)
        calendarRef.current?.scrollIntoView({
          block: "start",
          behavior: "instant",
        });
      processedMonth.current = month;
      returning.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [active, data, month, filter]);

  useEffect(() => {
    if (!active) return;
    const save = () => {
      if (
        processedMonth.current === month &&
        calendarRef.current?.getClientRects().length
      )
        positions.current.set(month, window.scrollY);
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, [active, month]);

  const visible =
    data?.films.filter((f) =>
      f.title
        .toLocaleLowerCase("en-GB")
        .includes(filter.trim().toLocaleLowerCase("en-GB")),
    ) ?? [];
  const groups = new Map<string, CalendarFilm[]>();
  for (const film of visible) {
    const group = groups.get(film.releaseDate) ?? [];
    group.push(film);
    groups.set(film.releaseDate, group);
  }
  const nextDate = [...groups.keys()].find(
    (date) => data && date >= data.today,
  );
  function changeMonth(next: string) {
    setMonth(next);
    setFilter("");
  }
  function retry() {
    setResult(null);
    setAttempt((value) => value + 1);
  }
  return (
    <section
      ref={calendarRef}
      className="calendar"
      aria-labelledby="calendar-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">IN UK CINEMAS</p>
          <h2 id="calendar-title">{monthLabel(month)}</h2>
        </div>
        <span className="country">
          <MapPin size={15} aria-hidden="true" /> United Kingdom
        </span>
      </div>
      <div className="calendar-toolbar">
        <div className="month-controls" aria-label="Choose a month">
          <button
            type="button"
            className="icon-button"
            aria-label="Previous month"
            disabled={!range || month <= range.from || loading}
            onClick={() => changeMonth(offsetMonth(month, -1))}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="month-today"
            disabled={month === currentMonth}
            onClick={() => changeMonth(currentMonth)}
          >
            This month
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Next month"
            disabled={!range || month >= range.to || loading}
            onClick={() => changeMonth(offsetMonth(month, 1))}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="title-filter">
          <Search size={17} aria-hidden="true" />
          <label className="sr-only" htmlFor="film-filter">
            Filter titles for this month
          </label>
          <input
            id="film-filter"
            type="search"
            placeholder="Find a film this month…"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          {filter && (
            <button
              type="button"
              className="clear-filter"
              aria-label="Clear title filter"
              onClick={() => setFilter("")}
            >
              <X size={17} />
            </button>
          )}
        </div>
      </div>
      {loading && (
        <div className="calendar-loading" role="status">
          <span className="loading-dot" /> Loading this month’s films…
        </div>
      )}
      {failed && (
        <div className="empty-state" role="alert">
          <h3>We couldn’t load the calendar.</h3>
          <p>Please try again in a moment.</p>
          <button type="button" className="action-button" onClick={retry}>
            Try again
          </button>
        </div>
      )}
      {data && (
        <>
          <p className="calendar-summary" role="status">
            {visible.length} {visible.length === 1 ? "film" : "films"}
            {filter ? " matching your search" : " on the calendar"}
            {data.lastSuccessfulSync && (
              <span>
                Updated{" "}
                {new Intl.DateTimeFormat("en-GB", {
                  timeZone: "Europe/London",
                  day: "numeric",
                  month: "short",
                }).format(new Date(data.lastSuccessfulSync))}
              </span>
            )}
          </p>
          {!data.monthSynced && (
            <p className="calendar-notice">
              We’re still gathering release dates for this month. Check back
              soon.
            </p>
          )}
          {visible.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <CalendarDays size={28} strokeWidth={1.5} aria-hidden="true" />
              </div>
              <h3>
                {filter
                  ? "No titles match your search."
                  : data.monthSynced
                    ? "No releases listed for this month."
                    : "Good films are on their way."}
              </h3>
              <p>
                {filter
                  ? "Try a different title, or clear the filter."
                  : "You can explore another month while we keep an eye on what’s coming."}
              </p>
              {filter && (
                <button
                  type="button"
                  className="action-button"
                  onClick={() => setFilter("")}
                >
                  Show all films
                </button>
              )}
            </div>
          ) : (
            <div className="release-groups">
              {[...groups].map(([date, films]) => {
                const past = date < data.today;
                return (
                  <section
                    className={`release-day${past ? " release-day-past" : ""}`}
                    key={date}
                    ref={date === nextDate ? nextDateRef : undefined}
                    aria-labelledby={`date-${date}`}
                    data-release-date={date}
                  >
                    <div className="date-heading">
                      <h3 id={`date-${date}`}>
                        <time dateTime={date}>{dateLabel(date)}</time>
                      </h3>
                      <span>
                        {date === data.today
                          ? "Today"
                          : past
                            ? "Released"
                            : `${films.length} ${films.length === 1 ? "film" : "films"}`}
                      </span>
                    </div>
                    <div className="film-grid">
                      {films.map((film) => (
                        <FilmCard key={film.id} film={film} past={past} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
