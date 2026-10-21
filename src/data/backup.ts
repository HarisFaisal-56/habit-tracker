import { z } from "zod";
import { isDateKey, startOfWeek, type DateKey } from "../domain/dates";
import type { AppData } from "./repository";

/** Bump when the backup format changes, and add a migration in `parseBackup`. */
export const BACKUP_SCHEMA_VERSION = 1;
const BACKUP_APP = "habit-tracker";

export type Backup = AppData & {
  app: typeof BACKUP_APP;
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  /** ISO timestamp. */
  exportedAt: string;
};

export function createBackup(data: AppData, exportedAt: Date): Backup {
  return {
    app: BACKUP_APP,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: exportedAt.toISOString(),
    ...data,
  };
}

export function serializeBackup(backup: Backup): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export function backupFileName(today: DateKey): string {
  return `habit-tracker-backup-${today}.json`;
}

const id = z.string().min(1);
const dateKey = z.string().refine(isDateKey, { message: "must be a real date as YYYY-MM-DD" });
const optionalText = z.string().optional();

const scheduleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("daily") }),
  z.object({ type: z.literal("days"), days: z.array(z.literal([0, 1, 2, 3, 4, 5, 6])) }),
  z.object({ type: z.literal("weekly"), timesPerWeek: z.number().int().min(1).max(7) }),
]);

const habitSchema = z.object({
  id,
  name: z.string().trim().min(1),
  emoji: z.string().min(1),
  color: z.string().min(1),
  identity: optionalText,
  minimumVersion: optionalText,
  schedule: scheduleSchema,
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "must be a time as HH:mm" })
    .optional(),
  sortOrder: z.number(),
  createdAt: dateKey,
  archived: z.boolean(),
});

const completionSchema = z.object({
  id,
  habitId: id,
  date: dateKey,
  kind: z.enum(["full", "minimum", "skipped"]),
  note: optionalText,
});

const weeklyReviewSchema = z.object({
  id,
  weekStart: dateKey,
  wins: z.string(),
  struggles: z.string(),
  intention: z.string(),
});

// Unknown keys are dropped, so a backup can't smuggle extra fields into the database.
const backupSchema = z
  .object({
    app: z.literal(BACKUP_APP),
    schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
    exportedAt: z.iso.datetime({ offset: true }),
    habits: z.array(habitSchema),
    completions: z.array(completionSchema),
    weeklyReviews: z.array(weeklyReviewSchema),
  })
  .superRefine((backup, ctx) => {
    const issue = (path: (string | number)[], message: string) => {
      ctx.addIssue({ code: "custom", path, message });
    };
    const firstSeen = <T>(
      items: T[],
      key: (item: T) => string,
      onDuplicate: (index: number) => void,
    ) => {
      const seen = new Set<string>();
      items.forEach((item, index) => {
        const value = key(item);
        if (seen.has(value)) onDuplicate(index);
        seen.add(value);
      });
    };

    firstSeen(
      backup.habits,
      (h) => h.id,
      (i) => {
        issue(["habits", i, "id"], "is used by more than one habit");
      },
    );
    const habitIds = new Set(backup.habits.map((h) => h.id));

    firstSeen(
      backup.completions,
      (c) => c.id,
      (i) => {
        issue(["completions", i, "id"], "is used by more than one check-in");
      },
    );
    firstSeen(
      backup.completions,
      (c) => `${c.habitId} ${c.date}`,
      (i) => {
        issue(["completions", i], "is a second check-in for the same habit on the same day");
      },
    );
    backup.completions.forEach((completion, i) => {
      if (!habitIds.has(completion.habitId)) {
        issue(["completions", i, "habitId"], "doesn't match any habit in the backup");
      }
    });

    firstSeen(
      backup.weeklyReviews,
      (r) => r.id,
      (i) => {
        issue(["weeklyReviews", i, "id"], "is used by more than one review");
      },
    );
    firstSeen(
      backup.weeklyReviews,
      (r) => r.weekStart,
      (i) => {
        issue(["weeklyReviews", i, "weekStart"], "has more than one review for the same week");
      },
    );
    backup.weeklyReviews.forEach((review, i) => {
      if (isDateKey(review.weekStart) && startOfWeek(review.weekStart) !== review.weekStart) {
        issue(["weeklyReviews", i, "weekStart"], "must be a Monday");
      }
    });
  });

export type ParseBackupResult = { ok: true; backup: Backup } | { ok: false; error: string };

function describePath(path: PropertyKey[]): string {
  return path
    .map((part, index) =>
      typeof part === "number" ? `[${String(part)}]` : `${index > 0 ? "." : ""}${String(part)}`,
    )
    .join("");
}

/** Reads a backup file's text, explaining in plain words why it can't be used. */
export function parseBackup(text: string): ParseBackupResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't valid JSON, so it can't be a backup." };
  }

  const header = z
    .object({ app: z.string().optional(), schemaVersion: z.unknown().optional() })
    .safeParse(raw);
  if (!header.success || header.data.app !== BACKUP_APP) {
    return { ok: false, error: "This file isn't a Habit Tracker backup." };
  }
  const { schemaVersion } = header.data;
  if (typeof schemaVersion === "number" && schemaVersion > BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      error: "This backup was made by a newer version of the app. Update the app and try again.",
    };
  }
  // Older versions would be migrated here once the format changes.

  const result = backupSchema.safeParse(raw);
  if (!result.success) {
    const [first] = result.error.issues;
    const where = first ? describePath(first.path) : "";
    const detail = first ? `${where ? `${where} ` : ""}${first.message}` : "unknown problem";
    const more =
      result.error.issues.length > 1 ? ` (and ${String(result.error.issues.length - 1)} more)` : "";
    return { ok: false, error: `This backup has a problem: ${detail}${more}.` };
  }
  return { ok: true, backup: result.data };
}
