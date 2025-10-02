import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RoomAvailability } from "@/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    
    console.log('[Availability API] Starting fetch...');
    console.log('[Availability API] Date range:', startDate, 'to', endDate);
    
    // Build date filter for booking rooms
    const dateFilter: any = startDate && endDate ? {
      OR: [
        // Check-in is within range
        {
          checkInDate: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        // Check-out is within range
        {
          checkOutDate: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        // Booking spans the entire range
        {
          AND: [
            { checkInDate: { lte: new Date(startDate) } },
            { checkOutDate: { gte: new Date(endDate) } }
          ]
        }
      ]
    } : {
      checkOutDate: {
        gte: new Date() // Only get future bookings if no date range
      }
    };
    
    // Get all rooms with their types and booking rooms
    const rooms = await prisma.room.findMany({
      include: {
        roomType: true,
        bookingRooms: {
          where: dateFilter,
          select: {
            checkInDate: true,
            checkOutDate: true,
            booking: {
              select: {
                guest: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        roomNumber: 'asc'
      }
    });

    console.log('[Availability API] Rooms fetched:', rooms.length);

    // Format data for calendar display
    const availabilityData: RoomAvailability[] = rooms.map((room: any) => ({
      id: room.id.toString(),
      room_number: room.roomNumber,
      type: room.roomType?.name || 'Unknown', 
      base_price: Number(room.roomType?.basePrice || 0),
      is_available: room.isAvailable,
      bookings: room.bookingRooms?.map((bookingRoom: any) => ({
        check_in: bookingRoom.checkInDate.toISOString(),
        check_out: bookingRoom.checkOutDate.toISOString(),
        guest_name: bookingRoom.booking?.guest?.name || 'Unknown'
      })) || []
    }));

    console.log('Availability data formatted:', availabilityData);
    return NextResponse.json(availabilityData);
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json({ 
      error: "Failed to fetch availability", 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
