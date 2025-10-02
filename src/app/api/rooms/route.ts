import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Room, CreateRoomRequest } from "@/types";

// GET /api/rooms
export async function GET(req: NextRequest) {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        roomType: true, // include room type info
      },
      orderBy: { roomNumber: "asc" },
    });
    
    // Convert BigInt to string for JSON serialization
    const serializedRooms: Room[] = rooms.map((room: any) => ({
      id: room.id.toString(),
      room_number: room.roomNumber,
      is_available: room.isAvailable,
      room_type_id: room.roomTypeId.toString(),
      type: {
        id: room.roomType?.id.toString(),
        name: room.roomType?.name,
        description: room.roomType?.description,
        base_price: Number(room.roomType?.basePrice)
      }
    }));
    
    return NextResponse.json(serializedRooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    return NextResponse.json({ 
      error: "Failed to fetch rooms", 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

// POST /api/rooms
export async function POST(req: NextRequest) {
  try {
    const { room_number, room_type_id }: CreateRoomRequest = await req.json();

    if (!room_number || !room_type_id) {
      return NextResponse.json({ error: "Missing room_number or room_type_id" }, { status: 400 });
    }

    const room = await prisma.room.create({
      data: { roomNumber: room_number, roomTypeId: BigInt(room_type_id) },
      include: { roomType: true },
    });

    // Convert BigInt to string for JSON serialization
    const serializedRoom = {
      ...room,
      id: room.id.toString(),
      room_type_id: room.roomTypeId.toString(),
      type: {
        ...room.roomType,
        id: room.roomType.id.toString(),
        base_price: Number(room.roomType.basePrice)
      }
    };

    return NextResponse.json(serializedRoom);
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
