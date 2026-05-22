import mongoose from "mongoose";
import Show from "../models/Show.js";
import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import Booking from "../models/Booking.js";

//Function to check availability of selected seats for a movie

const checkSeatsAvailability = async (
  showId: string | mongoose.Types.ObjectId,
  selectedSeats: string[],
) => {
  try {
    const showData = await Show.findById(showId);
    if (!showData) return false;

    const occupiedSeats = showData.occupiedSeats;
    const isAnySeatTaken = selectedSeats.some((seat) => occupiedSeats[seat]);

    return !isAnySeatTaken;
  } catch (error: any) {
    console.log(error.message);
    return false;
  }
};

export const createBooking = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    const { showId, selectedSeats } = req.body;
    const { origin } = req.headers;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Not Authenticated" });
    }
    if (!showId || !selectedSeats?.length) {
      return res
        .status(400)
        .json({
          success: false,
          message: "ShowId and selectedSeats are required",
        });
    }
    //check if the seat is available for the selected show
    const isAvailable = await checkSeatsAvailability(showId, selectedSeats);
    if (!isAvailable) {
      return res
        .status(409)
        .json({ success: false, message: "Selected Seats are not available." });
    }
    //Get the Show details
    const showData = await Show.findById(showId).populate("movie");
    if (!showData) {
      return res.status(404).json({
        success: false,
        message: "Show not found",
      });
    }
    //Create a new Booking
    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount: showData.showPrice * selectedSeats.length,
      bookedSeats: selectedSeats,
    });

    selectedSeats.map((seat: string) => {
      showData.occupiedSeats[seat] = userId;
    });
    showData?.markModified("occupiedSeats");
    await showData?.save();

    //Stripe Gateway Initialize
    res.json({ success: true, message: "Booked Successfully" });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      messaeg: error.message,
    });
  }
};


export const getOccupiedSeats = async(req:Request,res:Response)=>{
    try {
        const {showId} = req.params;
        const showData = await Show.findById(showId);

        const occupiedSeats = Object.keys(showData?.occupiedSeats)
        res.json({success:true,occupiedSeats})

    } catch (error:any) {
        console.error(error);
    return res.status(500).json({
      success: false,
      messaeg: error.message,
    });
    }
}