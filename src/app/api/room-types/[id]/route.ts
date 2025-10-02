import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RoomType, RoomTypeFormData } from "@/types";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { name, description, base_price }: RoomTypeFormData = await req.json();

    if (!name || base_price === undefined) {
      return NextResponse.json({ error: "Name and base_price are required" }, { status: 400 });
    }

    const roomType = await prisma.roomType.update({
      where: { id: BigInt(id) },
      data: {
        name,
        description: description || null,
        base_price: Number(base_price),
      },
    });

    // Convert BigInt to string for JSON serialization
    const serializedRoomType: RoomType = {
      ...roomType,
      id: roomType.id.toString(),
      base_price: Number(roomType.base_price),
    };

    return NextResponse.json(serializedRoomType);
  } catch (error) {
    console.error('Error updating room type:', error);
    return NextResponse.json({ error: "Failed to update room type" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    await prisma.roomType.delete({
      where: { id: BigInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting room type:', error);
    return NextResponse.json({ error: "Failed to delete room type" }, { status: 500 });
  }
}
