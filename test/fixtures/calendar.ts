import type { ReleaseCalendar, CalendarFilm } from "../../src/calendar/api";
function film(id: number, title: string, date: string): CalendarFilm {
  return {
    id: `film-${id}`,
    tmdbId: id,
    title,
    posterPath: null,
    imdbId: id === 11 ? "tt1234567" : null,
    releaseDate: date,
    isRevival: false,
  };
}
export function calendarFixture(month = "2026-09"): ReleaseCalendar {
  return {
    month,
    today: "2026-09-05",
    currentMonth: "2026-09",
    country: "GB",
    range: { from: "2026-09", to: "2027-03" },
    lastSuccessfulSync: "2026-09-05T10:00:00Z",
    monthSynced: true,
    films:
      month === "2026-09"
        ? [
            ...Array.from({ length: 10 }, (_, i) =>
              film(i + 1, `Early September ${i + 1}`, "2026-09-01"),
            ),
            film(11, "Nebula", "2026-09-05"),
            ...Array.from({ length: 14 }, (_, i) =>
              film(i + 12, `A Night at the Pictures ${i + 1}`, "2026-09-30"),
            ),
          ]
        : month === "2026-10"
          ? [
              {
                ...film(31767, "The Devils", "2026-10-30"),
                isRevival: true,
                posterPath: "/missing.jpg",
              },
            ]
          : [],
  };
}
