"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@headlessui/react";
import { Booking, Guest, Room, BookingFormData, CreateBookingRoomRequest, CreateBookingExtraRequest } from "@/types";
import AdminNavigation from "@/components/AdminNavigation";
import AdminAuthGuard from "@/components/AdminAuthGuard";
import toast, { Toaster } from 'react-hot-toast';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [extras, setExtras] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [bookingRooms, setBookingRooms] = useState<CreateBookingRoomRequest[]>([]);
  const [bookingExtras, setBookingExtras] = useState<CreateBookingExtraRequest[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [bookingDiscount, setBookingDiscount] = useState<string>("");
  const [bookingNote, setBookingNote] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  
  // Filter states
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [monthFilterType, setMonthFilterType] = useState<string>("created_at"); // Default to "created_at"
  const [selectedGuest, setSelectedGuest] = useState<string>("");
  const [guestSearchTerm, setGuestSearchTerm] = useState<string>("");
  const [showGuestDropdown, setShowGuestDropdown] = useState<boolean>(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  
  // Payment edit state
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingPaymentAmount, setEditingPaymentAmount] = useState<string>("");
  
  // Partial payment modal state
  const [partialPaymentModalOpen, setPartialPaymentModalOpen] = useState<boolean>(false);
  const [partialPaymentBookingId, setPartialPaymentBookingId] = useState<number | null>(null);
  const [partialPaymentAmount, setPartialPaymentAmount] = useState<string>("");
  const [partialPaymentError, setPartialPaymentError] = useState<string>("");
  
  // Check-in modal state
  const [checkInModalOpen, setCheckInModalOpen] = useState<boolean>(false);
  const [checkInBookingId, setCheckInBookingId] = useState<number | null>(null);
  const [checkInProofUrl, setCheckInProofUrl] = useState<string>("");
  const [checkInError, setCheckInError] = useState<string>("");
  
  // Loading states for preventing double submissions
  const [submittingBooking, setSubmittingBooking] = useState<boolean>(false);
  const [processingPayment, setProcessingPayment] = useState<boolean>(false);
  const [deletingBooking, setDeletingBooking] = useState<boolean>(false);
  const [processingCheckIn, setProcessingCheckIn] = useState<boolean>(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Close guest dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.guest-search-container')) {
        setShowGuestDropdown(false);
      }
    };

    if (showGuestDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showGuestDropdown]);

  // Helper functions for managing multiple rooms
  const addRoom = () => {
    const newRooms = [...bookingRooms, {
      roomId: "",
      check_in_date: "",
      check_out_date: "",
      price: 0,
      discount: 0
    }];
    setBookingRooms(newRooms);
  };

  const removeRoom = (index: number) => {
    const newRooms = bookingRooms.filter((_, i) => i !== index);
    
    // Reapply package coverage after removing room
    const roomsWithPackage = applyPackageCoverage(newRooms);
    setBookingRooms(roomsWithPackage);
    calculateTotalPrice(roomsWithPackage);
  };

  const updateRoom = (index: number, field: keyof CreateBookingRoomRequest, value: string | number) => {
    const newRooms = [...bookingRooms];
    newRooms[index] = { ...newRooms[index], [field]: value };
    
    // Reapply package coverage after updating room
    const roomsWithPackage = applyPackageCoverage(newRooms);
    setBookingRooms(roomsWithPackage);
    calculateTotalPrice(roomsWithPackage);
  };

  // Helper function to apply package coverage to rooms
  const applyPackageCoverage = (rooms: CreateBookingRoomRequest[]) => {
    const packageExtra = bookingExtras.find(e => e.isPackage && e.includedNights);
    
    if (!packageExtra || !packageExtra.includedNights) {
      // No package, calculate normal prices
      return rooms.map(room => ({
        ...room,
        price: calculateRoomPrice(room.roomId, room.check_in_date, room.check_out_date),
        discount: room.discount || 0
      }));
    }
    
    // Apply package coverage
    const updatedRooms = [...rooms];
    let remainingPackageNights = packageExtra.includedNights;
    
    for (let i = 0; i < updatedRooms.length; i++) {
      if (!updatedRooms[i].check_in_date || !updatedRooms[i].check_out_date || !updatedRooms[i].roomId) {
        // Room not fully filled yet, keep price at 0
        updatedRooms[i] = { ...updatedRooms[i], price: 0, discount: 0 };
        continue;
      }
      
      const checkIn = new Date(updatedRooms[i].check_in_date);
      const checkOut = new Date(updatedRooms[i].check_out_date);
      const roomNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      
      if (remainingPackageNights <= 0) {
        // Package exhausted, charge normal price
        updatedRooms[i] = {
          ...updatedRooms[i],
          price: calculateRoomPrice(updatedRooms[i].roomId, updatedRooms[i].check_in_date, updatedRooms[i].check_out_date),
          discount: 0
        };
      } else if (roomNights <= remainingPackageNights) {
        // This entire room is covered by the package
        updatedRooms[i] = { ...updatedRooms[i], price: 0, discount: 0 };
        remainingPackageNights -= roomNights;
      } else {
        // Package partially covers this room
        const originalPrice = calculateRoomPrice(updatedRooms[i].roomId, updatedRooms[i].check_in_date, updatedRooms[i].check_out_date);
        const pricePerNight = originalPrice / roomNights;
        const uncoveredNights = roomNights - remainingPackageNights;
        updatedRooms[i] = { 
          ...updatedRooms[i], 
          price: pricePerNight * uncoveredNights, 
          discount: 0 
        };
        remainingPackageNights = 0;
      }
    }
    
    return updatedRooms;
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
    // Use the room.price that was already calculated (which includes package coverage)
    const roomsTotal = rooms.reduce((sum, room) => {
      return sum + (room.price || 0) - (room.discount || 0);
    }, 0);
    
    const extrasTotal = extras.reduce((sum, extra) => {
      return sum + (extra.price * (extra.quantity || 1));
    }, 0);
    
    setTotalPrice(roomsTotal + extrasTotal);
  };

  // Helper functions for managing extras
  const addExtra = () => {
    const newExtras = [...bookingExtras, {
      extraId: "",
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
  // Filter guests based on search term
  const filteredGuestOptions = guests.filter(guest =>
    guest.name.toLowerCase().includes(guestSearchTerm.toLowerCase()) ||
    guest.email?.toLowerCase().includes(guestSearchTerm.toLowerCase()) ||
    guest.phone?.includes(guestSearchTerm)
  );

  // Handle guest selection
  const handleGuestSelect = (guestId: string, guestName: string) => {
    setSelectedGuest(guestId);
    setGuestSearchTerm(guestName);
    setShowGuestDropdown(false);
  };

  // Handle guest search input
  const handleGuestSearchChange = (value: string) => {
    setGuestSearchTerm(value);
    setShowGuestDropdown(true);
    if (value === "") {
      setSelectedGuest("");
    }
  };

  const applyFilters = () => {
    let filtered = [...bookings];

    // Filter by month
    if (selectedMonth) {
      filtered = filtered.filter(booking => {
        const filterMonth = new Date(selectedMonth);
        
        if (monthFilterType === "created_at") {
          // Filter by created_at date
          const createdAt = new Date(booking.created_at);
          return (
            createdAt.getFullYear() === filterMonth.getFullYear() && 
            createdAt.getMonth() === filterMonth.getMonth()
          );
        } else {
          // Filter by check-in/check-out dates (existing logic)
          return booking.booking_rooms.some(room => {
            const checkInDate = new Date(room.check_in_date);
            const checkOutDate = new Date(room.check_out_date);
            
            // Check if the booking overlaps with the selected month
            return (
              (checkInDate.getFullYear() === filterMonth.getFullYear() && 
               checkInDate.getMonth() === filterMonth.getMonth()) ||
              (checkOutDate.getFullYear() === filterMonth.getFullYear() && 
               checkOutDate.getMonth() === filterMonth.getMonth())
            );
          });
        }
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

  const fetchExtras = async () => {
    try {
      const res = await fetch("/api/extras");
      const data = await res.json();
      if (Array.isArray(data)) {
        setExtras(data);
      } else {
        console.error('Extras API returned non-array data:', data);
        setExtras([]);
      }
    } catch (error) {
      console.error('Error fetching extras:', error);
      setExtras([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchBookings(),
        fetchGuests(),
        fetchRooms(),
        fetchExtras()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Apply filters whenever bookings or filter criteria change
  useEffect(() => {
    applyFilters();
    setCurrentPage(1); // Reset to first page when filters change
  }, [bookings, selectedMonth, monthFilterType, selectedGuest, selectedStatus]);


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
      
      // Set booking discount
      setBookingDiscount(booking.discount === 0 ? '' : booking.discount.toString());
      
      // Set booking note
      setBookingNote(booking.note || '');
      
      // Convert booking extras to the form format and fetch package info
      const extrasWithPackageInfo = booking.booking_extras?.map(ex => {
        // Find the full extra details to get package info
        const fullExtra = extras.find(e => e.id === ex.extra_id?.toString());
        return {
          extraId: ex.extra_id?.toString() || '',
          label: ex.label,
          price: ex.price,
          quantity: ex.quantity,
          isPackage: fullExtra ? (fullExtra as any).is_package || false : false,
          includedNights: fullExtra ? (fullExtra as any).included_nights || null : null
        };
      }) || [];
      setBookingExtras(extrasWithPackageInfo);
      
      // Apply package coverage to the rooms after loading extras
      setTimeout(() => {
        const roomsWithPackage = applyPackageCoverage(rooms);
        setBookingRooms(roomsWithPackage);
        calculateTotalPrice(roomsWithPackage, extrasWithPackageInfo);
      }, 0);
      
      setTotalPrice(booking.total_price);
    } else {
      setBookingRooms([]);
      setBookingExtras([]);
      setTotalPrice(0);
      setBookingDiscount("");
      setBookingNote("");
    }
    setModalOpen(true);
  };

  // Submit booking form
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submittingBooking) return; // Prevent double submission
    
    setSubmittingBooking(true);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    // Validate that we have at least one room OR at least one extra
    if (bookingRooms.length === 0 && bookingExtras.length === 0) {
      setError('Please add at least one room or extra to the booking');
      return;
    }

    // Validate all rooms have required fields and valid prices (only if there are rooms)
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
      discount: bookingDiscount === '' ? 0 : Number(bookingDiscount),
      note: bookingNote || undefined,
    };

    console.log('Submitting booking with payload:', payload);
    console.log('Booking discount value:', bookingDiscount, 'Type:', typeof bookingDiscount);
    console.log('Converted discount:', bookingDiscount === '' ? 0 : Number(bookingDiscount));

    try {
    if (editingBooking) {
        const response = await fetch(`/api/bookings/${editingBooking.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
        let result;
        try {
          const responseText = await response.text();
          if (responseText) {
            result = JSON.parse(responseText);
          } else {
            result = {};
          }
        } catch (parseError) {
          console.error('Failed to parse response JSON:', parseError);
          console.error('Response status:', response.status, response.statusText);
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
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
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Delete booking
  const handleDeleteBooking = async (id: number) => {
    if (!confirm("Delete this booking?")) return;
    
    if (deletingBooking) return; // Prevent double submission
    
    setDeletingBooking(true);
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
    } finally {
      setDeletingBooking(false);
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
    if (processingPayment) return; // Prevent double submission
    
    setProcessingPayment(true);
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
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleMarkPartialPaid = (bookingId: number) => {
    setPartialPaymentBookingId(bookingId);
    setPartialPaymentAmount("");
    setPartialPaymentError("");
    setPartialPaymentModalOpen(true);
  };

  const handlePartialPaymentSubmit = async () => {
    if (!partialPaymentBookingId || !partialPaymentAmount) return;
    
    if (processingPayment) return; // Prevent double submission
    
    const amount = parseInt(partialPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setPartialPaymentError("Please enter a valid amount (whole numbers only)");
      return;
    }

    setProcessingPayment(true);
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        body: JSON.stringify({ bookingId: partialPaymentBookingId, type: "partial", amount }),
        headers: { "Content-Type": "application/json" },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        await fetchBookings();
        toast.success(`Partial payment of ₱${amount} recorded!`);
        setPartialPaymentModalOpen(false);
        setPartialPaymentAmount("");
        setPartialPaymentError("");
      } else {
        setPartialPaymentError(data.error || 'Failed to record partial payment');
      }
    } catch (error) {
      setPartialPaymentError('Error processing payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handle check-in submission
  const handleCheckInSubmit = async () => {
    if (!checkInBookingId || !checkInProofUrl) {
      setCheckInError("Proof image URL is required");
      return;
    }

    if (processingCheckIn) return; // Prevent double submission

    setProcessingCheckIn(true);
    try {
      const response = await fetch(`/api/bookings/${checkInBookingId}/check-in`, {
        method: "POST",
        body: JSON.stringify({ proofImageUrl: checkInProofUrl }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (response.ok) {
        await fetchBookings();
        toast.success("Guest checked in successfully!");
        setCheckInModalOpen(false);
        setCheckInProofUrl("");
        setCheckInError("");
      } else {
        setCheckInError(data.error || 'Failed to check in');
      }
    } catch (error) {
      setCheckInError('Error processing check-in');
    } finally {
      setProcessingCheckIn(false);
    }
  };

  // Open check-in modal
  const openCheckInModal = (bookingId: number) => {
    setCheckInBookingId(bookingId);
    setCheckInProofUrl("");
    setCheckInError("");
    setCheckInModalOpen(true);
  };

  const handlePartialPaymentInputChange = (value: string) => {
    // Only allow whole numbers (no decimals, no negative signs)
    const cleanValue = value.replace(/[^0-9]/g, '');
    setPartialPaymentAmount(cleanValue);
    setPartialPaymentError("");
  };

  // Export bookings to CSV
  const exportBookingsCSV = () => {
    if (filteredBookings.length === 0) {
      toast.error("No bookings to export");
      return;
    }

    // Create CSV headers
    const headers = [
      "Booking ID",
      "Guest Name",
      "Email",
      "Phone",
      "Status",
      "Check-in Date",
      "Check-out Date",
      "Rooms",
      "Extras",
      "Total Price",
      "Discount",
      "Total Paid",
      "Remaining",
      "Payment Status",
      "Note",
      "Created At"
    ];

    // Create CSV rows
    const rows = filteredBookings.map(booking => {
      const roomsText = booking.booking_rooms.map(br => 
        `Room ${rooms.find(r => r.id === br.room_id)?.room_number || br.room_id} (${new Date(br.check_in_date).toLocaleDateString()} - ${new Date(br.check_out_date).toLocaleDateString()})`
      ).join('; ');
      
      const extrasText = booking.booking_extras.map(ex => 
        `${ex.label} x${ex.quantity}`
      ).join('; ');

      const paymentStatus = booking.remaining <= 0 ? 'Fully Paid' : 
                           booking.total_paid > 0 ? 'Partially Paid' : 'Unpaid';

      const earliestCheckIn = booking.booking_rooms.length > 0 
        ? new Date(Math.min(...booking.booking_rooms.map(br => new Date(br.check_in_date).getTime()))).toLocaleDateString()
        : 'N/A';
      
      const latestCheckOut = booking.booking_rooms.length > 0
        ? new Date(Math.max(...booking.booking_rooms.map(br => new Date(br.check_out_date).getTime()))).toLocaleDateString()
        : 'N/A';

      return [
        booking.id,
        booking.guest.name,
        booking.guest.email || '',
        booking.guest.phone || '',
        booking.status,
        earliestCheckIn,
        latestCheckOut,
        roomsText || 'No rooms',
        extrasText || 'No extras',
        booking.total_price.toFixed(2),
        booking.discount.toFixed(2),
        booking.total_paid.toFixed(2),
        booking.remaining.toFixed(2),
        paymentStatus,
        booking.note || '',
        new Date(booking.created_at).toLocaleDateString()
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const monthText = selectedMonth 
      ? new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      : 'All';
    
    link.setAttribute('href', url);
    link.setAttribute('download', `Bookings_${monthText}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${filteredBookings.length} bookings!`);
  };

  if (loading) {
    return (
      <AdminAuthGuard>
        <div className="min-h-screen bg-gray-50">
          <AdminNavigation currentPage="bookings" />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-600">Loading bookings...</div>
            </div>
          </main>
        </div>
      </AdminAuthGuard>
    );
  }

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50">
      <Toaster position="top-right" />
      <AdminNavigation currentPage="bookings" />

      {/* Main Content */}
    <main className="p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent mb-3">📋 Bookings Management</h2>
            <p className="text-gray-700 text-lg">Manage hotel bookings and reservations 🏨</p>
          </div>
        <button
          className="px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-900 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold"
          onClick={() => openModal()}
        >
          ➕ Add Booking
        </button>
        </div>

        {error && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-3xl">⚠️</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-800 mb-2">Error</h3>
                <div className="text-sm text-red-700 bg-white/50 rounded-lg px-4 py-2">{error}</div>
              </div>
            </div>
          </div>
        )}

      {/* Filters */}
      <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-stone-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              📅 Filter by Month
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 bg-white focus:border-amber-700 focus:ring-2 focus:ring-amber-200 transition-all duration-300 font-medium text-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              🔍 Filter Type
            </label>
            <select
              value={monthFilterType}
              onChange={(e) => setMonthFilterType(e.target.value)}
              className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 bg-white focus:border-amber-700 focus:ring-2 focus:ring-amber-200 transition-all duration-300 font-medium text-gray-800"
            >
              <option value="created_at">Created At</option>
              <option value="checkin_checkout">Check-in/Check-out</option>
            </select>
          </div>
          <div className="relative guest-search-container">
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              👤 Filter by Guest
            </label>
            <div className="relative">
              <input
                type="text"
                value={guestSearchTerm}
                onChange={(e) => handleGuestSearchChange(e.target.value)}
                onFocus={() => setShowGuestDropdown(true)}
                placeholder="Search by name, email, or phone..."
                className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 bg-white focus:border-amber-700 focus:ring-2 focus:ring-amber-200 transition-all duration-300 font-medium text-gray-800"
              />
              {guestSearchTerm && (
                <button
                  onClick={() => {
                    setGuestSearchTerm("");
                    setSelectedGuest("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Dropdown Results */}
            {showGuestDropdown && guestSearchTerm && filteredGuestOptions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border-2 border-stone-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {filteredGuestOptions.map((guest) => (
                  <button
                    key={guest.id}
                    onClick={() => handleGuestSelect(guest.id, guest.name)}
                    className="w-full text-left px-4 py-3 hover:bg-amber-50 transition-colors border-b border-stone-100 last:border-b-0"
                  >
                    <div className="font-semibold text-gray-900">{guest.name}</div>
                    <div className="text-sm text-gray-600">
                      {guest.email && <span>{guest.email}</span>}
                      {guest.email && guest.phone && <span> • </span>}
                      {guest.phone && <span>{guest.phone}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* No results message */}
            {showGuestDropdown && guestSearchTerm && filteredGuestOptions.length === 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border-2 border-stone-200 rounded-xl shadow-xl p-4">
                <p className="text-gray-600 text-sm">No guests found matching "{guestSearchTerm}"</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              💰 Filter by Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 bg-white focus:border-amber-700 focus:ring-2 focus:ring-amber-200 transition-all duration-300 font-medium text-gray-800"
            >
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                setSelectedMonth("");
                setSelectedGuest("");
                setGuestSearchTerm("");
                setSelectedStatus("");
              }}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-stone-500 to-stone-700 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold"
            >
              🗑️ Clear Filters
            </button>
            <button
              onClick={exportBookingsCSV}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold"
            >
              📥 Export CSV
            </button>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredBookings.length} of {bookings.length} bookings
        </div>
      </div>

      {/* Bookings Table - Desktop View */}
      <div className="hidden lg:block overflow-x-auto">
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
                    disabled={deletingBooking}
                    className={`px-2 py-1 rounded mx-1 ${
                      deletingBooking 
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                    onClick={() => handleDeleteBooking(Number(b.id))}
                  >
                    {deletingBooking ? 'Deleting...' : 'Delete'}
                  </button>
                  <button
                    className={`px-2 py-1 rounded mx-1 ${
                      isPaid || processingPayment
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                    onClick={() => handleMarkPaid(Number(b.id))}
                    disabled={isPaid || processingPayment}
                  >
                    {processingPayment ? 'Processing...' : 'Mark Paid'}
                  </button>
                  <button
                    className={`px-2 py-1 rounded mx-1 ${
                      isPaid || processingPayment
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                        : 'bg-yellow-400 text-white hover:bg-yellow-500'
                    }`}
                    onClick={() => handleMarkPartialPaid(Number(b.id))}
                    disabled={isPaid || processingPayment}
                  >
                    {processingPayment ? 'Processing...' : 'Partial Paid'}
                  </button>
                  <button
                    className={`px-2 py-1 rounded mx-1 ${
                      b.status === 'checked_in' || processingCheckIn
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                        : 'bg-amber-700 text-white hover:bg-amber-800'
                    }`}
                    onClick={() => openCheckInModal(Number(b.id))}
                    disabled={b.status === 'checked_in' || processingCheckIn}
                  >
                    {b.status === 'checked_in' ? 'Checked In' : 'Check In'}
                  </button>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>

      {/* Bookings Cards - Mobile View */}
      <div className="lg:hidden space-y-4">
        {Array.isArray(filteredBookings) && 
         filteredBookings
           .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // Sort by most recent first
           .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) // Paginate
           .map((b:Booking) => {
          const isPaid = b.remaining <= 0;
          const isPartiallyPaid = b.total_paid > 0 && b.remaining > 0;
          return (
          <div 
            key={b.id} 
            className={`bg-white border border-gray-300 rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
              isPaid ? 'bg-gray-50' : ''
            }`}
            onDoubleClick={() => {
              setSelectedBooking(b);
              setDetailModalOpen(true);
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{b.guest.name}</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  isPaid ? 'bg-gray-600 text-white' : 
                  isPartiallyPaid ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'
                }`}>
                  {isPaid ? 'Paid' : isPartiallyPaid ? 'Partial' : 'Unpaid'}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Total</div>
                <div className="font-bold text-lg">₱{b.total_price.toFixed(2)}</div>
              </div>
            </div>

            {/* Rooms */}
            <div className="mb-3">
              <div className="text-sm font-medium text-gray-700 mb-2">Rooms:</div>
              <div className="space-y-2">
                {b.booking_rooms.map((room, index) => (
                  <div key={room.id} className="bg-gray-50 p-2 rounded text-sm">
                    <div className="font-medium text-gray-900">Room {room.room.room_number}</div>
                    <div className="text-gray-600">
                      {new Date(room.check_in_date).toLocaleDateString()} - {new Date(room.check_out_date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {room.room.type?.name} • ₱{room.price.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div>
                <div className="text-gray-600">Discount</div>
                <div className="font-medium">₱{b.discount.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-600">Total Paid</div>
                <div className="font-medium">₱{b.total_paid.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-600">Remaining</div>
                <div className="font-medium">₱{b.remaining.toFixed(2)}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                onClick={() => openModal(b)}
              >
                Edit
              </button>
              <button
                disabled={deletingBooking}
                className={`flex-1 px-3 py-2 rounded text-sm ${
                  deletingBooking 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
                onClick={() => handleDeleteBooking(Number(b.id))}
              >
                {deletingBooking ? 'Deleting...' : 'Delete'}
              </button>
              <button
                className={`flex-1 px-3 py-2 rounded text-sm ${
                  isPaid || processingPayment
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
                onClick={() => handleMarkPaid(Number(b.id))}
                disabled={isPaid || processingPayment}
              >
                {processingPayment ? 'Processing...' : 'Mark Paid'}
              </button>
              <button
                className={`flex-1 px-3 py-2 rounded text-sm ${
                  isPaid || processingPayment
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-yellow-400 text-white hover:bg-yellow-500'
                }`}
                onClick={() => handleMarkPartialPaid(Number(b.id))}
                disabled={isPaid || processingPayment}
              >
                {processingPayment ? 'Processing...' : 'Partial Paid'}
              </button>
              <button
                className={`flex-1 px-3 py-2 rounded text-sm ${
                  b.status === 'checked_in' || processingCheckIn
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-amber-700 text-white hover:bg-amber-800'
                }`}
                onClick={() => openCheckInModal(Number(b.id))}
                disabled={b.status === 'checked_in' || processingCheckIn}
              >
                {b.status === 'checked_in' ? 'Checked In' : 'Check In'}
              </button>
            </div>
          </div>
        );
        })}
      </div>

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
                  : 'bg-amber-700 text-white hover:bg-amber-800'
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
                          ? 'bg-amber-800 text-white font-bold'
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
                  : 'bg-amber-700 text-white hover:bg-amber-800'
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
                  onChange={(e) => {
                    if (e.target.value === "add_new") {
                      window.location.href = "/guests";
                    }
                  }}
                  className="w-full border border-gray-300 rounded p-2 bg-white text-black"
                  required
                >
                  <option value="">Select Guest</option>
                  <option value="add_new" className="bg-amber-50 font-semibold text-amber-800">+ Add New Guest</option>
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

                {bookingRooms.map((room, index) => {
                  // Check if this room is included in a package based on room-nights
                  const packageExtra = bookingExtras.find(e => e.isPackage && e.includedNights);
                  let isIncludedInPackage = false;
                  
                  if (packageExtra && packageExtra.includedNights) {
                    // Calculate cumulative room-nights up to this room
                    let cumulativeNights = 0;
                    for (let i = 0; i <= index; i++) {
                      const checkIn = new Date(bookingRooms[i].check_in_date);
                      const checkOut = new Date(bookingRooms[i].check_out_date);
                      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                      if (i < index) {
                        cumulativeNights += nights;
                      } else {
                        // For current room, check if any nights are covered
                        if (cumulativeNights < packageExtra.includedNights) {
                          isIncludedInPackage = true;
                        }
                      }
                    }
                  }
                  
                  return (
                  <div key={index} className="border border-gray-300 rounded p-3 mb-3 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-black">Room {index + 1}</span>
                        {isIncludedInPackage && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">
                            📦 Included in Package
                          </span>
                        )}
                      </div>
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
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={room.discount === 0 ? '' : room.discount}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            updateRoom(index, 'discount', value === '' ? 0 : parseInt(value));
                          }}
                          className="w-full border border-gray-300 rounded p-2 bg-white text-black text-sm"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                  );
                })}
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
                    <br />
                    <span className="text-purple-600 font-semibold">💡 Tip: Select a Package to include room nights at no extra charge!</span>
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
                        <label className="block text-sm font-medium text-black mb-1">Service/Tour</label>
                        <select
                          value={extra.extraId || ''}
                          onChange={(e) => {
                            const selectedExtra = extras.find(ex => ex.id === e.target.value);
                            if (selectedExtra) {
                              const newExtras = [...bookingExtras];
                              newExtras[index] = {
                                ...newExtras[index],
                                extraId: e.target.value,
                                label: selectedExtra.name,
                                price: Number(selectedExtra.price),
                                isPackage: (selectedExtra as any).is_package || false,
                                includedNights: (selectedExtra as any).included_nights || null
                              };
                              setBookingExtras(newExtras);
                              
                              // If it's a package, allocate free room-nights based on total nights
                              if ((selectedExtra as any).is_package && (selectedExtra as any).included_nights) {
                                const updatedRooms = [...bookingRooms];
                                const packageNights = (selectedExtra as any).included_nights;
                                let remainingPackageNights = packageNights;
                                
                                // Calculate nights for each room and allocate package coverage
                                for (let i = 0; i < updatedRooms.length && remainingPackageNights > 0; i++) {
                                  const checkIn = new Date(updatedRooms[i].check_in_date);
                                  const checkOut = new Date(updatedRooms[i].check_out_date);
                                  const roomNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                                  
                                  if (roomNights <= remainingPackageNights) {
                                    // This entire room is covered by the package
                                    updatedRooms[i] = { ...updatedRooms[i], price: 0, discount: 0 };
                                    remainingPackageNights -= roomNights;
                                  } else {
                                    // Package partially covers this room
                                    // Calculate the original price per night
                                    const originalPrice = calculateRoomPrice(updatedRooms[i].roomId, updatedRooms[i].check_in_date, updatedRooms[i].check_out_date);
                                    const pricePerNight = originalPrice / roomNights;
                                    const uncoveredNights = roomNights - remainingPackageNights;
                                    updatedRooms[i] = { 
                                      ...updatedRooms[i], 
                                      price: pricePerNight * uncoveredNights, 
                                      discount: 0 
                                    };
                                    remainingPackageNights = 0;
                                  }
                                }
                                
                                setBookingRooms(updatedRooms);
                                calculateTotalPrice(updatedRooms, newExtras);
                              } else {
                                calculateTotalPrice(bookingRooms, newExtras);
                              }
                            }
                          }}
                          className="w-full border border-gray-300 rounded p-2 bg-white text-black text-sm"
                          required
                        >
                          <option value="">Select an extra...</option>
                          {extras.map(ex => (
                            <option key={ex.id} value={ex.id}>
                              {ex.name} - ₱{Number(ex.price).toFixed(2)}
                              {(ex as any).is_package && (ex as any).included_nights ? ` (Package: ${(ex as any).included_nights}N included)` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">Price (₱)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={extra.price}
                          readOnly
                          className="w-full border border-gray-300 rounded p-2 bg-gray-100 text-black text-sm cursor-not-allowed"
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
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={bookingDiscount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setBookingDiscount(value);
                  }}
                  className="w-full border border-gray-300 rounded p-2 bg-white text-black"
                  placeholder="0"
                />
              </div>

              {/* Booking Note */}
              <div>
                <label className="block font-semibold mb-1 text-black">Note (Optional)</label>
                <textarea
                  value={bookingNote}
                  onChange={(e) => setBookingNote(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 bg-white text-black"
                  placeholder="Add any special notes or requests..."
                  rows={3}
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
                  disabled={submittingBooking}
                  className={`px-3 py-1 rounded ${
                    submittingBooking 
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-amber-700 text-white hover:bg-amber-800'
                  }`}
                >
                  {submittingBooking ? 'Saving...' : (editingBooking ? "Update" : "Add")}
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
                      <span className="text-black font-bold">₱{((selectedBooking.total_price || 0) - (selectedBooking.discount || 0)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Total Paid:</span>
                      <span className="text-amber-700 font-medium">₱{selectedBooking.total_paid?.toFixed(2) || "0.00"}</span>
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
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={editingPaymentAmount}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9]/g, '');
                                  setEditingPaymentAmount(value);
                                }}
                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-black"
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdatePayment(payment.id, parseInt(editingPaymentAmount))}
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
                                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded mt-1 inline-block">
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
                className="px-4 py-2 bg-amber-700 text-white rounded hover:bg-amber-800"
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

      {/* Partial Payment Modal */}
      <Dialog open={partialPaymentModalOpen} onClose={() => setPartialPaymentModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-xl shadow p-6 w-full max-w-md">
            <Dialog.Title className="text-xl font-bold mb-4 text-black">
              Add Partial Payment
            </Dialog.Title>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount (₱)
                </label>
                <input
                  type="text"
                  value={partialPaymentAmount}
                  onChange={(e) => handlePartialPaymentInputChange(e.target.value)}
                  placeholder="Enter amount (whole numbers only)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {partialPaymentError && (
                  <p className="text-red-600 text-sm mt-1">{partialPaymentError}</p>
                )}
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  disabled={processingPayment}
                  onClick={handlePartialPaymentSubmit}
                  className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                    processingPayment 
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-amber-800 text-white hover:bg-amber-900'
                  }`}
                >
                  {processingPayment ? 'Recording...' : 'Record Payment'}
                </button>
                <button
                  type="button"
                  onClick={() => setPartialPaymentModalOpen(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Check-In Modal */}
      <Dialog
        open={checkInModalOpen}
        onClose={() => setCheckInModalOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-xl border-2 border-stone-200">
            <Dialog.Title className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-3xl">📸</span> Check-In Guest
            </Dialog.Title>

            <div className="space-y-4">
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Check-in is only allowed on the check-in date. Please provide a picture URL of the guest for verification.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Proof Image URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={checkInProofUrl}
                  onChange={(e) => {
                    setCheckInProofUrl(e.target.value);
                    setCheckInError("");
                  }}
                  placeholder="https://example.com/image.jpg"
                  className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 bg-white focus:border-amber-700 focus:ring-2 focus:ring-amber-200 transition-all duration-300 font-medium text-gray-800"
                  disabled={processingCheckIn}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Enter the URL of the proof image (e.g., from Google Drive, Dropbox, or image hosting)
                </p>
              </div>

              {checkInError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-700">{checkInError}</p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCheckInSubmit}
                  disabled={processingCheckIn || !checkInProofUrl}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    processingCheckIn || !checkInProofUrl
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-700 to-amber-900 text-white hover:shadow-lg hover:scale-105'
                  }`}
                >
                  {processingCheckIn ? 'Checking In...' : '✓ Check In Guest'}
                </button>
                <button
                  type="button"
                  onClick={() => setCheckInModalOpen(false)}
                  disabled={processingCheckIn}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-400 transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </main>
      </div>
    </AdminAuthGuard>
  );
}
