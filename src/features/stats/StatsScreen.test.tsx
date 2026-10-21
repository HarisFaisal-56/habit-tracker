import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HabitRepository, NewHabit } from "../../data/repository";
import { eachDay } from "../../domain/dates";
import { createTestRepository, renderApp } from "../../test/renderApp";

const reading: NewHabit = {
  name: "Read",
  emoji: "📚",
  color: "emerald",
  schedule: { type: "daily" },
};
const gym: NewHabit = {
  name: "Gym",
  emoji: "🏋️",
  color: "sky",
  schedule: { type: "weekly", timesPerWeek: 3 },
};

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

async function seed(
  repository: HabitRepository,
  input: NewHabit,
  createdAt: string,
  done: string[],
) {
  setDate(createdAt);
  const habit = await repository.createHabit(input);
  for (const date of done) {
    await repository.setCompletion({ habitId: habit.id, date, kind: "full" });
  }
  setDate("2025-01-08");
  return habit;
}

function card(name: string) {
  const heading = screen.getByRole("heading", { name });
  const item = heading.closest("li");
  if (!item) throw new Error(`No card for ${name}`);
  return within(item);
}

/** The value shown for a stat label in a card. */
function stat(name: string, label: string) {
  return card(name).getByText(label).parentElement?.querySelector("dd")?.textContent;
}

describe("StatsScreen", () => {
  it("shows an empty state without habits", async () => {
    renderApp("/stats");
    expect(await screen.findByRole("link", { name: "Add your first habit" })).toBeInTheDocument();
  });

  it("shows streaks and completion rates, switching between time ranges", async () => {
    const repository = createTestRepository();
    // Created Dec 10 (30 days ago including today), done only the last 7 days.
    await seed(repository, reading, "2024-12-10", eachDay("2025-01-02", "2025-01-08"));
    const { user } = renderApp("/stats", repository);

    await screen.findByRole("heading", { name: "Read" });
    const overall = screen.getByText("Completion rate, last 30 days").parentElement;
    expect(overall).toHaveTextContent("23%"); // 7 of 30
    expect(stat("Read", "Current streak")).toBe("7 days");
    expect(stat("Read", "Best streak")).toBe("7 days");
    expect(stat("Read", "30-day rate")).toBe("23%");

    await user.click(screen.getByRole("radio", { name: "7 days" }));

    expect(screen.getByText("Completion rate, last 7 days")).toBeInTheDocument();
    expect(stat("Read", "7-day rate")).toBe("100%");

    await user.click(screen.getByRole("radio", { name: "90 days" }));
    expect(stat("Read", "90-day rate")).toBe("23%"); // the habit is only 30 days old
  });

  it("shows this week's progress for weekly goals and fixed schedules", async () => {
    const repository = createTestRepository();
    await seed(repository, gym, "2024-12-30", [
      "2024-12-30",
      "2024-12-31",
      "2025-01-01", // last week met
      "2025-01-06",
      "2025-01-07",
    ]);
    await seed(repository, reading, "2025-01-06", ["2025-01-06", "2025-01-07"]);
    renderApp("/stats", repository);

    await screen.findByRole("heading", { name: "Gym" });
    expect(stat("Gym", "Current streak")).toBe("1 week");
    expect(card("Gym").getByRole("progressbar", { name: "Gym this week" })).toHaveAttribute(
      "aria-valuetext",
      "2 of 3 times",
    );
    expect(card("Read").getByRole("progressbar", { name: "Read this week" })).toHaveAttribute(
      "aria-valuetext",
      "2 of 7 days",
    );
  });

  it("encourages after a single missed day", async () => {
    const repository = createTestRepository();
    await seed(repository, reading, "2025-01-05", ["2025-01-05", "2025-01-06"]); // missed the 7th
    renderApp("/stats", repository);

    await screen.findByRole("heading", { name: "Read" });
    expect(card("Read").getByText(/Don’t miss twice/)).toBeInTheDocument();
  });

  it("lists archived habits separately with their best streak", async () => {
    const repository = createTestRepository();
    const archived = await seed(repository, gym, "2024-12-30", [
      "2024-12-30",
      "2024-12-31",
      "2025-01-01",
    ]);
    await repository.setHabitArchived(archived.id, true);
    await seed(repository, reading, "2025-01-08", []);
    renderApp("/stats", repository);

    const list = await screen.findByRole("list", { name: "Archived habits" });
    expect(within(list).getByRole("heading", { name: "Gym" })).toBeInTheDocument();
    expect(stat("Gym", "Current streak")).toBe("–");
    expect(stat("Gym", "Best streak")).toBe("1 week");
    // Only the active habit, created today with nothing due yet, counts overall.
    expect(screen.getByText("Nothing was due in this period yet.")).toBeInTheDocument();
  });
});
