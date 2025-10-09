import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { room_number, room_type_id } = await req.json();

  if (!room_number || !room_type_id) {
    return NextResponse.json({ error: "Missing room_number or room_type_id" }, { status: 400 });
  }

  const room = await prisma.room.update({
    where: { id: BigInt(id) },
    data: { roomNumber: room_number, roomTypeId: BigInt(room_type_id) },
    include: { roomType: true },
  });

  // Serialize BigInt to string
  const serializedRoom = {
    id: room.id.toString(),
    room_number: room.roomNumber,
    room_type_id: room.roomTypeId.toString(),
    is_available: room.isAvailable,
    type: room.roomType ? {
      id: room.roomType.id.toString(),
      name: room.roomType.name,
      description: room.roomType.description,
      base_price: Number(room.roomType.basePrice)
    } : null,
    created_at: room.createdAt.toISOString(),
    updated_at: room.updatedAt.toISOString(),
  };

  return NextResponse.json(serializedRoom);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Soft delete - update deletedAt instead of actual delete
  await prisma.room.update({
    where: { id: BigInt(id) },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
