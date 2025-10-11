import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Guest, CreateGuestRequest } from "@/types";

// GET /api/guests
export async function GET() {
  try {
    const guests = await prisma.guest.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    
    // Convert BigInt to string for JSON serialization
    const serializedGuests = guests.map((guest: any) => ({
      id: guest.id.toString(),
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      created_at: guest.createdAt.toISOString(),
      updated_at: guest.updatedAt.toISOString(),
    }));
    
    return NextResponse.json(serializedGuests);
  } catch (error) {
    console.error('Error fetching guests:', error);
    return NextResponse.json({ error: "Failed to fetch guests" }, { status: 500 });
  }
}

// POST /api/guests
export async function POST(req: NextRequest) {
  try {
    const { name, email, phone }: CreateGuestRequest = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const guest = await prisma.guest.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
      },
    });

    // Convert BigInt to string for JSON serialization
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
    console.error('Error creating guest:', error);
    return NextResponse.json({ error: "Failed to create guest" }, { status: 500 });
  }
}
