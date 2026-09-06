import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { dateLabel } from "./api";
const schema = z.object({
  query: z.string(),
  month: z.string(),
  hasMore: z.boolean(),
  matches: z
    .array(
      z.object({
        filmId: z.string(),
        title: z.string(),
        month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
        releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .max(20),
});
export function OtherMonthMatches({
  query,
  month,
  active,
  onSettled,
}: {
  query: string;
  month: string;
  active: boolean;
  onSettled?: (key: string) => void;
}) {
  const trimmed = query.trim();
  const key = JSON.stringify([trimmed, month]);
  const [result, setResult] = useState<{
    key: string;
    data?: z.infer<typeof schema>;
    error?: boolean;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!active || !trimmed) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/releases/search?${new URLSearchParams({ q: trimmed, month })}`,
            { signal: controller.signal },
          );
          if (!response.ok) throw new Error("SEARCH_UNAVAILABLE");
          const data = schema.parse(await response.json());
          if (
            data.query !== trimmed ||
            data.month !== month ||
            data.matches.some(
              (match) =>
                match.month === month ||
                !match.releaseDate.startsWith(`${match.month}-`),
            )
          )
            throw new Error("SEARCH_MISMATCH");
          if (!controller.signal.aborted) {
            setResult({ key, data });
            onSettled?.(key);
          }
        } catch {
          if (!controller.signal.aborted) {
            setResult({ key, error: true });
            onSettled?.(key);
          }
        }
      })();
    }, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [active, trimmed, month, key, attempt, onSettled]);
  if (!active || !trimmed) return null;
  const current = result?.key === key ? result : null;
  if (!current)
    return (
      <p className="other-month-status" role="status">
        Searching other months…
      </p>
    );
  if (current.error)
    return (
      <p className="other-month-status" role="status">
        Other-month suggestions are unavailable.{" "}
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setAttempt((value) => value + 1);
          }}
        >
          Retry suggestions
        </button>
      </p>
    );
  if (!current.data?.matches.length) return null;
  return (
    <section
      className="other-month-matches"
      aria-label="Matches in other months"
    >
      <h3>Matches in other months</h3>
      <ul>
        {current.data.matches.map((match) => (
          <li key={`${match.filmId}/${match.month}`}>
            <Link
              to={`/releases?${new URLSearchParams({ month: match.month, q: trimmed, film: match.filmId })}`}
            >
              <span>{match.title}</span>
              <time dateTime={match.releaseDate}>
                {dateLabel(match.releaseDate)} {match.releaseDate.slice(0, 4)}{" "}
                <span aria-hidden="true">→</span>
              </time>
            </Link>
          </li>
        ))}
      </ul>
      {current.data.hasMore && (
        <p>
          Showing the first 20 matches. Refine your search to see fewer results.
        </p>
      )}
    </section>
  );
}
