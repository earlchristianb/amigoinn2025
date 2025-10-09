// Base Prisma types (as they come from the database)
export interface PrismaProfile {
  id: bigint;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

export interface PrismaGuest {
  id: bigint;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PrismaRoomType {
  id: bigint;
  name: string;
  description: string | null;
  base_price: number; // Decimal from Prisma
}

export interface PrismaRoom {
  id: bigint;
  room_number: string;
  room_type_id: bigint;
  is_available: boolean;
}

export interface PrismaBooking {
  id: bigint;
  guest_id: bigint;
  total_price: number; // Decimal from Prisma
  discount: number | null; // Decimal from Prisma
  created_at: Date;
  updated_at: Date;
}

export interface PrismaBookingRoom {
  id: bigint;
  booking_id: bigint;
  room_id: bigint;
  check_in_date: Date;
  check_out_date: Date;
  price: number; // Decimal from Prisma
  discount: number | null; // Decimal from Prisma
  created_at: Date;
  updated_at: Date;
}

export interface PrismaBookingExtra {
  id: bigint;
  booking_id: bigint;
  label: string;
  price: number; // Decimal from Prisma
  quantity: number;
  created_at: Date;
  updated_at: Date;
}

export interface PrismaPayment {
  id: bigint;
  booking_id: bigint;
  amount: number; // Decimal from Prisma
  method: string;
  created_at: Date;
}

// Serialized types (for API responses and frontend use)
export interface Profile {
  id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Guest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoomType {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
}

export interface Room {
  id: string;
  room_number: string;
  room_type_id: string;
  is_available: boolean;
  type?: RoomType; // Optional for when included in relations
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  method: string;
  created_at: string;
}

export interface BookingRoom {
  id: string;
  booking_id: string;
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  price: number;
  discount: number;
  created_at: string;
  updated_at: string;
  room: Room;
}

export interface BookingExtra {
  id: string;
  booking_id: string;
  extra_id?: string | null;
  label: string;
  price: number;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  guest_id: string;
  total_price: number;
  discount: number;
  status: 'pending' | 'checked_in' | 'checked_out' | 'cancelled';
  proof_image_url?: string | null;
  note?: string | null;
  created_at: string;
  updated_at: string;
  guest: Guest;
  booking_rooms: BookingRoom[];
  booking_extras: BookingExtra[];
  payments: Payment[];
  total_paid: number;
  remaining: number;
}

// Calendar-specific types
export interface BookingEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  color?: string;
  textColor?: string;
  display?: string;
  extendedProps: {
    roomType: string;
    price: number;
    discount: number;
    payments: { amount: number }[];
    totalPaid?: number;
    remaining?: number;
    roomNumber?: string;
    guestName?: string;
    bookingId?: string;
    status?: 'occupied' | 'available' | 'unavailable';
  };
}

// Room availability types (for public landing page)
export interface RoomAvailability {
  id: string;
  room_number: string;
  type: string;
  base_price: number;
  is_available: boolean;
  bookings: {
    check_in: string;
    check_out: string;
    guest_name: string;
  }[];
}

// API request/response types
export interface CreateBookingRoomRequest {
  roomId: string;
  check_in_date: string;
  check_out_date: string;
  price: number;
  discount?: number;
}

export interface CreateBookingExtraRequest {
  extraId?: string;
  label: string;
  price: number;
  quantity?: number;
  isPackage?: boolean;
  includedNights?: number | null;
}

export interface CreateBookingRequest {
  guestId: string;
  booking_rooms: CreateBookingRoomRequest[];
  booking_extras?: CreateBookingExtraRequest[];
  total_price: number;
  discount?: number;
  note?: string;
}

export interface CreateGuestRequest {
  name: string;
  email?: string;
  phone?: string;
}

export interface CreateRoomRequest {
  room_number: string;
  room_type_id: string;
  is_available?: boolean;
}

export interface CreateRoomTypeRequest {
  name: string;
  description?: string;
  base_price: number;
}

export interface CreatePaymentRequest {
  booking_id: string;
  amount: number;
  method?: string;
}

// Form types
export interface BookingFormData {
  guest_id: string;
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  discount: number;
}

export interface GuestFormData {
  name: string;
  email: string;
  phone: string;
}

export interface RoomFormData {
  room_number: string;
  room_type_id: string;
  is_available: boolean;
}

export interface RoomTypeFormData {
  name: string;
  description: string;
  base_price: number;
}

// Utility types
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'gcash' | 'paymaya';
export type RoomStatus = 'available' | 'occupied' | 'unavailable';

// API Response wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
