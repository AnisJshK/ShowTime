import mongoose from "mongoose";
import Show from "../models/Show.js";
import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import Booking from "../models/Booking.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import { inngest } from "../inngest/index.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

/**
 * Checks if all selectedSeats are free for a given show.
 * Blocks seats that are either "paid" OR "pending" so two users
 * can't simultaneously claim the same seat.
 */
const checkSeatsAvailability = async (
  showId: string | mongoose.Types.ObjectId,
  selectedSeats: string[]
): Promise<boolean> => {
  try {
    const bookings = await Booking.find({
      show: new mongoose.Types.ObjectId(showId.toString()),
      paymentStatus: { $in: ["paid", "pending"] },
    });
    const occupiedSeats = bookings.flatMap((b) => b.bookedSeats);
    return !selectedSeats.some((seat) => occupiedSeats.includes(seat));
  } catch (error: any) {
    console.error("checkSeatsAvailability error:", error.message);
    return false;
  }
};

export const createBooking = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    const { showId, selectedSeats } = req.body;

    if (!userId)
      return res.status(401).json({ success: false, message: "Not Authenticated" });

    if (!showId || !selectedSeats?.length)
      return res
        .status(400)
        .json({ success: false, message: "showId and selectedSeats are required" });

    // Delete any abandoned pending bookings by THIS user for THIS show
    // before checking availability, so the user can re-attempt without
    // their own old pending entry blocking them.
    await Booking.deleteMany({
      user: userId,
      show: new mongoose.Types.ObjectId(showId.toString()),
      paymentStatus: "pending",
    });

    const isAvailable = await checkSeatsAvailability(showId, selectedSeats);
    if (!isAvailable)
      return res
        .status(409)
        .json({ success: false, message: "Selected seats are no longer available." });

    const showData = await Show.findById(showId).populate("movie");
    if (!showData)
      return res.status(404).json({ success: false, message: "Show not found" });

    const totalAmount = showData.showPrice * selectedSeats.length;

    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount: totalAmount,
      bookedSeats: selectedSeats,
      paymentStatus: "pending",
    });

    let razorpayOrder;
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: totalAmount * 100, // convert to paise
        currency: "INR",
        receipt: booking._id.toString(),
        notes: { bookingId: booking._id.toString(), showId, userId },
      });
    } catch (razorpayError: any) {
      // Roll back the booking if Razorpay order creation fails
      await Booking.findByIdAndDelete(booking._id);
      console.error("Razorpay order creation error:", razorpayError.message);
      return res
        .status(500)
        .json({ success: false, message: "Payment initialization failed." });
    }

    booking.razorpayOrderId = razorpayOrder.id;
    await booking.save();

    //Run inngest scheduer function to check payment status after 10 minutes

    await inngest.send({
      name:"app/checkpayment",
      data:{
        bookingId:booking._id.toString(),
      }
    })
    
    

    return res.json({
      success: true,
      order: razorpayOrder,
      bookingId: booking._id,
      key: process.env.RAZORPAY_KEY_ID,
    });
    
  } catch (error: any) {
    console.error("createBooking error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId)
      return res.status(401).json({ success: false, message: "Not Authenticated" });

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
    } = req.body;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await Booking.findByIdAndUpdate(bookingId, { paymentStatus: "failed" });
      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed." });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking)
      return res.status(404).json({ success: false, message: "Booking not found" });

    booking.paymentStatus = "paid";
    booking.paymentId = razorpay_payment_id;
    await booking.save();

    await inngest.send({
      name:"app/show.booked",
      data:{
        bookingId,
      }
    })

    return res.json({ success: true, message: "Booking confirmed!" });
    
    
  } catch (error: any) {
    console.error("verifyPayment error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Returns seats that are either paid OR pending so the frontend
 * can gray them out accurately in real time.
 */
export const getOccupiedSeats = async (req: Request, res: Response) => {
  try {
    const { showId } = req.params;
    if (!showId || typeof showId !== 'string') {
      return res.status(400).json({ success: false, message: "Invalid or missing showId parameter" });
    }
    const bookings = await Booking.find({
      show: new mongoose.Types.ObjectId(showId),
      paymentStatus: { $in: ["paid", "pending"] },
    });
    const occupiedSeats = bookings.flatMap((b) => b.bookedSeats);

    return res.json({ success: true, occupiedSeats });
  } catch (error: any) {
    console.error("getOccupiedSeats error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking)
      return res.status(404).json({ success: false, message: "Booking not found" });

    // user field is a String (Clerk userId) — direct string comparison is correct
    if (booking.user !== userId)
      return res.status(403).json({ success: false, message: "Unauthorized" });

    if (booking.paymentStatus !== "pending")
      return res
        .status(400)
        .json({ success: false, message: "Only pending bookings can be cancelled" });

    await Booking.findByIdAndDelete(bookingId);

    return res.json({ success: true, message: "Booking cancelled." });
  } catch (error: any) {
    console.error("cancelBooking error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};