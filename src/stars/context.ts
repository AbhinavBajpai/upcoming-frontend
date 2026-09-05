import { createContext, useContext } from "react";
import type { Film, StarredFilm } from "./api";
export const StarContext = createContext<{
  films: StarredFilm[];
  loading: boolean;
  ready: boolean;
  error: string | null;
  pending: Set<string>;
  toggle: (film: Film) => Promise<void>;
  retry: () => void;
}>({
  films: [],
  loading: false,
  ready: false,
  error: null,
  pending: new Set(),
  toggle: async () => {},
  retry: () => {},
});
export const useStars = () => useContext(StarContext);
