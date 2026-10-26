/**
 * Public Firebase web config. These values identify your project; they are not secrets.
 * Locally they come from .env.local. On Firebase App Hosting they are filled in
 * automatically at build time from FIREBASE_WEBAPP_CONFIG (see next.config.ts).
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);

export const SESSION_COOKIE = "__session";
/** Firebase session cookies can last up to 14 days. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;
