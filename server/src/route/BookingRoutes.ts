import express from "express";
import { getAuth, clerkMiddleware } from "@clerk/express";
import { cancelBooking, createBooking, getOccupiedSeats, verifyPayment } from "../controllers/BookingController.js";

const bookingRouter = express.Router();

bookingRouter.get("/seats/:showId", getOccupiedSeats);
bookingRouter.post("/create", clerkMiddleware, createBooking);
bookingRouter.post("/verify-payment", clerkMiddleware, verifyPayment);
bookingRouter.delete("/cancel/:bookingId", clerkMiddleware, cancelBooking);

export default bookingRouter;