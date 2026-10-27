import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HabitRepository, NewHabit } from "../../data/repository";
import { type CompletionKind } from "../../domain/habit";
import { createTestRepository, renderApp } from "../../test/renderApp";

const reading: NewHabit = {
  name: "Read",
  emoji: "📚",
  color: "emerald",
  schedule: { type: "daily" },
};
const running: NewHabit = { name: "Run", emoji: "🏃", color: "sky", schedule: { type: "daily" } };

function setDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  vi.setSystemTime(new Date(year ?? 0, (month ?? 1) - 1, day, 9, 0));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  setDate("2025-01-08"); // Wednesday
});

afterEach(() => {
  vi.useRealTimers();
});

/** Creates a habit as if on `createdAt`, with completions, then returns to the 8th. */
async function seed(
  repository: HabitRepository,
  input: NewHabit,
  createdAt: string,
  days: Record<string, CompletionKind | { kind: CompletionKind; note: string }> = {},
) {
  setDate(createdAt);
  const habit = await repository.createHabit(input);
  for (const [date, value] of Object.entries(days)) {
    const { kind, note } = typeof value === "string" ? { kind: value, note: undefined } : value;
    await repository.setCompletion({ habitId: habit.id, date, kind, note });
  }
  setDate("2025-01-08");
  return habit;
}

function day(name: RegExp) {
  return screen.getByRole("button", { name });
}

