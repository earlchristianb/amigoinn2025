import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  console.log('[Test Availability API] Request received');
  
  try {
    // Simple test - just return basic info
    const testData = {
      message: "Test availability API is working",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      prismaClient: !!prisma
    };
    
    console.log('[Test Availability API] Returning test data:', testData);
    return NextResponse.json(testData);
    
  } catch (error) {
    console.error('[Test Availability API] Error:', error);
    
    return NextResponse.json({ 
      error: "Test API failed", 
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    }, { status: 500 });
  }
}
