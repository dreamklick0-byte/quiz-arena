import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Protect ALL /admin/* and /api/admin/* routes except auth-related ones
  const isAuthRoute = path === "/admin/login" || path === "/api/admin/auth";
  const isAdminRoute = path.startsWith("/admin") || path.startsWith("/api/admin");

  if (isAdminRoute && !isAuthRoute) {
    const adminSessionCookie = request.cookies.get("admin_session")?.value;

    if (!adminSessionCookie) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    try {
      const sessionData = JSON.parse(adminSessionCookie);
      const { role } = sessionData;

      // Access control for manage-admins
      if (path.startsWith("/admin/manage-admins") && role !== "super_admin") {
        const url = new URL("/admin", request.url);
        url.searchParams.set("error", "Access denied. Super Admin only.");
        return NextResponse.redirect(url);
      }

      // Pass role to pages via header
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-admin-role", role);
      requestHeaders.set("x-admin-id", sessionData.id);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch {
      // Invalid session cookie
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