describe("HistoryScreen", () => {
  it("shows an empty state without habits", async () => {
    renderApp("/history");
    expect(await screen.findByRole("link", { name: "Add your first habit" })).toBeInTheDocument();
  });

  it("shows this month with today marked and future days disabled", async () => {
    const repository = createTestRepository();
    await seed(repository, reading, "2025-01-01");
    renderApp("/history", repository);

    expect(await screen.findByRole("heading", { name: "January 2025" })).toBeInTheDocument();
    expect(day(/^Wednesday 8 January \(today\)/)).toHaveAttribute("aria-current", "date");
    expect(day(/^Wednesday 8 January/)).toHaveAttribute("aria-pressed", "true");
    expect(day(/^Thursday 9 January/)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
    // Nothing before the first habit's month.
    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
  });

  it("moves between months back to the first habit's month", async () => {
    const repository = createTestRepository();
    await seed(repository, reading, "2024-12-20");
    const { user } = renderApp("/history", repository);

    await user.click(await screen.findByRole("button", { name: "Previous month" }));

    expect(screen.getByRole("heading", { name: "December 2024" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
    expect(day(/^Thursday 19 December, Nothing due/)).toBeInTheDocument();
    expect(day(/^Friday 20 December, 0 of 1 done/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("heading", { name: "January 2025" })).toBeInTheDocument();
  });

  it("summarizes each day across habits and lists the details of the chosen day", async () => {
    const repository = createTestRepository();
    await seed(repository, reading, "2025-01-01", {
      "2025-01-07": { kind: "full", note: "Great chapter" },
    });
    await seed(repository, running, "2025-01-01", { "2025-01-06": "skipped" });
    const { user } = renderApp("/history", repository);

    expect(await screen.findByRole("button", { name: /^Tuesday 7 January, 1 of 2 done/ }));
    expect(day(/^Monday 6 January, 0 of 1 done/)).toBeInTheDocument(); // skip is neutral

    await user.click(day(/^Tuesday 7 January/));

    const details = screen.getByRole("region", { name: "Tuesday 7 January" });
    expect(within(details).getByText("1 of 2 closed")).toBeInTheDocument();
    expect(within(details).getByRole("button", { name: "Read, Done" })).toBeInTheDocument();
    expect(within(details).getByRole("button", { name: "Run, Missed" })).toBeInTheDocument();
    expect(within(details).getByText("“Great chapter”")).toBeInTheDocument();
  });

  it("shows one habit's statuses and heatmap when picked", async () => {
    const repository = createTestRepository();
    const read = await seed(repository, reading, "2025-01-01", {
      "2025-01-05": "full",
      "2025-01-06": "minimum",
      "2025-01-07": "skipped",
    });
    await seed(repository, running, "2025-01-01");
    const { user } = renderApp("/history", repository);

    // All habits together at first.
    expect(await screen.findAllByRole("img", { name: /last 12 months/ })).toHaveLength(1);
    expect(screen.getByRole("img", { name: /^All habits, last 12 months/ })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Habit"), read.id);

    expect(day(/^Sunday 5 January, Done/)).toBeInTheDocument();
    expect(day(/^Monday 6 January, Minimum version/)).toBeInTheDocument();
    expect(day(/^Tuesday 7 January, Skipped/)).toBeInTheDocument();
    expect(day(/^Saturday 4 January, Missed/)).toBeInTheDocument();
    expect(day(/^Wednesday 8 January \(today\), Not done yet/)).toBeInTheDocument();

    const heatmaps = screen.getAllByRole("img", { name: /last 12 months/ });
    expect(heatmaps).toHaveLength(1);
    // Missed: Jan 1 to 4.
    expect(heatmaps[0]).toHaveAccessibleName(
      "Read, last 12 months: 1 done, 1 minimum, 1 skipped, 4 missed",
    );
  });

  it("offers archived habits separately and leaves them out of the overview", async () => {
    const repository = createTestRepository();
    const archived = await seed(repository, running, "2025-01-01");
    await repository.setHabitArchived(archived.id, true);
    await seed(repository, reading, "2025-01-01");
    const { user } = renderApp("/history", repository);

    const select = await screen.findByLabelText("Habit");
    const group = within(select).getByRole("group", { name: "Archived" });
    expect(within(group).getByRole("option", { name: /Run/ })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /last 12 months/ })).toHaveLength(1);

    await user.selectOptions(select, archived.id);
    expect(screen.getByRole("img", { name: /^Run, last 12 months/ })).toBeInTheDocument();
  });

  describe("logging past days", () => {
    it("logs a forgotten day from the last week", async () => {
      const repository = createTestRepository();
      await seed(repository, reading, "2025-01-01");
      const { user } = renderApp("/history", repository);

      await user.click(await screen.findByRole("button", { name: /^Tuesday 7 January/ }));
      const details = screen.getByRole("region", { name: "Tuesday 7 January" });
      expect(within(details).getByText(/Forgot to log\?/)).toBeInTheDocument();
      await user.click(within(details).getByRole("button", { name: /Read/ }));

      const sheet = screen.getByRole("dialog", { name: "Read · Tue 7 Jan" });
      expect(within(sheet).getByRole("button", { name: /Skip this day/ })).toBeInTheDocument();
      await user.click(within(sheet).getByRole("button", { name: /^Done/ }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: /Read/ })).not.toBeInTheDocument();
      });
      expect(
        await within(details).findByRole("button", { name: "Read, Done" }),
      ).toBeInTheDocument();
      expect(day(/^Tuesday 7 January, 1 of 1 done/)).toBeInTheDocument();
      expect(await repository.listCompletions()).toMatchObject([
        { date: "2025-01-07", kind: "full" },
      ]);
    });

    it("changes or clears an existing past entry", async () => {
      const repository = createTestRepository();
      await seed(repository, reading, "2025-01-01", { "2025-01-06": "full" });
      const { user } = renderApp("/history", repository);

      await user.click(await screen.findByRole("button", { name: /^Monday 6 January/ }));
      const details = screen.getByRole("region", { name: "Monday 6 January" });
      await user.click(within(details).getByRole("button", { name: /Read/ }));
      const sheet = screen.getByRole("dialog", { name: /Read/ });
      await user.click(within(sheet).getByRole("button", { name: "Clear this day" }));

      expect(
        await within(details).findByRole("button", { name: "Read, Missed" }),
      ).toBeInTheDocument();
      expect(await repository.listCompletions()).toEqual([]);
    });

    it("keeps days older than a week read-only", async () => {
      const repository = createTestRepository();
      await seed(repository, reading, "2024-12-20");
      const { user } = renderApp("/history", repository);

      await user.click(await screen.findByRole("button", { name: "Previous month" }));
      await user.click(day(/^Tuesday 31 December/)); // 8 days ago
      const oldDay = screen.getByRole("region", { name: "Tuesday 31 December" });
      expect(within(oldDay).getByText("Only the last 7 days can be changed.")).toBeInTheDocument();
      expect(within(oldDay).queryByRole("button")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Next month" }));
      await user.click(day(/^Wednesday 1 January/)); // 7 days ago: still allowed
      const lastAllowed = screen.getByRole("region", { name: "Wednesday 1 January" });
      expect(within(lastAllowed).getByRole("button", { name: /Read/ })).toBeInTheDocument();
    });

    it("doesn't log archived habits", async () => {
      const repository = createTestRepository();
      const archived = await seed(repository, reading, "2025-01-01");
      await repository.setHabitArchived(archived.id, true);
      const { user } = renderApp("/history", repository);

      await user.selectOptions(await screen.findByLabelText("Habit"), archived.id);
      await user.click(day(/^Tuesday 7 January/));

      const details = screen.getByRole("region", { name: "Tuesday 7 January" });
      expect(within(details).getByText("Read")).toBeInTheDocument();
      expect(within(details).queryByRole("button")).not.toBeInTheDocument();
    });
  });
});
