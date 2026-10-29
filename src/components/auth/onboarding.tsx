"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, writeBatch } from "firebase/firestore";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Logo } from "@/components/shared/logo";
import { CATEGORY_STYLES } from "@/components/shared/category";
import { clientAuth, clientDb } from "@/lib/firebase/client";
import { signOut } from "@/lib/auth/client-auth";
import { browserTimeZone, COMMON_TIME_ZONES, isWallTime } from "@/lib/dates";
import { profileSchema } from "@/lib/domain/schemas";
import { DEFAULT_PLANNING, type CategoryColor, type Profile } from "@/lib/domain/types";
import { newId } from "@/lib/data/ids";
import { cn } from "@/lib/utils";

const PRESETS: { name: string; color: CategoryColor; on: boolean }[] = [
  { name: "Work", color: "lavender", on: true },
  { name: "Health", color: "green", on: true },
  { name: "Personal", color: "peach", on: true },
  { name: "Learning", color: "blue", on: true },
  { name: "Home", color: "yellow", on: false },
  { name: "Social", color: "rose", on: false },
  { name: "Finance", color: "blue", on: false },
  { name: "Family", color: "rose", on: false },
];

const STEPS = ["About you", "Categories", "Your day"] as const;

function defaultName(user: User | null): string {
  return (user?.displayName || user?.email?.split("@")[0] || "").slice(0, 60);
}

