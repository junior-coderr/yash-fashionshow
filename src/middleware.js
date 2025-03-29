import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

// Paths that should be protected with admin authentication
const ADMIN_PATHS = ["/admin", "/api/admin"];

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // HTTP to HTTPS redirect - specifically for Heroku and other hosting platforms
  const proto = request.headers.get("x-forwarded-proto") || "";
  
  // For Heroku and similar hosting platforms
  if (proto === "http") {
    const url = new URL(request.url);
    url.protocol = "https:";
    return NextResponse.redirect(url.toString(), 301);
  }

  // Skip middleware for non-admin routes and login routes
  if (
    !ADMIN_PATHS.some((path) => pathname.startsWith(path)) ||
    pathname.startsWith("/admin/login") ||
    pathname === "/api/admin/login" ||
    pathname === "/api/admin/check"
  ) {
    return NextResponse.next();
  }

  // Check for token in cookies
  const token = request.cookies.get("adminToken")?.value;

  // If no token found in cookies, check Authorization header
  const authHeader = request.headers.get("authorization");
  const headerToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

  // Use either cookie token or header token
  const finalToken = token || headerToken;

  // If no token is found, redirect to login page or return unauthorized
  if (!finalToken) {
    if (pathname.startsWith("/api/")) {
      // API routes should return 401 Unauthorized
      return new NextResponse(
        JSON.stringify({ success: false, message: "Authentication required" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // For page routes, redirect to login
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Verify token
  const decoded = verifyToken(finalToken);

  // If token is invalid or not for admin, redirect or return unauthorized
  if (!decoded || decoded.role !== "admin") {
    if (pathname.startsWith("/api/")) {
      return new NextResponse(
        JSON.stringify({ success: false, message: "Invalid or expired token" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const url = new URL("/admin/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Token is valid, proceed with the request
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
