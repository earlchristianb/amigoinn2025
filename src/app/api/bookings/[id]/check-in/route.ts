import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { proofImageUrl } = await req.json();

    if (!proofImageUrl) {
      return NextResponse.json({ error: "Proof image URL is required" }, { status: 400 });
    }

    // Get the booking with its rooms
    const booking = await prisma.booking.findUnique({
      where: { id: BigInt(id) },
      include: {
        bookingRooms: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check if booking is already checked in
    if (booking.status === 'checked_in') {
      return NextResponse.json({ error: "Booking is already checked in" }, { status: 400 });
    }

    // Validate that today is the check-in date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if any room's check-in date is today
    const canCheckIn = booking.bookingRooms.some(room => {
      const checkInDate = new Date(room.checkInDate);
      checkInDate.setHours(0, 0, 0, 0);
      return checkInDate.getTime() === today.getTime();
    });

    if (!canCheckIn) {
      const earliestCheckIn = booking.bookingRooms.reduce((earliest, room) => {
        return !earliest || room.checkInDate < earliest ? room.checkInDate : earliest;
      }, null as Date | null);

      return NextResponse.json({ 
        error: "Check-in is only allowed on the check-in date",
        checkInDate: earliestCheckIn?.toISOString().split('T')[0]
      }, { status: 400 });
    }

    // Update booking with proof image and status
    const updatedBooking = await prisma.booking.update({
      where: { id: BigInt(id) },
      data: {
        proofImageUrl,
        status: 'checked_in',
      },
      include: {
        guest: true,
        bookingRooms: {
          include: {
            room: {
              include: {
                roomType: true,
              },
            },
          },
        },
        payments: true,
        bookingExtras: true,
      },
    });

    // Serialize the response
    const serializedBooking = {
      id: updatedBooking.id.toString(),
      guest_id: updatedBooking.guestId.toString(),
      total_price: Number(updatedBooking.totalPrice),
      discount: Number(updatedBooking.discount),
      status: updatedBooking.status,
      proof_image_url: updatedBooking.proofImageUrl,
      created_at: updatedBooking.createdAt.toISOString(),
      updated_at: updatedBooking.updatedAt.toISOString(),
      guest: {
        id: updatedBooking.guest.id.toString(),
        name: updatedBooking.guest.name,
        email: updatedBooking.guest.email,
        phone: updatedBooking.guest.phone,
      },
      booking_rooms: updatedBooking.bookingRooms.map((br: any) => ({
        id: br.id.toString(),
        booking_id: br.bookingId.toString(),
        room_id: br.roomId.toString(),
        check_in_date: br.checkInDate.toISOString(),
        check_out_date: br.checkOutDate.toISOString(),
        price: Number(br.price),
        discount: Number(br.discount),
        room: {
          id: br.room.id.toString(),
          room_number: br.room.roomNumber,
          type: {
            id: br.room.roomType.id.toString(),
            name: br.room.roomType.name,
            base_price: Number(br.room.roomType.basePrice),
          },
        },
      })),
      payments: updatedBooking.payments.map((p: any) => ({
        id: p.id.toString(),
        booking_id: p.bookingId.toString(),
        amount: Number(p.amount),
        method: p.method,
        created_at: p.createdAt.toISOString(),
      })),
      booking_extras: updatedBooking.bookingExtras.map((e: any) => ({
        id: e.id.toString(),
        booking_id: e.bookingId.toString(),
        extra_id: e.extraId.toString(),
        quantity: e.quantity,
      })),
    };

    return NextResponse.json(serializedBooking);
  } catch (error) {
    console.error('Error checking in booking:', error);
    return NextResponse.json({ 
      error: "Failed to check in booking",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
