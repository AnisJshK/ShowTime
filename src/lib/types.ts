// ==========================================
// 1. Core Sub-Interfaces
// ==========================================

export interface AssetMap {
  logo: string;
  marvelLogo: string;
  googlePlay: string;
  appStore: string;
  screenImage: string;
  profile: string;
}

export interface Trailer {
  image: string;
  videoUrl: string;
}

export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  name: string;
  profile_path: string;
}

// ==========================================
// 2. Main Data Interfaces
// ==========================================

export interface Movie {
  _id: string;
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  genres: Genre[];
  casts: CastMember[];
  release_date: string;
  original_language: string;
  tagline: string;
  vote_average: number;
  vote_count: number;
  runtime: number;
}

export interface ShowTimeSlot {
  time: string;
  showId: string;
}

// Maps dates (e.g., "2025-07-24") to an array of show times slots
export interface DateTimeData {
  [dateString: string]: ShowTimeSlot[];
}

export interface ActiveShow {
  _id?: string;
  movie: Movie;
  showDateTime: string;
  showPrice: number;
  occupiedSeats: {
    [seatId: string]: string|undefined; // Key: Seat number (e.g., "A1"), Value: User ID string
  };
  __v?: number; // Optional field found in MongoDB documents
}

export interface DashboardData {
  totalBookings: number;
  totalRevenue: number;
  totalUser: number;
  activeShows: ActiveShow[];
}

export interface Booking {
  _id: string;
  user: {
    name: string;
  };
  show: {
    _id: string;
    movie: Movie;
    showDateTime: string;
    showPrice: number;
  };
  amount: number;
  bookedSeats: string[];
  isPaid: boolean;
}

// ==========================================
// 3. Component Local States (For your Pages)
// ==========================================

export interface ShowState {
  movie: Movie;
  dateTime: DateTimeData;
}