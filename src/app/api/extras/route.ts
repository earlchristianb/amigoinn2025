import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/extras
export async function GET() {
  try {
    const extras = await prisma.extra.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    
    // Convert BigInt to string for JSON serialization
    const serializedExtras = extras.map((extra: any) => ({
      id: extra.id.toString(),
      name: extra.name,
      description: extra.description,
      price: Number(extra.price),
      is_package: extra.isPackage || false,
      included_nights: extra.includedNights || null,
      created_at: extra.createdAt.toISOString(),
      updated_at: extra.updatedAt.toISOString(),
    }));
    
    return NextResponse.json(serializedExtras);
  } catch (error) {
    console.error('Error fetching extras:', error);
    return NextResponse.json({ error: "Failed to fetch extras" }, { status: 500 });
  }
}

// POST /api/extras
export async function POST(req: NextRequest) {
  try {
    const { name, description, price, is_package, included_nights } = await req.json();

    if (!name || price === undefined || price === null) {
      return NextResponse.json({ error: "Name and price are required" }, { status: 400 });
    }

    if (price < 0) {
      return NextResponse.json({ error: "Price must be a positive number" }, { status: 400 });
    }

    if (is_package && (!included_nights || included_nights < 1)) {
      return NextResponse.json({ error: "Package must have at least 1 included night" }, { status: 400 });
    }

    const extra = await prisma.extra.create({
      data: {
        name,
        description: description || null,
        price: Number(price),
        isPackage: is_package || false,
        includedNights: is_package ? included_nights : null,
      },
    });

    // Convert BigInt to string for JSON serialization
    const serializedExtra = {
      id: extra.id.toString(),
      name: extra.name,
      description: extra.description,
      price: Number(extra.price),
      is_package: extra.isPackage,
      included_nights: extra.includedNights,
      created_at: extra.createdAt.toISOString(),
      updated_at: extra.updatedAt.toISOString(),
    };

    return NextResponse.json(serializedExtra);
  } catch (error) {
    console.error('Error creating extra:', error);
    return NextResponse.json({ error: "Failed to create extra" }, { status: 500 });
  }
}

