import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarClock, Check, ChevronDown, Flame, Lock, Radar, Sparkles, Target, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

const FEATURES = [
  {
    id: "planning",
    eyebrow: "Daily planning",
    title: "A plan that respects your calendar",
    body: "Plan My Day finds the real free time between your meetings and habits, then suggests what to focus on and why. It never books over your commitments and never changes your calendar without you.",
    icon: CalendarClock,
    tone: "bg-lavender text-primary-strong",
    points: ["Works around events and habits", "Explains each suggestion", "Accept, edit, or skip"],
    image: "/screens/planner.png",
    alt: "LifeOS daily plan with focus blocks, breaks and reasons for each task",
  },
  {
    id: "habits",
    eyebrow: "Habits and goals",
    title: "Progress you can actually see",
    body: "Track habits on the days that suit you, with streaks that never scold. Break goals into milestones, link the tasks and habits that move them, and watch progress grow from what you finish.",
    icon: Target,
    tone: "bg-soft-green text-ink-green",
    points: ["Daily or chosen-weekday habits", "Kind, timezone-aware streaks", "Progress from real milestones"],
    image: "/screens/habits.png",
    alt: "LifeOS habit tracker showing a week of check-ins and streaks",
  },
  {
    id: "radar",
    eyebrow: "Life Radar",
    title: "Notice the clash before it happens",
    body: "Life Radar connects the dots across your tasks, calendar, habits and goals: three deadlines landing at once, a trip on the day something is due, a habit that keeps colliding with a class. Every insight shows exactly why it appeared.",
    icon: Radar,
    tone: "bg-soft-peach text-ink-peach",
    points: ["Explainable rules, no guesswork", "Linked to the records involved", "Dismiss or snooze anything"],
    image: "/screens/radar.png",
    alt: "LifeOS Life Radar listing insights such as overlapping events and deadline clusters",
  },
  {
    id: "what-if",
    eyebrow: "What-If Studio",
    title: "Try a decision before you make it",
    body: "What if you started going to the gym four times a week, or took on another project? Sketch the change and compare your schedule before and after: hours, free time, conflicts and deadline pressure. Nothing touches your real plans until you apply it.",
    icon: Sparkles,
    tone: "bg-soft-blue text-ink-blue",
    points: ["Side-by-side before and after", "Clear assumptions, no fortune-telling", "Apply only when you're sure"],
    image: "/screens/what-if.png",
    alt: "LifeOS What-If Studio comparing a schedule before and after adding a commitment",
  },
];

const FAQ = [
  {
    q: "Do I need an account to try it?",
    a: "No. Explore Demo opens LifeOS with realistic sample data that lives only in your browser. Nothing you do in the demo is sent to a server or mixed with a real account.",
  },
  {
    q: "How does the AI planning work?",
    a: "LifeOS first calculates your free time with plain, deterministic rules, so tasks are never placed on top of your commitments. If you turn on AI suggestions, Claude helps decide what to prioritise and explains its reasoning. Without AI, a rule-based planner does the job.",
  },
  {
    q: "Is AI turned on by default?",
    a: "No. AI suggestions are opt-in from Settings. When enabled, only the task titles, priorities, dates and time windows needed for planning are sent, never your notes or event descriptions.",
  },
  {
    q: "Will LifeOS change my calendar on its own?",
    a: "Never. Plans and What-If scenarios are suggestions. Your calendar and tasks only change when you explicitly accept or apply something.",
  },
  {
    q: "Can I export or delete my data?",
    a: "Yes. You can download everything as a JSON file at any time, and deleting your account removes your data permanently.",
  },
  {
    q: "Does it connect to Google Calendar?",
    a: "Not yet. LifeOS has its own calendar so the core experience works on its own. Calendar integrations may come later.",
  },
];

