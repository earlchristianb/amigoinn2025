import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { guestId, booking_rooms, booking_extras, total_price, discount } = await req.json();

    console.log('PUT /api/bookings/[id] - Received data:', { id, guestId, booking_rooms, total_price, discount });

    if (!guestId || !booking_rooms || !Array.isArray(booking_rooms) || !total_price) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Allow empty room array (user removing all rooms)
    if (booking_rooms.length === 0) {
      console.log('Warning: Booking update with no rooms - this will remove all rooms from the booking');
    }

    // Validate each booking room
    for (const room of booking_rooms) {
      if (!room.roomId || !room.check_in_date || !room.check_out_date || !room.price) {
        return NextResponse.json({ error: "Missing required room fields" }, { status: 400 });
      }
    }

    // Validate dates and check for conflicts (including same guest overlapping bookings)
    const guestIdBigInt = BigInt(guestId);
    
    for (const room of booking_rooms) {
      const checkInDate = new Date(room.check_in_date);
      const checkOutDate = new Date(room.check_out_date);
      
      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        return NextResponse.json({ error: `Invalid date format for room ${room.roomId}` }, { status: 400 });
      }

      if (checkInDate >= checkOutDate) {
        return NextResponse.json({ error: `Check-out date must be after check-in date for room ${room.roomId}` }, { status: 400 });
      }

      // Check for existing bookings that would conflict (excluding current booking)
      const existingBookings = await prisma.bookingRoom.findMany({
        where: {
          roomId: BigInt(room.roomId),
          bookingId: { not: BigInt(id) }, // Exclude current booking
          OR: [
            // New booking starts during existing booking
            {
              AND: [
                { checkInDate: { lte: checkInDate } },
                { checkOutDate: { gt: checkInDate } }
              ]
            },
            // New booking ends during existing booking
            {
              AND: [
                { checkInDate: { lt: checkOutDate } },
                { checkOutDate: { gte: checkOutDate } }
              ]
            },
            // New booking completely contains existing booking
            {
              AND: [
                { checkInDate: { gte: checkInDate } },
                { checkOutDate: { lte: checkOutDate } }
              ]
            },
            // Existing booking completely contains new booking
            {
              AND: [
                { checkInDate: { lte: checkInDate } },
                { checkOutDate: { gte: checkOutDate } }
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

      // Check if the same guest is trying to book overlapping dates for the same room
      const sameGuestConflicts = existingBookings.filter(booking => 
        booking.booking.guestId === guestIdBigInt
      );

      if (sameGuestConflicts.length > 0) {
        const conflictingBooking = sameGuestConflicts[0];
        const roomNumber = conflictingBooking.room.roomNumber;
        const guestName = conflictingBooking.booking.guest.name;
        const existingCheckIn = conflictingBooking.checkInDate.toLocaleDateString();
        const existingCheckOut = conflictingBooking.checkOutDate.toLocaleDateString();
        const newCheckIn = checkInDate.toLocaleDateString();
        const newCheckOut = checkOutDate.toLocaleDateString();
        
        return NextResponse.json({ 
          error: `Guest ${guestName} already has another booking for Room ${roomNumber} that overlaps with the requested dates. Existing booking: ${existingCheckIn} to ${existingCheckOut}. Requested: ${newCheckIn} to ${newCheckOut}` 
        }, { status: 400 });
      }

      // Check for general conflicts with other guests
      if (existingBookings.length > 0) {
        const conflictDetails = existingBookings.map((eb: any) => 
          `Room ${eb.room.roomNumber} is already booked by ${eb.booking.guest.name} from ${eb.checkInDate.toLocaleDateString()} to ${eb.checkOutDate.toLocaleDateString()}`
        ).join('; ');
        
        return NextResponse.json({ 
          error: `Room booking conflicts detected: ${conflictDetails}` 
        }, { status: 400 });
      }
    }

    // Use transaction to update booking and its rooms
    const booking = await prisma.$transaction(async (tx: any) => {
    // Delete existing booking rooms and extras
    await tx.bookingRoom.deleteMany({
      where: { bookingId: BigInt(id) }
    });
    await tx.bookingExtra.deleteMany({
      where: { bookingId: BigInt(id) }
    });

    // Update booking
    const updatedBooking = await tx.booking.update({
      where: { id: BigInt(id) },
      data: {
        guestId: BigInt(guestId),
        totalPrice: Number(total_price),
        discount: Number(discount || 0),
      },
    });

    // Create new booking rooms (only if there are rooms)
    if (booking_rooms.length > 0) {
      await tx.bookingRoom.createMany({
        data: booking_rooms.map(room => ({
          bookingId: BigInt(id),
          roomId: BigInt(room.roomId),
          checkInDate: new Date(room.check_in_date),
          checkOutDate: new Date(room.check_out_date),
        price: Number(room.price),
        discount: Number(room.discount || 0),
        }))
      });
    }

    // Create new booking extras if provided
    if (booking_extras && booking_extras.length > 0) {
      await tx.bookingExtra.createMany({
        data: booking_extras.map((extra: any) => ({
          bookingId: BigInt(id),
          label: extra.label,
          price: Number(extra.price),
          quantity: extra.quantity || 1,
        }))
      });
    }

    // Return booking with all relations
    return await tx.booking.findUnique({
      where: { id: BigInt(id) },
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
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Serialize response
  const totalPaid = booking.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const remaining = Number(booking.totalPrice) - totalPaid - Number(booking.discount || 0);

  return NextResponse.json({
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
    total_paid: totalPaid,
    remaining: remaining < 0 ? 0 : remaining,
  });
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ 
      error: "Failed to update booking", 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.booking.delete({ where: { id: BigInt(id) } });
  return NextResponse.json({ success: true });
}
