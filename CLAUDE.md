# Habit Tracker: Project Spec

A personal, local-first habit tracker. Built as a mobile-first PWA now, designed so it can be wrapped as an Android app with Capacitor later without a rewrite.

## Product goals

- Fast daily flow: open app, tap habits, done. No login, no account, works offline.
- Forgiving streaks, not punishing ones.
- Clean, calm, mobile-first UI (design for 390px width first, scale up to desktop).
- All data stays on the device. Export/import as JSON for backup.

## Locked stack (do not substitute without asking)

| Layer | Choice |
|---|---|
| Language | TypeScript (strict mode) |
| UI | React (latest stable) |
| Build tool | Vite |
| Styling | Tailwind CSS (+ clsx for conditional classes) |
| Routing | React Router |
| State | Zustand (UI state only; data lives in the database) |
| Database | Dexie.js (IndexedDB), accessed ONLY through the repository layer |
| Reactive queries | dexie-react-hooks (`useLiveQuery`) |
| Dates | date-fns |
| IDs | `crypto.randomUUID()` |
| Charts | Custom SVG for heatmap and progress rings; Recharts only if a real chart is needed |
| Icons | lucide-react |
| PWA | vite-plugin-pwa (manifest + service worker, offline-first) |
| Validation | Zod (validate imported JSON backups) |
| Testing | Vitest (unit tests for all logic) + React Testing Library (key components) |
| Lint/format | ESLint + Prettier |
| Package manager | npm |
| Hosting (later) | Vercel, Netlify or Cloudflare Pages |
| Mobile wrapper (later) | Capacitor (+ Local Notifications plugin) |
| Cloud sync (later, optional) | Supabase, behind the repository interface |

Not in scope for now: backend server, authentication, Redux, CSS-in-JS, UI component libraries heavier than Tailwind.

## Architecture rules (important for the later mobile shift)

1. **Logic is separate from UI.** Streak, schedule and stats calculations live in `src/domain/` as pure TypeScript functions. No React, no Dexie, no `Date.now()` inside them (pass the date in).
2. **Storage is behind an interface.** UI and stores call `HabitRepository` (see `src/data/repository.ts`). The Dexie implementation is one implementation of it. A Supabase or sync implementation can be added later without touching UI code.
3. **Dates are local `YYYY-MM-DD` strings** (never UTC timestamps for "which day a completion belongs to"). Use one helper, `today()`, in `src/domain/dates.ts`, so it can be mocked in tests.
4. **Mobile-first layout.** Touch targets at least 44px, bottom tab navigation, safe-area padding (`env(safe-area-inset-*)`), no hover-only interactions.
5. **Offline-first.** The app must work fully with no network.
6. **No browser-only APIs scattered around.** Wrap notifications, file export/import and sharing in `src/platform/` so Capacitor equivalents can be swapped in later.

## Folder structure

```
src/
  domain/          # pure logic + types (habit.ts, streaks.ts, schedule.ts, stats.ts, dates.ts)
  data/            # repository.ts (interface), dexieRepository.ts, db.ts, backup.ts
  platform/        # notifications.ts, files.ts (web impl now, Capacitor later)
  store/           # Zustand stores (UI state only)
  features/
    today/         # home screen: today's habits, check-off
    habits/        # add/edit/archive/reorder habits
    history/       # calendar + heatmap
    stats/         # per-habit and overall stats
    review/        # weekly review
    settings/      # theme, export/import, about
  components/      # shared UI (Button, Sheet, ProgressRing, Heatmap, EmojiPicker, ...)
  app/             # router, layout, tab bar, providers
  main.tsx
tests/             # or co-located *.test.ts files
```

## Data model

```ts
type Schedule =
  | { type: "daily" }
  | { type: "days"; days: number[] }            // 0 = Sun ... 6 = Sat
  | { type: "weekly"; timesPerWeek: number };   // flexible goal, any days

type Habit = {
  id: string;
  name: string;
  emoji: string;
  color: string;                // from a fixed palette
  identity?: string;            // e.g. "I am someone who reads"
  minimumVersion?: string;      // tiny fallback, e.g. "Read one page"
  schedule: Schedule;
  reminderTime?: string;        // "HH:mm", used when notifications are supported
  sortOrder: number;
  createdAt: string;            // YYYY-MM-DD
  archived: boolean;
};

type Completion = {
  id: string;
  habitId: string;
  date: string;                 // YYYY-MM-DD
  kind: "full" | "minimum" | "skipped";
  note?: string;
};

type WeeklyReview = {
  id: string;
  weekStart: string;            // YYYY-MM-DD (Monday)
  wins: string;
  struggles: string;
  intention: string;
};
```