function Screen({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-border bg-surface p-1.5 shadow-lift">
      <Image src={src} alt={alt} width={1440} height={900} priority={priority} className="h-auto w-full rounded-[15px]" sizes="(min-width: 1024px) 640px, 100vw" />
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-transparent bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="LifeOS home">
            <Logo />
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-7 text-sm text-subtle-foreground md:flex">
            <a href="#planning" className="hover:text-foreground">Planning</a>
            <a href="#radar" className="hover:text-foreground">Life Radar</a>
            <a href="#what-if" className="hover:text-foreground">What-If Studio</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-40 h-[520px] bg-[radial-gradient(60%_60%_at_50%_30%,#f3e3d3_0%,rgba(245,239,227,0)_70%)]" />
          <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-10 text-center sm:px-6 sm:pt-24">
            <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#efd9c4] bg-surface px-3 py-1 text-[13px] font-medium text-primary-strong shadow-soft">
              <Sparkles className="size-3.5" aria-hidden /> Tasks, habits, goals, notes and calendar in one calm place
            </p>
            <h1 className="mx-auto mt-6 max-w-3xl text-[40px] leading-[1.05] font-medium tracking-[-0.02em] text-balance sm:text-[60px]">
              Your life, beautifully organized.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-subtle-foreground text-balance sm:text-lg">
              One intelligent space for your tasks, habits, goals, notes, and schedule. Plan better, see what matters, and make smarter decisions.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/signup">
                  Get Started <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="/demo">Explore Demo</Link>
              </Button>
            </div>
            <p className="mt-3 text-[13px] text-muted-foreground">The demo runs on sample data in your browser. No sign-up needed.</p>
          </div>
          <div className="relative mx-auto max-w-6xl px-4 pb-20 sm:px-6">
            <Screen src="/screens/dashboard.png" alt="The LifeOS dashboard with today's tasks, schedule, habits, daily plan and Life Radar insights" priority />
          </div>
        </section>

        <section aria-labelledby="pillars" className="border-y border-border bg-surface">
          <h2 id="pillars" className="sr-only">What LifeOS does</h2>
          <div className="mx-auto grid max-w-6xl gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: CalendarClock, t: "Plan My Day", d: "Free time, found for you" },
              { icon: Flame, t: "Gentle streaks", d: "Encouraging, never guilt-tripping" },
              { icon: Radar, t: "Life Radar", d: "Spots clashes and crunches" },
              { icon: Wand2, t: "What-If Studio", d: "Simulate before you commit" },
            ].map((p) => (
              <div key={p.t} className="flex items-center gap-3 bg-surface px-6 py-6">
                <p.icon className="size-5 text-primary-strong" aria-hidden />
                <div>
                  <p className="text-[15px] font-semibold">{p.t}</p>
                  <p className="text-[13px] text-muted-foreground">{p.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {FEATURES.map((f, i) => (
          <section key={f.id} id={f.id} aria-labelledby={`${f.id}-title`} className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className={i % 2 ? "lg:order-2" : ""}>
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold ${f.tone}`}>
                  <f.icon className="size-3.5" aria-hidden /> {f.eyebrow}
                </span>
                <h2 id={`${f.id}-title`} className="mt-4 text-[30px] leading-tight font-semibold tracking-[-0.025em] sm:text-[36px]">
                  {f.title}
                </h2>
                <p className="mt-4 text-[16px] leading-relaxed text-subtle-foreground">{f.body}</p>
                <ul className="mt-6 grid gap-2.5">
                  {f.points.map((p) => (
                    <li key={p} className="flex items-center gap-2.5 text-[15px]">
                      <span className="flex size-5 items-center justify-center rounded-full bg-lavender text-primary-strong">
                        <Check className="size-3" strokeWidth={3} aria-hidden />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={i % 2 ? "lg:order-1" : ""}>
                <Screen src={f.image} alt={f.alt} />
              </div>
            </div>
          </section>
        ))}

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="grid gap-6 rounded-[24px] border border-border bg-surface p-8 shadow-soft sm:p-10 md:grid-cols-[auto_1fr] md:items-center">
            <div className="flex size-12 items-center justify-center rounded-[16px] bg-lavender text-primary-strong">
              <Lock className="size-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Private by design</h2>
              <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-subtle-foreground">
                Your data is protected by per-user security rules, so only you can read it. AI is off until you turn it on, and you can export or delete everything whenever you like.
              </p>
            </div>
          </div>
        </section>

        <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-24 sm:px-6">
          <h2 id="faq-title" className="text-center text-[30px] font-semibold tracking-[-0.025em] sm:text-[36px]">
            Questions, answered
          </h2>
          <div className="mt-10 grid gap-3">
            {FAQ.map((item) => (
              <details key={item.q} className="group rounded-[16px] border border-border bg-surface px-5 py-4 shadow-soft open:shadow-lift">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15.5px] font-medium [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-subtle-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="rounded-[28px] bg-gradient-to-br from-lavender via-[#f6e9db] to-soft-blue px-6 py-14 text-center sm:px-12">
            <h2 className="text-[30px] font-semibold tracking-[-0.025em] sm:text-[38px]">Start tomorrow morning feeling clear.</h2>
            <p className="mx-auto mt-3 max-w-xl text-[16px] text-subtle-foreground">Set up takes a couple of minutes. Or look around the demo first.</p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">Get Started</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/demo">Explore Demo</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-[13px] text-muted-foreground sm:flex-row sm:px-6">
          <Logo className="scale-90" />
          <p>Built with care for calmer days.</p>
        </div>
      </footer>
    </div>
  );
}
