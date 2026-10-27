import { describe, expect, it } from "vitest";
import { eachDay } from "../../domain/dates";
import { makeCompletions, makeHabit, on } from "../../test/factories";
import {
  buildStats,
  formatRate,
  formatRateChange,
  formatStreak,
  formatWeekProgress,
  getRateChange,
  getTrendLabels,
  rankByRate,
  smoothPath,
} from "./statsData";

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

describe("buildStats: comparison, trend and runs", () => {
  it("compares with the previous window and reports a point per day plus the runs", () => {
    const read = makeHabit({ id: "read", createdAt: "2025-01-01" });
    // Done 01-06..01-10; before that (01-01..01-05) nothing, so the previous week was worse.
    const completions = makeCompletions("read", on("full", ...eachDay("2025-01-06", today)));

    const stats = buildStats([read], completions, today, 5);

    expect(stats.trend).toHaveLength(5);
    expect(stats.trend.at(-1)).toBeCloseTo(5 / 7); // a week back from the 10th: 5 of 7 done
    expect(stats.overall.rate).toBe(1);
    expect(stats.previous.rate).toBe(0);
    expect(stats.run).toEqual({ current: 5, best: 5 });
    expect(stats.habits[0]?.previous.rate).toBe(0);
  });

  it("ranks habits by rate, best first, with no rate last", () => {
    const habits = ["a", "b", "c"].map((id) => makeHabit({ id, createdAt: "2025-01-06" }));
    const completions = [
      ...makeCompletions("a", on("full", "2025-01-06")),
      ...makeCompletions("b", on("full", "2025-01-06", "2025-01-07")),
    ];
    const stats = buildStats(habits, completions, today, 7);
    const later = makeHabit({ id: "d", createdAt: "2025-01-11" });
    const ranked = rankByRate([...stats.habits, ...buildStats([later], [], today, 7).habits]);

    expect(ranked.map((s) => s.habit.id)).toEqual(["b", "a", "c", "d"]);
  });
});

describe("formatRateChange", () => {
  it("shows whole percentage points with a sign", () => {
    expect(formatRateChange(0.82, 0.76)).toBe("+6 pts");
    expect(formatRateChange(0.5, 0.6)).toBe("−10 pts");
    expect(formatRateChange(0.5, 0.5)).toBe("0 pts");
  });

  it("is null without something to compare", () => {
    expect(formatRateChange(null, 0.5)).toBeNull();
    expect(formatRateChange(0.5, null)).toBeNull();
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

describe("getRateChange", () => {
  it("is the difference in whole points", () => {
    expect(getRateChange(0.82, 0.76)).toBe(6);
    expect(getRateChange(0.5, 0.534)).toBe(-3);
    expect(getRateChange(0.5, null)).toBeNull();
  });
});

describe("getTrendLabels", () => {
  it("labels the start and the middle of the window", () => {
    expect(getTrendLabels("2026-10-21", 30)).toEqual(["22 SEP", "6 OCT"]);
    expect(getTrendLabels("2026-10-21", 7)).toEqual(["15 OCT", "18 OCT"]);
    expect(getTrendLabels("2026-10-21", 90)).toEqual(["24 JUL", "6 SEP"]);
  });
});

describe("smoothPath", () => {
  it("curves between points with control points halfway across", () => {
    expect(
      smoothPath([
        { x: 0, y: 10 },
        { x: 10, y: 0 },
      ]),
    ).toBe("M0.0 10.0 C5.0 10.0 5.0 0.0 10.0 0.0");
  });

  it("is empty without points", () => {
    expect(smoothPath([])).toBe("");
  });
});
