"use client";

import { useEffect, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { Dialog } from "@headlessui/react";
import { Room, BookingEvent, Booking } from "@/types";
import AdminNavigation from "@/components/AdminNavigation";
import AdminAuthGuard from "@/components/AdminAuthGuard";

export default function DashboardPage() {
    const { signOut } = useClerk();
    const [events, setEvents] = useState<BookingEvent[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date()); // Track current month view
    const [loadingBookings, setLoadingBookings] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<BookingEvent | null>(null);


    // Fetch rooms
    useEffect(() => {
        async function fetchRooms() {
            try {
                const res = await fetch("/api/rooms");
                if (!res.ok) {
                    console.error('Rooms API request failed with status:', res.status);
                    setRooms([]);
                    return;
                }
                const data = await res.json();
                console.log('Rooms API response:', data);
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
        }
        fetchRooms();
    }, []);

    // Fetch bookings and create room availability events
    useEffect(() => {
        async function fetchBookings() {
            setLoadingBookings(true);
            try {
                // Get first day of selected month
                const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                
                // Get last day of selected month
                const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                
                // Format dates for API query (YYYY-MM-DD) - avoid timezone issues
                const startDate = `${firstDayOfMonth.getFullYear()}-${String(firstDayOfMonth.getMonth() + 1).padStart(2, '0')}-${String(firstDayOfMonth.getDate()).padStart(2, '0')}`;
                const endDate = `${lastDayOfMonth.getFullYear()}-${String(lastDayOfMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDayOfMonth.getDate()).padStart(2, '0')}`;
                
                console.log('Dashboard fetching bookings for date range:', startDate, 'to', endDate);
                console.log('First day of month:', firstDayOfMonth);
                console.log('Last day of month:', lastDayOfMonth);
                
                // Build URL with date range filter
                let url = `/api/bookings?startDate=${startDate}&endDate=${endDate}`;
                if (selectedRoom) {
                    url += `&roomId=${selectedRoom}`;
                }
                
                const res = await fetch(url);
                
                if (!res.ok) {
                    console.error('API request failed with status:', res.status);
                    setEvents([]);
                    return;
                }
                
                const bookingsData = await res.json();

                if (!Array.isArray(bookingsData)) {
                    console.error('API returned non-array data:', bookingsData);
                    setEvents([]);
                    return;
                }

                // Create room availability events for each day
                const events: BookingEvent[] = [];

                // Generate events for each day of the current month
                for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    
                    // Filter rooms if selectedRoom is set
                    const roomsToShow = selectedRoom 
                        ? rooms.filter(r => r.id === selectedRoom)
                        : rooms;

                    roomsToShow.forEach(room => {
                        // Find if this room is booked on this date
                        const booking = bookingsData.find((b: Booking) => 
                            b.booking_rooms.some(br => {
                                const checkIn = new Date(br.check_in_date);
                                const checkOut = new Date(br.check_out_date);
                                return br.room.room_number === room.room_number && 
                                       date >= checkIn && date < checkOut;
                            })
                        );

                        let backgroundColor = '#10b981'; // Green for available
                        let textColor = '#ffffff';
                        let status: 'occupied' | 'available' | 'unavailable' = 'available';
                        let guestName = '';
                        let bookingId = '';

                        if (booking) {
                            backgroundColor = '#ef4444'; // Red - Booked
                            status = 'occupied';
                            guestName = booking.guest.name;
                            bookingId = booking.id;
                        } else if (!room.is_available) {
                            backgroundColor = '#e5e7eb'; // Gray for unavailable
                            textColor = '#6b7280';
                            status = 'unavailable';
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
                                roomType: room.type?.name || 'Unknown',
                                price: room.type?.base_price || 0,
                                discount: 0,
                                payments: [],
                                status,
                                guestName,
                                bookingId,
                            }
                        });
                    });
                }

                console.log('All room availability events created:', events);
                setEvents(events);
            } catch (error) {
                console.error('Error fetching bookings:', error);
                setEvents([]);
            } finally {
                setLoadingBookings(false);
            }
        }
        fetchBookings();
    }, [selectedRoom, rooms, currentMonth]);

    // Handle event click
    const handleEventClick = (info: any) => {
        console.log('FullCalendar event click info:', info);
        console.log('Event object:', info.event);
        console.log('Event title:', info.event.title);
        console.log('Event start:', info.event.start);
        console.log('Event end:', info.event.end);
        console.log('Event extendedProps:', info.event.extendedProps);

        const payments = info.event.extendedProps.payments || [];
        const totalPaid = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
        const remaining = info.event.extendedProps.price - totalPaid - (info.event.extendedProps.discount || 0);

        const bookingData = {
            ...info.event,
            extendedProps: {
                ...info.event.extendedProps,
                totalPaid,
                remaining,
            },
        };

        console.log('Selected booking data:', bookingData);
        console.log('Title:', bookingData.title);
        console.log('Extended props:', bookingData.extendedProps);

        setSelectedBooking(bookingData);
        setModalOpen(true);
    };

    const handleMarkPaid = async (bookingId: string) => {
        await fetch(`/api/payments`, {
            method: "POST",
            body: JSON.stringify({ bookingId, type: "full" }),
            headers: { "Content-Type": "application/json" },
        });
        setModalOpen(false);
        setSelectedBooking(null);
        setSelectedRoom(selectedRoom); // Refresh bookings
    };

    const handleMarkPartialPaid = async (bookingId: string) => {
        const amount = prompt("Enter partial payment amount (₱):");
        if (!amount) return;
        await fetch(`/api/payments`, {
            method: "POST",
            body: JSON.stringify({ bookingId, type: "partial", amount: Number(amount) }),
            headers: { "Content-Type": "application/json" },
        });
        setModalOpen(false);
        setSelectedBooking(null);
        setSelectedRoom(selectedRoom); // Refresh bookings
    };

    const handleLogout = async () => {
        await signOut({ redirectUrl: '/' });
    };


    return (
        <AdminAuthGuard>
            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50">
            <AdminNavigation currentPage="dashboard" />

            {/* Main Content */}
            <main className="p-6">
                {/* Page Header */}
                <div className="mb-8">
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent mb-3">📅 Bookings Dashboard</h2>
                    <p className="text-gray-700 text-lg">Manage your hotel bookings and room availability 🏨</p>
                </div>

            {/* Room Filter */}
            <div className="mb-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-stone-200">
                    <label className="block text-sm font-semibold text-gray-800 mb-3">
                        🔍 Filter by Room
                    </label>
                    <select
                        className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 bg-white focus:border-amber-700 focus:ring-2 focus:ring-amber-200 transition-all duration-300 font-medium text-gray-800"
                        value={selectedRoom ?? ""}
                        onChange={(e) => setSelectedRoom(e.target.value || null)}
                    >
                        <option value="">All Rooms</option>
                        {Array.isArray(rooms) && rooms.map((room) => (
                            <option key={room.id} value={room.id}>
                                {room.room_number} ({room.type?.name || 'Unknown'})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Room Status Legend */}
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
                            <span className="text-sm font-semibold text-gray-800">Booked</span>
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

            {/* FullCalendar */}
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
                            <p className="text-gray-900 font-semibold text-lg">Loading bookings...</p>
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
                    events={events}
                    height="80vh"
                    eventClick={handleEventClick}
                    datesSet={(dateInfo) => {
                        // Update currentMonth when user navigates to different month
                        // Use the view's currentStart which is the actual month being viewed
                        const viewDate = dateInfo.view.currentStart;
                        const newMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
                        
                        if (newMonth.getMonth() !== currentMonth.getMonth() || newMonth.getFullYear() !== currentMonth.getFullYear()) {
                            console.log('Dashboard month changed to:', newMonth.toISOString());
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
                            html: `<div class="rounded font-bold" style="background-color: ${bgColor}; color: ${textColor}; padding: 5px 8px; font-size: 11px; text-align: center; white-space: nowrap; line-height: 1.2;">
                                ${eventInfo.event.title}
                            </div>`
                        };
                    }}
                />
            </div>

            {/* Modal */}
            <Dialog open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
                <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="bg-white rounded-xl shadow-lg border border-gray-300 p-6 w-full max-w-md">
                        <Dialog.Title className="text-xl font-bold mb-4 text-gray-800">Room Details</Dialog.Title>
                        {selectedBooking && (
                            <div className="space-y-3">
                                <p className="text-gray-800"><strong className="text-gray-900">Room:</strong> {selectedBooking.extendedProps.roomNumber}</p>
                                <p className="text-gray-800"><strong className="text-gray-900">Room Type:</strong> {selectedBooking.extendedProps.roomType}</p>
                                <p className="text-gray-800"><strong className="text-gray-900">Date:</strong> {selectedBooking.start ? new Date(selectedBooking.start).toLocaleDateString() : 'N/A'}</p>
                                <p className="text-gray-800">
                                    <strong className="text-gray-900">Status:</strong>
                                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                                        selectedBooking.extendedProps.status === 'available' 
                                            ? 'bg-green-100 text-green-800' 
                                            : selectedBooking.extendedProps.status === 'occupied'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {selectedBooking.extendedProps.status === 'available' ? 'Available' : 
                                         selectedBooking.extendedProps.status === 'occupied' ? 'Booked' : 'Unavailable'}
                                    </span>
                                </p>
                                {selectedBooking.extendedProps.guestName && (
                                    <p className="text-gray-800"><strong className="text-gray-900">Guest:</strong> {selectedBooking.extendedProps.guestName}</p>
                                )}
                                {selectedBooking.extendedProps.status === 'occupied' && selectedBooking.extendedProps.bookingId && (
                                    <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                                        <p className="text-sm text-amber-700">
                                            <strong>Booking ID:</strong> {selectedBooking.extendedProps.bookingId}
                                        </p>
                                        <div className="mt-2 flex gap-2">
                                            <button
                                                className="px-3 py-1 bg-amber-700 text-white text-sm rounded hover:bg-amber-800"
                                                onClick={() => {
                                                    setModalOpen(false);
                                                    window.location.href = '/bookings';
                                                }}
                                            >
                                                View Booking
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-6 flex justify-end">
                            <button
                                className="px-4 py-2 text-white rounded font-medium"
                                style={{backgroundColor: '#8B4513'}}
                                onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#A0522D'}
                                onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#8B4513'}
                                onClick={() => setModalOpen(false)}
                            >
                                Close
                            </button>
                        </div>
                    </Dialog.Panel>
                </div>
            </Dialog>
            </main>
            </div>
        </AdminAuthGuard>
    );
}
