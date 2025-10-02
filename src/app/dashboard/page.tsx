"use client";

import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { Dialog } from "@headlessui/react";
import { Room, BookingEvent, Booking } from "@/types";
import AdminNavigation from "@/components/AdminNavigation";

export default function DashboardPage() {
    const { user, isLoaded } = useUser();
    const { signOut } = useClerk();
    const [events, setEvents] = useState<BookingEvent[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [checkingAdmin, setCheckingAdmin] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date()); // Track current month view

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<BookingEvent | null>(null);

    // Check admin status
    useEffect(() => {
        const checkAdminStatus = async () => {
            if (user?.emailAddresses?.[0]?.emailAddress) {
                try {
                    const response = await fetch('/api/auth/check-admin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: user.emailAddresses[0].emailAddress })
                    });
                    const data = await response.json();
                    setIsAdmin(data.isAdmin);
                } catch (error) {
                    console.error('Error checking admin status:', error);
                    setIsAdmin(false);
                }
            } else {
                setIsAdmin(false);
            }
            setCheckingAdmin(false);
        };

        if (isLoaded && user) {
            checkAdminStatus();
        } else if (isLoaded && !user) {
            setCheckingAdmin(false);
        }
    }, [isLoaded, user]);

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

    // Conditional rendering after all hooks
    if (!isLoaded || checkingAdmin) return <p>Loading...</p>;
    if (!user) return <button onClick={() => window.location.href = '/login'}>Go to Login</button>;
    if (isAdmin === false) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="bg-white shadow-md rounded p-8 w-96 text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-4">Access Denied</h2>
                    <p className="text-gray-600 mb-4">You are not authorized to access this application.</p>
                    <button 
                        onClick={() => signOut()}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminNavigation currentPage="dashboard" />

            {/* Main Content */}
            <main className="p-6">
                {/* Page Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">📅 Bookings Dashboard</h2>
                    <p className="text-gray-700 mt-1">Manage your hotel bookings and room availability</p>
                </div>

            {/* Room Filter */}
            <div className="mb-4">
                <label className="mr-2 font-semibold text-gray-800">Filter by Room:</label>
                <select
                    className="border border-gray-300 rounded p-2 bg-white text-gray-800"
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

            {/* Room Status Legend */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Room Status Legend</h3>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="bg-green-500 rounded text-white text-xs font-bold px-1 py-0.5">101</div>
                        <span className="text-sm text-gray-700">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="bg-red-500 rounded text-white text-xs font-bold px-1 py-0.5">102</div>
                        <span className="text-sm text-gray-700">Booked</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="bg-gray-300 rounded text-gray-600 text-xs font-bold px-1 py-0.5">103</div>
                        <span className="text-sm text-gray-700">Unavailable</span>
                    </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                    Each date shows all room numbers (101-208) as small badges with their current status
                </p>
            </div>

            {/* FullCalendar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
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
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,dayGridWeek'
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
                                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                        <p className="text-sm text-blue-700">
                                            <strong>Booking ID:</strong> {selectedBooking.extendedProps.bookingId}
                                        </p>
                                        <div className="mt-2 flex gap-2">
                                            <button
                                                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
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
    );
}
