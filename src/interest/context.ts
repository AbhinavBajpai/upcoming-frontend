import { createContext } from "react";
import type { InterestedFriend } from "./store";
export const InterestContext = createContext<
  Record<string, InterestedFriend[]>
>({});
