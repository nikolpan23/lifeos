import "server-only";
import { cookies } from "next/headers";
import { adminAuth, adminConfigured } from "./admin";
import { firebaseConfigured, SESSION_COOKIE } from "./config";

export interface SessionUser {
  uid: string;
  email: string | null;
}

/** Verifies the session cookie (including revocation). Returns null if signed out or invalid. */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!firebaseConfigured || !adminConfigured()) return null;
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  try {
    const claims = await adminAuth().verifySessionCookie(value, true);
    return { uid: claims.uid, email: claims.email ?? null };
  } catch {
    return null;
  }
}

/** Same-origin check for state-changing route handlers (defence in depth on top of SameSite cookies). */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
