import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assets } from "../assets/assets";
import type { Movie, ShowTimeSlot } from "../lib/types";
import Loading from "../components/Loading";
import { ArrowRightIcon, ClockIcon } from "lucide-react";
import isoTimeFormat from "../lib/isoTimeFormat";
import BlurCircle from "../components/BlurCircle";
import toast from "react-hot-toast";
import { useAppContext } from "../context/AppContext";

interface ShowState {
  movie: Movie;
  dateTime: any;
}

const SeatLayout = () => {
  const groupRows = [
    ["A", "B"],
    ["C", "D"],
    ["E", "F"],
    ["G", "H"],
    ["I", "J"],
  ];

  const { id, date } = useParams<{ id: string; date: any }>();
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<ShowTimeSlot | null>(null);
  const [show, setShow] = useState<ShowState | null>(null);
  const [occupiedSeats, setOccupiedSeats] = useState<string[]>([]);
  const [isBooking, setIsBooking] = useState(false);

  const navigate = useNavigate();
  const { axios, getToken, user } = useAppContext();
  
  const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // 1. If Razorpay is already mounted to window, don't append a new script
    if ((window as any).Razorpay) return resolve(true);
    
    // 2. Look through the document to see if a script tag is already tracking it
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.onload = () => resolve(true);
      existingScript.onerror = () => resolve(false);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

  const handleSeatClick = (seatId: string) => {
    if (!selectedTime) return toast("Please select a time slot first");
    if (occupiedSeats.includes(seatId)) return toast("This seat is already taken");
    if (!selectedSeats.includes(seatId) && selectedSeats.length >= 5)
      return toast("You can only select up to 5 seats");

    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((seat) => seat !== seatId)
        : [...prev, seatId]
    );
  };

  const renderSeats = (row: string, count = 9) => {
    return (
      <div key={row} className="flex gap-1.5 mt-2">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: count }, (_, i) => {
            const seatId = `${row}${i + 1}`;
            const isOccupied = occupiedSeats.includes(seatId);
            const isSelected = selectedSeats.includes(seatId);
            return (
              <button
                key={seatId}
                onClick={() => handleSeatClick(seatId)}
                disabled={isOccupied}
                className={`h-8 w-8 rounded border text-[10px] font-medium transition
                  ${
                    isOccupied
                      ? "bg-gray-200 border-gray-300 text-gray-400 opacity-50 cursor-not-allowed"
                      : isSelected
                      ? "bg-primary border-primary text-white cursor-pointer"
                      : "border-primary/60 hover:bg-primary/20 cursor-pointer"
                  }`}
              >
                {seatId}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      await axios.delete(`/api/booking/cancel/${bookingId}`, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
    } catch (error) {
      // Silent fail — the pending booking will be cleaned up on next attempt
      console.error("Could not cancel booking:", error);
    }
  };

 const bookTickets = async () => {
    if (!user) return toast.error("Please login to proceed");
    if (!selectedTime) return toast.error("Please select a time slot");
    if (!selectedSeats.length) return toast.error("Please select at least one seat");

    setIsBooking(true);
    let createdBookingId: string | null = null;

    try {
      console.log("1. Starting booking...");

      const isScriptLoaded = await loadRazorpayScript();
      console.log("2. Script loaded:", isScriptLoaded);

      if (!isScriptLoaded) {
        toast.error("Razorpay SDK failed to load");
        setIsBooking(false);
        return;
      }

      const { data } = await axios.post(
        "/api/booking/create",
        { showId: selectedTime.showId, selectedSeats },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      );

      console.log("3. API response:", data);

      if (!data.success) {
        toast.error(data.message);
        setIsBooking(false);
        return;
      }

      if (!data.order || !data.key) {
        toast.error("Could not initialize payment. Please try again.");
        setIsBooking(false);
        return;
      }

      // Track bookingId locally so we can cancel it if the user closes the modal
      createdBookingId = data.bookingId;

      console.log("4. Configuring Razorpay options...");
      const options = {
        key: data.key, // Uses key sent back securely from backend response
        amount: data.order.amount,
        currency: data.order.currency || "INR",
        name: "Cinema Booking",
        description: `Tickets for ${show?.movie?.title || "Movie Booking"}`,
        order_id: data.order.id, // Razorpay Order ID generated from backend
        handler: async (response: any) => {
          try {
            const verifyRes = await axios.post(
              "/api/booking/verify-payment",
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingId: data.bookingId,
              },
              { headers: { Authorization: `Bearer ${await getToken()}` } }
            );

            if (verifyRes.data.success) {
              toast.success("Payment successful!");
              navigate("/my-bookings"); // Redirect user safely to their dashboard
            } else {
              toast.error("Payment verification failed.");
            }
          } catch (error: any) {
            console.error(error);
            toast.error("Something went wrong verifying the payment.");
          } finally {
            setIsBooking(false);
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
            setIsBooking(false);
            if (createdBookingId) {
              cancelBooking(createdBookingId); // Frees up the blocked seats in DB instantly
            }
          },
        },
      };

      console.log("5. Opening Razorpay...");
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      console.log("6. Razorpay window active");

    } catch (error: any) {
      console.error("CAUGHT ERROR:", error);
      toast.error(error?.response?.data?.message || error.message || "Something went wrong");
      setIsBooking(false);
    }
  };

  const refreshOccupiedSeats = async (showId: string) => {
    try {
      const { data } = await axios.get(`/api/booking/seats/${showId}`);
      if (data.success) setOccupiedSeats(data.occupiedSeats);
    } catch (error) {
      console.error("Could not refresh occupied seats:", error);
    }
  };

  // Fetch occupied seats whenever the selected time slot changes
  useEffect(() => {
    if (!selectedTime) return;
    (async()=>{
      await refreshOccupiedSeats(selectedTime.showId);
    })();
  }, [selectedTime]);

  // Fetch show data on mount
  useEffect(() => {
    const getShow = async () => {
      try {
        const { data } = await axios.get(`/api/show/${id}`);
        if (data.success) setShow(data);
      } catch (error: any) {
        console.error("Could not fetch show:", error);
      }
    };
    getShow();
  }, [id]);

  return show ? (
    <div className="flex flex-col md:flex-row gap-6 px-4 sm:px-8 lg:px-24 xl:px-40 py-20 md:pt-32">
      {/* Sidebar */}
      <div className="w-full md:w-60 shrink-0 bg-primary/10 border border-primary/20 rounded-2xl py-8 h-max md:sticky md:top-28">
        <p className="text-lg font-semibold px-6 mb-2">Available Timings</p>
        <div className="mt-2">
          {show.dateTime[date].map((item: any) => (
            <div
              key={item.time}
              onClick={() => {
                setSelectedTime(item);
                setSelectedSeats([]);
                setOccupiedSeats([]); // clear immediately; useEffect will repopulate
              }}
              className={`flex items-center gap-2 px-6 py-2.5 cursor-pointer transition
                ${
                  selectedTime?.time === item.time
                    ? "bg-primary text-white rounded-r-full w-max"
                    : "hover:bg-primary/20 rounded-r-full w-max"
                }`}
            >
              <ClockIcon className="w-4 h-4 shrink-0" />
              <p className="text-sm">{isoTimeFormat(item.time)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="relative flex-1 flex flex-col items-center">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle bottom="0" right="0" />

        <h1 className="text-2xl font-semibold mb-4">Select your seat</h1>
        <img src={assets.screenImage} alt="screen" className="w-full max-w-lg" />
        <p className="text-gray-400 text-sm mb-8">SCREEN SIDE</p>

        <div className="w-full overflow-x-auto pb-2">
          <div className="flex flex-col items-center text-xs text-gray-300 min-w-max mx-auto">
            <div className="flex flex-col items-center mb-6">
              {groupRows[0].map((row) => renderSeats(row))}
            </div>
            <div className="grid grid-cols-2 gap-10">
              {groupRows.slice(1).map((group, idx) => (
                <div key={idx}>{group.map((row) => renderSeats(row))}</div>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={bookTickets}
          disabled={isBooking || !selectedSeats.length || !selectedTime}
          className="flex items-center gap-1 mt-16 px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {isBooking ? "Processing..." : "Proceed to CheckOut"}
          {!isBooking && <ArrowRightIcon strokeWidth={3} className="w-4 h-4" />}
        </button>
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default SeatLayout;