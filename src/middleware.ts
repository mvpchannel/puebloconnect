import { NextRequest, NextResponse } from "next/server";
import { verifySessionEdge } from "@/lib/session-edge";

const SESSION_COOKIE_NAME = "pueblo_session"; // kept in sync with src/lib/session.ts

// Routes that require any logged-in user.
const MEMBER_ROUTES = ["/newsfeed", "/profile", "/membership", "/explore-3d", "/notifications", "/messages"];
// Routes that require role === 'admin'.
const ADMIN_ROUTES = ["/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const needsMember = MEMBER_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const needsAdmin = ADMIN_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!needsMember && !needsAdmin) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = process.env.SESSION_SECRET;

  if (!token || !secret) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifySessionEdge(token, secret);

  if (!payload) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return res;
  }

  if (needsAdmin && payload.role !== "admin") {
    // Authenticated, but not an admin — do not reveal the admin panel
    // exists by 404ing differently; just send them back to the newsfeed.
    return NextResponse.redirect(new URL("/newsfeed", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/newsfeed/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/membership/:path*",
    "/explore-3d/:path*",
    "/notifications/:path*",
    "/messages/:path*",
  ],
};
