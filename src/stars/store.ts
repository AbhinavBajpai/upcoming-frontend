import { starredListSchema, type Film, type StarredFilm } from "./api";
export function createStarState(userId: string | undefined) {
  let snapshot = {
    films: [] as StarredFilm[],
    loading: !!userId,
    ready: false,
    error: null as string | null,
    pending: new Set<string>(),
  };
  const listeners = new Set<() => void>();
  const inFlight = new Set<string>();
  let version = 0,
    active = false,
    today = "";
  function update(patch: Partial<typeof snapshot>) {
    snapshot = { ...snapshot, ...patch };
    for (const listener of listeners) listener();
  }
  async function load(preserveError = false) {
    if (!userId || inFlight.size) return;
    const ticket = ++version;
    try {
      const response = await fetch("/api/stars", {
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("STARS_UNAVAILABLE");
      const data = starredListSchema.parse(await response.json());
      if (active && version === ticket) {
        today = data.today;
        update({
          films: data.films,
          ready: true,
          ...(preserveError ? {} : { error: null }),
        });
      }
    } catch {
      if (active && version === ticket)
        update({ error: "We couldn’t load your stars. Please try again." });
    } finally {
      if (active && version === ticket) update({ loading: false });
    }
  }
  async function toggle(film: Film): Promise<"unauthorized" | void> {
    if (!userId || !snapshot.ready || inFlight.has(film.id)) return;
    const previous = snapshot.films.find((f) => f.id === film.id),
      starred = !previous;
    const optimistic: StarredFilm = {
      ...film,
      section: !film.releaseDate
        ? "tbc"
        : film.releaseDate >= today
          ? "upcoming"
          : "released",
    };
    version++;
    inFlight.add(film.id);
    update({
      pending: new Set(inFlight),
      error: null,
      films: starred
        ? [...snapshot.films, optimistic]
        : snapshot.films.filter((f) => f.id !== film.id),
    });
    let success = false,
      unauthorized = false;
    try {
      const response = await fetch(
        `/api/stars/${encodeURIComponent(film.id)}`,
        {
          method: starred ? "PUT" : "DELETE",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        },
      );
      unauthorized = response.status === 401;
      if (!response.ok) throw new Error("SAVE_FAILED");
      const result = (await response.json()) as {
        filmId?: unknown;
        starred?: unknown;
      };
      if (result.filmId !== film.id || result.starred !== starred)
        throw new Error("SAVE_FAILED");
      success = true;
    } catch {
      if (active)
        update({
          films: previous
            ? [...snapshot.films.filter((f) => f.id !== film.id), previous]
            : snapshot.films.filter((f) => f.id !== film.id),
          error: `We couldn’t save the change to “${film.title}”. Please try again.`,
        });
    } finally {
      inFlight.delete(film.id);
      if (active) {
        update({ pending: new Set(inFlight) });
        if (success && !inFlight.size) void load(true);
      }
    }
    if (unauthorized) return "unauthorized";
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start: () => {
      active = true;
      return () => {
        active = false;
        version++;
      };
    },
    load,
    toggle,
  };
}
