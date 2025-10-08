"use client";

import { useEffect, useState, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { Dialog } from "@headlessui/react";
import Image from "next/image";
import { RoomAvailability, BookingEvent, RoomStatus } from "@/types";
import { useUser, useClerk } from "@clerk/nextjs";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function Home() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { isAdmin, checkingAdmin } = useAdminAuth();
  
  // All useState hooks must be at the top level
  const [rooms, setRooms] = useState<RoomAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingEvent | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date()); // Track current month view
  const [activeTab, setActiveTab] = useState<'availability' | 'packages' | 'tours'>('availability');
  
  // ALL useEffect hooks must also be at the top level before any conditional returns
  
  // Redirect admin users to dashboard
  useEffect(() => {
    if (user && isAdmin === true) {
      window.location.href = '/dashboard';
    }
  }, [user, isAdmin]);

  // Fetch room availability when month changes
  useEffect(() => {
    const fetchAvailability = async () => {
      setLoadingBookings(true);
      try {
        // Get first and last day of current month
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        
        // Format dates avoiding timezone issues
        const startDate = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
        const endDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
        
        console.log('Home page fetching availability for date range:', startDate, 'to', endDate);
        console.log('First day:', firstDay);
        console.log('Last day:', lastDay);
        
        const res = await fetch(`/api/availability?startDate=${startDate}&endDate=${endDate}`);
        
        console.log('API response status:', res.status);
        console.log('API response headers:', res.headers);
        
        // Clone the response BEFORE reading it
        const resClone = res.clone();
        
        if (!res.ok) {
          console.error("API request failed with status:", res.status);
          let errorText = '';
          try {
            errorText = await res.text();
            console.error("API error response:", errorText);
          } catch (textError) {
            console.error("Could not read error response:", textError);
          }
          
          // Try test endpoint as fallback
          console.log('Trying test endpoint as fallback...');
          try {
            const testRes = await fetch('/api/test-availability');
            const testData = await testRes.json();
            console.log('Test endpoint response:', testData);
            setAvailabilityError(`Availability API failed (${res.status}), but test endpoint works. Check deployment logs.`);
          } catch (testError) {
            console.error('Test endpoint also failed:', testError);
            setAvailabilityError(`Both APIs failed. Check deployment configuration.`);
          }
          
          setRooms([]);
          return;
        }
        
        let data;
        try {
          data = await res.json();
        } catch (jsonError) {
          console.error('JSON parsing error:', jsonError);
          // Use the cloned response for debugging
          try {
            const responseText = await resClone.text();
            console.error('Response text:', responseText);
            setAvailabilityError(`Invalid JSON response. Server returned HTML instead of JSON. Check if API route is deployed correctly.`);
          } catch (textError) {
            console.error('Could not read response text:', textError);
            setAvailabilityError('Invalid response format from server. API may be returning 404 or error page.');
          }
          setRooms([]);
          return;
        }
        
        console.log('Availability API response:', data);
        console.log('Data type:', typeof data);
        console.log('Is array:', Array.isArray(data));
        
        if (Array.isArray(data)) {
          setRooms(data);
          setAvailabilityError(""); // Clear any previous errors
        } else {
          console.error('API returned non-array data:', data);
          setAvailabilityError('Invalid data format received from server');
          setRooms([]);
        }
      } catch (error) {
        console.error("Error fetching availability:", error);
        setAvailabilityError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setRooms([]);
      } finally {
        setLoading(false);
        setLoadingBookings(false);
      }
    };
    fetchAvailability();
  }, [currentMonth]);

  // Create room availability events for each date - FUNCTION DEFINITION (not a hook)
  const createRoomAvailabilityEvents = () => {
    const events: BookingEvent[] = [];
    
    // Get first and last day of current month
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    // Safety check: ensure rooms is an array
    if (!Array.isArray(rooms)) {
      console.warn('Rooms data is not an array:', rooms);
      return events;
    }
    
    // Generate events for each day of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      // Show ALL rooms (101-208) on every date
      rooms.forEach(room => {
        // Check if this room is occupied on this specific date
        const isOccupied = room.bookings.some(booking => {
          const checkIn = new Date(booking.check_in);
          const checkOut = new Date(booking.check_out);
          return date >= checkIn && date < checkOut;
        });

        // Determine if room is available (not occupied and room is available)
        const isAvailable = !isOccupied && room.is_available;

        // Choose colors based on availability (keep original status colors)
        let backgroundColor = '#e5e7eb'; // Gray for unavailable rooms
        let textColor = '#6b7280'; // Gray text

        if (isAvailable) {
          backgroundColor = '#10b981'; // Green for available (keep original)
          textColor = '#ffffff'; // White text
        } else if (isOccupied) {
          backgroundColor = '#ef4444'; // Red for occupied (keep original)
          textColor = '#ffffff'; // White text
        }

        events.push({
          id: `${room.room_number}-${dateStr}`,
          title: room.room_number,
          start: dateStr,
          end: dateStr,
          allDay: true,
          color: backgroundColor,
          textColor: textColor,
          display: 'list-item',
          extendedProps: {
            roomNumber: room.room_number,
            roomType: room.type,
            price: room.base_price,
            discount: 0,
            payments: [],
            status: isAvailable ? 'available' : isOccupied ? 'occupied' : 'unavailable' 
          }
        });
      });
    }

    return events;
  };

  // Move useMemo hook to after all other hooks
  const allEvents = useMemo(() => createRoomAvailabilityEvents(), [rooms, currentMonth]);

  // Show loading while checking admin status (AFTER all hooks including useMemo)
  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Checking access...</div>
      </div>
    );
  }

  const handleEventClick = (info: any) => {
    setSelectedBooking(info.event as BookingEvent);
    setModalOpen(true);
  };

  const filteredEvents = selectedRoom 
    ? allEvents.filter(event => event.extendedProps.roomNumber === selectedRoom)
    : allEvents;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading room availability...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Image
                src="/amigo-logo.jpg"
                alt="Amigo Inn Siargao"
                width={70}
                height={70}
                className="rounded-full shadow-xl ring-4 ring-amber-100"
                priority
              />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent">
                  Amigo Inn Siargao
                </h1>
                <p className="text-gray-600 text-sm mt-1">Your Paradise Awaits 🏝️</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-2 border border-stone-200">
            <nav className="flex space-x-2" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('availability')}
                className={`${
                  activeTab === 'availability'
                    ? 'bg-gradient-to-r from-amber-700 to-amber-900 text-white shadow-md'
                    : 'text-gray-700 hover:bg-stone-100'
                } flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105`}
              >
                🏨 Room Availability
              </button>
              <button
                onClick={() => setActiveTab('packages')}
                className={`${
                  activeTab === 'packages'
                    ? 'bg-gradient-to-r from-amber-700 to-amber-900 text-white shadow-md'
                    : 'text-gray-700 hover:bg-stone-100'
                } flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105`}
              >
                📦 Packages
              </button>
              <button
                onClick={() => setActiveTab('tours')}
                className={`${
                  activeTab === 'tours'
                    ? 'bg-gradient-to-r from-amber-700 to-amber-900 text-white shadow-md'
                    : 'text-gray-700 hover:bg-stone-100'
                } flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105`}
              >
                🌴 Tours
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'availability' && (
          <>
        {/* Room Filter */}
        <div className="mb-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-stone-200">
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              🔍 Filter by Room
            </label>
            <select
              className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 bg-white focus:border-amber-700 focus:ring-2 focus:ring-amber-200 transition-all duration-300 font-medium text-gray-800"
              value={selectedRoom || ""}
              onChange={(e) => setSelectedRoom(e.target.value || null)}
            >
              <option value="">All Rooms</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.room_number}>
                  Room {room.room_number} - {room.type} (₱{room.base_price})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-amber-50 to-stone-50 rounded-2xl shadow-lg p-6 border border-stone-200">
            <h3 className="text-lg font-bold mb-4 text-gray-900 flex items-center gap-2">
              <span className="text-2xl">📊</span> Room Status Legend
            </h3>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-2 shadow-sm border border-stone-100">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg text-white text-xs flex items-center justify-center font-bold shadow-md">101</div>
                <span className="text-sm font-semibold text-gray-800">Available</span>
              </div>
              <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-2 shadow-sm border border-stone-100">
                <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-600 rounded-lg text-white text-xs flex items-center justify-center font-bold shadow-md">102</div>
                <span className="text-sm font-semibold text-gray-800">Occupied</span>
              </div>
              <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-2 shadow-sm border border-stone-100">
                <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg text-gray-700 text-xs flex items-center justify-center font-bold shadow-md">103</div>
                <span className="text-sm font-semibold text-gray-800">Unavailable</span>
              </div>
            </div>
            <p className="text-sm text-gray-700 mt-4 bg-white/50 rounded-lg px-4 py-2 border border-stone-100">
              💡 Each date shows all room numbers (100-208) with their current status
            </p>
          </div>
        </div>

        {/* Error Display */}
        {availabilityError && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-3xl">⚠️</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-800 mb-2">Unable to load room availability</h3>
                <div className="text-sm text-red-700 bg-white/50 rounded-lg px-4 py-2 mb-4">{availabilityError}</div>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

                 {/* Calendar */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-stone-200 p-6 relative overflow-hidden">
                  {/* Decorative gradient overlay */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-900"></div>
                  
                  {/* Loading Overlay */}
                  {loadingBookings && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-200"></div>
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-amber-700 absolute top-0 left-0"></div>
                        </div>
                        <p className="text-gray-900 font-semibold text-lg">Loading availability...</p>
                      </div>
                    </div>
                  )}
                  <style>{`
                    .fc-daygrid-event-harness {
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .fc-daygrid-day-events {
                        display: flex !important;
                        flex-wrap: wrap !important;
                        gap: 0 !important;
                        padding: 4px !important;
                        row-gap: 3px !important;
                    }
                    .fc-daygrid-event {
                        margin: 0 3px 0 0 !important;
                        padding: 0 !important;
                        width: auto !important;
                    }
                    .fc-event {
                        border: none !important;
                        background: transparent !important;
                        padding: 0 !important;
                    }
                    .fc-daygrid-day-frame {
                        min-height: 120px !important;
                    }
                    .fc-daygrid-more-link {
                        display: none !important;
                    }
                    .fc-toolbar-title {
                        color: #000000 !important;
                        font-weight: bold !important;
                    }
                    .fc-col-header-cell-cushion {
                        color: #000000 !important;
                        font-weight: bold !important;
                    }
                    .fc-daygrid-day-number {
                        color: #000000 !important;
                        font-weight: 600 !important;
                    }
                    .fc-button {
                        color: #ffffff !important;
                    }
                    .fc-toolbar-chunk {
                        display: flex !important;
                        align-items: center !important;
                        gap: 8px !important;
                    }
                    .fc-prev-button, .fc-next-button {
                        background-color: #3b82f6 !important;
                        border-color: #3b82f6 !important;
                        padding: 8px 16px !important;
                        font-size: 14px !important;
                        border-radius: 6px !important;
                    }
                    .fc-prev-button:hover, .fc-next-button:hover {
                        background-color: #2563eb !important;
                        border-color: #2563eb !important;
                    }
                    .fc-toolbar-title {
                        font-size: 18px !important;
                        font-weight: 600 !important;
                        color: #1f2937 !important;
                    }
                    @media (max-width: 768px) {
                        .fc-toolbar {
                            display: flex !important;
                            justify-content: space-between !important;
                            align-items: center !important;
                            padding: 16px 0 !important;
                        }
                        .fc-toolbar-chunk {
                            flex: 1 !important;
                            display: flex !important;
                            justify-content: center !important;
                        }
                        .fc-toolbar-chunk:first-child {
                            justify-content: flex-start !important;
                        }
                        .fc-toolbar-chunk:last-child {
                            justify-content: flex-end !important;
                        }
                        .fc-toolbar-title {
                            font-size: 20px !important;
                            margin: 0 !important;
                        }
                        .fc-prev-button, .fc-next-button {
                            padding: 10px 16px !important;
                            font-size: 14px !important;
                            min-width: 80px !important;
                        }
                    }
                  `}</style>
                  <FullCalendar
                    key={currentMonth.toISOString()}
                    plugins={[dayGridPlugin]}
                    initialView="dayGridMonth"
                    initialDate={currentMonth}
                    events={filteredEvents}
                    height="70vh"
                    datesSet={(dateInfo) => {
                      // Update currentMonth when user navigates to different month
                      // Use the view's currentStart which is the actual month being viewed
                      const viewDate = dateInfo.view.currentStart;
                      const newMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
                      
                      if (newMonth.getMonth() !== currentMonth.getMonth() || newMonth.getFullYear() !== currentMonth.getFullYear()) {
                        console.log('Month changed to:', newMonth.toISOString());
                        setCurrentMonth(newMonth);
                      }
                    }}
                    headerToolbar={{
                      left: 'prev',
                      center: 'title',
                      right: 'next'
                    }}
                    buttonText={{
                      prev: 'Previous',
                      next: 'Next'
                    }}
                    eventDisplay="block"
                    dayMaxEvents={false}
                    eventContent={(eventInfo: any) => {
                      const status = eventInfo.event.extendedProps.status;
                      let bgColor = '#10b981'; // Green
                      let textColor = '#ffffff';
                      
                      if (status === 'occupied') {
                          bgColor = '#ef4444'; // Red for booked
                      } else if (status === 'unavailable') {
                          bgColor = '#9ca3af'; // Gray for unavailable
                          textColor = '#374151';
                      }
                      
                      return {
                        html: `<div class="rounded font-bold" style="background-color: ${bgColor}; color: ${textColor}; padding: 5px 8px; font-size: 11px; text-align: center; white-space: nowrap; line-height: 1.2; cursor: default; pointer-events: none;">
                            ${eventInfo.event.title}
                        </div>`
                      };
                    }}
                  />
                </div>

        {/* Room Information */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div key={room.id} className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg text-gray-800">Room {room.room_number}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  room.is_available 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {room.is_available ? 'Available' : 'Occupied'}
                </span>
              </div>
              <p className="text-gray-700 text-sm mb-1 font-medium">{room.type}</p>
              <p className="text-lg font-semibold text-gray-800">₱{room.base_price}/night</p>
              <p className="text-xs text-gray-600 mt-2">
                {room.bookings.length} booking{room.bookings.length !== 1 ? 's' : ''}
              </p>
            </div>
          ))}
        </div>

      {/* Booking Details Modal */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-xl shadow p-6 w-full max-w-md">
            <Dialog.Title className="text-xl font-bold mb-4">Room Details</Dialog.Title>
            {selectedBooking && (
              <div className="space-y-2">
                <p><strong>Room:</strong> {selectedBooking.extendedProps.roomNumber}</p>
                <p><strong>Type:</strong> {selectedBooking.extendedProps.roomType}</p>
                <p><strong>Price:</strong> ₱{selectedBooking.extendedProps.price}/night</p>
                <p><strong>Status:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    selectedBooking.extendedProps.status === 'available' 
                      ? 'bg-green-100 text-green-800' 
                      : selectedBooking.extendedProps.status === 'occupied'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedBooking.extendedProps.status === 'available' ? 'Available' : 
                     selectedBooking.extendedProps.status === 'occupied' ? 'Occupied' : 'Unavailable'}
                  </span>
                </p>
                <p><strong>Date:</strong> {new Date(selectedBooking.start).toLocaleDateString()}</p>
                {selectedBooking.extendedProps.guestName && (
                  <p><strong>Guest:</strong> {selectedBooking.extendedProps.guestName}</p>
                )}
                {selectedBooking.extendedProps.status === 'occupied' && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-700">
                      <strong>Note:</strong> This room is currently occupied. 
                      Check-in: {new Date(selectedBooking.start).toLocaleDateString()}
                      {selectedBooking.end && (
                        <> - Check-out: {new Date(selectedBooking.end).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                )}
                {selectedBooking.extendedProps.status === 'available' && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">
                      <strong>Available for booking!</strong> Contact us to reserve this room.
                    </p>
                  </div>
                )}
                {selectedBooking.extendedProps.status === 'unavailable' && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>Room temporarily unavailable.</strong> This room is not currently available for booking.
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={() => setModalOpen(false)}
              >
                Close
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
          </>
        )}

        {/* Packages Tab */}
        {activeTab === 'packages' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent mb-3">
                Our Exclusive Packages
              </h2>
              <p className="text-gray-700 text-lg">Choose the perfect package for your island adventure 🏝️</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 3D2N Package */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border-2 border-stone-200 hover:shadow-2xl hover:scale-105 transition-all duration-300">
                <div className="relative">
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-700 to-amber-900 text-white px-4 py-2 rounded-full font-bold shadow-lg z-10">
                    3D/2N
                  </div>
                  <div className="w-full bg-gradient-to-br from-amber-50 to-stone-50 flex items-center justify-center p-6">
                    <Image
                      src="/3d2npackage.jpg"
                      alt="3 Days 2 Nights Package"
                      width={600}
                      height={800}
                      className="w-full h-auto object-contain rounded-xl shadow-lg"
                    />
                  </div>
                </div>
                <div className="p-6 bg-gradient-to-br from-white to-amber-50">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">3 Days 2 Nights Package</h3>
                  <p className="text-gray-700 mb-4">Experience the best of Siargao with our 3-day adventure package</p>
                  <div className="flex items-center gap-2 text-amber-700 font-semibold">
                    <span className="text-xl">✨</span>
                    <span>Perfect for weekend getaways</span>
                  </div>
                </div>
              </div>

              {/* 4D3N Package */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border-2 border-stone-200 hover:shadow-2xl hover:scale-105 transition-all duration-300">
                <div className="relative">
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-800 to-stone-800 text-white px-4 py-2 rounded-full font-bold shadow-lg z-10">
                    4D/3N
                  </div>
                  <div className="w-full bg-gradient-to-br from-stone-50 to-amber-50 flex items-center justify-center p-6">
                    <Image
                      src="/4d3npackage.jpg"
                      alt="4 Days 3 Nights Package"
                      width={600}
                      height={800}
                      className="w-full h-auto object-contain rounded-xl shadow-lg"
                    />
                  </div>
                </div>
                <div className="p-6 bg-gradient-to-br from-white to-stone-50">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">4 Days 3 Nights Package</h3>
                  <p className="text-gray-700 mb-4">Extended adventure with more time to explore Siargao's wonders</p>
                  <div className="flex items-center gap-2 text-amber-800 font-semibold">
                    <span className="text-xl">🌟</span>
                    <span>Most popular choice</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tours Tab */}
        {activeTab === 'tours' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent mb-3">
                Island Tours & Adventures
              </h2>
              <p className="text-gray-700 text-lg">Discover the beauty of Siargao with our guided tours 🌴</p>
            </div>

            {/* 3 Island Tours */}
            <div className="bg-gradient-to-br from-white to-amber-50 rounded-2xl shadow-xl p-8 border-2 border-stone-200 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-amber-600 to-amber-800 rounded-2xl p-4 shadow-lg">
                  <span className="text-4xl">🏝️</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-3xl font-bold text-gray-900 mb-3">3 Island Tours + Secret Beach</h3>
                  <div className="bg-gradient-to-r from-amber-700 to-amber-900 text-white px-6 py-3 rounded-xl inline-block mb-4 shadow-lg">
                    <p className="text-2xl font-bold">₱1,500 <span className="text-sm font-normal">per head/joiners</span></p>
                  </div>
                  <div className="space-y-3 text-gray-800">
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-stone-100">
                      <p className="flex items-start gap-3">
                        <span className="text-amber-600 text-xl">🎯</span>
                        <span><strong className="text-amber-700">Destinations:</strong> Daku, Guyam, Naked + Secret Beach and Coral Garden</span>
                      </p>
                    </div>
                    <p className="flex items-start gap-3 pl-2">
                      <span className="text-amber-600 text-lg">✓</span>
                      <span>Boat with Licensed Tour Guide</span>
                    </p>
                    <p className="flex items-start gap-3 pl-2">
                      <span className="text-amber-600 text-lg">✓</span>
                      <span>Docking fees</span>
                    </p>
                    <p className="flex items-start gap-3 pl-2">
                      <span className="text-amber-600 text-lg">✓</span>
                      <span>All entrance fees, environmental fees, permits</span>
                    </p>
                    <p className="flex items-start gap-3 pl-2">
                      <span className="text-amber-600 text-lg">✓</span>
                      <span>Boodle Lunch Set up</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sohoton Cove */}
            <div className="bg-gradient-to-br from-white to-stone-50 rounded-2xl shadow-xl p-8 border-2 border-stone-200 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-stone-600 to-stone-800 rounded-2xl p-4 shadow-lg">
                  <span className="text-4xl">🌊</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-3xl font-bold text-gray-900 mb-3">Sohoton Cove Bucas Grande Adventure</h3>
                  <div className="bg-gradient-to-r from-stone-700 to-stone-900 text-white px-6 py-3 rounded-xl inline-block mb-4 shadow-lg">
                    <p className="text-2xl font-bold">₱2,800 <span className="text-sm font-normal">per head/joiners</span></p>
                  </div>
                  <div className="space-y-3 text-gray-800">
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-stone-100">
                      <p className="flex items-start gap-3">
                        <span className="text-stone-600 text-xl">🎯</span>
                        <span><strong className="text-stone-700">Destinations:</strong> Sohoton Cove, Bucas Grande, Haguekan Cove, Magcucuob Cove, Jellyfish Sanctuary, Cliff Diving, Viewing Lagoon, Tiktikan Lagoon and Bolitas Cave</span>
                      </p>
                    </div>
                    <p className="flex items-start gap-3 pl-2">
                      <span className="text-stone-600 text-lg">✓</span>
                      <span>Tour Guide</span>
                    </p>
                    <p className="flex items-start gap-3 pl-2">
                      <span className="text-stone-600 text-lg">✓</span>
                      <span>Permits and Environmental Fees</span>
                    </p>
                    <p className="flex items-start gap-3 pl-2">
                      <span className="text-stone-600 text-lg">✓</span>
                      <span>Entrances</span>
                    </p>
                    <p className="flex items-start gap-3 pl-2">
                      <span className="text-stone-600 text-lg">✓</span>
                      <span>Lunch</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* South Land Tour */}
            <div className="bg-gradient-to-br from-white to-amber-50 rounded-2xl shadow-xl p-8 border-2 border-stone-200 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-amber-800 to-stone-900 rounded-2xl p-4 shadow-lg">
                  <span className="text-4xl">🚐</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-3xl font-bold text-gray-900 mb-3">South Land Tour</h3>
                  <div className="bg-gradient-to-r from-amber-800 to-stone-900 text-white px-6 py-3 rounded-xl inline-block mb-4 shadow-lg">
                    <p className="text-2xl font-bold">₱1,900 <span className="text-sm font-normal">per head</span></p>
                  </div>
                  <div className="space-y-3 text-gray-800">
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-stone-100">
                      <p className="flex items-start gap-3">
                        <span className="text-amber-700 text-xl">🎯</span>
                        <span><strong className="text-amber-800">Destinations:</strong> Maasin River, Magpupungko Rock Formation, Coconut Road, Coconut View, Sugba Lagoon</span>
                      </p>
                    </div>
                    <p className="flex items-start gap-3 pl-2">
                      <span className="text-amber-700 text-lg">✓</span>
                      <span>Tour Guide</span>
                    </p>
                    <p className="flex items-start gap-3 pl-2">
                      <span className="text-amber-700 text-lg">✓</span>
                      <span>Van Transfers</span>
                    </p>
                    <p className="flex items-start gap-3 pl-2">
                      <span className="text-amber-700 text-lg">✓</span>
                      <span>Permits and Environmental Fees</span>
                    </p>
                    <p className="flex items-start gap-3 pl-2">
                      <span className="text-amber-700 text-lg">✓</span>
                      <span>Entrances</span>
                    </p>
                    <p className="flex items-start gap-3 pl-2">
                      <span className="text-amber-700 text-lg">✓</span>
                      <span>Lunch</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Testimonials / Reviews Section */}
        <div className="mt-12 mb-8">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent mb-3">
              Guest Reviews & Testimonials
            </h2>
            <p className="text-gray-700 text-lg">See what our guests are saying about their experience at Amigo Inn ⭐</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Facebook Review Embed */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border-2 border-stone-200 p-6 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-full p-3 shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Facebook Review</h3>
                  <p className="text-sm text-gray-600">From our Facebook page</p>
                </div>
              </div>
              
              <div className="relative bg-gradient-to-br from-blue-50 to-stone-50 rounded-xl p-4">
                <iframe 
                  src="https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2Famigoinnsiargao%2Fposts%2Fpfbid07b7dqND9spxAvMNToVMzf3Z85NRddBdfgxSKopnVkqGHXB9w711DutgHEoejKHq3l&show_text=true&width=500" 
                  width="100%" 
                  height="449" 
                  style={{border: 'none', overflow: 'hidden'}}
                  scrolling="no" 
                  frameBorder="0" 
                  allowFullScreen={true}
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  className="rounded-lg"
                ></iframe>
              </div>
            </div>

            {/* Additional Info / Call to Action */}
            <div className="space-y-6">
              {/* Trust Badges */}
              <div className="bg-gradient-to-br from-amber-50 to-stone-50 rounded-2xl shadow-xl p-8 border-2 border-stone-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Why Choose Amigo Inn?</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-r from-amber-600 to-amber-800 rounded-full p-3 shadow-lg flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-gray-900 mb-1">Prime Location</h4>
                      <p className="text-gray-700">Perfect location in Siargao with easy access to beaches and attractions</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-r from-amber-600 to-amber-800 rounded-full p-3 shadow-lg flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-gray-900 mb-1">Comfortable Rooms</h4>
                      <p className="text-gray-700">Clean, spacious rooms with modern amenities for your comfort</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-r from-amber-600 to-amber-800 rounded-full p-3 shadow-lg flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-gray-900 mb-1">Friendly Service</h4>
                      <p className="text-gray-700">Warm hospitality and helpful staff ready to assist you</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-r from-amber-600 to-amber-800 rounded-full p-3 shadow-lg flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-gray-900 mb-1">Great Value</h4>
                      <p className="text-gray-700">Affordable rates with excellent quality and service</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Media Links */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border-2 border-stone-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Connect With Us</h3>
                <div className="space-y-3">
                  <a 
                    href="https://www.facebook.com/amigoinnsiargao" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl hover:shadow-md hover:scale-105 transition-all duration-300"
                  >
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <div>
                      <p className="font-semibold text-gray-900">Follow us on Facebook</p>
                      <p className="text-sm text-gray-600">@amigoinnsiargao</p>
                    </div>
                  </a>

                  <a 
                    href="https://www.instagram.com/amigoinnsiargao/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gradient-to-r from-pink-50 to-purple-100 rounded-xl hover:shadow-md hover:scale-105 transition-all duration-300"
                  >
                    <svg className="w-6 h-6 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    <div>
                      <p className="font-semibold text-gray-900">Follow us on Instagram</p>
                      <p className="text-sm text-gray-600">@amigoinnsiargao</p>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
