import { ArrowRight, CalendarIcon, ClockIcon } from "lucide-react";
import React from "react";
import { assets } from "../assets/assets";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();
  return (
    <div className='flex flex-col items-start justify-center gap-4 px-6 md:px-16 lg:px-36 bg-[url("./assets/avengers.jpg")] bg-cover bg-center h-screen'>
      <img src={assets.marvelLogo} alt="" className="max-h-11 lg:h-11 mt-20" />

      <h1 className="text-5xl md:text-[70px] md:leading-18 font-semibold max-w-110">
        Avengers <br /> Endgame
      </h1>

      <div className="flex items-center gap-4 text-gray-300">
        <span>Action | Adventure | Sci-Fi</span>
        <div>
          <CalendarIcon className="w-4.5 h-4.5" /> 2018
        </div>
        <div>
          <ClockIcon className="w-4.5 h-4.5" /> 2h 8m
        </div>
      </div>
      <p className="max-w-md text-gray-300">
        Set in the Marvel universe,After the devastating events of Infinity War, Earth’s mightiest heroes unite once again in Avengers: Endgame to reverse the damage caused by Thanos and restore balance to the universe. Filled with epic battles, emotional moments, and unforgettable character arcs, the film marks the grand conclusion of Marvel’s Infinity Saga.
      </p>
      <button
        onClick={() => navigate("/movies")}
        className="flex items-center gap-1 px-6 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
      >
        Explore Movies
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default HeroSection;
