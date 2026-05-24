import React, { useEffect, useState } from "react";
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
    try {
      const { data } = await axios.post(
        "/api/booking/create",
        { showId: selectedTime.showId, selectedSeats },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      );

      if (!data.success) return toast.error(data.message);
      if (!data.order || !data.key)
        return toast.error("Could not initialize payment. Please try again.");

      const options = {
        key: data.key,
        amount: data.order.amount,
        currency: "INR",
        name: show?.movie.title,
        description: `Seats: ${selectedSeats.join(", ")}`,
        order_id: data.order.id,
        handler: async (response: any) => {
          try {
            const { data: verifyData } = await axios.post(
              "/api/booking/verify-payment",
              { ...response, bookingId: data.bookingId },
              { headers: { Authorization: `Bearer ${await getToken()}` } }
            );

            if (verifyData.success) {
              toast.success("Booking confirmed!");
              navigate("/my-bookings");
            } else {
              toast.error("Payment verification failed.");
            }
          } catch {
            toast.error("Something went wrong during verification.");
          }
        },
        prefill: {
          name: user?.fullName || "",
          email: user?.primaryEmailAddress?.emailAddress || "",
        },
        theme: { color: "#6366f1" },
        modal: {
          ondismiss: async () => {
            toast("Payment cancelled.", { icon: "ℹ️" });
            await cancelBooking(data.bookingId);
            // Refresh occupied seats so the cancelled pending booking
            // is no longer shown as occupied
            await refreshOccupiedSeats(selectedTime.showId);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error.message || "Something went wrong";
      toast.error(message);
    } finally {
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
    refreshOccupiedSeats(selectedTime.showId);
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