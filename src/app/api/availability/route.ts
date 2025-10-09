import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BookingRoom, Room, RoomAvailability } from "@/types";

export async function GET(req: Request) {
  console.log('[Availability API] Request received');
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    
  console.log('[Availability API] Starting fetch...');
  console.log('[Availability API] Date range:', startDate, 'to', endDate);
  console.log('[Availability API] Parsed start date:', startDate ? new Date(startDate) : 'none');
  console.log('[Availability API] Parsed end date:', endDate ? new Date(endDate) : 'none');
    
    // Build date filter for booking rooms
    const dateFilter = startDate && endDate ? {
      OR: [
        // Check-in is within range
        {
          checkInDate: {
            gte: new Date(startDate),
            lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
          }
        },
        // Check-out is within range
        {
          checkOutDate: {
            gte: new Date(startDate),
            lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
          }
        },
        // Booking spans the entire range
        {
          AND: [
            { checkInDate: { lte: new Date(startDate) } },
            { checkOutDate: { gte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) } }
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
      where: { deletedAt: null },
      include: {
        roomType: true,
        bookingRooms: {
          where: { ...dateFilter, deletedAt: null },
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
    const availabilityData: RoomAvailability[] = rooms.map((room:any) => ({
      id: room.id.toString(),
      room_number: room.roomNumber,
      type: room.roomType?.name || 'Unknown', 
      base_price: Number(room.roomType?.basePrice || 0),
      is_available: room.isAvailable,
      bookings: room.bookingRooms?.map((bookingRoom:any) => ({
        check_in: bookingRoom.checkInDate.toISOString(),
        check_out: bookingRoom.checkOutDate.toISOString(),
        guest_name: bookingRoom.booking?.guest?.name || 'Unknown'
      })) || []
    }));

    console.log('Availability data formatted:', availabilityData);
    return NextResponse.json(availabilityData);
  } catch (error) {
    console.error('Error fetching availability:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('Environment check:', {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
      prismaClient: !!prisma
    });
    
    return NextResponse.json({ 
      error: "Failed to fetch availability", 
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    }, { status: 500 });
  }
}
