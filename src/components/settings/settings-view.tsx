"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Download, Loader2, Plus, RotateCcw, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORY_STYLES } from "@/components/shared/category";
import { useAccount } from "@/components/layout/account-context";
import { useActions, useLife, useMode } from "@/lib/data/store";
import { COMMON_TIME_ZONES, isValidTimeZone, isWallTime } from "@/lib/dates";
import { CATEGORY_COLORS, type Category, type CategoryColor } from "@/lib/domain/types";
import { exportLifeData } from "@/lib/data/export";
import { resetDemoData } from "@/lib/data/demo-backend";
import { ValidationError } from "@/lib/data/actions";
import { cn } from "@/lib/utils";

const optTime = z.string().refine((v) => v === "" || isWallTime(v), "Use a valid time");

const settingsForm = z
  .object({
    displayName: z.string().trim().min(1, "Add a name").max(60),
    timezone: z.string().refine(isValidTimeZone, "Choose a valid time zone"),
    weekStartsOn: z.enum(["0", "1", "6"]),
    workStart: optTime,
    workEnd: optTime,
    wakeTime: optTime,
    sleepTime: optTime,
    focusBlockMinutes: z.string().refine((v) => /^\d+$/.test(v) && +v >= 25 && +v <= 240, "Between 25 and 240 minutes"),
    breakMinutes: z.string().refine((v) => /^\d+$/.test(v) && +v >= 0 && +v <= 60, "Between 0 and 60 minutes"),
    planWithin: z.enum(["work_hours", "waking_hours"]),
  })
  .refine((v) => !v.workStart || !v.workEnd || v.workStart < v.workEnd, { message: "Must be after the start", path: ["workEnd"] });
type SettingsValues = z.infer<typeof settingsForm>;

function ColorPicker({ value, onChange, label }: { value: CategoryColor; onChange: (c: CategoryColor) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1.5">
      {CATEGORY_COLORS.map((c) => (
        <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={CATEGORY_STYLES[c].label} onClick={() => onChange(c)} className={cn("size-7 rounded-full ring-offset-2 transition-shadow", CATEGORY_STYLES[c].dot, value === c && "ring-2 ring-[#24283b]/40")} />
      ))}
    </div>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const actions = useActions();
  const [name, setName] = useState(category.name);
  const save = async (color: CategoryColor = category.color) => {
    try {
      await actions.updateCategory(category.id, name, color);
    } catch (e) {
      toast.error(e instanceof ValidationError ? e.message : "Couldn't save category");
      setName(category.name);
    }
  };
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-[12px] border border-border px-3 py-2">
      <Input value={name} aria-label="Category name" onChange={(e) => setName(e.target.value)} onBlur={() => name !== category.name && save()} className="h-9 min-w-36 flex-1" maxLength={40} />
      <ColorPicker value={category.color} onChange={(c) => save(c)} label={`Color for ${category.name}`} />
      <Button variant="ghost" size="icon-sm" aria-label={`Delete category ${category.name}`} onClick={() => actions.deleteCategory(category.id)}>
        <Trash2 />
      </Button>
    </li>
  );
}

