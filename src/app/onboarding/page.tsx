import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Onboarding } from "@/components/auth/onboarding";
import { SetupNotice } from "@/components/auth/setup-notice";
import { firebaseConfigured } from "@/lib/firebase/config";
import { getSessionUser } from "@/lib/firebase/session";

// Reads the session cookie on every request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Set up your space" };

export default async function OnboardingPage() {
  if (!firebaseConfigured) return <SetupNotice />;
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/onboarding");
  return <Onboarding uid={user.uid} />;
}
