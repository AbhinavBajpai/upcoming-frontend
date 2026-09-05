import { useCallback, useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import { AccountContext, type Profile } from "./context";
const profileSchema = z.object({
  user: z.object({ id: z.string(), displayName: z.string() }),
});
async function readProfile() {
  try {
    const response = await fetch("/api/me", { credentials: "same-origin" });
    if (!response.ok) return null;
    const parsed = profileSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.user : null;
  } catch {
    return null;
  }
}
export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setUser(await readProfile());
    setLoading(false);
  }, []);
  useEffect(() => {
    let active = true;
    void readProfile().then((profile) => {
      if (active) {
        setUser(profile);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <AccountContext.Provider value={{ user, loading, refresh }}>
      {children}
    </AccountContext.Provider>
  );
}
