// In-memory invalidation only: never persist another person's interests.
const listeners = new Set<() => void>();
let pending = 0;
export const socialChanges = {
  pending: () => pending > 0,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  changed() {
    listeners.forEach((fn) => fn());
  },
  begin() {
    pending++;
    socialChanges.changed();
    let finished = false;
    return () => {
      if (!finished) {
        finished = true;
        pending--;
        socialChanges.changed();
      }
    };
  },
};
