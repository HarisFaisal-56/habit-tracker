import type { AppData } from "../../data/repository";

function count(n: number, singular: string, plural = `${singular}s`): string {
  return `${String(n)} ${n === 1 ? singular : plural}`;
}

/** "3 habits, 120 check-ins and 2 reviews". */
export function describeData({ habits, completions, weeklyReviews }: AppData): string {
  return `${count(habits.length, "habit")}, ${count(completions.length, "check-in")} and ${count(weeklyReviews.length, "review")}`;
}
