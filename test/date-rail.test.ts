import { expect, it } from "vitest";
import { monthDates, nearestDate } from "../src/calendar/dates";
it("keeps every calendar day, including leap-year February and 31-day months", () => {
  expect(monthDates("2028-02")).toHaveLength(29);
  expect(monthDates("2027-02")).toHaveLength(28);
  expect(monthDates("2026-12").at(-1)).toBe("2026-12-31");
});
it("snaps empty days to the nearest release, with earlier dates winning ties", () => {
  const dates = ["2026-09-05", "2026-09-11", "2026-09-30"];
  expect(nearestDate(dates, 1)).toBe(dates[0]);
  expect(nearestDate(dates, 8)).toBe(dates[0]);
  expect(nearestDate(dates, 10)).toBe(dates[1]);
  expect(nearestDate(dates, 31)).toBe(dates[2]);
  expect(nearestDate([], 5)).toBeUndefined();
});
