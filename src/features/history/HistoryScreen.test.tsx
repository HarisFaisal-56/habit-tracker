import { screen, within } from "@testing-library/react";
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
    const items = within(details).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("ReadDone“Great chapter”"),
      expect.stringContaining("RunMissed"),
    ]);
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

    expect(await screen.findAllByRole("img", { name: /last 12 months/ })).toHaveLength(2);

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
});
