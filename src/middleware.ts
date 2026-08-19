import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { authEnabled } from "@/lib/user-context";

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  if (!authEnabled()) return NextResponse.next();
  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");
  const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
  return clerkMiddleware(async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
  })(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};