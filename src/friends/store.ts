import {
  readView,
  changeFriend,
  FriendRequestError,
  type FriendView,
} from "./api";
// A store belongs to one mounted account/profile view. Private lists are never
// reused across routes, account changes, hidden tabs or permission refreshes.
export function createFriendState(target?: string) {
  let snapshot = {
    data: null as FriendView | null,
    loading: true,
    pending: false,
    error: null as string | null,
    message: null as string | null,
    signedOut: false,
  };
  let active = false,
    visible = true,
    version = 0;
  let controller: AbortController | undefined;
  const listeners = new Set<() => void>();
  function update(patch: Partial<typeof snapshot>) {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((fn) => fn());
  }
  async function load() {
    if (!active || !visible) return;
    const ticket = ++version;
    controller?.abort();
    controller = new AbortController();
    update({ data: null, loading: true, error: null });
    try {
      const data = await readView(target, controller.signal);
      if (active && ticket === version) update({ data });
    } catch (error) {
      if (active && ticket === version)
        update({
          signedOut:
            error instanceof FriendRequestError && error.status === 401,
          error:
            error instanceof FriendRequestError && error.status === 404
              ? "This profile or watch list is no longer available."
              : "We couldn’t load your friends. Please try again.",
        });
    } finally {
      if (active && ticket === version) update({ loading: false });
    }
  }
  function clear() {
    version++;
    controller?.abort();
    update({ data: null, loading: true });
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    start() {
      active = true;
      void load();
      return () => {
        active = false;
        version++;
        controller?.abort();
      };
    },
    refresh() {
      if (!snapshot.pending) void load();
    },
    visibility(value: boolean) {
      visible = value;
      clear();
      if (value && !snapshot.pending) void load();
    },
    async change(path: string, message: string) {
      if (snapshot.pending || !active) return;
      clear();
      update({ pending: true, message: null, error: null });
      let errorMessage: string | null = null;
      try {
        await changeFriend(path);
        if (active) update({ message });
      } catch (error) {
        if (error instanceof FriendRequestError && error.status === 401) {
          if (active) update({ signedOut: true });
        }
        errorMessage =
          error instanceof FriendRequestError && error.status === 409
            ? "That connection has changed. We’ve refreshed its status; please try again."
            : "We couldn’t save that change. Please try again.";
      }
      if (!active) return;
      update({ pending: false });
      if (!snapshot.signedOut) await load();
      if (active && errorMessage)
        update({ error: errorMessage, loading: false });
    },
  };
}
