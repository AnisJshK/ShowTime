import axios from "axios";
import { Request, Response } from "express";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";

interface TimeInput{
    time:string[];
    date:string;
}
interface ShowInputItem{
    movie:string;
    showDateTime:Date;
    showPrice:number;
    occupiedSeats:Record<string,any>;
}

//API to get now playing movies from tmdb api
export const getNowPlayingMovies = async (req: Request, res: Response) => {
  try {
    const { data } = await axios.get(
      "https://api.themoviedb.org/3/movie/now_playing",
      {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        },
      },
    );
    const movies = data.results;
    res.json({
      success: true,
      movies: movies,
    });
  } catch (error: any) {
    console.error(error);
    res.json({ succees: false, message: error.message });
  }
};

//Api to add a a new show to the db

export const addShow = async (req: Request, res: Response) => {
  try {
    const { movieId, showsInput, showPrice } = req.body;

    let movie = await Movie.findById(movieId);
    if (!movie) {
      //Fetch movie details and credits from TMDB API
      const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
          headers: {
            Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
          },
        }),
        axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {
          headers: {
            Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
          },
        }),
      ]);

      const movieApiData = movieDetailsResponse.data;
      const movieCreditsData = movieCreditsResponse.data;

      const movieDetails = {
        _id:movieId,
        title:movieApiData.title,
        overview:movieApiData.overview,
        poster_path:movieApiData.poster_path,
        backdrop_path:movieApiData.backdrop_path,
        genres:movieApiData.genres,
        casts:movieCreditsData.cast,
        release_date:movieApiData.release_date,
        original_language:movieApiData.original_language,
        tagline:movieApiData.tagline || "",
        vote_average:movieApiData.vote_average,
        runtime:movieApiData.runtime,
      }
      //Add movie to the database
      movie = await Movie.create(movieDetails);
    }

    const showsToCreate:ShowInputItem[] = [];
    showsInput.forEach((show:any)=>{
        const showDate = show.date;
        show.time.forEach((time:any)=>{
            const dateTimeString = `${showDate}T${time}`;
            showsToCreate.push({
                movie:movieId,
                showDateTime:new Date(dateTimeString),
                showPrice,
                occupiedSeats:{}
            })
        })
    });

    if(showsToCreate.length>0){
        await Show.insertMany(showsToCreate);
    }
    res.json({
        success:true,
        message:"Show Added successfully. "
    })

  } catch (error: any) {
    console.error(error);
    res.json({ succees: false, message: error.message });
  }
};
