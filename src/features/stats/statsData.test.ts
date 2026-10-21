import { describe, expect, it } from "vitest";
import { eachDay } from "../../domain/dates";
import { makeCompletions, makeHabit, on } from "../../test/factories";
import { buildStats, formatRate, formatStreak, formatWeekProgress } from "./statsData";

const today = "2025-01-10"; // Friday

describe("buildStats", () => {
  it("combines streaks, rates and this week's progress per habit", () => {
    const read = makeHabit({ id: "read", createdAt: "2025-01-01" });
    const gym = makeHabit({
      id: "gym",
      createdAt: "2025-01-01",
      schedule: { type: "weekly", timesPerWeek: 3 },
    });
    const completions = [
      ...makeCompletions("read", on("full", ...eachDay("2025-01-04", today))),
      ...makeCompletions("gym", on("full", "2025-01-06", "2025-01-08")),
    ];

    const { overall, habits } = buildStats([read, gym], completions, today, 7);

    expect(habits.map((stats) => stats.habit.id)).toEqual(["read", "gym"]);
    expect(habits[0]).toMatchObject({
      streak: { unit: "days", current: 7, best: 7 },
      rate: { done: 7, expected: 7, rate: 1 },
      week: { weekStart: "2025-01-06", done: 5, target: 7 },
    });
    expect(habits[1]).toMatchObject({
      streak: { unit: "weeks", current: 0 },
      week: { done: 2, target: 3, met: false },
    });
    expect(overall.rate).toBeGreaterThan(0.8);
    expect(overall.rate).toBeLessThan(1);
  });

  it("keeps archived habits in the list but out of the overall rate", () => {
    const active = makeHabit({ id: "a", createdAt: "2025-01-04" });
    const archived = makeHabit({ id: "b", createdAt: "2025-01-04", archived: true });
    const completions = makeCompletions("a", on("full", ...eachDay("2025-01-04", today)));

    const stats = buildStats([active, archived], completions, today, 7);

    expect(stats.habits).toHaveLength(2);
    expect(stats.habits[1]?.streak.current).toBe(0);
    expect(stats.overall.rate).toBe(1);
  });
});

describe("formatRate", () => {
  it("rounds to a whole percentage", () => {
    expect(formatRate(1)).toBe("100%");
    expect(formatRate(5 / 6)).toBe("83%");
    expect(formatRate(0)).toBe("0%");
  });

  it("shows a dash when nothing was expected", () => {
    expect(formatRate(null)).toBe("–");
  });
});

describe("formatStreak", () => {
  it("uses the right unit and plural", () => {
    expect(formatStreak(1, "days")).toBe("1 day");
    expect(formatStreak(5, "days")).toBe("5 days");
    expect(formatStreak(0, "weeks")).toBe("0 weeks");
    expect(formatStreak(1, "weeks")).toBe("1 week");
  });
});

describe("formatWeekProgress", () => {
  const week = (done: number, target: number) => ({
    weekStart: "2025-01-06",
    done,
    skipped: 0,
    target,
    met: done >= target,
  });

  it("counts times for weekly goals and days for fixed schedules", () => {
    expect(formatWeekProgress(week(2, 3), { type: "weekly", timesPerWeek: 3 })).toBe(
      "2 of 3 times",
    );
    expect(formatWeekProgress(week(3, 5), { type: "daily" })).toBe("3 of 5 days");
  });

  it("explains an empty target", () => {
    expect(formatWeekProgress(week(0, 0), { type: "weekly", timesPerWeek: 1 })).toBe(
      "Excused this week",
    );
    expect(formatWeekProgress(week(0, 0), { type: "days", days: [1] })).toBe(
      "Nothing due this week",
    );
  });
});
