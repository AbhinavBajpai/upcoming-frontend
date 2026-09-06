import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useAccount } from "../accounts/context";
import { socialChanges } from "../interest/events";
import { createFriendState } from "./store";

// App mounts this with the account ID as its key: requests never cross accounts.
export function FriendsBadge() {
  const { refresh } = useAccount();
  const state = useMemo(() => createFriendState(), []);
  const view = useSyncExternalStore(state.subscribe, state.getSnapshot);
  useEffect(() => {
    const stop = state.start();
    const focus = () =>
      state.visibility(document.visibilityState === "visible");
    const blur = () => state.visibility(false);
    const changed = () => {
      if (!socialChanges.pending())
        state.visibility(document.visibilityState === "visible");
    };
    const unsubscribe = socialChanges.subscribe(changed);
    const timer = window.setInterval(changed, 60_000);
    window.addEventListener("focus", focus);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", focus);
    return () => {
      stop();
      unsubscribe();
      window.clearInterval(timer);
      window.removeEventListener("focus", focus);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [state]);
  useEffect(() => {
    if (view.signedOut) void refresh();
  }, [view.signedOut, refresh]);
  const count = view.data?.connections?.incoming.length ?? 0;
  if (!count) return null;
  return (
    <>
      <span className="friends-badge" aria-hidden="true">
        {count > 99 ? "99+" : count}
      </span>
      <span className="sr-only">
        {" "}
        — {count} incoming friend {count === 1 ? "request" : "requests"}
      </span>
    </>
  );
}
