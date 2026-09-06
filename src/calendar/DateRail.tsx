import { useEffect, useRef, useState, type ReactNode } from "react";
import { scrollOffset } from "./scrollOffset";
import { dateLabel, monthLabel } from "./api";

import { monthDates, nearestDate } from "./dates";

// One large touch/keyboard target, with evenly spaced visual ticks for every day.
export function DateRail({
  month,
  dates,
  active = true,
  children,
}: {
  month: string;
  dates: string[];
  active?: boolean;
  children: ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({
    date: "",
    shown: false,
    top: 140,
  });
  const allDates = monthDates(month);
  const available = [...new Set(dates)].sort();
  const dateKey = available.join(",");
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const root = container.current;
      if (!root) return;
      const top = scrollOffset();
      const rect = root.getBoundingClientRect();
      const groups = [
        ...root.querySelectorAll<HTMLElement>("[data-release-date]"),
      ];
      let date = groups[0]?.dataset.releaseDate ?? "";
      for (const group of groups) {
        if (group.getBoundingClientRect().top <= top + 48)
          date = group.dataset.releaseDate ?? date;
        else break;
      }
      const shown =
        rect.top < top + 80 && rect.bottom > top + 80 && groups.length > 0;
      setPosition((previous) =>
        previous.date === date &&
        previous.shown === shown &&
        previous.top === top
          ? previous
          : { date, shown, top },
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    if (container.current) observer.observe(container.current);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [active, month, dateKey]);
  function jump(date: string | undefined) {
    if (!date) return;
    const group = container.current?.querySelector<HTMLElement>(
      `[data-release-date="${date}"]`,
    );
    if (!group) return;
    const offset = scrollOffset();
    window.scrollTo({
      top: window.scrollY + group.getBoundingClientRect().top - offset,
      behavior: "instant",
    });
    setPosition((previous) => ({ ...previous, date }));
  }
  function drag(y: number) {
    const bounds = rail.current?.getBoundingClientRect();
    if (!bounds) return;
    const day = Math.max(
      1,
      Math.min(
        allDates.length,
        Math.floor(((y - bounds.top) / bounds.height) * allDates.length) + 1,
      ),
    );
    jump(nearestDate(available, day));
  }
  const selected = available.includes(position.date)
    ? position.date
    : available[0];
  return (
    <div
      ref={container}
      className={`date-rail-content${available.length ? " has-date-rail" : ""}`}
    >
      {children}
      {active && position.shown && selected && (
        <div
          ref={rail}
          className="date-rail"
          role="slider"
          tabIndex={0}
          aria-label={`Browse dates in ${monthLabel(month)}`}
          aria-orientation="vertical"
          aria-valuemin={Number(available[0].slice(-2))}
          aria-valuemax={Number(available.at(-1)!.slice(-2))}
          aria-valuenow={Number(selected.slice(-2))}
          aria-valuetext={dateLabel(selected)}
          style={{ top: position.top }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.focus({ preventScroll: true });
            event.currentTarget.setPointerCapture(event.pointerId);
            drag(event.clientY);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              drag(event.clientY);
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onKeyDown={(event) => {
            const index = available.indexOf(selected);
            let next: string | undefined;
            if (["ArrowDown", "ArrowRight"].includes(event.key))
              next = available[Math.min(available.length - 1, index + 1)];
            else if (["ArrowUp", "ArrowLeft"].includes(event.key))
              next = available[Math.max(0, index - 1)];
            else if (event.key === "Home") next = available[0];
            else if (event.key === "End") next = available.at(-1);
            else return;
            event.preventDefault();
            jump(next);
          }}
        >
          {allDates.map((date) => (
            <span
              key={date}
              aria-hidden="true"
              className={`${available.includes(date) ? "date-available" : "date-empty"}${date === selected ? " date-selected" : ""}`}
            >
              {Number(date.slice(-2))}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
