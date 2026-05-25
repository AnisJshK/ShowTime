import { type AxiosStatic } from "axios";
import { createContext, useContext } from "react";
import type { useAuth, useUser } from "@clerk/react";
import type { NavigateFunction } from "react-router-dom";
import type { Movie,ActiveShow } from "../lib/types";

interface AppContextType {
  axios: AxiosStatic;
  fetchIsAdmin: () => Promise<any>;
  user: ReturnType<typeof useUser>["user"];
  getToken: ReturnType<typeof useAuth>["getToken"];
  navigate: NavigateFunction;
  isAdmin: boolean;
  shows: ActiveShow[]; // ✅ use ActiveShow from types.ts
  favoriteMovies: Movie[];
  fetchFavoriteMovies: () => Promise<void>;
  image_base_url: string;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};