import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicPaths = [
  "/site",
  "/login",
  "/register",
  "/access-denied",
  "/api/auth",
  "/api/health",
  "/supplier-portal",
];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;

  // Static assets and internal paths — skip
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Public routes — allow through
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Allow supplier portal API to pass through unauthenticated (token-based auth)
  if (pathname.startsWith("/api/supply-chain/portal")) {
    return NextResponse.next();
  }

  // Root path: show marketing site for unauthenticated users
  if (pathname === "/" && !req.auth) {
    return NextResponse.redirect(new URL("/site", req.url));
  }

  // All other protected routes: redirect to login
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
