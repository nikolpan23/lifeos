import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/auth-form";
import { SetupNotice } from "@/components/auth/setup-notice";
import { firebaseConfigured } from "@/lib/firebase/config";
import { getSessionUser } from "@/lib/firebase/session";

// Reads the session cookie on every request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage() {
  if (!firebaseConfigured) return <SetupNotice />;
  if (await getSessionUser()) redirect("/app");
  return (
    <AuthCard
      title="Create your space"
      description="A calm place for your tasks, habits, goals and schedule."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary-strong underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthCard>
  );
}
