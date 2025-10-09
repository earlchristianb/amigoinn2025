import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, email, role } = await req.json();

    if (!name || !email || !role) {
      return NextResponse.json({ error: "Name, email, and role are required" }, { status: 400 });
    }

    if (!['admin', 'assistant'].includes(role)) {
      return NextResponse.json({ error: "Role must be 'admin' or 'assistant'" }, { status: 400 });
    }

    // Check if email is taken by another user
    const existingUser = await prisma.profile.findFirst({
      where: { 
        email,
        id: { not: BigInt(id) }
      },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email is already taken by another user" }, { status: 400 });
    }

    const user = await prisma.profile.update({
      where: { id: BigInt(id) },
      data: {
        name,
        email,
        role,
      },
    });

    const serializedUser = {
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    };

    return NextResponse.json(serializedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Soft delete
    await prisma.profile.update({
      where: { id: BigInt(id) },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

