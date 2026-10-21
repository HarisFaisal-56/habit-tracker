import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { makeHabit } from "../test/factories";
import {
  backupFileName,
  BACKUP_SCHEMA_VERSION,
  createBackup,
  parseBackup,
  serializeBackup,
  type Backup,
} from "./backup";
import { createDatabase } from "./db";
import { createDexieRepository } from "./dexieRepository";

function validBackup(): Backup {
  return createBackup(
    {
      habits: [
        makeHabit({ id: "h1", identity: "I am a reader", minimumVersion: "One page" }),
        makeHabit({ id: "h2", schedule: { type: "weekly", timesPerWeek: 3 }, archived: true }),
      ],
      completions: [
        { id: "c1", habitId: "h1", date: "2025-01-02", kind: "full", note: "Good" },
        { id: "c2", habitId: "h1", date: "2025-01-03", kind: "minimum" },
        { id: "c3", habitId: "h2", date: "2025-01-03", kind: "skipped" },
      ],
      weeklyReviews: [
        { id: "r1", weekStart: "2024-12-30", wins: "Read", struggles: "", intention: "More" },
      ],
    },
    new Date("2025-01-05T10:00:00Z"),
  );
}

/** Serializes a backup after applying a change to its raw JSON. */
function withChange(change: (raw: Record<string, unknown> & Backup) => void): string {
  const raw = structuredClone(validBackup()) as Record<string, unknown> & Backup;
  change(raw);
  return JSON.stringify(raw);
}

/** The item at `index`, failing the test if it's missing. */
function at<T>(items: T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`no item at ${String(index)}`);
  return item;
}

function errorFor(text: string): string {
  const result = parseBackup(text);
  if (result.ok) throw new Error("expected the backup to be rejected");
  return result.error;
}

describe("createBackup / serializeBackup", () => {
  it("tags the data with the app, schema version and export time", () => {
    const backup = validBackup();
    expect(backup).toMatchObject({
      app: "habit-tracker",
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: "2025-01-05T10:00:00.000Z",
    });
    expect(JSON.parse(serializeBackup(backup))).toEqual(backup);
  });

  it("names files by date", () => {
    expect(backupFileName("2025-01-05")).toBe("habit-tracker-backup-2025-01-05.json");
  });
});

describe("parseBackup", () => {
  it("accepts a valid backup and round-trips it", () => {
    const result = parseBackup(serializeBackup(validBackup()));
    expect(result).toEqual({ ok: true, backup: validBackup() });
  });

  it("drops unknown fields", () => {
    const result = parseBackup(
      withChange((raw) => {
        (raw.habits[0] as unknown as Record<string, unknown>).evil = "<script>";
        raw.extra = true;
      }),
    );
    expect(result.ok && "evil" in (result.backup.habits[0] ?? {})).toBe(false);
    expect(result.ok && "extra" in result.backup).toBe(false);
  });

  it("rejects text that isn't JSON or isn't a backup", () => {
    expect(errorFor("not json")).toMatch(/isn't valid JSON/);
    expect(errorFor("[]")).toMatch(/isn't a Habit Tracker backup/);
    expect(errorFor(JSON.stringify({ app: "other-app" }))).toMatch(/isn't a Habit Tracker backup/);
  });

  it("asks to update the app for backups from a newer version", () => {
    const text = withChange((raw) => {
      (raw as Record<string, unknown>).schemaVersion = BACKUP_SCHEMA_VERSION + 1;
    });
    expect(errorFor(text)).toMatch(/newer version of the app/);
  });

  it.each([
    [
      "an invalid date",
      (raw: Backup) => {
        Object.assign(at(raw.habits, 0), { createdAt: "2025-02-30" });
      },
      "habits[0].createdAt must be a real date as YYYY-MM-DD",
    ],
    [
      "an unknown completion kind",
      (raw: Backup) => {
        (raw.completions[0] as unknown as Record<string, unknown>).kind = "done";
      },
      "completions[0].kind",
    ],
    [
      "a weekday outside 0-6",
      (raw: Backup) => {
        Object.assign(at(raw.habits, 0), { schedule: { type: "days", days: [1, 7] } });
      },
      "habits[0].schedule.days[1]",
    ],
    [
      "a weekly goal above 7",
      (raw: Backup) => {
        Object.assign(at(raw.habits, 0), { schedule: { type: "weekly", timesPerWeek: 8 } });
      },
      "habits[0].schedule.timesPerWeek",
    ],
    [
      "a blank habit name",
      (raw: Backup) => {
        Object.assign(at(raw.habits, 0), { name: "   " });
      },
      "habits[0].name",
    ],
    [
      "a malformed reminder time",
      (raw: Backup) => {
        Object.assign(at(raw.habits, 0), { reminderTime: "25:00" });
      },
      "habits[0].reminderTime must be a time as HH:mm",
    ],
    [
      "duplicate habit ids",
      (raw: Backup) => {
        Object.assign(at(raw.habits, 1), { id: "h1" });
      },
      "habits[1].id is used by more than one habit",
    ],
    [
      "a check-in for a missing habit",
      (raw: Backup) => {
        Object.assign(at(raw.completions, 0), { habitId: "nope" });
      },
      "completions[0].habitId doesn't match any habit",
    ],
    [
      "two check-ins for one habit on one day",
      (raw: Backup) => {
        Object.assign(at(raw.completions, 1), { date: "2025-01-02" });
      },
      "completions[1] is a second check-in for the same habit on the same day",
    ],
    [
      "a review week that doesn't start on Monday",
      (raw: Backup) => {
        Object.assign(at(raw.weeklyReviews, 0), { weekStart: "2024-12-31" });
      },
      "weeklyReviews[0].weekStart must be a Monday",
    ],
    [
      "an export time that isn't a timestamp",
      (raw: Backup) => {
        raw.exportedAt = "last Tuesday";
      },
      "exportedAt",
    ],
    [
      "a missing list",
      (raw: Backup) => {
        delete (raw as Partial<Backup>).completions;
      },
      "completions",
    ],
  ])("rejects %s", (_, change, expected) => {
    expect(errorFor(withChange(change))).toContain(expected);
  });

  it("mentions how many other problems there are", () => {
    const text = withChange((raw) => {
      Object.assign(at(raw.habits, 0), { createdAt: "bad" });
      Object.assign(at(raw.habits, 1), { createdAt: "bad" });
    });
    expect(errorFor(text)).toMatch(/\(and 1 more\)\.$/);
  });
});

describe("backup round trip through the repository", () => {
  const freshRepository = () =>
    createDexieRepository(createDatabase("backup", { indexedDB: new IDBFactory(), IDBKeyRange }));

  it("restores exactly what was exported", async () => {
    const source = freshRepository();
    const backup = validBackup();
    await source.replaceAllData(backup);
    const exported = createBackup(await source.exportData(), new Date("2025-01-06T00:00:00Z"));

    const parsed = parseBackup(serializeBackup(exported));
    if (!parsed.ok) throw new Error(parsed.error);
    const target = freshRepository();
    await target.replaceAllData(parsed.backup);

    expect(await target.exportData()).toEqual(await source.exportData());
    expect(await target.listHabits({ includeArchived: true })).toHaveLength(2);
  });
});
