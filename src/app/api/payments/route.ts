import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { bookingId, type, amount } = await req.json();

  if (!bookingId || !type) {
    return NextResponse.json({ error: "Missing bookingId or type" }, { status: 400 });
  }

  // Fetch booking
  const booking = await prisma.booking.findUnique({
    where: { id: BigInt(bookingId) },
    include: { payments: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  let paymentAmount = 0;

  if (type === "full") {
    // Remaining amount = total_price - total_paid - discount
    const totalPaid = booking.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    paymentAmount = Number(booking.totalPrice) - totalPaid - Number(booking.discount || 0);
    if (paymentAmount <= 0) paymentAmount = 0;
  } else if (type === "partial") {
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid partial amount" }, { status: 400 });
    }
    
    // Check if partial payment exceeds remaining balance
    const totalPaid = booking.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const remainingBalance = Number(booking.totalPrice) - totalPaid - Number(booking.discount || 0);
    
    if (amount > remainingBalance) {
      return NextResponse.json({ 
        error: `Payment amount (₱${amount}) exceeds remaining balance (₱${remainingBalance})` 
      }, { status: 400 });
    }
    
    paymentAmount = amount;
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  // Insert payment
  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: Number(paymentAmount),
      method: "cash",
    },
  });

  return NextResponse.json({ 
    success: true, 
    paid: Number(payment.amount),
    payment: {
      id: payment.id.toString(),
      booking_id: payment.bookingId.toString(),
      amount: Number(payment.amount),
      method: payment.method,
      created_at: payment.createdAt.toISOString(),
    }
  });
}
