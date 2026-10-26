import { addDays, startOfWeek, weekdayOf, zonedToISO, startOfLocalDay, endOfLocalDay, type LocalDate } from "@/lib/dates";
import { isScheduledOn, completionId } from "@/lib/domain/habits";
import {
  DEFAULT_PLANNING,
  type CalendarEvent,
  type Category,
  type Goal,
  type GoalMilestone,
  type Habit,
  type HabitCompletion,
  type LifeData,
  type Note,
  type Task,
} from "@/lib/domain/types";

/**
 * Sample data for demo mode. Everything is generated relative to "today" so
 * the demo always feels current. None of it is ever written to Firestore.
 */

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createDemoData(today: LocalDate, timezone: string, now = new Date()): LifeData {
  const ts = now.toISOString();
  const stamp = { createdAt: ts, updatedAt: ts };
  const at = (date: LocalDate, time: string) => zonedToISO(date, time, timezone);
  const rand = mulberry32(42);

  const categories: Category[] = [
    { id: "demo-cat-work", name: "Work", color: "lavender", ...stamp },
    { id: "demo-cat-health", name: "Health", color: "green", ...stamp },
    { id: "demo-cat-personal", name: "Personal", color: "peach", ...stamp },
    { id: "demo-cat-learning", name: "Learning", color: "blue", ...stamp },
    { id: "demo-cat-home", name: "Home", color: "yellow", ...stamp },
    { id: "demo-cat-social", name: "Social", color: "rose", ...stamp },
  ];

  const goals: Goal[] = [
    {
      id: "demo-goal-10k",
      title: "Run a 10K",
      description: "Build up gradually and finish the autumn city 10K feeling strong.",
      categoryId: "demo-cat-health",
      targetDate: addDays(today, 54),
      status: "active",
      ...stamp,
    },
    {
      id: "demo-goal-spanish",
      title: "Hold a 15-minute conversation in Spanish",
      description: "Practice a little every weekday and book a conversation session each month.",
      categoryId: "demo-cat-learning",
      targetDate: addDays(today, 120),
      status: "active",
      ...stamp,
    },
    {
      id: "demo-goal-website",
      title: "Launch my portfolio website",
      description: "A simple site with three case studies and a contact page.",
      categoryId: "demo-cat-work",
      targetDate: addDays(today, 21),
      status: "active",
      ...stamp,
    },
  ];

  const ms = (id: string, goalId: string, title: string, order: number, dueOffset: number | null, doneDaysAgo: number | null): GoalMilestone => ({
    id,
    goalId,
    title,
    order,
    dueDate: dueOffset === null ? null : addDays(today, dueOffset),
    completedAt: doneDaysAgo === null ? null : new Date(now.getTime() - doneDaysAgo * 86_400_000).toISOString(),
    ...stamp,
  });

  const milestones: GoalMilestone[] = [
    ms("demo-ms-10k-1", "demo-goal-10k", "Run 3 km without stopping", 0, -30, 31),
    ms("demo-ms-10k-2", "demo-goal-10k", "Run 5 km", 1, -10, 9),
    ms("demo-ms-10k-3", "demo-goal-10k", "Run 7 km", 2, 14, null),
    ms("demo-ms-10k-4", "demo-goal-10k", "Race day: 10 km", 3, 54, null),
    ms("demo-ms-es-1", "demo-goal-spanish", "Finish beginner course (A1)", 0, -20, 22),
    ms("demo-ms-es-2", "demo-goal-spanish", "Learn 500 common words", 1, 30, null),
    ms("demo-ms-es-3", "demo-goal-spanish", "First conversation session", 2, 45, null),
    ms("demo-ms-web-1", "demo-goal-website", "Pick a template and domain", 0, -6, 7),
    ms("demo-ms-web-2", "demo-goal-website", "Write three case studies", 1, 3, null),
    ms("demo-ms-web-3", "demo-goal-website", "Publish the site", 2, 21, null),
  ];

  let taskN = 0;
  const task = (t: Partial<Task> & Pick<Task, "title">): Task => ({
    id: `demo-task-${++taskN}`,
    notes: "",
    status: "open",
    priority: "medium",
    dueDate: null,
    dueTime: null,
    estimateMinutes: null,
    categoryId: null,
    goalId: null,
    completedAt: null,
    ...stamp,
    ...t,
  });

  const tasks: Task[] = [
    task({ title: "Finish quarterly presentation draft", priority: "high", dueDate: today, estimateMinutes: 90, categoryId: "demo-cat-work", notes: "Focus on the three key results and next quarter's plan." }),
    task({ title: "Reply to Maya about the workshop", dueDate: today, estimateMinutes: 15, categoryId: "demo-cat-work" }),
    task({ title: "Pick up prescription", dueDate: today, estimateMinutes: 20, categoryId: "demo-cat-personal", priority: "medium" }),
    task({ title: "Review design feedback", dueDate: today, estimateMinutes: 45, categoryId: "demo-cat-work", priority: "medium" }),
    task({ title: "Book dentist check-up", dueDate: addDays(today, -2), estimateMinutes: 10, categoryId: "demo-cat-health", priority: "low" }),
    task({ title: "Prepare notes for client meeting", priority: "high", dueDate: addDays(today, 1), dueTime: "10:00", estimateMinutes: 60, categoryId: "demo-cat-work" }),
    task({ title: "Submit expense report", dueDate: addDays(today, 1), estimateMinutes: 30, categoryId: "demo-cat-work" }),
    task({ title: "Write case study: onboarding redesign", priority: "high", dueDate: addDays(today, 2), estimateMinutes: 120, categoryId: "demo-cat-work", goalId: "demo-goal-website" }),
    task({ title: "Write case study: mobile banking app", priority: "medium", dueDate: addDays(today, 3), estimateMinutes: 120, categoryId: "demo-cat-work", goalId: "demo-goal-website" }),
    task({ title: "Spanish homework: past tense exercises", dueDate: addDays(today, 2), estimateMinutes: 30, categoryId: "demo-cat-learning", goalId: "demo-goal-spanish" }),
    task({ title: "Plan route for weekend hike", priority: "low", dueDate: addDays(today, 4), estimateMinutes: 25, categoryId: "demo-cat-personal" }),
    task({ title: "Renew passport", priority: "high", dueDate: addDays(today, 9), estimateMinutes: 45, categoryId: "demo-cat-personal" }),
    task({ title: "Buy new running shoes", priority: "medium", dueDate: addDays(today, 6), estimateMinutes: 40, categoryId: "demo-cat-health", goalId: "demo-goal-10k" }),
    task({ title: "Organize photo library", priority: "low", estimateMinutes: 60, categoryId: "demo-cat-home" }),
    task({ title: "Research standing desks", priority: "low", estimateMinutes: 30, categoryId: "demo-cat-home" }),
    task({ title: "Call grandma", priority: "medium", estimateMinutes: 30, categoryId: "demo-cat-social" }),
  ];

  // A realistic completed history for the insights page.
  const doneTitles = [
    ["Send weekly update", "demo-cat-work", 1],
    ["Clean out inbox", "demo-cat-work", 1],
    ["Grocery shopping", "demo-cat-home", 2],
    ["Pay electricity bill", "demo-cat-home", 3],
    ["Draft presentation outline", "demo-cat-work", 3],
    ["Renew gym membership", "demo-cat-health", 4],
    ["Choose portfolio template", "demo-cat-work", 7],
    ["Register domain name", "demo-cat-work", 7],
    ["Birthday gift for Sam", "demo-cat-social", 8],
    ["Fix leaking tap", "demo-cat-home", 9],
    ["Finish A1 Spanish unit test", "demo-cat-learning", 10],
    ["Update CV", "demo-cat-work", 11],
    ["Schedule car service", "demo-cat-personal", 12],
    ["Plan team offsite agenda", "demo-cat-work", 13],
    ["Return library books", "demo-cat-personal", 15],
    ["Sort recycling", "demo-cat-home", 16],
    ["Prepare tax documents", "demo-cat-personal", 18],
    ["Book flights for December", "demo-cat-personal", 20],
    ["Write retro notes", "demo-cat-work", 22],
    ["Meal prep for the week", "demo-cat-health", 23],
  ] as const;
  for (const [title, categoryId, daysAgo] of doneTitles) {
    const date = addDays(today, -daysAgo);
    const hour = 9 + Math.floor(rand() * 9);
    tasks.push(
      task({
        title,
        categoryId,
        status: "done",
        dueDate: date,
        estimateMinutes: [15, 30, 45, 60][Math.floor(rand() * 4)],
        completedAt: at(date, `${String(hour).padStart(2, "0")}:${rand() > 0.5 ? "15" : "40"}`),
      }),
    );
  }

  // Spread creation times so history charts have something real to show.
  for (const t of tasks) {
    const base = t.completedAt ? new Date(t.completedAt).getTime() : now.getTime();
    const created = new Date(base - (1 + Math.floor(rand() * (t.completedAt ? 6 : 14))) * 86_400_000).toISOString();
    t.createdAt = created;
    t.updatedAt = t.completedAt ?? created;
  }

  const habitStart = addDays(today, -55);
  const habits: Habit[] = [
    { id: "demo-habit-walk", name: "Morning walk", description: "20–30 minutes outside before work.", categoryId: "demo-cat-health", goalId: null, schedule: { type: "daily" }, preferredTime: "07:30", durationMinutes: 30, status: "active", startDate: habitStart, ...stamp },
    { id: "demo-habit-read", name: "Read 20 pages", description: "", categoryId: "demo-cat-learning", goalId: null, schedule: { type: "daily" }, preferredTime: "21:30", durationMinutes: 30, status: "active", startDate: habitStart, ...stamp },
    { id: "demo-habit-spanish", name: "Spanish practice", description: "One lesson in the app plus 10 flashcards.", categoryId: "demo-cat-learning", goalId: "demo-goal-spanish", schedule: { type: "weekdays", days: [1, 2, 3, 4, 5] }, preferredTime: "19:30", durationMinutes: 20, status: "active", startDate: habitStart, ...stamp },
    { id: "demo-habit-run", name: "Training run", description: "Follow the 10K plan.", categoryId: "demo-cat-health", goalId: "demo-goal-10k", schedule: { type: "weekdays", days: [2, 4, 6] }, preferredTime: "18:00", durationMinutes: 45, status: "active", startDate: habitStart, ...stamp },
    { id: "demo-habit-meditate", name: "Meditate", description: "Ten quiet minutes.", categoryId: "demo-cat-health", goalId: null, schedule: { type: "daily" }, preferredTime: "07:00", durationMinutes: 10, status: "active", startDate: habitStart, ...stamp },
    { id: "demo-habit-review", name: "Weekly review", description: "Look back, tidy lists, plan the week.", categoryId: "demo-cat-personal", goalId: null, schedule: { type: "weekdays", days: [0] }, preferredTime: "17:00", durationMinutes: 30, status: "active", startDate: habitStart, ...stamp },
    { id: "demo-habit-journal", name: "Evening journal", description: "", categoryId: "demo-cat-personal", goalId: null, schedule: { type: "daily" }, preferredTime: null, durationMinutes: null, status: "paused", startDate: habitStart, ...stamp },
  ];

  const rates: Record<string, number> = {
    "demo-habit-walk": 0.86,
    "demo-habit-read": 0.7,
    "demo-habit-spanish": 0.8,
    "demo-habit-run": 0.78,
    "demo-habit-meditate": 0.62,
    "demo-habit-review": 0.9,
    "demo-habit-journal": 0.4,
  };
  const habitCompletions: HabitCompletion[] = [];
  for (const habit of habits) {
    for (let i = 55; i >= 1; i--) {
      const date = addDays(today, -i);
      if (!isScheduledOn(habit, date)) continue;
      if (habit.status === "paused" && i < 20) continue;
      // Keep the last few days solid so streaks look lived-in.
      const p = i <= 4 ? Math.min(1, rates[habit.id] + 0.25) : rates[habit.id];
      if (rand() < p) {
        habitCompletions.push({ id: completionId(habit.id, date), habitId: habit.id, date, createdAt: at(date, "20:00"), updatedAt: at(date, "20:00") });
      }
    }
  }
  // Morning habits already done today.
  for (const hid of ["demo-habit-meditate"]) {
    habitCompletions.push({ id: completionId(hid, today), habitId: hid, date: today, ...stamp });
  }

  let evN = 0;
  const timed = (date: LocalDate, start: string, end: string, e: Partial<CalendarEvent> & Pick<CalendarEvent, "title">): CalendarEvent => ({
    id: `demo-event-${++evN}`,
    description: "",
    location: "",
    categoryId: null,
    allDay: false,
    start: at(date, start),
    end: at(date, end),
    startDate: null,
    endDate: null,
    ...stamp,
    ...e,
  });
  const allDay = (startDate: LocalDate, endDate: LocalDate, e: Partial<CalendarEvent> & Pick<CalendarEvent, "title">): CalendarEvent => ({
    id: `demo-event-${++evN}`,
    description: "",
    location: "",
    categoryId: null,
    allDay: true,
    start: startOfLocalDay(startDate, timezone).toISOString(),
    end: endOfLocalDay(endDate, timezone).toISOString(),
    startDate,
    endDate,
    ...stamp,
    ...e,
  });

  const events: CalendarEvent[] = [];
  // Weekday standups for this week and next.
  for (let i = -7; i <= 13; i++) {
    const d = addDays(today, i);
    const wd = weekdayOf(d);
    if (wd >= 1 && wd <= 5) events.push(timed(d, "09:30", "09:45", { title: "Team standup", categoryId: "demo-cat-work", location: "Video call" }));
  }
  events.push(
    timed(today, "11:00", "12:00", { title: "Design review", categoryId: "demo-cat-work", description: "Walk through the new onboarding flow with the product team." }),
    timed(today, "12:30", "13:30", { title: "Lunch with Sam", categoryId: "demo-cat-social", location: "Corner Café" }),
    timed(today, "15:00", "15:30", { title: "Call with accountant", categoryId: "demo-cat-personal" }),
    timed(addDays(today, 1), "10:00", "11:00", { title: "Client meeting", categoryId: "demo-cat-work", description: "Quarterly check-in. Bring the roadmap.", location: "Client office" }),
    timed(addDays(today, 1), "13:00", "16:30", { title: "Workshop facilitation", categoryId: "demo-cat-work" }),
    timed(addDays(today, 1), "16:30", "17:30", { title: "1:1 with manager", categoryId: "demo-cat-work" }),
    timed(addDays(today, 2), "14:00", "15:00", { title: "Product sync", categoryId: "demo-cat-work" }),
    timed(addDays(today, 2), "14:30", "15:15", { title: "Dentist appointment", categoryId: "demo-cat-health", location: "Smile Dental" }),
    timed(addDays(today, -1), "18:30", "20:00", { title: "Book club", categoryId: "demo-cat-social" }),
    timed(addDays(today, -3), "10:00", "11:30", { title: "Quarterly planning", categoryId: "demo-cat-work" }),
  );
  // A recurring evening class that collides with the training-run habit.
  for (let i = 0; i < 21; i++) {
    const d = addDays(today, i);
    if (weekdayOf(d) === 4) events.push(timed(d, "18:00", "19:00", { title: "Pottery class", categoryId: "demo-cat-personal", location: "Community studio" }));
  }
  // Next weekend away.
  const thisWeekStart = startOfWeek(today, 1);
  const nextSat = addDays(thisWeekStart, 12);
  events.push(allDay(nextSat, addDays(nextSat, 1), { title: "Weekend at the coast", categoryId: "demo-cat-personal", description: "Train leaves Saturday morning." }));
  events.push(allDay(addDays(today, 16), addDays(today, 16), { title: "Sam's birthday", categoryId: "demo-cat-social" }));

  const notes: Note[] = [
    {
      id: "demo-note-1",
      title: "Presentation outline",
      body: "## Quarterly presentation\n\n1. Where we started\n2. **Three key results**\n   - Onboarding completion up\n   - Support tickets down\n   - New partner launched\n3. What we learned\n4. Next quarter's focus\n\n> Keep it under 15 minutes. End with one clear ask.",
      tags: ["work", "presentation"],
      pinned: true,
      archived: false,
      goalId: null,
      taskId: "demo-task-1",
      ...stamp,
    },
    {
      id: "demo-note-2",
      title: "10K training plan",
      body: "### Weekly rhythm\n\n- **Tue** easy 4 km\n- **Thu** intervals 6 × 400 m\n- **Sat** long run, add 1 km each week\n\nRemember: rest days count as training.",
      tags: ["running", "health"],
      pinned: true,
      archived: false,
      goalId: "demo-goal-10k",
      taskId: null,
      ...stamp,
    },
    {
      id: "demo-note-3",
      title: "Spanish phrases to practise",
      body: "- ¿Qué tal tu fin de semana?\n- Me gustaría reservar una mesa.\n- ¿Podrías repetirlo más despacio?\n- Estoy aprendiendo español.",
      tags: ["spanish", "learning"],
      pinned: false,
      archived: false,
      goalId: "demo-goal-spanish",
      taskId: null,
      ...stamp,
    },
    {
      id: "demo-note-4",
      title: "Weekend at the coast: packing",
      body: "- [ ] Rain jacket\n- [ ] Walking shoes\n- [ ] Book\n- [ ] Chargers\n- [x] Train tickets",
      tags: ["travel"],
      pinned: false,
      archived: false,
      goalId: null,
      taskId: null,
      ...stamp,
    },
    {
      id: "demo-note-5",
      title: "Ideas for the portfolio",
      body: "Case studies should show **process**, not just final screens. Include one project that didn't go to plan and what changed because of it.",
      tags: ["website", "ideas"],
      pinned: false,
      archived: false,
      goalId: "demo-goal-website",
      taskId: null,
      ...stamp,
    },
  ];
  const noteAges = [0.1, 1, 2, 4, 6];
  notes.forEach((n, i) => {
    const updated = new Date(now.getTime() - (noteAges[i] ?? i) * 86_400_000).toISOString();
    n.updatedAt = updated;
    n.createdAt = new Date(now.getTime() - ((noteAges[i] ?? i) + 3) * 86_400_000).toISOString();
  });

  return {
    profile: {
      displayName: "Alex",
      timezone,
      weekStartsOn: 1,
      planning: { ...DEFAULT_PLANNING },
      aiConsent: false,
      onboardedAt: ts,
      createdAt: ts,
      updatedAt: ts,
    },
    categories,
    tasks,
    habits,
    habitCompletions,
    goals,
    milestones,
    notes,
    events,
    dailyPlans: [],
    scenarios: [
      {
        id: "demo-scenario-gym",
        title: "What if I go to the gym four times a week?",
        description: "",
        status: "draft",
        horizonStart: today,
        horizonDays: 14,
        changes: [
          { id: "demo-change-gym", type: "recurring_commitment", title: "Gym", days: [1, 2, 4, 6], startTime: "18:00", durationMinutes: 75, categoryId: "demo-cat-health", expense: 12 },
        ],
        appliedAt: null,
        ...stamp,
      },
    ],
    insightStates: [],
  };
}
