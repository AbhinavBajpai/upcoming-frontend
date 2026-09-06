import { afterEach, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { FriendsBadge } from "../src/friends/FriendsBadge";
import { socialChanges } from "../src/interest/events";
function response(incoming = 1) {
  const connection = { id: "request", userId: "bob", displayName: "Bob" };
  return new Response(
    JSON.stringify({
      accepted: [],
      incoming: Array.from({ length: incoming }, (_, i) => ({
        ...connection,
        id: String(i),
        relationship: "incoming",
      })),
      outgoing: [{ ...connection, relationship: "outgoing" }],
    }),
  );
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("counts incoming requests, retains them on blur/refetch, and clears after a friendship change", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response(2)));
  render(<FriendsBadge />);
  expect(
    await screen.findByText(/2 incoming friend requests/),
  ).toBeInTheDocument();
  fireEvent.blur(window);
  expect(screen.getByText(/2 incoming friend requests/)).toBeInTheDocument();
  let resolve!: (value: Response) => void;
  vi.mocked(fetch).mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  fireEvent.focus(window);
  expect(screen.getByText(/2 incoming friend requests/)).toBeInTheDocument();
  await act(async () => resolve(response(1)));
  expect(screen.getByText(/1 incoming friend request/)).toBeInTheDocument();
  vi.mocked(fetch).mockResolvedValueOnce(response(0));
  act(() => {
    const finish = socialChanges.begin();
    finish();
  });
  await waitFor(() =>
    expect(screen.queryByText(/incoming friend/)).not.toBeInTheDocument(),
  );
});
it("refreshes incoming requests periodically without needing navigation", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response(0)));
  render(<FriendsBadge />);
  await act(async () => {});
  expect(fetch).toHaveBeenCalledTimes(1);
  vi.mocked(fetch).mockResolvedValueOnce(response(1));
  await act(async () => vi.advanceTimersByTimeAsync(60_000));
  expect(screen.getByText(/1 incoming friend request/)).toBeInTheDocument();
});
it("does not let a late response from an old account populate a new account's badge", async () => {
  let resolve!: (value: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            resolve = r;
          }),
      )
      .mockResolvedValueOnce(response(0)),
  );
  const view = render(<FriendsBadge key="alice" />);
  view.rerender(<FriendsBadge key="charlie" />);
  await act(async () => resolve(response(3)));
  expect(screen.queryByText(/incoming friend/)).not.toBeInTheDocument();
});
