"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@headlessui/react";
import { Booking, Guest, Room, BookingFormData, CreateBookingRoomRequest, CreateBookingExtraRequest } from "@/types";
import AdminNavigation from "@/components/AdminNavigation";
import toast, { Toaster } from 'react-hot-toast';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [bookingRooms, setBookingRooms] = useState<CreateBookingRoomRequest[]>([]);
  const [bookingExtras, setBookingExtras] = useState<CreateBookingExtraRequest[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  
  // Filter states
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedGuest, setSelectedGuest] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  
  // Payment edit state
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingPaymentAmount, setEditingPaymentAmount] = useState<string>("");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Helper functions for managing multiple rooms
  const addRoom = () => {
    setBookingRooms([...bookingRooms, {
      roomId: "",
      check_in_date: "",
      check_out_date: "",
      price: 0,
      discount: 0
    }]);
  };

  const removeRoom = (index: number) => {
    const newRooms = bookingRooms.filter((_, i) => i !== index);
    setBookingRooms(newRooms);
    calculateTotalPrice(newRooms);
  };

  const updateRoom = (index: number, field: keyof CreateBookingRoomRequest, value: string | number) => {
    const newRooms = [...bookingRooms];
    newRooms[index] = { ...newRooms[index], [field]: value };
    setBookingRooms(newRooms);
    calculateTotalPrice(newRooms);
  };

  const calculateRoomPrice = (roomId: string, checkIn: string, checkOut: string): number => {
    if (!roomId || !checkIn || !checkOut) return 0;
    
    const room = rooms.find(r => r.id === roomId);
    if (!room || !room.type) return 0;
    
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return nights * Number(room.type.base_price);
  };

  const calculateTotalPrice = (rooms: CreateBookingRoomRequest[], extras: CreateBookingExtraRequest[] = bookingExtras) => {
    const roomsTotal = rooms.reduce((sum, room) => {
      const roomPrice = calculateRoomPrice(room.roomId, room.check_in_date, room.check_out_date);
      return sum + roomPrice - (room.discount || 0);
    }, 0);
    
    const extrasTotal = extras.reduce((sum, extra) => {
      return sum + (extra.price * (extra.quantity || 1));
    }, 0);
    
    setTotalPrice(roomsTotal + extrasTotal);
  };

  // Helper functions for managing extras
  const addExtra = () => {
    const newExtras = [...bookingExtras, {
      label: "",
      price: 0,
      quantity: 1
    }];
    setBookingExtras(newExtras);
    calculateTotalPrice(bookingRooms, newExtras);
  };

  const removeExtra = (index: number) => {
    const newExtras = bookingExtras.filter((_, i) => i !== index);
    setBookingExtras(newExtras);
    calculateTotalPrice(bookingRooms, newExtras);
  };

  const updateExtra = (index: number, field: keyof CreateBookingExtraRequest, value: string | number) => {
    const newExtras = [...bookingExtras];
    newExtras[index] = { ...newExtras[index], [field]: value };
    setBookingExtras(newExtras);
    calculateTotalPrice(bookingRooms, newExtras);
  };

  // Filter bookings based on selected filters
  const applyFilters = () => {
    let filtered = [...bookings];

    // Filter by month
    if (selectedMonth) {
      filtered = filtered.filter(booking => {
        return booking.booking_rooms.some(room => {
          const checkInDate = new Date(room.check_in_date);
          const checkOutDate = new Date(room.check_out_date);
          const filterMonth = new Date(selectedMonth);
          
          // Check if the booking overlaps with the selected month
          return (
            (checkInDate.getFullYear() === filterMonth.getFullYear() && 
             checkInDate.getMonth() === filterMonth.getMonth()) ||
            (checkOutDate.getFullYear() === filterMonth.getFullYear() && 
             checkOutDate.getMonth() === filterMonth.getMonth())
          );
        });
      });
    }

    // Filter by guest
    if (selectedGuest) {
      filtered = filtered.filter(booking => booking.guest_id === selectedGuest);
    }

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(booking => {
        const isPaid = booking.remaining <= 0;
        const isPartial = booking.total_paid > 0 && booking.remaining > 0;
        
        if (selectedStatus === 'paid') return isPaid;
        if (selectedStatus === 'partial') return isPartial;
        if (selectedStatus === 'unpaid') return booking.total_paid === 0;
        return true;
      });
    }

    setFilteredBookings(filtered);
  };

  // Fetch bookings, guests, rooms
  const fetchBookings = async () => {
    try {
    const res = await fetch("/api/bookings");
      const data = await res.json();
      if (Array.isArray(data)) {
    setBookings(data);
        setError("");
      } else {
        console.error('Bookings API returned non-array data:', data);
        setBookings([]);
        setError("Failed to load bookings: Invalid data format");
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]);
      setError("Failed to load bookings: " + (error as Error).message);
    }
  };
  const fetchGuests = async () => {
    try {
    const res = await fetch("/api/guests");
      const data = await res.json();
      if (Array.isArray(data)) {
    setGuests(data);
      } else {
        console.error('Guests API returned non-array data:', data);
        setGuests([]);
      }
    } catch (error) {
      console.error('Error fetching guests:', error);
      setGuests([]);
    }
  };
  const fetchRooms = async () => {
    try {
    const res = await fetch("/api/rooms");
      const data = await res.json();
      if (Array.isArray(data)) {
    setRooms(data);
      } else {
        console.error('Rooms API returned non-array data:', data);
        setRooms([]);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setRooms([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchBookings(),
        fetchGuests(),
        fetchRooms()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Apply filters whenever bookings or filter criteria change
  useEffect(() => {
    applyFilters();
    setCurrentPage(1); // Reset to first page when filters change
  }, [bookings, selectedMonth, selectedGuest, selectedStatus]);


  // Open modal
  const openModal = (booking?: Booking) => {
    setEditingBooking(booking || null);
    if (booking) {
      // Convert booking rooms to the form format
      const rooms = booking.booking_rooms.map(br => ({
        roomId: br.room_id,
        check_in_date: br.check_in_date.split('T')[0],
        check_out_date: br.check_out_date.split('T')[0],
        price: br.price,
        discount: br.discount
      }));
      setBookingRooms(rooms);
      
      // Convert booking extras to the form format
      const extras = booking.booking_extras?.map(ex => ({
        label: ex.label,
        price: ex.price,
        quantity: ex.quantity
      })) || [];
      setBookingExtras(extras);
      
      setTotalPrice(booking.total_price);
    } else {
      setBookingRooms([]);
      setBookingExtras([]);
      setTotalPrice(0);
    }
    setModalOpen(true);
  };

  // Submit booking form
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    // Validate that we have at least one room
    if (bookingRooms.length === 0) {
      setError('Please add at least one room to the booking');
      return;
    }

    // Validate all rooms have required fields and valid prices
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for comparison
    
    for (let i = 0; i < bookingRooms.length; i++) {
      const room = bookingRooms[i];
      if (!room.roomId || !room.check_in_date || !room.check_out_date) {
        setError(`Room ${i + 1} is missing required information`);
        return;
      }
      
      // Validate dates are not in the past
      const checkInDate = new Date(room.check_in_date);
      checkInDate.setHours(0, 0, 0, 0);
      const checkOutDate = new Date(room.check_out_date);
      checkOutDate.setHours(0, 0, 0, 0);
      
      if (checkInDate < today) {
        setError(`Room ${i + 1}: Check-in date cannot be in the past`);
        return;
      }
      
      if (checkOutDate < today) {
        setError(`Room ${i + 1}: Check-out date cannot be in the past`);
        return;
      }
      
      const calculatedPrice = calculateRoomPrice(room.roomId, room.check_in_date, room.check_out_date);
      if (calculatedPrice <= 0) {
        setError(`Room ${i + 1} has an invalid price. Please check the dates.`);
        return;
      }
    }

    // Validate total price
    if (totalPrice <= 0) {
      setError('Total price must be greater than 0');
      return;
    }

    const guestId = formData.get("guest_id");
    if (!guestId) {
      setError('Please select a guest');
      return;
    }

    const payload = {
      guestId: guestId.toString(),
      booking_rooms: bookingRooms.map(room => ({
        ...room,
        price: calculateRoomPrice(room.roomId, room.check_in_date, room.check_out_date)
      })),
      booking_extras: bookingExtras,
      total_price: totalPrice,
      discount: Number(formData.get("discount") || 0),
    };

    console.log('Submitting booking with payload:', payload);

    try {
    if (editingBooking) {
        const response = await fetch(`/api/bookings/${editingBooking.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
        const result = await response.json();
        console.log('Update booking response:', result);
        if (!response.ok) {
          throw new Error(result.error || 'Failed to update booking');
        }
    } else {
        const response = await fetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
        const result = await response.json();
        console.log('Create booking response:', result);
        if (!response.ok) {
          const errorMsg = result.details ? `${result.error}: ${result.details}` : result.error || 'Failed to create booking';
          throw new Error(errorMsg);
        }
    }

    setModalOpen(false);
      setEditingBooking(null);
      setBookingRooms([]);
      setBookingExtras([]);
      setTotalPrice(0);
      setError("");
      await fetchBookings();
      toast.success(editingBooking ? 'Booking updated successfully!' : 'Booking created successfully!');
    } catch (error) {
      console.error('Error submitting booking:', error);
      const errorMsg = 'Failed to save booking: ' + (error as Error).message;
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  // Delete booking
  const handleDeleteBooking = async (id: number) => {
    if (!confirm("Delete this booking?")) return;
    try {
      const response = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
      if (response.ok) {
        await fetchBookings();
        toast.success('Booking deleted successfully!');
      } else {
        toast.error('Failed to delete booking');
      }
    } catch (error) {
      toast.error('Error deleting booking');
    }
  };

  // Update payment amount
  const handleUpdatePayment = async (paymentId: string, newAmount: number) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: newAmount }),
      });

      if (!response.ok) {
        toast.error('Failed to update payment');
        return;
      }

      toast.success('Payment updated successfully!');
      await fetchBookings();
      
      // Refresh the selected booking data
      if (selectedBooking) {
        const updatedBookings = await fetch("/api/bookings").then(r => r.json());
        const updatedBooking = updatedBookings.find((b: Booking) => b.id === selectedBooking.id);
        if (updatedBooking) {
          setSelectedBooking(updatedBooking);
        }
      }
      
      setEditingPaymentId(null);
      setEditingPaymentAmount("");
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Error updating payment');
    }
  };

  // Delete payment
  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Delete this payment?")) return;
    
    try {
      const response = await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
      
      if (!response.ok) {
        toast.error('Failed to delete payment');
        return;
      }

      toast.success('Payment deleted successfully!');
      await fetchBookings();
      
      // Refresh the selected booking data
      if (selectedBooking) {
        const updatedBookings = await fetch("/api/bookings").then(r => r.json());
        const updatedBooking = updatedBookings.find((b: Booking) => b.id === selectedBooking.id);
        if (updatedBooking) {
          setSelectedBooking(updatedBooking);
        }
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Error deleting payment');
    }
  };

  // Payment actions
  const handleMarkPaid = async (bookingId: number) => {
    try {
      const response = await fetch("/api/payments", {
      method: "POST",
      body: JSON.stringify({ bookingId, type: "full" }),
      headers: { "Content-Type": "application/json" },
    });
      if (response.ok) {
        await fetchBookings();
        toast.success('Payment marked as fully paid!');
      } else {
        toast.error('Failed to mark payment');
      }
    } catch (error) {
      toast.error('Error processing payment');
    }
  };

  const handleMarkPartialPaid = async (bookingId: number) => {
    const amount = prompt("Enter partial payment amount (₱):");
    if (!amount) return;
    try {
      const response = await fetch("/api/payments", {
      method: "POST",
      body: JSON.stringify({ bookingId, type: "partial", amount: Number(amount) }),
      headers: { "Content-Type": "application/json" },
    });
      if (response.ok) {
        await fetchBookings();
        toast.success(`Partial payment of ₱${amount} recorded!`);
      } else {
        toast.error('Failed to record partial payment');
      }
    } catch (error) {
      toast.error('Error processing payment');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation currentPage="bookings" />
        <main className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading bookings...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <AdminNavigation currentPage="bookings" />

      {/* Main Content */}
    <main className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">📋 Bookings Management</h2>
            <p className="text-gray-600 mt-1">Manage hotel bookings and reservations</p>
          </div>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => openModal()}
        >
          Add Booking
        </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

      {/* Filters */}
      <div className="mb-4 bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filter by Month
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 bg-white text-black"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filter by Guest
            </label>
            <select
              value={selectedGuest}
              onChange={(e) => setSelectedGuest(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 bg-white text-black"
            >
              <option value="">All Guests</option>
              {guests.map((guest) => (
                <option key={guest.id} value={guest.id}>
                  {guest.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 bg-white text-black"
            >
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedMonth("");
                setSelectedGuest("");
                setSelectedStatus("");
              }}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear Filters
            </button>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredBookings.length} of {bookings.length} bookings
        </div>
      </div>

      {/* Bookings Table */}
      <table className="w-full border border-black">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-2 py-1 border border-black text-black font-bold">Guest</th>
            <th className="px-2 py-1 border border-black text-black font-bold">Rooms</th>
            <th className="px-2 py-1 border border-black text-black font-bold">Total Price (₱)</th>
            <th className="px-2 py-1 border border-black text-black font-bold">Discount (₱)</th>
            <th className="px-2 py-1 border border-black text-black font-bold">Total Paid (₱)</th>
            <th className="px-2 py-1 border border-black text-black font-bold">Remaining (₱)</th>
            <th className="px-2 py-1 border border-black text-black font-bold">Status</th>
            <th className="px-2 py-1 border border-black text-black font-bold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(filteredBookings) && 
           filteredBookings
             .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // Sort by most recent first
             .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) // Paginate
             .map((b:Booking) => {
            const isPaid = b.remaining <= 0;
            const isPartiallyPaid = b.total_paid > 0 && b.remaining > 0;
            return (
            <tr 
              key={b.id} 
              className={`cursor-pointer hover:bg-gray-100 ${isPaid ? 'bg-gray-200' : ''}`}
              onDoubleClick={() => {
                setSelectedBooking(b);
                setDetailModalOpen(true);
              }}
            >
              <td className="px-2 py-1 border border-black text-black">{b.guest.name}</td>
              <td className="px-2 py-1 border border-black">
                <div className="space-y-1">
                  {b.booking_rooms.map((room, index) => (
                    <div key={room.id} className="text-sm">
                      <div className="font-medium text-black">Room {room.room.room_number}</div>
                      <div className="text-gray-800">
                        {new Date(room.check_in_date).toLocaleDateString()} - {new Date(room.check_out_date).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-700">
                        {room.room.type?.name} (₱{room.price.toFixed(2)})
                      </div>
                    </div>
                  ))}
                </div>
              </td>
              <td className="px-2 py-1 border border-black text-black">{b.total_price.toFixed(2)}</td>
              <td className="px-2 py-1 border border-black text-black">{b.discount.toFixed(2)}</td>
              <td className="px-2 py-1 border border-black text-black">{b.total_paid.toFixed(2)}</td>
              <td className="px-2 py-1 border border-black text-black">{b.remaining.toFixed(2)}</td>
              <td className="px-2 py-1 border border-black">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  isPaid ? 'bg-gray-600 text-white' : 
                  isPartiallyPaid ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'
                }`}>
                  {isPaid ? 'Paid' : isPartiallyPaid ? 'Partial' : 'Unpaid'}
                </span>
              </td>
              <td className="px-2 py-1 border border-black text-center">
                <button
                  className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 mx-1"
                  onClick={() => openModal(b)}
                >
                  Edit
                </button>
                <button
                  className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 mx-1"
                  onClick={() => handleDeleteBooking(Number(b.id))}
                >
                  Delete
                </button>
                <button
                  className={`px-2 py-1 rounded mx-1 ${
                    isPaid 
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                  onClick={() => handleMarkPaid(Number(b.id))}
                  disabled={isPaid}
                >
                  Mark Paid
                </button>
                <button
                  className={`px-2 py-1 rounded mx-1 ${
                    isPaid 
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-yellow-400 text-white hover:bg-yellow-500'
                  }`}
                  onClick={() => handleMarkPartialPaid(Number(b.id))}
                  disabled={isPaid}
                >
                  Partial Paid
                </button>
              </td>
            </tr>
          );
          })}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700 font-medium">Show:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1); // Reset to first page when changing items per page
            }}
            className="border border-gray-300 rounded px-3 py-1 bg-white text-black"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-700">entries per page</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700">
            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredBookings.length)} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredBookings.length)} of {filteredBookings.length} bookings
          </span>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded ${
                currentPage === 1
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.ceil(filteredBookings.length / itemsPerPage) }, (_, i) => i + 1)
                .filter(page => {
                  // Show first, last, current, and adjacent pages
                  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
                  return page === 1 || 
                         page === totalPages || 
                         Math.abs(page - currentPage) <= 1;
                })
                .map((page, index, array) => (
                  <div key={page} className="flex items-center">
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <span className="px-2 text-gray-500">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded ${
                        currentPage === page
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  </div>
                ))
              }
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredBookings.length / itemsPerPage), prev + 1))}
              disabled={currentPage === Math.ceil(filteredBookings.length / itemsPerPage)}
              className={`px-3 py-1 rounded ${
                currentPage === Math.ceil(filteredBookings.length / itemsPerPage)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-xl shadow p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="text-xl font-bold mb-4 text-black">
              {editingBooking ? "Edit Booking" : "Add Booking"}
            </Dialog.Title>

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1 text-black">Guest</label>
                <select
                  name="guest_id"
                  defaultValue={editingBooking?.guest_id || ""}
                  className="w-full border border-gray-300 rounded p-2 bg-white text-black"
                  required
                >
                  <option value="">Select Guest</option>
                  {guests.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rooms Section */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block font-semibold text-black">Rooms</label>
                  <button
                    type="button"
                    onClick={addRoom}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                  >
                    + Add Room
                  </button>
                </div>
                
                {bookingRooms.length === 0 && (
                  <div className="text-gray-500 text-sm italic">
                    Click "Add Room" to add rooms to this booking
                  </div>
                )}

                {bookingRooms.map((room, index) => (
                  <div key={index} className="border border-gray-300 rounded p-3 mb-3 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-black">Room {index + 1}</span>
                      {bookingRooms.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRoom(index)}
                          className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">Room</label>
                <select
                          value={room.roomId}
                          onChange={(e) => updateRoom(index, 'roomId', e.target.value)}
                          className="w-full border border-gray-300 rounded p-2 bg-white text-black text-sm"
                  required
                >
                  <option value="">Select Room</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                              {r.room_number} ({r.type?.name}) - ₱{r.type?.base_price}/night
                    </option>
                  ))}
                </select>
              </div>

              <div>
                        <label className="block text-sm font-medium text-black mb-1">Price (₱)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={calculateRoomPrice(room.roomId, room.check_in_date, room.check_out_date)}
                          readOnly
                          className="w-full border border-gray-300 rounded p-2 bg-gray-100 text-black text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">Check-in</label>
                <input
                  type="date"
                          value={room.check_in_date}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => {
                            updateRoom(index, 'check_in_date', e.target.value);
                            // If check-out is before or same as new check-in, clear it
                            if (room.check_out_date && new Date(room.check_out_date) <= new Date(e.target.value)) {
                              updateRoom(index, 'check_out_date', '');
                            }
                          }}
                          className="w-full border border-gray-300 rounded p-2 bg-white text-black text-sm"
                  required
                />
              </div>

              <div>
                        <label className="block text-sm font-medium text-black mb-1">Check-out</label>
                <input
                  type="date"
                          value={room.check_out_date}
                          min={room.check_in_date ? 
                            new Date(new Date(room.check_in_date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
                            : new Date().toISOString().split('T')[0]
                          }
                          onChange={(e) => {
                            if (room.check_in_date && new Date(e.target.value) <= new Date(room.check_in_date)) {
                              toast.error('Check-out date must be after check-in date');
                              return;
                            }
                            updateRoom(index, 'check_out_date', e.target.value);
                          }}
                          className="w-full border border-gray-300 rounded p-2 bg-white text-black text-sm"
                  required
                />
              </div>

              <div>
                        <label className="block text-sm font-medium text-black mb-1">Discount (₱)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={room.discount || 0}
                          onChange={(e) => updateRoom(index, 'discount', Number(e.target.value))}
                          className="w-full border border-gray-300 rounded p-2 bg-white text-black text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Additional Extras Section */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block font-semibold text-black">Additional Extras</label>
                  <button
                    type="button"
                    onClick={addExtra}
                    className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                  >
                    + Add Extra
                  </button>
                </div>
                
                {bookingExtras.length === 0 && (
                  <div className="text-gray-500 text-sm italic mb-3">
                    Click "Add Extra" to add extras like towels, motorcycle rental, tours, etc.
                  </div>
                )}

                {bookingExtras.map((extra, index) => (
                  <div key={index} className="border border-gray-300 rounded p-3 mb-3 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-black">Extra {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeExtra(index)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">Item</label>
                        <input
                          type="text"
                          value={extra.label}
                          onChange={(e) => updateExtra(index, 'label', e.target.value)}
                          placeholder="e.g., Extra Towel, Motorcycle, Tour"
                          className="w-full border border-gray-300 rounded p-2 bg-white text-black text-sm"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">Price (₱)</label>
                <input
                  type="number"
                  step="0.01"
                          value={extra.price}
                          onChange={(e) => updateExtra(index, 'price', Number(e.target.value))}
                          className="w-full border border-gray-300 rounded p-2 bg-white text-black text-sm"
                  required
                />
              </div>

              <div>
                        <label className="block text-sm font-medium text-black mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={extra.quantity || 1}
                          onChange={(e) => updateExtra(index, 'quantity', Number(e.target.value))}
                          className="w-full border border-gray-300 rounded p-2 bg-white text-black text-sm"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Price */}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-black">Total Price (₱)</span>
                  <span className="text-lg font-bold text-black">{totalPrice.toFixed(2)}</span>
                </div>
              </div>

              {/* Booking Discount */}
              <div>
                <label className="block font-semibold mb-1 text-black">Booking Discount (₱)</label>
                <input
                  name="discount"
                  type="number"
                  step="0.01"
                  defaultValue={editingBooking?.discount || 0}
                  className="w-full border border-gray-300 rounded p-2 bg-white text-black"
                />
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {editingBooking ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Detail View Modal */}
      <Dialog open={detailModalOpen} onClose={() => setDetailModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-xl shadow p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="text-2xl font-bold mb-6 text-black border-b pb-3">
              Booking Details
            </Dialog.Title>

            {selectedBooking && (
              <div className="space-y-6">
                {/* Guest Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-black mb-3">Guest Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-600 text-sm">Name:</span>
                      <p className="text-black font-medium">{selectedBooking.guest?.name || "Unknown"}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">Email:</span>
                      <p className="text-black font-medium">{selectedBooking.guest?.email || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">Phone:</span>
                      <p className="text-black font-medium">{selectedBooking.guest?.phone || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Room Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-black mb-3">Room Details</h3>
                  <div className="space-y-3">
                    {selectedBooking.booking_rooms?.map((br, idx) => (
                      <div key={br.id} className="bg-white p-3 rounded border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-black font-semibold">Room {br.room?.room_number || "Unknown"}</p>
                            <p className="text-gray-600 text-sm">{br.room?.type?.name || "Unknown Type"}</p>
                          </div>
                          <p className="text-black font-medium">₱{br.price?.toFixed(2) || "0.00"}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Check-in:</span>
                            <p className="text-black">{new Date(br.check_in_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Check-out:</span>
                            <p className="text-black">{new Date(br.check_out_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {br.discount > 0 && (
                          <div className="mt-2 text-sm">
                            <span className="text-gray-600">Discount:</span>
                            <span className="text-green-600 font-medium ml-2">-₱{br.discount.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Extras Information */}
                {selectedBooking.booking_extras && selectedBooking.booking_extras.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-black mb-3">Additional Items</h3>
                    <div className="space-y-2">
                      {selectedBooking.booking_extras.map((extra, idx) => (
                        <div key={extra.id} className="flex justify-between items-center bg-white p-3 rounded border border-gray-200">
                          <div>
                            <p className="text-black font-medium">{extra.label}</p>
                            <p className="text-gray-600 text-sm">Quantity: {extra.quantity}</p>
                          </div>
                          <p className="text-black font-medium">₱{(extra.price * extra.quantity).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-black mb-3">Payment Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Total Price:</span>
                      <span className="text-black font-medium">₱{selectedBooking.total_price?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Discount:</span>
                      <span className="text-green-600 font-medium">-₱{selectedBooking.discount?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-700">Grand Total:</span>
                      <span className="text-black font-bold">₱{selectedBooking.grand_total?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Total Paid:</span>
                      <span className="text-blue-600 font-medium">₱{selectedBooking.total_paid?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-700 font-semibold">Remaining Balance:</span>
                      <span className={`font-bold ${selectedBooking.remaining <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₱{selectedBooking.remaining?.toFixed(2) || "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-gray-700">Status:</span>
                      <span className={`px-3 py-1 rounded text-sm font-medium ${
                        selectedBooking.remaining <= 0 ? 'bg-gray-600 text-white' : 
                        selectedBooking.total_paid > 0 ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedBooking.remaining <= 0 ? 'Paid' : selectedBooking.total_paid > 0 ? 'Partial' : 'Unpaid'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment History */}
                {selectedBooking.payments && selectedBooking.payments.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-black mb-3">Payment History</h3>
                    <div className="space-y-2">
                      {selectedBooking.payments.map((payment, idx) => (
                        <div key={payment.id} className="bg-white p-3 rounded border border-gray-200">
                          {editingPaymentId === payment.id ? (
                            // Edit mode
                            <div className="flex items-center gap-2">
                              <span className="text-black font-medium">₱</span>
                              <input
                                type="number"
                                step="0.01"
                                value={editingPaymentAmount}
                                onChange={(e) => setEditingPaymentAmount(e.target.value)}
                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-black"
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdatePayment(payment.id, parseFloat(editingPaymentAmount))}
                                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingPaymentId(null);
                                  setEditingPaymentAmount("");
                                }}
                                className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            // View mode
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <p className="text-black font-medium">₱{payment.amount?.toFixed(2) || "0.00"}</p>
                                <p className="text-gray-600 text-sm">{new Date(payment.created_at).toLocaleString()}</p>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mt-1 inline-block">
                                  {payment.method || "Cash"}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditingPaymentId(payment.id);
                                    setEditingPaymentAmount(payment.amount.toString());
                                  }}
                                  className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeletePayment(payment.id)}
                                  className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="text-sm text-gray-600 border-t pt-3">
                  <p>Created: {new Date(selectedBooking.created_at).toLocaleString()}</p>
                  <p>Last Updated: {new Date(selectedBooking.updated_at).toLocaleString()}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                type="button"
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                onClick={() => setDetailModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={() => {
                  if (selectedBooking) {
                    openModal(selectedBooking);
                    setDetailModalOpen(false);
                  }
                }}
              >
                Edit Booking
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </main>
    </div>
  );
}
