import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow Auth.js API routes to pass through unauthenticated
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Allow supplier portal API to pass through unauthenticated (token-based auth)
  if (pathname.startsWith("/api/supply-chain/portal")) {
    return NextResponse.next();
  }

  // If user is not authenticated, redirect to login
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/(dashboard)/:path*", "/api/:path*"],
};
