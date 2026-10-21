import type { DateKey, Weekday } from "./dates";

export type Schedule =
  | { type: "daily" }
  | { type: "days"; days: Weekday[] } // 0 = Sun ... 6 = Sat
  | { type: "weekly"; timesPerWeek: number }; // flexible goal, any days

export type Habit = {
  id: string;
  name: string;
  emoji: string;
  color: string; // from a fixed palette
  identity?: string; // e.g. "I am someone who reads"
  minimumVersion?: string; // tiny fallback, e.g. "Read one page"
  schedule: Schedule;
  reminderTime?: string; // "HH:mm", used when notifications are supported
  sortOrder: number;
  createdAt: DateKey;
  archived: boolean;
};

export type CompletionKind = "full" | "minimum" | "skipped";

export type Completion = {
  id: string;
  habitId: string;
  date: DateKey;
  kind: CompletionKind;
  note?: string;
};

export type WeeklyReview = {
  id: string;
  weekStart: DateKey; // Monday
  wins: string;
  struggles: string;
  intention: string;
};
