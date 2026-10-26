"use client";

import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { clientAuth } from "@/lib/firebase/client";

/**
 * Full page load after sign-in, sign-out or account deletion. A soft navigation
 * would keep the previous user's data in memory, so these always reload.
 */
export function hardNavigate(path: string): void {
  window.location.assign(path);
}

/** Plain-language messages for Firebase Auth error codes. Never echoes raw server text. */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return "That email and password don't match an account.";
    case "auth/email-already-in-use":
      return "There's already an account with that email. Try signing in instead.";
    case "auth/weak-password":
      return "Choose a stronger password: at least 8 characters.";
    case "auth/password-does-not-meet-requirements":
      return "That password doesn't meet the project's password policy.";
    case "auth/invalid-email":
      return "That doesn't look like a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a minute and try again.";
    case "auth/network-request-failed":
      return "We couldn't reach the server. Check your connection and try again.";
    case "auth/operation-not-allowed":
      return "Email sign-in isn't enabled for this Firebase project yet.";
    case "auth/requires-recent-login":
      return "Please sign in again to continue.";
    default:
      return "Something went wrong. Please try again.";
  }
}

async function startServerSession(user: User): Promise<void> {
  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken }) });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw Object.assign(new Error(body.error ?? "Could not start your session."), { code: "session" });
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  const cred = await signInWithEmailAndPassword(clientAuth(), email, password);
  await startServerSession(cred.user);
}

export async function signUp(email: string, password: string, displayName: string): Promise<void> {
  const cred = await createUserWithEmailAndPassword(clientAuth(), email, password);
  if (displayName) await updateProfile(cred.user, { displayName }).catch(() => undefined);
  await startServerSession(cred.user);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(clientAuth(), email);
}

let leaving = false;
/** True while this tab is signing out or deleting the account on purpose. */
export function isLeaving(): boolean {
  return leaving;
}

export async function signOut(): Promise<void> {
  leaving = true;
  await firebaseSignOut(clientAuth()).catch(() => undefined);
  await fetch("/api/session", { method: "DELETE" }).catch(() => undefined);
}

export async function deleteAccount(password: string): Promise<void> {
  const user = clientAuth().currentUser;
  if (!user?.email) throw new Error("Please sign in again to continue.");
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  } catch (err) {
    const code = (err as { code?: string }).code;
    throw new Error(code === "auth/invalid-credential" || code === "auth/wrong-password" ? "That password isn't right." : authErrorMessage(err));
  }
  const token = await user.getIdToken(true);
  leaving = true;
  const res = await fetch("/api/account/delete", { method: "POST", headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) {
    leaving = false;
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "We couldn't delete your account. Please try again.");
  }
  await firebaseSignOut(clientAuth()).catch(() => undefined);
}
