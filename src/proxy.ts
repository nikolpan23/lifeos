import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/firebase/config";

/**
 * Optimistic check only: bounce visitors without a session cookie away from /app
 * and /onboarding. The cookie is fully verified on the server in the layouts and
 * route handlers, and Firestore security rules protect the data itself.
 */
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    const url = new URL("/login", request.nextUrl);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/onboarding"],
};
