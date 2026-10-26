# LifeOS progress

Last updated: 2026-10-26

## Status by phase

| Phase | Scope | Status |
| --- | --- | --- |
| 1. Foundation | Next.js 16 app, design tokens (AA-checked pastel palette), UI primitives, app shell (240px sidebar, header with date, ⌘K search, quick add, avatar; mobile nav), domain types and Zod schemas, data layer with optimistic updates and rollback, demo mode | Done |
| 2. Accounts and data | Firebase Auth (email/password, password reset), httpOnly session cookies verified server-side, proxy redirects, skippable onboarding, Firestore backend with live listeners, security rules with field validation | Done |
| 3. Core features | Dashboard, Tasks, Habits, Goals and milestones, Notes (Markdown, autosave, tags, links), Calendar (month/week/day, conflicts, all-day events) | Done |
| 4. Intelligence | Life Radar (8 explainable rules, dismiss and snooze), What-If Studio (isolated scenarios, before/after metrics, apply only on confirm), Insights (from real data only) | Done |
| 5. AI and account safety | Plan My Day (deterministic planner plus optional Claude ordering via `/api/ai/plan` with consent, daily limit and fallback), data export, account deletion with re-authentication | Done |
| 6. Quality | Unit, rules and end-to-end tests, lint, production build, README, landing page with real screenshots | Done |

## Verified

- `npm test`: 38 unit tests pass.
- `npm run test:rules`: 11 security-rules tests pass in the Firestore emulator, including writing every record type the app produces.
- `npm run test:e2e`: 18 Playwright tests pass on desktop and mobile viewports (landing, demo dashboard, quick add, persistence, Plan My Day, Life Radar, What-If, no horizontal scroll on any page, signed-out redirect).
- The full account journey passes against the Firebase emulators: sign up, onboarding, saving and reloading data, sign out, wrong password, sign in, delete account, and sign-in refused afterwards.
- The AI route was exercised end to end against a local stand-in for the Messages API: consent off uses the rule-based planner, consent on uses the AI order and reasons, unknown ids are dropped, and the daily limit falls back to the rule-based planner. It has **not** been run against the real Anthropic API, because no key was available.
- `npm run lint`: no errors (3 informational warnings about React Compiler skipping React Hook Form components).
- `npm run build`: succeeds.

## Needs configuration (by the project owner)

- A Firebase project of your own, its web config in `.env.local`, rules deployed, and an App Hosting backend. See [docs/firebase-setup.md](docs/firebase-setup.md).
- Optional: an Anthropic API key stored as an App Hosting secret.

## Known limitations and ideas for later

- Sign-in is email and password only. Google sign-in would need its provider enabled and a popup-based re-authentication for account deletion.
- No external calendar sync (Google, Apple, Outlook).
- Recurring events are not modelled; recurring commitments exist only as What-If scenario changes and as habits.
- Firestore is read in full on load. That's fine for personal-scale data; very large histories would benefit from paging older completed tasks and habit completions.
- A Content Security Policy header isn't set yet; the other security headers are.
- The rules validate the top-level shape of plan items and scenario changes; their inner fields are validated by Zod in the app on read and write.
