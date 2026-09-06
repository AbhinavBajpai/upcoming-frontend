import { afterEach, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OtherMonthMatches } from "../src/calendar/OtherMonthMatches";
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const result = (query: string, title: string) =>
  Response.json({
    query,
    month: "2026-09",
    hasMore: false,
    matches: [
      { filmId: "film", title, month: "2026-10", releaseDate: "2026-10-30" },
    ],
  });
it("debounces typing and rejects a late response after the query changes or clears", async () => {
  vi.useFakeTimers();
  let resolve!: (response: Response) => void;
  const pending = new Promise<Response>((done) => {
    resolve = done;
  });
  const fetch = vi
    .fn()
    .mockReturnValueOnce(pending)
    .mockResolvedValueOnce(result("new", "New match"));
  vi.stubGlobal("fetch", fetch);
  const view = (query: string) => (
    <MemoryRouter>
      <OtherMonthMatches query={query} month="2026-09" active />
    </MemoryRouter>
  );
  const { rerender } = render(view("d"));
  await act(() => vi.advanceTimersByTimeAsync(200));
  rerender(view("devils"));
  await act(() => vi.advanceTimersByTimeAsync(299));
  expect(fetch).not.toHaveBeenCalled();
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(fetch).toHaveBeenCalledTimes(1);
  rerender(view("new"));
  await act(() => vi.advanceTimersByTimeAsync(300));
  expect(screen.getByRole("link", { name: /New match/ })).toBeVisible();
  await act(async () => {
    resolve(result("devils", "Old match"));
    await pending;
  });
  expect(screen.queryByRole("link", { name: /Old match/ })).toBeNull();
  rerender(view(""));
  expect(screen.queryByRole("region")).toBeNull();
});
it("discards responses for the old month when navigation changes the selected month", async () => {
  vi.useFakeTimers();
  let resolve!: (response: Response) => void;
  const pending = new Promise<Response>((done) => {
    resolve = done;
  });
  vi.stubGlobal("fetch", vi.fn().mockReturnValue(pending));
  const view = (month: string) => (
    <MemoryRouter>
      <OtherMonthMatches query="devils" month={month} active />
    </MemoryRouter>
  );
  const { rerender } = render(view("2026-09"));
  await act(() => vi.advanceTimersByTimeAsync(300));
  rerender(view("2026-10"));
  await act(async () => {
    resolve(result("devils", "Old month match"));
    await pending;
  });
  expect(screen.queryByRole("link")).toBeNull();
});
