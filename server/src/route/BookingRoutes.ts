import express from 'express'
import { createBooking, getOccupiedSeats, verifyPayment } from '../controllers/BookingController.js';
import { requireAuth } from '@clerk/express';

const bookingRouter = express.Router();

bookingRouter.post('/create',createBooking);
bookingRouter.get('/seats/:showId',getOccupiedSeats);
bookingRouter.post('/create',requireAuth(),createBooking);
bookingRouter.post('/verify-payment',requireAuth(),verifyPayment);

export default bookingRouter