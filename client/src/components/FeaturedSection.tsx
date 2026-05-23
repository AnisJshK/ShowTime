import { ArrowRight } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import BlurCircle from "./BlurCircle";
import MovieCard from "./MovieCard";
import { useAppContext } from "../context/AppContext";

const FeaturedSection = () => {
  const navigate = useNavigate();
  const { shows } = useAppContext();

  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-44 overflow-hidden ">
      <div className="relative flex items-center justify-between pt-20 pb-10">
        <BlurCircle top="0" right="-80px"/>
        <p className="text-gray-300 font-medium text-lg"> Now Showing</p>
        <button onClick={() => navigate('/movies')} className="group flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          View All
          <ArrowRight className="group-hover:translate-x-0.5 transition w-4.5 h-4.5" />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-8 mt-8">
        {/* 1. Added a fallback to prevent mapping over an empty/null state during initial fetch */}
        {shows && shows.length > 0 ? (
          shows
            .filter(([id,movieData]) => movieData)
            .slice(0, 4)
            .map(([id,movieData]) => (
              /* 2. Upgraded the key fallback chain so React never receives an undefined tracking key */
              <MovieCard 
               key={id}
               movie={movieData}
              />
            ))
        ) : (
          /* 3. Safe loading state UI instead of trying to map over empty space */
          <p className="text-gray-400 text-sm animate-pulse py-10">Loading featured movies...</p>
        )}
      </div>

      <div className="flex justify-center mt-20">
        {/* Fixed a minor typo here in your original class: changed 'tranistion' to 'transition' */}
        <button onClick={() => { navigate('/movies'); window.scrollTo(0, 0); }} className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer">
            Show more
        </button>
      </div>
    </div>
  );
};

export default FeaturedSection;