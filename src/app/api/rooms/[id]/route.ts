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

  return NextResponse.json(room);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await prisma.room.delete({
    where: { id: BigInt(id) },
  });

  return NextResponse.json({ success: true });
}
