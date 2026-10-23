import mongoose from "mongoose";
import Show from "../models/Show.js";
import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import Booking from "../models/Booking.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import { inngest } from "../inngest/index.js";

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error(
    "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env",
  );
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const checkSeatsAvailability = async (
  showId: string | mongoose.Types.ObjectId,
  selectedSeats: string[],
): Promise<boolean> => {
  try {
    const cleanId = showId.toString();
    if (!mongoose.Types.ObjectId.isValid(cleanId)) {
      console.error(
        `checkSeatsAvailability: Invalid ObjectId string received: "${cleanId}"`,
      );
      return false;
    }

    const bookings = await Booking.find({
      show: new mongoose.Types.ObjectId(cleanId),
      paymentStatus: { $in: ["paid", "pending"] },
    }).lean();
    const occupiedSeats = bookings.flatMap((b) => b.bookedSeats);
    return !selectedSeats.some((seat) => occupiedSeats.includes(seat));
  } catch (error: any) {
    console.error("checkSeatsAvailability error:", error.message);
    return false;
  }
};

const claimSeats = async (
  showId: mongoose.Types.ObjectId,
  selectedSeats: string[],
  bookingId: mongoose.Types.ObjectId,
) => {
  const conditions = selectedSeats.map((seat) => ({
    [`occupiedSeats.${seat}`]: { $exists: false },
  }));

  return Show.updateOne(
    {
      _id: showId,
      $and: conditions,
    },
    {
      $set: Object.fromEntries(
        selectedSeats.map((seat) => [
          `occupiedSeats.${seat}`,
          bookingId.toString(),
        ]),
      ),
    },
  );
};

const releaseSeats = async (
  showId: mongoose.Types.ObjectId,
  selectedSeats: string[],
  bookingId: mongoose.Types.ObjectId,
) => {
  await Show.updateOne(
    {
      _id: showId,
      $and: selectedSeats.map((seat) => ({
        [`occupiedSeats.${seat}`]: bookingId.toString(),
      })),
    },
    {
      $unset: Object.fromEntries(
        selectedSeats.map((seat) => [`occupiedSeats.${seat}`, ""]),
      ),
    },
  );
};

export const createBooking = async (req: Request, res: Response) => {
  let showObjectId: mongoose.Types.ObjectId | undefined;
  let bookingId: mongoose.Types.ObjectId | undefined;
  let selectedSeats: string[] = [];
  let seatsClaimed = false;

  try {
    const { userId } = getAuth(req);
    const { showId, selectedSeats: requestedSeats } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not Authenticated",
      });
    }

    if (
      !showId ||
      !Array.isArray(requestedSeats) ||
      requestedSeats.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "showId and selectedSeats are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(showId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid showId",
      });
    }

    const validSeats = requestedSeats.every(
      (seat: unknown) =>
        typeof seat === "string" &&
        seat.trim().length > 0 &&
        !seat.includes(".") &&
        !seat.startsWith("$") &&
        !seat.includes("\0"),
    );

    if (!validSeats || new Set(requestedSeats).size !== requestedSeats.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid or duplicate seat selections.",
      });
    }

    selectedSeats = requestedSeats;
    showObjectId = new mongoose.Types.ObjectId(showId);

    const showData = await Show.findById(showObjectId);

    if (!showData) {
      return res.status(404).json({
        success: false,
        message: "Show not found",
      });
    }

    const totalAmount = showData.showPrice * selectedSeats.length;

    bookingId = new mongoose.Types.ObjectId();

    // Atomically claim every selected seat before creating a booking.
    const result = await claimSeats(showObjectId, selectedSeats, bookingId);

    if (result.modifiedCount !== 1) {
      return res.status(409).json({
        success: false,
        message: "One or more selected seats are no longer available.",
      });
    }

    seatsClaimed = true;

    const booking = await Booking.create({
      _id: bookingId,
      user: userId,
      show: showObjectId,
      amount: totalAmount,
      bookedSeats: selectedSeats,
      paymentStatus: "pending",
    });

    // Create the Razorpay order only after seats are claimed.
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100),
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

    await inngest
      .send({
        name: "app/checkpayment",
        data: {
          bookingId: booking._id.toString(),
        },
      })
      .catch((err) => {
        console.error("Inngest payment-check dispatch failed:", err);
      });

    await inngest
      .send({
        name: "app/show.booked",
        data: {
          bookingId: booking._id.toString(),
        },
      })
      .catch((err) => {
        console.error("Inngest show-booked dispatch failed:", err);
      });

    return res.status(201).json({
      success: true,
      order: razorpayOrder,
      bookingId: booking._id,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error("createBooking error:", error);

    // Release only seats owned by this booking.
    if (seatsClaimed && showObjectId && bookingId) {
      try {
        await releaseSeats(showObjectId, selectedSeats, bookingId);
        await Booking.findByIdAndDelete(bookingId);
      } catch (cleanupError) {
        console.error("Booking cleanup failed:", cleanupError);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Unable to initialize booking. Please try again.",
    });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Not Authenticated" });

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
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });

    if (booking.user !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (
      booking.razorpayOrderId !== razorpay_order_id ||
      booking.paymentStatus !== "pending"
    ) {
      return res.status(409).json({
        success: false,
        message: "Invalid order or booking is no longer pending.",
      });
    }

    booking.paymentStatus = "paid";
    booking.paymentId = razorpay_payment_id;
    await booking.save();

    return res.json({ success: true, message: "Booking confirmed!" });
  } catch (error: any) {
    console.error("verifyPayment error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getOccupiedSeats = async (req: Request, res: Response) => {
  try {
    const { showId } = req.params;
    if (!showId || typeof showId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing showId parameter",
      });
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
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });

    // user field is a String (Clerk userId) — direct string comparison is correct
    if (booking.user !== userId)
      return res.status(403).json({ success: false, message: "Unauthorized" });

    if (booking.paymentStatus !== "pending")
      return res.status(400).json({
        success: false,
        message: "Only pending bookings can be cancelled",
      });

    await Booking.findByIdAndDelete(bookingId);

    return res.json({ success: true, message: "Booking cancelled." });
  } catch (error: any) {
    console.error("cancelBooking error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
