import { describe, expect, it } from "vitest";
import type { Schedule } from "../../domain/habit";
import { describeSchedule } from "./describeSchedule";

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
