import {
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAccount } from "../accounts/context";
import { returnPath } from "../accounts/client";
import { StarContext } from "./context";
import { createStarState } from "./store";
import type { Film } from "./api";
export function StarProvider({ children }: { children: ReactNode }) {
  const { user, loading: accountLoading, refresh } = useAccount();
  const location = useLocation(),
    navigate = useNavigate();
  // Separate stores isolate account data without remounting the calendar or a
  // password-reset form when the session finishes loading.
  const state = useMemo(() => createStarState(user?.id), [user?.id]);
  const snapshot = useSyncExternalStore(state.subscribe, state.getSnapshot);
  useEffect(() => state.start(), [state]);
  useEffect(() => {
    void state.load();
  }, [state, location.pathname]);
  useEffect(() => {
    const focus = () => {
      if (document.visibilityState === "visible") void state.load();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [state]);
  async function toggle(film: Film) {
    if (accountLoading) return;
    const login = () =>
      navigate(
        `/login?returnTo=${encodeURIComponent(returnPath(location.pathname))}`,
      );
    if (!user) {
      login();
      return;
    }
    if ((await state.toggle(film)) === "unauthorized") {
      login();
      void refresh();
    }
  }
  return (
    <StarContext.Provider
      value={{
        ...snapshot,
        loading: accountLoading || snapshot.loading,
        toggle,
        retry: () => {
          void state.load();
        },
      }}
    >
      {children}
    </StarContext.Provider>
  );
}
