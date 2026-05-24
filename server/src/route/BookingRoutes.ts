import express from "express";
import { createBooking, verifyPayment, getOccupiedSeats } from "../controllers/bookingController.js";
import { requireAuth } from "@clerk/express";

const bookingRouter = express.Router();

bookingRouter.get("/seats/:showId", getOccupiedSeats);
bookingRouter.post("/create", requireAuth(), createBooking);
bookingRouter.post("/verify-payment", requireAuth(), verifyPayment);

export default bookingRouter;