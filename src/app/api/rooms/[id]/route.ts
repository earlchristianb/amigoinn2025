import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const { room_number, room_type_id } = await req.json();

  if (!room_number || !room_type_id) {
    return NextResponse.json({ error: "Missing room_number or room_type_id" }, { status: 400 });
  }

  const room = await prisma.room.update({
    where: { id: BigInt(id) },
    data: { room_number, room_type_id: BigInt(room_type_id) },
    include: { type: true },
  });

  return NextResponse.json(room);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  await prisma.room.delete({
    where: { id: BigInt(id) },
  });

  return NextResponse.json({ success: true });
}
