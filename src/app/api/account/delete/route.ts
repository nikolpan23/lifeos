import { NextResponse } from "next/server";
import { adminAuth, adminConfigured, adminDb } from "@/lib/firebase/admin";
import { firebaseConfigured, SESSION_COOKIE } from "@/lib/firebase/config";
import { isSameOrigin } from "@/lib/firebase/session";

/**
 * Permanently deletes the signed-in user's data and account.
 * Requires a fresh ID token (the client re-authenticates with the password first).
 */
export async function POST(request: Request) {
  if (!firebaseConfigured || !adminConfigured()) return NextResponse.json({ error: "Firebase is not configured on the server." }, { status: 503 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return NextResponse.json({ error: "Missing credentials" }, { status: 401 });

  let uid: string;
  try {
    const decoded = await adminAuth().verifyIdToken(token, true);
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) return NextResponse.json({ error: "Please confirm your password again." }, { status: 401 });
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Please confirm your password again." }, { status: 401 });
  }

  try {
    const db = adminDb();
    await db.recursiveDelete(db.doc(`users/${uid}`));
    await db.doc(`aiUsage/${uid}`).delete();
    await adminAuth().deleteUser(uid);
  } catch (err) {
    console.error("[account] delete failed:", (err as { code?: string }).code ?? (err as Error).message);
    return NextResponse.json({ error: "We couldn't finish deleting your account. Please try again." }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