export function Onboarding({ uid }: { uid: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState(() => browserTimeZone());
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1 | 6>(1);
  const [chosen, setChosen] = useState(() => PRESETS.map((p) => p.on));
  const [custom, setCustom] = useState("");
  const [times, setTimes] = useState({ workStart: "", workEnd: "", wakeTime: "", sleepTime: "" });

  useEffect(() => {
    return onAuthStateChanged(clientAuth(), async (u) => {
      if (!u || u.uid !== uid) {
        await signOut();
        window.location.replace("/login?next=/onboarding");
        return;
      }
      const existing = await getDoc(doc(clientDb(), "users", uid)).catch(() => null);
      if (existing?.exists() && existing.data()?.onboardedAt) {
        window.location.replace("/app");
        return;
      }
      setUser(u);
      setName((n) => n || defaultName(u));
      setReady(true);
    });
  }, [uid]);

  const zones = useMemo(() => (COMMON_TIME_ZONES.includes(timezone) ? COMMON_TIME_ZONES : [timezone, ...COMMON_TIME_ZONES]), [timezone]);

  async function finish(useDefaults: boolean) {
    setError(null);
    const now = new Date().toISOString();
    const t = (v: string) => (isWallTime(v) ? v : null);
    const planning = useDefaults
      ? DEFAULT_PLANNING
      : {
          ...DEFAULT_PLANNING,
          workStart: t(times.workStart) ?? DEFAULT_PLANNING.workStart,
          workEnd: t(times.workEnd) ?? DEFAULT_PLANNING.workEnd,
          wakeTime: t(times.wakeTime) ?? DEFAULT_PLANNING.wakeTime,
          sleepTime: t(times.sleepTime) ?? DEFAULT_PLANNING.sleepTime,
        };
    const profile: Profile = {
      displayName: name.trim() || defaultName(user) || "Friend",
      timezone,
      weekStartsOn,
      planning,
      aiConsent: false,
      onboardedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const valid = profileSchema.safeParse(profile);
    if (!valid.success) {
      setError(valid.error.issues[0]?.message ?? "Please check your details.");
      return;
    }
    const names = [...PRESETS.filter((_, i) => chosen[i]).map((p) => ({ name: p.name, color: p.color }))];
    const extra = custom.trim().slice(0, 40);
    if (extra && !names.some((n) => n.name.toLowerCase() === extra.toLowerCase())) names.push({ name: extra, color: "lavender" });

    setSaving(true);
    try {
      const db = clientDb();
      const batch = writeBatch(db);
      const userDoc = doc(db, "users", uid);
      batch.set(userDoc, valid.data);
      for (const c of names) {
        const id = newId();
        batch.set(doc(userDoc, "categories", id), { id, name: c.name, color: c.color, createdAt: now, updatedAt: now });
      }
      await batch.commit();
      window.location.replace("/app");
    } catch {
      setSaving(false);
      setError("We couldn't save your setup. Check your connection and try again.");
    }
  }

  if (!ready)
    return (
      <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
        <Loader2 className="size-6 animate-spin text-primary" aria-label="Loading" />
      </div>
    );

  return (
    <div className="flex min-h-dvh items-start justify-center bg-background px-4 py-10 sm:items-center">
      <main className="w-full max-w-[520px]">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <Button variant="ghost" size="sm" disabled={saving} onClick={() => finish(true)}>
            Skip setup
          </Button>
        </div>
        <ol className="mb-4 flex gap-2" aria-label="Setup progress">
          {STEPS.map((label, i) => (
            <li key={label} className="flex-1">
              <div className={cn("h-1.5 rounded-full", i <= step ? "bg-primary" : "bg-[#e4d9c6]")} />
              <span className={cn("mt-1.5 block text-[12px]", i === step ? "font-medium text-foreground" : "text-muted-foreground")} aria-current={i === step ? "step" : undefined}>
                {label}
              </span>
            </li>
          ))}
        </ol>

        <div className="rounded-[20px] border border-border bg-surface p-6 shadow-soft sm:p-8">
          {step === 0 && (
            <section aria-labelledby="ob-0" className="grid gap-4">
              <div>
                <h1 id="ob-0" className="text-[22px] font-semibold tracking-[-0.01em]">Welcome to LifeOS</h1>
                <p className="mt-1 text-[14px] text-muted-foreground">A few basics so dates, streaks and plans line up with your days.</p>
              </div>
              <Field id="ob-name" label="What should we call you?">
                <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="ob-tz" label="Time zone">
                  <NativeSelect value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    {zones.map((z) => (
                      <option key={z} value={z}>
                        {z.replaceAll("_", " ")}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field id="ob-week" label="Week starts on">
                  <NativeSelect value={weekStartsOn} onChange={(e) => setWeekStartsOn(Number(e.target.value) as 0 | 1 | 6)}>
                    <option value={1}>Monday</option>
                    <option value={0}>Sunday</option>
                    <option value={6}>Saturday</option>
                  </NativeSelect>
                </Field>
              </div>
            </section>
          )}

          {step === 1 && (
            <section aria-labelledby="ob-1" className="grid gap-4">
              <div>
                <h1 id="ob-1" className="text-[22px] font-semibold tracking-[-0.01em]">Pick your categories</h1>
                <p className="mt-1 text-[14px] text-muted-foreground">Labels for tasks, habits, goals and events. You can change them any time.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p, i) => {
                  const on = chosen[i];
                  return (
                    <button
                      key={p.name}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setChosen((c) => c.map((v, j) => (j === i ? !v : v)))}
                      className={cn(
                        "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[14px] transition-colors",
                        on ? "border-transparent bg-lavender font-medium text-primary-strong" : "border-border bg-surface text-subtle-foreground hover:bg-[#f2eadb]",
                      )}
                    >
                      {on ? <Check className="size-3.5" aria-hidden /> : <span className={cn("size-2 rounded-full", CATEGORY_STYLES[p.color].dot)} aria-hidden />}
                      {p.name}
                    </button>
                  );
                })}
              </div>
              <Field id="ob-custom" label="Add your own" optional>
                <Input value={custom} maxLength={40} placeholder="e.g. Side project" onChange={(e) => setCustom(e.target.value)} />
              </Field>
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="ob-2" className="grid gap-4">
              <div>
                <h1 id="ob-2" className="text-[22px] font-semibold tracking-[-0.01em]">Shape your day</h1>
                <p className="mt-1 text-[14px] text-muted-foreground">Optional. Plan My Day uses these to find free time. Leave blank to use 9:00–17:30 and 7:00–23:00.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field id="ob-ws" label="Work starts" optional>
                  <Input type="time" value={times.workStart} onChange={(e) => setTimes((t) => ({ ...t, workStart: e.target.value }))} />
                </Field>
                <Field id="ob-we" label="Work ends" optional>
                  <Input type="time" value={times.workEnd} onChange={(e) => setTimes((t) => ({ ...t, workEnd: e.target.value }))} />
                </Field>
                <Field id="ob-wake" label="Usually wake up" optional>
                  <Input type="time" value={times.wakeTime} onChange={(e) => setTimes((t) => ({ ...t, wakeTime: e.target.value }))} />
                </Field>
                <Field id="ob-sleep" label="Usually sleep" optional>
                  <Input type="time" value={times.sleepTime} onChange={(e) => setTimes((t) => ({ ...t, sleepTime: e.target.value }))} />
                </Field>
              </div>
            </section>
          )}

          {error && (
            <p role="alert" className="mt-4 rounded-[12px] bg-soft-rose px-3 py-2.5 text-[13.5px] text-ink-rose">
              {error}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between gap-2">
            <Button variant="ghost" disabled={step === 0 || saving} onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
            <div className="flex gap-2">
              {step > 0 && step < STEPS.length - 1 && (
                <Button variant="outline" disabled={saving} onClick={() => setStep((s) => s + 1)}>
                  Skip
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
              ) : (
                <Button disabled={saving} onClick={() => finish(false)}>
                  {saving && <Loader2 className="animate-spin" aria-hidden />} Finish setup
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
