import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboard(.*)",
  "/pick-role(.*)",
  "/projects/new",
  "/projects/(.*)/manage",
  "/projects/(.*)/dashboard",
  "/projects/(.*)/apply",
  "/projects/(.*)/report",
  "/teams/new",
  "/teams/(.*)/manage",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();

  const useFallback = req.nextUrl.searchParams.get("demo") === "fallback";
  if (useFallback) {
    const res = NextResponse.next();
    res.cookies.set("polymath-demo-fallback", "1", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 4,
    });
    return res;
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/api/(.*)"],
};
