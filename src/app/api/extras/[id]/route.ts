import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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

    const extra = await prisma.extra.update({
      where: { id: BigInt(id) },
      data: {
        name,
        description: description || null,
        price: Number(price),
        isPackage: is_package || false,
        includedNights: is_package ? included_nights : null,
      },
    });

    // Serialize BigInt to string
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
    console.error('Error updating extra:', error);
    return NextResponse.json({ error: "Failed to update extra" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Soft delete - update deletedAt instead of actual delete
    await prisma.extra.update({
      where: { id: BigInt(id) },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting extra:', error);
    return NextResponse.json({ error: "Failed to delete extra" }, { status: 500 });
  }
}

