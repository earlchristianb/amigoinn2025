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
          // Try to get the response text for debugging
          try {
            const responseClone = res.clone();
            const responseText = await responseClone.text();
            console.error('Response text:', responseText);
            setAvailabilityError(`Invalid JSON response. Server returned: ${responseText.substring(0, 100)}...`);
          } catch (textError) {
            console.error('Could not read response text:', textError);
            setAvailabilityError('Invalid response format from server');
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
        <Image
                src="/amigo-logo.jpg"
                alt="Amigo Inn Siargao"
                width={60}
                height={60}
                className="rounded-full shadow-md"
          priority
        />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Amigo Inn</h1>
                <p className="text-gray-600 mt-1">Check our room availability</p>
              </div>
            </div>
            <a
              href="/login"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Admin Login
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Room Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Room:
          </label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
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

        {/* Legend */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Room Status Legend</h3>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-500 rounded text-white text-xs flex items-center justify-center font-bold">101</div>
              <span className="text-sm text-gray-700">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-500 rounded text-white text-xs flex items-center justify-center font-bold">102</div>
              <span className="text-sm text-gray-700">Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-300 rounded text-gray-600 text-xs flex items-center justify-center font-bold">103</div>
              <span className="text-sm text-gray-700">Unavailable</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Each date shows all room numbers (100-208) with their current status
          </p>
        </div>

        {/* Error Display */}
        {availabilityError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Unable to load room availability</h3>
                <div className="mt-2 text-sm text-red-700">{availabilityError}</div>
                <div className="mt-4">
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

                 {/* Calendar */}
                <div className="bg-white rounded-lg shadow-sm border p-6 relative">
                  {/* Loading Overlay */}
                  {loadingBookings && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="text-gray-600 font-medium">Loading availability...</p>
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
      </main>

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
    </div>
  );
}
