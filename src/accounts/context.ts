import { createContext, useContext } from "react";
export interface Profile {
  id: string;
  displayName: string;
}
export const AccountContext = createContext<{
  user: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
}>({ user: null, loading: true, refresh: async () => {} });
export const useAccount = () => useContext(AccountContext);
