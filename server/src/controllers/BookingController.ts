import mongoose from "mongoose";
import Show from "../models/Show.js";
import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import Booking from "../models/Booking.js";
import Razorpay from "razorpay";
import crypto from "crypto";
//Function to check availability of selected seats for a movie

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.BoLXrxlZuLYOcmVhmd1JA6EK!,
});

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
      return res.status(400).json({
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
    const totalamount = showData.showPrice * selectedSeats.length;
    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount: totalamount,
      bookedSeats: selectedSeats,
      paymentStatus: "pending",
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: totalamount * 100,
      currency: "INR",
      receipt: booking._id.toString(),
      notes: {
        bookingId: booking._id.toString(),
        showId,
        userId,
      },
    });

    booking.razorpayOrderId = razorpayOrder.id;
    await booking.save();

    return res.json({
      success: true,
      order: razorpayOrder,
      bookingId: booking._id,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      messaeg: error.message,
    });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Not Authorized" });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await Booking.findByIdAndUpdate(bookingId, { paymentStatus: "failed" });
      return res.status(400).json({
        success: false,
        message: "Payment verification failed.",
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    booking.paymentStatus = "paid";
    booking.paymentId = razorpay_payment_id;
    await booking.save();

    const showData = await Show.findById(booking.show);
    if (!showData) {
      return res.status(404).json({
        success: false,
        message: "Show not found",
      });
    }
    booking.bookedSeats.forEach((seat: string) => {
      showData.occupiedSeats[seat] = userId;
    });
    showData.markModified("occupiedSeats");
    await showData.save();

    return res.json({
      success: true,
      message: "Booking confirmed!",
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getOccupiedSeats = async (req: Request, res: Response) => {
  try {
    const { showId } = req.params;
    const showData = await Show.findById(showId);

    if (!showData) {
      return res
        .status(404)
        .json({ success: false, message: "Show not found" });
    }

    const occupiedSeats = Object.keys(showData.occupiedSeats);
    res.json({ success: true, occupiedSeats });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      messaeg: error.message,
    });
  }
};