Add a `schemaVersion` to exported backups and use Dexie versioned migrations for any schema change.

## Signature features (what makes this app unique)

1. **Never miss twice streaks.** A single missed scheduled day does not break the streak; two consecutive missed scheduled days do.
2. **Skip days.** A `skipped` completion (sick, travelling) is neutral: it neither counts as done nor breaks the streak.
3. **Flexible weekly goals.** "3 times a week" habits track weekly progress instead of a daily streak (week streak = consecutive weeks goal was met).
4. **Minimum version.** A `minimum` completion counts toward the streak but is shown differently (half-filled) so bad days still count.
5. **Identity framing.** Optional identity statement shown on the habit and in the weekly review.
6. **Year heatmap** per habit (GitHub-style SVG grid).
7. **Weekly review** screen every Sunday: wins, struggles, one intention for next week.

All streak rules must be implemented in `src/domain/streaks.ts` as pure functions with thorough Vitest tests (edge cases: month/year boundaries, DST, skipped days, habit created mid-week, archived habits).

## Screens

- **Today**: date header, progress ring (done / due today), list of habit tiles with one-tap check-off, long-press or swipe for minimum/skip/note.
- **Habits**: list, add/edit in a bottom sheet, reorder, archive.
- **History**: month calendar plus per-habit heatmap.
- **Stats**: current/best streak, completion rate (7/30/90 days), weekly goal progress.
- **Review**: weekly review form and past reviews.
- **Settings**: light/dark/system theme, export/import JSON, reset data, about.

## Build phases (do in order, commit after each)

1. **Scaffold**: Vite + React + TS + Tailwind + ESLint/Prettier + Vitest + router + tab layout.
2. **Domain + data**: types, dates helper, repository interface, Dexie implementation, streak/schedule/stats logic with tests.
3. **Today + Habits screens**: add/edit/archive, check-off with `full`, `minimum`, `skipped`.
4. **History + Stats**: calendar, heatmap, stats.
5. **Weekly review** and identity framing.
6. **PWA + polish**: manifest, icons, service worker, install prompt, dark mode, empty states, onboarding, JSON export/import with Zod validation.
7. **Notifications (web)** behind `src/platform/notifications.ts`, degrade gracefully when unsupported.

Later (only when asked): Capacitor Android build, native notifications, Supabase sync.

## Conventions

- Function components and hooks only. Named exports.
- Strict TypeScript, no `any`. Prefer `type` aliases for data shapes.
- Components stay small; extract logic into hooks or `domain/`.
- Accessible by default: labels on inputs and buttons, visible focus, respects `prefers-reduced-motion` and `prefers-color-scheme`.
- No inline magic numbers for colors/spacing; use Tailwind tokens and the fixed habit color palette.
- Write tests for every function in `src/domain/` before or alongside implementing it.

## Commands

```
npm install
npm run dev         # local dev server
npm run build       # production build
npm run preview     # preview production build
npm run test        # vitest
npm run lint        # eslint
npm run format      # prettier
```

## Definition of done (for each phase)

- `npm run lint`, `npm run test` and `npm run build` all pass.
- Works at 390px width and on desktop, in light and dark mode.
- Works offline after first load (once PWA is added).
- No console errors or warnings.
- Brief summary of what changed and any decisions made.

## Git rules (IMPORTANT)

- **Do NOT add Claude as a contributor or co-author.** Never add `Co-Authored-By: Claude ...`, `Co-authored-by` trailers naming Claude or Anthropic, `Claude-Session:` trailers, or "Generated with Claude Code" lines to ANY commit message, pull request title/description, or code comment.
- Commits must contain only the commit message itself, with no trailers or attribution footers.
- Never set the git author or committer to Claude or `noreply@anthropic.com`. Use the repository owner's configured git identity.
- This applies every time you commit, push, amend, squash or open a pull request, including follow-up changes.
- Before pushing, check `git log -1 --format=%B` and remove any attribution line that slipped in.
- `.claude/settings.json` in this repo also disables attribution. Do not delete or change it.

## Working agreement

- Follow this spec. If something here is ambiguous or needs a change, ask before deviating.
- Make small, reviewable changes; one feature per commit.
- Don't add dependencies outside the locked stack without asking.
