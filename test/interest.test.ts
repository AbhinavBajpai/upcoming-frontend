import { afterEach, expect, it, vi } from "vitest";
import { createInterestState } from "../src/interest/store";
import { socialChanges } from "../src/interest/events";
const stops: (() => void)[] = [];
afterEach(() => {
  stops.splice(0).forEach((stop) => stop());
  vi.unstubAllGlobals();
});
const response = (ids: string[], name = "Bob") =>
  Response.json({
    films: ids.map((filmId) => ({
      filmId,
      friends: [{ id: "bob", displayName: name }],
    })),
  });
function start(user: string | undefined, ids: string[]) {
  const state = createInterestState(user, ids);
  stops.push(state.start());
  return state;
}
function deferred() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
it("batches and deduplicates film IDs instead of requesting each card", async () => {
  const ids = Array.from({ length: 205 }, (_, i) => `film-${i}`);
  const fetch = vi.fn(async (url: string) =>
    response(
      new URL(url, "http://localhost").searchParams.get("filmIds")!.split(","),
    ),
  );
  vi.stubGlobal("fetch", fetch);
  const state = start("alice", [...ids, ids[0]]);
  await vi.waitFor(() =>
    expect(Object.keys(state.getSnapshot().films)).toHaveLength(205),
  );
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(
    fetch.mock.calls.map(
      ([url]) =>
        new URL(url, "http://localhost").searchParams.get("filmIds")!.split(",")
          .length,
    ),
  ).toEqual([100, 100, 5]);
});
it("hides names throughout mutations and rejects late responses from before invalidation", async () => {
  const stale = deferred();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(response(["film"]))
    .mockReturnValueOnce(stale.promise)
    .mockResolvedValueOnce(
      Response.json({ films: [{ filmId: "film", friends: [] }] }),
    );
  vi.stubGlobal("fetch", fetch);
  const state = start("alice", ["film"]);
  await vi.waitFor(() =>
    expect(state.getSnapshot().films.film).toHaveLength(1),
  );
  state.refresh();
  expect(state.getSnapshot().films).toEqual({});
  const finish = socialChanges.begin();
  expect(state.getSnapshot().films).toEqual({});
  expect(fetch).toHaveBeenCalledTimes(2);
  finish();
  await vi.waitFor(() => expect(state.getSnapshot().films.film).toEqual([]));
  stale.resolve(response(["film"], "Old private name"));
  await stale.promise;
  await Promise.resolve();
  expect(state.getSnapshot().films.film).toEqual([]);
});
it("clears names on backgrounding, unauthorized refresh and changing account/list", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(response(["film"]))
      .mockResolvedValueOnce(new Response(null, { status: 401 })),
  );
  const state = start("alice", ["film"]);
  await vi.waitFor(() =>
    expect(state.getSnapshot().films.film).toHaveLength(1),
  );
  state.visibility(false);
  expect(state.getSnapshot().films).toEqual({});
  state.visibility(true);
  await vi.waitFor(() => expect(state.getSnapshot().error).toBe(true));
  expect(state.getSnapshot().films).toEqual({});
  const pending = deferred();
  vi.stubGlobal("fetch", vi.fn().mockReturnValue(pending.promise));
  const old = start("alice", ["other"]);
  stops.pop()!();
  const next = start(undefined, ["other"]);
  pending.resolve(response(["other"]));
  await pending.promise;
  await Promise.resolve();
  expect(old.getSnapshot().films).toEqual({});
  expect(next.getSnapshot().films).toEqual({});
});
it("never publishes partial or malformed batches and can retry", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        films: [
          {
            filmId: "unexpected",
            friends: [{ id: "bob", displayName: "Bob" }],
          },
        ],
      }),
    )
    .mockResolvedValueOnce(response(["film"]));
  vi.stubGlobal("fetch", fetch);
  const state = start("alice", ["film"]);
  await vi.waitFor(() => expect(state.getSnapshot().error).toBe(true));
  expect(state.getSnapshot().films).toEqual({});
  state.refresh();
  await vi.waitFor(() =>
    expect(state.getSnapshot().films.film).toHaveLength(1),
  );
});
it("discards an entire list if a later batch loses authorization", async () => {
  const ids = Array.from({ length: 101 }, (_, i) => `film-${i}`);
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(response(ids.slice(0, 100)))
    .mockResolvedValueOnce(new Response(null, { status: 401 }));
  vi.stubGlobal("fetch", fetch);
  const state = start("alice", ids);
  await vi.waitFor(() => expect(state.getSnapshot().error).toBe(true));
  expect(state.getSnapshot().films).toEqual({});
  expect(fetch).toHaveBeenCalledTimes(2);
});
