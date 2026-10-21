import type { NewHabit } from "../../data/repository";

/** One-tap suggestions on the first-run welcome. Each has a tiny fallback and an identity. */
export const STARTER_HABITS: readonly NewHabit[] = [
  {
    name: "Read",
    emoji: "📚",
    color: "sky",
    schedule: { type: "daily" },
    minimumVersion: "Read one page",
    identity: "I am someone who reads",
  },
  {
    name: "Walk",
    emoji: "🚶",
    color: "emerald",
    schedule: { type: "daily" },
    minimumVersion: "Walk to the end of the street",
    identity: "I am someone who moves every day",
  },
  {
    name: "Drink water",
    emoji: "💧",
    color: "teal",
    schedule: { type: "daily" },
    minimumVersion: "One glass",
  },
  {
    name: "Meditate",
    emoji: "🧘",
    color: "violet",
    schedule: { type: "daily" },
    minimumVersion: "Three slow breaths",
    identity: "I am a calm person",
  },
  {
    name: "Work out",
    emoji: "🏋️",
    color: "orange",
    schedule: { type: "weekly", timesPerWeek: 3 },
    minimumVersion: "Ten push-ups",
    identity: "I am someone who trains",
  },
  {
    name: "Journal",
    emoji: "✍️",
    color: "amber",
    schedule: { type: "daily" },
    minimumVersion: "One sentence",
    identity: "I am someone who reflects",
  },
];
