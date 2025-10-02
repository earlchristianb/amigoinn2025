import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, email, phone } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const guest = await prisma.guest.update({
      where: { id: BigInt(id) },
      data: {
        name,
        email: email || null,
        phone: phone || null,
      },
    });

    // Serialize BigInt to string
    const serializedGuest = {
      id: guest.id.toString(),
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      created_at: guest.createdAt.toISOString(),
      updated_at: guest.updatedAt.toISOString(),
    };

    return NextResponse.json(serializedGuest);
  } catch (error) {
    console.error('Error updating guest:', error);
    return NextResponse.json({ error: "Failed to update guest" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await prisma.guest.delete({
      where: { id: BigInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting guest:', error);
    return NextResponse.json({ error: "Failed to delete guest" }, { status: 500 });
  }
}
