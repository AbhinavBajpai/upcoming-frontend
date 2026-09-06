import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { scrollOffset } from "./scrollOffset";
import { OtherMonthMatches } from "./OtherMonthMatches";
import { DateRail } from "./DateRail";
import { MonthControls } from "./MonthControls";
import { InterestProvider } from "../interest/InterestProvider";
import { FilmCard } from "../components/FilmCard";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Search, X } from "lucide-react";
import {
  currentUkMonth,
  dateLabel,
  fetchCalendar,
  monthLabel,
  type CalendarFilm,
  type ReleaseCalendar as CalendarData,
} from "./api";

type Result =
  | { month: string; data: CalendarData; error?: never }
  | { month: string; error: true; data?: never };

export function ReleaseCalendar({ active }: { active: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const params = new URLSearchParams(location.search);
  const requestedMonth = params.get("month") ?? "";
  const routeMonth = /^(19|[2-9]\d)\d{2}-(0[1-9]|1[0-2])$/.test(requestedMonth)
    ? requestedMonth
    : currentUkMonth();
  const [month, setMonth] = useState(routeMonth);
  const [filter, setFilter] = useState(() =>
    (params.get("q") ?? "").slice(0, 200),
  );
  const [routeKey, setRouteKey] = useState(location.key);
  // Apply URL navigation before rendering the new list. Bare app-tab links retain
  // the mounted calendar's selection; suggestion links and Back carry explicit state.
  if (active && routeKey !== location.key) {
    setRouteKey(location.key);
    if (location.search || navigationType === "POP") {
      setMonth(routeMonth);
      setFilter((params.get("q") ?? "").slice(0, 200));
    }
  }
  useEffect(() => {
    // A bare tab link may restore a previous selection. Record it in that history
    // entry so Back can distinguish it from a fresh, unfiltered current month.
    if (active && !location.search && (month !== currentUkMonth() || filter)) {
      navigate(`/releases?${new URLSearchParams({ month, q: filter })}`, {
        replace: true,
      });
    }
  }, [active, location.search, month, filter, navigate]);
  const targetFilm = active ? params.get("film") : null;
  const [settledSearch, setSettledSearch] = useState<string | null>(null);
  const searchSettled = useCallback((key: string) => setSettledSearch(key), []);
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
    const root = calendarRef.current;
    const controls = root?.querySelector(".release-month-navigation");
    const header = document.querySelector(".site-header");
    if (!root || !controls) return;
    const measure = () =>
      root.style.setProperty("--release-scroll-offset", `${scrollOffset()}px`);
    const observer = new ResizeObserver(measure);
    observer.observe(controls);
    if (header) observer.observe(header);
    measure();
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [active]);
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
    // Wait for suggestions above the list to settle before positioning a deep-linked card.
    if (
      targetFilm &&
      filter.trim() &&
      settledSearch !== JSON.stringify([filter.trim(), month])
    )
      return;
    const frame = requestAnimationFrame(() => {
      if (targetFilm) {
        const card = [
          ...(calendarRef.current?.querySelectorAll<HTMLElement>(
            "[data-film-id]",
          ) ?? []),
        ].find((element) => element.dataset.filmId === targetFilm);
        if (card) {
          card.scrollIntoView({ block: "start", behavior: "instant" });
          card.focus({ preventScroll: true });
          processedMonth.current = month;
          returning.current = false;
          return;
        }
      }
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
  }, [active, data, month, filter, targetFilm, location.key, settledSearch]);

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
    navigate(`/releases?${new URLSearchParams({ month: next })}`);
  }
  function changeFilter(value: string) {
    setFilter(value);
    navigate(`/releases?${new URLSearchParams({ month, q: value })}`, {
      replace: true,
    });
  }
  function retry() {
    setResult(null);
    setAttempt((value) => value + 1);
  }
  return (
    <InterestProvider filmIds={visible.map((f) => f.id)} active={active}>
      <section
        ref={calendarRef}
        className="calendar"
        aria-labelledby="calendar-title"
      >
        <div className="release-month-navigation">
          <div className="section-heading">
            <div>
              <h2 id="calendar-title">{monthLabel(month)}</h2>
            </div>
          </div>
          <MonthControls
            month={month}
            currentMonth={currentMonth}
            from={range?.from}
            to={range?.to}
            disabled={loading}
            onChange={changeMonth}
          />
        </div>
        <div className="calendar-toolbar">
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
              maxLength={200}
              onChange={(event) => changeFilter(event.target.value)}
            />
            {filter && (
              <button
                type="button"
                className="clear-filter"
                aria-label="Clear title filter"
                onClick={() => changeFilter("")}
              >
                <X size={17} />
              </button>
            )}
          </div>
        </div>
        <OtherMonthMatches
          query={filter}
          month={month}
          active={active}
          onSettled={searchSettled}
        />
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
              {filter ? " matching your search this month" : " on the calendar"}
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
                Release dates for this month have not been updated yet.
              </p>
            )}
            {visible.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <CalendarDays
                    size={28}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
                <h3>
                  {filter
                    ? "No titles match in this month."
                    : data.monthSynced
                      ? "No releases listed for this month."
                      : "Release dates have not been loaded yet."}
                </h3>
                <p>
                  {filter
                    ? "Try a different title, or clear the filter."
                    : "Select another month to view releases."}
                </p>
                {filter && (
                  <button
                    type="button"
                    className="action-button"
                    onClick={() => changeFilter("")}
                  >
                    Show all films
                  </button>
                )}
              </div>
            ) : (
              <DateRail
                key={month}
                month={month}
                dates={[...groups.keys()]}
                active={active}
              >
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
              </DateRail>
            )}
          </>
        )}
      </section>
    </InterestProvider>
  );
}
