import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/users
export async function GET() {
  try {
    const users = await prisma.profile.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    const serializedUsers = users.map((user: any) => ({
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    }));

    return NextResponse.json(serializedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST /api/users
export async function POST(req: NextRequest) {
  try {
    const { name, email, role } = await req.json();

    if (!name || !email || !role) {
      return NextResponse.json({ error: "Name, email, and role are required" }, { status: 400 });
    }

    if (!['admin', 'assistant'].includes(role)) {
      return NextResponse.json({ error: "Role must be 'admin' or 'assistant'" }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await prisma.profile.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    const user = await prisma.profile.create({
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
    console.error('Error creating user:', error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

