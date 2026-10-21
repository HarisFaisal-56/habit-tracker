import { describe, expect, it } from "vitest";
import { makeCompletions, makeHabit, on } from "../../test/factories";
import { describeData } from "./describeData";

describe("describeData", () => {
  it("counts each kind of data with plurals", () => {
    const habit = makeHabit();
    expect(
      describeData({
        habits: [habit, makeHabit({ id: "b" })],
        completions: makeCompletions(habit.id, on("full", "2025-01-01")),
        weeklyReviews: [],
      }),
    ).toBe("2 habits, 1 check-in and 0 reviews");
  });
});
