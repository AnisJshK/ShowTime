import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AppContext } from "./AppContext";
import axios from "axios";
import { useAuth, useUser } from "@clerk/react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [shows, setShows] = useState([]);
  const [favoriteMovies, setFavoriteMovies] = useState([]);

  const { user } = useUser();
  const { getToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();


  //function to fetch all the shows from backend
  useEffect(() => {
    const fetchShows = async () => {
      try {
        const { data } = await axios.get("/api/show/all");
        if (data.success) {
          setShows(data.shows);
        } else {
          toast.error(data.message);
        }
      } catch (error: any) {
        console.error(error);
      }
    };

    fetchShows();
  }, []);

  //function to fetch favorite movies from backend
  const fetchFavoriteMovies = useCallback(async () => {
    const { data } = await axios.get("/api/user/favorites", {
      headers: {
        Authorization: `Bearer ${await getToken()}`,
      },
    });
    if (data.success) {
      setFavoriteMovies(data.movies);
    } else {
      toast.error(data.message);
    }
  }, [getToken]);

  //function to verify if the user is admin or not
  const fetchIsAdmin = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/admin/is-Admin", {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      setIsAdmin(data.isAdmin);

      if (!data.isAdmin && location.pathname.startsWith("/admin")) {
        navigate("/");
        toast.error("You are not authorized to access admin Dashboard");
      }
    } catch (error: any) {
      console.error(error);
    }
  }, [getToken, location.pathname, navigate]);


  useEffect(() => {
    if(!user) return;
    async function init() {
        await fetchIsAdmin();
        await fetchFavoriteMovies();
    }
    init()
  }, [user,fetchIsAdmin,fetchFavoriteMovies]);


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
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
