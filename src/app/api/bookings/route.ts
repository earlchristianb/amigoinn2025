import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Booking, CreateBookingRequest } from "@/types";

// GET /api/bookings
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};

    // Filter by room if provided
    if (roomId) {
      whereClause.bookingRooms = {
        some: {
          roomId: BigInt(roomId)
        }
      };
    }

    // Filter by date range if provided
    // Get bookings where check-in or check-out falls within the range
    // OR bookings that span across the range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date
      
      if (!whereClause.bookingRooms) {
        whereClause.bookingRooms = { some: {} };
      } else if (!whereClause.bookingRooms.some) {
        whereClause.bookingRooms.some = {};
      }
      
      whereClause.bookingRooms.some.OR = [
        // Check-in is within range
        {
          checkInDate: {
            gte: start,
            lte: end
          }
        },
        // Check-out is within range
        {
          checkOutDate: {
            gte: start,
            lte: end
          }
        },
        // Booking spans the entire range
        {
          AND: [
            { checkInDate: { lte: start } },
            { checkOutDate: { gte: end } }
          ]
        }
      ];
    }

    const bookings = await prisma.booking.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : {},
      include: {
        guest: true,
        bookingRooms: {
          include: {
            room: { include: { roomType: true } }
          }
        },
        bookingExtras: true,
        payments: true,
      },
      orderBy: { createdAt: "asc" },
    });

    console.log('[Bookings API] Date range received:', startDate, 'to', endDate);
    console.log('[Bookings API] Parsed start date:', startDate ? new Date(startDate) : 'none');
    console.log('[Bookings API] Parsed end date:', endDate ? new Date(endDate) : 'none');
    console.log('Raw bookings from database:', bookings);
    console.log('Number of bookings found:', bookings.length);

    // Calculate remaining and serialize BigInt values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatted: Booking[] = bookings.map((b: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalPaid = b.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      const remaining = Number(b.totalPrice) - totalPaid - Number(b.discount || 0);
      
      return {
        id: b.id.toString(),
        guest_id: b.guestId.toString(),
        total_price: Number(b.totalPrice),
        discount: Number(b.discount || 0),
        created_at: b.createdAt.toISOString(),
        updated_at: b.updatedAt.toISOString(),
        guest: {
          id: b.guest.id.toString(),
          name: b.guest.name,
          email: b.guest.email,
          phone: b.guest.phone,
          created_at: b.guest.createdAt.toISOString(),
          updated_at: b.guest.updatedAt.toISOString(),
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        booking_rooms: b.bookingRooms.map((br: any) => ({
          id: br.id.toString(),
          booking_id: br.bookingId.toString(),
          room_id: br.roomId.toString(),
          check_in_date: br.checkInDate.toISOString(),
          check_out_date: br.checkOutDate.toISOString(),
          price: Number(br.price),
          discount: Number(br.discount || 0),
          created_at: br.createdAt.toISOString(),
          updated_at: br.updatedAt.toISOString(),
        room: {
            id: br.room.id.toString(),
            room_number: br.room.roomNumber,
            is_available: br.room.isAvailable,
            room_type_id: br.room.roomTypeId.toString(),
            type: {
              id: br.room.roomType.id.toString(),
              name: br.room.roomType.name,
              description: br.room.roomType.description,
             base_price: Number(br.room.roomType.basePrice),
          },
        },
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      booking_extras: b.bookingExtras?.map((ex: any) => ({
        id: ex.id.toString(),
        booking_id: ex.bookingId.toString(),
        label: ex.label,
        price: Number(ex.price),
        quantity: ex.quantity,
        created_at: ex.createdAt.toISOString(),
        updated_at: ex.updatedAt.toISOString(),
      })) || [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payments: b.payments.map((p: any) => ({
        id: p.id.toString(),
        booking_id: p.bookingId.toString(),
        amount: Number(p.amount),
        method: p.method,
        created_at: p.createdAt.toISOString(),
      })),
        total_paid: totalPaid,
        remaining: remaining < 0 ? 0 : remaining,
      };
    });

    console.log('Formatted bookings for API response:', formatted);
    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    return NextResponse.json({ 
      error: "Failed to fetch bookings", 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

// POST /api/bookings
export async function POST(req: NextRequest) {
  try {
    const { guestId, booking_rooms, booking_extras, total_price, discount }: CreateBookingRequest =
      await req.json();

    console.log('Received booking data:', { guestId, booking_rooms, total_price, discount });
    console.log('GuestId type:', typeof guestId, 'Value:', guestId);
    console.log('Booking rooms count:', booking_rooms.length);
    console.log('Total price type:', typeof total_price, 'Value:', total_price);

    if (!guestId || !booking_rooms || !Array.isArray(booking_rooms) || booking_rooms.length === 0) {
      console.log('Missing required fields:', { guestId, booking_rooms, total_price });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (total_price === undefined || total_price === null) {
      console.log('Total price is missing:', total_price);
      return NextResponse.json({ error: "Total price is required" }, { status: 400 });
    }

    // Validate each booking room
    for (const room of booking_rooms) {
      if (!room.roomId || !room.check_in_date || !room.check_out_date || !room.price) {
        return NextResponse.json({ error: "Missing required room fields" }, { status: 400 });
      }
    }

    try {

    // Validate and convert IDs to BigInt
    let guestIdBigInt: bigint;
    try {
      guestIdBigInt = BigInt(guestId);
    } catch (error) {
      console.error('Invalid guestId:', guestId);
      return NextResponse.json({ error: "Invalid guest ID" }, { status: 400 });
    }

    // Validate and convert room IDs
    const validatedRooms = booking_rooms.map(room => {
      let roomIdBigInt: bigint;
      try {
        roomIdBigInt = BigInt(room.roomId);
      } catch (error) {
        console.error('Invalid roomId:', room.roomId);
        throw new Error(`Invalid room ID: ${room.roomId}`);
      }

      // Validate dates
      const checkInDate = new Date(room.check_in_date);
      const checkOutDate = new Date(room.check_out_date);
      
      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        throw new Error(`Invalid date format for room ${room.roomId}`);
      }

      if (checkInDate >= checkOutDate) {
        throw new Error(`Check-out date must be after check-in date for room ${room.roomId}`);
      }

      return {
        roomId: roomIdBigInt,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        price: parseFloat(room.price),
        discount: parseFloat(room.discount || 0),
      };
    });

    console.log('Creating booking with validated data:', {
      guest_id: guestIdBigInt.toString(),
      total_price: Number(total_price),
      discount: Number(discount || 0),
      booking_rooms: validatedRooms.map(r => ({
        ...r,
        roomId: r.roomId.toString()
      }))
    });

    // Check for existing bookings that would conflict
    for (const room of validatedRooms) {
      const existingBookings = await prisma.bookingRoom.findMany({
        where: {
          roomId: room.roomId,
          OR: [
            // New booking starts during existing booking
            {
              AND: [
                { checkInDate: { lte: room.checkInDate } },
                { checkOutDate: { gt: room.checkInDate } }
              ]
            },
            // New booking ends during existing booking
            {
              AND: [
                { checkInDate: { lt: room.checkOutDate } },
                { checkOutDate: { gte: room.checkOutDate } }
              ]
            },
            // New booking completely contains existing booking
            {
              AND: [
                { checkInDate: { gte: room.checkInDate } },
                { checkOutDate: { lte: room.checkOutDate } }
              ]
            },
            // Existing booking completely contains new booking
            {
              AND: [
                { checkInDate: { lte: room.checkInDate } },
                { checkOutDate: { gte: room.checkOutDate } }
              ]
            }
          ]
        },
        include: {
          room: true,
          booking: {
            include: {
              guest: true
            }
          }
        }
      });

      if (existingBookings.length > 0) {
        const conflictDetails = existingBookings.map((eb:any) => 
          `Room ${eb.room.roomNumber} is already booked by ${eb.booking.guest.name} from ${eb.checkInDate.toLocaleDateString()} to ${eb.checkOutDate.toLocaleDateString()}`
        ).join('; ');
        
        throw new Error(`Booking conflict detected: ${conflictDetails}`);
      }
    }

    const booking = await prisma.booking.create({
      data: {
        guestId: guestIdBigInt,
        totalPrice: parseFloat(total_price),
        discount: parseFloat(discount || 0),
        bookingRooms: {
          create: validatedRooms
        },
        bookingExtras: booking_extras && booking_extras.length > 0 ? {
          create: booking_extras.map(extra => ({
            label: extra.label,
            price: Number(extra.price),
            quantity: extra.quantity || 1,
          }))
        } : undefined
      },
      include: {
        guest: true,
        bookingRooms: {
          include: {
            room: { include: { roomType: true } }
          }
        },
        bookingExtras: true,
        payments: true,
      },
    });

    console.log('Booking created successfully - ID:', booking.id.toString());

    // Serialize BigInt values
    const serializedBooking = {
      id: booking.id.toString(),
      guest_id: booking.guestId.toString(),
      total_price: Number(booking.totalPrice),
      discount: Number(booking.discount || 0),
      created_at: booking.createdAt.toISOString(),
      updated_at: booking.updatedAt.toISOString(),
      guest: {
        id: booking.guest.id.toString(),
        name: booking.guest.name,
        email: booking.guest.email,
        phone: booking.guest.phone,
        createdAt: booking.guest.createdAt.toISOString(),
        updatedAt: booking.guest.updatedAt.toISOString(),
      },
      booking_rooms: booking.bookingRooms.map((br: any) => ({
        id: br.id.toString(),
        booking_id: br.bookingId.toString(),
        room_id: br.roomId.toString(),
        check_in_date: br.checkInDate.toISOString(),
        check_out_date: br.checkOutDate.toISOString(),
        price: Number(br.price),
        discount: Number(br.discount || 0),
        created_at: br.createdAt.toISOString(),
        updated_at: br.updatedAt.toISOString(),
        room: {
          id: br.room.id.toString(),
          room_number: br.room.roomNumber,
          is_available: br.room.isAvailable,
          room_type_id: br.room.roomTypeId.toString(),
          type: {
            id: br.room.roomType.id.toString(),
            name: br.room.roomType.name,
            description: br.room.roomType.description,
            base_price: Number(br.room.roomType.basePrice),
          },
        },
      })),
      booking_extras: booking.bookingExtras?.map((ex: any) => ({
        id: ex.id.toString(),
        booking_id: ex.bookingId.toString(),
        label: ex.label,
        price: Number(ex.price),
        quantity: ex.quantity,
        created_at: ex.createdAt.toISOString(),
        updated_at: ex.updatedAt.toISOString(),
      })) || [],
      payments: booking.payments.map((p: any) => ({
        id: p.id.toString(),
        booking_id: p.bookingId.toString(),
        amount: Number(p.amount),
        method: p.method,
        created_at: p.createdAt.toISOString(),
      })),
      total_paid: 0,
      remaining: Number(booking.totalPrice),
    };

    return NextResponse.json(serializedBooking);
    } catch (validationError) {
      console.error('Validation error:', validationError);
      return NextResponse.json({ 
        error: "Validation failed", 
        details: validationError instanceof Error ? validationError.message : 'Unknown validation error' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
