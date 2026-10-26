# LifeOS

A calm, intelligent personal dashboard for tasks, habits, goals, notes and your calendar, with a daily planner, an explainable "Life Radar", and a What-If Studio for trying decisions before you make them.

- **Demo mode** at `/demo` runs entirely in the browser on sample data (stored in `localStorage` under `lifeos:demo:v1`). It never touches real accounts.
- **Your space** at `/app` uses Firebase Authentication and Cloud Firestore, protected by per-user security rules.
- **AI is optional.** Plan My Day always works with a deterministic, rule-based planner. If you add an Anthropic API key and turn AI on in Settings, Claude suggests the order and explains each pick; LifeOS still does all the time placement itself.

## Stack

Next.js 16 (App Router, TypeScript strict), Tailwind CSS v4, Radix primitives (shadcn-style components), Lucide icons, Motion, React Hook Form + Zod, Recharts, react-big-calendar, date-fns + @date-fns/tz, Zustand, Firebase (Auth, Firestore, Admin SDK), the Anthropic TypeScript SDK, Vitest and Playwright.

## Quick start

```bash
npm install
npm run dev            # http://localhost:3000, the demo works with no setup
```

Without Firebase settings, `/login`, `/signup` and `/app` show a friendly "accounts aren't connected yet" screen.

### Run real accounts locally, without a Firebase project

The Firebase Emulator Suite gives you working sign-up, sign-in and Firestore (with the real security rules) on your machine. It needs Java 11+.

```bash
npm run emulators       # terminal 1: Auth on :9099, Firestore on :8080, UI on :4000
npm run dev:emulators   # terminal 2: the app, wired to the emulators via .env.emulators
```

### Run against your own Firebase project

Follow [docs/firebase-setup.md](docs/firebase-setup.md), then copy `.env.example` to `.env.local` and fill it in.

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `..._AUTH_DOMAIN`, `..._PROJECT_ID`, `..._STORAGE_BUCKET`, `..._MESSAGING_SENDER_ID`, `..._APP_ID` | `.env.local` | Your Firebase web app config (public identifiers, not secrets). On App Hosting these are filled in automatically from `FIREBASE_WEBAPP_CONFIG`. |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | `.env.local` only | Service account JSON, for the Admin SDK during local development. Never commit it. Not needed on App Hosting, which uses its own service account. |
| `ANTHROPIC_API_KEY` | `.env.local` / App Hosting secret | Optional. Enables Claude-assisted planning. |
| `ANTHROPIC_MODEL` | optional | Overrides the model (default `claude-opus-5-5`). |
| `AI_DAILY_LIMIT` | optional | AI plan requests per user per day (default 20). |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint (Next + React Hooks rules) |
| `npm run typecheck` | Generates route types and runs `tsc --noEmit` |
| `npm test` | Unit tests (Vitest): dates and DST, streaks, planner, Life Radar, What-If, quick add, ops, sanitising, redirects, AI contract |
| `npm run test:rules` | Firestore security rules tests, run inside the Firestore emulator |
| `npm run test:e2e` | Playwright tests of the landing page and demo, desktop and mobile |
| `E2E_LIVE=1 E2E_PORT=3000 npx playwright test account` | Full account journey against the emulators (sign up, onboard, save, sign out, sign in, delete) |
| `npm run deploy:rules` | Deploys `firestore.rules` and indexes to the Firebase project selected with `firebase use` |

## How it fits together

```
src/
  app/                 routes: landing, login, signup, onboarding, [space]/... (demo | app), api/*
  proxy.ts             optimistic redirect to /login when there is no session cookie
  components/          ui primitives, layout shell, and one folder per feature
  lib/
    domain/            types, Zod schemas, habit/goal/task logic, quick-add parser
    data/              LifeBackend interface, demo + Firestore backends, store, actions, ops
    scheduling/        intervals, free time, conflicts, the deterministic planner
    radar/             Life Radar rules (each insight carries its reasoning)
    scenarios/         What-If simulation and "apply" ops
    insights/          metrics for the Insights page
    ai/                request/response contract and prompt for /api/ai/plan
    firebase/          client SDK, Admin SDK, session helpers
    auth/              client auth helpers, safe redirects
firestore.rules        per-user rules with field validation
tests/                 unit, rules and e2e tests
```

### Data model (Firestore)

All data for a person lives under their own user document:

| Path | Contents |
| --- | --- |
| `users/{uid}` | Profile: display name, time zone, week start, planning preferences, AI consent, onboarding time |
| `users/{uid}/categories/{id}` | Name and pastel colour |
| `users/{uid}/tasks/{id}` | Title, notes, status, priority, due date/time, estimate, category, goal, completion time |
| `users/{uid}/habits/{id}` | Name, schedule (daily or chosen weekdays), preferred time, duration, status, start date |
| `users/{uid}/habitCompletions/{habitId_date}` | One document per completed day |
| `users/{uid}/goals/{id}` and `.../milestones/{id}` | Goals; progress comes only from completed milestones |
| `users/{uid}/notes/{id}` | Markdown body, tags, pinned/archived, optional goal and task links |
| `users/{uid}/events/{id}` | Timed events as UTC instants; all-day events as local dates |
| `users/{uid}/dailyPlans/{id}` | Accepted or skipped plans, with their items and notes |
| `users/{uid}/scenarios/{id}` | What-If scenarios; they never affect real data until applied |
| `users/{uid}/insightStates/{id}` | Dismissed or snoozed Life Radar insights |
| `aiUsage/{uid}` | Daily AI request counter, written only by the server |

Dates are stored as `YYYY-MM-DD` in the person's time zone and instants as ISO UTC strings, so streaks, "today" and plans follow the profile time zone, including across daylight-saving changes.

### Security

- `/app` is protected twice: the proxy redirects when there is no session cookie, and the layout verifies the httpOnly `__session` cookie with the Admin SDK (including revocation) on every request.
- Session cookies are created only from a sign-in less than five minutes old, and state-changing routes check the request origin.
- Firestore rules let only the signed-in owner read or write `users/{uid}/**`, check every field's type and length, require document ids to match, and keep `createdAt` fixed. Linked ids are always resolved inside the owner's own subtree, so a record can't point at another person's data. The rules tests write every record the app produces and confirm the rules accept them.
- Notes, descriptions and AI output are treated as untrusted. Markdown is rendered without raw HTML and passed through DOMPurify; links are limited to safe schemes. Records loaded from Firestore are re-validated with Zod.
- The AI route checks the session, reads consent from the stored profile (not from the request), enforces a per-user daily limit in a transaction, sends only task titles, priorities, dates, estimates and commitment times (never notes, descriptions or locations), validates Claude's answer with Zod, and drops any id that isn't one of the candidates. Any failure falls back to the rule-based plan.
- Account deletion requires the current password, then deletes all Firestore data and the Auth user on the server. Data export downloads everything as JSON.
- Accessibility: WCAG 2.2 AA contrast for text and controls, visible focus, labelled controls, keyboard support from Radix, a table view for every chart, and reduced-motion support.

## Deploying

LifeOS is set up for **Firebase App Hosting** (`apphosting.yaml`). Step-by-step instructions, including connecting GitHub and optional AI, are in [docs/firebase-setup.md](docs/firebase-setup.md).

See [PROGRESS.md](PROGRESS.md) for what's done and what's next.
