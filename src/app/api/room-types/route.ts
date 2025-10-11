import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RoomType, CreateRoomTypeRequest } from "@/types";

// GET /api/room-types
export async function GET() {
  try {
    const roomTypes = await prisma.roomType.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    
    // Convert BigInt to string for JSON serialization
    const serializedRoomTypes: RoomType[] = roomTypes.map((roomType) => ({
      id: roomType.id.toString(),
      name: roomType.name,
      description: roomType.description,
      base_price: Number(roomType.basePrice),
    }));
    
    return NextResponse.json(serializedRoomTypes);
  } catch (error) {
    console.error('Error fetching room types:', error);
    return NextResponse.json({ error: "Failed to fetch room types" }, { status: 500 });
  }
}

// POST /api/room-types
export async function POST(req: NextRequest) {
  try {
    const { name, description, base_price }: CreateRoomTypeRequest = await req.json();

    if (!name || base_price === undefined) {
      return NextResponse.json({ error: "Name and base_price are required" }, { status: 400 });
    }

    const roomType = await prisma.roomType.create({
      data: {
        name,
        description: description || null,
        basePrice: Number(base_price),
      },
    });

    // Convert BigInt to string for JSON serialization
    const serializedRoomType: RoomType = {
      id: roomType.id.toString(),
      name: roomType.name,
      description: roomType.description,
      base_price: Number(roomType.basePrice),
    };

    return NextResponse.json(serializedRoomType);
  } catch (error) {
    console.error('Error creating room type:', error);
    return NextResponse.json({ error: "Failed to create room type" }, { status: 500 });
  }
}
