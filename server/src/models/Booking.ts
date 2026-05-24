import mongoose, { Schema } from "mongoose";

const bookingSchema = new Schema(
  {
    user: { type: String, required: true, ref: "User" },
    show: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Show" },
    amount: { type: Number, required: true },
    bookedSeats: { type: [String], required: true },

    // Razorpay fields
    razorpayOrderId: { type: String },       // order id returned when creating booking
    paymentId: { type: String },             // razorpay_payment_id after successful payment
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;