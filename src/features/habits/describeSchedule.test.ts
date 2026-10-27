import { describe, expect, it } from "vitest";
import type { Schedule } from "../../domain/habit";
import { makeHabit } from "../../test/factories";
import {
  describeSchedule,
  describeScheduleChip,
  describeScheduleShort,
  summarizeHabits,
} from "./describeSchedule";

const cases: [Schedule, string][] = [
  [{ type: "daily" }, "Every day"],
  [{ type: "days", days: [0, 1, 2, 3, 4, 5, 6] }, "Every day"],
  [{ type: "days", days: [1, 2, 3, 4, 5] }, "Weekdays"],
  [{ type: "days", days: [0, 6] }, "Weekends"],
  [{ type: "days", days: [5, 1, 3] }, "Mon, Wed, Fri"],
  [{ type: "days", days: [0, 1] }, "Mon, Sun"], // weeks start on Monday
  [{ type: "days", days: [3, 3] }, "Wed"],
  [{ type: "days", days: [] }, "No days chosen"],
  [{ type: "weekly", timesPerWeek: 1 }, "Once a week"],
  [{ type: "weekly", timesPerWeek: 3 }, "3 times a week"],
];

describe("describeSchedule", () => {
  it.each(cases)("describes %j as %s", (schedule, expected) => {
    expect(describeSchedule(schedule)).toBe(expected);
  });
});

describe("describeScheduleShort", () => {
  it("says Daily for daily habits and otherwise matches describeSchedule", () => {
    expect(describeScheduleShort({ type: "daily" })).toBe("Daily");
    expect(describeScheduleShort({ type: "days", days: [1, 3] })).toBe("Mon, Wed");
    expect(describeScheduleShort({ type: "weekly", timesPerWeek: 3 })).toBe("3 times a week");
  });
});

describe("summarizeHabits", () => {
  it("counts habits by kind and leaves out zero counts", () => {
    const habits = [
      makeHabit({ id: "a" }),
      makeHabit({ id: "b" }),
      makeHabit({ id: "c", schedule: { type: "weekly", timesPerWeek: 3 } }),
    ];
    expect(summarizeHabits(habits)).toBe("03 orbits · 2 daily · 1 weekly");
    expect(summarizeHabits([makeHabit({ schedule: { type: "days", days: [1] } })])).toBe(
      "01 orbit · 1 some days",
    );
  });
});

describe("describeScheduleChip", () => {
  it("shows the schedule, with weekly goals as a count", () => {
    expect(describeScheduleChip(makeHabit())).toBe("Daily");
    expect(describeScheduleChip(makeHabit({ schedule: { type: "days", days: [1, 3, 5] } }))).toBe(
      "Mon, Wed, Fri",
    );
    expect(describeScheduleChip(makeHabit({ schedule: { type: "weekly", timesPerWeek: 3 } }))).toBe(
      "3× a week",
    );
  });

  it("adds the minimum version", () => {
    expect(describeScheduleChip(makeHabit({ minimumVersion: "20" }))).toBe("Daily · Min 20");
  });
});
