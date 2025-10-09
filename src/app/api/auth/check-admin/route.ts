import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if email exists in profiles table
    const profile = await prisma.profile.findFirst({
      where: { 
        email,
      },
    });

    return NextResponse.json({
      isAdmin: !!profile,
      email,
      role: (profile as any)?.role || null,
      name: profile?.name || null
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json({ error: "Failed to check admin status" }, { status: 500 });
  }
}
