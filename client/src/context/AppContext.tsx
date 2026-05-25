import axios from "axios";
import { createContext, useContext } from "react";
import { useAuth, useUser } from "@clerk/react";
import { useNavigate } from "react-router-dom";

interface Movie {
  _id: string;
  backdrop_path: string;
  title: string;
  [key: string]: any;
}

interface Show {
  _id: string;
  movie: Movie;
  [key: string]: any;
}

interface AppContextType {
  axios: typeof axios;
  fetchIsAdmin: () => Promise<boolean>;
  user: ReturnType<typeof useUser>["user"];
  getToken: ReturnType<typeof useAuth>["getToken"];
  navigate: ReturnType<typeof useNavigate>;
  isAdmin: boolean;
  shows: Show[];
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