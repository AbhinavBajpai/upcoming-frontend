import { z } from "zod";
import type { CalendarFilm } from "../calendar/api";
export type Film = Omit<CalendarFilm, "releaseDate"> & {
  releaseDate: string | null;
};
export type StarredFilm = Film & { section: "upcoming" | "released" | "tbc" };
export const starredListSchema = z.object({
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  films: z.array(
    z.object({
      id: z.string(),
      tmdbId: z.number().int().positive(),
      title: z.string(),
      posterPath: z.string().nullable(),
      imdbId: z
        .string()
        .regex(/^tt[0-9]+$/)
        .nullable(),
      releaseDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable(),
      isRevival: z.boolean(),
      section: z.enum(["upcoming", "released", "tbc"]),
    }),
  ),
});
export function sortedStars(films: StarredFilm[]) {
  const rank = { upcoming: 0, released: 1, tbc: 2 };
  return [...films].sort(
    (a, b) =>
      rank[a.section] - rank[b.section] ||
      (a.section === "released"
        ? (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "")
        : (a.releaseDate ?? "").localeCompare(b.releaseDate ?? "")) ||
      a.title.localeCompare(b.title, "en-GB") ||
      a.id.localeCompare(b.id),
  );
}
