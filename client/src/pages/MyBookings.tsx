import React, { useCallback, useEffect, useState } from "react";
import { dummyBookingData } from "../assets/assets";
import Loading from "../components/Loading";
import BlurCircle from "../components/BlurCircle";
import timeFormat from "../lib/timeFormat";
import { dateFormat } from "../lib/dateFormat";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const MyBookings = () => {
  const currency = import.meta.env.VITE_CURRENCY;
  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID;

  const { axios, getToken, user, image_base_url } = useAppContext();

  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);

  const getMyBookings = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/user/bookings", {
        headers: {
          Authorization: `Bearer ${await getToken()}`,
        },
      });
      if (data.success) {
        setBookings(data.bookings);
      }
    } catch (error: any) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  }, [axios, getToken]);

  useEffect(() => {
    if (!user) return;
    (async()=>{
     await getMyBookings();
    })();
  }, [user, getMyBookings]);

const handlePayment = async (booking: any) => {
  setPayingBookingId(booking._id);
  try {
    const isScriptLoaded = await loadRazorpayScript();
    if (!isScriptLoaded) {
      toast.error("Razorpay SDK failed to load. Are you online?");
      return;
    }

    // ✅ Reuse existing /api/booking/create with the booking's own data
    const { data } = await axios.post(
      "/api/booking/create",
      {
        showId: booking.show._id,
        selectedSeats: booking.bookedSeats,
      },
      { headers: { Authorization: `Bearer ${await getToken()}` } }
    );

    if (!data.success) return toast.error(data.message);
    if (!data.order || !data.key)
      return toast.error("Could not initialize payment. Please try again.");

    const options = {
      key: data.key,
      amount: data.order.amount,
      currency: "INR",
      name: "Cinema Booking",
      description: `Tickets for ${booking.show.movie.title}`,
      order_id: data.order.id,
      handler: async (response: any) => {
        try {
          const { data: verifyData } = await axios.post(
            "/api/booking/verify-payment",
            {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: data.bookingId, // ✅ new bookingId from fresh create
            },
            { headers: { Authorization: `Bearer ${await getToken()}` } }
          );

          if (verifyData.success) {
            toast.success("Payment successful!");
            (async () => { await getMyBookings(); })();
          } else {
            toast.error("Payment verification failed.");
          }
        } catch {
          toast.error("Something went wrong verifying the payment.");
        } finally {
          setPayingBookingId(null);
        }
      },
      prefill: {
        name: user?.fullName || "",
        email: user?.primaryEmailAddress?.emailAddress || "",
      },
      theme: { color: "#6366f1" },
      modal: {
        ondismiss: () => {
          toast("Payment cancelled.", { icon: "ℹ️" });
          setPayingBookingId(null);
        },
      },
    };

    const paymentObject = new (window as any).Razorpay(options);
    paymentObject.open();
  } catch (error: any) {
    toast.error(error?.response?.data?.message || "Something went wrong");
    setPayingBookingId(null);
  }
};
  

  return !isLoading ? (
    <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]">
      <BlurCircle top="100px" left="100px" />
      <div>
        <BlurCircle bottom="0px" top="200px" left="600px" />
      </div>
      <h1 className="text-lg font-semibold mb-4">My Bookings</h1>
      {bookings.map((item, index) => (
        <div
          key={index}
          className="flex flex-col md:flex-row justify-between bg-primary/8 border border-primary/20 rounded-lg mt-4 p-2 max-w-3xl"
        >
          <div className="flex flex-col md:flex-row">
            <img
              src={image_base_url + item.show.movie.poster_path}
              alt=""
              className="md:max-w-45 aspect-video h-auto object-cover object-bottom rounded"
            />
            <div className="flex flex-col p-4">
              <p className="text-lg font-semibold">{item.show.movie.title}</p>
              <p className="text-gray-400 text-sm">
                {timeFormat({ minutes: item.show.movie.runtime })}
              </p>
              <p className="text-gray-400 text-sm mt-auto">
                {dateFormat({ date: item.show.showDateTime })}
              </p>
            </div>
          </div>
          <div className="flex flex-col md:items-end md:text-right justify-between p-4">
            <div className="flex items-center gap-4">
              <p className="text-2xl font-semibold mb-3">
                {currency}
                {item.amount}
              </p>
              {item.paymentStatus !== "paid" ? (
                <button
                  onClick={() => handlePayment(item)}
                  disabled={payingBookingId === item._id}
                  className="bg-primary hover:bg-primary-dull px-4 py-1.5 mb-3 text-sm rounded-full font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                  {payingBookingId === item._id
                    ? "Processing..."
                    : item.paymentStatus === "failed"
                    ? "Retry Payment"
                    : "Pay Now"}
                </button>
              ) : (
                <button className="bg-primary hover:bg-primary-dull px-4 py-1.5 mb-3 text-sm rounded-full font-medium opacity-50 cursor-not-allowed text-white">
                  Paid!
                </button>
              )}
            </div>
            <div className="text-sm">
              <p>
                <span className="text-gray-400">Total Tickets: </span>
                {item.bookedSeats.length}
              </p>
              <p>
                <span className="text-gray-400">Seat Number: </span>
                {item.bookedSeats.join(", ")}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <Loading />
  );
};

export default MyBookings;