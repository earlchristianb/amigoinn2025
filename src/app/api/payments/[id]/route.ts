import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { amount } = await req.json();

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
  }

  try {
    const payment = await prisma.payment.update({
      where: { id: BigInt(id) },
      data: {
        amount: Number(amount),
      },
    });

    // Serialize BigInt to string
    const serializedPayment = {
      id: payment.id.toString(),
      booking_id: payment.bookingId.toString(),
      amount: payment.amount,
      method: payment.method,
      created_at: payment.createdAt.toISOString(),
    };

    return NextResponse.json(serializedPayment);
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // Soft delete - update deletedAt instead of actual delete
    await prisma.payment.update({
      where: { id: BigInt(id) },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}

