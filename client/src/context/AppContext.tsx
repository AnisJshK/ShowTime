import axios, { type AxiosStatic } from "axios";
import { createContext, useContext } from "react";
import type { UserResource } from "@clerk/types";
import type { GetToken } from "@clerk/types";
import type { NavigateFunction } from "react-router-dom";
import type { Movie, ActiveShow } from "../lib/types";

interface AppContextType {
  axios: AxiosStatic;
  fetchIsAdmin: () => Promise<any>;
  user: UserResource | null | undefined;
  getToken: GetToken;
  navigate: NavigateFunction;
  isAdmin: boolean;
  shows: ActiveShow[];
  favoriteMovies: Movie[];
  fetchFavoriteMovies: () => Promise<void>;
  image_base_url: any;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};