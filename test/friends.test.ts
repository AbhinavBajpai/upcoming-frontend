import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createFriendState } from "../src/friends/store";
import {
  readView,
  changeFriend,
  FriendRequestError,
  type FriendView,
} from "../src/friends/api";
import { returnPath } from "../src/accounts/client";
vi.mock("../src/friends/api", async (original) => ({
  ...(await original<typeof import("../src/friends/api")>()),
  readView: vi.fn(),
  changeFriend: vi.fn(),
}));
const privateView: FriendView = {
  profile: {
    id: "bob",
    displayName: "Bob",
    relationship: "accepted",
    relationshipId: "request-1",
  },
  watchList: {
    profile: { id: "bob", displayName: "Bob" },
    today: "2026-09-06",
    films: [
      {
        id: "film",
        tmdbId: 1,
        title: "Private film",
        imdbId: null,
        posterPath: null,
        releaseDate: null,
        section: "tbc",
        isRevival: false,
      },
    ],
  },
};
function deferred<T>() {
  let resolve!: (data: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
beforeEach(() => {
  vi.mocked(readView).mockReset();
  vi.mocked(changeFriend).mockReset();
});
afterEach(() => vi.restoreAllMocks());
it("clears private lists before refresh and ignores stale reads after permission loss", async () => {
  const old = deferred<FriendView>();
  vi.mocked(readView)
    .mockResolvedValueOnce(privateView)
    .mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce({
      profile: {
        ...privateView.profile!,
        relationship: "none",
        relationshipId: null,
      },
    });
  const state = createFriendState("bob");
  state.start();
  await vi.waitFor(() =>
    expect(state.getSnapshot().data?.watchList).toBeDefined(),
  );
  state.refresh();
  expect(state.getSnapshot().data).toBeNull();
  state.refresh();
  await vi.waitFor(() =>
    expect(state.getSnapshot().data?.profile?.relationship).toBe("none"),
  );
  old.resolve(privateView);
  await old.promise;
  await Promise.resolve();
  expect(state.getSnapshot().data?.watchList).toBeUndefined();
});
it("discards late responses after leaving a profile/account and hides private data in background tabs", async () => {
  const late = deferred<FriendView>();
  vi.mocked(readView).mockReturnValueOnce(late.promise);
  const state = createFriendState("bob"),
    stop = state.start();
  stop();
  late.resolve(privateView);
  await late.promise;
  expect(state.getSnapshot().data).toBeNull();
  vi.mocked(readView).mockResolvedValue(privateView);
  const current = createFriendState("bob");
  current.start();
  await vi.waitFor(() =>
    expect(current.getSnapshot().data?.watchList).toBeDefined(),
  );
  current.visibility(false);
  expect(current.getSnapshot().data).toBeNull();
  vi.mocked(readView).mockRejectedValue(new FriendRequestError(404));
  current.visibility(true);
  await vi.waitFor(() => expect(current.getSnapshot().loading).toBe(false));
  expect(current.getSnapshot().data).toBeNull();
  expect(current.getSnapshot().error).toContain("no longer available");
});
it("prevents duplicate actions and refreshes permissions after a failed transition", async () => {
  const changing = deferred<void>();
  vi.mocked(changeFriend).mockReturnValue(changing.promise);
  vi.mocked(readView).mockResolvedValue(privateView);
  const state = createFriendState("bob");
  state.start();
  await vi.waitFor(() => expect(state.getSnapshot().data).not.toBeNull());
  const action = state.change("/relationships/request-1/remove", "Removed");
  expect(state.getSnapshot().data).toBeNull();
  await state.change("/relationships/request-1/remove", "Removed");
  expect(changeFriend).toHaveBeenCalledTimes(1);
  vi.mocked(readView).mockRejectedValue(new FriendRequestError(404));
  changing.resolve();
  await action;
  expect(state.getSnapshot().data).toBeNull();
  vi.mocked(changeFriend).mockRejectedValue(new FriendRequestError(409));
  vi.mocked(readView).mockResolvedValue({
    profile: { ...privateView.profile!, relationship: "outgoing" },
  });
  await state.change("/relationships/request-1/accept", "Accepted");
  expect(state.getSnapshot().data?.watchList).toBeUndefined();
  expect(state.getSnapshot().error).toContain("connection has changed");
});
it("signals session expiry without retaining private data", async () => {
  vi.mocked(readView)
    .mockResolvedValueOnce(privateView)
    .mockRejectedValueOnce(new FriendRequestError(401));
  const state = createFriendState("bob");
  state.start();
  await vi.waitFor(() => expect(state.getSnapshot().data).not.toBeNull());
  state.refresh();
  await vi.waitFor(() => expect(state.getSnapshot().signedOut).toBe(true));
  expect(state.getSnapshot().data).toBeNull();
});
it("accepts local friend return routes and rejects external or malformed redirects", () => {
  expect(returnPath("/friends/user-123")).toBe("/friends/user-123");
  for (const value of [
    "https://evil.example",
    "//evil.example",
    "/friends/../account",
    "/friends/a?redirect=x",
    "/friends/%2Fevil",
    "/friends/a/b",
  ])
    expect(returnPath(value)).toBe("/releases");
});
