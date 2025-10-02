import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RoomType, RoomTypeFormData } from "@/types";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, description, base_price }: RoomTypeFormData = await req.json();

    if (!name || base_price === undefined) {
      return NextResponse.json({ error: "Name and base_price are required" }, { status: 400 });
    }

    const roomType = await prisma.roomType.update({
      where: { id: BigInt(id) },
      data: {
        name,
        description: description || null,
        basePrice: Number(base_price),
      },
    });

    // Convert BigInt to string for JSON serialization
    const serializedRoomType = {
      id: roomType.id.toString(),
      name: roomType.name,
      description: roomType.description,
      base_price: Number(roomType.basePrice),
      created_at: roomType.createdAt.toISOString(),
      updated_at: roomType.updatedAt.toISOString(),
    };

    return NextResponse.json(serializedRoomType);
  } catch (error) {
    console.error('Error updating room type:', error);
    return NextResponse.json({ error: "Failed to update room type" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await prisma.roomType.delete({
      where: { id: BigInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting room type:', error);
    return NextResponse.json({ error: "Failed to delete room type" }, { status: 500 });
  }
}
