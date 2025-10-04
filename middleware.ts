import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define protected routes that require admin access
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/bookings(.*)',
  '/guests(.*)',
  '/rooms(.*)',
  '/room-types(.*)',
  '/reports(.*)',
  '/api/bookings(.*)',
  '/api/guests(.*)',
  '/api/rooms(.*)',
  '/api/room-types(.*)',
  '/api/payments(.*)',
  // Note: /api/availability is NOT protected - it's used by the public homepage
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  
  // For protected routes, check if user is authenticated
  if (isProtectedRoute(req)) {
    // If not authenticated, redirect to login
    if (!userId) {
      const loginUrl = new URL('/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
