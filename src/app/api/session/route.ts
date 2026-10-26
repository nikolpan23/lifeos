import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminConfigured } from "@/lib/firebase/admin";
import { firebaseConfigured, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/firebase/config";
import { isSameOrigin } from "@/lib/firebase/session";

const bodySchema = z.object({ idToken: z.string().min(20).max(4096) });

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/** Exchanges a fresh Firebase ID token for an httpOnly session cookie. */
export async function POST(request: Request) {
  if (!firebaseConfigured || !adminConfigured()) return NextResponse.json({ error: "Firebase is not configured on the server." }, { status: 503 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const decoded = await adminAuth().verifyIdToken(parsed.data.idToken, true);
    // Only mint a session from a recent sign-in, so a stolen old token can't be upgraded.
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    const cookie = await adminAuth().createSessionCookie(parsed.data.idToken, { expiresIn: SESSION_MAX_AGE_SECONDS * 1000 });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, cookie, { ...cookieOptions, maxAge: SESSION_MAX_AGE_SECONDS });
    return res;
  } catch (err) {
    console.error("[session] could not create session:", (err as { code?: string }).code ?? (err as Error).message);
    return NextResponse.json({ error: "Could not start your session. Please sign in again." }, { status: 401 });
  }
}

/** Signs out by clearing the session cookie. */
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
