import { Inngest } from "inngest";
import Usermodel from "../models/user.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../config/nodeMailer.js";

export const inngest = new Inngest({ id: "movie-ticket-booking" });

type ClerkUserData = {
  id: string;
  first_name: string;
  last_name: string;
  email_addresses: { email_address: string }[];
  image_url: string;
};
type ClerkDeleteData = {
  id: string;
};

//Inngest function to save user data to a db
// ✅ v4 syntax — trigger is the 2nd argument

const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-from-clerk",
    triggers: [{ event: "clerk/user.created" }],
  },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data as ClerkUserData;

    const userData = {
      _id: id,
      email: email_addresses?.[0]?.email_address ?? "",
      name: `${first_name} ${last_name}`.trim(),
      image: image_url,
    };
    await Usermodel.create(userData);
  },
);

const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-from-clerk", triggers: [{ event: "clerk/user.deleted" }] },
  async ({ event }) => {
    const { id } = event.data as ClerkDeleteData;
    await Usermodel.findByIdAndDelete(id);
  },
);

const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk", triggers: { event: "clerk/user.updated" } },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data as ClerkUserData;

    const userData = {
      email: email_addresses?.[0]?.email_address ?? "",
      name: `${first_name} ${last_name}`.trim(),
      image: image_url,
    };
    await Usermodel.findByIdAndUpdate(id, userData);
  },
);

const releaseSeatsAndDeleteBooking = inngest.createFunction(
  {
    id: "release-seats-delete-booking",
    triggers: { event: "app/checkpayment" },
  },

  async ({ event, step }) => {
    const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
    await step.sleepUntil("wait-for-10-minutes", tenMinutesLater);

    await step.run("check-payment-status", async () => {
      const bookingId = event.data.bookingId;
      const booking = await Booking.findById(bookingId);

      // ✅ null check before accessing booking properties
      if (!booking) return;

      if (
        booking.paymentStatus === "failed" ||
        booking.paymentStatus === "pending"
      ) {
        const show = await Show.findById(booking.show);

        // ✅ null check before mutating show
        if (!show) return;

        booking.bookedSeats.forEach((seat) => {
          delete show.occupiedSeats[seat]; // ✅ was "delete.show" — dot was in wrong place
        });

        show.markModified("occupiedSeats"); // ✅ removed ?. since we already null-checked
        await show.save();
        await Booking.findByIdAndDelete(booking._id);
      }
    });
  },
);

//Inngest function to send email when user books a show
const sendBookingConfirmationEmail = inngest.createFunction(
  {
    id: "send-booking-confirmation-email",
    triggers: {
      event: "app/show.booked",
    },
  },
  async ({ event, step }) => {
    const { bookingId } = event.data;

    // Fetch booking with populated relations
    const bookingDoc = await Booking.findById(bookingId)
      .populate({
        path: "show",
        populate: { path: "movie", model: "Movie" },
      })
      .populate("user");

    if (!bookingDoc) return;

    // Type cast to any to stop TypeScript from complaining about the populated paths
    const booking = bookingDoc as any;

    const emailHtml = `
<div style="font-family: Arial, sans-serif; line-height: 1.5;">
  <h2>Hi ${booking.user.name},</h2>
  <p>Your booking for <strong style="color: #F84565;">"${booking.show.movie.title}"</strong> is confirmed.</p>
  <p>
    <strong>Date:</strong> ${new Date(booking.show.showDateTime).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}<br />
    <strong>Time:</strong> ${new Date(booking.show.showDateTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}
  </p>
  <p>Enjoy the show! 🍿</p>
  <p>Thanks for booking with us!<br />- QuickShow Team</p>
</div>
`;

    await sendEmail({
      to: booking.user.email,
      subject: `Payment Confirmation: "${booking.show.movie.title}" booked!`,
      body: emailHtml,
    });
  }
);
export const functions: ReturnType<typeof inngest.createFunction>[] = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail
];
