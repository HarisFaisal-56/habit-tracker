import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addDays,
  daysBetween,
  eachDay,
  getWeekday,
  isDateKey,
  maxDateKey,
  minDateKey,
  parseDateKey,
  startOfWeek,
  toDateKey,
  today,
} from "./dates";

// Node applies a changed TZ immediately; afterEach restores the configured zone.
function useTimeZone(timeZone: string): void {
  vi.stubEnv("TZ", timeZone);
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("test environment", () => {
  it("runs in a time zone with daylight saving time", () => {
    // DST tests below are meaningless if this isn't applied (see vite.config.ts).
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("America/New_York");
  });
});

describe("isDateKey", () => {
  it.each(["2025-01-01", "2024-02-29", "1999-12-31"])("accepts %s", (value) => {
    expect(isDateKey(value)).toBe(true);
  });

  it.each([
    "2025-02-29", // not a leap year
    "2025-13-01",
    "2025-04-31",
    "2025-1-01",
    "25-01-01",
    "2025/01/01",
    "2025-01-01T00:00:00Z",
    "",
  ])("rejects %j", (value) => {
    expect(isDateKey(value)).toBe(false);
  });
});

describe("parseDateKey", () => {
  it("returns local midnight, not UTC midnight", () => {
    const date = parseDateKey("2025-06-15");
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(5);
    expect(date.getDate()).toBe(15);
    expect(date.getHours()).toBe(0);
  });

  it("throws on invalid keys", () => {
    expect(() => parseDateKey("2025-02-30")).toThrow(RangeError);
  });

  it("finds the day when local midnight doesn't exist", () => {
    // Brazil's DST used to start at midnight, so 2018-11-04 began at 01:00.
    useTimeZone("America/Sao_Paulo");
    expect(parseDateKey("2018-11-04").getHours()).toBe(1);

    expect(toDateKey(parseDateKey("2018-11-04"))).toBe("2018-11-04");
    expect(addDays("2018-11-03", 1)).toBe("2018-11-04");
    expect(addDays("2018-11-04", 1)).toBe("2018-11-05");
    expect(daysBetween("2018-11-03", "2018-11-05")).toBe(2);
    expect(eachDay("2018-11-03", "2018-11-05")).toEqual(["2018-11-03", "2018-11-04", "2018-11-05"]);
  });
});

describe("toDateKey", () => {
  it("uses the local date late at night, even when UTC is already tomorrow", () => {
    // 23:30 in New York is 03:30 UTC the next day.
    expect(toDateKey(new Date(2025, 0, 31, 23, 30))).toBe("2025-01-31");
  });

  it("uses the local date just after midnight, even when UTC is still yesterday", () => {
    useTimeZone("Asia/Tokyo");
    expect(toDateKey(new Date(2025, 0, 1, 0, 15))).toBe("2025-01-01");
  });
});

describe("today", () => {
  it("returns the local date from the clock", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2025, 11, 31, 23, 59));
    expect(today()).toBe("2025-12-31");

    vi.setSystemTime(new Date(2026, 0, 1, 0, 0));
    expect(today()).toBe("2026-01-01");
  });

  it("is correct on DST change days", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2025, 2, 9, 23, 30)); // spring forward day
    expect(today()).toBe("2025-03-09");
    vi.setSystemTime(new Date(2025, 10, 2, 23, 30)); // fall back day
    expect(today()).toBe("2025-11-02");
  });
});

describe("addDays", () => {
  it.each([
    ["2025-01-31", 1, "2025-02-01"],
    ["2025-02-28", 1, "2025-03-01"],
    ["2024-02-28", 1, "2024-02-29"],
    ["2025-12-31", 1, "2026-01-01"],
    ["2026-01-01", -1, "2025-12-31"],
    ["2025-03-08", 1, "2025-03-09"], // into spring forward
    ["2025-03-09", 1, "2025-03-10"], // out of spring forward
    ["2025-11-02", 1, "2025-11-03"], // out of fall back
    ["2025-11-03", -1, "2025-11-02"],
    ["2025-01-01", 0, "2025-01-01"],
    ["2025-01-01", 365, "2026-01-01"],
  ])("%s %+d days is %s", (key, amount, expected) => {
    expect(addDays(key, amount)).toBe(expected);
  });
});

describe("daysBetween", () => {
  it("counts calendar days, including across DST changes", () => {
    expect(daysBetween("2025-03-08", "2025-03-10")).toBe(2);
    expect(daysBetween("2025-11-01", "2025-11-03")).toBe(2);
    expect(daysBetween("2025-01-01", "2026-01-01")).toBe(365);
    expect(daysBetween("2024-01-01", "2025-01-01")).toBe(366);
  });

  it("is negative when the end is earlier, and zero for the same day", () => {
    expect(daysBetween("2025-01-10", "2025-01-01")).toBe(-9);
    expect(daysBetween("2025-01-10", "2025-01-10")).toBe(0);
  });
});

describe("getWeekday", () => {
  it("uses 0 for Sunday through 6 for Saturday", () => {
    expect(getWeekday("2025-01-05")).toBe(0);
    expect(getWeekday("2025-01-06")).toBe(1);
    expect(getWeekday("2025-01-01")).toBe(3);
    expect(getWeekday("2025-03-01")).toBe(6);
  });
});

describe("startOfWeek", () => {
  it("returns the Monday on or before the date", () => {
    expect(startOfWeek("2025-01-06")).toBe("2025-01-06"); // Monday
    expect(startOfWeek("2025-01-08")).toBe("2025-01-06"); // Wednesday
    expect(startOfWeek("2025-01-12")).toBe("2025-01-06"); // Sunday belongs to the week before
  });

  it("crosses month and year boundaries", () => {
    expect(startOfWeek("2025-01-01")).toBe("2024-12-30");
    expect(startOfWeek("2025-03-01")).toBe("2025-02-24");
  });

  it("is unaffected by DST", () => {
    expect(startOfWeek("2025-03-09")).toBe("2025-03-03");
    expect(startOfWeek("2025-11-02")).toBe("2025-10-27");
  });
});

describe("eachDay", () => {
  it("lists every date inclusively", () => {
    expect(eachDay("2025-12-30", "2026-01-02")).toEqual([
      "2025-12-30",
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
    ]);
  });

  it("returns one day for a single-day range and none for a reversed one", () => {
    expect(eachDay("2025-01-01", "2025-01-01")).toEqual(["2025-01-01"]);
    expect(eachDay("2025-01-02", "2025-01-01")).toEqual([]);
  });

  it("neither skips nor repeats days across DST changes", () => {
    expect(eachDay("2025-03-08", "2025-03-10")).toEqual(["2025-03-08", "2025-03-09", "2025-03-10"]);
    expect(eachDay("2025-11-01", "2025-11-03")).toEqual(["2025-11-01", "2025-11-02", "2025-11-03"]);
  });

  it("covers a leap year in full", () => {
    expect(eachDay("2024-01-01", "2024-12-31")).toHaveLength(366);
  });
});

describe("minDateKey / maxDateKey", () => {
  it("compare chronologically", () => {
    expect(minDateKey("2025-01-10", "2024-12-31")).toBe("2024-12-31");
    expect(maxDateKey("2025-01-10", "2024-12-31")).toBe("2025-01-10");
    expect(maxDateKey("2025-01-10", "2025-01-10")).toBe("2025-01-10");
  });
});
