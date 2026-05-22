


import mongoose from "mongoose";
import Show from "../models/Show.js"


//Function to check availability of selected seats for a movie

const checkSeatsAvailability = async(
    showId:string|mongoose.Types.ObjectId,
    selectedSeats:string[]
)=>{
    try {
        const showData = await Show.findById(showId)
        if(!showData) return false;

        const occupiedSeats = showData.occupiedSeats;
        const isAntSeatTake = selectedSeats.some(seat=>occupiedSeats[seat])

    } catch (error) {
        
    }
}