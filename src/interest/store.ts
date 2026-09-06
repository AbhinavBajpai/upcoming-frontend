import { z } from "zod";
import { socialChanges } from "./events";
const schema = z.object({
  films: z.array(
    z.object({
      filmId: z.string(),
      friends: z.array(z.object({ id: z.string(), displayName: z.string() })),
    }),
  ),
});
export type InterestedFriend = z.infer<
  typeof schema
>["films"][number]["friends"][number];
export function createInterestState(
  userId: string | undefined,
  filmIds: string[],
) {
  let snapshot = {
    films: {} as Record<string, InterestedFriend[]>,
    error: false,
  };
  const ids = [...new Set(filmIds)];
  const listeners = new Set<() => void>();
  let active = false,
    visible = true,
    version = 0,
    controller: AbortController | undefined;
  function update(value: typeof snapshot) {
    snapshot = value;
    listeners.forEach((fn) => fn());
  }
  function cancel() {
    version++;
    controller?.abort();
  }
  async function load(preserve = false) {
    cancel();
    if (!preserve) update({ films: {}, error: false });
    if (
      !active ||
      !visible ||
      !userId ||
      !ids.length ||
      socialChanges.pending()
    )
      return;
    const ticket = version;
    controller = new AbortController();
    const signal = controller.signal;
    try {
      const films: Record<string, InterestedFriend[]> = {};
      // Bounded batches keep URLs short and never issue one request per card.
      for (let offset = 0; offset < ids.length; offset += 100) {
        const batch = ids.slice(offset, offset + 100);
        const response = await fetch(
          `/api/friends/interest?filmIds=${encodeURIComponent(batch.join(","))}`,
          { credentials: "same-origin", signal },
        );
        if (!response.ok) throw new Error("INTEREST_UNAVAILABLE");
        const result = schema.parse(await response.json());
        if (
          result.films.length !== batch.length ||
          new Set(result.films.map((f) => f.filmId)).size !== batch.length ||
          result.films.some((f) => !batch.includes(f.filmId))
        )
          throw new Error("INVALID_INTEREST");
        for (const film of result.films) films[film.filmId] = film.friends;
        if (!active || ticket !== version) return;
      }
      if (active && ticket === version) update({ films, error: false });
    } catch {
      if (active && ticket === version) update({ films: {}, error: true });
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    start() {
      active = true;
      const unsubscribe = socialChanges.subscribe(() => void load());
      void load();
      return () => {
        active = false;
        version++;
        controller?.abort();
        unsubscribe();
      };
    },
    visibility(value: boolean) {
      visible = value;
      // Keep confirmed names while unfocused and during the next refresh.
      if (value) void load(true);
      else cancel();
    },
    refresh: () => void load(),
  };
}
