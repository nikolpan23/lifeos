import type { NextConfig } from "next";

// On Firebase App Hosting, the web app config arrives as FIREBASE_WEBAPP_CONFIG at
// build time. Map it onto the NEXT_PUBLIC_ names the client reads, unless set explicitly.
function firebaseWebEnv(): Record<string, string> {
  const raw = process.env.FIREBASE_WEBAPP_CONFIG;
  if (!raw) return {};
  try {
    const c = JSON.parse(raw) as Record<string, string | undefined>;
    const pick = (name: string, value: string | undefined) => (process.env[name] || value ? { [name]: process.env[name] || value || "" } : {});
    return {
      ...pick("NEXT_PUBLIC_FIREBASE_API_KEY", c.apiKey),
      ...pick("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", c.authDomain),
      ...pick("NEXT_PUBLIC_FIREBASE_PROJECT_ID", c.projectId),
      ...pick("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", c.storageBucket),
      ...pick("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", c.messagingSenderId),
      ...pick("NEXT_PUBLIC_FIREBASE_APP_ID", c.appId),
    };
  } catch {
    return {};
  }
}

// Cache Components is left off on purpose: almost every LifeOS screen is
// per-user and request-time, so classic dynamic rendering keeps things simple.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: firebaseWebEnv(),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
