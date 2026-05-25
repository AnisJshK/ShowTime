import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AppContext } from "./AppContext";
import axios from "axios";
import { useAuth, useUser } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import type { Movie, ActiveShow } from "../lib/types";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

// Simple TypeScript interfaces to prevent implicit 'never[]' types

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [shows, setShows] = useState<ActiveShow[]>([]);
  const [favoriteMovies, setFavoriteMovies] = useState<Movie[]>([]);

  const image_base_url = import.meta.env.VITE_TMDB_IMAGE_BASE_URL;

  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  // 1. Fetch shows once on mount
 useEffect(() => {
  const fetchShows = async () => {
    try {
      console.log("Fetching shows from:", axios.defaults.baseURL + "/api/show/all");
      const { data } = await axios.get("/api/show/all");
      console.log("RAW API data.shows[0]:", JSON.stringify(data.shows[0])); 
      console.log("Backend API Response raw data:", data);

      if (data.success) {
        // Double check your backend key name! Is it data.shows or data.movies or data.data?
        setShows(data.shows || []); 
        console.log("Successfully set shows state:", data.shows);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Axios network fetch failed:", error);
    }
  };

  fetchShows();
}, []);

  // 2. Fetch favorite movies (useCallback only needs getToken)
  const fetchFavoriteMovies = useCallback(async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get("/api/user/favorites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setFavoriteMovies(data.movies);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  }, [getToken]);

  // 3. Keep verification pure. Do NOT mix route-guarding logic here!
  const fetchIsAdmin = useCallback(async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get("/api/admin/is-Admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsAdmin(data.isAdmin);
      return data.isAdmin; // return value so components can use it directly if needed
    } catch (error) {
      console.error("Error verifying admin status:", error);
      setIsAdmin(false);
      return false;
    }
  }, [getToken]);

  // 4. Synchronize user status securely without causing dependency loops
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setFavoriteMovies([]);
      return;
    }

    const initUserData = async () => {
      await fetchIsAdmin();
      await fetchFavoriteMovies();
    };

    initUserData();
  }, [user, fetchIsAdmin, fetchFavoriteMovies]);

  const value = {
    axios,
    fetchIsAdmin,
    user,
    getToken,
    navigate,
    isAdmin,
    shows,
    favoriteMovies,
    fetchFavoriteMovies,
    image_base_url,
  };
  
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};