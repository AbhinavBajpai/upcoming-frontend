import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WatchListSections } from "../src/stars/WatchListSections";
import type { StarredFilm } from "../src/stars/api";

function film(title: string, releaseDate: string | null): StarredFilm {
  return {
    id: title,
    title,
    releaseDate,
    tmdbId: 1,
    posterPath: null,
    imdbId: null,
    isRevival: false,
    section: releaseDate ? "upcoming" : "tbc",
  };
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-05T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

it("includes the previous month's first day and all future dates, keeps TBC separate and restores the selected month", () => {
  render(
    <MemoryRouter>
      <WatchListSections
        films={[
          film("Too old", "2026-07-31"),
          film("Previous month", "2026-08-01"),
          film("This month", "2026-09-10"),
          film("Far future", "2028-01-01"),
          film("Undated", null),
        ]}
      />
    </MemoryRouter>,
  );
  expect(screen.getAllByRole("article")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "All months" }));
  expect(screen.getAllByRole("article").map((a) => a.textContent)).toEqual([
    expect.stringContaining("Previous month"),
    expect.stringContaining("This month"),
    expect.stringContaining("Far future"),
  ]);
  expect(screen.getByRole("status")).toHaveTextContent(
    "3 films from August 2026 onward",
  );
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Date TBC (1)" }));
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("article", { name: "Undated" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Back to list" }));
  expect(screen.getAllByRole("article")).toHaveLength(3);
  fireEvent.click(screen.getByRole("button", { name: "By month" }));
  expect(screen.getByRole("combobox")).toHaveValue("2026-09");
  expect(screen.getAllByRole("article")).toHaveLength(1);
});

it("uses the previous UK month across the year boundary", () => {
  vi.setSystemTime(new Date("2027-01-01T00:00:00Z"));
  render(
    <MemoryRouter>
      <WatchListSections
        films={[
          film("November", "2026-11-30"),
          film("December", "2026-12-01"),
          film("Future", "2029-01-01"),
        ]}
      />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "All months" }));
  expect(
    screen.queryByRole("article", { name: "November" }),
  ).not.toBeInTheDocument();
  expect(screen.getAllByRole("article")).toHaveLength(2);
  expect(screen.getByRole("status")).toHaveTextContent(
    "from December 2026 onward",
  );
});
