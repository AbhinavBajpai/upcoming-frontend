import {
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useAccount } from "../accounts/context";
import { createInterestState } from "./store";
import { InterestContext } from "./context";
export function InterestProvider({
  filmIds,
  active = true,
  children,
}: {
  filmIds: string[];
  active?: boolean;
  children: ReactNode;
}) {
  const { user } = useAccount();
  const key = [...new Set(filmIds)].sort().join(",");
  const state = useMemo(
    () =>
      createInterestState(
        active ? user?.id : undefined,
        key ? key.split(",") : [],
      ),
    [active, user?.id, key],
  );
  const snapshot = useSyncExternalStore(state.subscribe, state.getSnapshot);
  useEffect(() => state.start(), [state]);
  useEffect(() => {
    const focus = () =>
      state.visibility(document.visibilityState === "visible");
    const blur = () => state.visibility(false);
    window.addEventListener("focus", focus);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", focus);
    return () => {
      window.removeEventListener("focus", focus);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [state]);
  return (
    <InterestContext.Provider value={snapshot.films}>
      {active && snapshot.error && (
        <p className="interest-error" role="status">
          Friends’ interest is temporarily unavailable.{" "}
          <button type="button" onClick={state.refresh}>
            Retry friends’ interest
          </button>
        </p>
      )}
      {children}
    </InterestContext.Provider>
  );
}
