import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/rooms(.*)",
  "/bookings(.*)",
  "/guests(.*)"
]);

const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/sign-up(.*)",
  "/",
  "/api/availability" // Allow public access to availability API
]);

export default clerkMiddleware(async (auth, req) => {
  const authObj = await auth();
  
  // If it's a protected route and user is not authenticated, they'll be redirected by Clerk automatically
  if (isProtectedRoute(req) && !authObj.userId) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect_url', req.url);
    return Response.redirect(loginUrl);
  }
  
  if (isPublicRoute(req)) return;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
