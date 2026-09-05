import { afterEach, describe, expect, it, vi } from "vitest";
import { createStarState } from "../src/stars/store";
import type { Film } from "../src/stars/api";
const film: Film = {
  id: "film-a",
  tmdbId: 1,
  title: "A film",
  posterPath: null,
  imdbId: null,
  releaseDate: "2026-09-10",
  isRevival: false,
};
const another = { ...film, id: "film-b", title: "Another film", tmdbId: 2 };
const list = (films: Film[] = []) =>
  Response.json({
    today: "2026-09-05",
    films: films.map((f) => ({ ...f, section: "upcoming" })),
  });
function deferred() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
afterEach(() => vi.unstubAllGlobals());
describe("shared stars state", () => {
  it("ignores a stale list response during an optimistic save and prevents duplicate clicks", async () => {
    const stale = deferred(),
      save = deferred();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(list())
      .mockReturnValueOnce(stale.promise)
      .mockReturnValueOnce(save.promise)
      .mockImplementation(() => Promise.resolve(list([film])));
    vi.stubGlobal("fetch", fetch);
    const state = createStarState("alice");
    state.start();
    await state.load();
    const refresh = state.load();
    const saving = state.toggle(film);
    await state.toggle(film);
    expect(state.getSnapshot().films.map((f) => f.id)).toEqual([film.id]);
    expect(state.getSnapshot().pending.has(film.id)).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(3);
    stale.resolve(list());
    await refresh;
    expect(state.getSnapshot().films).toHaveLength(1);
    save.resolve(Response.json({ filmId: film.id, starred: true }));
    await saving;
    await vi.waitFor(() => expect(state.getSnapshot().pending.size).toBe(0));
    expect(state.getSnapshot().films).toHaveLength(1);
  });
  it("rolls back only the failed film while another save succeeds, retaining the error", async () => {
    const failure = deferred(),
      success = deferred();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(list())
        .mockReturnValueOnce(failure.promise)
        .mockReturnValueOnce(success.promise)
        .mockImplementation(() => Promise.resolve(list([another]))),
    );
    const state = createStarState("alice");
    state.start();
    await state.load();
    const a = state.toggle(film),
      b = state.toggle(another);
    failure.resolve(new Response(null, { status: 503 }));
    await a;
    expect(state.getSnapshot().films.map((f) => f.id)).toEqual([another.id]);
    success.resolve(Response.json({ filmId: another.id, starred: true }));
    await b;
    await vi.waitFor(() => expect(state.getSnapshot().pending.size).toBe(0));
    expect(state.getSnapshot().error).toContain(film.title);
    await state.load();
    expect(state.getSnapshot().error).toBeNull();
  });
  it("restores an unsuccessful unstar and reports expired sessions", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(list([film]))
        .mockResolvedValueOnce(new Response(null, { status: 401 })),
    );
    const state = createStarState("alice");
    state.start();
    await state.load();
    expect(await state.toggle(film)).toBe("unauthorized");
    expect(state.getSnapshot().films.map((f) => f.id)).toEqual([film.id]);
    expect(state.getSnapshot().error).toContain(film.title);
  });
  it("does not reveal a previous account's late response after sign-out", async () => {
    const late = deferred();
    const fetch = vi.fn().mockReturnValue(late.promise);
    vi.stubGlobal("fetch", fetch);
    const alice = createStarState("alice"),
      stop = alice.start();
    const loading = alice.load();
    stop();
    const signedOut = createStarState(undefined);
    signedOut.start();
    await signedOut.load();
    late.resolve(list([film]));
    await loading;
    expect(alice.getSnapshot().films).toEqual([]);
    expect(signedOut.getSnapshot().films).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("keeps saves disabled after a failed initial load and supports retry", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(list());
    vi.stubGlobal("fetch", fetch);
    const state = createStarState("alice");
    state.start();
    await state.load();
    expect(state.getSnapshot().ready).toBe(false);
    await state.toggle(film);
    expect(fetch).toHaveBeenCalledTimes(1);
    await state.load();
    expect(state.getSnapshot().ready).toBe(true);
    expect(state.getSnapshot().error).toBeNull();
  });
});
