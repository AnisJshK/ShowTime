import express from "express";
import { getAuth, clerkMiddleware, requireAuth } from "@clerk/express";
import { cancelBooking, createBooking, getOccupiedSeats, verifyPayment } from "../controllers/BookingController.js";

const bookingRouter = express.Router();

bookingRouter.get("/seats/:showId", getOccupiedSeats);
bookingRouter.post("/create",requireAuth(), createBooking);
bookingRouter.post("/verify-payment", requireAuth(), verifyPayment);
bookingRouter.delete("/cancel/:bookingId", requireAuth(), cancelBooking);

export default bookingRouter;