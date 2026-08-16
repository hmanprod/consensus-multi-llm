import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { authEnabled } from "@/lib/user-context";

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  if (!authEnabled()) return NextResponse.next();
  const { clerkMiddleware } = await import("@clerk/nextjs/server");
  return clerkMiddleware()(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};