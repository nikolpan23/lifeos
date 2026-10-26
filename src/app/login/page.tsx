import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/auth-form";
import { SetupNotice } from "@/components/auth/setup-notice";
import { firebaseConfigured } from "@/lib/firebase/config";
import { getSessionUser } from "@/lib/firebase/session";
import { safeNext } from "@/lib/auth/safe-next";

// Reads the session cookie on every request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (!firebaseConfigured) return <SetupNotice />;
  const { next } = await searchParams;
  const target = safeNext(typeof next === "string" ? next : null);
  if (await getSessionUser()) redirect(target);
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your LifeOS space."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-primary-strong underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <SignInForm next={target} />
    </AuthCard>
  );
}
