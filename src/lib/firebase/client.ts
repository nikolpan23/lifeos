"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig, firebaseConfigured } from "./config";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

/** Local development against the Firebase Emulator Suite (npm run emulators). */
const useEmulators = process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === "1";

function firebaseApp(): FirebaseApp {
  if (!firebaseConfigured) throw new Error("Firebase is not configured. Add your web app config to .env.local.");
  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return app;
}

export function clientAuth(): Auth {
  if (!auth) {
    auth = getAuth(firebaseApp());
    if (useEmulators) connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  }
  return auth;
}

export function clientDb(): Firestore {
  if (!db) {
    const a = firebaseApp();
    try {
      db = initializeFirestore(a, { ignoreUndefinedProperties: true });
    } catch {
      db = getFirestore(a);
    }
    if (useEmulators) connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  return db;
}