export function SettingsView() {
  const actions = useActions();
  const mode = useMode();
  const account = useAccount();
  const data = useLife((d) => d);
  const profile = data.profile;
  const [newCat, setNewCat] = useState("");
  const [newColor, setNewColor] = useState<CategoryColor>("blue");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const defaults = (): SettingsValues => ({
    displayName: profile.displayName,
    timezone: profile.timezone,
    weekStartsOn: String(profile.weekStartsOn) as "0" | "1" | "6",
    workStart: profile.planning.workStart ?? "",
    workEnd: profile.planning.workEnd ?? "",
    wakeTime: profile.planning.wakeTime ?? "",
    sleepTime: profile.planning.sleepTime ?? "",
    focusBlockMinutes: String(profile.planning.focusBlockMinutes),
    breakMinutes: String(profile.planning.breakMinutes),
    planWithin: profile.planning.planWithin,
  });
  const { register, handleSubmit, formState, reset } = useForm<SettingsValues>({ resolver: zodResolver(settingsForm), defaultValues: defaults() });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => reset(defaults()), [profile.updatedAt]);

  const onSubmit = handleSubmit(async (v) => {
    await actions.updateProfile({
      displayName: v.displayName.trim(),
      timezone: v.timezone,
      weekStartsOn: Number(v.weekStartsOn) as 0 | 1 | 6,
      planning: {
        workStart: v.workStart || null,
        workEnd: v.workEnd || null,
        wakeTime: v.wakeTime || null,
        sleepTime: v.sleepTime || null,
        focusBlockMinutes: Number(v.focusBlockMinutes),
        breakMinutes: Number(v.breakMinutes),
        planWithin: v.planWithin,
      },
    });
  });

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (await actions.addCategory(newCat, newColor)) setNewCat("");
    } catch (err) {
      toast.error(err instanceof ValidationError ? err.message : "Couldn't add category");
    }
  };

  const zones = COMMON_TIME_ZONES.includes(profile.timezone) ? COMMON_TIME_ZONES : [profile.timezone, ...COMMON_TIME_ZONES];

  return (
    <>
      <PageHeader title="Settings" description="Make LifeOS fit the way your days actually work." />
      <div className="grid max-w-3xl gap-5">
        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Dates, streaks and plans use your time zone.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field id="set-name" label="Display name" error={formState.errors.displayName?.message} className="sm:col-span-2">
                <Input {...register("displayName")} maxLength={60} />
              </Field>
              <Field id="set-tz" label="Time zone" error={formState.errors.timezone?.message}>
                <NativeSelect {...register("timezone")}>
                  {zones.map((z) => (
                    <option key={z} value={z}>
                      {z.replace(/_/g, " ")}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field id="set-week" label="Week starts on">
                <NativeSelect {...register("weekStartsOn")}>
                  <option value="1">Monday</option>
                  <option value="0">Sunday</option>
                  <option value="6">Saturday</option>
                </NativeSelect>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Planning preferences</CardTitle>
                <CardDescription>The daily planner only suggests work inside these hours.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field id="set-ws" label="Work starts" optional error={formState.errors.workStart?.message}>
                <Input type="time" {...register("workStart")} />
              </Field>
              <Field id="set-we" label="Work ends" optional error={formState.errors.workEnd?.message}>
                <Input type="time" {...register("workEnd")} />
              </Field>
              <Field id="set-wake" label="Usually wake up" optional error={formState.errors.wakeTime?.message}>
                <Input type="time" {...register("wakeTime")} />
              </Field>
              <Field id="set-sleep" label="Usually go to sleep" optional error={formState.errors.sleepTime?.message}>
                <Input type="time" {...register("sleepTime")} />
              </Field>
              <Field id="set-within" label="Plan tasks within">
                <NativeSelect {...register("planWithin")}>
                  <option value="work_hours">Working hours</option>
                  <option value="waking_hours">Waking hours</option>
                </NativeSelect>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field id="set-focus" label="Focus block (min)" error={formState.errors.focusBlockMinutes?.message}>
                  <Input type="number" min={25} max={240} step={5} {...register("focusBlockMinutes")} />
                </Field>
                <Field id="set-break" label="Break (min)" error={formState.errors.breakMinutes?.message}>
                  <Input type="number" min={0} max={60} step={5} {...register("breakMinutes")} />
                </Field>
              </div>
            </CardContent>
            <div className="flex justify-end border-t border-border px-5 py-3">
              <Button type="submit" disabled={formState.isSubmitting || !formState.isDirty}>
                {formState.isSubmitting && <Loader2 className="animate-spin" />} Save preferences
              </Button>
            </div>
          </Card>
        </form>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Pastel labels for tasks, habits, goals and events.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2">
            <ul className="grid gap-2">
              {data.categories.map((c) => (
                <CategoryRow key={c.id} category={c} />
              ))}
            </ul>
            <form onSubmit={addCategory} className="mt-2 flex flex-wrap items-center gap-3">
              <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category" aria-label="New category name" className="h-9 min-w-36 flex-1" maxLength={40} />
              <ColorPicker value={newColor} onChange={setNewColor} label="New category color" />
              <Button type="submit" variant="soft" size="sm" disabled={!newCat.trim()}>
                <Plus /> Add
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary-strong" aria-hidden /> AI suggestions
              </CardTitle>
              <CardDescription>Optional. Off unless you turn it on.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-start justify-between gap-4 rounded-[14px] bg-[#f7f8fb] p-4">
              <div>
                <Label htmlFor="ai-consent" className="text-[14px] font-semibold text-foreground">
                  Use Claude to prioritise and explain daily plans
                </Label>
                <p className="mt-1 text-[13px] leading-relaxed text-subtle-foreground">
                  When you click Plan My Day, LifeOS sends the titles, priorities, due dates and estimates of candidate tasks, plus the times of your commitments, to Anthropic’s Claude API. Notes, descriptions and locations are never sent. Free time is always calculated by LifeOS itself.
                </p>
                {mode === "demo" && <p className="mt-2 text-[13px] font-medium text-ink-peach">Not available in demo mode.</p>}
                {mode === "live" && !account.aiConfigured && <p className="mt-2 text-[13px] font-medium text-ink-peach">AI isn’t configured on this server yet, so the rule-based planner is used.</p>}
              </div>
              <Switch id="ai-consent" checked={profile.aiConsent} disabled={mode === "demo"} onCheckedChange={(c) => actions.updateProfile({ aiConsent: c })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Your data</CardTitle>
              <CardDescription>{mode === "demo" ? "Demo data lives only in this browser." : "Everything is stored in your account and protected by per-user security rules."}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportLifeData(data, mode)}>
              <Download /> Export as JSON
            </Button>
            {data.insightStates.length > 0 && (
              <Button variant="ghost" onClick={() => actions.restoreInsights()}>
                <RotateCcw /> Restore hidden insights
              </Button>
            )}
            {mode === "demo" ? (
              <Button
                variant="outline"
                onClick={() => {
                  resetDemoData();
                  window.location.reload();
                }}
              >
                <RotateCcw /> Reset demo data
              </Button>
            ) : (
              <Button variant="ghost" className="text-danger hover:bg-soft-rose hover:text-danger" onClick={() => setDeleteOpen(true)}>
                <Trash2 /> Delete account
              </Button>
            )}
          </CardContent>
        </Card>
        <p className="px-1 text-[12.5px] text-muted-foreground">Animations follow your device’s reduced-motion setting.</p>
      </div>
      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}

function DeleteAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const account = useAccount();
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changeOpen = (o: boolean) => {
    if (!o) {
      setConfirm("");
      setPassword("");
      setError(null);
    }
    onOpenChange(o);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account.deleteAccount) return;
    setBusy(true);
    setError(null);
    try {
      await account.deleteAccount(password);
    } catch (err) {
      setError((err as Error).message || "Couldn't delete the account. Please try again.");
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <ShieldAlert className="size-5" aria-hidden /> Delete your account?
            </DialogTitle>
            <DialogDescription>This permanently deletes your account and every task, habit, goal, note, event and plan. It can’t be undone. You may want to export your data first.</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <Field id="del-pass" label="Your password">
              <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Field id="del-confirm" label='Type "delete" to confirm'>
              <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
            </Field>
            {error && (
              <p role="alert" className="rounded-[10px] bg-soft-rose px-3 py-2 text-sm text-ink-rose">
                {error}
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => changeOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={busy || confirm.trim().toLowerCase() !== "delete" || !password}>
              {busy && <Loader2 className="animate-spin" />} Delete everything
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
