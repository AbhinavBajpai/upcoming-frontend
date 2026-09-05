import { z } from "zod";
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const schema = z.object({
  month,
  today: date,
  currentMonth: month,
  country: z.literal("GB"),
  range: z.object({ from: month, to: month }),
  lastSuccessfulSync: z.iso.datetime().nullable(),
  monthSynced: z.boolean(),
  films: z.array(
    z.object({
      id: z.string(),
      tmdbId: z.number().int().positive(),
      title: z.string(),
      posterPath: z.string().nullable(),
      releaseDate: date,
      isRevival: z.boolean(),
    }),
  ),
});
export type ReleaseCalendar = z.infer<typeof schema>;
export type CalendarFilm = ReleaseCalendar["films"][number];
export async function fetchCalendar(
  selectedMonth: string,
  signal: AbortSignal,
): Promise<ReleaseCalendar> {
  const response = await fetch(
    `/api/releases?month=${encodeURIComponent(selectedMonth)}`,
    { signal },
  );
  if (!response.ok) throw new Error("CALENDAR_UNAVAILABLE");
  const data = schema.parse(await response.json());
  if (data.month !== selectedMonth) throw new Error("CALENDAR_MONTH_MISMATCH");
  return data;
}
export function currentUkMonth() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}
export function offsetMonth(month: string, offset: number) {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1))
    .toISOString()
    .slice(0, 7);
}
export function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
  }).format(new Date(`${month}-01T12:00:00Z`));
}
export function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00Z`));
}
