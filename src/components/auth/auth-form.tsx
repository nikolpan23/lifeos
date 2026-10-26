"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { authErrorMessage, hardNavigate, resetPassword, signIn, signUp } from "@/lib/auth/client-auth";

const email = z.string().trim().min(1, "Enter your email").email("That doesn't look like a valid email");
const signInSchema = z.object({ email, password: z.string().min(1, "Enter your password") });
const signUpSchema = z.object({
  name: z.string().trim().max(60, "Keep it under 60 characters"),
  email,
  password: z.string().min(8, "Use at least 8 characters").max(128),
});

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-[12px] bg-soft-rose px-3 py-2.5 text-[13.5px] text-ink-rose">
      {message}
    </p>
  );
}

export function SignInForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const form = useForm<SignInValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await signIn(values.email, values.password);
      hardNavigate(next);
    } catch (err) {
      setError((err as { code?: string }).code === "session" ? (err as Error).message : authErrorMessage(err));
    }
  });

  const onReset = async () => {
    const ok = await form.trigger("email");
    if (!ok) return;
    setError(null);
    try {
      await resetPassword(form.getValues("email"));
    } catch (err) {
      // Don't reveal whether an account exists; only surface connection-type problems.
      const code = (err as { code?: string }).code;
      if (code === "auth/network-request-failed" || code === "auth/too-many-requests") return setError(authErrorMessage(err));
    }
    setResetSent(true);
  };

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={error} />
      {resetSent && (
        <p role="status" className="flex gap-2 rounded-[12px] bg-soft-green px-3 py-2.5 text-[13.5px] text-ink-green">
          <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> If there’s an account for that email, a reset link is on its way.
        </p>
      )}
      <Field id="email" label="Email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...form.register("email")} />
      </Field>
      <Field id="password" label="Password" error={errors.password?.message}>
        <Input type="password" autoComplete="current-password" {...form.register("password")} />
      </Field>
      <Button type="submit" size="lg" disabled={isSubmitting} className="mt-1 w-full">
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden />} Sign in
      </Button>
      <Button type="button" variant="link" onClick={onReset} className="mx-auto text-[13.5px]">
        Forgot your password?
      </Button>
    </form>
  );
}

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema), defaultValues: { name: "", email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await signUp(values.email, values.password, values.name);
      hardNavigate("/onboarding");
    } catch (err) {
      setError((err as { code?: string }).code === "session" ? (err as Error).message : authErrorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={error} />
      <Field id="name" label="Your name" optional error={errors.name?.message}>
        <Input autoComplete="given-name" {...form.register("name")} />
      </Field>
      <Field id="email" label="Email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...form.register("email")} />
      </Field>
      <Field id="password" label="Password" hint="At least 8 characters." error={errors.password?.message}>
        <Input type="password" autoComplete="new-password" {...form.register("password")} />
      </Field>
      <Button type="submit" size="lg" disabled={isSubmitting} className="mt-1 w-full">
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden />} Create account
      </Button>
      <p className="text-center text-[12.5px] leading-relaxed text-muted-foreground">
        Your data is private to your account. AI features stay off until you turn them on. Prefer to look around first? <Link href="/demo" className="font-medium text-primary-strong underline-offset-4 hover:underline">Explore the demo</Link>.
      </p>
    </form>
  );
}
