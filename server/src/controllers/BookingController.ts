import mongoose from "mongoose";
import Show from "../models/Show.js";
import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import Booking from "../models/Booking.js";
import Razorpay from "razorpay";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const checkSeatsAvailability = async (
  showId: string | mongoose.Types.ObjectId,
  selectedSeats: string[]
) => {
  try {
    const bookings = await Booking.find({ show: showId, paymentStatus: "paid" });
    const occupiedSeats = bookings.flatMap((b) => b.bookedSeats);
    return !selectedSeats.some((seat) => occupiedSeats.includes(seat));
  } catch (error: any) {
    console.log(error.message);
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
      return res.status(400).json({ success: false, message: "ShowId and selectedSeats are required" });

    const isAvailable = await checkSeatsAvailability(showId, selectedSeats);
    if (!isAvailable)
      return res.status(409).json({ success: false, message: "Selected seats are not available." });

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

    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100,
      currency: "INR",
      receipt: booking._id.toString(),
      notes: { bookingId: booking._id.toString(), showId, userId },
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
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId)
      return res.status(401).json({ success: false, message: "Not Authenticated" });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await Booking.findByIdAndUpdate(bookingId, { paymentStatus: "failed" });
      return res.status(400).json({ success: false, message: "Payment verification failed." });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking)
      return res.status(404).json({ success: false, message: "Booking not found" });

    booking.paymentStatus = "paid";
    booking.paymentId = razorpay_payment_id;
    await booking.save();

    return res.json({ success: true, message: "Booking confirmed!" });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getOccupiedSeats = async (req: Request, res: Response) => {
  try {
    const { showId } = req.params;

    const bookings = await Booking.find({ show: showId, paymentStatus: "paid" });
    const occupiedSeats = bookings.flatMap((b) => b.bookedSeats);

    return res.json({ success: true, occupiedSeats });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};