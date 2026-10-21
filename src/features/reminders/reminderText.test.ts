import { describe, expect, it } from "vitest";
import { makeHabit } from "../../test/factories";
import { formatReminderTime, reminderNotification } from "./reminderText";

describe("formatReminderTime", () => {
  it.each([
    ["00:00", "12:00 AM"],
    ["08:05", "8:05 AM"],
    ["12:30", "12:30 PM"],
    ["21:45", "9:45 PM"],
  ])("formats %s as %s", (time, expected) => {
    expect(formatReminderTime(time)).toBe(expected);
  });
});

describe("reminderNotification", () => {
  it("offers the minimum version when there is one", () => {
    const habit = makeHabit({ id: "h1", name: "Read", emoji: "📚", minimumVersion: "One page" });
    expect(reminderNotification(habit)).toEqual({
      title: "📚 Time for Read",
      body: "Short on time? “One page” still counts.",
      tag: "reminder-h1",
    });
  });

  it("falls back to the identity, then a gentle default", () => {
    expect(reminderNotification(makeHabit({ identity: "I am someone who reads" })).body).toBe(
      "I am someone who reads.",
    );
    expect(reminderNotification(makeHabit()).body).toBe(
      "A small step today keeps your streak going.",
    );
  });
});
