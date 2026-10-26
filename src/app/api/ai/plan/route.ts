import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { getSessionUser, isSameOrigin } from "@/lib/firebase/session";
import { aiPlanSchema, planRequestSchema, type PlanResponse } from "@/lib/ai/plan-contract";
import { PLANNER_SYSTEM_PROMPT, plannerUserMessage } from "@/lib/ai/planner-prompt";
import { todayIn } from "@/lib/dates";

const DEFAULT_MODEL = "claude-opus-5-5";

// The shape Claude is constrained to. Length limits are enforced afterwards by aiPlanSchema.
const outputSchema = z.object({
  order: z.array(z.string()),
  reasons: z.array(z.object({ id: z.string(), reason: z.string() })),
  summary: z.string(),
});

function fail(reason: Extract<PlanResponse, { ok: false }>["reason"], message: string, status: number) {
  return NextResponse.json({ ok: false, reason, message } satisfies PlanResponse, { status });
}

function dailyLimit(): number {
  const n = Number(process.env.AI_DAILY_LIMIT ?? 20);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
}

/** Counts one request against today's per-user limit. Returns remaining, or -1 if the limit is reached. */
async function takeQuota(uid: string, day: string): Promise<number> {
  const db = adminDb();
  const ref = db.doc(`aiUsage/${uid}`);
  const limit = dailyLimit();
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists ? (snap.data() as { day?: string; count?: number }) : {};
    const count = prev.day === day ? (prev.count ?? 0) : 0;
    if (count >= limit) return -1;
    tx.set(ref, { day, count: count + 1, updatedAt: new Date().toISOString() });
    return limit - count - 1;
  });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("unauthorized", "Request not allowed.", 403);
  const user = await getSessionUser();
  if (!user) return fail("unauthorized", "Please sign in again.", 401);
  if (!process.env.ANTHROPIC_API_KEY) return fail("not_configured", "AI isn't set up on this server.", 503);

  const parsed = planRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("invalid_request", "That plan request didn't look right.", 400);
  const req = parsed.data;
  if (req.candidates.length === 0) return fail("invalid_request", "There are no tasks to plan.", 400);

  // Consent is checked on the server, from the stored profile, not trusted from the client.
  let timezone = req.timezone;
  try {
    const profile = await adminDb().doc(`users/${user.uid}`).get();
    if (profile.get("aiConsent") !== true) return fail("no_consent", "AI suggestions are turned off in Settings.", 403);
    timezone = (profile.get("timezone") as string) || timezone;
  } catch {
    return fail("ai_error", "We couldn't check your AI settings.", 500);
  }

  let remaining: number;
  try {
    remaining = await takeQuota(user.uid, todayIn(timezone));
  } catch {
    return fail("ai_error", "We couldn't check today's AI limit.", 500);
  }
  if (remaining < 0) return fail("rate_limited", "You've used today's AI suggestions.", 429);

  const client = new Anthropic();
  try {
    const response = await client.messages.parse(
      {
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: 4000,
        output_config: { effort: "low", format: zodOutputFormat(outputSchema) },
        system: PLANNER_SYSTEM_PROMPT,
        messages: [{ role: "user", content: plannerUserMessage(req) }],
      },
      { timeout: 45_000 },
    );
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens" || !response.parsed_output) {
      return fail("ai_error", "AI couldn't produce a plan this time.", 502);
    }

    // Model output is untrusted: re-validate, keep only known ids, trim the text.
    const checked = aiPlanSchema.safeParse({
      order: response.parsed_output.order.slice(0, 40),
      reasons: response.parsed_output.reasons.slice(0, 40).map((r) => ({ id: r.id, reason: r.reason.trim().slice(0, 240) })),
      summary: response.parsed_output.summary.trim().slice(0, 400),
    });
    if (!checked.success) return fail("ai_error", "AI returned an unexpected answer.", 502);
    const known = new Set(req.candidates.map((c) => c.id));
    const order = [...new Set(checked.data.order.filter((id) => known.has(id)))];
    if (order.length === 0) return fail("ai_error", "AI returned an unexpected answer.", 502);
    const reasons: Record<string, string> = {};
    for (const r of checked.data.reasons) if (known.has(r.id) && r.reason) reasons[r.id] = r.reason;

    return NextResponse.json({ ok: true, source: "ai", order, reasons, summary: checked.data.summary, remaining } satisfies PlanResponse);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return fail("ai_error", "AI is busy right now.", 503);
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("[ai] Anthropic API key was rejected");
      return fail("not_configured", "AI isn't set up correctly on this server.", 503);
    }
    if (err instanceof Anthropic.APIError) {
      console.error("[ai] Anthropic API error", err.status);
      return fail("ai_error", "AI suggestions are unavailable right now.", 502);
    }
    console.error("[ai] plan request failed", (err as Error).name);
    return fail("ai_error", "AI suggestions are unavailable right now.", 502);
  }
}
