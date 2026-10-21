import { describe, expect, it } from "vitest";
import { eachDay } from "../../domain/dates";
import { makeCompletions, makeHabit, on } from "../../test/factories";
import { buildTodayList, summarizeItem, type TodayItem } from "./todayList";

const today = "2025-01-08"; // Wednesday

const ids = (items: TodayItem[]) => items.map((item) => item.habit.id);

describe("buildTodayList", () => {
  it("splits active habits into due and not due, keeping display order", () => {
    const habits = [
      makeHabit({ id: "daily" }),
      makeHabit({ id: "mon-fri", schedule: { type: "days", days: [1, 5] } }),
      makeHabit({ id: "wed", schedule: { type: "days", days: [3] } }),
      makeHabit({ id: "archived", archived: true }),
    ];

    const list = buildTodayList(habits, [], today);

    expect(ids(list.due)).toEqual(["daily", "wed"]);
    expect(ids(list.other)).toEqual(["mon-fri"]);
  });

  it("attaches today's completion and the streak", () => {
    const habit = makeHabit({ id: "read" });
    const completions = makeCompletions("read", on("full", "2025-01-06", "2025-01-07", today));

    const [item] = buildTodayList([habit], completions, today).due;

    expect(item?.completion?.kind).toBe("full");
    expect(item?.streak).toMatchObject({ unit: "days", current: 3 });
    expect(item?.week).toBeUndefined();
  });

  it("keeps habits in the due section once they're checked off or skipped", () => {
    const daily = makeHabit({ id: "daily" });
    const weekly = makeHabit({ id: "weekly", schedule: { type: "weekly", timesPerWeek: 2 } });
    const completions = [
      ...makeCompletions("daily", on("skipped", today)),
      // Logging today meets the weekly goal, but it should stay put until tomorrow.
      ...makeCompletions("weekly", on("full", "2025-01-06", today)),
    ];

    const list = buildTodayList([daily, weekly], completions, today);

    expect(ids(list.due)).toEqual(["daily", "weekly"]);
    expect(list.due[1]?.week).toMatchObject({ done: 2, target: 2, met: true });
  });

  it("moves a weekly goal met on an earlier day to the other section", () => {
    const weekly = makeHabit({ id: "weekly", schedule: { type: "weekly", timesPerWeek: 1 } });
    const list = buildTodayList(
      [weekly],
      makeCompletions("weekly", on("full", "2025-01-06")),
      today,
    );

    expect(ids(list.other)).toEqual(["weekly"]);
  });

  it("includes progress for the ring", () => {
    const habits = [makeHabit({ id: "a" }), makeHabit({ id: "b" })];
    const list = buildTodayList(habits, makeCompletions("a", on("minimum", today)), today);

    expect(list.progress).toEqual({ done: 1, due: 2 });
  });
});

describe("summarizeItem", () => {
  const itemFor = (habit = makeHabit(), days: Parameters<typeof makeCompletions>[1] = {}) => {
    const list = buildTodayList([habit], makeCompletions(habit.id, days), today);
    const [item] = [...list.due, ...list.other];
    if (!item) throw new Error("habit missing from today list");
    return item;
  };

  it("says nothing before a streak starts", () => {
    expect(summarizeItem(itemFor())).toBeNull();
  });

  it("shows a day streak", () => {
    const item = itemFor(makeHabit(), on("full", ...eachDay("2025-01-05", today)));
    expect(summarizeItem(item)).toEqual({ text: "4-day streak", tone: "normal" });
  });

  it("warns gently when the streak is one miss from breaking", () => {
    const item = itemFor(makeHabit(), on("full", "2025-01-05", "2025-01-06")); // missed 07
    expect(summarizeItem(item)).toEqual({
      text: "2-day streak · don’t miss twice",
      tone: "warning",
    });
  });

  it("shows weekly progress and week streaks", () => {
    const habit = makeHabit({ schedule: { type: "weekly", timesPerWeek: 3 } });
    expect(summarizeItem(itemFor(habit, on("full", "2025-01-06")))).toEqual({
      text: "1 of 3 this week",
      tone: "normal",
    });

    const olderHabit = { ...habit, createdAt: "2024-12-01" };
    const met = itemFor(olderHabit, {
      ...on("full", "2024-12-30", "2024-12-31", "2025-01-01"), // last week met
      ...on("full", "2025-01-06", "2025-01-07", today),
    });
    expect(summarizeItem(met)).toEqual({
      text: "Goal met this week · 2-week streak",
      tone: "success",
    });
  });

  it("explains a fully excused week", () => {
    const habit = makeHabit({ schedule: { type: "weekly", timesPerWeek: 1 } });
    expect(summarizeItem(itemFor(habit, on("skipped", "2025-01-06")))?.text).toBe(
      "Excused this week",
    );
  });
});
